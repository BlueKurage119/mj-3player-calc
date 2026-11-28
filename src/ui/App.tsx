import {
  type ComponentType,
  Suspense,
  lazy,
  useLayoutEffect,
  useRef
} from 'react';
import type React from 'react';
import {
  isGalleryEnabled,
  isMdGalleryMode,
  isTileGalleryMode
} from './app-mode';
import { PwaUpdatePrompt } from './pwa/PwaUpdatePrompt';
import { MainScreen } from './screen/MainScreen';
import { AppStateProvider, useAppState } from './state';

const SettingsScreen = lazy(() => import('./screen/SettingsScreen'));
const ScoringTableScreen = lazy(() => import('./screen/ScoringTableScreen'));
const LicenseScreen = lazy(() => import('./screen/LicenseScreen'));
const HelpScreen = lazy(() => import('./screen/HelpScreen'));
const EngineScreen = lazy(() => import('./screen/EngineScreen'));

let DevTileGallery: ComponentType | null = null;
let DevMdGallery: ComponentType | null = null;

if (import.meta.env.DEV) {
  DevTileGallery = lazy(() => import('./tile/TileGallery'));
  DevMdGallery = lazy(() => import('./md/MdGallery'));
}

export function AppContent(): React.JSX.Element {
  const { screen } = useAppState();
  const prevScreen = useRef(screen);
  useLayoutEffect(() => {
    if (prevScreen.current === screen) return;
    prevScreen.current = screen;
    window.scrollTo(0, 0);
  }, [screen]);
  if (screen === 'settings') {
    return (
      <Suspense fallback={null}>
        <SettingsScreen />
      </Suspense>
    );
  }
  if (screen === 'scoring-table') {
    return (
      <Suspense fallback={null}>
        <ScoringTableScreen />
      </Suspense>
    );
  }
  if (screen === 'license') {
    return (
      <Suspense fallback={null}>
        <LicenseScreen />
      </Suspense>
    );
  }
  if (screen === 'help') {
    return (
      <Suspense fallback={null}>
        <HelpScreen />
      </Suspense>
    );
  }
  if (screen === 'engine') {
    return (
      <Suspense fallback={null}>
        <EngineScreen />
      </Suspense>
    );
  }
  return <MainScreen />;
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
      <PwaUpdatePrompt />
    </AppStateProvider>
  );
};
