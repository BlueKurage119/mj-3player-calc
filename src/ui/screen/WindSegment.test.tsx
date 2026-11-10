import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WindSegmentContent } from './WindSegment';

describe('WindSegment (D5)', () => {
  it('D5-C9-static: 風セグメントの静的構造 (場風・自風見出し、aria-label、東南西選択肢)', () => {
    const html = renderToStaticMarkup(
      <WindSegmentContent
        round="east"
        seat="south"
        onRoundChange={() => {}}
        onSeatChange={() => {}}
      />
    );

    // 理由: 見出し「場風」が aria-hidden="true" で含まれることを検証するため
    expect(
      html.includes('class="wind-segment__label" aria-hidden="true">場風<')
    ).toBe(true);

    // 理由: 見出し「自風」が aria-hidden="true" で含まれることを検証するため
    expect(
      html.includes('class="wind-segment__label" aria-hidden="true">自風<')
    ).toBe(true);

    // 理由: radiogroup の aria-label="場風" が付与されることを検証するため
    expect(html.includes('role="radiogroup" aria-label="場風"')).toBe(true);
    // 理由: radiogroup の aria-label="自風" が付与されることを検証するため
    expect(html.includes('role="radiogroup" aria-label="自風"')).toBe(true);

    // 理由: 各風の選択肢(東・南・西)が含まれることを検証するため
    expect(html.includes('>東<')).toBe(true);
    expect(html.includes('>南<')).toBe(true);
    expect(html.includes('>西<')).toBe(true);
  });
});
