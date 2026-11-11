import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ScoredHora } from '../../core/result';
import type { TileAvailability } from '../../core/tile';
import { ResultGlance } from './ResultGlance';

describe('ResultGlance', () => {
  it('E1-6: none のときは何も描画しない', () => {
    const markup = renderToStaticMarkup(
      <ResultGlance view={{ kind: 'none' }} />
    );
    expect(markup).toBe('');
  });

  it('E1-6: just-hora のとき指定の文言が出る', () => {
    const markup = renderToStaticMarkup(
      <ResultGlance view={{ kind: 'just-hora' }} />
    );
    expect(markup).toContain('和了です。牌をすべて入力して点数を計算します。');
    expect(markup).toContain('data-result-kind="just-hora"');
  });

  it('E1-6: shanten のとき「N向聴」「受け入れ」と牌が表示される', () => {
    const tileAvailabilities: TileAvailability[] = [
      { tile: { type: 'm', n: 1 }, count: 3 },
      { tile: { type: 'p', n: 9 }, count: 1 }
    ];
    const markup = renderToStaticMarkup(
      <ResultGlance
        view={{
          kind: 'shanten',
          shanten: 1,
          tileAvailabilities
        }}
      />
    );
    expect(markup).toContain('1向聴 受け入れ');
    expect(markup).toContain('data-result-kind="shanten"');
    expect(markup).toContain('tile');
  });

  it('E1-6: tempai で残りが1枚以上あるとき「聴牌 待ち」と牌が表示される', () => {
    const tileAvailabilities: TileAvailability[] = [
      { tile: { type: 's', n: 5, red: false }, count: 2 }
    ];
    const markup = renderToStaticMarkup(
      <ResultGlance
        view={{
          kind: 'tempai',
          tileAvailabilities
        }}
      />
    );
    expect(markup).toContain('聴牌 待ち');
    expect(markup).toContain('data-result-kind="tempai"');
    expect(markup).toContain('tile');
  });

  it('E1-6: tempai で全0枚のとき「和了牌なし」になる', () => {
    const tileAvailabilities: TileAvailability[] = [
      { tile: { type: 's', n: 5, red: false }, count: 0 },
      { tile: { type: 's', n: 6 }, count: 0 }
    ];
    const markup = renderToStaticMarkup(
      <ResultGlance
        view={{
          kind: 'tempai',
          tileAvailabilities
        }}
      />
    );
    expect(markup).toContain('和了牌なし');
    expect(markup).not.toContain('聴牌 待ち');
    expect(markup).toContain('data-result-kind="tempai"');
  });

  it('E1-6: hora のとき「和了」と牌が表示される', () => {
    const markup = renderToStaticMarkup(
      <ResultGlance
        view={{
          kind: 'hora',
          hora: [
            {
              horaTile: { type: 'z', n: 1 },
              by: 'tsumo'
            } as unknown as ScoredHora
          ]
        }}
      />
    );
    expect(markup).toContain('和了');
    expect(markup).toContain('data-result-kind="hora"');
  });

  it('E1-6: hora のとき、ツモとロンで同じ牌が重なっても牌は1枚だけ出し、ツモ・ロンの語は出さない', () => {
    const markup = renderToStaticMarkup(
      <ResultGlance
        view={{
          kind: 'hora',
          hora: [
            {
              horaTile: { type: 'z', n: 1 },
              by: 'tsumo'
            } as unknown as ScoredHora,
            {
              horaTile: { type: 'z', n: 1 },
              by: 'ron'
            } as unknown as ScoredHora
          ]
        }}
      />
    );
    expect(markup.match(/role="img"/g)?.length ?? 0).toBe(1);
    expect(markup).not.toContain('ツモ');
    expect(markup).not.toContain('ロン');
  });

  it('E1-6: discard のとき「何切る」が表示される', () => {
    const markup = renderToStaticMarkup(
      <ResultGlance
        view={{
          kind: 'discard',
          discards: []
        }}
      />
    );
    expect(markup).toContain('何切る');
    expect(markup).toContain('data-result-kind="discard"');
  });
});
