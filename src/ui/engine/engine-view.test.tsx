import { readFileSync, readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CandidateStat, TurnStat } from '../../engine/types';
import { EngineView, type EngineViewProps } from './EngineView';
import { CHART_TURNS } from './chart-series';
import type { EngineRunState } from './engine-run';

const noop = () => {};

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
  premise: { dora: [], nuki: 0, round: 'east', seat: 'east' },
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
    selectedIndex: null,
    onSelect: noop
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

  it('U-6/U-7: 13枚は1組の要約(表示巡目3の値)・グラフ(折れ線2本)・18行の表。18行目は要約の18巡目の値と一致する', () => {
    const html = render(view({ run: done([c13]) }));
    // 3巡目: win 0.03 / tenpai 0.06 / ev 300
    expect(html).toContain('3.0%');
    expect(html).toContain('6.0%');
    expect(html).toContain('>300<');
    expect(html).not.toContain('engine-candidates');
    expect(html.match(/class="turn-chart__line"/g)?.length).toBe(2);
    const rows = html.match(/<tr class="turn-table__row"/g) ?? [];
    expect(rows.length).toBe(18);
    // 18行目(18巡目): win 18.0% / tenpai 36.0% / ev 1,800 が c13.win・tenpai・ev と一致
    const last =
      html.match(/<tr class="turn-table__row"[^>]*>(?:(?!<tr)[\s\S])*$/)?.[0] ??
      '';
    expect(last).toContain('36.0%');
    expect(last).toContain('18.0%');
    expect(last).toContain('1,800');
    expect(c13.win).toBe(0.18);
    expect(c13.tenpai).toBe(0.36);
    expect(c13.ev).toBe(1800);
    // 表示巡目の行が強調される
    expect(html.match(/data-current="true"/g)?.length).toBe(1);
  });

  it('表示巡目を変えると表示が perTurn[i-1] に変わる', () => {
    const p = view({ run: done([c13]) });
    const html = render({ ...p, result: { ...p.result, displayTurn: 10 } });
    expect(html).toContain('10.0%');
    expect(html).toContain('20.0%');
    expect(html).toContain('>1,000<');
  });

  it('U-6: 14枚は候補ごとの行が表示巡目の期待値の降順に並び、先頭行が選択されている。selectedIndex で切り替わる', () => {
    const a = cand({ type: 'z', n: 1 }, () => ({ ev: 100, win: 0.1 }));
    const b = cand({ type: 'z', n: 2 }, () => ({ ev: 900, win: 0.2 }));
    const html = render(view({ run: done([a, b]) }));
    const pressed = [...html.matchAll(/aria-pressed="(true|false)"/g)].map(
      m => m[1]
    );
    // 先頭行(期待値の最大)が選択されている
    expect(pressed).toEqual(['true', 'false']);
    // 行の牌は b の打牌(南)、a の打牌(東)の順
    expect(
      [...html.matchAll(/aria-label="([^"]+)を切る場合"/g)].map(m => m[1])
    ).toEqual(['南', '東']);
    // 900 の候補(b)が先頭
    expect(html.indexOf('900')).toBeLessThan(html.indexOf('>100<'));
    // a(元の位置0)を選ぶと a の行が pressed
    const p = view({ run: done([a, b]) });
    const html2 = render({ ...p, result: { ...p.result, selectedIndex: 0 } });
    const rows2 = [...html2.matchAll(/aria-pressed="(true|false)"/g)].map(
      m => m[1]
    );
    expect(rows2).toEqual(['false', 'true']);
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

  it('前提: 風は常に牌で2枚、ドラ表示牌・抜き北は入力があるときだけ出す(文字ラベルなし)', () => {
    const empty = render(view());
    expect(empty).toContain('data-premise="winds"');
    expect(empty).not.toContain('data-premise="dora"');
    expect(empty).not.toContain('data-premise="nuki"');
    const html = render(
      view({
        premise: {
          dora: [
            { type: 'p', n: 3 },
            { type: 'z', n: 5 }
          ],
          nuki: 2,
          round: 'south',
          seat: 'west'
        }
      })
    );
    expect(html).toContain('場風 南、自風 西');
    expect(html).toContain('data-premise="dora"');
    expect(html).toContain('aria-label="3筒"');
    expect(html).toContain('data-premise="nuki"');
    expect(html).toContain('×2');
    // 裏ドラは出さない
    expect(html).not.toContain('裏ドラ');
  });
});
