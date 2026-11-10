import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import { HelpTooltipScope } from './HelpTooltip';
import { RuleSection } from './RuleSection';

describe('D6-RuleSection (§4.1〜§4.3)', () => {
  const defaultRule = createDefaultRule();

  it('D6-RuleSection-basic-and-preset: 基本5項目とプリセット行の初期表示 (段位戦ルール・ボタンdisabled)', () => {
    const html = renderToStaticMarkup(
      <HelpTooltipScope>
        <RuleSection
          rule={defaultRule}
          initialOpen={false}
          onResetToRanked={() => {}}
          onRuleValueChange={() => {}}
        />
      </HelpTooltipScope>
    );

    // 理由: プリセット行に「段位戦ルール」が表示されることを検証するため
    expect(html.includes('段位戦ルール')).toBe(true);

    // 理由: 「段位戦ルールに戻す」ボタンが disabled であることを検証するため
    expect(
      html.includes('disabled=""') && html.includes('段位戦ルールに戻す')
    ).toBe(true);

    // 理由: 基本5項目のラベルが含まれることを検証するため
    expect(html.includes('aria-label="赤ドラ"')).toBe(true);
    expect(html.includes('喰い断')).toBe(true);
    expect(html.includes('一発')).toBe(true);
    expect(html.includes('aria-label="北の扱い"')).toBe(true);
    expect(html.includes('ツモ損')).toBe(true);

    // 理由: 既定値(変更なし)の場合、詳細設定の副テキストが出力されないことを検証するため
    expect(html.includes('settings-accordion__summary-subtext')).toBe(false);
  });

  it('D6-RuleSection-custom-preset: ルール変更時にカスタム表示になり戻すボタンが有効になる', () => {
    const customRule = { ...defaultRule, kuitan: false };
    const html = renderToStaticMarkup(
      <HelpTooltipScope>
        <RuleSection
          rule={customRule}
          initialOpen={false}
          onResetToRanked={() => {}}
          onRuleValueChange={() => {}}
        />
      </HelpTooltipScope>
    );

    // 理由: 「カスタム」が表示されることを検証するため
    expect(html.includes('カスタム')).toBe(true);

    // 理由: 「段位戦ルールに戻す」ボタンが disabled でないことを検証するため
    const resetBtnWithDisabled =
      html.includes('disabled=""') &&
      html.includes('settings-preset-row__reset-btn');
    expect(resetBtnWithDisabled).toBe(false);
  });

  it('D6-RuleSection-summary-subtext: 閉時の副テキストの出し分け (変更2件・5件)', () => {
    // 2件変更: honbaPoint, accumlatedYakuman
    const rule2 = {
      ...defaultRule,
      honbaPoint: 400,
      accumlatedYakuman: false
    };
    const html2 = renderToStaticMarkup(
      <HelpTooltipScope>
        <RuleSection
          rule={rule2}
          initialOpen={false}
          onResetToRanked={() => {}}
          onRuleValueChange={() => {}}
        />
      </HelpTooltipScope>
    );
    // 理由: 2件変更時に「積み棒・数え役満」が副テキストとして表示されることを検証するため
    expect(html2.includes('積み棒・数え役満')).toBe(true);

    // 5件変更: honbaPoint, depositPoint, accumlatedYakuman, multipleYakuman, openRiichi
    const rule5 = {
      ...defaultRule,
      honbaPoint: 400,
      depositPoint: 2000,
      accumlatedYakuman: false,
      multipleYakuman: false,
      openRiichi: true
    };
    const html5 = renderToStaticMarkup(
      <HelpTooltipScope>
        <RuleSection
          rule={rule5}
          initialOpen={false}
          onResetToRanked={() => {}}
          onRuleValueChange={() => {}}
        />
      </HelpTooltipScope>
    );
    // 理由: 5件変更時に「積み棒・供託・数え役満ほか2件」が副テキストとして表示されることを検証するため
    expect(html5.includes('積み棒・供託・数え役満ほか2件')).toBe(true);
  });

  it('D6-RuleSection-open-accordion: 開時にダブル役満の子見出し・補足・4項目およびhelpが7項目のみ出力される', () => {
    const html = renderToStaticMarkup(
      <HelpTooltipScope>
        <RuleSection
          rule={defaultRule}
          initialOpen={true}
          onResetToRanked={() => {}}
          onRuleValueChange={() => {}}
        />
      </HelpTooltipScope>
    );

    // 理由: アコーディオン開時には副テキストが表示されないことを検証するため
    expect(html.includes('settings-accordion__summary-subtext')).toBe(false);

    // 理由: ダブル役満の子セクション見出しと補足が表示されることを検証するため
    expect(html.includes('ダブル役満</h4>')).toBe(true);
    expect(html.includes('オフのときはシングル役満</p>')).toBe(true);

    // 理由: ダブル役満4項目が短いラベルで表示されることを検証するため
    expect(html.includes('国士無双十三面待ち')).toBe(true);
    expect(html.includes('四暗刻単騎')).toBe(true);
    expect(html.includes('大四喜')).toBe(true);
    expect(html.includes('純正九蓮宝燈')).toBe(true);

    // 理由: help ツールチップが仕様の8項目 (赤ドラ・北の扱い・積み棒・供託・切り上げ満貫・役満の複合・オープン立直・ローカル役) のみ出力されることを検証するため
    const helpMatches = html.match(/id="help-[^"]+"/g) ?? [];
    expect(helpMatches).toHaveLength(8);
    expect(html.includes('id="help-tsumoLoss"')).toBe(false);
    expect(html.includes('id="help-north"')).toBe(true);
    expect(html.includes('id="help-localYaku"')).toBe(true);
    expect(html.includes('id="help-openRiichi"')).toBe(true);
    expect(html.includes('id="help-roundedMangan"')).toBe(true);
    expect(html.includes('id="help-multipleYakuman"')).toBe(true);
    expect(html.includes('id="help-honbaPoint"')).toBe(true);
    expect(html.includes('id="help-depositPoint"')).toBe(true);
    expect(html.includes('id="help-red"')).toBe(true);

    // 理由: 連風牌の雀頭には help が無いことを検証するため
    expect(html.includes('id="help-doubleWindFu"')).toBe(false);
  });

  it('D6-RuleSection-choice-buttons: 赤ドラ・北の扱い・連風牌の雀頭はボタン群、ツモ損は現在値つきのダイアログ行で出力される', () => {
    const html = renderToStaticMarkup(
      <HelpTooltipScope>
        <RuleSection
          rule={{ ...defaultRule, tsumoLoss: 'north-split' }}
          initialOpen={true}
          onResetToRanked={() => {}}
          onRuleValueChange={() => {}}
        />
      </HelpTooltipScope>
    );

    // 理由: Select をやめ、選択肢が ConnectedButtonGroup (radiogroup) で出力されることを検証するため
    expect(html.includes('<md-outlined-select')).toBe(false);
    for (const label of ['赤ドラ', '北の扱い', '連風牌の雀頭']) {
      expect(html.includes(`role="radiogroup" aria-label="${label}"`)).toBe(
        true
      );
    }
    expect(html.includes('>赤なし<')).toBe(true);
    expect(html.includes('>抜きドラ<')).toBe(true);
    expect(html.includes('>4符<')).toBe(true);

    // 理由: ツモ損は行全体のボタンで、現在値と aria-haspopup="dialog" を持つことを検証するため
    expect(html.includes('aria-haspopup="dialog"')).toBe(true);
    expect(html.includes('settings-row__value"><span>北家分折半</span>')).toBe(
      true
    );
    // 理由: ツモ損のラジオ群 (ダイアログ内) が説明つきで3選択肢出力されることを検証するため
    expect(html.includes('role="radiogroup" aria-label="ツモ損"')).toBe(true);
    expect(html.match(/<md-radio /g) ?? []).toHaveLength(3);
    expect(
      html.includes('北家の負担額を、ツモられた2人で折半して上乗せする')
    ).toBe(true);
  });

  it('D6-RuleSection-accordion-hidden: 閉のとき詳細領域に hidden が付き aria-expanded=false、開のとき付かず true', () => {
    const render = (initialOpen: boolean) =>
      renderToStaticMarkup(
        <HelpTooltipScope>
          <RuleSection
            rule={defaultRule}
            initialOpen={initialOpen}
            onResetToRanked={() => {}}
            onRuleValueChange={() => {}}
          />
        </HelpTooltipScope>
      );
    const region = (html: string) =>
      html.match(/<div[^>]*settings-accordion__content[^>]*>/)?.[0] ?? '';

    const closed = render(false);
    expect(/\shidden=""/.test(region(closed))).toBe(true);
    expect(closed.includes('aria-expanded="false"')).toBe(true);

    const opened = render(true);
    expect(/\shidden=""/.test(region(opened))).toBe(false);
    expect(opened.includes('aria-expanded="true"')).toBe(true);
  });

  it('D6-RuleSection-accordion-css: display を指定する .settings-accordion__content が [hidden] で非表示に上書きされる', () => {
    const css = readFileSync(
      new URL('./settings.css', import.meta.url),
      'utf8'
    );
    // 理由: hidden 属性が display:flex に負けて閉じても表示され続ける不具合を検知するため
    expect(
      /\.settings-accordion__content\[hidden\]\s*\{[^}]*display:\s*none/.test(
        css
      )
    ).toBe(true);
  });
});
