# 開発者向けガイド

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

Issue 駆動で、ヒアリング→設計→製造→検収の順に進めます。詳細は [AGENTS.md](../AGENTS.md)・[docs/rules/](rules/README.md)、要件は [docs/requirements.md](requirements.md)、Issue 下書きは [docs/issues-draft.md](issues-draft.md) を参照してください。

## デプロイ

GitHub Actions の `Deploy` ワークフローを `main` ブランチで手動実行（`workflow_dispatch`）して GitHub Pages に公開します。初回設定（GitHub Pages の有効化）と実行手順の詳細は [issue-109-pages-deploy.md](design/issue-109-pages-deploy.md#7-オーナーが行う手順リポジトリ設定) を参照してください。

## リリース

PR マージおよびデプロイ・公開前チェックの後、オーナーが対象コミットに注釈付きタグを打って push し、監修済みリリースノートで GitHub Release を作成します。版上げと手順の詳細は [issue-110-v1-release.md](design/issue-110-v1-release.md#8-オーナー向け手順書タグgithub-release) を参照してください。
