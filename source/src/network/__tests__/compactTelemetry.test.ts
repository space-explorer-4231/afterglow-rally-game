import {it,expect} from 'vitest';
import {compactTelemetry} from '../compactTelemetry';
import type {VehicleTelemetryPayload} from '@/types/network';
it('reduces realistic telemetry JSON size while bounding every quantization error',()=>{
 const value=.1234567890123456;
 const payload:VehicleTelemetryPayload={seq:1,time:1000,pos:[100+value,1+value,-100-value],rot:[value,value,value,.97686478987989],linVel:[value,12+value,30+value],angVel:[value,value,value],steer:value,wheelRots:[1+value,1+value,1+value,1+value],wheelY:[value,value,value,value],rpm:3456+value,gear:3,isDrifting:false,nitroActive:true,surface:'tarmac'};
 const before=structuredClone(payload),bytes=JSON.stringify(payload).length;compactTelemetry(payload);
 expect(JSON.stringify(payload).length).toBeLessThan(bytes*.7);
 for(let i=0;i<3;i++){expect(Math.abs(payload.pos[i]-before.pos[i])).toBeLessThanOrEqual(.0005);expect(Math.abs(payload.linVel[i]-before.linVel[i])).toBeLessThanOrEqual(.005);}
 for(let i=0;i<4;i++)expect(Math.abs(payload.rot[i]-before.rot[i])).toBeLessThanOrEqual(.00005);
 expect(payload.nitroActive).toBe(true);expect(payload.seq).toBe(1);expect(payload.time).toBe(1000);
 const once=JSON.stringify(payload);compactTelemetry(payload);expect(JSON.stringify(payload)).toBe(once);
});
