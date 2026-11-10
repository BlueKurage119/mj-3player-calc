import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Table } from '../../core/table';
import { SummaryStatusRow } from './SummaryCard';

describe('SummaryCard (D5)', () => {
  it('D5-C15: SummaryStatusRow の静的描画 (風、積み棒、供託、0表示、状況役なし)', () => {
    const table0: Table = {
      round: 'east',
      seat: 'east',
      continue: 0,
      deposit: 0
    };

    const html0 = renderToStaticMarkup(<SummaryStatusRow table={table0} />);

    // 理由: 風の表示「東場・東家」が含まれることを検証するため
    expect(html0.includes('summary-card__winds">東場・東家<')).toBe(true);

    // 理由: 積み棒 0 の aria-label が付与されることを検証するため
    expect(html0.includes('role="img" aria-label="積み棒 0"')).toBe(true);
    // 理由: 供託 0 の aria-label が付与されることを検証するため
    expect(html0.includes('role="img" aria-label="供託 0"')).toBe(true);

    // 理由: 状況役の文言(例: 立直、一発等)が要約1行目に含まれないことを検証するため
    expect(html0.includes('立直')).toBe(false);
    // 理由: 状況役なしの文言が含まれないことを検証するため
    expect(html0.includes('状況役')).toBe(false);

    // 値が 2, 3 の場合
    const table23: Table = {
      round: 'south',
      seat: 'west',
      continue: 2,
      deposit: 3
    };
    const html23 = renderToStaticMarkup(<SummaryStatusRow table={table23} />);

    // 理由: 南場・西家が表示されることを検証するため
    expect(html23.includes('summary-card__winds">南場・西家<')).toBe(true);
    // 理由: 積み棒 2 が表示されることを検証するため
    expect(html23.includes('role="img" aria-label="積み棒 2"')).toBe(true);
    // 理由: 供託 3 が表示されることを検証するため
    expect(html23.includes('role="img" aria-label="供託 3"')).toBe(true);
  });

  it('D5-C16-summary: 要約カードに抜き北に関する案内文が無い', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 0,
      deposit: 0
    };
    const html = renderToStaticMarkup(<SummaryStatusRow table={table} />);
    // 理由: 抜き北に関する説明文が含まれないことを検証するため
    expect(html.includes('抜き北')).toBe(false);
  });

  it('D5-summary-nuki: 抜き北の枚数を「北 n」で表示し、undefined なら表示しない', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 0,
      deposit: 0
    };
    const html = renderToStaticMarkup(
      <SummaryStatusRow table={table} nuki={2} />
    );
    // 理由: 抜き北の枚数がアイコンなしの「北 2」で出ることを検証するため
    expect(html.includes('role="img" aria-label="抜き北 2"')).toBe(true);
    expect(html.includes('北 2')).toBe(true);

    const htmlNone = renderToStaticMarkup(<SummaryStatusRow table={table} />);
    // 理由: 抜き北なしのルールでは表示されないことを検証するため
    expect(htmlNone.includes('抜き北')).toBe(false);
  });
});
