import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SYMBOL_DISABLED_BY_DEFAULT } from '../icons';
import { CardClearButton } from './CardClearButton';

const OLD_TRASH_PATH_HEAD = 'M6 19c0 1.1.9 2 2 2h8';

describe('D4: ゴミ箱アイコンの統一 (確定事項 14, 2.7, C14d)', () => {
  it('D4-ICON1: CardClearButton は disabled_by_default のパスを 20dp で描画する', () => {
    const html = renderToStaticMarkup(
      <CardClearButton aria-label="x" onClear={() => {}} />
    );
    // 理由: パス全体が完全一致で埋め込まれることを検証するため
    expect(html.includes(`d="${SYMBOL_DISABLED_BY_DEFAULT}"`)).toBe(true);
    expect(html.includes('width="1.25rem"')).toBe(true);
    expect(html.includes(OLD_TRASH_PATH_HEAD)).toBe(false);
  });

  it('D4-ICON2: HandCard のソースに旧ゴミ箱パスが残らず新アイコンを使う', () => {
    const src = readFileSync(
      new URL('./HandCard.tsx', import.meta.url),
      'utf8'
    );
    expect(src.includes(OLD_TRASH_PATH_HEAD)).toBe(false);
    expect(src.includes('SYMBOL_DISABLED_BY_DEFAULT')).toBe(true);
  });

  it('D4-ICON3: ドラ・裏ドラの牌幅は 20px 固定', () => {
    const css = readFileSync(
      new URL('./main-screen.css', import.meta.url),
      'utf8'
    );
    const block = css.match(/\.indicator-card__tiles \{[^}]*\}/)?.[0] ?? '';
    expect(block.includes('--tile-width: 1.25rem;')).toBe(true);
  });
});
