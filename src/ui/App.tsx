import { type ComponentType, Suspense, lazy } from 'react';
import type React from 'react';
import {
  isGalleryEnabled,
  isMdGalleryMode,
  isTileGalleryMode
} from './app-mode';
import { MainScreen } from './screen/MainScreen';
import { AppStateProvider, useAppState } from './state';

const SettingsScreen = lazy(() => import('./screen/SettingsScreen'));

let DevTileGallery: ComponentType | null = null;
let DevMdGallery: ComponentType | null = null;

if (import.meta.env.DEV) {
  DevTileGallery = lazy(() => import('./tile/TileGallery'));
  DevMdGallery = lazy(() => import('./md/MdGallery'));
}

function AppContent(): React.JSX.Element {
  const { screen } = useAppState();
  return screen === 'settings' ? (
    <Suspense fallback={null}>
      <SettingsScreen />
    </Suspense>
  ) : (
    <MainScreen />
  );
}

export const App = (): React.JSX.Element => {
  if (import.meta.env.DEV && isGalleryEnabled(import.meta.env.DEV)) {
    if (isTileGalleryMode(window.location.search) && DevTileGallery) {
      return (
        <Suspense fallback={null}>
          <DevTileGallery />
        </Suspense>
      );
    }
    if (isMdGalleryMode(window.location.search) && DevMdGallery) {
      return (
        <Suspense fallback={null}>
          <DevMdGallery />
        </Suspense>
      );
    }
  }

  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
};
