import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { cycleRoomCodeDigit, normalizeRoomCode } from './roomCodeEntry';

/** Controller routing for the compact code field and its single submit action. */
export interface RoomCodeJoinHandle {
  move: (direction: 'left' | 'right' | 'up' | 'down') => boolean;
  confirm: () => void;
}

interface RoomCodeJoinProps {
  active: boolean;
  pending: boolean;
  updateRequired: boolean;
  error: string | null;
  onActivate: () => void;
  onChangeCode: () => void;
  onJoinCode: (code: string) => void;
}

/** One field supports typing/paste; D-pad editing also works without a keyboard. */
export const RoomCodeJoin = forwardRef<RoomCodeJoinHandle, RoomCodeJoinProps>(function RoomCodeJoin(
  { active, pending, updateRequired, error, onActivate, onChangeCode, onJoinCode }, ref,
) {
  const [code, setCode] = useState('');
  const [cursor, setCursor] = useState(0);
  const codeRef = useRef(code);
  const cursorRef = useRef(cursor);
  const callbacks = useRef({ onJoinCode, onChangeCode });
  const disabled = pending || updateRequired;
  const disabledRef = useRef(disabled);
  useLayoutEffect(() => {
    codeRef.current = code;
    cursorRef.current = cursor;
    callbacks.current = { onJoinCode, onChangeCode };
    disabledRef.current = disabled;
  }, [code, cursor, onJoinCode, onChangeCode, disabled]);

  useImperativeHandle(ref, () => ({
    move(direction) {
      const position = cursorRef.current;
      if (direction === 'left' || direction === 'right') {
        const next = position + (direction === 'left' ? -1 : 1);
        if (next < 0 || next > 6) return false;
        cursorRef.current = next;
        setCursor(next);
        return true;
      }
      if (position === 6) return false;
      if (!disabledRef.current) {
        const next = cycleRoomCodeDigit(codeRef.current, position, direction === 'up' ? 1 : -1);
        codeRef.current = next;
        setCode(next);
        callbacks.current.onChangeCode();
      }
      return true;
    },
    confirm() {
      if (disabledRef.current) return;
      if (cursorRef.current < 6) {
        const normalized = normalizeRoomCode(codeRef.current);
        const next = /^[0-9A-F]{0,6}$/.test(normalized) ? normalized.padEnd(6, '0') : '000000';
        codeRef.current = next;
        setCode(next);
        cursorRef.current += 1;
        setCursor(cursorRef.current);
      } else callbacks.current.onJoinCode(codeRef.current);
    },
  }), []);

  return <form className="club-room-code-join" aria-label="Join a friend by room code" onSubmit={event => {
    event.preventDefault();
    if (!disabled) onJoinCode(code);
  }} style={{ margin: '12px 0 18px', width: '100%' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <label htmlFor="friend-room-code" style={{ fontSize: 13, fontWeight: 700 }}>Have a room code?</label>
      <input id="friend-room-code" name="room-code" type="text" value={code} placeholder="A1B2C3"
        autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={6} disabled={disabled}
        aria-label="Six-character room code" aria-invalid={Boolean(error)} aria-describedby={error ? 'friend-room-code-error' : 'friend-room-code-help'}
        data-gamepad-focused={active && cursor < 6 ? 'true' : undefined}
        onFocus={() => { setCursor(0); onActivate(); }}
        onChange={event => { setCode(event.target.value.toUpperCase()); onChangeCode(); }}
        onPaste={event => {
          const pasted = normalizeRoomCode(event.clipboardData.getData('text'));
          if (/^[0-9A-F]{6}$/.test(pasted)) { event.preventDefault(); setCode(pasted); onChangeCode(); }
        }}
        style={{ width: 150, maxWidth: '100%', minHeight: 44, boxSizing: 'border-box', padding: '9px 12px', fontSize: 17, fontFamily: 'ui-monospace, monospace', letterSpacing: '.14em', borderRadius: 8, border: '1px solid var(--club-line)', background: 'var(--club-paper)', color: 'var(--club-ink)' }} />
      <button type="submit" disabled={disabled} aria-busy={pending}
        data-gamepad-focused={active && cursor === 6 ? 'true' : undefined}
        onFocus={() => { setCursor(6); onActivate(); }}
        style={{ minHeight: 44, padding: '9px 16px', fontWeight: 750 }}>
        {pending ? 'Connecting…' : updateRequired ? 'Update required' : 'Join by code'}
      </button>
    </div>
    <p id="friend-room-code-help" style={{ margin: '6px 0 0', fontSize: 11, lineHeight: 1.4 }}>
      {active ? `Press Enter to join. Controller: ${cursor < 6 ? `digit ${cursor + 1} of 6 · up/down changes it` : 'Join selected'} · left/right moves · A confirms · B leaves code entry.` : 'Type or paste your friend’s six-character code, then press Enter. Controller: select the field to edit with the D-pad.'}
    </p>
    {error && <p id="friend-room-code-error" role="alert" style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 650 }}>{error}</p>}
  </form>;
});
