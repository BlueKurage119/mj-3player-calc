import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ResultState } from '../calc/result-state';
import { ResultPanel } from './ResultPanel';

describe('ResultPanel', () => {
  it('E1-7: loading のとき data-state="loading" でローディング表示があり、data-view と result-panel--banner が存在しない', () => {
    const state: ResultState = { status: 'loading' };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);

    expect(html).toContain('data-state="loading"');
    expect(html).toContain('aria-label="読み込み中"');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
    expect(html).toContain('id="result-panel"');
  });

  it('E1-7: error のとき data-state="error" で「計算できません」が表示され、data-view と result-panel--banner が存在しない', () => {
    const state: ResultState = {
      status: 'error',
      error: new Error('test error')
    };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);

    expect(html).toContain('data-state="error"');
    expect(html).toContain('計算できません');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
  });

  it('E1-7: ok で result が null のとき data-state="empty" で [data-result-kind] が存在しない', () => {
    const state: ResultState = { status: 'ok', result: null };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);

    expect(html).toContain('data-state="empty"');
    expect(html).not.toContain('data-result-kind');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
  });

  it('E4-10: result が null(empty)のときはカードごと非表示にする CSS がある', () => {
    const css = readFileSync(
      new URL('./main-screen.css', import.meta.url),
      'utf8'
    );
    expect(css).toMatch(
      /\.result-panel\[data-state="empty"\]\s*\{\s*display:\s*none;/
    );
  });

  it('E1-7: ok で just-hora のとき data-state="ok" かつ data-result-kind="just-hora" で指定文言が出る', () => {
    const state: ResultState = {
      status: 'ok',
      result: { type: 'just-hora' }
    };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);

    expect(html).toContain('data-state="ok"');
    expect(html).toContain('data-result-kind="just-hora"');
    expect(html).toContain('和了です。牌をすべて入力して点数を計算します。');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
  });

  it('E1-7: ok で shanten のとき data-state="ok" かつ data-result-kind="shanten" が出る', () => {
    const state: ResultState = {
      status: 'ok',
      result: {
        type: 'hora-shanten',
        info: {
          type: 'shanten',
          shanten: 2,
          tileAvailabilities: [{ tile: { type: 'm', n: 1 }, count: 3 }]
        }
      }
    };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);

    expect(html).toContain('data-state="ok"');
    expect(html).toContain('data-result-kind="shanten"');
    expect(html).toContain('2向聴');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
  });

  it('E1-7: ok で hora のとき data-state="ok" かつ data-result-kind="hora" が出る', async () => {
    const { generateResult } = await import('../../core/result');
    const { DEFAULT_RULE } = await import('../../core/rule');
    const table = {
      round: 'east' as const,
      seat: 'east' as const,
      continue: 0,
      deposit: 0
    };
    const options = {
      riichi: 'none' as const,
      ippatsu: false,
      rinshan: false,
      chankan: false,
      haitei: false,
      tenho: false,
      tsubameGaeshi: false,
      kanFuri: false
    };
    const res = generateResult(
      table,
      {
        hand: [
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 'p', n: 7 },
          { type: 's', n: 3 },
          { type: 's', n: 4 },
          { type: 's', n: 6 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 'p', n: 9 },
          { type: 'p', n: 9 },
          { type: 's', n: 2 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      options,
      DEFAULT_RULE
    );

    const state: ResultState = {
      status: 'ok',
      result: res
    };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);

    expect(html).toContain('data-state="ok"');
    expect(html).toContain('data-result-kind="hora"');
    // 和了の結果は、ロン・ツモのカードを大きなカードでくくらない
    expect(html).toContain('result-panel--flat');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
  });

  it('E2: 和了以外(tempai)では result-panel--flat が付かない', () => {
    const state: ResultState = {
      status: 'ok',
      result: { type: 'tempai', tileAvailabilities: [] }
    };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);
    expect(html).not.toContain('result-panel--flat');
  });

  it('E3: 和了0件(hora[]が空)では result-panel--flat が付かず、カードの中に「和了牌なし」が出る', () => {
    const state = {
      status: 'ok',
      result: {
        type: 'hora-shanten',
        info: { type: 'hora', hora: [] }
      }
    } as unknown as ResultState;
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);
    expect(html).toContain('和了牌なし');
    expect(html).not.toContain('result-panel--flat');
  });

  it('E1-7: ok で tempai のとき data-state="ok" かつ data-result-kind="tempai" が出る', () => {
    const state: ResultState = {
      status: 'ok',
      result: {
        type: 'tempai',
        tileAvailabilities: [
          { tile: { type: 's', n: 5, red: false }, count: 1 }
        ]
      }
    };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);

    expect(html).toContain('data-state="ok"');
    expect(html).toContain('data-result-kind="tempai"');
    expect(html).toContain('聴牌');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
  });

  it('E1-7: ok で discard-shanten のとき data-state="ok" かつ data-result-kind="discard" が出る', () => {
    const state: ResultState = {
      status: 'ok',
      result: {
        type: 'discard-shanten',
        discards: []
      }
    };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);

    expect(html).toContain('data-state="ok"');
    expect(html).toContain('data-result-kind="discard"');
    expect(html).not.toContain('何切る');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
  });

  it('F1-1: tileActions を渡すと ResultPanel 経由で tempai の牌ボタンが描画される', () => {
    const state: ResultState = {
      status: 'ok',
      result: {
        type: 'tempai',
        tileAvailabilities: [
          { tile: { type: 's', n: 5, red: false }, count: 1 }
        ]
      }
    };
    const html = renderToStaticMarkup(
      <ResultPanel
        resultState={state}
        tileActions={{ tsumo: () => {}, discard: () => {} }}
      />
    );
    // 理由: preload リンクや SVG URL を含む HTML から牌ボタン化と aria-label を検証するため
    expect(html).toContain('<button type="button" class="tile"');
    expect(html).toContain('aria-label="5索をツモ"');
  });
});
