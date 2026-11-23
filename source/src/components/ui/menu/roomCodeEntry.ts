import type { RoomSummary } from '@/types/network';
import { getRoomJoinAvailability } from './roomJoinAvailability';

/** Result of validating an invitation before changing the active map/session. */
export type RoomCodeResolution = { ok: true; room: RoomSummary } | { ok: false; message: string };

/** Accept a copied code or invitation URL, ignoring harmless separators/case. */
export function normalizeRoomCode(raw: string): string {
  let value = raw.trim();
  if (value.length > 2048) return '';
  if (/^https?:\/\//i.test(value)) {
    try { value = new URL(value).searchParams.get('room') ?? ''; } catch { return ''; }
  }
  return value.replace(/[\s-]/g, '').toUpperCase();
}

/** Resolve only an available room from the current authoritative room directory. */
export function resolveRoomCode(
  raw: string, rooms: readonly RoomSummary[], connected: boolean, updateRequired: boolean, joining: boolean,
): RoomCodeResolution {
  const code = normalizeRoomCode(raw);
  if (!/^[0-9A-F]{6}$/.test(code)) return { ok: false, message: 'Enter the six-character room code your friend shared (0–9 and A–F).' };
  if (updateRequired) return { ok: false, message: 'Reload the game before joining this server.' };
  if (joining) return { ok: false, message: 'Your room connection is already in progress.' };
  if (!connected) return { ok: false, message: 'Still connecting to multiplayer. Wait for Online, then try again.' };
  const room = rooms.find(candidate => candidate.id.toUpperCase() === code);
  if (!room) return { ok: false, message: 'Room not found. Check the code with your friend; closed rooms cannot be joined. The room list is refreshing.' };
  const availability = getRoomJoinAvailability(room, false, false);
  return availability.disabled ? { ok: false, message: availability.reason } : { ok: true, room };
}

/** Cycle one hexadecimal position for controller-only code entry without an OS keyboard. */
export function cycleRoomCodeDigit(value: string, index: number, direction: -1 | 1): string {
  const normalized = normalizeRoomCode(value);
  const digits = /^[0-9A-F]{0,6}$/.test(normalized) ? normalized.padEnd(6, '0') : '000000';
  const slot = Math.max(0, Math.min(5, Math.trunc(Number.isFinite(index) ? index : 0)));
  const alphabet = '0123456789ABCDEF';
  const current = alphabet.indexOf(digits[slot]);
  return digits.slice(0, slot) + alphabet[(current + direction + 16) % 16] + digits.slice(slot + 1);
}
