/** URL クエリ文字列から牌ギャラリーモード (?gallery=tiles) かどうかを判定する */
export function isTileGalleryMode(search: string): boolean {
  return new URLSearchParams(search).get('gallery') === 'tiles';
}
