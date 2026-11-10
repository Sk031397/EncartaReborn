/**
 * Expedition log — your private, on-device record of places you have visited,
 * plus your own notes (Req 5). Bounded list, no feed, no metrics. Nothing here
 * leaves the device. You can clear it entirely at any time.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getLog, setNote, clearLog, type LogEntry } from '../../lib/storage';
import { Button, Panel } from '../../ui/components';
import './log.css';

export function ExpeditionLog() {
  const [entries, setEntries] = useState<LogEntry[]>(() => getLog());

  function handleNote(entry: LogEntry, note: string) {
    setNote(entry.id, entry.name, note);
    setEntries(getLog());
  }

  function handleClear() {
    clearLog();
    setEntries(getLog());
  }

  return (
    <section aria-labelledby="log-title">
      <h1 id="log-title">Expedition log</h1>
      <p className="log__lead">
        The places you&apos;ve wandered to, kept on this device only. Your
        discovery &mdash; not an algorithm&apos;s history.
      </p>

      {entries.length === 0 ? (
        <Panel title="No places yet">
          <p>
            Head to the <Link to="/">map</Link> and open a place. It&apos;ll
            show up here.
          </p>
        </Panel>
      ) : (
        <>
          <div className="log__toolbar">
            <Button variant="ghost" onClick={handleClear}>
              Clear log
            </Button>
          </div>
          <ul className="log__list">
            {entries.map((entry) => (
              <li className="log__entry" key={entry.id}>
                <div className="log__entry-head">
                  <Link className="log__entry-name" to={`/place/${entry.id}`}>
                    {entry.name}
                  </Link>
                  <time className="log__entry-time" dateTime={entry.visitedAt}>
                    {new Date(entry.visitedAt).toLocaleDateString()}
                  </time>
                </div>
                <label className="log__note-label" htmlFor={`note-${entry.id}`}>
                  Your note
                </label>
                <textarea
                  id={`note-${entry.id}`}
                  className="log__note"
                  rows={2}
                  defaultValue={entry.note}
                  placeholder="What did you notice?"
                  onBlur={(e) => handleNote(entry, e.target.value)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
