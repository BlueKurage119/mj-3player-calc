import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import { createInitialState } from '../state';
import { MeldKindBarContent, getMeldKindOptions } from './MeldKindBar';

describe('D4: 副露種類バーの構造と選択肢 (2.3, C11, C12)', () => {
  it('D4-MKB1: MeldKindBarContent の選択状態とラジオグループ構造 (renderToStaticMarkup)', () => {
    const options = [
      { value: 'pon' as const, label: 'ポン', disabled: false },
      { value: 'minkan' as const, label: '明槓', disabled: false },
      { value: 'ankan' as const, label: '暗槓', disabled: false }
    ];

    const html = renderToStaticMarkup(
      <MeldKindBarContent
        kind="pon"
        options={options}
        onValueChange={() => {}}
      />
    );

    // role="radiogroup" aria-label="副露の種類" が存在すること
    expect(html.includes('role="radiogroup"')).toBe(true);
    expect(html.includes('aria-label="副露の種類"')).toBe(true);

    // 選択肢「ポン」「明槓」「暗槓」が含まれること
    expect(html.includes('ポン')).toBe(true);
    expect(html.includes('明槓')).toBe(true);
    expect(html.includes('暗槓')).toBe(true);

    // ポンが選択中 (aria-checked="true") であること
    expect(html.includes('aria-checked="true"') && html.includes('ポン')).toBe(
      true
    );
  });

  it('D4-MKB2: getMeldKindOptions による判定ロジックと disabled 属性の反映', () => {
    const base = createInitialState(createDefaultRule());
    const tile1p = { type: 'p' as const, n: 1 as const };

    // 手牌に 1p が 1 枚、副露 0 にポン 1p (計 4 枚使用中)
    const stateWith1pHand = {
      ...base,
      input: {
        ...base.input,
        hand: [tile1p],
        melds: [{ type: 'pon' as const, tile: tile1p }]
      }
    };

    const options = getMeldKindOptions(stateWith1pHand, 0);
    expect(options).not.toBeNull();
    expect(options).toEqual([
      { value: 'pon', label: 'ポン', disabled: false },
      { value: 'minkan', label: '明槓', disabled: true },
      { value: 'ankan', label: '暗槓', disabled: true }
    ]);

    // disabled な options を渡したときの HTML 構造の検証
    const html = renderToStaticMarkup(
      <MeldKindBarContent
        kind="pon"
        options={options ?? []}
        onValueChange={() => {}}
      />
    );

    // ポンは disabled でないこと
    const ponMatch = html.match(
      /<button[^>]*role="radio"[^>]*>[\s\S]*?<span>ポン<\/span>[\s\S]*?<\/button>/
    );
    expect(ponMatch).not.toBeNull();
    const ponTag = ponMatch?.[0] ?? '';
    // 理由: ポンボタンに disabled 属性が含まれないことを検証するため
    expect(ponTag.includes('disabled')).toBe(false);

    // 明槓・暗槓は disabled であること
    const minkanMatch = html.match(
      /<button[^>]*role="radio"[^>]*>[\s\S]*?<span>明槓<\/span>[\s\S]*?<\/button>/
    );
    expect(minkanMatch).not.toBeNull();
    const minkanTag = minkanMatch?.[0] ?? '';
    // 理由: 明槓ボタンに disabled 属性が含まれることを検証するため
    expect(minkanTag.includes('disabled')).toBe(true);

    const ankanMatch = html.match(
      /<button[^>]*role="radio"[^>]*>[\s\S]*?<span>暗槓<\/span>[\s\S]*?<\/button>/
    );
    expect(ankanMatch).not.toBeNull();
    const ankanTag = ankanMatch?.[0] ?? '';
    // 理由: 暗槓ボタンに disabled 属性が含まれることを検証するため
    expect(ankanTag.includes('disabled')).toBe(true);
  });
});
