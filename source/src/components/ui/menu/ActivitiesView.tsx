import {chooseDriveActivity, useDriveActivityStore, type DriveActivity} from '@/store/driveActivityStore';
import {getFocusStyle, menuStyles} from './menuStyles';

/** Optional challenges live in the pause menu, keeping the driving view clear. */
export function ActivitiesView({focusedIndex,onPointerMoveItem,onBack,onResume,isFreeDrive}:{isFreeDrive:boolean;focusedIndex:number;onPointerMoveItem:(index:number,event:React.PointerEvent)=>void;onBack:()=>void;onResume:()=>void}) {
  const available=isFreeDrive;
  const active=useDriveActivityStore(state=>state.activity);
  const activities:readonly {id:DriveActivity;name:string;description:string}[]=[
    {id:'cruise',name:'Just drive',description:'Open road. No timer. No score.'},
    {id:'hunt',name:'Boost Hunt',description:'90 seconds · chase glowing rings and refill boost.'},
    {id:'drift',name:'Drift Club',description:'90 seconds · link corners and build a score.'},
  ];
  return <section className="activities-subview" style={menuStyles.subView} aria-labelledby="activities-title">
    <h2 id="activities-title" style={menuStyles.subViewTitle}>Make it your drive</h2>
    <p>{available?'Pick one optional activity. Your car and map stay the same.':'Activities are available in Free Drive. Finish your race or return to the menu to change mode.'}</p>
    <div style={{display:'grid',gap:12}}>{activities.map((activity,index)=><button type="button" key={activity.id} disabled={!available} aria-pressed={active===activity.id} data-focused={focusedIndex===index} onPointerMove={event=>onPointerMoveItem(index,event)} onClick={()=>{chooseDriveActivity(activity.id);onResume();}} style={{...menuStyles.button,...getFocusStyle(focusedIndex===index),display:'grid',gap:5,textAlign:'left',minHeight:76,background:active===activity.id?'#dce9d3':'#fffaf0',color:'#253a32',border:'1px solid #b8c6af'}}><strong>{activity.name}</strong><span style={{fontSize:12}}>{activity.description}</span></button>)}</div>
    <button type="button" data-focused={focusedIndex===3} onPointerMove={event=>onPointerMoveItem(3,event)} onClick={onBack} style={{...menuStyles.button,...getFocusStyle(focusedIndex===3),marginTop:14}}>Back</button>
  </section>;
}
