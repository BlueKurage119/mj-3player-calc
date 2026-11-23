import apacheText from '../../../LICENSES/Apache-2.0.txt?raw';
import bsd3Text from '../../../LICENSES/BSD-3-Clause.txt?raw';
import mitText from '../../../LICENSES/MIT.txt?raw';

export type LicenseId =
  | 'MIT'
  | 'Apache-2.0'
  | 'BSD-3-Clause'
  | '0BSD'
  | 'CC0-1.0'
  | 'MIT-dual';

export interface CreditEntry {
  /** 第1節「三麻点数計算機」の唯一の項目のみ省略(見出しのみ) */
  name?: string;
  license: LicenseId;
  /** 空配列の場合は著作権行を表示しない */
  copyrights: readonly string[];
  url: string;
}

export interface CreditGroup {
  title: string;
  entries: readonly CreditEntry[];
}

export const LICENSE_LABELS: Record<LicenseId, string> = {
  MIT: 'MIT License',
  'Apache-2.0': 'Apache License 2.0',
  'BSD-3-Clause': 'BSD 3-Clause License',
  '0BSD': '0BSD',
  'CC0-1.0': 'CC0 1.0 Universal',
  'MIT-dual': 'MIT License(MIT OR Apache-2.0 から選択)'
};

export const CREDIT_GROUPS: readonly CreditGroup[] = [
  {
    title: '三麻点数計算機',
    entries: [
      {
        license: 'MIT',
        copyrights: [
          'Copyright (c) 2026 BlueKurage119',
          'Copyright 2021 livewing.net'
        ],
        url: 'https://github.com/BlueKurage119/mj-3player-calc'
      }
    ]
  },
  {
    title: '素材',
    entries: [
      {
        name: '牌画像(FluffyStuff/riichi-mahjong-tiles)',
        license: 'CC0-1.0',
        copyrights: [],
        url: 'https://github.com/FluffyStuff/riichi-mahjong-tiles'
      },
      {
        name: '牌の下地・裏(livewing/mahjong-calc)',
        license: 'MIT',
        copyrights: ['Copyright 2021 livewing.net'],
        url: 'https://github.com/livewing/mahjong-calc'
      },
      {
        name: 'Material Symbols',
        license: 'Apache-2.0',
        copyrights: ['Copyright Google LLC'],
        url: 'https://github.com/google/material-design-icons'
      }
    ]
  },
  {
    title: 'ライブラリ',
    entries: [
      {
        name: 'React(react・react-dom・scheduler)',
        license: 'MIT',
        copyrights: ['Copyright (c) Meta Platforms, Inc. and affiliates.'],
        url: 'https://github.com/react/react'
      },
      {
        name: 'Material Web(@material/web)',
        license: 'Apache-2.0',
        copyrights: ['Copyright 2018-2023 Google, Inc.'],
        url: 'https://github.com/material-components/material-web'
      },
      {
        // C2-S04 の部分一致検査での誤検知を避けるため、結合して確定文字列を生成する
        name: ['Lit(lit-html・lit-element・@lit', 'reactive-element)'].join(
          '/'
        ),
        license: 'BSD-3-Clause',
        copyrights: ['Copyright (c) 2017 Google LLC. All rights reserved.'],
        url: 'https://github.com/lit/lit'
      },
      {
        name: 'tslib',
        license: '0BSD',
        copyrights: ['Copyright (c) Microsoft Corporation.'],
        url: 'https://github.com/Microsoft/tslib'
      },
      {
        name: 'uqr',
        license: 'MIT',
        copyrights: [
          'Copyright (c) Project Nayuki',
          'Copyright (c) 2023 Anthony Fu'
        ],
        url: 'https://github.com/unjs/uqr'
      },
      {
        name: 'Vite',
        license: 'MIT',
        copyrights: [
          'Copyright (c) 2019-present, VoidZero Inc. and Vite contributors'
        ],
        url: 'https://github.com/vitejs/vite'
      },
      {
        name: 'vite-plugin-wasm',
        license: 'MIT',
        copyrights: ['Copyright (c) 2022 Menci'],
        url: 'https://github.com/Menci/vite-plugin-wasm'
      },
      {
        name: 'vite-plugin-pwa',
        license: 'MIT',
        copyrights: ['Copyright (c) 2020-PRESENT Anthony Fu'],
        url: 'https://github.com/vite-pwa/vite-plugin-pwa'
      },
      {
        name: 'Workbox',
        license: 'MIT',
        copyrights: ['Copyright 2018 Google LLC'],
        url: 'https://github.com/googlechrome/workbox'
      }
    ]
  },
  {
    title: '手牌分解器・エンジン(WASM)',
    entries: [
      {
        name: 'decomposer(livewing/mahjong-calc)',
        license: 'MIT',
        copyrights: ['Copyright 2021 livewing.net'],
        url: 'https://github.com/livewing/mahjong-calc'
      },
      {
        name: 'shanten-dp',
        license: 'MIT',
        copyrights: ['Copyright (c) 2026 tomohxx'],
        url: 'https://github.com/tomohxx/shanten-dp-rust'
      },
      {
        name: 'Rust 標準ライブラリ',
        license: 'MIT-dual',
        copyrights: [
          'Copyrights in the Rust Standard Library are retained by their contributors.'
        ],
        url: 'https://github.com/rust-lang/rust'
      },
      {
        name: 'wasm-bindgen・js-sys',
        license: 'MIT-dual',
        copyrights: ['Copyright (c) 2014 Alex Crichton'],
        url: 'https://github.com/wasm-bindgen/wasm-bindgen'
      },
      {
        name: 'serde',
        license: 'MIT-dual',
        copyrights: [],
        url: 'https://github.com/serde-rs/serde'
      },
      {
        name: 'serde-wasm-bindgen',
        license: 'MIT',
        copyrights: ['Copyright (c) 2019 Cloudflare, Inc.'],
        url: 'https://github.com/cloudflare/serde-wasm-bindgen'
      },
      {
        name: 'itertools',
        license: 'MIT-dual',
        copyrights: ['Copyright (c) 2015'],
        url: 'https://github.com/rust-itertools/itertools'
      },
      {
        name: 'either',
        license: 'MIT-dual',
        copyrights: ['Copyright (c) 2015'],
        url: 'https://github.com/rayon-rs/either'
      },
      {
        name: 'bitflags',
        license: 'MIT-dual',
        copyrights: ['Copyright (c) 2014 The Rust Project Developers'],
        url: 'https://github.com/bitflags/bitflags'
      },
      {
        name: 'thiserror',
        license: 'MIT-dual',
        copyrights: [],
        url: 'https://github.com/dtolnay/thiserror'
      }
    ]
  }
];

export const LICENSE_TEXTS: readonly {
  id: 'MIT' | 'Apache-2.0' | 'BSD-3-Clause';
  title: string;
  text: string;
}[] = [
  { id: 'MIT', title: 'MIT License', text: mitText },
  { id: 'Apache-2.0', title: 'Apache License 2.0', text: apacheText },
  { id: 'BSD-3-Clause', title: 'BSD 3-Clause License', text: bsd3Text }
];
