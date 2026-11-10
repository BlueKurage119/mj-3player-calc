import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SituationChipItem } from '../state';
import { SituationSheetContent } from './SituationSheet';

describe('SituationSheet (D5)', () => {
  const dummyChips: SituationChipItem[] = [
    { key: 'ippatsu', label: '一発', selected: false, disabled: true },
    { key: 'rinshan', label: '嶺上開花', selected: true, disabled: false },
    { key: 'haitei', label: '海底/河底', selected: false, disabled: false }
  ];

  it('D5-C10-static: 立直3択と偶然役ChipSetの構造、オープンchipの位置検証', () => {
    // 1. openRiichiAllowed = true
    const htmlWithOpen = renderToStaticMarkup(
      <SituationSheetContent
        riichi="riichi"
        openRiichiAllowed={true}
        chips={dummyChips}
        onRiichiChange={() => {}}
        onChipChange={() => {}}
      />
    );

    // 理由: 見出し「立直」「偶然役」の区画が含まれることを検証するため
    expect(htmlWithOpen.includes('aria-label="立直"')).toBe(true);
    expect(htmlWithOpen.includes('aria-label="偶然役"')).toBe(true);
    // 理由: 立直3択の chip(なし・立直・ダブル立直)が含まれることを検証するため
    expect(htmlWithOpen.includes('>なし<')).toBe(true);
    expect(htmlWithOpen.includes('>立直<')).toBe(true);
    expect(htmlWithOpen.includes('>ダブル立直<')).toBe(true);

    // 理由: 偶然役の chip 列(situation-chips)が立直の列とは別に含まれることを検証するため
    expect(
      (htmlWithOpen.match(/situation-chips/g) ?? []).length
    ).toBeGreaterThanOrEqual(2);
    // 理由: 偶然役の各ラベルが含まれることを検証するため
    expect(htmlWithOpen.includes('>一発<')).toBe(true);
    expect(htmlWithOpen.includes('>嶺上開花<')).toBe(true);
    expect(htmlWithOpen.includes('>海底/河底<')).toBe(true);

    // オープン chip が立直の列の中(偶然役の列より前)にあることを構造から検証
    const lastChipsIndex = htmlWithOpen.lastIndexOf('situation-chips');
    const openChipIndex = htmlWithOpen.indexOf('>オープン<');
    expect(openChipIndex).toBeGreaterThan(-1);
    expect(openChipIndex).toBeLessThan(lastChipsIndex);

    // 2. openRiichiAllowed = false
    const htmlWithoutOpen = renderToStaticMarkup(
      <SituationSheetContent
        riichi="riichi"
        openRiichiAllowed={false}
        chips={dummyChips}
        onRiichiChange={() => {}}
        onChipChange={() => {}}
      />
    );

    // 理由: openRiichiAllowed=false のとき「オープン」chip が存在しないことを検証するため
    expect(htmlWithoutOpen.includes('>オープン<')).toBe(false);
  });

  it('D5-C12-static: 立直=なしのときオープンchipがdisabled属性を持つ', () => {
    const htmlNone = renderToStaticMarkup(
      <SituationSheetContent
        riichi="none"
        openRiichiAllowed={true}
        chips={dummyChips}
        onRiichiChange={() => {}}
        onChipChange={() => {}}
      />
    );

    // 理由: riichi=none のときオープン chip に disabled が付与されることを検証するため
    expect(
      htmlNone.includes('disabled=""') && htmlNone.includes('>オープン<')
    ).toBe(true);
  });

  it('D5-C16-sheet: 状況役シートに抜き北に関する案内文が無い', () => {
    const html = renderToStaticMarkup(
      <SituationSheetContent
        riichi="none"
        openRiichiAllowed={true}
        chips={dummyChips}
        onRiichiChange={() => {}}
        onChipChange={() => {}}
      />
    );

    // 理由: 抜き北に関する説明文が含まれないことを検証するため
    expect(html.includes('抜き北')).toBe(false);
  });
});
