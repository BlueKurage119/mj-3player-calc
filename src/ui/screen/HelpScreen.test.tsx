import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import pkg from '../../../package.json';
import { RULE_ITEMS, type RuleItem } from '../../core/rule-items';
import { TSUMO_LOSS_DESCRIPTIONS } from '../settings/rule-help';
import { HelpView } from './HelpScreen';

const renderHelpHtml = (): string =>
  renderToStaticMarkup(<HelpView onBack={() => {}} onOpenLicense={() => {}} />);

describe('G4: ヘルプ画面 (HelpView)', () => {
  it('G4-T3: 4つの Disclosure summary が設計書 3.3 の見出しの順に出現する', () => {
    const html = renderHelpHtml();
    const expectedSummaries = [
      '結果の見方',
      '入力のしかた',
      '三麻のルール上の注意',
      '点数計算表・共有画像'
    ];

    const indices = expectedSummaries.map(title =>
      html.indexOf(`<span class="disclosure__summary-text">${title}</span>`)
    );

    expect(indices[0]).toBeGreaterThan(-1);
    expect(indices[1]).toBeGreaterThan(indices[0] ?? -1);
    expect(indices[2]).toBeGreaterThan(indices[1] ?? -1);
    expect(indices[3]).toBeGreaterThan(indices[2] ?? -1);
  });

  it('G4-T4: 各節の1文目・キーボード表のキー表記・末尾のライセンスボタンが含まれる', () => {
    const html = renderHelpHtml();
    const expectedTexts = [
      '入力中の手牌に応じて、結果の表示が切り替わります。',
      '手牌・ドラ・裏ドラ・副露のカードをタップすると、画面の下に入力パネルが開きます。',
      '三人麻雀では、萬子は 1萬と9萬だけを使います(全108枚)。',
      'メニューの「点数計算表」で、符・飜ごとのロンとツモの点数を確認できます。',
      'Backspace',
      'Enter',
      'ライセンス'
    ];

    for (const text of expectedTexts) {
      // 理由: 設計書 3.6 G4-T4 の定めにより、HTML 全体との完全一致は脆いため、各要素の文字列が含まれることを部分一致で検証する
      expect(html.includes(text)).toBe(true);
    }
  });

  it('G4-T5: RULE_ITEMS の設定ラベルと TSUMO_LOSS_DESCRIPTIONS の説明がそのまま含まれる', () => {
    const html = renderHelpHtml();
    const targetRuleKeys: readonly RuleItem['key'][] = [
      'tsumoLoss',
      'north',
      'localYaku',
      'openRiichi'
    ];

    for (const key of targetRuleKeys) {
      const label = RULE_ITEMS.find(item => item.key === key)?.label;
      expect(label).toBeDefined();
      // 理由: 設計書 3.6 G4-T5 の定めにより、HTML 全体との完全一致は脆いため、設定ラベルがそのまま含まれることを部分一致で検証する
      expect(html.includes(label ?? '')).toBe(true);
    }

    for (const description of Object.values(TSUMO_LOSS_DESCRIPTIONS)) {
      // 理由: 設計書 3.6 G4-T5 の定めにより、HTML 全体との完全一致は脆いため、ツモ損の3方式の説明がそのまま含まれることを部分一致で検証する
      expect(html.includes(description)).toBe(true);
    }
  });
});

describe('G3: バージョン表示 (G3-T1〜T3)', () => {
  it('G3-T1: renderHelpHtml() が「バージョン 2.0.0-dev」を含む', () => {
    const html = renderHelpHtml();
    const match = html.match(/<p class="help-screen__version">([^<]+)<\/p>/);
    expect(match?.[1]).toBe('バージョン 2.0.0-dev');
  });

  it('G3-T2: 表示の版番号が package.json の version と一致する', () => {
    const html = renderHelpHtml();
    const match = html.match(/<p class="help-screen__version">([^<]+)<\/p>/);
    expect(match?.[1]).toBe(`バージョン ${pkg.version}`);
  });

  it('G3-T3: バージョンの出現位置がライセンスボタンより後ろである', () => {
    const html = renderHelpHtml();
    const licenseIndex = html.indexOf('ライセンス');
    const versionIndex = html.indexOf('バージョン');

    expect(licenseIndex).toBeGreaterThan(-1);
    expect(versionIndex).toBeGreaterThan(licenseIndex);
  });
});

describe('Issue #139 U-11: ヘルプの「確率・期待値」の節', () => {
  const sectionOf = (html: string): string => {
    const i = html.indexOf('id="help-engine"');
    expect(i).toBeGreaterThan(-1);
    return html.slice(i, html.indexOf('ライセンス', i));
  };

  it('focus="engine" のとき、節の本文が開いた状態で見える(hidden が付かない)', () => {
    const html = renderToStaticMarkup(
      <HelpView onBack={() => {}} onOpenLicense={() => {}} focus="engine" />
    );
    const section = sectionOf(html);
    expect(section).toContain('aria-expanded="true"');
    expect(section).not.toContain('hidden=""');
    expect(section).toContain('一人麻雀');
    expect(section).toContain('裏ドラは牌が決まらない');
  });

  it('直接開いたとき(focus 指定なし)は既存の節と同じく閉じている', () => {
    const html = renderToStaticMarkup(
      <HelpView onBack={() => {}} onOpenLicense={() => {}} />
    );
    const section = sectionOf(html);
    expect(section).toContain('aria-expanded="false"');
    expect(section).toContain('hidden=""');
  });
});
