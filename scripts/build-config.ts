export type AppBuildEnv = 'production' | 'preview';
export type StatusBarColorRole = 'surface-container' | 'quaternary';

export interface ResolvedBuildConfig {
  appEnv: AppBuildEnv;
  isPreview: boolean;
  base: '/' | '/mj-3player-calc/';
  shareUrl: string;
  statusBarColorRole: StatusBarColorRole;
}

export const PRODUCTION_BASE = '/mj-3player-calc/';
export const PREVIEW_BASE = '/';
export const PRODUCTION_SHARE_URL =
  'https://bluekurage119.github.io/mj-3player-calc/';

function resolveAppEnv(rawValue: string | undefined): AppBuildEnv {
  if (!rawValue || rawValue === 'production') {
    return 'production';
  }
  if (rawValue === 'preview') {
    return 'preview';
  }
  throw new Error(`未知の VITE_APP_ENV です: ${rawValue}`);
}

function resolveShareUrl(rawValue: string | undefined): string {
  if (!rawValue) {
    return PRODUCTION_SHARE_URL;
  }
  if (!rawValue.startsWith('https://')) {
    throw new Error(
      `VITE_SHARE_URL は https:// で始める必要があります: ${rawValue}`
    );
  }
  return rawValue;
}

const ENV_APP_ENV = 'VITE_APP_ENV';
const ENV_SHARE_URL = 'VITE_SHARE_URL';

/**
 * 環境変数から本番/プレビュー用のビルド設定を解決する。
 */
export function resolveBuildConfig(
  env: Readonly<Record<string, string | undefined>>
): ResolvedBuildConfig {
  const appEnv = resolveAppEnv(env[ENV_APP_ENV]);
  const isPreview = appEnv === 'preview';
  const base = isPreview ? PREVIEW_BASE : PRODUCTION_BASE;
  const shareUrl = resolveShareUrl(env[ENV_SHARE_URL]);
  const statusBarColorRole: StatusBarColorRole = isPreview
    ? 'quaternary'
    : 'surface-container';

  return {
    appEnv,
    isPreview,
    base,
    shareUrl,
    statusBarColorRole
  };
}
