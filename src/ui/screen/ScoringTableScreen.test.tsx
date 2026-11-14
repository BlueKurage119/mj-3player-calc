import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import { ScoringTableView, getTsumoLossLabel } from './ScoringTableScreen';

const defaultRule = () => {
  const rule = createDefaultRule();
  return {
    tsumoLoss: rule.tsumoLoss,
    roundedMangan: rule.roundedMangan,
    accumlatedYakuman: rule.accumlatedYakuman,
    doubleWindFu: rule.doubleWindFu
  };
};

/** 親子の切替ボタンの現在値(aria-label から取る) */
const extractDealerState = (html: string): string | undefined =>
  html.match(/aria-label="親子の切替\(現在: (親|子)\)"/)?.[1];

describe('H1: 点数計算表画面 (ScoringTableView)', () => {
  it('H1-20: 題「点数計算表」と戻るボタンが出る', () => {
    const html = renderToStaticMarkup(
      <ScoringTableView seat="east" rule={defaultRule()} onBack={() => {}} />
    );

    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/);
    expect(h1Match?.[1]).toBe('点数計算表');

    const backMatch = html.match(
      /<md-icon-button[^>]*aria-label="([^"]*)"[^>]*>/
    );
    expect(backMatch?.[1]).toBe('戻る');
  });

  it('H1-21: seat が東で「親」、南で「子」が選択状態になり、initialDealer が優先される', () => {
    const eastHtml = renderToStaticMarkup(
      <ScoringTableView seat="east" rule={defaultRule()} onBack={() => {}} />
    );
    expect(extractDealerState(eastHtml)).toBe('親');

    const southHtml = renderToStaticMarkup(
      <ScoringTableView seat="south" rule={defaultRule()} onBack={() => {}} />
    );
    expect(extractDealerState(southHtml)).toBe('子');

    const overrideChildHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="east"
        rule={defaultRule()}
        initialDealer={false}
        onBack={() => {}}
      />
    );
    expect(extractDealerState(overrideChildHtml)).toBe('子');

    const overrideDealerHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="south"
        rule={defaultRule()}
        initialDealer={true}
        onBack={() => {}}
      />
    );
    expect(extractDealerState(overrideDealerHtml)).toBe('親');
  });

  it('H1-22: 本場・供託の文字が描画結果に出ない', () => {
    const html = renderToStaticMarkup(
      <ScoringTableView seat="south" rule={defaultRule()} onBack={() => {}} />
    );

    // 理由: 本 Issue では本場・供託を範囲外としており、画面全体にそれらの文言が一切含まれないことを検証するため
    expect(html.includes('本場')).toBe(false);
    // 理由: 同様に供託に関する文言が一切含まれないことを検証するため
    expect(html.includes('供託')).toBe(false);
  });

  it('H1-23: 描画文字列に # で始まる HEX 色指定が含まれない', () => {
    const html = renderToStaticMarkup(
      <ScoringTableView seat="east" rule={defaultRule()} onBack={() => {}} />
    );

    // 理由: 色指定はすべて MD3 CSS トークンに委ね、HTML 文字列内に HEX リテラルが混入していないことを検証するため
    expect(/#[0-9a-fA-F]{3,8}\b/.test(html)).toBe(false);
  });

  it('H1-25: ツモ損の方式の表示名が出て、設定を変えると切り替わる', () => {
    expect(getTsumoLossLabel('loss')).toBe('ツモ損あり');
    expect(getTsumoLossLabel('north-split')).toBe('北家分折半');
    expect(getTsumoLossLabel('ron-split')).toBe('ロン打点折半');

    for (const [value, label] of [
      ['loss', 'ツモ損あり'],
      ['north-split', '北家分折半'],
      ['ron-split', 'ロン打点折半']
    ] as const) {
      const html = renderToStaticMarkup(
        <ScoringTableView
          seat="east"
          rule={{ ...defaultRule(), tsumoLoss: value }}
          onBack={() => {}}
        />
      );
      expect(html).toContain(
        `<span class="scoring-table-screen__rule-label">${label}</span>`
      );
    }
  });
});
