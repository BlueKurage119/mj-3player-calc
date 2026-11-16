import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LicenseView } from './LicenseScreen';

describe('G3L: 第三者ライセンス画面 (LicenseView)', () => {
  it('G3L-T4: タイトル・5つの節見出し・3つの Disclosure summary・2.5 の全著作権行が出力される', () => {
    const html = renderToStaticMarkup(<LicenseView onBack={() => {}} />);

    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/);
    expect(h1Match?.[1]).toBe('ライセンス');

    const sectionTitles = [
      ...html.matchAll(
        /<h2 class="license-screen__section-title">([^<]*)<\/h2>/g
      )
    ].map(m => m[1]);
    expect(sectionTitles).toEqual([
      '三麻点数計算機',
      '素材',
      'ライブラリ',
      '手牌分解器(WASM)',
      'ライセンス全文'
    ]);

    const summaries = [
      ...html.matchAll(
        /<span class="disclosure__summary-text">([^<]*)<\/span>/g
      )
    ].map(m => m[1]);
    expect(summaries).toEqual([
      'MIT License',
      'Apache License 2.0',
      'BSD 3-Clause License'
    ]);

    const expectedCopyrights = [
      'Copyright (c) 2026 BlueKurage119',
      'Copyright 2021 livewing.net',
      'Copyright Google LLC',
      'Copyright (c) Meta Platforms, Inc. and affiliates.',
      'Copyright 2018-2023 Google, Inc.',
      'Copyright (c) 2017 Google LLC. All rights reserved.',
      'Copyright (c) Microsoft Corporation.',
      'Copyright (c) Project Nayuki',
      'Copyright (c) 2023 Anthony Fu',
      'Copyright (c) 2019-present, VoidZero Inc. and Vite contributors',
      'Copyright (c) 2022 Menci',
      'Copyright (c) 2020-PRESENT Anthony Fu',
      'Copyright 2018 Google LLC',
      'Copyrights in the Rust Standard Library are retained by their contributors.',
      'Copyright (c) 2014 Alex Crichton',
      'Copyright (c) 2019 Cloudflare, Inc.',
      'Copyright (c) 2015'
    ];

    for (const copyright of expectedCopyrights) {
      // 理由: 設計書 2.8 G3L-T4 の定めにより、HTML 全体との完全一致は脆いため、各著作権行が含まれることを部分一致で検証する
      expect(html.includes(copyright)).toBe(true);
    }

    // 理由: 設計書 2.5 で定義された MIT 全文の前置き1文が出力されることを部分一致で検証する
    expect(
      html.includes('各項目の著作権表示と、次の許諾文が適用されます。')
    ).toBe(true);
  });
});
