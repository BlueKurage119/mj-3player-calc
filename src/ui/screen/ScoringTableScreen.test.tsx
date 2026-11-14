import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import { ScoringTableView } from './ScoringTableScreen';

const defaultRule = () => {
  const rule = createDefaultRule();
  return {
    tsumoLoss: rule.tsumoLoss,
    roundedMangan: rule.roundedMangan,
    accumlatedYakuman: rule.accumlatedYakuman,
    doubleWindFu: rule.doubleWindFu
  };
};

const extractRadioStates = (html: string) => {
  const matches = [
    ...html.matchAll(
      /<button[^>]*role="radio"[^>]*aria-checked="(true|false)"[^>]*>[\s\S]*?<span>([^<]+)<\/span><\/button>/g
    )
  ];
  return matches.map(m => ({ label: m[2] ?? '', checked: m[1] === 'true' }));
};

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
    expect(extractRadioStates(eastHtml)).toEqual([
      { label: '親', checked: true },
      { label: '子', checked: false }
    ]);

    const southHtml = renderToStaticMarkup(
      <ScoringTableView seat="south" rule={defaultRule()} onBack={() => {}} />
    );
    expect(extractRadioStates(southHtml)).toEqual([
      { label: '親', checked: false },
      { label: '子', checked: true }
    ]);

    const overrideChildHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="east"
        rule={defaultRule()}
        initialDealer={false}
        onBack={() => {}}
      />
    );
    expect(extractRadioStates(overrideChildHtml)).toEqual([
      { label: '親', checked: false },
      { label: '子', checked: true }
    ]);

    const overrideDealerHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="south"
        rule={defaultRule()}
        initialDealer={true}
        onBack={() => {}}
      />
    );
    expect(extractRadioStates(overrideDealerHtml)).toEqual([
      { label: '親', checked: true },
      { label: '子', checked: false }
    ]);
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
});
