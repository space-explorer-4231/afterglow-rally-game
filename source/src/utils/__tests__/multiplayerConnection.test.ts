import { describe, expect, it } from 'vitest';
import { getConnectionIndicator } from '../multiplayerConnection';
import type { ConnectionStatus } from '@/types/network';

describe('Multiplayer connection feedback', () => {
  it.each<ConnectionStatus>(['connecting', 'reconnecting', 'error', 'disconnected', 'version_mismatch'])(
    'does not claim the lobby is online while %s', status => {
      const indicator = getConnectionIndicator(status);
      expect(indicator.connected).toBe(false);
      expect(indicator.label).not.toBe('ONLINE');
      expect(indicator.color).not.toBe('#34D399');
    },
  );
  it.each<ConnectionStatus>(['in_lobby', 'in_game'])('shows an established %s connection as online', status => {
    expect(getConnectionIndicator(status)).toEqual({ label: 'ONLINE', color: '#34D399', connected: true });
  });
  it('gives recovery-specific feedback for disconnects, errors, and incompatible clients', () => {
    expect(getConnectionIndicator('reconnecting').label).toBe('RECONNECTING…');
    expect(getConnectionIndicator('error').label).toBe('CONNECTION ERROR');
    expect(getConnectionIndicator('version_mismatch').label).toBe('UPDATE REQUIRED');
  });
});
