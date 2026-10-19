# mj-3player-calc

三人麻雀に特化したスマホ向けの点数計算機（PWA）です。

## 構成

- `src/core/` — 計算コア（役判定・符・点数・向聴）。[livewing/mahjong-calc](https://github.com/livewing/mahjong-calc)（MIT）の `src/lib` から取り込み、三麻向けに改修します
- `wasm/decomposer/` — 手牌分解器（Rust/WASM）。同じく mahjong-calc から取り込み
- `src/ui/` — UI（Material Design 3 Expressive）

## 開発

Rust と wasm-pack が必要です（WASM のビルド用）。

```bash
npm run build:wasm   # 初回と Rust 変更時
npm install
npm run dev
npm test
npm run lint && npm run typecheck && npm run format:check
```

## 開発の進め方

Issue 駆動で、ヒアリング→設計→製造→検収の順に進めます。詳細は [CLAUDE.md](CLAUDE.md)・[docs/rules/](docs/rules/README.md)、要件は [docs/requirements.md](docs/requirements.md)、Issue 下書きは [docs/issues-draft.md](docs/issues-draft.md) を参照してください。

## ライセンス

[MIT](./LICENSE)。計算コアは livewing.net による mahjong-calc（MIT）に由来します。
