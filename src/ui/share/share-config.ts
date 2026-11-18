const DEFAULT_SHARE_URL = 'https://bluekurage119.github.io/mj-3player-calc/';

export const SHARE_URL: string | null =
  typeof __SHARE_URL__ !== 'undefined' ? __SHARE_URL__ : DEFAULT_SHARE_URL;

export const APP_NAME = '三麻点数計算機';

export const SHARE_IMAGE_WIDTH = 1080;
export const SHARE_IMAGE_HEIGHT = 1350;
export const SHARE_IMAGE_MIME = 'image/png';

/** 有効な公開 URL (https:// で始まりラベルが空でない) ならそのまま返し、それ以外は null */
export function resolveShareUrl(url: string | null): string | null {
  if (url === null || !url.startsWith('https://')) {
    return null;
  }
  const stripped = url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return stripped.length > 0 ? url : null;
}

/** 画像のフッターに描く URL 文字(スキームなし・末尾スラッシュなし)。無効 URL なら null */
export function shareUrlLabel(url: string | null): string | null {
  if (resolveShareUrl(url) === null || url === null) {
    return null;
  }
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

/** navigator.share に渡す投稿文(本文 + 改行 + URL、無効 URL なら本文のみ) */
export function buildShareText(url: string | null = SHARE_URL): string {
  const validUrl = resolveShareUrl(url);
  return validUrl !== null ? `${APP_NAME}\n${validUrl}` : APP_NAME;
}

/** 共有・保存時のファイル名: mj3calc-<ron|tsumo>-<yyyyMMdd-HHmmss>.png */
export function buildShareFileName(
  by: 'ron' | 'tsumo',
  date: Date = new Date()
): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `mj3calc-${by}-${yyyy}${MM}${dd}-${HH}${mm}${ss}.png`;
}
