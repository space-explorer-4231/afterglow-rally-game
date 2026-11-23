import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {getFocusStyle} from '../menu/menuStyles';

function luminance(hex:string){
  const channels=hex.match(/[\da-f]{2}/gi)?.map(value=>parseInt(value,16)/255)??[];
  const linear=channels.map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function token(css:string,name:string){const value=css.match(new RegExp(`--${name}:#([\\da-f]{6})`,'i'))?.[1];if(!value)throw new Error(`Missing palette token ${name}`);return value;}

describe('actual shared instrument palette',()=>{
  const menu=readFileSync(new URL('../../../roadClub.css',import.meta.url),'utf8');
  const hud=readFileSync(new URL('../hudLayout.css',import.meta.url),'utf8');
  it('keeps normal, muted and primary menu text legible',()=>{
    const paper=token(menu,'club-paper');
    expect(contrast(token(menu,'club-ink'),paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(menu,'club-muted'),paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('ffffff',token(menu,'club-sea'))).toBeGreaterThanOrEqual(4.5);
  });
  it('does not move controls or override their accessible label colors on controller focus',()=>{
    const focus=getFocusStyle(true);
    expect(focus.transform).toBe('none');
    expect(focus.outlineOffset).toBe('-3px');
    expect(focus.color).toBeUndefined();
    expect(focus.background).toBeUndefined();
    expect(contrast('a8660c',token(menu,'club-paper'))).toBeGreaterThanOrEqual(3);
    expect(getFocusStyle(false)).toEqual({});
  });
  it('keeps the final HUD text legible over the brightest possible scenery',()=>{
    const surface=[...hud.matchAll(/--hud-surface:rgba\((\d+),(\d+),(\d+),([.\d]+)\)/g)].at(-1);
    expect(surface).toBeDefined();if(!surface)return;
    const alpha=Number(surface[4]);
    const brightest=[surface[1],surface[2],surface[3]].map(value=>Math.round(Number(value)*alpha+255*(1-alpha)).toString(16).padStart(2,'0')).join('');
    for(const name of ['hud-text','hud-muted','hud-accent']){
      const matches=[...hud.matchAll(new RegExp(`--${name}:#([\\da-f]{6})`,'gi'))];
      expect(contrast(matches.at(-1)?.[1]??'',brightest)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
