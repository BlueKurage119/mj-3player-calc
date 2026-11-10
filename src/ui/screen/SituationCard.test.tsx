import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SituationCardContent } from './SituationCard';

describe('SituationCard (D5)', () => {
  it('D5-C14: 描画テスト: 状況役カードのラベル結合、空表示、選択状態と属性検証', () => {
    // 1. ラベルあり、selected=true
    const htmlSelected = renderToStaticMarkup(
      <SituationCardContent
        labels={['立直', '一発', '海底/河底']}
        selected={true}
        onSelect={() => {}}
      />
    );

    // 理由: 外枠に situation-card--selected クラスが付与されることを検証するため
    expect(htmlSelected.includes('situation-card--selected')).toBe(true);
    // 理由: ラベルが「・」で連結されて表示されることを検証するため
    expect(htmlSelected.includes('立直・一発・海底/河底')).toBe(true);
    // 理由: data-sheet-opener が付与されないことを検証するため
    expect(htmlSelected.includes('data-sheet-opener')).toBe(false);
    // 理由: 見出し「状況役」が表示されることを検証するため
    expect(htmlSelected.includes('situation-card__title">状況役<')).toBe(true);
    // 理由: role="button" が付与されることを検証するため
    expect(htmlSelected.includes('role="button"')).toBe(true);
    // 理由: aria-label="状況役を入力" が付与されることを検証するため
    expect(htmlSelected.includes('aria-label="状況役を入力"')).toBe(true);

    // 2. ラベルなし(空)、selected=false
    const htmlEmpty = renderToStaticMarkup(
      <SituationCardContent labels={[]} selected={false} onSelect={() => {}} />
    );

    // 理由: selected=false で situation-card--selected クラスが付かないことを検証するため
    expect(htmlEmpty.includes('situation-card--selected')).toBe(false);
    // 理由: 空のときに「なし」が表示されることを検証するため
    expect(htmlEmpty.includes('situation-card__empty">なし<')).toBe(true);
  });

  it('D5-C16-card: 状況役カードに抜き北に関する案内文が無い', () => {
    const html = renderToStaticMarkup(
      <SituationCardContent
        labels={['立直']}
        selected={false}
        onSelect={() => {}}
      />
    );

    // 理由: 抜き北や槍槓に関する不要な案内文が含まれないことを検証するため
    expect(html.includes('抜き北')).toBe(false);
    // 理由: 槍槓に関する案内文が含まれないことを検証するため
    expect(html.includes('槍槓を選ばない')).toBe(false);
  });
});
