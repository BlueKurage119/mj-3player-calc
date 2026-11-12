import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HandOptions } from '../../../core/input';
import type { Rule } from '../../../core/rule';
import type { Table } from '../../../core/table';
import HoraDetail from './HoraDetail';

async function getCore() {
  const { generateResult } = await import('../../../core/result');
  const { DEFAULT_RULE } = await import('../../../core/rule');
  return { generateResult, DEFAULT_RULE };
}

describe('HoraDetail.test.tsx (E2 和了本体部品の表示)', () => {
  const defaultOptions: HandOptions = {
    riichi: 'none',
    ippatsu: false,
    rinshan: false,
    chankan: false,
    haitei: false,
    tenho: false,
    tsubameGaeshi: false,
    kanFuri: false
  };

  const southTable: Table = {
    round: 'east',
    seat: 'south',
    continue: 0,
    deposit: 0
  };

  it('E2-17: R01 ロン - 平和、1飜、30符、基本点 240、開閉ボタン 符 30 が描画される', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();

    // R01: 234p567p34s678s99p + 2s (南家, 平和1 / 30符 / 1000)
    const res = generateResult(
      southTable,
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

    expect(res?.type).toBe('hora-shanten');
    if (res?.type === 'hora-shanten' && res.info.type === 'hora') {
      const ron = res.info.hora.filter(h => h.by === 'ron');
      const html = renderToStaticMarkup(
        <HoraDetail hora={ron} context={{ table: southTable }} />
      );

      // 意図的アサーション: 和了カード内の各表示文言を検証
      expect(html).toContain('平和');
      expect(html).toContain('1飜 30符');
      expect(html).toContain('基本点 240');
      expect(html).toContain('符 30');
    }
  });

  it('E2-18: R24 ロン - 役なし が出て 700 と 符 の開閉ボタンが出ない', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();

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
      const ron = res.info.hora.filter(h => h.by === 'ron');
      const html = renderToStaticMarkup(
        <HoraDetail hora={ron} context={{ table: southTable }} />
      );

      // 意図的アサーション: 役なし時は点数・符ボタンが非表示であることを検証
      expect(html).toContain('役なし');
      expect(html).toContain('data-no-yaku=""');
      expect(html).not.toContain('700');
      expect(html).not.toContain('fu-breakdown');
    }
  });

  it('E2-19: R24+立直 ロンで 符 34 → 40、R17 七対子で 符 25、R16 国士無双で開閉ボタンなし', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const ruleYakuhai: Rule = { ...DEFAULT_RULE, north: 'yakuhai' };

    // R24 + 立直: 123p456p234s789s11z。分解が1通り(単騎待ち)で、生符34 → 40 に切り上がる
    // (R19 は両面と単騎が同点の多面張で、分解の順序が実行履歴で変わるため使わない)
    const r24 = generateResult(
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
      { ...defaultOptions, riichi: 'riichi' },
      DEFAULT_RULE
    );
    expect(r24?.type).toBe('hora-shanten');
    if (r24?.type === 'hora-shanten' && r24.info.type === 'hora') {
      const ron = r24.info.hora.filter(h => h.by === 'ron');
      const html = renderToStaticMarkup(
        <HoraDetail hora={ron} context={{ table: southTable }} />
      );
      expect(html).toContain('符 34 → 40');
    }

    // R17: 1122p3344s5566s7z + 7z (七対子) -> 符 25
    const r17 = generateResult(
      southTable,
      {
        hand: [
          { type: 'p', n: 1 },
          { type: 'p', n: 1 },
          { type: 'p', n: 2 },
          { type: 'p', n: 2 },
          { type: 's', n: 3 },
          { type: 's', n: 3 },
          { type: 's', n: 4 },
          { type: 's', n: 4 },
          { type: 's', n: 5, red: false },
          { type: 's', n: 5, red: false },
          { type: 's', n: 6 },
          { type: 's', n: 6 },
          { type: 'z', n: 7 },
          { type: 'z', n: 7 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    if (r17?.type === 'hora-shanten' && r17.info.type === 'hora') {
      const ron = r17.info.hora.filter(h => h.by === 'ron');
      const html = renderToStaticMarkup(
        <HoraDetail hora={ron} context={{ table: southTable }} />
      );
      expect(html).toContain('符 25');
    }

    // R16: 国士無双 (役満) -> 開閉ボタンなし
    const r16 = generateResult(
      southTable,
      {
        hand: [
          { type: 'm', n: 1 },
          { type: 'm', n: 9 },
          { type: 'p', n: 1 },
          { type: 'p', n: 9 },
          { type: 's', n: 1 },
          { type: 's', n: 9 },
          { type: 'z', n: 1 },
          { type: 'z', n: 2 },
          { type: 'z', n: 3 },
          { type: 'z', n: 4 },
          { type: 'z', n: 5 },
          { type: 'z', n: 6 },
          { type: 'z', n: 1 },
          { type: 'z', n: 7 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    if (r16?.type === 'hora-shanten' && r16.info.type === 'hora') {
      const ron = r16.info.hora.filter(h => h.by === 'ron');
      const html = renderToStaticMarkup(
        <HoraDetail hora={ron} context={{ table: southTable }} />
      );
      expect(html).not.toContain('fu-breakdown');
    }
  });

  it('E2-20: R22 役満複合なしで3役満がすべて出て 二倍役満 と 64000、ダブル の文字が無い', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const southTable: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };
    const ruleNoMulti: Rule = { ...DEFAULT_RULE, multipleYakuman: false };

    // R22: 四暗刻単騎・大三元・字一色 (南家, 複合なし) -> 二倍役満, 64000
    const r22 = generateResult(
      southTable,
      {
        hand: [
          { type: 'z', n: 1 },
          { type: 'z', n: 1 },
          { type: 'z', n: 1 },
          { type: 'z', n: 2 },
          { type: 'z', n: 5 },
          { type: 'z', n: 5 },
          { type: 'z', n: 5 },
          { type: 'z', n: 6 },
          { type: 'z', n: 6 },
          { type: 'z', n: 6 },
          { type: 'z', n: 7 },
          { type: 'z', n: 7 },
          { type: 'z', n: 7 },
          { type: 'z', n: 2 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      ruleNoMulti
    );

    if (r22?.type === 'hora-shanten' && r22.info.type === 'hora') {
      const ron = r22.info.hora.filter(h => h.by === 'ron');
      const html = renderToStaticMarkup(
        <HoraDetail hora={ron} context={{ table: southTable }} />
      );

      // 意図的アサーション: 3つの役満名が表示されることを検証
      expect(html).toContain('四暗刻単騎');
      expect(html).toContain('大三元');
      expect(html).toContain('字一色');
      expect(html).toContain('二倍役満');
      expect(html).toContain('64000');
      expect(html).not.toContain('ダブル');
    }
  });

  it('E2-21: R07 本場と供託 - は 1400 と 合計 1000(+1400)点 が表示される', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const southTable: Table = {
      round: 'east',
      seat: 'south',
      continue: 2,
      deposit: 1
    };

    // R07: 234p567p34s678s99p + 2s (南家, 2本場, 供託1本)
    const r07 = generateResult(
      southTable,
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

    if (r07?.type === 'hora-shanten' && r07.info.type === 'hora') {
      const ron = r07.info.hora.filter(h => h.by === 'ron');
      const html = renderToStaticMarkup(
        <HoraDetail hora={ron} context={{ table: southTable }} />
      );

      // 意図的アサーション: 本場込み打点と合計加算表示を検証
      expect(html).toContain('は 1400');
      expect(html).toContain('合計 1000(+1400)点');
    }
  });
});
