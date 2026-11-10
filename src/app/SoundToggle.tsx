/**
 * Opt-in sound toggle. Sound is OFF by default (Req 7.2); this is the only way
 * to turn it on, and the preference lives on-device.
 */
import { useState } from 'react';
import { isSoundEnabled, setSoundEnabled, playCue } from '../ui/sound';

export function SoundToggle() {
  const [on, setOn] = useState(isSoundEnabled());

  function toggle() {
    const next = !on;
    setSoundEnabled(next);
    setOn(next);
    if (next) playCue('select'); // confirm with a cue only when turning on
  }

  return (
    <button
      type="button"
      className="btn btn--ghost app-sound"
      aria-pressed={on}
      onClick={toggle}
    >
      Sound: {on ? 'on' : 'off'}
    </button>
  );
}
