import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {NetworkClient,TELEMETRY_SEND_INTERVAL_MS} from '../networkClient';
import {MAX_TRANSIENT_QUEUE_BYTES} from '../transientDelivery';
import type {VehicleTelemetryPayload} from '@/types/network';
class Socket {
 static OPEN=1;static CONNECTING=0;static current:Socket;
 readyState=1;bufferedAmount=0;onopen:(()=>void)|null=null;onclose=null;onmessage=null;onerror=null;
 send=vi.fn();close=vi.fn();constructor(){Socket.current=this;}
}
let client:NetworkClient,clock=1000;
const packet=():Omit<VehicleTelemetryPayload,'seq'|'time'>=>({pos:[0,0,0],rot:[0,0,0,1],linVel:[0,0,0],angVel:[0,0,0],wheelRots:[0,0,0,0],rpm:1000,gear:1,steer:0,isDrifting:false,nitroActive:false,surface:'tarmac'});
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('window',globalThis);vi.stubGlobal('WebSocket',Socket);vi.spyOn(performance,'now').mockImplementation(()=>clock);clock=1000;client=new NetworkClient();client.connect('ws://localhost/ws');});
afterEach(()=>{client.disconnect();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
it('budgets ordinary samples to20Hz while NOS press and release bypass the interval',()=>{
 expect(TELEMETRY_SEND_INTERVAL_MS).toBe(50);client.sendTelemetry(packet());expect(Socket.current.send).toHaveBeenCalledTimes(1);
 clock+=10;client.sendTelemetry(packet());expect(Socket.current.send).toHaveBeenCalledTimes(1);
 expect(client.canSendTelemetry(clock,true)).toBe(true);client.sendTelemetry({...packet(),nitroActive:true});expect(Socket.current.send).toHaveBeenCalledTimes(2);
 clock+=1;client.sendTelemetry(packet());expect(Socket.current.send).toHaveBeenCalledTimes(3);
 clock+=49;expect(client.canSendTelemetry(clock,false)).toBe(false);clock++;client.sendTelemetry(packet());expect(Socket.current.send).toHaveBeenCalledTimes(4);
});
it('drops congestion before reading/serializing telemetry and keeps the NOS edge pending',()=>{
 client.sendTelemetry(packet());Socket.current.bufferedAmount=MAX_TRANSIENT_QUEUE_BYTES;clock++;
 expect(client.canSendTelemetry(clock,true)).toBe(false);client.sendTelemetry({...packet(),nitroActive:true});expect(Socket.current.send).toHaveBeenCalledTimes(1);
 Socket.current.bufferedAmount=0;expect(client.canSendTelemetry(clock,true)).toBe(true);client.sendTelemetry({...packet(),nitroActive:true});expect(Socket.current.send).toHaveBeenCalledTimes(2);
});
it('sends200 regular snapshots over ten seconds rather than303 at33ms',()=>{
 for(let frame=0;frame<600;frame++){clock=1000+frame*1000/60;client.sendTelemetry(packet());}
 expect(Socket.current.send.mock.calls.length).toBe(200);
});
