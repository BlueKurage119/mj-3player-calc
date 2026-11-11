---
title: 本番ビルドで CSS が落ちる罠
description: sideEffects の設定とバレル内の CSS import が重なると、dev では出ず本番ビルドでだけ CSS が落ちる。対策と、本番ビルドでの確認手順
phases: [設計, 製造, 検収]
products: [Claude, Codex, Antigravity]
---

# 本番ビルドで CSS が落ちる罠

対象: UIを触る全フェーズ(特にバレルの新設・CSSの追加、検収・UI監修での画面確認)。ここに書くのは知識と確認の例であり、必須事項ではない(必須事項は業務標準を参照)。**必須の技術制約は[06-ui-md3-protocol.md](../06-ui-md3-protocol.md)を参照。**

**出典: このリポジトリの Issue #50(設定画面)の検収・UI監修後に発覚した不具合(修正ブランチ `fix/settings-css-treeshake`)。Issue・PR 番号はこのリポジトリのもの。**

## 事象

- 設定画面の CSS(`help-tooltip`・`settings-accordion` 等)が、本番ビルドの成果物に1件も入らなかった。
- dev サーバーでは再現しない。本番ビルドまたは `vite preview` でだけ起きる。
- #50 の検収・UI監修が dev サーバー中心だったため、見逃した。

## 原因

- `package.json` の `"sideEffects": ["*.css"]` は「CSS ファイルだけが副作用を持つ」と宣言するもので、それ以外のモジュールは副作用なしとして扱われる。
- `src/ui/settings/index.ts`(バレル)の先頭に `import './settings.css';` があった。バレルは副作用なしと見なされるため、バレルから再エクスポートを使うだけでは、この CSS import が成果物に残らない。
- 設定画面は遅延読み込みなので、初回表示には現れず、気づきにくかった。

## 対策

- **CSS の import は、そのスタイルを使うコンポーネント(またはその画面)から直接書く。バレル(`index.ts`)には書かない。**
- 再発防止として、`src/build-css.test.ts` が本番ビルドを実行し、`src` 配下の各 CSS の固有クラス(ファイル内で最初に現れるクラス)が成果物に含まれることを検査している。CSS を追加するときは、この検査が通ることも確かめる。

## 確認の例

### 成果物の CSS にクラスがあるか調べる

`npm run build` の後、`dist/assets/` の CSS に、確認したいクラスが入っているかを grep する。

```bash
grep -c "settings-accordion" dist/assets/*.css
```

0件ならその CSS は落ちている。遅延読み込みの画面(設定画面など)の CSS も、本番ビルドでは含まれることを確かめる。

### `vite preview` で画面を見る

1. `npm run build`
2. 空きポートを選び、`npx vite preview --port <空きポート> --strictPort` を自分で起動する。`--strictPort` を付けると、ポートが埋まっていても別ポートに逃げず失敗するので、他の人のサーバーと取り違えない。
3. 設定画面など遅延読み込みの画面まで開き、幅 375px で見る。
4. 終了は、起動した自分のプロセスの PID だけを指定して止める。`pkill` 等で一括終了しない([G-02-dev-server-etiquette.md](G-02-dev-server-etiquette.md)も参照)。

### Service Worker・キャッシュの注意

- 本番ビルドは PWA の Service Worker が動く。以前の版のキャッシュが残っていると、古い CSS を見てしまう(落ちていた版が残る、逆に直した版が反映されない)。
- 確認前に、開発者ツールで Service Worker の登録解除とキャッシュ削除を行うか、シークレットウィンドウ・新しいプロファイルで開く。
