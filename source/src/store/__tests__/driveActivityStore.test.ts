import {it,expect,beforeEach} from 'vitest';
import {chooseDriveActivity,useDriveActivityStore} from '../driveActivityStore';
import {useBoostHuntStore} from '../boostHuntStore';
import {useDriftClubStore} from '../driftClubStore';
import {onGameEvent} from '@/utils/events';
beforeEach(()=>chooseDriveActivity('cruise'));
it('switches from hunt to drift and stops the previous challenge',()=>{chooseDriveActivity('hunt');expect(useBoostHuntStore.getState().active).toBe(true);let received='';const stop=onGameEvent('drive_activity',e=>{received=e.activity;});chooseDriveActivity('drift');expect(useBoostHuntStore.getState().active).toBe(false);expect(useDriveActivityStore.getState().activity).toBe('drift');expect(received).toBe('drift');stop();});
it('cruise clears both challenge states and restarting hunt resets the score',()=>{useDriftClubStore.getState().setActive(true);chooseDriveActivity('cruise');expect(useDriftClubStore.getState().active).toBe(false);chooseDriveActivity('hunt');useBoostHuntStore.setState({score:700});chooseDriveActivity('hunt');expect(useBoostHuntStore.getState().score).toBe(0);});
