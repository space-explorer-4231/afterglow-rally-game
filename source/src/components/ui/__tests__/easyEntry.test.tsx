import {it,expect,vi} from 'vitest';
import {Children,isValidElement,type ReactNode} from 'react';
import {renderToString} from 'react-dom/server';
import {MainView} from '../menu/MainView';
import {MultiplayerView} from '../menu/MultiplayerView';
function firstButton(node:ReactNode):(()=>void)|undefined {
 for(const child of Children.toArray(node)){
  if(!isValidElement<{children?:ReactNode;onClick?:()=>void}>(child))continue;
  if(child.type==='button')return child.props.onClick;
  const result=firstButton(child.props.children);if(result)return result;
 }
}
it('Quick Drive launches the prepared car while pause still invokes Resume',()=>{
 const play=vi.fn(),resume=vi.fn(),select=vi.fn();const props={isPause:false,focusedIndex:0,textColor:'#fff',onPointerMoveItem:vi.fn(),onSelectView:select,onResume:resume,onReset:vi.fn(),onReturnToMainMenu:vi.fn(),onStartDriving:play};
 firstButton(MainView(props))?.();expect(play).toHaveBeenCalledOnce();expect(select).not.toHaveBeenCalled();
 firstButton(MainView({...props,isPause:true}))?.();expect(resume).toHaveBeenCalledOnce();expect(play).toHaveBeenCalledOnce();
});
it('the preconfigured friend-race action appears before optional identity and garage choices',()=>{
 const html=renderToString(<MultiplayerView focusedIndex={0} textColor="#fff" onPointerMoveItem={vi.fn()} onSelectView={vi.fn()}/>);
 expect(html).toContain('START A RACE ROOM');expect(html).toContain('YOUR NAME');expect(html.indexOf('START A RACE ROOM')).toBeLessThan(html.indexOf('YOUR NAME'));
});
it('keeps native keyboard tab order aligned with the visible home choices',()=>{
 const html=renderToString(<MainView isPause={false} focusedIndex={2} textColor="#fff" onPointerMoveItem={vi.fn()} onSelectView={vi.fn()} onResume={vi.fn()} onReset={vi.fn()} onReturnToMainMenu={vi.fn()}/>);
 const labels=['QUICK DRIVE','SOLO','MULTIPLAYER','OPTIONS','CREDITS'];
 for(let i=0;i<labels.length;i++){expect(html).toContain(labels[i]);if(i>0)expect(html.indexOf(labels[i])).toBeGreaterThan(html.indexOf(labels[i-1]));}
 expect((html.match(/<button/g)??[]).length).toBe(5);
});

