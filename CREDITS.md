# クレジット (Credits)

本プロジェクトで使用している第三者素材・リソースのクレジット一覧です。

アプリ内の「設定 → ライセンス」でも同じ内容を表示しています。

## 牌画像素材

- 提供元: FluffyStuff / riichi-mahjong-tiles
- URL: https://github.com/FluffyStuff/riichi-mahjong-tiles
- コミット: `26e127ba2117f45cdce5ea0225748cc0cfad3169`
- ライセンス: CC0 1.0 Universal (パブリックドメイン)
- 備考: ライセンス上の義務はありませんが、素晴らしい素材の公開に感謝してここに謝意を記載します。
- 加工内容:
  - `Regular` ディレクトリから三人麻雀で使用する図柄 29 ファイルを選定して取り込み
  - SVGO (`svgo.tiles.config.mjs`) による最適化 (viewBox 保持)

## 牌の下地・裏 (livewing/mahjong-calc)

- 提供元: livewing / mahjong-calc
- URL: https://github.com/livewing/mahjong-calc
- バージョン: v2.1.4
- コミット: `6550200`
- ライセンス: MIT License (Copyright 2021 livewing.net、全文はリポジトリルートの `LICENSE` を参照)
- 使用内容:
  - 表の下地 `bg.svg`・裏 `back.svg` を内容そのままで `Front.svg`・`Back.svg` に改名して使用
  - 絵柄を下地に重ねて 0.9 倍に縮小する配置を参考にした

## アイコン (Material Symbols)

- 提供元: Google の Material Design Icons
- URL: https://github.com/google/material-design-icons
- ライセンス: Apache License 2.0 (全文は `LICENSES/Apache-2.0.txt` を参照。上流に NOTICE ファイルはない)
- 使用内容:
  - Outlined の 24px SVG から 17 アイコン分の path を `src/ui/icons/symbol-paths.ts` に定数として書き写して使用 (無改変)

## `@material/web`

- 提供元: Material Components / material-web
- URL: https://github.com/material-components/material-web
- バージョン: 2.5.0
- ライセンス: Apache License 2.0 (上流 LICENSE の表記は `Copyright 2018-2023 Google, Inc.`。全文は `LICENSES/Apache-2.0.txt` を参照。上流に NOTICE ファイルはない)
- 使用内容: 本番依存として使用しており、配布物に含まれる

## 配布物に含まれるライブラリ(JavaScript)

本節の MIT License 項目の許諾文全文は `LICENSES/MIT.txt`（および `LICENSE`）を参照してください。

### React (`react`・`react-dom`・`scheduler`)

- URL: https://github.com/react/react
- バージョン: `react` 19.3.1・`react-dom` 19.3.1・`scheduler` 0.28.0
- ライセンス: MIT License (`Copyright (c) Meta Platforms, Inc. and affiliates.`、全文は `LICENSES/MIT.txt` を参照)

### Lit (`lit-html`・`lit-element`・`@lit/reactive-element`)

- URL: https://github.com/lit/lit
- バージョン: `lit-html` 3.3.3・`lit-element` 4.2.2・`@lit/reactive-element` 2.1.2
- ライセンス: BSD 3-Clause License (`Copyright (c) 2017 Google LLC. All rights reserved.`、全文は `LICENSES/BSD-3-Clause.txt` を参照)

### tslib

- URL: https://github.com/Microsoft/tslib
- バージョン: 2.9.1
- ライセンス: 0BSD (`Copyright (c) Microsoft Corporation.`)

### uqr

- URL: https://github.com/unjs/uqr
- バージョン: 0.1.2
- ライセンス: MIT License (`Copyright (c) Project Nayuki` / `Copyright (c) 2023 Anthony Fu`、全文は `LICENSES/MIT.txt` を参照)

### Vite・vite-plugin-wasm(ビルド時注入の補助コード)

- Vite
  - URL: https://github.com/vitejs/vite
  - バージョン: 6.4.4
  - ライセンス: MIT License (`Copyright (c) 2019-present, VoidZero Inc. and Vite contributors`、全文は `LICENSES/MIT.txt` を参照)
- vite-plugin-wasm
  - URL: https://github.com/Menci/vite-plugin-wasm
  - バージョン: 3.6.0
  - ライセンス: MIT License (`Copyright (c) 2022 Menci`、全文は `LICENSES/MIT.txt` を参照)

### vite-plugin-pwa・Workbox

- vite-plugin-pwa
  - URL: https://github.com/vite-pwa/vite-plugin-pwa
  - バージョン: 0.21.2
  - ライセンス: MIT License (`Copyright (c) 2020-PRESENT Anthony Fu`、全文は `LICENSES/MIT.txt` を参照)
- Workbox (`workbox-core`・`workbox-precaching`・`workbox-routing`)
  - URL: https://github.com/googlechrome/workbox
  - バージョン: 7.4.1
  - ライセンス: MIT License (`Copyright 2018 Google LLC`、全文は `LICENSES/MIT.txt` を参照)

## 配布物に含まれる Rust crate(手牌分解器・エンジン WASM)

`MIT OR Apache-2.0` のデュアルライセンスの項目はすべて MIT License を選択しています（全文は `LICENSES/MIT.txt` を参照）。なお、`Cargo.lock` を管理していないため、`shanten-dp` (`=0.3.2`) 以外の Rust crate の版は固定していません。

### decomposer (`livewing/mahjong-calc`)

- URL: https://github.com/livewing/mahjong-calc
- ライセンス: MIT License (`Copyright 2021 livewing.net`、全文は `LICENSES/MIT.txt` を参照)

### shanten-dp (`tomohxx/shanten-dp-rust`)

- 提供元: tomohxx
- URL: https://github.com/tomohxx/shanten-dp-rust
- バージョン: 0.3.2
- ライセンス: MIT License (`Copyright (c) 2026 tomohxx`、全文は `LICENSES/MIT.txt` を参照)

### Rust 標準ライブラリ

- URL: https://github.com/rust-lang/rust
- ライセンス: MIT License(MIT OR Apache-2.0 から選択、`Copyrights in the Rust Standard Library are retained by their contributors.`、全文は `LICENSES/MIT.txt` を参照)

### wasm-bindgen・js-sys

- URL: https://github.com/wasm-bindgen/wasm-bindgen
- ライセンス: MIT License(MIT OR Apache-2.0 から選択、`Copyright (c) 2014 Alex Crichton`、全文は `LICENSES/MIT.txt` を参照)

### serde

- URL: https://github.com/serde-rs/serde
- ライセンス: MIT License(MIT OR Apache-2.0 から選択、上流に記名なし、全文は `LICENSES/MIT.txt` を参照)

### serde-wasm-bindgen

- URL: https://github.com/cloudflare/serde-wasm-bindgen
- ライセンス: MIT License (`Copyright (c) 2019 Cloudflare, Inc.`、全文は `LICENSES/MIT.txt` を参照)

### itertools

- URL: https://github.com/rust-itertools/itertools
- ライセンス: MIT License(MIT OR Apache-2.0 から選択、`Copyright (c) 2015`、全文は `LICENSES/MIT.txt` を参照)

### either

- URL: https://github.com/rayon-rs/either
- ライセンス: MIT License(MIT OR Apache-2.0 から選択、`Copyright (c) 2015`、全文は `LICENSES/MIT.txt` を参照)
