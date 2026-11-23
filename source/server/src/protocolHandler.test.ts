import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {WebSocket as NodeWebSocket} from 'ws';
import type {RelaySocket} from './relaySocket.js';
import {RoomManager} from './rooms/RoomManager.js';
import {handleClientPacket} from './protocolHandler.js';

class MemoryTransport implements RelaySocket {
  readonly readyState=1;
  readonly bufferedAmount=0;
  readonly sent:string[]=[];
  send(text:string):void {this.sent.push(text);}
  close():void {/* Transport lifecycle is owned by its host. */}
}

// Compile-time structural compatibility: existing ws instances require no casts or wrappers.
function nodeTransport(socket:NodeWebSocket):RelaySocket{return socket;}
void nodeTransport;

let manager:RoomManager;
beforeEach(()=>{manager=new RoomManager();});
afterEach(()=>{manager.destroy();vi.restoreAllMocks();});
const packet=(type:string,fields:Record<string,unknown>={})=>JSON.stringify({type,...fields});

it('serves lobby and ping through a transport with no Node event-emitter dependency',()=>{
  const socket=new MemoryTransport();
  expect(handleClientPacket(manager,socket,packet('request_rooms'))).toBe(true);
  expect(socket.sent.some(text=>text.includes('"type":"rooms_list"'))).toBe(true);
  handleClientPacket(manager,socket,packet('join_room',{roomId:'gymkhana_freeroam',nickname:'Driver',vehicleId:'zephyr_wr4'}));
  handleClientPacket(manager,socket,packet('ping',{clientTime:123}));
  expect(socket.sent.some(text=>text.includes('"type":"pong"')&&text.includes('"clientTime":123'))).toBe(true);
});

it('keeps validated creation, joining and leaving behavior identical on a plain transport',()=>{
  const host=new MemoryTransport(),friend=new MemoryTransport();
  handleClientPacket(manager,host,packet('create_room',{name:'Friends race',nickname:'Host',vehicleId:'zephyr_wr4',levelId:'level1_island',gameMode:'timeattack'}));
  const room=manager.getRoomsList().find(candidate=>candidate.name==='Friends race');
  expect(room).toBeDefined();
  handleClientPacket(manager,friend,packet('join_room',{roomId:room!.id,nickname:'Friend',vehicleId:'vortex_b'}));
  expect(manager.getRoomsList().find(candidate=>candidate.id===room!.id)?.playerCount).toBe(2);
  handleClientPacket(manager,friend,packet('leave_room',{roomId:room!.id}));
  // Existing identity is retained on the connection even after leaving its room.
  expect(manager.getPlayerId(friend)).toBeDefined();
  const sentBeforePing=friend.sent.length;
  handleClientPacket(manager,friend,packet('ping',{clientTime:456}));
  expect(friend.sent.length).toBe(sentBeforePing);
  expect(manager.getRoomsList().find(candidate=>candidate.id===room!.id)?.playerCount).toBe(1);
});

it('does not dispatch invalid packet shapes or silently accept malformed JSON',()=>{
  const socket=new MemoryTransport();
  for(const text of ['null','[]',packet('unknown'),packet('join_room',{roomId:123})])expect(handleClientPacket(manager,socket,text)).toBe(false);
  expect(socket.sent).toEqual([]);
  expect(()=>handleClientPacket(manager,socket,'{broken')).toThrow(SyntaxError);
});

it('preserves explicit vote state and race action routing',()=>{
  const socket=new MemoryTransport(),action=vi.spyOn(manager,'handleRaceAction');
  for(const type of ['race_start','race_reset'])handleClientPacket(manager,socket,packet(type));
  handleClientPacket(manager,socket,packet('race_vote',{voted:true}));
  handleClientPacket(manager,socket,packet('race_vote',{voted:false}));
  expect(action.mock.calls.map(call=>[call[1],call[2]])).toEqual([['race_start',false],['race_reset',false],['race_vote',true],['race_vote',false]]);
});
