import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {WebSocket} from 'ws';
import {RoomManager} from '../RoomManager.js';
import {RACE_COURSES} from '../../raceCourses.js';
import type {VehicleTelemetryPayload,ServerMessage} from '../../types.js';
vi.mock('ws',()=>({WebSocket:class{readyState=1;send=vi.fn();close=vi.fn();}}));
let manager:RoomManager;
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(100000);manager=new RoomManager();});
afterEach(()=>{manager.destroy();vi.useRealTimers();});
function messages(ws:WebSocket):ServerMessage[]{return vi.mocked(ws.send).mock.calls.map(call=>JSON.parse(String(call[0])) as ServerMessage);}
function packet(x:number,z:number):VehicleTelemetryPayload{return {seq:1,time:Date.now(),pos:[x,3,z],rot:[0,0,0,1],linVel:[0,0,0],angVel:[0,0,0],steer:0,wheelRots:[0,0,0,0],rpm:1000,gear:1,isDrifting:false,surface:'tarmac'};}
describe('authenticated room race result integration',()=>{
  it('twelve clients share telemetry-derived outcomes; a late joiner waits and the new host can make another grid',()=>{
    const clients=Array.from({length:12},()=>new WebSocket('ws://unused.invalid'));
    const room=manager.createRoom(clients[0],'Shared Results','Host','stradale_gt','level6_gymkhana_harbor','timeattack')!;
    for(let i=1;i<clients.length;i++)manager.joinRoom(clients[i],room.id,'Driver '+i,'bmw_m3_drift');
    for(const ws of clients)manager.handleClientReady(ws);
    manager.handleRaceAction(clients[0],'race_start');vi.advanceTimersByTime(3000);
    const course=RACE_COURSES[room.levelId];
    for(let cp=1;cp<=course.points.length;cp++){
      vi.advanceTimersByTime(2000);
      for(const ws of clients)manager.handlePing(ws,Date.now());
      const point=course.points[cp%course.points.length];
      for(const ws of clients)manager.handleTelemetry(ws,packet(point[0],point[1]));
    }
    const outcomes=clients.map(ws=>messages(ws).filter(message=>message.type==='race_round').at(-1));
    expect(outcomes.every(message=>message?.type==='race_round'&&message.state?.phase==='results')).toBe(true);
    expect(outcomes.every(message=>JSON.stringify(message)===JSON.stringify(outcomes[0]))).toBe(true);
    if(outcomes[0]?.type!=='race_round')throw Error('Missing result');
    expect(outcomes[0].state?.standings.every(driver=>driver.status==='finished')).toBe(true);
    manager.handleRaceAction(clients[1],'race_reset');expect(messages(clients[1]).at(-1)?.type).toBe('error');
    manager.handleDisconnect(clients[0]);
    const late=new WebSocket('ws://unused.invalid');manager.joinRoom(late,room.id,'Late Driver','stradale_gt');manager.handleClientReady(late);
    expect(messages(late).some(message=>message.type==='race_round'&&message.state?.standings.length===12)).toBe(true);
    manager.handleRaceAction(clients[1],'race_reset');
    expect(messages(late).some(message=>message.type==='race_state'&&message.state.round===2&&message.state.phase==='waiting')).toBe(true);
    expect(messages(late).filter(message=>message.type==='race_round').at(-1)).toMatchObject({state:null});
  });
});
