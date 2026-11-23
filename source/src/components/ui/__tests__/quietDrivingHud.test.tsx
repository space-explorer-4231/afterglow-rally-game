import {describe,it,expect} from 'vitest';
import {renderToString} from 'react-dom/server';
import {DriveDashboard} from '../DriveDashboard';
import {DrivingTips} from '../DrivingTips';
import {useGameStore} from '@/store/gameStore';

describe('quiet driving instruments',()=>{
  it('introduces controls in races as well as free drive',()=>{
    const previous=useGameStore.getState().gameMode;
    try {
      useGameStore.setState({gameMode:'timeattack'});
      const html=renderToString(<DrivingTips touch={false}/>);
      expect(html).toContain('Hold Shift for boost');
      expect(html).not.toContain('Press C');
    } finally {useGameStore.setState({gameMode:previous});}
  });
  it('keeps fuel visible without permanent tuning and instruction controls',()=>{
    const html=renderToString(<DriveDashboard/>);
    expect(html).toContain('NOS tank 1');expect(html).toContain('NOS tank 2');
    expect(html).not.toContain('Driving settings');expect(html).not.toContain('drive-mode-row');expect(html).not.toContain('first-drive-guide');
  });
  it('shows one actionable tip with a dismiss control and touch-specific wording',()=>{
    const keyboard=renderToString(<DrivingTips touch={false}/>);
    expect(keyboard).toContain('Hold Shift for boost');expect(keyboard).not.toContain('Tap Space');expect(keyboard).toContain('Dismiss driving tips');
    const touch=renderToString(<DrivingTips touch/>);
    expect(touch).toContain('Hold NOS for boost');expect(touch).not.toContain('Shift');
  });
});
