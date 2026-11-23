import {chooseDriveActivity,useDriveActivityStore} from '@/store/driveActivityStore';
export function ActivityPicker(){
 const selected=useDriveActivityStore(s=>s.activity);
 return <nav className="activity-picker" aria-label="Choose driving activity">{(['cruise','hunt','drift'] as const).map(activity=><button key={activity} type="button" aria-pressed={selected===activity} onClick={event=>{event.currentTarget.blur();chooseDriveActivity(activity);}}>{activity==='cruise'?'Cruise':activity==='hunt'?'Boost Hunt':'Drift Club'}</button>)}</nav>;
}
