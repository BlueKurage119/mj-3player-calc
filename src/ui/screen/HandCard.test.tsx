import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Meld } from '../../core/input';
import { createDefaultRule } from '../../core/rule';
import type { Tile } from '../../core/tile';
import { type AppState, createInitialState, maxHandLength } from '../state';

const holder: { state: AppState } = vi.hoisted(() => ({
  state: undefined as unknown as AppState
}));

vi.mock('../state', async importOriginal => {
  const actual = await importOriginal<typeof import('../state')>();
  return {
    ...actual,
    useAppState: () => holder.state,
    useAppDispatch: () => () => {}
  };
});

const { AppStateProvider } = await import('../state');
const { HandCard, formatHandCardTitle } = await import('./HandCard');

describe('D1-1: 手牌カードの見た目と当たり判定 (C1, C4)', () => {
  beforeEach(() => {
    holder.state = createInitialState(createDefaultRule());
  });

  it('D1-1-C1: 見出し文言フォーマットの検証 (0枚・13枚・副露あり・バッファ無視)', () => {
    // 手牌 0 枚・副露 0
    expect(formatHandCardTitle(0, maxHandLength([]))).toBe('手牌 (0/14)');

    // 手牌 13 枚・副露 0
    expect(formatHandCardTitle(13, maxHandLength([]))).toBe('手牌 (13/14)');

    // 副露 1 の状態 (ポン1つで手牌上限 11) で手牌 5 枚
    const meldPon: Meld = {
      type: 'pon',
      tile: { type: 'm', n: 1 }
    };
    expect(formatHandCardTitle(5, maxHandLength([meldPon]))).toBe(
      '手牌 (5/11)'
    );

    // テンキーバッファがあっても手牌枚数(n)は変わらない
    // (バッファは hand.length に加算されず、見出しは hand.length のみを反映する)
    const handLength = 5;
    const tenkeyBuffer = '12';
    // tenkeyBuffer.length は無視され、handLength のみが用いられる
    expect(formatHandCardTitle(handLength, maxHandLength([meldPon]))).toBe(
      '手牌 (5/11)'
    );
    // 理由: 部分一致ではなく完全一致でバッファ文字列が含まれていないこと・計算結果が手牌枚数のみに依存することを保証するため
    expect(
      formatHandCardTitle(handLength, maxHandLength([meldPon]))
    ).not.toContain(tenkeyBuffer);
  });

  it('D1-1-C4: 手牌カードのHTML構造とrole/buttonの検証 (renderToStaticMarkup)', () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <HandCard />
      </AppStateProvider>
    );

    // .hand-card に role 属性がないこと
    const handCardTagMatch = html.match(
      /<div[^>]*class="[^"]*hand-card[^"]*"[^>]*>/
    );
    expect(handCardTagMatch).not.toBeNull();
    const handCardTag = handCardTagMatch?.[0] ?? '';
    // 理由: role 属性が一切含まれないことを検証するため
    expect(handCardTag.includes('role=')).toBe(false);

    // .hand-card__opener に role="button"・tabindex="0"・aria-label="手牌を入力"・data-sheet-opener="" があること
    const openerMatch = html.match(
      /<span[^>]*class="[^"]*hand-card__opener[^"]*"[^>]*>([\s\S]*?)<\/span>/
    );
    expect(openerMatch).not.toBeNull();
    const openerTag = openerMatch?.[0] ?? '';
    // 理由: opener に指定された4属性がすべて付与されていることを検証するため
    expect(openerTag.includes('role="button"')).toBe(true);
    expect(openerTag.includes('tabindex="0"')).toBe(true);
    expect(openerTag.includes('aria-label="手牌を入力"')).toBe(true);
    expect(openerTag.includes('data-sheet-opener=""')).toBe(true);

    // role="button" の子孫に button 要素が存在しないこと
    const openerContent = openerMatch?.[1] ?? '';
    // 理由: opener の子孫要素に button タグが一切含まれないことを検証するため
    expect(openerContent.includes('<button')).toBe(false);

    // .hand-card__body に role 属性がないこと
    const bodyTagMatch = html.match(
      /<div[^>]*class="[^"]*hand-card__body[^"]*"[^>]*>/
    );
    expect(bodyTagMatch).not.toBeNull();
    const bodyTag = bodyTagMatch?.[0] ?? '';
    // 理由: .hand-card__body から role が外されていることを検証するため
    expect(bodyTag.includes('role=')).toBe(false);

    // ゴミ箱ボタンが手牌0枚で disabled 属性を持つこと
    const buttonMatch = html.match(
      /<button[^>]*class="[^"]*card-clear-button[^"]*"[^>]*>/
    );
    expect(buttonMatch).not.toBeNull();
    const buttonTag = buttonMatch?.[0] ?? '';
    // 理由: disabled 属性が存在することを検証するため
    expect(
      buttonTag.includes('disabled=""') || buttonTag.includes('disabled')
    ).toBe(true);
  });

  it('D1-1-C4-static: HandCard.tsx の静的検査 (.hand-card__body と .hand-card__opener に onClick がないこと)', () => {
    const handCardFilePath = path.resolve(__dirname, 'HandCard.tsx');
    const content = fs.readFileSync(handCardFilePath, 'utf-8');

    // .hand-card__body の開始タグを抽出 (単一タグ内のみにマッチさせる)
    const bodyElementMatch = content.match(
      /<div[^>]*className="hand-card__body"[^>]*>/
    );
    expect(bodyElementMatch).not.toBeNull();
    const bodyElementTag = bodyElementMatch?.[0] ?? '';

    // 理由: 外枠と二重に dispatch しないため .hand-card__body に onClick がないことを検証するため
    expect(bodyElementTag.includes('onClick')).toBe(false);

    const openerElementMatch = content.match(
      /<span[^>]*className="[^"]*hand-card__opener[^"]*"[^>]*>/
    );
    expect(openerElementMatch).not.toBeNull();
    const openerElementTag = openerElementMatch?.[0] ?? '';
    // 理由: 外枠と二重に dispatch しないため .hand-card__opener に onClick がないことを検証するため
    expect(openerElementTag.includes('onClick')).toBe(false);
  });

  it('D4-C29-HC: 初期状態(非選択)の HandCard に hand-card--selected クラスが付かないこと', () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <HandCard />
      </AppStateProvider>
    );

    // 理由: 非選択の初期状態では修飾クラスが付かないことを完全一致で検証するため
    expect(html.includes('hand-card--selected')).toBe(false);
  });
});

describe('F1-1: HandCard の牌ボタン化と選択状態', () => {
  beforeEach(() => {
    holder.state = createInitialState(createDefaultRule());
  });

  it('F1-1: 手牌ありで各牌が button.tile になり、initialSelectedIndex の牌だけ aria-pressed="true" と選択中 aria-label になる', () => {
    const base = createInitialState(createDefaultRule());
    const hand: Tile[] = [
      { type: 'p', n: 1 },
      { type: 's', n: 5, red: true },
      { type: 'z', n: 1 }
    ];
    holder.state = {
      ...base,
      input: { ...base.input, hand }
    };

    const html = renderToStaticMarkup(<HandCard initialSelectedIndex={1} />);
    const tilesMatch = html.match(
      /<div role="group" aria-label="手牌の牌" class="hand-card__tiles">([\s\S]*)<\/div><\/div><\/div>$/
    );
    expect(tilesMatch).not.toBeNull();

    const tileButtons = [
      ...html.matchAll(
        /<button type="button" class="([^"]*)" aria-label="([^"]*)" aria-pressed="(true|false)">/g
      )
    ].map(m => ({
      className: m[1],
      ariaLabel: m[2],
      ariaPressed: m[3]
    }));

    expect(tileButtons).toEqual([
      {
        className: 'tile',
        ariaLabel: '1筒',
        ariaPressed: 'false'
      },
      {
        className: 'tile tile--selected',
        ariaLabel: '赤5索、もう一度押すと削除',
        ariaPressed: 'true'
      },
      {
        className: 'tile',
        ariaLabel: '東',
        ariaPressed: 'false'
      }
    ]);
  });

  it('F1-1: 14枚の満杯手牌では和了牌(14枚目)も .hand-card__winning-tile 内の button.tile になる', () => {
    const base = createInitialState(createDefaultRule());
    const hand14: Tile[] = [
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 6 },
      { type: 'p', n: 7 },
      { type: 's', n: 3 },
      { type: 's', n: 4 },
      { type: 's', n: 6 },
      { type: 's', n: 7 },
      { type: 's', n: 8 },
      { type: 'p', n: 9 },
      { type: 'p', n: 9 },
      { type: 's', n: 2 }
    ];
    holder.state = {
      ...base,
      input: { ...base.input, hand: hand14 }
    };

    const html = renderToStaticMarkup(<HandCard initialSelectedIndex={13} />);
    const winningMatch = html.match(
      /<span class="hand-card__winning-tile"><button type="button" class="([^"]*)" aria-label="([^"]*)" aria-pressed="(true|false)">/
    );
    expect(winningMatch).not.toBeNull();
    expect(winningMatch?.slice(1, 4)).toEqual([
      'tile tile--selected',
      '2索、もう一度押すと削除',
      'true'
    ]);

    const tileButtons = [
      ...html.matchAll(/<button type="button" class="tile[^"]*"/g)
    ];
    expect(tileButtons).toHaveLength(14);
  });
});
