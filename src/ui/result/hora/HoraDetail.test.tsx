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

  it('E2-17: R01 ロン - 平和、1飜、30符、＋4飜で満貫、基本点 240、開閉ボタン 符 30 が描画される', async () => {
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
        <HoraDetail
          hora={ron}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
      );

      // 意図的アサーション: 和了カード内の各表示文言を検証
      expect(html).toContain('平和');
      expect(html).toContain('1飜 30符');
      expect(html).toContain('＋4飜で満貫');
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
        <HoraDetail
          hora={ron}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
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
        <HoraDetail
          hora={ron}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
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
        <HoraDetail
          hora={ron}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
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
        <HoraDetail
          hora={ron}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
      );
      expect(html).not.toContain('fu-breakdown');
    }
  });

  it('E2-20: R22 役満複合なしで3役満がすべて出て 二倍役満 と 64,000、ダブル の文字が無い', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const southTable: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };
    const ruleNoMulti: Rule = { ...DEFAULT_RULE, multipleYakuman: false };

    // R22: 四暗刻単騎・大三元・字一色 (南家, 複合なし) -> 二倍役満, 64,000
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
        <HoraDetail
          hora={ron}
          context={{ table: southTable, rule: ruleNoMulti }}
        />
      );

      // 意図的アサーション: 3つの役満名が表示されることを検証
      expect(html).toContain('四暗刻単騎');
      expect(html).toContain('大三元');
      expect(html).toContain('字一色');
      expect(html).toContain('二倍役満');
      expect(html).toContain('64,000');
      expect(html).not.toContain('ダブル');
    }
  });

  it('E2-21: R07 本場と供託 - ツモに「は 600・900」「合計 1,100(+1,400)点」、ロンに「は 1,400」「(+1,400)点」があり「合計」が無い', async () => {
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
      const ronHtml = renderToStaticMarkup(
        <HoraDetail
          hora={ron}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
      );

      // 意図的アサーション: ロンには「は 1,400」と「(+1,400)点」があり、「合計」が無い
      expect(ronHtml).toContain('は 1,400');
      expect(ronHtml).toContain('(+1,400)点');
      expect(ronHtml).not.toContain('合計');

      const tsumo = r07.info.hora.filter(h => h.by === 'tsumo');
      const tsumoHtml = renderToStaticMarkup(
        <HoraDetail
          hora={tsumo}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
      );

      // 意図的アサーション: ツモには「は 600・900」と「合計 1,100(+1,400)点」がある
      expect(tsumoHtml).toContain('は 600・900');
      expect(tsumoHtml).toContain('合計 1,100(+1,400)点');
    }
  });

  it('E2-22: R28 13枚複数和了牌 - article.hora-item が6件、ron・tsumo が交互に並び和了牌まとめ見出しが無い', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();

    // R28: 13枚 234p567p34s678s99p (和了牌 2s, 5s, 赤5s)
    const r28 = generateResult(
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
          { type: 'p', n: 9 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );

    if (r28?.type === 'hora-shanten' && r28.info.type === 'hora') {
      const html = renderToStaticMarkup(
        <HoraDetail
          hora={r28.info.hora}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
      );

      // 和了牌まとめの見出し (hora-group__tile や 和了候補) が無い
      expect(html).not.toContain('hora-group');
      expect(html).not.toContain('和了候補');

      // article.hora-item が6件
      const matches = html.match(/class="hora-item"/g);
      expect(matches?.length).toBe(6);

      // data-hora-by が ron, tsumo の順に交互
      const byMatches = Array.from(
        html.matchAll(/data-hora-by="(ron|tsumo)"/g)
      ).map(m => m[1]);
      expect(byMatches).toEqual([
        'ron',
        'tsumo',
        'ron',
        'tsumo',
        'ron',
        'tsumo'
      ]);
    }
  });

  it('E2-23: R13 と R14 で「＋」の文字が無い(次の段階が出ない)', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();

    // R13: 数え役満
    const r11Hand = [
      { type: 'p', n: 1 } as const,
      { type: 'p', n: 2 } as const,
      { type: 'p', n: 3 } as const,
      { type: 'p', n: 4 } as const,
      { type: 'p', n: 5, red: false } as const,
      { type: 'p', n: 6 } as const,
      { type: 'p', n: 7 } as const,
      { type: 'p', n: 8 } as const,
      { type: 'p', n: 9 } as const,
      { type: 'p', n: 2 } as const,
      { type: 'p', n: 3 } as const,
      { type: 'p', n: 9 } as const,
      { type: 'p', n: 9 } as const,
      { type: 'p', n: 4 } as const
    ];
    const r13 = generateResult(
      southTable,
      { hand: r11Hand, melds: [], dora: [{ type: 'p', n: 3 }], nuki: 0 },
      { ...defaultOptions, riichi: 'riichi', ippatsu: true },
      DEFAULT_RULE
    );
    if (r13?.type === 'hora-shanten' && r13.info.type === 'hora') {
      const html = renderToStaticMarkup(
        <HoraDetail
          hora={r13.info.hora}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
      );
      expect(html).not.toContain('＋');
    }

    // R14: 大三元
    const r14Hand = [
      { type: 'z', n: 5 } as const,
      { type: 'z', n: 5 } as const,
      { type: 'z', n: 5 } as const,
      { type: 'z', n: 6 } as const,
      { type: 'z', n: 6 } as const,
      { type: 'z', n: 6 } as const,
      { type: 'z', n: 7 } as const,
      { type: 'z', n: 7 } as const,
      { type: 'p', n: 1 } as const,
      { type: 'p', n: 2 } as const,
      { type: 'p', n: 3 } as const,
      { type: 's', n: 9 } as const,
      { type: 's', n: 9 } as const,
      { type: 'z', n: 7 } as const
    ];
    const r14 = generateResult(
      southTable,
      { hand: r14Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    if (r14?.type === 'hora-shanten' && r14.info.type === 'hora') {
      const html = renderToStaticMarkup(
        <HoraDetail
          hora={r14.info.hora}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
      );
      expect(html).not.toContain('＋');
    }
  });

  it('E2-24: R14 大三元(役満)でも、面子手なので符の折りたたみが出て、見出しに「・基本点 8000」、中に「役満 = 8000」', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const t = (type: 'p' | 's' | 'z', n: number) =>
      ({ type, n }) as import('../../../core/tile').Tile;
    const r14 = generateResult(
      southTable,
      {
        hand: [
          t('z', 5),
          t('z', 5),
          t('z', 5),
          t('z', 6),
          t('z', 6),
          t('z', 6),
          t('z', 7),
          t('z', 7),
          t('p', 1),
          t('p', 2),
          t('p', 3),
          t('s', 9),
          t('s', 9),
          t('z', 7)
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(r14?.type).toBe('hora-shanten');
    if (r14?.type === 'hora-shanten' && r14.info.type === 'hora') {
      const ron = r14.info.hora.filter(h => h.by === 'ron');
      const html = renderToStaticMarkup(
        <HoraDetail
          hora={ron}
          context={{ table: southTable, rule: DEFAULT_RULE }}
        />
      );
      expect(html).toContain('fu-breakdown');
      expect(html).toContain('・基本点 8000');
      expect(html).toContain('役満 = 8000');
      expect(html).toContain('符');
    }
  });
});
