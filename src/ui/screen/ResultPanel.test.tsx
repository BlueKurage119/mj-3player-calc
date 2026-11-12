import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ScoredHora } from '../../core/result';
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

  it('E1-7: ok で hora のとき data-state="ok" かつ data-result-kind="hora" が出る', () => {
    const state: ResultState = {
      status: 'ok',
      result: {
        type: 'hora-shanten',
        info: {
          type: 'hora',
          hora: [
            {
              horaTile: { type: 'm', n: 1 },
              by: 'tsumo'
            } as unknown as ScoredHora
          ]
        }
      }
    };
    const html = renderToStaticMarkup(<ResultPanel resultState={state} />);

    expect(html).toContain('data-state="ok"');
    expect(html).toContain('data-result-kind="hora"');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
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
    expect(html).toContain('何切る');
    expect(html).not.toContain('data-view');
    expect(html).not.toContain('result-panel--banner');
  });
});
