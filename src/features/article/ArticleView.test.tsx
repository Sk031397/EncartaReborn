import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ArticleView } from './ArticleView';
import { clearLog } from '../../lib/storage';

function renderArticle(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/place/${id}`]}>
      <Routes>
        <Route path="/place/:id" element={<ArticleView />} />
        <Route path="/" element={<div>MAP</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  clearLog();
});

describe('ArticleView (SourceGate + citations)', () => {
  it('renders a sourced summary with a visible citation', () => {
    renderArticle('japan');
    expect(
      screen.getByRole('heading', { name: 'Japan', level: 1 }),
    ).toBeInTheDocument();
    const summary = screen.getByLabelText('Summary');
    // At least one citation link to an approved source is visible.
    const links = within(summary).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('shows key facts, each with a citation', () => {
    renderArticle('japan');
    const facts = screen.getByRole('heading', { name: 'Key facts' });
    expect(facts).toBeInTheDocument();
    // Every term in the facts list is accompanied by a citation link.
    const defs = screen.getAllByRole('definition');
    expect(defs.length).toBeGreaterThan(0);
    for (const dd of defs) {
      expect(within(dd).getAllByRole('link').length).toBeGreaterThan(0);
    }
  });

  it('never renders engagement metrics, likes, or a comments section', () => {
    renderArticle('japan');
    expect(screen.queryByText(/like/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/views?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trending/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/comments?/i)).not.toBeInTheDocument();
  });

  it('gives every image descriptive alt text', () => {
    renderArticle('japan');
    for (const img of screen.queryAllByRole('img')) {
      expect(img).toHaveAttribute('alt');
      expect(img.getAttribute('alt')?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('shows a not-found panel for an unknown place', () => {
    renderArticle('atlantis');
    expect(
      screen.getByRole('heading', { name: 'Not found' }),
    ).toBeInTheDocument();
  });
});
