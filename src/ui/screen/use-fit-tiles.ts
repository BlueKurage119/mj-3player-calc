import { useLayoutEffect } from 'react';
import type React from 'react';

export const MIN_TILE_WIDTH_PX = 10;

/**
 * 牌の列が収まらないとき、牌の幅を一様に縮める(収まるなら既定の大きさ)。
 * el 自身、または el 内の複数の列(.summary-card__tiles)が対象。複数列は同じ幅に揃える
 */
export function fitTileRow(el: HTMLElement): void {
  el.style.removeProperty('--tile-width');
  const rows = el.matches('.summary-card__tiles')
    ? [el]
    : Array.from(el.querySelectorAll<HTMLElement>('.summary-card__tiles'));
  const tile = el.querySelector('.tile');
  if (!tile || rows.some(row => row.clientWidth === 0)) return;
  let width = tile.getBoundingClientRect().width;
  // 列の幅は「固定分 + 牌数 × 牌幅」で変わるので、はみ出し分を牌数で割って牌幅から引く
  for (let i = 0; i < 3; i++) {
    let next = width;
    for (const row of rows) {
      const over = row.scrollWidth - row.clientWidth;
      const count = row.querySelectorAll('.tile').length;
      if (over > 0 && count > 0) {
        next = Math.min(next, width - over / count - 0.25);
      }
    }
    if (next >= width) return;
    width = Math.max(MIN_TILE_WIDTH_PX, next);
    el.style.setProperty('--tile-width', `${width}px`);
    if (width === MIN_TILE_WIDTH_PX) return;
  }
}

/** 描画のたびと幅の変化時に収まりを測り直す(依存配列を持たない) */
export function useFitTiles(ref: React.RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    if (ref.current) fitTileRow(ref.current);
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        fitTileRow(el);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}
