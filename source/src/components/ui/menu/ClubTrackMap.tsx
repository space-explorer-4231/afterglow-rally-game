import {useMemo} from 'react';
import type {LevelPreset} from '@/types/level';

/** Exact checkpoint route, rather than invented imagery standing in for the course. */
export function ClubTrackMap({level}:{level:LevelPreset}) {
  const route=useMemo(()=>{
    const points=level.data.track.points;
    const xs=points.map(p=>p.x),zs=points.map(p=>p.z);
    const minX=Math.min(...xs),minZ=Math.min(...zs),size=Math.max(1,Math.max(...xs)-minX,Math.max(...zs)-minZ);
    return points.map(p=>`${12+(p.x-minX)/size*76},${12+(p.z-minZ)/size*76}`).join(' ');
  },[level]);
  return <svg className="club-track-map" viewBox="0 0 100 100" role="img" aria-label={`${level.name} checkpoint route`}>
    <polyline points={route+' '+route.split(' ')[0]} fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round"/>
    <circle cx={route.split(' ')[0]?.split(',')[0]} cy={route.split(' ')[0]?.split(',')[1]} r="5" fill="#e37856" stroke="#fff9ed" strokeWidth="2"/>
  </svg>;
}
