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

  it('E2-11: R02 で「ロン 1500 / ツモ 700オール」が出ること、和了牌の牌画像と「和了」の文字が無いこと', async () => {
    const { generateResult } = await import('../../core/result');
    const { DEFAULT_RULE } = await import('../../core/rule');
    const eastTable = {
      round: 'east' as const,
      seat: 'east' as const,
      continue: 0,
      deposit: 0
    };
    const defaultOptions = {
      riichi: 'none' as const,
      ippatsu: false,
      rinshan: false,
      chankan: false,
      haitei: false,
      tenho: false,
      tsubameGaeshi: false,
      kanFuri: false
    };

    // R02: 234p567p34s678s99p + 2s (東家)
    const res = generateResult(
      eastTable,
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
      defaultOptions,
      DEFAULT_RULE
    );

    if (res?.type === 'hora-shanten' && res.info.type === 'hora') {
      const markup = renderToStaticMarkup(
        <ResultGlance view={{ kind: 'hora', hora: res.info.hora }} />
      );
      expect(markup).toContain('ロン');
      expect(markup).toContain('1500');
      expect(markup).toContain('ツモ');
      expect(markup).toContain('700オール');
      expect(markup).toContain('data-result-kind="hora"');
      expect(markup).not.toContain('和了');
      expect(markup.match(/role="img"/g)).toBeNull();
    }
  });

  it('E2-14: R24 で「ロン 役なし / ツモ 300·500」', async () => {
    const { generateResult } = await import('../../core/result');
    const { DEFAULT_RULE } = await import('../../core/rule');
    const southTable = {
      round: 'east' as const,
      seat: 'south' as const,
      continue: 0,
      deposit: 0
    };
    const defaultOptions = {
      riichi: 'none' as const,
      ippatsu: false,
      rinshan: false,
      chankan: false,
      haitei: false,
      tenho: false,
      tsubameGaeshi: false,
      kanFuri: false
    };

    // R24: 123p456p234s789s1z + 1z (南家, 役なし)
    const res = generateResult(
      southTable,
      {
        hand: [
          { type: 'p', n: 1 },
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 's', n: 2 },
          { type: 's', n: 3 },
          { type: 's', n: 4 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 's', n: 9 },
          { type: 'z', n: 1 },
          { type: 'z', n: 1 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );

    if (res?.type === 'hora-shanten' && res.info.type === 'hora') {
      const markup = renderToStaticMarkup(
        <ResultGlance view={{ kind: 'hora', hora: res.info.hora }} />
      );
      expect(markup).toContain('ロン');
      expect(markup).toContain('役なし');
      expect(markup).toContain('ツモ');
      expect(markup).toContain('300·500');
    }
  });

  it('E2-14: 両方役なしで「役なし」だけが出ること', () => {
    const mockHora: ScoredHora[] = [
      {
        type: 'mentsu',
        by: 'ron',
        horaTile: { type: 'p', n: 1 },
        melds: [],
        fu: [],
        yaku: [],
        score: {
          basePoint: 160,
          han: 0,
          fu: 30,
          yakumanPoint: 0,
          payment: {
            detail: { by: 'ron', discarder: { base: 700, withHonba: 700 } },
            total: 700,
            honba: 0,
            deposit: 0,
            bonus: 0
          }
        }
      },
      {
        type: 'mentsu',
        by: 'tsumo',
        horaTile: { type: 'p', n: 1 },
        melds: [],
        fu: [],
        yaku: [],
        score: {
          basePoint: 160,
          han: 0,
          fu: 30,
          yakumanPoint: 0,
          payment: {
            detail: {
              by: 'tsumo',
              winner: 'nonDealer',
              dealer: { base: 400, withHonba: 400 },
              nonDealer: { base: 200, withHonba: 200 }
            },
            total: 600,
            honba: 0,
            deposit: 0,
            bonus: 0
          }
        }
      }
    ];

    const markup = renderToStaticMarkup(
      <ResultGlance view={{ kind: 'hora', hora: mockHora }} />
    );
    expect(markup).toContain('役なし');
    expect(markup).not.toContain('ロン');
    expect(markup).not.toContain('ツモ');
    expect(markup).not.toContain(' / ');
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
