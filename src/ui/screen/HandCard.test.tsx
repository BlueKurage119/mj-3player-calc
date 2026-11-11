import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Meld } from '../../core/input';
import { AppStateProvider, maxHandLength } from '../state';
import { HandCard, formatHandCardTitle } from './HandCard';

describe('D1-1: 手牌カードの見た目と当たり判定 (C1, C4)', () => {
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

    // .hand-card__body に role="button" が付与されていること
    const bodyTagMatch = html.match(
      /<div[^>]*class="[^"]*hand-card__body[^"]*"[^>]*>/
    );
    expect(bodyTagMatch).not.toBeNull();
    const bodyTag = bodyTagMatch?.[0] ?? '';
    // 理由: role="button" の完全一致を検証するため
    expect(bodyTag.includes('role="button"')).toBe(true);

    // role="button" の子孫に button 要素が存在しないこと
    // .hand-card__body の開始タグから対応する終了タグまでの間に <button がないことを確認
    const bodyContentMatch = html.match(
      /<div[^>]*class="[^"]*hand-card__body[^"]*"[^>]*>([\s\S]*?)<\/div>/
    );
    expect(bodyContentMatch).not.toBeNull();
    const bodyContent = bodyContentMatch?.[1] ?? '';
    // 理由: 子孫要素に button タグが一切含まれないことを検証するため
    expect(bodyContent.includes('<button')).toBe(false);

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

  it('D1-1-C4-static: HandCard.tsx の静的検査 (.hand-card__body に onClick がないこと)', () => {
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
