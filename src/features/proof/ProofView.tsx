/**
 * Proof — the manifesto, checked live instead of promised. Each line is measured
 * from the bundled data or the browser at the moment the reader opens the page,
 * and the reader can re-check after wandering.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRenderablePlaces } from '../../data/snapshotLoader';
import { Button } from '../../ui/components';
import { auditData, auditNetwork, auditStorage } from './measure';
import './proof.css';

function Check({ pass, title, children }: { pass: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className={`proof__item ${pass ? 'proof__item--pass' : 'proof__item--fail'}`}>
      <span className="proof__mark" aria-hidden="true">{pass ? '✓' : '!'}</span>
      <div>
        <h2 className="proof__title">
          {title} <span className="visually-hidden">{pass ? '(passes)' : '(needs attention)'}</span>
        </h2>
        <div className="proof__detail">{children}</div>
      </div>
    </li>
  );
}

export function ProofView() {
  const data = useMemo(() => auditData(getRenderablePlaces()), []);
  const [network, setNetwork] = useState(() => auditNetwork());
  const [storage, setStorage] = useState(() => auditStorage());
  const [checkedAt, setCheckedAt] = useState(() => new Date());

  function recheck() {
    setNetwork(auditNetwork());
    setStorage(auditStorage());
    setCheckedAt(new Date());
  }

  const licenseLine = Object.entries(data.licenses)
    .sort((a, b) => b[1] - a[1])
    .map(([license, count]) => `${count} ${license}`)
    .join(', ');

  return (
    <section aria-labelledby="proof-title" className="proof">
      <h1 id="proof-title">Proof, not promises</h1>
      <p className="proof__lead">
        Every claim this disc makes about itself, measured right now in your browser. Wander
        around, then come back and check again.
      </p>

      <ul className="proof__list">
        <Check pass={data.unsourced === 0} title="Every claim is sourced">
          {data.places} places, {data.facts} facts, and {data.images} images cite{' '}
          {data.sources} distinct sources. Unsourced items: <strong>{data.unsourced}</strong>.
          <br />
          Licenses: {licenseLine}.
        </Check>

        <Check pass={network.supported && network.external.length === 0} title="Nothing phones home">
          {network.supported ? (
            <>
              This page has loaded {network.total} files, from{' '}
              <strong>{network.external.length}</strong> other website
              {network.external.length === 1 ? '' : 's'}.
              {network.external.length > 0 ? ` (${network.external.join(', ')})` : ''}
            </>
          ) : (
            'This browser does not report network activity, so this cannot be measured here.'
          )}
        </Check>

        <Check pass={storage.cookies === 0} title="No accounts, no tracking">
          Cookies: <strong>{storage.cookies}</strong>. Data kept on this device:{' '}
          {storage.keys.length === 0
            ? 'none yet.'
            : `${storage.keys.join(', ')} (${storage.bytes.toLocaleString()} bytes).`}{' '}
          It never leaves your device, and you can clear it from the{' '}
          <Link to="/log">expedition log</Link>.
        </Check>

        <Check pass title="No feed, no algorithm">
          There is no infinite scroll and nothing ranks places for you. Trails come from shared
          themes, geography, and kind of place, in code that takes no engagement input at all.
        </Check>

        <Check pass={!navigator.onLine || 'serviceWorker' in navigator} title="Works offline">
          {navigator.onLine
            ? 'You are online. After one visit the whole disc, images included, is cached: try it with your connection off.'
            : 'You are offline right now, and the disc is still working.'}
        </Check>
      </ul>

      <div className="proof__actions">
        <Button variant="primary" onClick={recheck}>
          Check again
        </Button>
        <span className="proof__time">
          Last checked {checkedAt.toLocaleTimeString()}
        </span>
      </div>
    </section>
  );
}
