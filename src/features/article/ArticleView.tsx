/**
 * Article — a calm, fully-sourced place article (Req 3).
 *
 * The SourceGate is the runtime embodiment of manifesto law 5: the summary is
 * only shown when it carries a valid source (otherwise the place is treated as
 * not found), and only sourced facts/media are rendered. There are deliberately
 * no likes, view counts, trending badges, or comments (Req 3.4). All images
 * carry alt text (Req 3.5). A bounded Trails rail (Task 8) continues the loop.
 */
import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlaceById } from '../../data/snapshotLoader';
import { renderableFacts, renderableMedia } from '../../data/validators';
import { recordVisit } from '../../lib/storage';
import { Panel } from '../../ui/components';
import { Citation } from './Citation';
import { TrailRail } from '../trails/TrailRail';
import './article.css';

export function ArticleView() {
  const { id } = useParams();
  const place = id ? getPlaceById(id) : undefined;

  // Record the visit in the on-device expedition log (Req 5.1).
  useEffect(() => {
    if (place) recordVisit(place.id, place.name);
  }, [place]);

  if (!place) {
    return (
      <Panel title="Not found">
        <p>
          That place isn&apos;t on this disc, or its entry could not be sourced.{' '}
          <Link to="/">Return to the map.</Link>
        </p>
      </Panel>
    );
  }

  const facts = renderableFacts(place);
  const media = renderableMedia(place);

  return (
    <article className="article" aria-labelledby="article-title">
      <header className="article__header">
        <p className="article__kicker">{place.type}</p>
        <h1 id="article-title" className="article__title">
          {place.name}
        </h1>
      </header>

      {media.length > 0 ? (
        <figure className="article__figure">
          <img
            className="article__image"
            src={media[0]!.url}
            alt={media[0]!.alt}
            loading="lazy"
          />
          <figcaption className="article__caption">
            {media[0]!.attribution} &middot; <Citation sources={media[0]!.sources} />
          </figcaption>
        </figure>
      ) : null}

      <section className="article__summary" aria-label="Summary">
        <p>{place.summary.text}</p>
        <p className="article__cite">
          <Citation sources={place.summary.sources} />
        </p>
      </section>

      {facts.length > 0 ? (
        <section aria-labelledby="facts-title">
          <h2 id="facts-title" className="article__section-title">
            Key facts
          </h2>
          <dl className="article__facts">
            {facts.map((fact) => (
              <div className="article__fact" key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>
                  {fact.value}
                  <span className="article__cite">
                    <Citation sources={fact.sources} />
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <TrailRail place={place} />

      <p className="article__back">
        <Link to="/">&larr; Back to the map</Link>
      </p>
    </article>
  );
}
