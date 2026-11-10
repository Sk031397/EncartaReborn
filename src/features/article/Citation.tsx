/**
 * Citation — the visible provenance for a sourced element (Req 3.2).
 * Shows each source's name and license, linking to the source URL. This is how
 * the reader can trace any claim back to an approved open dataset.
 */
import type { Source } from '../../data/schema';

export function Citation({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <span className="citation">
      <span className="visually-hidden">Sources: </span>
      {sources.map((s, i) => (
        <span key={`${s.url}-${i}`} className="citation__item">
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer noopener"
            className="citation__link"
          >
            {s.name}
          </a>
          <span className="citation__license"> ({s.license})</span>
          {i < sources.length - 1 ? <span aria-hidden="true">; </span> : null}
        </span>
      ))}
    </span>
  );
}
