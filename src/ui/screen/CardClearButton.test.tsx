import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BottomSheet } from '../expressive/BottomSheet';
import { SYMBOL_CANCEL, SYMBOL_CLOSE } from '../icons';
import { CardClearButton } from './CardClearButton';

const OLD_TRASH_PATH_HEAD = 'M6 19c0 1.1.9 2 2 2h8';

describe('D4: 消すボタンのアイコン (確定事項 19, 2.7, C14d)', () => {
  it('D4-ICON1: CardClearButton は ✕(SYMBOL_CLOSE)のパスを 20dp で描画する', () => {
    const html = renderToStaticMarkup(
      <CardClearButton aria-label="x" onClear={() => {}} />
    );
    // 理由: パス全体が完全一致で埋め込まれることを検証するため
    expect(html.includes(`d="${SYMBOL_CLOSE}"`)).toBe(true);
    expect(html.includes('width="1.25rem"')).toBe(true);
    expect(html.includes(OLD_TRASH_PATH_HEAD)).toBe(false);
    expect(html.includes('card-clear-zone--compact')).toBe(true);
    expect(html.includes('card-clear-button')).toBe(true);

    const htmlHand = renderToStaticMarkup(
      <CardClearButton variant="hand" aria-label="x" onClear={() => {}} />
    );
    expect(htmlHand.includes('card-clear-zone--hand')).toBe(true);
  });

  it('D4-ICON2: HandCard のソースに旧ゴミ箱パスが残らず CardClearButton を使う', () => {
    const src = readFileSync(
      new URL('./HandCard.tsx', import.meta.url),
      'utf8'
    );
    expect(src.includes(OLD_TRASH_PATH_HEAD)).toBe(false);
    expect(src.includes('CardClearButton')).toBe(true);
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

const readSrc = (name: string) =>
  readFileSync(new URL(name, import.meta.url), 'utf8');

describe('D4: UI監修2 (確定事項 17・19・20, C14d・C14f)', () => {
  it('D4-ICON4: SYMBOL_DISABLED_BY_DEFAULT がコードに残らない', () => {
    for (const f of [
      './HandCard.tsx',
      './CardClearButton.tsx',
      '../icons/symbol-paths.ts',
      '../icons/index.ts'
    ]) {
      expect(readSrc(f).includes('SYMBOL_DISABLED_BY_DEFAULT')).toBe(false);
    }
  });

  it('D4-ICON5: SYMBOL_CANCEL は公式 cancel_24px.svg のパスと完全一致し、SYMBOL_CLOSE と異なる', () => {
    // 理由: 公式 SVG の d を書き写した値と完全一致を確かめるため
    expect(SYMBOL_CANCEL).toBe(
      'm336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z'
    );
    expect(SYMBOL_CANCEL).not.toBe(SYMBOL_CLOSE);
  });

  it('D4-ICON6: シートの閉じるボタンは SYMBOL_CANCEL を描画し、BottomSheet.tsx の差分はアイコン定数のみ', () => {
    const html = renderToStaticMarkup(
      <BottomSheet open aria-label="t" onClose={() => {}} header={null}>
        x
      </BottomSheet>
    );
    expect(html.includes(`d="${SYMBOL_CANCEL}"`)).toBe(true);
    expect(html.includes(`d="${SYMBOL_CLOSE}"`)).toBe(false);
    const src = readSrc('../expressive/BottomSheet.tsx');
    expect(src.includes('d={SYMBOL_CANCEL}')).toBe(true);
    expect(src.includes('SYMBOL_CLOSE')).toBe(false);
  });

  it('D4-FONT1: .indicator-card__title の書体は .stepper__label と同じ label-medium トークン', () => {
    const decl = (css: string, sel: string) => {
      const block = css.match(new RegExp(`${sel} \\{([^}]*)\\}`))?.[1] ?? '';
      const pick = (prop: string) =>
        block.match(new RegExp(`${prop}:\\s*([^;]+);`))?.[1]?.trim();
      return [
        'font-family',
        'font-size',
        'line-height',
        'font-weight',
        'letter-spacing'
      ].map(pick);
    };
    const title = decl(
      readSrc('./main-screen.css'),
      '\\.indicator-card__title'
    );
    const stepper = decl(
      readSrc('../expressive/stepper.css'),
      '\\.stepper__label'
    );
    expect(title).toEqual(stepper);
    expect(title.every(v => v?.includes('label-medium'))).toBe(true);
  });

  it('D4-FONT2: .hand-card__title は title-small のまま', () => {
    const css = readSrc('./main-screen.css');
    const block = css.match(/\.hand-card__title \{[^}]*\}/)?.[0] ?? '';
    expect(block.includes('title-small')).toBe(true);
  });
});

describe('D4: UI監修4 (横ライン揃えと牌スペース確保)', () => {
  const css = readSrc('./main-screen.css');
  const block = (sel: string) =>
    css.match(new RegExp(`${sel} \\{([^}]*)\\}`))?.[1] ?? '';

  it('D4-ALIGN1: ドラ・副露カードでは死角paddingを持たず疑似要素で確保し、手牌カードは modifier で確保する', () => {
    const compact = block('\\.card-clear-zone--compact');
    expect(compact.includes('padding-block-end: 0;')).toBe(true);
    const after = block('\\.card-clear-zone--compact::after');
    expect(after.includes('inset-block-end: -0.5rem;')).toBe(true);
    // 手牌カード側の死角paddingは修飾クラスで確保
    expect(
      block('\\.card-clear-zone--hand').includes('padding-block-end: 0.5rem;')
    ).toBe(true);
  });

  it('D4-ALIGN2: 見出しは padding で中心がずれず、副露行は中央揃え', () => {
    expect(
      block('\\.indicator-card__title').includes('padding-block-start')
    ).toBe(false);
    expect(
      block('\\.indicator-card__top-row').includes('align-items: center;')
    ).toBe(true);
    expect(block('\\.meld-card__row').includes('align-items: center;')).toBe(
      true
    );
  });

  it('D4-SPACE1: ドラ牌行と副露空枠は牌1行分の高さを常に確保する', () => {
    expect(
      block('\\.indicator-card__tiles').includes(
        'min-height: calc(var(--tile-width) * 4 / 3);'
      )
    ).toBe(true);
    expect(
      block('\\.meld-card__empty').includes('height: calc(1.5rem * 4 / 3);')
    ).toBe(true);
  });
});
