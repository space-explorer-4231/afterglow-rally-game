import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {getAvailableLevels} from '@/config/levelRegistry';
import {ClubTrackMap} from '../ClubTrackMap';
describe('accurate course-choice route previews',()=>{
  it.each(getAvailableLevels())('normalizes $id checkpoints into the preview without invalid coordinates',level=>{
    const html=renderToStaticMarkup(<ClubTrackMap level={level}/>);
    expect(html).toContain(level.name+' checkpoint route');expect(html).not.toContain('NaN');expect(html).not.toContain('Infinity');
    const points=html.match(/points="([^"]+)"/)?.[1].split(' ')??[];
    expect(points.length).toBe(level.data.track.points.length+1);expect(points[0]).toBe(points.at(-1));
    for(const pair of points)for(const value of pair.split(',')){expect(Number(value)).toBeGreaterThanOrEqual(12);expect(Number(value)).toBeLessThanOrEqual(88);}
  });
});
