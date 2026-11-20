import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import { ScoringTableView, getTsumoLossLabel } from './ScoringTableScreen';

const defaultRule = () => {
  const rule = createDefaultRule();
  return {
    tsumoLoss: rule.tsumoLoss,
    honbaPoint: rule.honbaPoint,
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

const extractStepperState = (html: string, label: string) => {
  const fieldsetMatch = html.match(
    new RegExp(
      `<fieldset[^>]*aria-label="${label}"[^>]*>[\\s\\S]*?<\\/fieldset>`
    )
  );
  const block = fieldsetMatch?.[0] ?? '';
  const valueMatch = block.match(/<output[^>]*>([^<]+)<\/output>/);
  const minusMatch = block.match(
    new RegExp(`<button[^>]*aria-label="${label}を減らす"[^>]*>`)
  );
  const plusMatch = block.match(
    new RegExp(`<button[^>]*aria-label="${label}を増やす"[^>]*>`)
  );
  return {
    present: Boolean(fieldsetMatch),
    value: valueMatch?.[1] ?? null,
    minusDisabled: minusMatch
      ? /\bdisabled(?:=""|\b)/.test(minusMatch[0])
      : null,
    plusDisabled: plusMatch ? /\bdisabled(?:=""|\b)/.test(plusMatch[0]) : null
  };
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

  it('H1-22: 供託の文字が描画結果に出ない', () => {
    const html = renderToStaticMarkup(
      <ScoringTableView seat="south" rule={defaultRule()} onBack={() => {}} />
    );

    // 理由: Issue #105 では本場のみを導入し供託は範囲外のため、画面全体に供託の文言が一切含まれないことを検証する
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
      // 理由: 設定画面と同じ計算方式ラベルがヘッダーの専用 span に出力されることを確認するため
      expect(html).toContain(
        `<span class="scoring-table-screen__rule-label" data-tsumo-loss="${value}">${label}</span>`
      );
    }
  });

  it('H1-1-20: 積み棒ステッパーが描画され、初期値・境界値・クランプが正しく反映される', () => {
    const omittedHtml = renderToStaticMarkup(
      <ScoringTableView seat="south" rule={defaultRule()} onBack={() => {}} />
    );
    expect(extractStepperState(omittedHtml, '積み棒')).toEqual({
      present: true,
      value: '0',
      minusDisabled: true,
      plusDisabled: false
    });

    const maxHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="south"
        rule={defaultRule()}
        initialHonba={99}
        onBack={() => {}}
      />
    );
    expect(extractStepperState(maxHtml, '積み棒')).toEqual({
      present: true,
      value: '99',
      minusDisabled: false,
      plusDisabled: true
    });

    const underMinHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="south"
        rule={defaultRule()}
        initialHonba={-1}
        onBack={() => {}}
      />
    );
    expect(extractStepperState(underMinHtml, '積み棒')).toEqual({
      present: true,
      value: '0',
      minusDisabled: true,
      plusDisabled: false
    });

    const overMaxHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="south"
        rule={defaultRule()}
        initialHonba={120}
        onBack={() => {}}
      />
    );
    expect(extractStepperState(overMaxHtml, '積み棒')).toEqual({
      present: true,
      value: '99',
      minusDisabled: false,
      plusDisabled: true
    });
  });

  it('H1-1-21: initialHonba=1 で子・親の本場込み「は」表記が画面に描画される', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)および docs/mahjong-rules.md §3.1・§3.2
    const childHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="south"
        rule={defaultRule()}
        initialHonba={1}
        onBack={() => {}}
      />
    );
    // 理由: SSR HTML 文字列内の該当セル(子30符1飜ロン・ツモおよび5飜ロン)に本場込み表記が出力されることを検証するため
    expect(childHtml).toContain('1,000 は 1,200');
    // 理由: 子30符1飜ツモの本場込み表記が画面 HTML に出力されることを検証するため
    expect(childHtml).toContain('300・500 は 400・600');
    // 理由: 満貫5飜ロンの本場込み表記が画面 HTML に出力されることを検証するため
    expect(childHtml).toContain('8,000 は 8,200');

    const dealerHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="east"
        rule={defaultRule()}
        initialHonba={1}
        onBack={() => {}}
      />
    );
    // 理由: 親30符1飜ツモの本場込み表記(「オール」1回)が画面 HTML に出力されることを検証するため
    expect(dealerHtml).toContain('500 は 600オール');
  });

  it('H1-1-22: initialHonba=0 で「は」表記が含まれず本場0の表記が出る', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)および docs/mahjong-rules.md §3.2
    const childHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="south"
        rule={defaultRule()}
        initialHonba={0}
        onBack={() => {}}
      />
    );
    // 理由: 本場0の画面 HTML 全体に「は」併記が一切含まれないことを検証するため
    expect(childHtml.includes(' は ')).toBe(false);
    // 理由: 子30符1飜ロンの本場0表記が画面 HTML に出力されることを検証するため
    expect(childHtml).toContain('>1,000<');
    // 理由: 子30符1飜ツモの本場0表記が画面 HTML に出力されることを検証するため
    expect(childHtml).toContain('>300・500<');

    const dealerHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="east"
        rule={defaultRule()}
        initialHonba={0}
        onBack={() => {}}
      />
    );
    // 理由: 本場0の親画面 HTML 全体に「は」併記が一切含まれないことを検証するため
    expect(dealerHtml.includes(' は ')).toBe(false);
    // 理由: 親30符1飜ツモの本場0表記が画面 HTML に出力されることを検証するため
    expect(dealerHtml).toContain('>500オール<');
  });

  it('H1-1-23: ツモ損ありとツモ損なし系で計算方式ラベルの強調判別属性が切り替わる', () => {
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
      const match = html.match(
        /<span class="scoring-table-screen__rule-label" data-tsumo-loss="([^"]*)">([^<]*)<\/span>/
      );
      expect(match?.[1]).toBe(value);
      expect(match?.[2]).toBe(label);
    }
  });

  it('H1-1-24: 満貫以上の表に満貫・跳満・倍満・三倍満・役満の名称と飜数ラベルが描画される', () => {
    // 出典: docs/mahjong-rules.md §3.3
    const withYakumanHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="south"
        rule={{ ...defaultRule(), accumlatedYakuman: true }}
        onBack={() => {}}
      />
    );
    const namesWithYakuman = [
      ...withYakumanHtml.matchAll(
        /<span class="scoring-table__limit-name">([^<]*)<\/span><span class="scoring-table__limit-han">([^<]*)<\/span>/g
      )
    ].map(m => ({ name: m[1] ?? '', han: m[2] ?? '' }));
    expect(namesWithYakuman).toEqual([
      { name: '満貫', han: '5飜' },
      { name: '跳満', han: '6〜7飜' },
      { name: '倍満', han: '8〜10飜' },
      { name: '三倍満', han: '11〜12飜' },
      { name: '役満', han: '13飜以上' }
    ]);

    const withoutYakumanHtml = renderToStaticMarkup(
      <ScoringTableView
        seat="south"
        rule={{ ...defaultRule(), accumlatedYakuman: false }}
        onBack={() => {}}
      />
    );
    const namesWithoutYakuman = [
      ...withoutYakumanHtml.matchAll(
        /<span class="scoring-table__limit-name">([^<]*)<\/span><span class="scoring-table__limit-han">([^<]*)<\/span>/g
      )
    ].map(m => ({ name: m[1] ?? '', han: m[2] ?? '' }));
    expect(namesWithoutYakuman).toEqual([
      { name: '満貫', han: '5飜' },
      { name: '跳満', han: '6〜7飜' },
      { name: '倍満', han: '8〜10飜' },
      { name: '三倍満', han: '11飜以上' }
    ]);
  });
});
