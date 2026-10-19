---
title: UI・MD3 Expressive業務標準
description: UIで必ず守る技術制約(色トークン・Material Webのラッパー経由・バージョン固定・自作部品の置き場所・bare import禁止)と、牌画像の色の例外
phases: [設計, 製造, 検収]
products: [Claude, Codex, Antigravity]
---

# UI・MD3 Expressive業務標準

対象: `src/ui/`を触るすべてのフェーズ。エラーも警告も出ずに壊れるものと、デザインの一貫性を保つための最低限の制約だけをここに集約している。**`src/ui/`に変更を加える前に必ず読むこと。** 計測の罠等のノウハウは[G-08-ui-measurement-pitfalls.md](advisory/G-08-ui-measurement-pitfalls.md)・[G-09-bundle-budget-underestimate.md](advisory/G-09-bundle-budget-underestimate.md)を参照。

シード色・ライト/ダークの扱いなどの細目は、Epic C(デザイン基盤)のヒアリングで決め、決まったものからこの文書に追記する。

## 必須の制約

1. **色はHEX値をハードコードせず、MD3のトークン(`--md-sys-color-*`)を使用する。** トークンは`@material/material-color-utilities`で生成する。例外は次節に記載する。
2. **見ればわかる説明書き・ラベルは省略する。**
3. **Material Web(`@material/web`)のコンポーネントは、`src/ui/md/`のバレル(`index.ts`)からexportされた型付きラッパー経由でのみ使う。`<md-*>`の生タグを直書きしない。** 未ラップのコンポーネントが必要になったら、ラッパーを追加してからバレルに載せる。Expressive に合わせた改造(形状・余白・モーション等)も、ラッパーの中で行う。
4. **Material Webで表現できない Expressive の部品は、`src/ui/expressive/`に自作する。** 自作部品も色・形状・モーションはMD3のトークンだけで組み、値を直書きしない。同じ役割の部品をラッパーと自作で二重に作らない。
5. **`@material/web`と`@material/material-color-utilities`は、キャレットなしでバージョンを固定する。** `npm update`等で勝手に上げない。上げる場合は、Issueとして影響を確認してから行う。
6. **副作用のためだけのbare import(CSS以外の`import './foo'`)を書かない。** `package.json`に`"sideEffects": ["*.css"]`を宣言する前提のため、副作用目的のimportは本番ビルドで黙って除去される。カスタム要素の登録は、ラッパーのexportを使うことで成立させる。

## 色トークン使用義務の例外(牌画像)

牌の色は装飾ではなく、牌を識別するための意味を持つ。無理にMD3のトークンに置き換えると、牌の見分けがつかなくなる。そこで次のとおり扱う。

1. 牌の絵柄の色は、牌画像(SVG)の側で持ち、MD3のトークンに置き換えない。
2. 牌画像の背景・枠・選択状態などの装飾は、MD3のトークンで組む。
3. CSS・TSXに牌の絵柄の色をHEX等で書かない。色を変える必要があるときは、牌画像の差し替えとして扱う。
