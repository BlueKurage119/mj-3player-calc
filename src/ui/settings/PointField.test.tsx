import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { NumberRuleItem } from '../../core/rule-items';
import { PointField } from './PointField';

describe('D6-PointField (§4.5)', () => {
  const honbaItem: NumberRuleItem = {
    key: 'honbaPoint',
    kind: 'number',
    label: '本場',
    min: 0,
    max: 10000,
    step: 200,
    unit: '点',
    defaultValue: 200
  };

  it('D6-PointField-min-disabled: value=min のとき − ボタンが disabled になる', () => {
    const html = renderToStaticMarkup(
      <PointField item={honbaItem} value={0} onCommit={() => {}} />
    );

    // 理由: role="group" と aria-label が正しく設定されていることを検証するため
    expect(html.includes('role="group"')).toBe(true);
    expect(html.includes('aria-label="本場"')).toBe(true);

    // 理由: value=min (0) のとき「本場を減らす」ボタンが disabled であることを検証するため
    expect(
      html.includes('aria-label="本場を減らす" disabled=""') ||
        html.includes('disabled="" aria-label="本場を減らす"')
    ).toBe(true);

    // 理由: value=min のとき「本場を増やす」ボタンは disabled でないことを検証するため
    expect(html.includes('aria-label="本場を増やす" disabled=""')).toBe(false);

    // 理由: inputmode="numeric" (または React 描画時の inputMode="numeric") が設定されていることを検証するため
    expect(
      html.includes('inputmode="numeric"') ||
        html.includes('inputMode="numeric"')
    ).toBe(true);

    // 理由: 単位「点」が aria-hidden="true" で出力されることを検証するため
    expect(html.includes('aria-hidden="true">点</span>')).toBe(true);
  });

  it('D6-PointField-max-disabled: value=max のとき + ボタンが disabled になる', () => {
    const html = renderToStaticMarkup(
      <PointField item={honbaItem} value={10000} onCommit={() => {}} />
    );

    // 理由: value=max (10000) のとき「本場を増やす」ボタンが disabled であることを検証するため
    expect(
      html.includes('aria-label="本場を増やす" disabled=""') ||
        html.includes('disabled="" aria-label="本場を増やす"')
    ).toBe(true);

    // 理由: value=max のとき「本場を減らす」ボタンは disabled でないことを検証するため
    expect(html.includes('aria-label="本場を減らす" disabled=""')).toBe(false);
  });

  it('D6-PointField-middle-enabled: 中間値のとき − も + も disabled でない', () => {
    const html = renderToStaticMarkup(
      <PointField item={honbaItem} value={200} onCommit={() => {}} />
    );

    // 理由: 中間値 (200) のとき両ボタンとも disabled でないことを検証するため
    expect(html.includes('disabled=""')).toBe(false);
  });
});
