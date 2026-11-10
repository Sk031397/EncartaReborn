/**
 * Boot screen — the nostalgic "insert disc" intro (Req 1.3).
 *
 * It masks snapshot load/validation and transitions into Explore. Motion is the
 * gentle disc spin, which CSS disables under prefers-reduced-motion (Req 7.3).
 * Nothing autoplays with sound; the optional insert cue only fires if the user
 * has opted into sound (Req 7.2).
 */
import { useEffect, useRef, useState } from 'react';
import { DiscLoader, Button } from '../ui/components';
import { playCue } from '../ui/sound';
import './boot.css';

type BootScreenProps = {
  /** Called once the user chooses to enter (or auto-advance completes). */
  onEnter: () => void;
  /** When true, show the "ready" state with an explicit enter button. */
  ready?: boolean;
};

export function BootScreen({ onEnter, ready = true }: BootScreenProps) {
  const [entering, setEntering] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleEnter() {
    if (entering) return;
    setEntering(true);
    playCue('insert');
    onEnter();
  }

  return (
    <main className="boot" aria-labelledby="boot-title">
      <div className="boot__disc">
        <DiscLoader label="Loading the Encarta Reborn disc" />
      </div>
      <h1 id="boot-title" className="boot__title" tabIndex={-1} ref={headingRef}>
        Encarta Reborn
      </h1>
      <p className="boot__tagline">The encyclopedia that doesn&apos;t scroll back.</p>
      <p className="boot__hint">
        A calm, offline place to wander the world &mdash; no feed, no algorithm,
        every fact sourced.
      </p>
      <div className="boot__action">
        <Button variant="primary" onClick={handleEnter} disabled={!ready}>
          {ready ? 'Insert disc' : 'Loading\u2026'}
        </Button>
      </div>
    </main>
  );
}
