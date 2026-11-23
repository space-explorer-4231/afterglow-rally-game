import type { ConnectionStatus } from '@/types/network';

/** Lobby status text must describe the connection before a room can be joined. */
export interface ConnectionIndicator {
  label: string;
  color: string;
  connected: boolean;
}

const INDICATORS: Record<ConnectionStatus, ConnectionIndicator> = {
  disconnected: { label: 'OFFLINE', color: '#F87171', connected: false },
  connecting: { label: 'CONNECTING…', color: '#FBBF24', connected: false },
  reconnecting: { label: 'RECONNECTING…', color: '#FBBF24', connected: false },
  error: { label: 'CONNECTION ERROR', color: '#F87171', connected: false },
  version_mismatch: { label: 'UPDATE REQUIRED', color: '#F87171', connected: false },
  in_lobby: { label: 'ONLINE', color: '#34D399', connected: true },
  in_game: { label: 'ONLINE', color: '#34D399', connected: true },
};

/** Return a stable indicator for every supported network state. */
export function getConnectionIndicator(status: ConnectionStatus): ConnectionIndicator {
  return INDICATORS[status];
}
