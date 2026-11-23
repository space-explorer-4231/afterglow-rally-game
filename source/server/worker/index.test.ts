import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {RallyRelay,RELAY_LIMITS} from './index';
import {SERVER_VERSION} from '../src/version';

class FakeSocket extends EventTarget {
  readyState=1;
  readonly sent:string[]=[];
  closedCode:number|undefined;
  accept():void {}
  send(text:string):void {if(this.readyState!==1)throw new Error('closed');this.sent.push(text);}
  close(code=1000):void {if(this.readyState===3)return;this.closedCode=code;this.readyState=3;this.dispatchEvent(new Event('close'));}
  receive(data:string|ArrayBuffer):void {this.dispatchEvent(new MessageEvent('message',{data}));}
}
class FakePair {
  readonly 0=new FakeSocket();
  readonly 1=new FakeSocket();
  static servers:FakeSocket[]=[];
  constructor(){FakePair.servers.push(this[1]);}
}
const NativeResponse=Response;
class UpgradeResponse extends NativeResponse {
  constructor(body:BodyInit|null=null,init:ResponseInit={}){
    super(body,{...init,status:init.status===101?200:init.status});
    if(init.status===101)Object.defineProperty(this,'status',{value:101});
  }
}
const request=(query=`v=${SERVER_VERSION}`,ip='192.0.2.1',origin?:string)=>new Request(`https://game.example/ws?${query}`,{headers:{Upgrade:'websocket','CF-Connecting-IP':ip,...origin?{Origin:origin}:{}}});
let relay:RallyRelay;
beforeEach(()=>{vi.useFakeTimers();FakePair.servers=[];vi.stubGlobal('WebSocketPair',FakePair);vi.stubGlobal('Response',UpgradeResponse);relay=new RallyRelay();});
afterEach(()=>{for(const socket of FakePair.servers)socket.close();vi.unstubAllGlobals();vi.useRealTimers();});

it('does not instantiate room timers for health probes or version failures',async()=>{
  const health=await relay.fetch(new Request('https://game.example/health'));
  expect(await health.json()).toMatchObject({status:'ok',version:SERVER_VERSION,players:0,connections:0});
  expect(vi.getTimerCount()).toBe(0);
  const mismatch=await relay.fetch(request('v=old'));
  expect(mismatch.status).toBe(101);
  expect(FakePair.servers[0].closedCode).toBe(4003);
  expect(FakePair.servers[0].sent[0]).toContain('version_mismatch');
  expect(vi.getTimerCount()).toBe(0);
});

it('allows same-origin and no-Origin clients while rejecting cross-origin upgrades',async()=>{
  expect((await relay.fetch(request(undefined,undefined,'https://other.example'))).status).toBe(403);
  expect((await relay.fetch(request(undefined,undefined,'null'))).status).toBe(403);
  expect((await relay.fetch(request(undefined,undefined,'https://game.example'))).status).toBe(101);
  expect((await relay.fetch(request())).status).toBe(101);
  expect((await relay.fetch(new Request('https://game.example/ws'))).status).toBe(426);
});

it('routes real protocol packets and destroys all timers after the last socket closes',async()=>{
  await relay.fetch(request());const socket=FakePair.servers[0];
  expect(socket.sent[0]).toContain('rooms_list');expect(vi.getTimerCount()).toBeGreaterThan(0);
  socket.receive('{broken');socket.receive(JSON.stringify({type:'request_rooms'}));
  expect(socket.sent).toHaveLength(2);
  socket.close();socket.dispatchEvent(new Event('error'));
  expect(vi.getTimerCount()).toBe(0);
  const health=await relay.fetch(new Request('https://game.example/api/health'));
  expect(await health.json()).toMatchObject({connections:0,players:0});
  expect(vi.getTimerCount()).toBe(0);
  await relay.fetch(request());expect(vi.getTimerCount()).toBeGreaterThan(0);
});

it('bounds UTF-8 and binary payload sizes before JSON parsing',async()=>{
  await relay.fetch(request());FakePair.servers[0].receive('😀'.repeat(17000));
  expect(FakePair.servers[0].closedCode).toBe(1009);
  await relay.fetch(request());FakePair.servers[1].receive(new ArrayBuffer(RELAY_LIMITS.payloadBytes+1));
  expect(FakePair.servers[1].closedCode).toBe(1009);
  expect(vi.getTimerCount()).toBe(0);
});

it('caps packet rate per peer and frees its room resources when exceeded',async()=>{
  await relay.fetch(request());const socket=FakePair.servers[0];
  for(let i=0;i<=RELAY_LIMITS.packetsPerSecond;i++)socket.receive('{}');
  expect(socket.closedCode).toBe(1008);expect(vi.getTimerCount()).toBe(0);
});

it('enforces simultaneous per-IP capacity and permits another IP',async()=>{
  for(let i=0;i<RELAY_LIMITS.socketsPerIp;i++)expect((await relay.fetch(request())).status).toBe(101);
  expect((await relay.fetch(request())).status).toBe(429);
  expect((await relay.fetch(request(undefined,'192.0.2.2'))).status).toBe(101);
});

it('bounds reconnect handshakes and releases the limit after a minute',async()=>{
  for(let i=0;i<RELAY_LIMITS.handshakesPerMinute;i++){expect((await relay.fetch(request())).status).toBe(101);FakePair.servers[i].close();}
  expect((await relay.fetch(request())).status).toBe(429);
  vi.advanceTimersByTime(60001);
  expect((await relay.fetch(request())).status).toBe(101);
});
