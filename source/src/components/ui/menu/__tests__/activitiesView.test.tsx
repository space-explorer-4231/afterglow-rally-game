import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ActivitiesView} from '../ActivitiesView';
import {MainView} from '../MainView';


const props={isFreeDrive:true,focusedIndex:0,onPointerMoveItem:vi.fn(),onBack:vi.fn(),onResume:vi.fn()};

it('keeps optional challenges accessible from pause without adding another home action',()=>{
  const mainProps={isPause:true,focusedIndex:2,textColor:'#304335',onPointerMoveItem:vi.fn(),onSelectView:vi.fn(),onResume:vi.fn(),onReset:vi.fn(),onReturnToMainMenu:vi.fn()};
  const pause=renderToStaticMarkup(<MainView {...mainProps}/>);
  const home=renderToStaticMarkup(<MainView {...mainProps} isPause={false}/>);
  expect(pause).toContain('ACTIVITIES');expect(home).not.toContain('ACTIVITIES');
  expect((pause.match(/<button/g)??[]).length).toBe(5);
});

it('offers one short description for each of the three free-drive choices',()=>{
  const html=renderToStaticMarkup(<ActivitiesView {...props}/>);
  expect(html).toContain('Just drive');expect(html).toContain('Boost Hunt');expect(html).toContain('Drift Club');
  expect(html).not.toContain('disabled=""');
  expect((html.match(/<button/g)??[]).length).toBe(4);
});

it('cannot start personal activities over an ongoing race',()=>{
  const html=renderToStaticMarkup(<ActivitiesView {...props} isFreeDrive={false}/>);
  expect((html.match(/disabled=""/g)??[]).length).toBe(3);
  expect(html).toContain('Finish your race');
  expect(html).toContain('>Back</button>');
});
