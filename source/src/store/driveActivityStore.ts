import {create} from 'zustand';
import {useBoostHuntStore} from './boostHuntStore';
import {useDriftClubStore} from './driftClubStore';
import {emitGameEvent} from '@/utils/events';
export type DriveActivity='cruise'|'hunt'|'drift';
export const useDriveActivityStore=create<{activity:DriveActivity}>(()=>({activity:'cruise'}));
/** One active personal challenge at a time; switching never changes map, room or car. */
export function chooseDriveActivity(activity:DriveActivity):void {
 useBoostHuntStore.getState().stop();useDriftClubStore.getState().setActive(false);
 useDriveActivityStore.setState({activity});
 if(activity==='hunt')useBoostHuntStore.getState().start(-1);
 emitGameEvent('drive_activity',{activity});
}
