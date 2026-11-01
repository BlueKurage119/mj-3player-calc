export {
  type ThemePreference,
  type ResolvedTheme,
  THEME_PREFERENCES,
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings
} from './theme-config';

export {
  resolveTheme,
  createThemeController,
  initTheme,
  type ThemeController
} from './apply-theme';
