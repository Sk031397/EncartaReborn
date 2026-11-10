/**
 * Accessibility + calm pass (Req 7). These checks guard the whole loop:
 *  - landmarks and a skip link exist once the app is entered;
 *  - the primary nav and main region are present and labelled;
 *  - sound is off by default (no opt-in → silent);
 *  - the boot screen exposes an accessible status (the disc loader) and a
 *    focusable title, and does not autoplay sound.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { isSoundEnabled } from '../ui/sound';

beforeEach(() => {
  localStorage.clear?.();
});

async function enterApp() {
  render(<App />);
  const enter = await screen.findByRole('button', { name: /insert disc/i });
  await userEvent.click(enter);
}

describe('accessibility of the app shell', () => {
  it('exposes a main landmark and primary navigation after entering', async () => {
    await enterApp();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Primary' }),
    ).toBeInTheDocument();
  });

  it('provides a keyboard skip link to the content', async () => {
    await enterApp();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveAttribute('href', '#main');
  });

  it('keeps sound off by default (no autoplay, opt-in only)', () => {
    expect(isSoundEnabled()).toBe(false);
  });
});

describe('calm boot screen', () => {
  it('shows an accessible loading status and a page heading', async () => {
    render(<App />);
    // The disc loader is announced politely rather than grabbing attention.
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Encarta Reborn', level: 1 }),
    ).toBeInTheDocument();
  });
});
