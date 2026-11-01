import { Suspense, lazy } from 'react';
import { isMdGalleryMode, isTileGalleryMode } from './app-mode';

const TileGallery = lazy(() => import('./tile/TileGallery'));
const MdGallery = lazy(() => import('./md/MdGallery'));

export const App = () => {
  if (isTileGalleryMode(window.location.search)) {
    return (
      <Suspense fallback={null}>
        <TileGallery />
      </Suspense>
    );
  }
  if (isMdGalleryMode(window.location.search)) {
    return (
      <Suspense fallback={null}>
        <MdGallery />
      </Suspense>
    );
  }
  return <h1>三麻点数計算機</h1>;
};
