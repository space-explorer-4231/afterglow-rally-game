import {RoomManager} from '../src/rooms/RoomManager.js';
import {handleClientPacket} from '../src/protocolHandler.js';
import type {RelaySocket} from '../src/relaySocket.js';
import {SERVER_VERSION,PROTOCOL_VERSION} from '../src/version.js';

/** Static client assets and the single authoritative room coordinator. */
export interface WorkerEnv {ASSETS:Fetcher;RALLY:DurableObjectNamespace}

export const RELAY_LIMITS={payloadBytes:64*1024,socketsPerIp:32,handshakesPerMinute:60,packetsPerSecond:120,totalSockets:256,trackedIps:4096} as const;
const encoder=new TextEncoder();
const decoder=new TextDecoder();

function json(body:object,status=200):Response {
  return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}

/** Workers exposes no outbound-queue measurement: send directly, without an application queue. */
class WorkerRelaySocket implements RelaySocket {
  private closed=false;
  constructor(private readonly socket:WebSocket,private readonly failed:()=>void){}
  get readyState():number{return this.closed?3:this.socket.readyState;}
  markClosed():void {this.closed=true;}
  send(text:string):void {
    if(this.readyState!==1)return;
    try{this.socket.send(text);}catch{this.failed();}
  }
  close(code=1000,reason=''):void {
    if(this.closed)return;
    try{this.socket.close(code,reason);}catch{/* Already-closed native sockets still need local cleanup. */}
    this.failed();
  }
}

interface Peer {socket:WorkerRelaySocket;ip:string;windowStart:number;packets:number;cleanup:()=>void}

/** A SQLite-backed Durable Object binding supplies stable routing; live room state remains in memory. */
export class RallyRelay {
  private manager:RoomManager|null=null;
  private readonly peers=new Set<Peer>();
  private readonly perIp=new Map<string,number>();
  private readonly handshakes=new Map<string,number[]>();
  private readonly createdAt=Date.now();

  constructor(_state?:DurableObjectState,_env?:WorkerEnv){}

  private admit(ip:string,now:number):boolean {
    for(const [key,times] of this.handshakes){if(times.length===0||now-times[times.length-1]>=60000)this.handshakes.delete(key);}
    if(this.peers.size>=RELAY_LIMITS.totalSockets||(this.perIp.get(ip)??0)>=RELAY_LIMITS.socketsPerIp)return false;
    if(!this.handshakes.has(ip)&&this.handshakes.size>=RELAY_LIMITS.trackedIps)return false;
    const recent=(this.handshakes.get(ip)??[]).filter(time=>now-time<60000);
    if(recent.length>=RELAY_LIMITS.handshakesPerMinute){this.handshakes.set(ip,recent);return false;}
    recent.push(now);this.handshakes.set(ip,recent);return true;
  }

  private rejectVersion(socket:WebSocket,clientVersion:string|null):void {
    socket.send(JSON.stringify({type:'version_mismatch',serverVersion:SERVER_VERSION,clientVersion:clientVersion||'unknown',message:`Client version (${clientVersion||'legacy'}) is incompatible with server version (${SERVER_VERSION}). Please update your game.`}));
    socket.close(4003,'VERSION_MISMATCH');
  }

  async fetch(request:Request):Promise<Response> {
    const url=new URL(request.url);
    if(url.pathname==='/health'||url.pathname==='/api/health'){
      // A health probe must not create a RoomManager or keep periodic room timers alive.
      const rooms=this.manager?.getRoomsList();
      return json({status:'ok',version:SERVER_VERSION,protocol:PROTOCOL_VERSION,uptime:(Date.now()-this.createdAt)/1000,roomsCount:rooms?.length??1,players:rooms?.reduce((total,room)=>total+room.playerCount,0)??0,connections:this.peers.size});
    }
    if(url.pathname!=='/ws')return json({error:'Not found'},404);
    if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket upgrade required'},426);
    const origin=request.headers.get('Origin');
    if(origin&&origin!==url.origin)return json({error:'Origin not allowed'},403);
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    if(!this.admit(ip,Date.now()))return json({error:'RATE_LIMIT_EXCEEDED'},429);

    const pair=new WebSocketPair(),client=pair[0],server=pair[1];
    server.accept();
    const clientVersion=url.searchParams.get('v');
    if(clientVersion!==SERVER_VERSION){
      this.rejectVersion(server,clientVersion);
      return new Response(null,{status:101,webSocket:client});
    }

    let peer:Peer;
    const cleanup=()=>{
      if(!this.peers.delete(peer))return;
      peer.socket.markClosed();
      const count=this.perIp.get(ip)??1;
      if(count<=1)this.perIp.delete(ip);else this.perIp.set(ip,count-1);
      const manager=this.manager;
      manager?.handleDisconnect(peer.socket,'disconnect');
      if(this.peers.size===0&&this.manager===manager){this.manager=null;manager?.destroy();}
    };
    const adapter=new WorkerRelaySocket(server,cleanup);
    peer={socket:adapter,ip,windowStart:Date.now(),packets:0,cleanup};
    this.peers.add(peer);this.perIp.set(ip,(this.perIp.get(ip)??0)+1);
    this.manager??=new RoomManager();
    server.addEventListener('close',cleanup);
    server.addEventListener('error',cleanup);
    server.addEventListener('message',event=>{
      if(!this.peers.has(peer))return;
      const now=Date.now();
      if(now-peer.windowStart>=1000){peer.windowStart=now;peer.packets=0;}
      if(++peer.packets>RELAY_LIMITS.packetsPerSecond){adapter.close(1008,'PACKET_RATE_EXCEEDED');return;}
      const data:unknown=event.data;
      let text:string;
      if(typeof data==='string'){
        if(data.length>RELAY_LIMITS.payloadBytes||encoder.encode(data).byteLength>RELAY_LIMITS.payloadBytes){adapter.close(1009,'PAYLOAD_TOO_LARGE');return;}
        text=data;
      }else if(data instanceof ArrayBuffer){
        if(data.byteLength>RELAY_LIMITS.payloadBytes){adapter.close(1009,'PAYLOAD_TOO_LARGE');return;}
        text=decoder.decode(data);
      }else{adapter.close(1003,'UNSUPPORTED_PACKET');return;}
      try{if(this.manager)handleClientPacket(this.manager,adapter,text);}catch{/* Invalid JSON is discarded without changing the room. */}
    });
    this.manager.subscribeLobby(adapter);
    return new Response(null,{status:101,webSocket:client});
  }
}

/** Route every multiplayer request to one coordinator; serve the game from static edge assets. */
export default {
  async fetch(request:Request,env:WorkerEnv):Promise<Response>{
    const path=new URL(request.url).pathname;
    if(path==='/ws'||path==='/health'||path==='/api/health')return env.RALLY.get(env.RALLY.idFromName('global-v1')).fetch(request);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<WorkerEnv>;
