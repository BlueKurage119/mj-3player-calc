import { Suspense, lazy } from 'react';
import { isTileGalleryMode } from './app-mode';

const TileGallery = lazy(() => import('./tile/TileGallery'));

export const App = () => {
  if (isTileGalleryMode(window.location.search)) {
    return (
      <Suspense fallback={null}>
        <TileGallery />
      </Suspense>
    );
  }
  return <h1>三麻点数計算機</h1>;
};
