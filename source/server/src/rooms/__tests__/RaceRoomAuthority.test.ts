import {describe, it, expect, vi, afterEach} from 'vitest';
import {WebSocket} from 'ws';
import {RoomManager} from '../RoomManager.js';
vi.mock('ws', () => ({WebSocket: class {readyState=1; send=vi.fn(); close=vi.fn();}}));
const managers: RoomManager[]=[];
afterEach(()=>{for(const manager of managers) manager.destroy(); managers.length=0;});
describe('Authenticated race controls in live room routing', () => {
  it('rejects guest starts, closes two-player voting, and permits the real host after loading', () => {
    const manager=new RoomManager(); managers.push(manager);
    const host=new WebSocket('ws://unused.invalid'); const guest=new WebSocket('ws://unused.invalid');
    const room=manager.createRoom(host,'Race','Host','stradale_gt','level6_gymkhana_harbor','timeattack')!;
    manager.joinRoom(guest,room.id,'Guest','stradale_gt');
    manager.handleClientReady(host); manager.handleClientReady(guest);
    manager.handleRaceAction(guest,'race_start');
    expect(guest.send).toHaveBeenCalledWith(expect.stringContaining('HOST_ONLY'));
    manager.handleRaceAction(guest,'race_vote',true);
    expect(host.send).not.toHaveBeenCalledWith(expect.stringContaining('"phase":"countdown"'));
    manager.handleRaceAction(host,'race_start');
    expect(host.send).toHaveBeenCalledWith(expect.stringContaining('"phase":"countdown"'));
    expect(guest.send).toHaveBeenCalledWith(expect.stringContaining('"phase":"countdown"'));
    manager.handleRaceAction(guest,'race_reset');
    expect(guest.send).toHaveBeenCalledWith(expect.stringContaining('HOST_ONLY'));
    manager.handleRaceAction(host,'race_reset');
    expect(host.send).toHaveBeenCalledWith(expect.stringContaining('"round":2'));
  });
  it('transfers host authority and removes departed ballots', () => {
    const manager=new RoomManager(); managers.push(manager);
    const host=new WebSocket('ws://unused.invalid'), a=new WebSocket('ws://unused.invalid'), b=new WebSocket('ws://unused.invalid');
    const room=manager.createRoom(host,'Race','Host','stradale_gt','level6_gymkhana_harbor','timeattack')!;
    const joined=manager.joinRoom(a,room.id,'NextHost','stradale_gt')!;
    manager.joinRoom(b,room.id,'Guest','stradale_gt');
    for(const ws of [host,a,b]) manager.handleClientReady(ws);
    manager.handleRaceAction(host,'race_vote',true);
    manager.handleDisconnect(host);
    expect(room.hostId).toBe(joined.id);
    expect(a.send).toHaveBeenCalledWith(expect.stringContaining('"votedIds":[]'));
    manager.handleRaceAction(a,'race_start');
    expect(b.send).toHaveBeenCalledWith(expect.stringContaining('"phase":"countdown"'));
  });
  it('ignores race controls in free roam', () => {
    const manager=new RoomManager(); managers.push(manager);
    const host=new WebSocket('ws://unused.invalid');
    manager.createRoom(host,'Cruise','Host','stradale_gt','level6_gymkhana_harbor','freeroam');
    manager.handleClientReady(host); manager.handleRaceAction(host,'race_start');
    expect(host.send).not.toHaveBeenCalledWith(expect.stringContaining('race_state'));
  });
});
