const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** ルート <svg に width/height 属性が無ければ補う純関数 */
export function ensureSvgSize(svgText: string, w: number, h: number): string {
  return svgText.replace(/<svg\b([^>]*)>/i, (match, attrs: string) => {
    const hasWidth = /\bwidth\s*=/.test(attrs);
    const hasHeight = /\bheight\s*=/.test(attrs);
    if (hasWidth && hasHeight) {
      return match;
    }
    const extra = [
      hasWidth ? '' : ` width="${w}"`,
      hasHeight ? '' : ` height="${h}"`
    ].join('');
    return `<svg${attrs}${extra}>`;
  });
}

/** SVG URL を取得・寸法補完・デコードして返す (URL 単位でキャッシュ) */
export function loadSvgImage(
  url: string,
  w: number,
  h: number
): Promise<HTMLImageElement> {
  const key = `${url}|${w}x${h}`;
  const cached = imageCache.get(key);
  if (cached) {
    return cached;
  }
  const promise = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`SVG の読み込みに失敗しました: ${url} (${res.status})`);
    }
    const svgText = ensureSvgSize(await res.text(), w, h);
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = blobUrl;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  })().catch(err => {
    imageCache.delete(key);
    throw err;
  });
  imageCache.set(key, promise);
  return promise;
}
