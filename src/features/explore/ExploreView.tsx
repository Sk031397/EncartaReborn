/**
 * Explore — wander the world by picking a place on a 3D globe or a flat map, or
 * "spin" to a random one. Every place is also in a plain, keyboard-friendly list,
 * so discovery is self-directed and fully navigable (Req 2). There is no infinite
 * scroll and no "for you" stream; the spin is a neutral random choice, not a
 * recommendation (Req 2.3, 2.4).
 *
 * The 3D globe is an enhancement: it is lazy-loaded (three.js stays out of the
 * boot screen), it never moves on its own, and when WebGL is unavailable, or the
 * reader prefers it, the flat map shows the same places.
 */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { getRenderablePlaces } from '../../data/snapshotLoader';
import { buildLandSvgPath } from './geo';
import { FLIGHT_MS } from './globeMath';
import { project, pickRandomIndex } from './projection';
import { isWebGLAvailable } from './webgl';
import { readViewPref, writeViewPref, type MapView } from './viewPref';
import {
  NO_FILTER,
  PLACE_TYPE_OPTIONS,
  filterPlaces,
  isFiltering,
  type PlaceFilter,
} from './filter';
import { REGIONS, REGION_LABELS } from '../../data/regions';
import { playCue } from '../../ui/sound';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { Button, DiscLoader } from '../../ui/components';
import './explore.css';

// three.js is the heaviest dependency; only fetch it when the globe is shown.
const Globe3D = lazy(() => import('./Globe3D'));

const MAP_W = 720;
const MAP_H = 360;

export function ExploreView() {
  const navigate = useNavigate();
  const places = useMemo(() => getRenderablePlaces(), []);
  const landPath = useMemo(() => buildLandSvgPath(MAP_W, MAP_H), []);
  const reducedMotion = useReducedMotion();

  const [webgl, setWebgl] = useState<boolean>(() => isWebGLAvailable());
  const [view, setView] = useState<MapView>(() => readViewPref() ?? 'globe');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlaceFilter>(NO_FILTER);
  const visible = useMemo(() => filterPlaces(places, filter), [places, filter]);

  const showGlobe = webgl && view === 'globe';

  function open(id: string) {
    playCue('select');
    navigate(`/place/${id}`);
  }

  // "Spin" on the globe: turn to the chosen place first, then open it. With
  // reduced motion (or the flat map) there is nothing to watch, so go straight in.
  useEffect(() => {
    if (!pendingId) return;
    const timer = window.setTimeout(() => {
      playCue('select');
      navigate(`/place/${pendingId}`);
    }, FLIGHT_MS + 250);
    return () => window.clearTimeout(timer);
  }, [pendingId, navigate]);

  function spin() {
    const i = pickRandomIndex(places.length);
    const place = places[i];
    if (!place) return;
    if (showGlobe && !reducedMotion) {
      setFocusId(place.id);
      setPendingId(place.id);
    } else {
      open(place.id);
    }
  }

  function chooseView(next: MapView) {
    setView(next);
    writeViewPref(next);
    setPendingId(null);
  }

  const handleUnavailable = useCallback(() => setWebgl(false), []);

  return (
    <section aria-labelledby="explore-title">
      <h1 id="explore-title">Explore the world</h1>
      <p className="explore__lead">
        Pick a place to read about it, or spin to wander somewhere new. No feed,
        no algorithm &mdash; just your curiosity.
      </p>
      <p className="explore__count">
        {places.length} places on this disc, every fact sourced.
      </p>

      <div className="explore__toolbar">
        <Button variant="primary" onClick={spin}>
          Spin to a random place
        </Button>
        {webgl ? (
          <div className="explore__views" role="group" aria-label="Map view">
            <Button
              variant="ghost"
              aria-pressed={showGlobe}
              onClick={() => chooseView('globe')}
            >
              3D globe
            </Button>
            <Button
              variant="ghost"
              aria-pressed={!showGlobe}
              onClick={() => chooseView('flat')}
            >
              Flat map
            </Button>
          </div>
        ) : null}
      </div>

      <div className="explore__map-wrap">
        {showGlobe ? (
          <Suspense
            fallback={
              <div className="explore__loading">
                <DiscLoader label="Loading the globe" />
              </div>
            }
          >
            <Globe3D
              places={places}
              focusId={focusId}
              reducedMotion={reducedMotion}
              onSelect={open}
              onUnavailable={handleUnavailable}
            />
          </Suspense>
        ) : (
          <svg
            className="worldmap"
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            role="group"
            aria-label="World map of available places"
          >
            <rect
              className="worldmap__ocean"
              x={0}
              y={0}
              width={MAP_W}
              height={MAP_H}
              rx={8}
            />
            {/* Real Natural Earth coastlines. */}
            <g className="worldmap__land" aria-hidden="true">
              <path d={landPath} fillRule="evenodd" />
            </g>
            {/* Graticule lines over the land. */}
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={`h-${f}`}
                className="worldmap__graticule"
                x1={0}
                y1={MAP_H * f}
                x2={MAP_W}
                y2={MAP_H * f}
              />
            ))}
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={`v-${f}`}
                className="worldmap__graticule"
                x1={MAP_W * f}
                y1={0}
                x2={MAP_W * f}
                y2={MAP_H}
              />
            ))}

            {places.map((place) => {
              const { x, y } = project(place.coordinates, MAP_W, MAP_H);
              return (
                <g
                  key={place.id}
                  className="marker"
                  role="button"
                  tabIndex={0}
                  aria-label={`${place.name} (${place.type})`}
                  onClick={() => open(place.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      open(place.id);
                    }
                  }}
                >
                  <circle className="marker__dot" cx={x} cy={y} r={5} />
                  <text className="marker__label" x={x + 9} y={y + 4}>
                    {place.name}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <p className="explore__credit">
        Coastlines:{' '}
        <a
          href="https://www.naturalearthdata.com/"
          target="_blank"
          rel="noreferrer noopener"
        >
          Natural Earth
        </a>{' '}
        (public domain).
      </p>

      {/* Find a place: plain lookup by name, region, or kind. Nothing here learns
          from what the reader does. */}
      <form
        className="explore__filters"
        role="search"
        aria-label="Find a place"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="field">
          <label htmlFor="place-search">Search places</label>
          <input
            id="place-search"
            type="search"
            value={filter.query}
            autoComplete="off"
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="place-region">Region</label>
          <select
            id="place-region"
            value={filter.region}
            onChange={(e) =>
              setFilter({ ...filter, region: e.target.value as PlaceFilter['region'] })
            }
          >
            <option value="all">All regions</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {REGION_LABELS[region]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="place-type">Kind of place</label>
          <select
            id="place-type"
            value={filter.type}
            onChange={(e) =>
              setFilter({ ...filter, type: e.target.value as PlaceFilter['type'] })
            }
          >
            <option value="all">All kinds</option>
            {PLACE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {isFiltering(filter) ? (
          <Button variant="ghost" onClick={() => setFilter(NO_FILTER)}>
            Clear filters
          </Button>
        ) : null}
      </form>
      <p className="explore__results" role="status" aria-live="polite">
        {visible.length === places.length
          ? `All ${places.length} places`
          : `${visible.length} of ${places.length} places match`}
      </p>

      {/* A bounded index: the same places as a plain list for quick keyboard
          access. Not an infinite feed, it ends. On the globe, hovering or
          focusing a name turns the globe to face it. */}
      <nav className="explore__index" aria-label="All places">
        <ul className="rail">
          {visible.map((place) => (
            <li className="rail__item" key={`idx-${place.id}`}>
              <Button
                variant="ghost"
                onClick={() => open(place.id)}
                onMouseEnter={() => showGlobe && setFocusId(place.id)}
                onFocus={() => showGlobe && setFocusId(place.id)}
              >
                {place.name}
              </Button>
            </li>
          ))}
        </ul>
        {visible.length === 0 ? (
          <p className="explore__empty">
            No places match. Try fewer words, or clear the filters.
          </p>
        ) : null}
      </nav>
    </section>
  );
}
