import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App boot flow', () => {
  it('shows the insert-disc boot screen first, then enters Explore', async () => {
    render(<App />);

    // Boot screen is shown with the brand and the enter action.
    expect(
      screen.getByRole('heading', { name: 'Encarta Reborn', level: 1 }),
    ).toBeInTheDocument();

    const enter = await screen.findByRole('button', { name: /insert disc/i });
    await userEvent.click(enter);

    // After entering, the primary navigation (part of the loop) is present.
    expect(
      screen.getByRole('navigation', { name: 'Primary' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Expedition log' }),
    ).toBeInTheDocument();
  });

  it('has a skip link for keyboard users', async () => {
    render(<App />);
    const enter = await screen.findByRole('button', { name: /insert disc/i });
    await userEvent.click(enter);
    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toBeInTheDocument();
  });
});
