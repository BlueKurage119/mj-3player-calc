import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Tile } from './Tile';

const tile = { type: 's', n: 1 } as const;

describe('Tile の aria-pressed(Issue #89 Codex 指摘)', () => {
  it('F1-1-T1: selected 未指定の button は aria-pressed を出さない', () => {
    const html = renderToStaticMarkup(<Tile tile={tile} onClick={() => {}} />);
    expect(html.includes('<button')).toBe(true);
    // 理由: トグルでないボタンがトグルとして支援技術に伝わらないことを検証するため
    expect(html.includes('aria-pressed')).toBe(false);
  });

  it('F1-1-T2: selected を明示した button は aria-pressed を出す(true / false)', () => {
    const on = renderToStaticMarkup(
      <Tile tile={tile} selected={true} onClick={() => {}} />
    );
    const off = renderToStaticMarkup(
      <Tile tile={tile} selected={false} onClick={() => {}} />
    );
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain('tile--selected');
    expect(off).toContain('aria-pressed="false"');
    expect(off.includes('tile--selected')).toBe(false);
  });

  it('F1-1-T3: onClick なし(非ボタン)は aria-pressed を出さない', () => {
    const html = renderToStaticMarkup(<Tile tile={tile} selected={true} />);
    expect(html.includes('aria-pressed')).toBe(false);
  });
});
