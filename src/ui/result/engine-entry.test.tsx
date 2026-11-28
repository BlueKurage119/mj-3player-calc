import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseTiles } from '../../../bench/engine/hands';
import { generateResult } from '../../core/result';
import type { Result } from '../../core/result';
import { DEFAULT_RULE } from '../../core/rule';
import type { ResultState } from '../calc/result-state';
import { ResultPanel } from '../screen/ResultPanel';
import { type ResultView, classifyResult } from './classify';
import { SYMBOL_ANALYTICS } from '../icons';
import { engineHandSize, engineStartShanten } from './engine-entry';

const table = { round: 'east', seat: 'east', continue: 0, deposit: 0 } as const;
const handOptions = {
  riichi: 'none',
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false,
  tsubameGaeshi: false,
  kanFuri: false
} as const;

const resultOfWith = (
  hand: string,
  opts:
    | typeof handOptions
    | {
        readonly [K in keyof typeof handOptions]: (typeof handOptions)[K] extends boolean
          ? boolean
          : (typeof handOptions)[K];
      },
  rule: typeof DEFAULT_RULE
): Result =>
  generateResult(
    table,
    { hand: parseTiles(hand), melds: [], dora: [], nuki: 0 },
    opts,
    rule
  );

const resultOf = (hand: string): Result =>
  resultOfWith(hand, handOptions, { ...DEFAULT_RULE });

const renderPanel = (
  result: Result,
  handLength: number,
  withEntry = true
): string => {
  const state: ResultState = { status: 'ok', result };
  return renderToStaticMarkup(
    <ResultPanel
      resultState={state}
      engineEntry={
        withEntry ? { onOpen: () => {}, handLength, meldCount: 0 } : undefined
      }
    />
  );
};

const HAS_BUTTON = /result-body__engine-button/;

const shantenResult2 = (): Result => resultOf('19m22p345p678s468s'); // 13枚2向聴
const tempai13 = (): Result => resultOf('1199m123456p789s'); // 13枚聴牌(hora)
const tempaiNoScore: Result = {
  type: 'tempai',
  tileAvailabilities: [{ tile: { type: 'z', n: 1 }, count: 2 }]
};
const discard14 = (): Result => resultOf('1199m123456p789s5z'); // 14枚の打牌候補
const hora14 = (): Result => resultOf('111999m123456p1z1z'); // 14枚の和了形
const shanten4 = (): Result => resultOf('19m1379p147s1235z'); // 13枚4向聴

describe('U-1: 見出し右の「計算」ボタン', () => {
  it.each([
    ['13枚2向聴(shanten)', shantenResult2, 13, 'shanten'],
    ['13枚聴牌(役ありの hora)', tempai13, 13, 'hora'],
    ['13枚聴牌(tempai)', () => tempaiNoScore, 13, 'tempai'],
    ['14枚の打牌候補(discard)', discard14, 14, 'discard']
  ] as const)('%s: ボタンが見出し行にある', (_name, make, len, kind) => {
    const result = make();
    expect(classifyResult(result).kind).toBe(kind);
    const html = renderPanel(result, len);
    expect(html).toMatch(HAS_BUTTON);
    // 見出し行(result-body__heading)の中にあり、ラベルは「計算」
    expect(html).toMatch(
      /class="result-body__heading result-body__heading--action"[\s\S]*?result-body__engine-button[^>]*><span slot="icon"><svg[\s\S]*?<\/svg><\/span>計算</
    );
  });

  it.each([
    ['14枚の和了形(hora)', hora14, 14],
    ['just-hora', (): Result => ({ type: 'just-hora' }), 13],
    ['none(null)', (): Result => null, 13],
    ['13枚4向聴', shanten4, 13]
  ] as const)('%s: ボタンが出ない', (_name, make, len) => {
    expect(renderPanel(make(), len)).not.toMatch(HAS_BUTTON);
  });

  it('13枚聴牌(hora)は、「聴牌+計算」だけの小さなカードが和了の表示の前に1枚だけ出る(見出し左・ボタン右)。ボタンだけの行は廃止', () => {
    const html = renderPanel(tempai13(), 13);
    expect((html.match(/data-result-card="tempai-engine"/g) ?? []).length).toBe(
      1
    );
    // カードの中身は 見出し「聴牌」(左)→ ボタン(右) だけ
    const card =
      html.match(
        /<div class="result-body__engine-card"[\s\S]*?<\/div><\/div>/
      )?.[0] ?? '';
    expect(card).toMatch(
      /<h2 class="result-body__title">聴牌<\/h2><[^>]*result-body__engine-button[^>]*><span slot="icon"><svg[\s\S]*?<\/svg><\/span>計算</
    );
    // 和了の表示の本体は枠なし(flat)のまま。従来の「ボタンだけの行」は無い
    expect(html).toContain('result-panel--flat');
    expect(html).not.toMatch(/result-body__heading--action"><md-text-button/);
  });

  it('打点なしの聴牌(TempaiBody)は、既存の見出し+ボタンの1つだけで、小さなカードを重ねて出さない', () => {
    const t = renderPanel(tempaiNoScore, 13);
    expect(t).not.toContain('result-body__engine-card');
    expect(t.match(/result-body__engine-button/g)?.length).toBe(1);
    expect(t).toMatch(
      /class="result-panel"[\s\S]*result-body__heading--action"><h2 class="result-body__title">聴牌<\/h2><[^>]*result-body__engine-button/
    );
  });

  it('「計算」ボタンはすべてテキストボタン(tonal ではない)で、ラベルは「計算」で統一する', () => {
    for (const [make, len] of [
      [shantenResult2, 13],
      [tempai13, 13],
      [() => tempaiNoScore, 13],
      [discard14, 14]
    ] as const) {
      const html = renderPanel(make(), len);
      expect(html).toMatch(
        /<md-text-button[^>]*result-body__engine-button[^>]*><span slot="icon"><svg[\s\S]*?<\/svg><\/span>計算</
      );
      expect(html).not.toContain('md-filled-tonal-button');
      // 先頭に Analytics アイコン(slot="icon")、続けて文字「計算」
      expect(html).toContain(SYMBOL_ANALYTICS);
      expect(html).not.toContain('何切る');
    }
  });

  it('14枚の和了形・props なしには「聴牌+計算」のカードが出ない', () => {
    expect(renderPanel(hora14(), 14)).not.toContain('result-body__engine-card');
    expect(renderPanel(tempai13(), 13, false)).not.toContain(
      'result-body__engine-card'
    );
  });

  it('engineEntry を渡さないとき、どの種別でも HTML が既存と同じ(ボタンも見出し行の追加もない)', () => {
    for (const make of [
      shantenResult2,
      tempai13,
      () => tempaiNoScore,
      discard14
    ]) {
      const html = renderPanel(make(), 13, false);
      expect(html).not.toMatch(HAS_BUTTON);
      expect(html).not.toContain('result-body__heading--action');
    }
  });
});

describe('engineStartShanten / engineHandSize', () => {
  const discardView = (shantens: number[]): ResultView => ({
    kind: 'discard',
    discards: shantens.map(s => ({
      tile: { type: 'z', n: 1 },
      next: {
        type: 'hora-shanten',
        info: { type: 'shanten', shanten: s, tileAvailabilities: [] }
      }
    }))
  });

  it('U-2: 14枚で全候補が4向聴以上なら null、1つでも3向聴以下なら最小を返す', () => {
    expect(engineStartShanten(discardView([4, 5]), 14, 0)).toBeNull();
    expect(engineStartShanten(discardView([4, 3]), 14, 0)).toBe(3);
    expect(engineStartShanten(discardView([2, 3]), 14, 0)).toBe(2);
  });

  it('13枚の向聴は 1〜3 だけ返し、4 は null', () => {
    const v = (shanten: number): ResultView => ({
      kind: 'shanten',
      shanten,
      tileAvailabilities: []
    });
    expect(engineStartShanten(v(3), 13, 0)).toBe(3);
    expect(engineStartShanten(v(4), 13, 0)).toBeNull();
  });

  it('副露を数えて13枚・14枚を判定し、途中の枚数は null', () => {
    expect(engineHandSize(10, 1)).toBe(13);
    expect(engineHandSize(11, 1)).toBe(14);
    expect(engineHandSize(12, 1)).toBeNull();
    expect(engineHandSize(10, 0)).toBeNull();
    const v: ResultView = {
      kind: 'shanten',
      shanten: 2,
      tileAvailabilities: []
    };
    expect(engineStartShanten(v, 10, 0)).toBeNull();
  });

  const tenhoOpts = { ...handOptions, tenho: true } as const;
  const localRule = { ...DEFAULT_RULE, localYaku: true };

  it('173-T3: 13枚の十三不搭のみの hora は engineStartShanten が null で、ResultPanel に計算ボタンが出ない', () => {
    for (const hand of ['19m147p258s12345z', '19m149p19s123456z']) {
      const res = resultOfWith(hand, tenhoOpts, localRule);
      const view = classifyResult(res);
      expect(view.kind).toBe('hora');
      if (view.kind === 'hora') {
        expect(view.hora.every(h => h.type === 'shisanputa')).toBe(true);
      }
      expect(engineStartShanten(view, 13, 0)).toBeNull();
      expect(renderPanel(res, 13)).not.toMatch(HAS_BUTTON);
    }
  });

  it('173-T4: 十三不搭と他の和了が混在する13枚 hora、および通常13枚聴牌(天和・ローカル役有効)は 0 を返す', () => {
    const normalView = classifyResult(tempai13());
    const shisaView = classifyResult(
      resultOfWith('19m147p258s12345z', tenhoOpts, localRule)
    );
    if (normalView.kind !== 'hora' || shisaView.kind !== 'hora') {
      throw new Error('hora view expected');
    }
    const mentsuHora = normalView.hora[0];
    const shisanputaHora = shisaView.hora[0];
    if (!mentsuHora || !shisanputaHora) {
      throw new Error('hora element expected');
    }
    const mixed: ResultView = {
      kind: 'hora',
      hora: [mentsuHora, shisanputaHora]
    };
    expect(engineStartShanten(mixed, 13, 0)).toBe(0);

    const normalTenhoView = classifyResult(
      resultOfWith('1199m123456p789s', tenhoOpts, localRule)
    );
    expect(engineStartShanten(normalTenhoView, 13, 0)).toBe(0);
  });

  it('173-T8: 14枚打牌候補でも打牌後が十三不搭だけの hora になる候補は除外する', () => {
    const v1 = classifyResult(
      resultOfWith('19m147p258s12345z3p', tenhoOpts, localRule)
    );
    expect(v1.kind).toBe('discard');
    expect(engineStartShanten(v1, 14, 0)).toBeNull();

    const v2 = classifyResult(
      resultOfWith('19m149p19s123456z3p', tenhoOpts, localRule)
    );
    expect(v2.kind).toBe('discard');
    expect(engineStartShanten(v2, 14, 0)).toBeNull();

    const shisaView = classifyResult(
      resultOfWith('19m147p258s12345z', tenhoOpts, localRule)
    );
    if (shisaView.kind !== 'hora') throw new Error('hora expected');
    const mixedDiscard: ResultView = {
      kind: 'discard',
      discards: [
        {
          tile: { type: 'p', n: 3 },
          next: {
            type: 'hora-shanten',
            info: { type: 'hora', hora: shisaView.hora }
          }
        },
        {
          tile: { type: 'z', n: 1 },
          next: {
            type: 'hora-shanten',
            info: { type: 'shanten', shanten: 1, tileAvailabilities: [] }
          }
        }
      ]
    };
    expect(engineStartShanten(mixedDiscard, 14, 0)).toBe(1);

    const normalDiscard = classifyResult(
      resultOfWith('1199m123456p789s5z', tenhoOpts, localRule)
    );
    expect(engineStartShanten(normalDiscard, 14, 0)).toBe(0);
    expect(engineStartShanten(classifyResult(discard14()), 14, 0)).toBe(0);
  });
});
