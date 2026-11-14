import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Discard } from '../../core/result';
import type { TileAvailability } from '../../core/tile';
import { ResultBody, type ResultTileActions } from './ResultBody';
import { DiscardBody, DiscardItem } from './discard';
import { ShantenBody, TempaiBody } from './slots';

const noop = () => {};
const noopActions: ResultTileActions = { tsumo: noop, discard: noop };

describe('F1-1: 結果本体の牌ボタン化 (slots・discard・ResultBody)', () => {
  it('F1-1: TempaiBody は onTsumo 指定で牌だけが button(〜をツモ)になり、×N は button の外、未指定なら button 無し', () => {
    const avail: TileAvailability[] = [
      { tile: { type: 's', n: 2 }, count: 4 },
      { tile: { type: 's', n: 5, red: true }, count: 1 }
    ];

    const withoutHandler = renderToStaticMarkup(
      <TempaiBody tileAvailabilities={avail} />
    );
    // 理由: onTsumo 未指定時に button タグが一切出力されないことを検証するため
    expect(withoutHandler.includes('<button')).toBe(false);

    const withHandler = renderToStaticMarkup(
      <TempaiBody tileAvailabilities={avail} onTsumo={noop} />
    );
    // 理由: トグル状態を持たない結果欄の牌ボタンに aria-pressed を出さないことを検証するため
    expect(withHandler.includes('aria-pressed')).toBe(false);
    const waitButtons = [
      ...withHandler.matchAll(
        /<span class="result-body__wait" data-tile-count="(\d+)"><button type="button" class="tile" aria-label="([^"]+)">[\s\S]*?<\/button><span class="result-body__wait-count tabular-nums">([^<]*)<\/span><\/span>/g
      )
    ].map(m => ({ count: Number(m[1]), ariaLabel: m[2], text: m[3] }));

    expect(waitButtons).toEqual([
      { count: 4, ariaLabel: '2索をツモ', text: '×4' },
      { count: 1, ariaLabel: '赤5索をツモ', text: '×1' }
    ]);
  });

  it('F1-1: ShantenBody は onTsumo 指定で牌だけが button(〜をツモ)になり、×N は button の外、未指定なら button 無し', () => {
    const avail: TileAvailability[] = [
      { tile: { type: 'z', n: 1 }, count: 2 },
      { tile: { type: 'p', n: 5, red: false }, count: 3 }
    ];

    const withoutHandler = renderToStaticMarkup(
      <ShantenBody shanten={1} tileAvailabilities={avail} />
    );
    // 理由: onTsumo 未指定時に button タグが一切出力されないことを検証するため
    expect(withoutHandler.includes('<button')).toBe(false);

    const withHandler = renderToStaticMarkup(
      <ShantenBody shanten={1} tileAvailabilities={avail} onTsumo={noop} />
    );
    // 理由: トグル状態を持たない結果欄の牌ボタンに aria-pressed を出さないことを検証するため
    expect(withHandler.includes('aria-pressed')).toBe(false);
    const waitButtons = [
      ...withHandler.matchAll(
        /<span class="result-body__wait" data-tile-count="(\d+)"><button type="button" class="tile" aria-label="([^"]+)">[\s\S]*?<\/button><span class="result-body__wait-count tabular-nums">([^<]*)<\/span><\/span>/g
      )
    ].map(m => ({ count: Number(m[1]), ariaLabel: m[2], text: m[3] }));

    expect(waitButtons).toEqual([
      { count: 2, ariaLabel: '東をツモ', text: '×2' },
      { count: 3, ariaLabel: '5筒をツモ', text: '×3' }
    ]);
  });

  it('F1-1: DiscardBody・DiscardItem は onDiscard 指定で打牌牌だけが button(〜を切る)になり、打ラベルと待ち/受け入れ牌は button にならない', () => {
    const discards: Discard[] = [
      {
        tile: { type: 's', n: 5, red: true },
        next: {
          type: 'tempai',
          tileAvailabilities: [{ tile: { type: 'z', n: 1 }, count: 2 }]
        }
      },
      {
        tile: { type: 's', n: 5, red: false },
        next: {
          type: 'hora-shanten',
          info: {
            type: 'shanten',
            shanten: 1,
            tileAvailabilities: [{ tile: { type: 'p', n: 9 }, count: 3 }]
          }
        }
      }
    ];

    const withoutHandler = renderToStaticMarkup(
      <DiscardBody discards={discards} />
    );
    // 理由: onDiscard 未指定時に button タグが一切出力されないことを検証するため
    expect(withoutHandler.includes('<button')).toBe(false);

    const withHandler = renderToStaticMarkup(
      <DiscardBody discards={discards} onDiscard={noop} />
    );

    // 理由: トグル状態を持たない結果欄の牌ボタンに aria-pressed を出さないことを検証するため
    expect(withHandler.includes('aria-pressed')).toBe(false);
    const discardButtons = [
      ...withHandler.matchAll(
        /<span class="discard-item__tile"><span class="discard-item__label">打<\/span><button type="button" class="tile" aria-label="([^"]+)">/g
      )
    ].map(m => m[1]);
    expect(discardButtons).toEqual(['赤5索を切る', '5索を切る']);

    // 全体の button 数は打牌候補2つ分のみ(待ち・受け入れ牌に button は無い)
    const allButtons = [...withHandler.matchAll(/<button /g)];
    expect(allButtons).toHaveLength(2);

    // 各アイテムの detail 内の待ち・受け入れ牌は span[role="img"] のままであること
    const detailMatches = [
      ...withHandler.matchAll(
        /<div class="discard-item__detail">([\s\S]*?)<\/div><\/li>/g
      )
    ].map(m => m[1] ?? '');
    expect(detailMatches).toHaveLength(2);
    for (const detailHtml of detailMatches) {
      // 理由: 待ち・受け入れ牌が button 化されていないことを検証するため
      expect(detailHtml.includes('<button')).toBe(false);
      // 理由: 待ち・受け入れ牌が非ボタンの span.tile として描画されていることを検証するため
      expect(detailHtml.includes('<span role="img" class="tile"')).toBe(true);
    }

    const singleItemMarkup = renderToStaticMarkup(
      <DiscardItem discard={discards[0] as Discard} onDiscard={noop} />
    );
    // 理由: SVG パスや画像 URL を含む出力から対象牌の button aria-label を検証するため
    expect(singleItemMarkup).toContain('aria-label="赤5索を切る"');
  });

  it('F1-1: ResultBody は tileActions を tempai/shanten/discard に渡し、hora ではボタンを出さない', () => {
    const tempaiHtml = renderToStaticMarkup(
      <ResultBody
        view={{
          kind: 'tempai',
          tileAvailabilities: [{ tile: { type: 'z', n: 1 }, count: 2 }]
        }}
        tileActions={noopActions}
      />
    );
    // 理由: preload リンクや SVG URL を含む HTML からツモ用 aria-label の付与を検証するため
    expect(tempaiHtml).toContain('aria-label="東をツモ"');

    const shantenHtml = renderToStaticMarkup(
      <ResultBody
        view={{
          kind: 'shanten',
          shanten: 1,
          tileAvailabilities: [{ tile: { type: 'm', n: 9 }, count: 4 }]
        }}
        tileActions={noopActions}
      />
    );
    // 理由: preload リンクや SVG URL を含む HTML からツモ用 aria-label の付与を検証するため
    expect(shantenHtml).toContain('aria-label="9萬をツモ"');

    const discardHtml = renderToStaticMarkup(
      <ResultBody
        view={{
          kind: 'discard',
          discards: [
            {
              tile: { type: 'z', n: 4 },
              next: {
                type: 'tempai',
                tileAvailabilities: [{ tile: { type: 'z', n: 1 }, count: 2 }]
              }
            }
          ]
        }}
        tileActions={noopActions}
      />
    );
    // 理由: preload リンクや SVG URL を含む HTML から打牌用 aria-label の付与を検証するため
    expect(discardHtml).toContain('aria-label="北を切る"');

    const horaHtml = renderToStaticMarkup(
      <ResultBody view={{ kind: 'hora', hora: [] }} tileActions={noopActions} />
    );
    // 理由: hora 表示では tileActions を渡しても button が一切出力されないことを検証するため
    expect(horaHtml.includes('<button')).toBe(false);
  });
});
