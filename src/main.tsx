import './ui/theme/tokens.css';
import './ui/theme/static-tokens.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { readThemeOverride } from './ui/app-mode';
import { initTheme } from './ui/theme';

const themeController = initTheme();
const themeOverride = readThemeOverride(window.location.search);
if (themeOverride !== null) {
  themeController.setPreference(themeOverride, { persist: false });
}

// biome-ignore lint/style/noNonNullAssertion: root element always exists
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
