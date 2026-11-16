# Issue #110 設計書: G3 v1 リリース(版番号・README・リリースノート・受け入れ確認)

## 1. 目的と範囲

Version 1(1.0.0)を公開できる状態にする。本 Issue の製造範囲は次のとおり。

1. 版番号を 1.0.0 にし、ヘルプ画面の末尾に「バージョン 1.0.0」を表示する(ビルド時に `package.json` から注入)
2. README を利用者向けに改訂し、開発者向けの内容を `docs/development.md` に分離する
3. GitHub Release 用のリリースノート下書きを `docs/release-notes/v1.0.0.md` に置く(オーナー監修前は公開しない)
4. 09号のバンドル基準値を、本 Issue の製造後の実測で確定・更新する
5. 本番ビルドの自動確認(375px 幅表示・Service Worker によるオフライン準備・初回 JS 計測)を検収で行う

**スコープ外**: タグ・GitHub Release の作成と公開(オーナーが行う。8章)、ブランチ運用の変更(main/development 分離)、裏ドラ欄の無効化 UI、振聴、#95(ランダム入力の正規化)、`.github/workflows/deploy.yml` の変更。

**製造・検収はタグ・Release を作らない。** `git tag`・`gh release create` を実行しない。

## 2. 参照資料と設計判断の根拠

### 2.1 ヒアリング確定事項(統括担当経由のオーナー回答)

| # | 確定事項 | 本設計での反映 |
| --- | --- | --- |
| 1 | 受け入れ確認は B 案(本番ビルドの自動確認)。実機確認は G1/G2/#69/G4 でオーナー確認済みの事実として記録 | 6章 AC-6〜AC-8、2.3 |
| 2 | ヘルプ画面末尾に「バージョン 1.0.0」を1行。ビルド時に package.json から注入。テスト追加。`package.json`・`package-lock.json` を 1.0.0、`private: true` 維持 | 3.1・3.2 |
| 3 | リリースノート本文案(日本語、できること/対応環境/既知の制約/v2予定)。振聴・裏ドラ無効化UIは載せない。v2 持ち越しは #106 #105 #85 #58 #111 #112 #113(#92 は後回し)。オーナー監修前は公開しない | 3.4 |
| 4 | README 利用者向け改訂、開発者向けは `docs/development.md` へ分離。スクリーンショットは「画像はイメージです」の注記付き | 3.3 |
| 5 | タグ・Release はオーナーが作成 | 8章 |
| 6 | バンドル基準値は今回の測定で確定し、09号を更新 | 4章 |
| 7 | ブランチ運用は v1 では現状維持(main のみ、規則・ワークフロー変更なし)で確定 | 変更なし |

### 2.2 実物調査(origin/main d7fab4b)

- `package.json`: `"version": "0.0.0"`、`"private": true`。
- `vite.config.ts`: `base: '/mj-3player-calc/'`。`define` は未使用。`vitest.config.*` は無く、Vitest は `vite.config.ts` を読む(→ `define` はテストでも効く)。
- `tsconfig.app.json`: `"types": ["vite/client"]`、`"include": ["./src"]`、`"resolveJsonModule": true`。`src/` 直下に `*.d.ts` は無い。
- ヘルプ画面: `src/ui/screen/HelpScreen.tsx`(`HelpView` が props のみで描画。末尾は `<Divider />` → `<Button variant="text" className="help-screen__license-link">ライセンス</Button>`)。`App.tsx` で `lazy(() => import('./screen/HelpScreen'))` により**遅延チャンク**になっている。テストは `src/ui/screen/HelpScreen.test.tsx`(`renderToStaticMarkup` で HTML 文字列を検査)。スタイルは `src/ui/help/help.css`(`.help-screen__license-link { align-self: flex-start; min-height: 3rem; }`、`.help-screen__content` は flex 縦並び)。
- README: 構成・開発・開発の進め方・ライセンスの4節で、開発者向けのみ。`docs/` と `AGENTS.md` から README へのリンクは無い(`grep -rn README AGENTS.md docs/rules` で該当は `docs/rules/advisory/README.md` 等の別ファイルのみ)。README からのリンク先: `AGENTS.md`・`docs/rules/README.md`・`docs/requirements.md`・`docs/issues-draft.md`・`LICENSE`・`CREDITS.md`・`LICENSES/`。
- 公開 URL とデプロイ手順: `docs/design/issue-109-pages-deploy.md` 7章(G3 で README に記載する旨の引き継ぎあり)。
- `public/` は `favicon.svg`・`icons/` のみ。`public/` 配下は `dist/` にコピーされ、Workbox の `globPatterns: ['**/*.{js,css,html,wasm,svg,png}']` により **precache 対象になる**。
- 本番ビルド `dist/` の合計は約 1.2 MB、precache 61 エントリ(1093.25 KiB)。

### 2.3 実機確認済みの事実(本 Issue では再確認しない)

統括担当の申告による。次の項目は G1(#108)・G2(#109)・#69・G4(#117)の検収・監修時にオーナーが実機で確認済みとし、本 Issue の受け入れ条件には含めない。PR 本文にもこの扱いを明記する。

| 項目 | 確認した Issue |
| --- | --- |
| iOS / iPadOS Safari のホーム画面追加(インストール)、アイコン、ステータスバー色 | G1 #108 |
| Android Chrome のインストール、アイコン、ステータスバー色 | G1 #108 |
| オフラインでの起動・計算 | G1 #108 |
| GitHub Pages の公開 URL での表示 | G2 #109 |
| ライセンス画面 | #69 |
| ヘルプ画面 | G4 #117 |

本 Issue での変更(版番号の表示1行・README・docs)は上記の実機挙動に影響しない。版番号表示の実機での見え方は**実挙動未確認**(公開後にオーナーが任意で確認)。

## 3. 変更内容

### 3.1 版番号

- `package.json` の `"version"` を `"1.0.0"` にする。`"private": true` は維持する。
- `package-lock.json` はトップレベルの `"version"` と `packages[""].version` の2か所を `"1.0.0"` にする。手で書き換えず `npm version 1.0.0 --no-git-tag-version` を使う(このコマンドはタグもコミットも作らない。**`--no-git-tag-version` を外さないこと**)。他の差分が出ないことを `git diff package-lock.json` で確認する。

### 3.2 版番号の注入と表示

**注入(`vite.config.ts`)**: 既存の `fs`・`path` を使い、`package.json` を読んで `define` に渡す。

```ts
const appVersion: string = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf-8')
).version;
// export default { ..., define: { __APP_VERSION__: JSON.stringify(appVersion) }, ... }
```

**型宣言(新規 `src/app-version.d.ts`)**:

```ts
/** ビルド時に vite.config.ts の define で package.json の version を注入する */
declare const __APP_VERSION__: string;
```

**表示(`src/ui/screen/HelpScreen.tsx` の `HelpView`)**: 末尾のライセンスボタンの直後(`</main>` の直前)に1行追加する。

```tsx
<p className="help-screen__version">{`バージョン ${__APP_VERSION__}`}</p>
```

- `HelpViewProps` は変えない(props に版番号を渡さない)。
- スタイル(`src/ui/help/help.css` に追加): 本文より控えめの文字にする。色は既存トークン(`--md-sys-color-on-surface-variant` 等、`help.css` 内で既に使われているもの)を使い HEX を書かない。タイポグラフィも既存の body/label トークンから選ぶ。余白は `margin: 0`、左揃え(`align-self: flex-start`)。詳細値は製造担当が既存 `help.css` に合わせて決めてよい。
- 「バージョン」の語は確定事項どおり。ラベルや説明を追加しない。

**テスト(`src/ui/screen/HelpScreen.test.tsx` に追加)**:

- G3-T1: `renderHelpHtml()` が `バージョン 1.0.0` を含む。
- G3-T2: 表示の版番号が `package.json` の `version` と一致する(`import pkg from '../../../package.json'` で読み、`バージョン ${pkg.version}` を含むことを検査。`resolveJsonModule` は有効)。型検査で `package.json` の import が `tsconfig.app.json` の `include` 外として問題になる場合は、`node:fs` で読む方式に切り替えてよい。
- G3-T3: `バージョン` の出現位置が `ライセンス` ボタンより後ろ。

### 3.3 README と docs/development.md

**README.md(利用者向けに全面改訂)**。節構成と内容:

1. タイトル + 1〜2文の紹介(三人麻雀に特化したスマホ向け点数計算機。和了・聴牌では役と打点、それ以外では向聴数と何切る)
2. **公開 URL**: `https://bluekurage119.github.io/mj-3player-calc/`
3. **スクリーンショット**: 2枚(3.3.1)。直前か直後に「画像はイメージです。」を1行置く
4. **できること**: 箇条書き5〜7項目(和了の役・飜・符・点数/聴牌時の和了牌ごとの点数/向聴数・有効牌/何切る/三麻ルール設定〔ツモ損方式・抜き北・ローカル役等〕/点数計算表/和了結果の共有画像/オフライン動作)。内容はヘルプ画面と矛盾させない
5. **使い方**: 2〜4行の概要と「詳しくはアプリ右上のメニューの『ヘルプ』を参照」という導線。ヘルプの内容を README に複写しない
6. **ホーム画面への追加(インストール)**: iOS / iPadOS(Safari の共有 → ホーム画面に追加)、Android(Chrome のメニュー → アプリをインストール または ホーム画面に追加)。各2〜3手順
7. **対応環境**: iOS / iPadOS の Safari、Android の Chrome(いずれも最新版を想定)。PC ブラウザでも動作するがスマホ向けの画面である旨。版の下限は書かない(ビルドターゲットは `safari15`・`chrome89` 等だが実機確認していないため)
8. **ライセンス**: 現 README の内容を維持(MIT、mahjong-calc 由来、`CREDITS.md`・`LICENSES/` への導線)。アプリ内のヘルプ → ライセンスでも確認できる旨を1文
9. **開発者向け**: `docs/development.md` へのリンク1行

**docs/development.md(新規)**: 現 README の「構成」「開発」「開発の進め方」の3節を移す。移すときにリンクを `docs/` 起点の相対パスに直す(例: `AGENTS.md` → `../AGENTS.md`、`docs/requirements.md` → `requirements.md`、`docs/rules/README.md` → `rules/README.md`)。あわせて次を追記する:

- デプロイ: `docs/design/issue-109-pages-deploy.md` 7章の要約(Actions の `Deploy` を main で手動実行)とリンク
- リリース: 8章の手順書の要約と、本設計書へのリンク

文面は現 README の記述を基本とし、内容を増やしすぎない。

#### 3.3.1 スクリーンショット

| 項目 | 方針 |
| --- | --- |
| 撮影対象 | 2枚。(1) 和了の結果(役・点数が見える状態) (2) 何切るの結果。手牌は製造担当が選んでよい(役なしでない、画面に収まるもの) |
| 保存場所 | `docs/images/`(`screenshot-hora.png`・`screenshot-nanikiru.png`)。`public/` に置くと `dist/` にコピーされ Workbox の precache 対象になり、利用者の初回ダウンロードが増えるため避ける |
| 撮影方法 | `npm run build` → `npx vite preview` の本番ビルドを、幅 375px(CSS px)・ライトテーマで撮る |
| 解像度 | 幅 750px(DPR 2)。高さは結果が見える範囲で切り取る(目安 1,000〜1,400px) |
| サイズ上限 | 1枚 300 KB 以下、合計 500 KB 以下(リポジトリ肥大の抑制。配布物には入らない) |
| 最適化 | PNG。可逆圧縮ツールで最適化する(macOS 標準の `sips` で再保存、または既存環境にあるツール。**新しい npm 依存は導入しない**)。上限を超える場合は高さを詰める |
| README での表示 | `<img src="docs/images/…" width="300" alt="…">` で横に並べる。alt は日本語で内容を書く |

撮影者・撮影手段は【設計案】(要ヒアリング事項 Q2)。製造担当が撮影できない場合、README からスクリーンショット節を外さず、画像だけ後続コミットで追加できるよう、**画像が未配置のままリンクをコミットしない**(画像が揃わなければ節ごと保留し、最終報告に書く)。

### 3.4 リリースノート下書き

`docs/release-notes/v1.0.0.md` を新規作成する。冒頭に次の注記を置く:「この文書は GitHub Release 用の下書きである。オーナーの監修前に公開しない。」本文は次の案をそのまま置き、製造担当は事実関係(機能名・Issue 番号)だけ実物と照合して直す。

```markdown
# 三麻点数計算機 v1.0.0

三人麻雀に特化したスマホ向けの点数計算機です。
https://bluekurage119.github.io/mj-3player-calc/

## できること
- 和了形の役・飜・符・点数(ロン・ツモ)
- 聴牌形の和了牌ごとの役と点数
- 向聴数と有効牌、何切る(切る牌ごとの向聴数と受け入れ)
- 三麻のルール設定(ツモ損方式、抜き北、ローカル役 など)とプリセット
- 点数計算表
- 和了結果の共有画像(共有・保存・コピー)
- ホーム画面への追加と、オフラインでの利用

## 対応環境
- iOS / iPadOS の Safari、Android の Chrome(いずれも最新版を想定)

## 既知の制約
- 本場・供託・点差の計算は未対応です(v2 で予定)。
- (案A/案B: #95 の扱い。下記)

## v2 以降の予定
- #106、#105、#85、#58、#111、#112、#113 の各項目(各 Issue のタイトルを1行ずつ記載)
```

- v2 予定の各行は、製造担当が `gh issue view <番号> --json title` で取得したタイトルで書く(上の表記は骨組み)。#92 は載せない。
- 「本場・供託・点差」の行は H1-1・H1-2(v2 切り出し)に基づく例である。該当 Issue 番号が上記 v2 一覧のどれに当たるかを製造担当が照合し、重複する場合は「既知の制約」から外して v2 予定側に寄せる。
- **振聴・裏ドラ欄の無効化 UI は載せない**(確定事項)。
- **#95(ランダム入力での状況役と副露・抜き北の正規化)の扱いは【設計案】**。次のどちらかをオーナーが選ぶ(要ヒアリング Q1)。
  - 案A(載せない): 起案しない項目なので既知の制約にも載せない。利用者が気づきにくい挙動で、記載すると混乱を招く。
  - 案B(載せる): 「ランダム入力では、状況(立直・一発 等)と副露・抜き北の組み合わせを補正しません」と1行載せる。透明性は上がるが、ランダム入力自体が補助機能のため影響は小さい。
  - 製造担当は既定で**案A**で書き、案B の文面をファイル末尾の「監修メモ」節に残す。
- **2飜縛りでの一発の扱い**(じゃんたま・一番街での挙動が未確認)はリリースノートに書かない。ファイル末尾の「監修メモ」節に「未確認・申し送り」として1行残す(本文への掲載可否はオーナー監修で判断)。

## 4. バンドル(09号)

- **計測方法**: 09号どおり。`npm run build` 後、`dist/index.html` の `<script type="module" src>` と `<link rel="modulepreload" href>` が指す `assets/*.js` を `gzip -9 -c <file> | wc -c` で測り合計する。`registerSW.js`(`/mj-3player-calc/registerSW.js`、`assets/` 外の SW 登録スクリプト)は従来から合計に含めていない。
- **基準値(設計時実測)**: **128,879 B**。origin/main d7fab4b を 2026-11-16 に `git archive` でクリーンな作業ディレクトリへ展開し、`npm run build:wasm`・`npm ci`・`npm run build` の後に `assets/index-DR0Glxqm.js` を測った(modulepreload なし)。統括担当の申告値と一致。参考: 遅延チャンク `HelpScreen-*.js` は 3,325 B(gzip -9)。
- 09号の「現在の基準値」(125,908 B、E4 完了後)は、その後のマージ(F・G・H 系)で更新されていない。本 Issue でまとめて確定する。
- **増分の積算**: 初回 JS **+0 B**。版番号の表示は遅延チャンク `HelpScreen-*.js` に入る(数十 B 程度の増)。`define` はビルド時の文字列置換で、`vite.config.ts` 自体はバンドルに入らない。`package.json` を `src/` から import しない(テストのみ)。
- **目標値**: 128,879 B(+0)。超過しても不合格にしない(09号)。
- **確定と 09号の更新(製造範囲)**: 製造担当は実装後に実測し、`docs/rules/09-bundle-budget-protocol.md` の「現在の基準値」を**製造後の実測値**に書き換える。確定の根拠(計測したコミット、日付、ファイル名、2回の実測が同値であること)を既存の書式で書き、旧値 125,908 B を表に残したうえで、次の2行を表に追記する。
  - `G3 設計時(main d7fab4b)` | `128,879 B` | E4 以降(F・G・H 系)の累積。内訳は未調査
  - `G3 PR(v1.0.0)` | `<実測値> B` | 基準 128,879 B との差
- 「マージ後の値が基準値」(09号 8)との整合: 本 Issue はブランチ上の実測値で確定させる。マージで他の変更が入らない限り同値になる。検収担当はマージ直前の main との差分が本 Issue のみであることを PR 本文で示す。

## 5. 変更するファイル一覧

| ファイル | 種別 |
| --- | --- |
| `package.json`・`package-lock.json` | 版番号 |
| `vite.config.ts` | `define` 追加 |
| `src/app-version.d.ts` | 新規 |
| `src/ui/screen/HelpScreen.tsx`・`src/ui/help/help.css`・`src/ui/screen/HelpScreen.test.tsx` | 版番号表示・テスト |
| `README.md` | 改訂 |
| `docs/development.md` | 新規 |
| `docs/release-notes/v1.0.0.md` | 新規 |
| `docs/images/screenshot-*.png` | 新規(Q2 次第) |
| `docs/rules/09-bundle-budget-protocol.md` | 基準値更新 |

コミット粒度の例: (1) 版番号と注入・表示・テスト (2) README・development.md・画像 (3) リリースノート下書き (4) 09号更新。

## 6. 受け入れ条件

検収担当は上から順に実行する。プレビューサーバーは確認後に必ず停止する(G-02)。

- **AC-1 版番号**: `node -p "require('./package.json').version + ' ' + require('./package.json').private"` が `1.0.0 true`。`node -p "const l=require('./package-lock.json'); l.version+' '+l.packages[''].version"` が `1.0.0 1.0.0`。`git diff origin/main -- package-lock.json` の差分がこの2行のみ。
- **AC-2 タグ・Release を作っていない**: `git tag --points-at HEAD` が空。`git ls-remote --tags origin v1.0.0` が空(製造・検収がタグを作っていない)。
- **AC-3 注入**: `vite.config.ts` に `define` があり、`package.json` を読んで `__APP_VERSION__` を設定している(目視)。`src/` 配下に `'1.0.0'` のハードコードが無い: `grep -rn "1\.0\.0" src` がテストファイル以外でヒットしない。
- **AC-4 テスト**: `npx vitest run src/ui/screen/HelpScreen.test.tsx` で G3-T1〜T3 を含む全テストが通る。G3-T1 は `package.json` の version を一時的に `9.9.9` にすると失敗し、G3-T2 は通る(テストの有効性確認。確認後に必ず戻し、`git diff package.json` が空であることを確かめる)。
- **AC-5 静的検査**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラーなし。
- **AC-6 本番ビルドの表示(375px)**: `npm run build` → `npx vite preview`。ブラウザで `http://localhost:4173/mj-3player-calc/` を幅 375px で開く。(a) メイン画面で `document.documentElement.scrollWidth <= document.documentElement.clientWidth` が `true`。(b) メニュー → ヘルプを開き、末尾に「バージョン 1.0.0」が表示され、同条件で横スクロールが無い。(c) 「バージョン 1.0.0」の要素の `getComputedStyle(el).color` が、`help.css` で指定したトークンの計算値と一致する。スクリーンショットを PR に添付する。
- **AC-7 本番ビルドのオフライン準備**: AC-6 の preview で、(a) `navigator.serviceWorker.getRegistration()` の `active.state` が `activated`、`scope` が `http://localhost:4173/mj-3player-calc/`。(b) 再読み込み後 `navigator.serviceWorker.controller` が非 null。(c) `caches.keys()` の precache に `index.html`・`*.wasm`・`HelpScreen-*.js` が含まれる(`(await Promise.all((await caches.keys()).map(async k => (await (await caches.open(k)).keys()).map(r => r.url)))).flat()` で確認)。(d) `docs/images/` の画像が precache に**含まれない**。実ネットワーク遮断下の動作は G1 で実機確認済み(2.3)。ブラウザペインで通信遮断を再現できる場合は、遮断して再読み込みし画面が出ることも確認してよい(任意)。
- **AC-8 初回 JS 計測**: 4章の方法で実測し、基準値 128,879 B・実測値・増分・積算(+0 B)との差を PR 本文に書く。超過は不合格にしない。`dist/` に `docs/images` 由来のファイルが無い(`find dist -name 'screenshot-*'` が空)。
- **AC-9 09号の更新**: `docs/rules/09-bundle-budget-protocol.md` の「現在の基準値」が AC-8 の実測値と一致し、根拠の記述と表の2行(4章)がある。旧値 125,908 B の行が残っている。
- **AC-10 README**: 3.3 の節1〜9が順にある。公開 URL が `https://bluekurage119.github.io/mj-3player-calc/`。ヘルプへの導線、iOS・Android のインストール手順、`CREDITS.md`・`LICENSES/`・`docs/development.md` へのリンクがある。スクリーンショットがある場合「画像はイメージです。」の注記がある。開発コマンド(`npm run build:wasm` 等)が README に残っていない。
- **AC-11 リンク整合**: README と `docs/development.md` の相対リンクがすべて実在する。例: `grep -o '](\([^)#]*\))' README.md docs/development.md` で抽出したパス(http で始まるものを除く)を、各ファイルのディレクトリ起点で `test -e` し、全件存在する。`img src` のパスも同様。`grep -rn "README.md#" docs AGENTS.md` で README の旧節へのアンカーリンクが無い。
- **AC-12 画像**: `docs/images/` の各 PNG が 300 KB 以下・合計 500 KB 以下(`ls -l`)。`sips -g pixelWidth docs/images/*.png` が 750。`public/` に画像を追加していない(`git diff --stat origin/main -- public` が空)。
- **AC-13 リリースノート**: `docs/release-notes/v1.0.0.md` の冒頭に「オーナーの監修前に公開しない」旨の注記がある。「できること/対応環境/既知の制約/v2 以降の予定」の4節がある。v2 予定に #106 #105 #85 #58 #111 #112 #113 の7件があり #92 が無い。「振聴」「裏ドラ」の無効化に関する記述が無い(`grep -n "振聴" docs/release-notes/v1.0.0.md` が空)。末尾に「監修メモ」節(#95 の案B 文面、2飜縛りでの一発の未確認事項)がある。
- **AC-14 変更範囲**: `git diff --stat origin/main` が5章の一覧に収まる。`.github/workflows/deploy.yml` に差分が無い。ホームディレクトリ名がコード・ドキュメントに無い(`git diff origin/main | grep -n "/Users/"` が空)。

## 7. リスク・注意点

- `npm version` は `--no-git-tag-version` を付けないとタグとコミットを作る。必ず付ける(AC-2)。
- `define` の識別子はグローバル置換される。`__APP_VERSION__` 以外の名前と衝突させない。Vitest でも `vite.config.ts` が読まれるため注入は効くが、将来 `vitest.config.ts` を分離した場合は `define` も引き継ぐ必要がある(引き継ぎ事項)。
- README の「できること」はヘルプ画面・実装と食い違わせない。機能の有無は実物で確かめる。
- スクリーンショットを `public/` に置くと配布物と precache が増える(AC-7d・AC-12 で検出)。
- 09号の基準値はブランチ上の実測で確定する。マージ前に main が進んだ場合は、検収担当が再計測して PR 本文と 09号を合わせる。

## 8. オーナー向け手順書(タグ・GitHub Release)

統括・製造・検収は行わない。PR マージ後にオーナーが行う。

1. **マージの確認**: `git fetch origin` の後、`git merge-base --is-ancestor <マージコミット> origin/main && echo ok` が `ok`。
2. **公開前チェック**
   - main の CI が成功している。
   - Actions → `Deploy` を main で実行し(09号ではなく #109 設計書 7章の手順)、`https://bluekurage119.github.io/mj-3player-calc/` でヘルプ末尾に「バージョン 1.0.0」が出る。
   - `docs/release-notes/v1.0.0.md` を監修し、「監修メモ」節の判断を済ませる(Release 本文には監修メモと冒頭注記を含めない)。
3. **タグ**: マージコミット(=デプロイした main のコミット)に注釈付きタグを打つ。
   ```bash
   git checkout main && git pull --ff-only
   git tag -a v1.0.0 -m "v1.0.0" <マージコミット>
   git push origin v1.0.0
   ```
4. **Release**: 監修済み本文を別ファイル(例: リポジトリ外の一時ファイル)に用意して作成する。まず下書きで作って表示を確かめてから公開すると安全。
   ```bash
   gh release create v1.0.0 --title "v1.0.0" --notes-file <監修済み本文のファイル> --verify-tag --draft
   # GitHub 上で表示を確認後
   gh release edit v1.0.0 --draft=false
   ```

## 9. 後続 Issue への引き継ぎ

- 次の版から、`package.json` の version を上げるとヘルプの表示も自動で変わる。版の上げ方(`npm version <x> --no-git-tag-version`)とタグ・Release の手順は本設計書 8章を流用する。
- v2 持ち越し: #106 #105 #85 #58 #111 #112 #113。#92 は後回し。
- 2飜縛りでの一発の扱い(じゃんたま・一番街)は未確認。ルール面の調査が必要なら別 Issue で扱う。
- 09号の基準値は本 Issue のマージ後の値。
- `vitest.config.ts` を分離する場合は `define` を引き継ぐ。
