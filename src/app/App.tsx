/**
 * App shell. Boots with the "insert disc" screen while the snapshot loads and
 * validates, then mounts the router with the four routes of the loop:
 * Explore (/), Article (/place/:id), and Expedition log (/log).
 *
 * Offline-first: the snapshot is bundled and read via the loader, so there is
 * no network dependency on the critical path (steering: structure.md law 3).
 */
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BootScreen } from './BootScreen';
import { Layout } from './Layout';
import { ExploreView } from '../features/explore/ExploreView';
import { ArticleView } from '../features/article/ArticleView';
import { ExpeditionLog } from '../features/log/ExpeditionLog';
import { ProofView } from '../features/proof/ProofView';
import { loadSnapshot } from '../data/snapshotLoader';

type BootState = 'loading' | 'ready' | 'entered' | 'error';

export function App() {
  const [boot, setBoot] = useState<BootState>('loading');

  useEffect(() => {
    // Validate the bundled snapshot up front; the boot screen masks this.
    try {
      loadSnapshot();
      setBoot((s) => (s === 'loading' ? 'ready' : s));
    } catch {
      setBoot('error');
    }
  }, []);

  if (boot === 'error') {
    return (
      <main className="app-main">
        <h1>Encarta Reborn</h1>
        <p>
          The disc could not be read. The bundled data failed to load. Please
          reload to try again.
        </p>
      </main>
    );
  }

  if (boot !== 'entered') {
    return (
      <BootScreen ready={boot === 'ready'} onEnter={() => setBoot('entered')} />
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ExploreView />} />
          <Route path="/place/:id" element={<ArticleView />} />
          <Route path="/log" element={<ExpeditionLog />} />
          <Route path="/proof" element={<ProofView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
