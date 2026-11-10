import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { ExploreView } from './ExploreView';

// Tiny stub that echoes the routed place id, so tests can assert navigation.
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

describe('ExploreView', () => {
  it('lists the places from the snapshot in a bounded index (not a feed)', () => {
    renderExplore();
    const index = screen.getByRole('navigation', { name: 'All places' });
    expect(index).toBeInTheDocument();
    // The index is a finite list; there is at least one place and it ends.
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);
  });

  it('routes to a place article when a place is selected from the index', async () => {
    renderExplore();
    const japan = screen.getByRole('button', { name: 'Japan' });
    await userEvent.click(japan);
    expect(screen.getByText(/ARTICLE:japan/)).toBeInTheDocument();
  });

  it('spin navigates to some valid place article', async () => {
    renderExplore();
    const spin = screen.getByRole('button', {
      name: /spin to a random place/i,
    });
    await userEvent.click(spin);
    expect(screen.getByText(/^ARTICLE:/)).toBeInTheDocument();
  });

  it('exposes map markers as accessible buttons', () => {
    renderExplore();
    // Each marker has role=button with an accessible name including the type.
    expect(
      screen.getByRole('button', { name: /Japan \(country\)/ }),
    ).toBeInTheDocument();
  });

  it('falls back to the flat map, with no globe toggle, when WebGL is unavailable', () => {
    renderExplore();
    expect(
      screen.getByRole('group', { name: 'World map of available places' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '3D globe' }),
    ).not.toBeInTheDocument();
  });

  it('credits the coastline data source', () => {
    renderExplore();
    expect(
      screen.getByRole('link', { name: 'Natural Earth' }),
    ).toHaveAttribute('href', 'https://www.naturalearthdata.com/');
  });
});
