/**
 * Trail rail — 3-5 curiosity links to related places (Req 4). Rendered as a
 * bounded, labelled list of real navigation links. Following one opens that
 * article and the journey stays back-navigable via the browser/router.
 */
import { Link } from 'react-router-dom';
import type { Place } from '../../data/schema';
import { getRenderablePlaces } from '../../data/snapshotLoader';
import { buildTrails } from '../../lib/graph';
import { playCue } from '../../ui/sound';
import './trails.css';

const REASON_LABEL: Record<string, string> = {
  category: 'Shares a theme',
  geography: 'Nearby',
  topic: 'Similar kind of place',
};

export function TrailRail({ place }: { place: Place }) {
  const all = getRenderablePlaces();
  const byId = new Map(all.map((p) => [p.id, p]));
  const trails = buildTrails(place, all).filter((t) => byId.has(t.toId));

  if (trails.length === 0) return null;

  return (
    <nav className="trails" aria-labelledby="trails-title">
      <h2 id="trails-title" className="article__section-title">
        Follow a trail
      </h2>
      <ul className="rail">
        {trails.map((trail) => {
          const to = byId.get(trail.toId)!;
          return (
            <li className="rail__item" key={trail.toId}>
              <Link
                className="trail-card"
                to={`/place/${to.id}`}
                onClick={() => playCue('page')}
              >
                <span className="trail-card__name">{to.name}</span>
                <span className="trail-card__reason">
                  {REASON_LABEL[trail.reason] ?? 'Related'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
