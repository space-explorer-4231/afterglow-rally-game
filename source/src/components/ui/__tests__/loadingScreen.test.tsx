import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LoadingScreen } from '../LoadingScreen';
import { useGameStore } from '@/store/gameStore';

describe('LoadingScreen - Menu Transition & Gameplay Loading', () => {
  it.each(['level1_island','level3_sweden','level6_gymkhana_harbor'])('keeps the original gallery artwork and discreet text on %s', level=>{
    useGameStore.setState({gameState:'loading',loadingTarget:'gameplay',selectedLevelId:level,isSceneReady:false});
    const html=renderToString(<LoadingScreen/>);
    expect(html).toContain('coastal-drive.webp');expect(html).not.toContain('CREATED BY');expect(html).not.toContain('Mateusz');
  });
  beforeEach(() => {
    useGameStore.setState({
      gameState: 'loading',
      loadingTarget: 'menu',
      selectedLevelId: 'level1_island',
      selectedVehicleId: 'kodiak_raid',
      isSceneReady: false,
      isRenderReady:true,
    });
  });

  it('renders loading overlay with PREPARING AEROLINE when loadingTarget is menu and not ready', () => {
    const html = renderToString(<LoadingScreen />);

    expect(html).toContain('id="loading-screen"');
    expect(html).toContain('PREPARING AEROLINE');
    expect(html).toContain('/aeroline-logo.svg');
  });

  it('renders YOUR OPEN ROAD IS READY when scene is ready and transitioning to menu', () => {
    useGameStore.setState({
      isSceneReady: true,
    });
    const html = renderToString(<LoadingScreen />);

    expect(html).toContain('YOUR OPEN ROAD IS READY');
  });

  it('omits stage pill when transitioning to menu', () => {
    const html = renderToString(<LoadingScreen />);

    expect(html).not.toContain('MACHINE:');
  });

  it('renders stage pill and simulation initialization text when entering gameplay', () => {
    useGameStore.setState({
      gameState: 'loading',
      loadingTarget: 'gameplay',
    });

    const html = renderToString(<LoadingScreen />);

    expect(html).toContain('MACHINE:');
    expect(html).toContain('STAGE:');
    expect(html).toContain('FINDING YOUR STARTING LINE');
  });

  it('does not leave an opaque overlay over ready gameplay or resumed play', () => {
    useGameStore.setState({ gameState: 'playing', isSceneReady: true, isVehicleVisualReady: true, isRenderReady:true });
    expect(renderToString(<LoadingScreen />)).toBe('');
    useGameStore.setState({ gameState: 'paused' });
    expect(renderToString(<LoadingScreen />)).toBe('');
    useGameStore.setState({ gameState: 'playing' });
    expect(renderToString(<LoadingScreen />)).toBe('');
  });

  it('renders nothing when not in loading state and not visible', () => {
    useGameStore.setState({
      gameState: 'menu',
      loadingTarget: 'menu',
    });

    const html = renderToString(<LoadingScreen />);
    expect(html).toBe('');
  });
});

it('keeps a visible graphics preparation status until renderer warm-up completes',()=>{useGameStore.setState({gameState:'loading',loadingTarget:'gameplay',isSceneReady:true,isVehicleVisualReady:true,isRenderReady:false});expect(renderToString(<LoadingScreen/>)).toContain('WARMING UP GRAPHICS');});
