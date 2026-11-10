/**
 * Explore with the 3D globe available. jsdom has no GPU, so the WebGL check is
 * mocked to "available" and the globe component is replaced by a stub that
 * records the props Explore hands it. This tests the wiring (default view,
 * toggle, hover-to-face, select, spin timing); the three.js scene itself is
 * checked in a real browser.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { ExploreView } from './ExploreView';
import { FLIGHT_MS } from './globeMath';

vi.mock('./webgl', () => ({ isWebGLAvailable: () => true }));
vi.mock('./Globe3D', () => ({
  default: (props: {
    focusId: string | null;
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="globe" data-focus={props.focusId ?? ''}>
      <button type="button" onClick={() => props.onSelect('japan')}>
        stub select japan
      </button>
    </div>
  ),
}));

function ArticleStub() {
  const { id } = useParams();
  return <div>ARTICLE:{id}</div>;
}

function renderExplore() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ExploreView />} />
        <Route path="/place/:id" element={<ArticleStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

function allowMotion() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ExploreView with WebGL available', () => {
  it('shows the 3D globe by default, with a view toggle', async () => {
    renderExplore();
    expect(await screen.findByTestId('globe')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Map view' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3D globe' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Flat map' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('switches to the flat map and back to the globe', async () => {
    renderExplore();
    await screen.findByTestId('globe');

    await userEvent.click(screen.getByRole('button', { name: 'Flat map' }));
    expect(screen.queryByTestId('globe')).not.toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'World map of available places' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '3D globe' }));
    expect(await screen.findByTestId('globe')).toBeInTheDocument();
  });

  it('keeps the full place list available next to the globe', async () => {
    renderExplore();
    await screen.findByTestId('globe');
    const index = screen.getByRole('navigation', { name: 'All places' });
    expect(index).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Japan' })).toBeInTheDocument();
  });

  it('turns the globe to a place when its name in the list is hovered', async () => {
    renderExplore();
    const globe = await screen.findByTestId('globe');
    expect(globe).toHaveAttribute('data-focus', '');
    await userEvent.hover(screen.getByRole('button', { name: 'Japan' }));
    expect(globe).toHaveAttribute('data-focus', 'japan');
  });

  it('opens a place chosen on the globe', async () => {
    renderExplore();
    await screen.findByTestId('globe');
    await userEvent.click(
      screen.getByRole('button', { name: 'stub select japan' }),
    );
    expect(screen.getByText('ARTICLE:japan')).toBeInTheDocument();
  });

  it('on spin, turns the globe first and only then opens the place', async () => {
    allowMotion();
    renderExplore();
    const globe = await screen.findByTestId('globe');

    vi.useFakeTimers();
    fireEvent.click(
      screen.getByRole('button', { name: /spin to a random place/i }),
    );

    // The globe is asked to face the chosen place, but we have not left yet.
    expect(globe.getAttribute('data-focus')).not.toBe('');
    expect(screen.queryByText(/^ARTICLE:/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(FLIGHT_MS + 300);
    });
    expect(screen.getByText(/^ARTICLE:/)).toBeInTheDocument();
  });

  it('with reduced motion, spin opens the place immediately', async () => {
    // No matchMedia stub: the reduced-motion hook defaults to "reduced".
    renderExplore();
    await screen.findByTestId('globe');
    await userEvent.click(
      screen.getByRole('button', { name: /spin to a random place/i }),
    );
    expect(screen.getByText(/^ARTICLE:/)).toBeInTheDocument();
  });
});
