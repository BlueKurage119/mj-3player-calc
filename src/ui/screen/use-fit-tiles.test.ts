// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { MIN_TILE_WIDTH_PX, fitTileRow } from './use-fit-tiles';

interface MockRowOptions {
  clientWidth: number;
  baseTileWidth: number;
  tileCount: number;
  fixedExtraWidth?: number;
}

/**
 * .summary-card__tiles と .tile 要素を生成し、
 * --tile-width に応じて scrollWidth が変化する簡易レイアウトモックを定義する
 */
function createMockTileRow(opts: MockRowOptions): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'summary-card__tiles';

  const fixedExtra = opts.fixedExtraWidth ?? 0;

  for (let i = 0; i < opts.tileCount; i++) {
    const tile = document.createElement('span');
    tile.className = 'tile';
    tile.getBoundingClientRect = () => {
      const inlineWidth = row.style.getPropertyValue('--tile-width');
      const w = inlineWidth
        ? Number.parseFloat(inlineWidth)
        : opts.baseTileWidth;
      return {
        width: w,
        height: w * 1.35,
        top: 0,
        left: 0,
        right: w,
        bottom: w * 1.35,
        x: 0,
        y: 0,
        toJSON: () => ({})
      };
    };
    row.appendChild(tile);
  }

  let currentClientWidth = opts.clientWidth;

  Object.defineProperty(row, 'clientWidth', {
    configurable: true,
    get: () => currentClientWidth,
    set: (v: number) => {
      currentClientWidth = v;
    }
  });

  Object.defineProperty(row, 'scrollWidth', {
    configurable: true,
    get: () => {
      const inlineWidth = row.style.getPropertyValue('--tile-width');
      const w = inlineWidth
        ? Number.parseFloat(inlineWidth)
        : opts.baseTileWidth;
      return Math.round(fixedExtra + w * opts.tileCount);
    }
  });

  return row;
}

describe('use-fit-tiles (Issue #153)', () => {
  it('153-F1: 収まる行(scrollWidth <= clientWidth)ではインライン --tile-width を設定しない', () => {
    const row = createMockTileRow({
      clientWidth: 300,
      baseTileWidth: 24,
      tileCount: 10
    });

    fitTileRow(row);

    expect(row.style.getPropertyValue('--tile-width')).toBe('');
  });

  it('153-F2: はみ出す行(scrollWidth > clientWidth)では縮小した --tile-width (${px}px) を設定する', () => {
    // 14枚 * 24px = 336px、clientWidth = 280px → 1枚あたり 20px 前後に縮小される
    const row = createMockTileRow({
      clientWidth: 280,
      baseTileWidth: 24,
      tileCount: 14
    });

    fitTileRow(row);

    const prop = row.style.getPropertyValue('--tile-width');
    expect(prop.endsWith('px')).toBe(true);
    const px = Number.parseFloat(prop);
    expect(px).toBeLessThan(24);
    expect(px).toBeGreaterThan(MIN_TILE_WIDTH_PX);
    // 収束後の幅で実際に収まること
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
  });

  it('153-F3: 極端に狭い幅では MIN_TILE_WIDTH_PX (10px) を下限として止まる', () => {
    const row = createMockTileRow({
      clientWidth: 80,
      baseTileWidth: 24,
      tileCount: 14
    });

    fitTileRow(row);

    expect(row.style.getPropertyValue('--tile-width')).toBe(
      `${MIN_TILE_WIDTH_PX}px`
    );
  });

  it('153-F4: 既に縮小された --tile-width が設定された要素に対し幅が広がった条件で再実行したとき、先頭で --tile-width が除去され基準幅へ戻る', () => {
    const row = createMockTileRow({
      clientWidth: 280,
      baseTileWidth: 24,
      tileCount: 14
    });

    fitTileRow(row);
    expect(row.style.getPropertyValue('--tile-width')).not.toBe('');

    // 幅を広げて再実行（14 * 24 = 336 <= 400）
    (row as unknown as { clientWidth: number }).clientWidth = 400;
    fitTileRow(row);

    expect(row.style.getPropertyValue('--tile-width')).toBe('');
  });
});
