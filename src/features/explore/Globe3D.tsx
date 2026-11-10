/**
 * Interactive 3D globe (three.js) for the Explore view.
 *
 * Design rules from the manifesto, applied to 3D:
 *  - Calm: the globe never spins by itself. It moves only when the reader drags,
 *    zooms, uses a control button, or picks a place. Rendering is on demand (no
 *    permanent animation loop), and with prefers-reduced-motion every move is
 *    instant instead of eased.
 *  - Accessible: a canvas alone is invisible to keyboards and screen readers, so
 *    this component ships real <button> controls, and Explore keeps the plain
 *    list of every place next to it. The canvas is a supplement, not the only way in.
 *  - Offline: the Earth texture is painted from bundled Natural Earth data
 *    (see geo.ts). No images, tiles, or CDNs are fetched.
 *  - No engagement: nothing here reacts to anything except the reader's input.
 *
 * This module is lazy-loaded by ExploreView so three.js stays out of the first
 * paint (the boot screen).
 */
import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  CanvasTexture,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Spherical,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Place } from '../../data/schema';
import { buildEarthCanvas } from './geo';
import {
  FLIGHT_MS,
  easeInOut,
  latLonToVec3,
  normalize,
  slerpDirection,
  type Vec3,
} from './globeMath';
import './globe.css';

const TEAL = 0x7fe3d2;
const AMBER = 0xffcf7a;

const START_DISTANCE = 4.0; // far enough that the whole globe and its glow fit
const MIN_DISTANCE = 1.7;
const MAX_DISTANCE = 7;
const TURN_STEP = 0.4; // radians (~23 degrees) per control-button press
const TURN_MS = 350;

type GlobeProps = {
  places: Place[];
  /** When set, the globe turns to face this place. */
  focusId: string | null;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  /** Called if WebGL fails or the context is lost, so Explore can fall back. */
  onUnavailable: () => void;
};

type GlobeApi = {
  flyTo: (id: string) => void;
  turn: (dAzimuth: number, dPolar: number) => void;
  zoom: (factor: number) => void;
};

type Flight = {
  start: number;
  duration: number;
  from: Vec3;
  to: Vec3;
  distance: number;
};

type Marker = {
  id: string;
  name: string;
  position: Vector3;
  coreMaterial: MeshBasicMaterial;
  core: Mesh;
  halo: Mesh;
};

function createRenderer(): WebGLRenderer | null {
  try {
    return new WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
}

export default function Globe3D({
  places,
  focusId,
  reducedMotion,
  onSelect,
  onUnavailable,
}: GlobeProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<GlobeApi | null>(null);

  // Latest props, read from inside the long-lived three.js scene without
  // tearing the scene down every render.
  const placesRef = useRef(places);
  const onSelectRef = useRef(onSelect);
  const onUnavailableRef = useRef(onUnavailable);
  const reducedRef = useRef(reducedMotion);
  useEffect(() => {
    placesRef.current = places;
    onSelectRef.current = onSelect;
    onUnavailableRef.current = onUnavailable;
    reducedRef.current = reducedMotion;
  });

  useEffect(() => {
    const stage = stageRef.current;
    const tip = tipRef.current;
    if (!stage || !tip) return;

    const renderer = createRenderer();
    if (!renderer) {
      onUnavailableRef.current();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = 'globe__canvas';
    stage.appendChild(canvas);

    // --- Scene ---------------------------------------------------------
    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 50);
    const startDir = latLonToVec3(22, 15);
    camera.position.set(
      startDir.x * START_DISTANCE,
      startDir.y * START_DISTANCE,
      startDir.z * START_DISTANCE,
    );
    scene.add(camera);

    // Gentle light that travels with the camera, so the lit side always faces
    // the reader no matter how the globe is turned.
    scene.add(new AmbientLight(0xffffff, 2.4));
    const key = new DirectionalLight(0xffffff, 1.2);
    key.position.set(-2, 2, 3);
    camera.add(key);

    const texture = new CanvasTexture(buildEarthCanvas(2048));
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const globeGeometry = new SphereGeometry(1, 96, 64);
    const globeMaterial = new MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0,
    });
    const globe = new Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    // Soft rim glow: a slightly larger sphere seen from inside, brightest where
    // it meets the globe and fading smoothly to nothing at its outer edge.
    const atmosphereGeometry = new SphereGeometry(1.14, 64, 48);
    const atmosphereMaterial = new ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float facing = max(0.0, -vNormal.z);
          float glow = pow(facing, 2.0) * 1.6;
          // Premultiplied color + alpha that both fade to 0 at the outer edge,
          // so the glow blends over the page instead of painting black.
          gl_FragColor = vec4(vec3(0.5, 0.89, 0.82) * glow, glow);
        }
      `,
      side: BackSide,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
    });
    scene.add(new Mesh(atmosphereGeometry, atmosphereMaterial));

    // --- Markers -------------------------------------------------------
    const coreGeometry = new SphereGeometry(0.014, 16, 12);
    const haloGeometry = new SphereGeometry(0.03, 16, 12);
    const hitGeometry = new SphereGeometry(0.055, 8, 6);
    const haloMaterial = new MeshBasicMaterial({
      color: TEAL,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    // Invisible but raycastable: a generous touch target around each marker.
    const hitMaterial = new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const markers = new Map<string, Marker>();
    const pickable: Mesh[] = [globe];
    for (const place of placesRef.current) {
      const p = latLonToVec3(place.coordinates.lat, place.coordinates.lon, 1.006);
      const position = new Vector3(p.x, p.y, p.z);
      const coreMaterial = new MeshBasicMaterial({ color: TEAL });
      const core = new Mesh(coreGeometry, coreMaterial);
      const halo = new Mesh(haloGeometry, haloMaterial);
      const hit = new Mesh(hitGeometry, hitMaterial);
      hit.userData['placeId'] = place.id;
      for (const mesh of [core, halo, hit]) {
        mesh.position.copy(position);
        scene.add(mesh);
      }
      pickable.push(hit);
      markers.set(place.id, {
        id: place.id,
        name: place.name,
        position,
        coreMaterial,
        core,
        halo,
      });
    }

    // --- Controls ------------------------------------------------------
    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.enableDamping = !reducedRef.current;
    controls.dampingFactor = 0.08;
    controls.minDistance = MIN_DISTANCE;
    controls.maxDistance = MAX_DISTANCE;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.7;

    // --- State + on-demand rendering ----------------------------------
    let hoveredId: string | null = null;
    let activeId: string | null = null;
    let flight: Flight | null = null;
    let frame = 0;
    let dirty = true;
    let disposed = false;

    const stepFlight = (now: number): boolean => {
      if (!flight) return false;
      const t = Math.max(0, Math.min(1, (now - flight.start) / flight.duration));
      const dir = slerpDirection(flight.from, flight.to, easeInOut(t));
      camera.position.set(
        dir.x * flight.distance,
        dir.y * flight.distance,
        dir.z * flight.distance,
      );
      if (t >= 1) flight = null;
      return true;
    };

    const tick = (now: number) => {
      frame = 0;
      if (disposed) return;
      const moving = stepFlight(now);
      const changed = controls.update();
      if (dirty || changed || moving) {
        renderer.render(scene, camera);
        dirty = false;
      }
      // Keep looping only while something is actually moving.
      if (changed || moving) frame = requestAnimationFrame(tick);
    };

    const requestRender = () => {
      dirty = true;
      if (!frame && !disposed) frame = requestAnimationFrame(tick);
    };

    const paintMarkers = () => {
      for (const m of markers.values()) {
        const hot = m.id === hoveredId || m.id === activeId;
        m.coreMaterial.color.setHex(hot ? AMBER : TEAL);
        const scale = hot ? 1.7 : 1;
        m.core.scale.setScalar(scale);
        m.halo.scale.setScalar(scale);
      }
    };

    const showTip = (marker: Marker | undefined) => {
      if (!marker) {
        tip.hidden = true;
        return;
      }
      const screen = marker.position.clone().project(camera);
      const x = (screen.x * 0.5 + 0.5) * stage.clientWidth;
      const y = (-screen.y * 0.5 + 0.5) * stage.clientHeight;
      tip.textContent = marker.name;
      tip.style.transform = `translate(${x}px, ${y}px) translate(-50%, -150%)`;
      tip.hidden = false;
    };

    const setHover = (id: string | null) => {
      if (id === hoveredId) return;
      hoveredId = id;
      canvas.style.cursor = id ? 'pointer' : '';
      showTip(id ? markers.get(id) : undefined);
      paintMarkers();
      requestRender();
    };

    const startFlight = (to: Vec3, duration: number) => {
      const distance = camera.position.length();
      const dest = normalize(to);
      setHover(null);
      if (reducedRef.current || duration <= 0) {
        flight = null;
        camera.position.set(dest.x * distance, dest.y * distance, dest.z * distance);
        controls.update();
        requestRender();
        return;
      }
      flight = {
        start: performance.now(),
        duration,
        from: normalize(camera.position),
        to: dest,
        distance,
      };
      requestRender();
    };

    const spherical = new Spherical();
    apiRef.current = {
      flyTo: (id) => {
        const marker = markers.get(id);
        if (!marker) return;
        activeId = id;
        paintMarkers();
        startFlight(marker.position, FLIGHT_MS);
      },
      turn: (dAzimuth, dPolar) => {
        spherical.setFromVector3(camera.position);
        spherical.theta += dAzimuth;
        spherical.phi = Math.min(
          Math.PI - 0.2,
          Math.max(0.2, spherical.phi + dPolar),
        );
        startFlight(new Vector3().setFromSpherical(spherical), TURN_MS);
      },
      zoom: (factor) => {
        const distance = Math.min(
          MAX_DISTANCE,
          Math.max(MIN_DISTANCE, camera.position.length() * factor),
        );
        camera.position.setLength(distance);
        controls.update();
        requestRender();
      },
    };

    controls.addEventListener('change', requestRender);
    controls.addEventListener('start', () => {
      flight = null; // the reader's hand always wins over an eased move
      setHover(null);
    });

    // --- Picking -------------------------------------------------------
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const pick = (clientX: number, clientY: number): string | null => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      // The first thing hit wins, so a marker on the far side of the globe is
      // hidden behind the globe itself and cannot be selected.
      const first = raycaster.intersectObjects(pickable, false)[0];
      const id: unknown = first?.object.userData['placeId'];
      return typeof id === 'string' ? id : null;
    };

    let pressed = false;
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      pressed = true;
      downX = e.clientX;
      downY = e.clientY;
      setHover(null);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!pressed) return;
      pressed = false;
      // A press that barely moved is a click; anything else was a drag.
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
        const id = pick(e.clientX, e.clientY);
        if (id) onSelectRef.current(id);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (pressed) return;
      setHover(pick(e.clientX, e.clientY));
    };
    const onPointerLeave = () => {
      pressed = false;
      setHover(null);
    };
    const onContextLost = (e: Event) => {
      e.preventDefault();
      onUnavailableRef.current();
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('webglcontextlost', onContextLost);

    // --- Sizing --------------------------------------------------------
    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      requestRender();
    };
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(stage);
    resize();
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      for (const m of markers.values()) m.coreMaterial.dispose();
      coreGeometry.dispose();
      haloGeometry.dispose();
      hitGeometry.dispose();
      haloMaterial.dispose();
      hitMaterial.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      texture.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // free the GPU context promptly on unmount
      canvas.remove();
      apiRef.current = null;
    };
  }, []);

  // Turn to face a place when Explore asks (index hover/focus, or "spin").
  useEffect(() => {
    if (focusId) apiRef.current?.flyTo(focusId);
  }, [focusId]);

  return (
    <div className="globe">
      <div className="globe__viewport">
        <div
          className="globe__stage"
          ref={stageRef}
          role="img"
          aria-label={`Interactive 3D globe showing ${places.length} places. Use the globe controls, or the list of all places, to choose one.`}
        />
        <div className="globe__tip" ref={tipRef} aria-hidden="true" hidden />
      </div>

      <div className="globe__controls" role="group" aria-label="Globe controls">
        <button
          type="button"
          className="btn btn--ghost globe__btn"
          aria-label="Turn globe left"
          onClick={() => apiRef.current?.turn(TURN_STEP, 0)}
        >
          <span aria-hidden="true">&larr;</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost globe__btn"
          aria-label="Turn globe right"
          onClick={() => apiRef.current?.turn(-TURN_STEP, 0)}
        >
          <span aria-hidden="true">&rarr;</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost globe__btn"
          aria-label="Turn globe up"
          onClick={() => apiRef.current?.turn(0, TURN_STEP)}
        >
          <span aria-hidden="true">&uarr;</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost globe__btn"
          aria-label="Turn globe down"
          onClick={() => apiRef.current?.turn(0, -TURN_STEP)}
        >
          <span aria-hidden="true">&darr;</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost globe__btn"
          aria-label="Zoom in"
          onClick={() => apiRef.current?.zoom(0.8)}
        >
          <span aria-hidden="true">+</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost globe__btn"
          aria-label="Zoom out"
          onClick={() => apiRef.current?.zoom(1.25)}
        >
          <span aria-hidden="true">&minus;</span>
        </button>
      </div>

      <p className="globe__hint">
        Drag to turn &middot; scroll or pinch to zoom &middot; select a marker to
        read
      </p>
    </div>
  );
}
