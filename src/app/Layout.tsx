/**
 * App chrome: skip link, header with calm nav, and the main landmark.
 * No engagement metrics, no feed — just the bounded sections of the loop
 * (steering: product.md laws 1 & 3; Req 7.4 coherent identity).
 */
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { SoundToggle } from './SoundToggle';
import './layout.css';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__disc" aria-hidden="true" />
          <span className="app-header__name">Encarta Reborn</span>
        </div>
        <nav aria-label="Primary">
          <ul className="app-nav">
            <li>
              <NavLink to="/" end className="app-nav__link">
                Explore
              </NavLink>
            </li>
            <li>
              <NavLink to="/log" className="app-nav__link">
                Expedition log
              </NavLink>
            </li>
            <li>
              <NavLink to="/proof" className="app-nav__link">
                Proof
              </NavLink>
            </li>
          </ul>
        </nav>
        <SoundToggle />
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
