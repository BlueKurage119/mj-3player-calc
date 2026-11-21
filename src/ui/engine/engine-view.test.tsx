import { readFileSync, readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CandidateStat, TurnStat } from '../../engine/types';
import { EngineView, type EngineViewProps } from './EngineView';
import { CANDIDATE_LINE_STYLES, CHART_TURNS } from './chart-series';
import type { EngineRunState } from './engine-run';

const noop = () => {};
const TABLE = { round: 'east', seat: 'east', continue: 0, deposit: 0 } as const;

const turns = (f: (d: number) => Partial<TurnStat>): TurnStat[] =>
  Array.from({ length: CHART_TURNS }, (_, i) => ({
    draw: i + 1,
    tenpai: 0,
    win: 0,
    ev: 0,
    ...f(i + 1)
  }));

const cand = (
  discard: CandidateStat['discard'],
  f: (d: number) => Partial<TurnStat>
): CandidateStat => {
  const pt = turns(f);
  const last = pt[CHART_TURNS - 1] as TurnStat;
  return {
    discard,
    shanten: 1,
    tenpai: last.tenpai,
    win: last.win,
    ev: last.ev,
    perTurn: pt
  };
};

const view = (over: Partial<EngineViewProps> = {}): EngineViewProps => ({
  onBack: noop,
  onOpenHelp: noop,
  tiles: [{ type: 'z', n: 1 }],
  premise: { table: TABLE, dora: [], nuki: 0, nukiEnabled: true },
  available: true,
  methodChoice: true,
  detailed: false,
  onDetailedChange: noop,
  slow: false,
  run: { status: 'idle' },
  onRun: noop,
  onCancel: noop,
  result: {
    displayTurn: 3,
    onTurnChange: noop,
    rankMetric: 'ev',
    onRankMetricChange: noop
  },
  ...over
});

const done = (candidates: CandidateStat[]): EngineRunState => ({
  status: 'done',
  candidates,
  elapsedMs: 10,
  key: 'k'
});

const render = (p: EngineViewProps) =>
  renderToStaticMarkup(<EngineView {...p} />);

describe('EngineView: 実行前後の表示', () => {
  it('idle: 「計算する」と計算方法の2択がある。結果・中止はない', () => {
    const html = render(view());
    expect(html).toContain('計算する');
    expect(html).toContain('概算');
    expect(html).toContain('手替わりを詳しく');
    expect(html).not.toContain('中止');
    expect(html).not.toContain('engine-result');
  });

  it('U-9: methodChoice=false なら2択を出さない。slow=true のとき「時間がかかります」が出る', () => {
    expect(render(view({ methodChoice: false }))).not.toContain(
      '手替わりを詳しく'
    );
    expect(render(view({ slow: false }))).not.toContain('時間がかかります');
    expect(render(view({ slow: true }))).toContain('時間がかかります');
  });

  it('U-5: running はスピナー・経過時間・「中止」を出し、「計算する」を出さず、計算方法を無効にする', () => {
    const html = render(
      view({ run: { status: 'running', startedAt: 0, elapsedMs: 62_000 } })
    );
    expect(html).toContain('aria-label="計算中"');
    expect(html).toContain('1分2秒');
    expect(html).toContain('中止');
    expect(html).not.toContain('計算する');
    expect(html).toContain('disabled');
  });

  it('U-8: failed は理由ごとに1行の文言を出す', () => {
    expect(
      render(view({ run: { status: 'failed', reason: 'out-of-range' } }))
    ).toContain('4向聴以上は計算できません');
    expect(
      render(view({ run: { status: 'failed', reason: 'not-applicable' } }))
    ).toContain('この手牌は計算できません');
    expect(
      render(view({ run: { status: 'failed', reason: 'error' } }))
    ).toContain('計算できませんでした');
  });

  it('計算できない入力(available=false)では実行ボタンを出さない', () => {
    const html = render(view({ available: false }));
    expect(html).not.toContain('計算する');
    expect(html).toContain('計算できません');
  });
});

describe('EngineView: 結果', () => {
  const c13 = cand(null, d => ({ win: d / 100, tenpai: d / 50, ev: d * 100 }));

  it('U-6/U-7: 13枚は1組の要約(3巡目 = draw 15 の値)とグラフ(折れ線2本)', () => {
    const html = render(view({ run: done([c13]) }));
    // 3巡目: 残り15回 = win 0.15 / tenpai 0.30 / ev 1,500
    expect(html).toContain('15.0%');
    expect(html).toContain('30.0%');
    expect(html).toContain('>1,500<');
    expect(html).not.toContain('engine-candidates');
    expect(html.match(/class="turn-chart__line"/g)?.length).toBe(2);
    // 巡目別の表は無い(値の対応は chart-series のテストと下の要約で検証する)
    expect(html).not.toContain('turn-table');
    expect(html).not.toContain('巡目別の表');
    // 折れ線は 1巡目〜18巡目の18点
    const d = html.match(/class="turn-chart__line" d="([^"]+)"/)?.[1] ?? '';
    expect(d.split(/(?=[ML])/).length).toBe(18);
  });

  it('表示巡目を 1 / 17 / 18 にすると、要約が draw 17 / draw 1 / 補った値に変わる', () => {
    const p = view({ run: done([c13]) });
    const at = (displayTurn: number) =>
      render({ ...p, result: { ...p.result, displayTurn } });
    expect(at(1)).toContain('>1,700<');
    expect(at(17)).toContain('>100<');
    const h18 = at(18);
    expect(h18).toContain('class="engine-summary"');
    expect(h18.match(/engine-summary[\s\S]*?<\/dl>/)?.[0]).toContain('>0<');
  });

  it('現在の巡目が「n順目」で表示される(「巡目」「n順」は使わない)', () => {
    const p = view({ run: done([c13]) });
    expect(render(p)).toContain('>3順目<');
    expect(render(p)).not.toContain('>3順<');
    // 「n順目」はスライダーの左(同じ行で、スライダーより前)にある
    const row =
      render(p).match(/engine-result__slider-row[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(row.indexOf('3順目')).toBeGreaterThan(-1);
    expect(row.indexOf('3順目')).toBeLessThan(row.indexOf('<md-slider'));
    expect(
      render({ ...p, result: { ...p.result, displayTurn: 17 } })
    ).toContain('>17順目<');
  });

  it('U-6: 14枚は列ヘッダー(和了率・聴牌率・期待値)があり、既定は期待値の降順。行は選択不可の表示専用(button・aria-pressed なし)', () => {
    const a = cand({ type: 'z', n: 1 }, () => ({ ev: 100, win: 0.3 }));
    const b = cand({ type: 'z', n: 2 }, () => ({ ev: 900, win: 0.2 }));
    const html = render(view({ run: done([a, b]) }));
    const header =
      html.match(/engine-candidates__header[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(header).toContain('和了率');
    expect(header).toContain('聴牌率');
    expect(header).toContain('期待値');
    // 選択中の列は期待値
    expect(
      [...header.matchAll(/aria-pressed="(true|false)"[^>]*>([^<]+)</g)].map(
        m => [m[2], m[1]]
      )
    ).toEqual([
      ['和了率', 'false'],
      ['聴牌率', 'false'],
      ['期待値', 'true']
    ]);
    const body = html.slice(html.indexOf('engine-candidates__list'));
    expect([...body.matchAll(/aria-label="([^"]+)"/g)].map(m => m[1])).toEqual([
      '南',
      '東'
    ]);
    expect(body).not.toContain('<button');
    expect(body).not.toContain('aria-pressed');
    // 各行に和了率・聴牌率・期待値の3つが並ぶ
    expect(body.match(/engine-candidates__value/g)?.length).toBe(6);
  });

  it('U-6: rankMetric を和了率にすると並びが和了率の降順になり、和了率の列が強調される', () => {
    const a = cand({ type: 'z', n: 1 }, () => ({ ev: 100, win: 0.3 }));
    const b = cand({ type: 'z', n: 2 }, () => ({ ev: 900, win: 0.2 }));
    const p = view({ run: done([a, b]) });
    const html = render({ ...p, result: { ...p.result, rankMetric: 'win' } });
    const body = html.slice(html.indexOf('engine-candidates__list'));
    expect([...body.matchAll(/aria-label="([^"]+)"/g)].map(m => m[1])).toEqual([
      '東',
      '南'
    ]);
    const header =
      html.match(/engine-candidates__header[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(header).toMatch(/aria-pressed="true"[^>]*>和了率</);
  });

  it('U-6: 向聴戻しの候補にだけ「向聴戻し」のチップが付く。13枚には付かない', () => {
    const keep = {
      ...cand({ type: 'z', n: 1 }, () => ({ ev: 900 })),
      shanten: 1
    };
    const back = {
      ...cand({ type: 'z', n: 2 }, () => ({ ev: 100 })),
      shanten: 2
    };
    const html = render(view({ run: done([keep, back]) }));
    expect(html.match(/向聴戻し/g)?.length).toBe(1);
    const rows = html.split('engine-candidates__row').slice(1);
    expect(rows[0]).not.toContain('向聴戻し');
    expect(rows[1]).toContain('向聴戻し');
    // チップは候補行の牌の右(同じ牌の列の中で、牌の後ろ)にある
    expect(rows[1]?.indexOf('class="tile"')).toBeGreaterThan(-1);
    expect(rows[1]?.indexOf('tile')).toBeLessThan(
      rows[1]?.indexOf('向聴戻し') ?? 0
    );
    expect(
      render(view({ run: done([{ ...cand(null, () => ({})), shanten: 2 }]) }))
    ).not.toContain('向聴戻し');
  });
});

describe('U-12: 色の直書きがない', () => {
  it('engine 配下と EngineScreen に HEX の色がない', () => {
    const files = [
      ...readdirSync(new URL('.', import.meta.url))
        .filter(f => /\.(tsx?|css)$/.test(f) && !f.includes('.test.'))
        .map(f => new URL(f, import.meta.url)),
      new URL('../screen/EngineScreen.tsx', import.meta.url)
    ];
    for (const f of files) {
      expect(readFileSync(f, 'utf8')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

describe(' UI監修: ボタン配置・スライダー・前提', () => {
  const actionsOf = (html: string): string => {
    const i = html.indexOf('engine-screen__actions');
    expect(i).toBeGreaterThan(-1);
    return html.slice(i, html.indexOf('</section>', i));
  };

  it('「計算する」は計算方法トグルと同じ行(engine-screen__actions)にある', () => {
    const row = actionsOf(render(view()));
    expect(row).toContain('role="radiogroup"');
    expect(row).toContain('計算する');
  });

  it('実行中は同じ位置が「中止」に替わり、スピナーと経過時間は行の外に出る', () => {
    const html = render(
      view({ run: { status: 'running', startedAt: 0, elapsedMs: 3000 } })
    );
    const row = actionsOf(html);
    const actions = row.slice(0, row.indexOf('engine-screen__running'));
    expect(actions).toContain('中止');
    expect(actions).not.toContain('計算する');
    expect(html).toContain('3秒');
  });

  it('2択を出さないときも「計算する」は行の中にある', () => {
    const html = render(view({ methodChoice: false }));
    expect(actionsOf(html)).toContain('計算する');
    expect(html).not.toContain('radiogroup');
  });

  it('巡目はスライダー(md-slider。1〜18、既定3の値)で、Stepper は使わない', () => {
    const html = render(
      view({ run: done([cand(null, d => ({ win: d / 100 }))]) })
    );
    expect(html).toMatch(/<md-slider[^>]*min="1"/);
    expect(html).toMatch(/<md-slider[^>]*max="18"/);
    expect(html).toMatch(/<md-slider[^>]*value="3"/);
    expect(html).toContain('aria-label="巡目"');
    expect(html).not.toContain('class="stepper');
    // グラフの直後にスライダーがある
    expect(html.indexOf('turn-chart')).toBeLessThan(html.indexOf('<md-slider'));
  });

  it('前提: 場風・自風は要約カードと同じ表記。積み棒・供託は出さず、抜き北は 0 枚でも出し、ドラは入力があるときだけ出す', () => {
    const empty = render(view());
    expect(empty).toContain('summary-card__winds">東場・東家<');
    expect(empty).not.toContain('積み棒');
    expect(empty).not.toContain('供託');
    expect(empty).not.toContain('summary-card__dora');
    // 抜き北は 0 枚でも「北 0」
    expect(empty).toContain('aria-label="抜き北 0"');
    expect(empty).toContain('北 0');
    const html = render(
      view({
        premise: {
          table: { round: 'south', seat: 'west', continue: 2, deposit: 1 },
          dora: [
            { type: 'p', n: 3 },
            { type: 'z', n: 5 }
          ],
          nuki: 2,
          nukiEnabled: true
        }
      })
    );
    expect(html).toContain('summary-card__winds">南場・西家<');
    expect(html).not.toContain('積み棒');
    expect(html).toContain('summary-card__dora');
    expect(html).toContain('aria-label="3筒"');
    expect(html).toContain('aria-label="抜き北 2"');
    // 裏ドラは出さない
    expect(html).not.toContain('>裏<');
  });

  it('前提: 共通役牌モード(nukiEnabled=false)では北の表示自体を出さない', () => {
    const html = render(
      view({
        premise: { table: TABLE, dora: [], nuki: 0, nukiEnabled: false }
      })
    );
    expect(html).not.toContain('抜き北');
    expect(html).not.toContain('北 ');
  });

  it('「n順目」は縦軸の目盛りと同じ書式(フォント・色トークン・tick-size/320 の大きさ・右寄せ)', () => {
    const css = readFileSync(new URL('./engine.css', import.meta.url), 'utf8');
    const label = css.match(/\.engine-result__turn-label \{[^}]*\}/)?.[0] ?? '';
    const tick = css.match(/\.turn-chart__tick \{[^}]*\}/)?.[0] ?? '';
    expect(tick).toContain('--md-sys-typescale-label-small-font');
    expect(tick).toContain('--md-sys-color-on-surface-variant');
    expect(label).toContain('--md-sys-typescale-label-small-font');
    expect(label).toContain('--md-sys-color-on-surface-variant');
    expect(label).toContain(
      'font-size: calc(var(--turn-chart-tick-size, 8) / 320 * 100cqw)'
    );
    expect(tick).toContain(
      'font-size: calc(var(--turn-chart-tick-size, 8) * 1px)'
    );
    // 同じ変数を .engine-result__chart で1か所だけ定義する(5桁の期待値が収まる 8)
    expect(css.match(/--turn-chart-tick-size: 8;/g)?.length).toBe(1);
    expect(label).toContain('text-align: end');
    expect(css).toMatch(
      /\.engine-result__chart \{[^}]*container-type: inline-size/
    );
  });
});

describe('第13版: 14枚のグラフは上位5候補の折れ線', () => {
  // tile 1..7 (東〜中は z1..z7)。期待値は tile が大きいほど大、和了率は tile が小さいほど大
  const c14 = (t: number) =>
    cand({ type: 'z', n: t as 1 }, d => ({
      win: (8 - t) / 10,
      tenpai: t / 10,
      ev: d * t * 100
    }));
  const cs = [1, 2, 3, 4, 5, 6, 7].map(c14);
  const html = (metric: 'win' | 'tenpai' | 'ev') => {
    const p = view({ run: done(cs) });
    return render({ ...p, result: { ...p.result, rankMetric: metric } });
  };
  const ids = (h: string) =>
    [...h.matchAll(/data-series="(cand-\d+)"/g)].map(m => m[1]);

  it('14枚: 折れ線は5本、候補行の並び(期待値降順)の先頭5件と同じ順', () => {
    expect(ids(html('ev'))).toEqual([
      'cand-6',
      'cand-5',
      'cand-4',
      'cand-3',
      'cand-2'
    ]);
    expect(html('ev').match(/class="turn-chart__line"/g)?.length).toBe(5);
  });

  it('並べ替え(指標の切替)で5本が入れ替わる', () => {
    expect(ids(html('win'))).toEqual([
      'cand-0',
      'cand-1',
      'cand-2',
      'cand-3',
      'cand-4'
    ]);
    expect(ids(html('tenpai'))).toEqual(ids(html('ev')));
  });

  it('期待値のときだけ縦軸が点(上端は最大値の切り上げ)で、凡例の指標名に(点)が付く', () => {
    const ev = html('ev');
    // 全巡目の最大は t=7・draw 17: 11,900 → 上端 20000
    expect(ev).toContain('>20000<');
    expect(ev).toContain('期待値(点)');
    expect(ev).not.toContain('>100%<');
    const win = html('win');
    expect(win).toContain('>100%<');
    expect(win).toContain('和了率');
    expect(win).not.toContain('(点)');
  });

  it('候補行の上位5行だけがグラフと同じ色で塗られ(--line-color)、14枚のグラフ凡例はない', () => {
    const h = html('ev');
    expect(h.match(/data-line="true"/g)?.length).toBe(5);
    expect(h).toContain('--line-color:var(--md-sys-color-primary)');
    // 線の色は凡例を兼ねるので、グラフの凡例は出さない
    expect(h).not.toContain('turn-chart__legend');
    // 13枚は従来どおり凡例(和了率・聴牌率)
    const h13 = render(view({ run: done([cand(null, () => ({}))]) }));
    expect(h13).toContain('turn-chart__legend');
  });

  it('13枚は従来どおり2本(和了率・聴牌率)', () => {
    const h = render(
      view({ run: done([cand(null, d => ({ win: d / 100 }))]) })
    );
    expect(h.match(/class="turn-chart__line"/g)?.length).toBe(2);
    expect(h).not.toContain('data-line');
  });

  it('5本の色は互いに異なるトークンで、セカンダリー系を含まない', () => {
    const tokens = CANDIDATE_LINE_STYLES.map(x => x.colorToken);
    expect(new Set(tokens).size).toBe(5);
    expect(tokens.some(t => t.includes('secondary'))).toBe(false);
  });
});

describe('第12版: 前提と手牌の固定カード', () => {
  const css = readFileSync(new URL('./engine.css', import.meta.url), 'utf8');
  const block = (re: RegExp) => css.match(re)?.[0] ?? '';

  it('前提と手牌が1枚のカード(.engine-card)に入り、固定前は data-stuck=false', () => {
    const html = render(view());
    const card = html.indexOf('class="engine-card"');
    expect(card).toBeGreaterThan(-1);
    expect(html).toContain('data-stuck="false"');
    expect(html.indexOf('engine-premise')).toBeGreaterThan(card);
    expect(html.indexOf('engine-screen__hand')).toBeGreaterThan(
      html.indexOf('engine-premise')
    );
    // 目印はカードの外(流れに影響しない絶対配置)
    expect(html.indexOf('engine-card__sentinel')).toBeLessThan(card);
  });

  it('カードはヘッダーの下に sticky、固定中は要約カードと同じ色トークン、遷移はモーショントークン', () => {
    const card = block(/\.engine-card \{[^}]*\}/);
    expect(card).toContain('position: sticky');
    expect(card).toContain('top: var(--engine-header-height');
    expect(card).toContain('--md-sys-motion-spring-effects-fast-duration');
    expect(card).toContain('--md-sys-motion-spring-effects-fast-easing');
    const stuck = block(/\.engine-card\[data-stuck="true"\] \{[^}]*\}/);
    expect(stuck).toContain('--md-sys-color-secondary-container');
    expect(stuck).toContain('--md-sys-color-on-secondary-container');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('手牌の牌は通常 1.5rem、固定中はドラと同じ 1.25rem に縮み、14枚でも折り返さない', () => {
    expect(block(/\.engine-screen__hand \{[^}]*\}/)).toContain(
      '--hand-tile: 1.5rem'
    );
    expect(
      block(
        /\.engine-card\[data-stuck="true"\] \.engine-screen__hand \{[^}]*\}/
      )
    ).toContain('--hand-tile: 1.25rem');
    expect(block(/\.engine-premise \{[^}]*\}/)).toContain(
      '--tile-width: 1.25rem'
    );
    const tiles = block(/\.engine-screen__hand \.glance-tiles \{[^}]*\}/);
    expect(tiles).toContain('flex-wrap: nowrap');
    expect(tiles).toContain('100cqw');
    expect(render(view())).toContain('--hand-count');
  });
});

describe('第8版: 並びとスタイル', () => {
  it('前提は手牌より前にあり、カード(secondary-container)に入れない', () => {
    const html = render(view());
    expect(html.indexOf('engine-premise')).toBeGreaterThan(-1);
    expect(html.indexOf('engine-premise')).toBeLessThan(
      html.indexOf('engine-screen__hand')
    );
    const css = readFileSync(new URL('./engine.css', import.meta.url), 'utf8');
    const premise = css.match(/\.engine-premise \{[^}]*\}/)?.[0] ?? '';
    expect(premise).not.toContain('secondary-container');
    expect(premise).not.toContain('background-color');
    expect(html.indexOf('class="engine-card"')).toBeLessThan(
      html.indexOf('engine-premise')
    );
  });

  it('列ヘッダーは中央揃え、「向聴戻し」は2文字ずつで改行する幅', () => {
    const css = readFileSync(new URL('./engine.css', import.meta.url), 'utf8');
    const sort = css.match(/\.engine-candidates__sort \{[^}]*\}/)?.[0] ?? '';
    expect(sort).toContain('justify-content: center');
    const chip = css.match(/\.engine-candidates__chip \{[^}]*\}/)?.[0] ?? '';
    expect(chip).toContain('white-space: nowrap');
    expect(chip).not.toContain('width: 2em');
    expect(chip).toContain('--md-sys-color-surface-container-highest');
    expect(chip).toContain('--md-sys-color-on-surface-variant');
    expect(chip).not.toContain('tertiary');
  });

  it('巡目別の表の部品は残っていない', () => {
    const files = readdirSync(new URL('.', import.meta.url));
    expect(files.some(f => f.startsWith('TurnTable'))).toBe(false);
  });
});
