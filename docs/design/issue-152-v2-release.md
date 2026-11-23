# Issue #152 設計書: v2.0.0 リリース（ヘルプ・文書整備・版番号更新・受け入れ確認・リリース手順）

- 対象 Issue: #152（`v2.0` マイルストーン）
- 基準コミット: `develop/v2.0` `9daba3f`（2026-11-24 時点、PR #168・#169・#175・#176 マージ済み）
- PR の base ブランチ: `develop/v2.0`（本 Issue の準備 PR）
- 状態: 設計作成済み（ヒアリング確定事項 Q1〜Q6 反映済み）
- 設計担当モデル: Gemini 4 Neon

---

## 1. 目的と範囲

Version 2.0.0 を公開できる状態にする。`develop/v2.0` で実装した何切る確率・期待値シミュレーション（F3）および関連 UI/PWA 改善を整理し、ヘルプ・README・リリースノート下書き・各種プロジェクト文書・版番号・バンドル基準値を仕上げ、ローカル本番ビルドによる受け入れ確認までを完了する。

### 1.1 本 Issue の製造・検収範囲

1. **ヘルプ文言の確定と「巡目」表記の統一**:
   - `src/ui/screen/HelpScreen.tsx` の「確率・期待値」節の仮置きコメントおよび `i巡目` 表記を解消し、確定文面へ差し替える。
   - 同ファイルの「点数計算表」節に本場（#105）・点差・供託（#106）を反映する。
   - 画面表示（`src/ui/engine/EngineResult.tsx`）・`src/ui/engine/engine.css` のコメント・関連テストの「順目」を「巡目」へ統一する。
2. **`README.md` の更新**:
   - 「できること」に v1.1〜v2.0 の新機能を追記し、「対応環境」に Firefox 114+ のモジュール Worker 要件を注記する。既存スクリーンショット 2 枚は維持する。
3. **リリースノート下書きの新規作成**:
   - `docs/release-notes/v2.0.0.md` をオーナー監修用下書きとして新規作成する（冒頭に「オーナー監修前は公開しない」注記を置く）。
4. **事前審査の文書整理の同梱**:
   - `docs/mahjong-rules.md` §4.3 の `【設計案】` → `【確定】` 更新。
   - `docs/design/issue-123-cloud-run-preview.md` の環境固有識別子のプレースホルダ化。
   - `docs/license-policy.md`（23 行目）の管理外 `Cargo.lock` 参照の整理。
   - `docs/requirements.md`・`docs/development.md`・`AGENTS.md` の v2.0 反映および表崩れ修正。
   - `docs/rules/09-bundle-budget-protocol.md` のバンドル基準値を製造後の実測値へ確定更新。
5. **版番号更新とテスト追従**:
   - `package.json`・`package-lock.json` を `2.0.0-dev` → `2.0.0` へ更新し、`src/ui/screen/HelpScreen.test.tsx` を追従させる。
6. **本番ビルドのローカル受け入れ確認**:
   - 検収担当がローカル本番ビルドで版番号 `2.0.0`・375px 幅表示・Service Worker / precache（両 WASM および Worker 含む）・初回 JS 実測を確認する。

### 1.2 スコープ外

- `develop/v2.0` → `main` の最終統合 PR の作成・マージおよび `develop/v2.0` ブランチの削除（§8.1 のオーナー操作）。
- GitHub Pages への手動デプロイ（§8.2 のオーナー操作）。
- 注釈付きタグ `v2.0.0` の作成・GitHub Release 作成・ビルド生成物 `v2.0.0.zip` のアップロード（§8.3 で統括・エージェント側が、オーナーの統合マージ・デプロイ確認・リリースノート監修後に実施）。
- スクリーンショットの新規撮影・差し替え。
- `.github/workflows/` 配下（`ci.yml`・`deploy.yml`・`preview-cloud-run.yml`）および `public/` 配下の変更。
- 計算コア（`src/core/`）・計算エンジン本体（`src/engine/`・`wasm/`）のロジック変更。
- 過去の設計書（`docs/design/issue-139-ui.md`・`docs/design/issue-150-151-engine-screen-tests.md` 等）に残る当時記録の「順目」表記の書き換え（ただし `docs/design/issue-123-cloud-run-preview.md` の伏せ字化のみ本 Issue 対象）。

**製造・検収は `git tag`・`gh release create`・`develop/v2.0` → `main` 統合 PR 作成・デプロイを実行しない。**

---

## 2. 参照資料と設計判断の根拠

### 2.1 ヒアリング確定事項（統括担当経由のオーナー承認済み・再検討しない）

| # | 確定事項 | 本設計での反映 |
| --- | --- | --- |
| Q1 | **ヘルプ文言・表記統一（A案）**: `HelpScreen.tsx`（325–367 行付近）の仮置きコメント・`i巡目` 表記を解消し確定文面へ差し替え（18 回方針の累積近似・4 向聴以上対象外・一人麻雀/ツモ和了のみ・本場/供託除外を明記）。「点数計算表」節に本場（#105）・点差・供託（#106）を反映。画面表示・`aria-label`・ヘルプ・`engine.css` コメント・関連テストを「巡目」に統一 | §3.1 |
| Q2 | **`README.md`（A案）**: 「できること」に v1.1〜v2.0 の新機能（何切る確率・期待値シミュレーション、点数計算表の本場・点差・供託、十三不搭メッセージ）を追記。対応環境に Firefox 114+ のモジュール Worker 要件を注記。スクリーンショットは既存 2 枚を維持（新規撮影なし） | §3.3 |
| Q3 | **リリースノート（A案）**: `docs/release-notes/v2.0.0.md` をオーナー監修用下書きとして新規作成（冒頭に公開前注記）。主な変更点（v1.1.0 からの差分: F3 シミュレーション、#142、#158、#159、#166、#164、#165）、既知の制約（一人麻雀・ツモ和了のみ・18 回方針近似・4 向聴以上対象外・裏ドラ近似・本場/供託除外、手動テーマと OS 逆転時の `theme-color` 差・PWA 起動背景の暗色固定、`prefers-reduced-motion` 時の静止表示、Firefox 89〜113 非対応）、今後の予定（`v2.0.1`: #124・#162・#167・#171〜#174、`v2.1`: #58・#112・#113）を記載 | §3.4 |
| Q4 | **事前審査の文書整理の同梱（確定）**: `docs/mahjong-rules.md` §4.3 の `【設計案】` → `【確定】` 更新、`docs/design/issue-123-cloud-run-preview.md` の環境固有識別子のプレースホルダ化（コミット文・PR 本文に具体値を書かない）、`docs/license-policy.md:23` の管理外 `Cargo.lock` 参照整理、`docs/requirements.md`・`docs/development.md`・`AGENTS.md` の更新、`docs/rules/09-bundle-budget-protocol.md` 基準値の更新 | §3.5・§4 |
| 版番号 | `package.json`・`package-lock.json` を `2.0.0-dev` → `2.0.0` へ更新（`npm version 2.0.0 --no-git-tag-version`）。`HelpScreen.test.tsx` の版番号テスト（G3-T1 等）を `2.0.0` に追従 | §3.2 |
| Q5 | **受け入れ確認**: オーナー実機確認済みの事実を記録（Cloud Run プレビューにて、`#166` スナックバー以外の全項目＝オフライン時の何切る計算・中止、PR #160 未確認 2 項目、PR #163 未確認項目は異常なし確認済み）。検収担当は自動・ローカル本番ビルド確認（版番号 `2.0.0`・375px 幅表示・SW/precache〔両 WASM + Worker 含む〕・初回 JS 実測）を実施。`#166` スナックバーは本番/プレビュー更新時にオーナー確認 | §2.3・§6 |
| Q6 | **統合・デプロイ・リリース作業の役割分担**: `#152` 準備 PR は `develop/v2.0` 向け。その後 `develop/v2.0` → `main` 最終統合 PR を merge commit でマージし同時に `develop/v2.0` 削除（オーナー操作）。GitHub Pages 手動デプロイはオーナー実施。注釈付きタグ `v2.0.0`・GitHub Release・ビルド生成物 `v2.0.0.zip` のアップロードは統括・エージェント側が実施（オーナーの統合マージ・デプロイ確認・リリースノート監修後） | §8 |

### 2.2 実物調査結果（`develop/v2.0` `9daba3f`）

- `package.json` / `package-lock.json`: `version` は `"2.0.0-dev"`、`package.json` の `"private": true`。`package-lock.json` の 3 行目（トップレベル）および 9 行目（`packages[""].version`）がいずれも `"2.0.0-dev"`。
- `vite.config.ts`: `package.json` から `version` を読み `define: { __APP_VERSION__: JSON.stringify(appVersion), ... }` で注入済み（Issue #110 で実装済み）。版番号変更のみでヘルプ末尾の表示が自動更新される。`build.target` は `['chrome89', 'edge89', 'firefox89', 'safari15', 'es2022']`、`worker.format` は `'es'`。
- `src/ui/screen/HelpScreen.tsx`:
  - 311–315 行「点数計算表」節は v1.0.0 時点のまま（本場・点差・供託の記述なし）。
  - 325 行に仮置きコメント `{/* 本文は仮置き(文言はオーナー監修で差し替える。材料は Issue #139 設計書 §1) */}` があり、337 行に `i巡目` 表記がある。また本場・供託除外の記述がない。
- `src/ui/screen/HelpScreen.test.tsx`:
  - `G4-T4`（37 行）は `'メニューの「点数計算表」で、符・飜ごとのロンとツモの点数を確認できます。'` を部分一致検証している。
  - `G3-T1`（73–77 行）は `'バージョン 2.0.0-dev'` を完全一致検証している。
  - `Issue #139 U-11`（109–110 行）は `'一人麻雀'` と `'裏ドラは牌が決まらない'` を部分一致検証している。
- `src/` 配下の「順目」検索結果（`grep -rn "順目" src/`）:
  - `src/ui/engine/EngineResult.tsx:213`: `{displayTurn}順目`
  - `src/ui/engine/engine.css:156`: コメント内 `「n順目」`
  - `src/ui/engine/engine-view.test.tsx:180, 182, 184, 187, 188, 191, 366`
  - `src/ui/screen/EngineScreen.test.tsx:582, 590`
  - `aria-label` の検索結果（`grep -rn "aria-label" src/ui/engine/`）: `EngineResult.tsx:217` の `label="巡目"` および `TurnChart.tsx:61` の `aria-label="巡目ごとの推移"` は既に「巡目」であり修正不要。
- `docs/images/`: `screenshot-hora.png`（116,138 B）・`screenshot-nanikiru.png`（269,961 B）の 2 枚が配置済み。
- `AGENTS.md`: 79 行目の表ヘッダーは 6 列だが、80 行目の GFM 区切り行は 5 列（`| --- | --- | --- | --- | --- |`）で列崩れがある。§1・§5・§6 に `wasm/engine/`・`test:engine-mc`・`build:engine-bench` の記載がない。
- `docs/mahjong-rules.md`: §4.3（181 行）が `【設計案】` のまま残っている。
- `docs/license-policy.md`: 23 行目の確認方法欄に Git 管理外の `wasm/engine/Cargo.lock` が記載されている（`CREDITS.md` 97 行目では `Cargo.lock` を管理していない旨が明記されている）。
- `docs/requirements.md`: §1（12 行目）・§3.4（49 行目）・§4（78 行目）に「v1 の後に回す」「v2 で採用予定」等の v1 時点の時制が残っている。
- `docs/development.md`: 構成に `wasm/engine/`・`src/engine/` がなく、コマンド表に `test:engine-mc`・`build:engine-bench` がない。リリース節が `issue-110-v1-release.md` のみを指している。
- `v2.0` マイルストーンのオープン Issue: `#152` および `#170`（PR #176 で `develop/v2.0` へマージ済みだが、統合ブランチ運用の仕様により未クローズ。§8.1 でクローズ確認対象に含める）。

### 2.3 実機確認済みの事実（本 Issue の検収では再確認しない）

統括担当の報告による。以下の項目は Cloud Run プレビュー環境にてオーナーが実機で確認済みであり、異常がないことが確定している。本 Issue の検収チェックリストには含めず、PR 本文に確認済みの事実として記録する。

| 項目 | 確認場所・状態 |
| --- | --- |
| オフライン時の何切る確率・期待値計算および計算中止 | Cloud Run プレビューにてオーナー実機確認済み（異常なし） |
| PR #160（Issue #158: iOS 27 ステータスバー強制ブラー対策）の未確認 2 項目 | Cloud Run プレビューにてオーナー実機確認済み（異常なし） |
| PR #163（Issue #159: 円形プログレスインジケーター置換）の未確認項目 | Cloud Run プレビューにてオーナー実機確認済み（異常なし） |
| v1.0.0 時点の基本実機項目（iOS/Android ホーム画面追加・アイコン・オフライン起動・ヘルプ・ライセンス） | v1.0.0（Issue #110 §2.3）で確認済み |

**実挙動未確認の項目（検収完了時点）**:
- Issue #166 の PWA 更新通知スナックバーの実機挙動（本番/プレビュー更新時にオーナーが確認する）。
- GitHub Pages 公開 URL への v2.0.0 デプロイ後の実機表示およびヘルプ末尾の「バージョン 2.0.0」表示（§8.2 でオーナーが確認する）。
- `develop/v2.0` → `main` 最終統合マージ、タグ `v2.0.0`、GitHub Release 作成、`v2.0.0.zip` 添付（§8.1〜§8.3）。

### 2.4 外部事実の確認記録

| 確認項目 | 実行コマンド | 確認結果 |
| --- | --- | --- |
| 現在のブランチ・HEAD・作業ツリー | `git status --porcelain && git rev-parse --short HEAD && git branch --show-current` | クリーン（差分なし）、HEAD `9daba3f`、ブランチ `develop/v2.0` |
| Issue #152 の状態・本文 | `gh issue view 152 --json number,title,body,milestone,state` | OPEN、マイルストーン `v2.0`、タイトル「v2.0.0 リリース」 |
| `v2.0` マイルストーン全 Issue の状態 | `gh issue list --milestone "v2.0" --state all --json number,title,state` | 全 16 件中、`#152`・`#170` が OPEN（`#170` は PR #176 で `develop/v2.0` マージ済み）、他 14 件は CLOSED |
| 関連 Issue のタイトル（v2.0 差分・v2.0.1・v2.1） | `for n in 111 138 139 142 158 159 164 165 166 124 162 167 171 172 173 174 58 112 113; do gh issue view "$n" --json number,title,state ...; done` | 全 19 件の番号・状態・正確なタイトルを取得済み（§3.4 に反映） |
| v1.1.0 GitHub Release の添付アセット前例 | `gh release view v1.1.0 --json tagName,name,assets` | `tagName: "v1.1.0"`, `name: "v1.1.0"`, アセット `v1.1.0.zip`（327,490 B） |
| 現 HEAD 本番ビルドの初回 JS・関連アセット実測 | `npm run build` 後、`dist/index.html` 参照先を `gzip -9 -c <file> \| wc -c` で計測 | 初回 JS `dist/assets/index-DITob5rL.js` **131,291 B**（生 487,710 B、`modulepreload` なし）。precache 66 エントリ（1279.52 KiB）。詳細は §4 |
| `dist/sw.js` の precache 対象確認 | `grep -oE 'assets/(decomposer_bg\|engine_bg\|worker\|HelpScreen\|EngineScreen)[^"]+' dist/sw.js \| sort -u` | `decomposer_bg-*.wasm`・`engine_bg-*.wasm`・`worker-*.js`・`HelpScreen-*.js/.css`・`EngineScreen-*.js/.css` がすべて precache 対象であることを確認 |
| `src/` 配下の「順目」・`aria-label` 実物確認 | `grep -rn "順目" src/ docs/` および `grep -rn "aria-label" src/ui/engine/` | `src/` の「順目」は 4 ファイルのみ（§2.2 記載）。`aria-label` はすべて「巡目」で統一済み |

---

## 3. 変更内容の詳細設計

### 3.1 ヘルプ文言の確定と「巡目」表記の統一

#### 3.1.1 `src/ui/screen/HelpScreen.tsx`

1. **「点数計算表」節（311–315 行）の更新**:
   - 既存テスト `G4-T4` が 1 文目 `'メニューの「点数計算表」で、符・飜ごとのロンとツモの点数を確認できます。'` を部分一致検証しているため、1 文目は変更しない。
   - 2 文目に本場（#105）・点差・供託（#106）を反映する。確定文面は次のとおり:

   ```tsx
   <h3 className="help-screen__subheading">点数計算表</h3>
   <p>
     {`メニューの「点数計算表」で、符・飜ごとのロンとツモの点数を確認できます。親・子の切り替えに加え、本場(積み棒)を反映した点数や、供託を含めた相手との点差表示にも切り替えられます。表は、設定の「${tsumoLossLabel}」「${roundedManganLabel}」「${accumlatedYakumanLabel}」「${doubleWindFuLabel}」に合わせて変わります。`}
   </p>
   ```

2. **「確率・期待値」節（325–368 行）の更新**:
   - 325 行の仮置きコメント `{/* 本文は仮置き(文言はオーナー監修で差し替える。材料は Issue #139 設計書 §1) */}` を削除する。
   - `i巡目` 表記を解消し、確定要件（18 回方針の累積近似・4 向聴以上対象外・一人麻雀/ツモ和了のみ・本場/供託除外・裏ドラ確率近似等）を網羅した確定文面へ差し替える:

   ```tsx
   <div id="help-engine" className="help-screen__anchor">
     <Disclosure summary="確率・期待値" defaultOpen={focus === 'engine'}>
       <div className="help-screen__body">
         <p>
           {
             '手牌から先の和了率・聴牌率・期待値を、巡目ごとに概算します。他家の和了・鳴き・流局は考えない一人麻雀で、ツモ和了だけを数えます。'
           }
         </p>
         <ul>
           <li>
             {
               '18巡分のツモを見込んだ期待値最大の方針を基準に、各巡目から18巡目までの累積値を近似計算します。1巡目が残り17回のツモ、18巡目が残り0回(和了率0%、聴牌率は聴牌の手なら100%)に対応します。配牌直後の手なら実際の巡目と一致し、途中の手ではずれます。'
             }
           </li>
           <li>
             {
               '門前は聴牌したらすぐ立直し、聴牌後は待ちを変えません。役がない聴牌は、聴牌には数えますが和了には数えません。'
             }
           </li>
           <li>
             {
               '一発・ダブル立直・天和・地和・海底は含めません。立直棒の1000点は引かず、本場(積み棒)と供託も計算に含めません。'
             }
           </li>
           <li>
             {
               '前提として、場風・自風・ドラ表示牌・抜き北を使います。山と裏ドラは近似で計算し、裏ドラは牌が決まらないため画面には出さず確率で近似します。'
             }
           </li>
           <li>
             {
               '方針は期待値が最大になる打ち方です。条件を変えると、和了率・聴牌率が下がることがあります。'
             }
           </li>
           <li>
             {
               '「概算」は手替わりを制限した計算です。「手替わりを詳しく」は制限をゆるめるぶん、時間がかかります。4向聴以上の手牌は計算対象外です。'
             }
           </li>
         </ul>
       </div>
     </Disclosure>
   </div>
   ```

   - 既存の `HelpViewProps` シグネチャ、`<div id="help-engine">`・`Disclosure` 構造、および既存の `HelpScreen.test.tsx` が検査する `'一人麻雀'`・`'裏ドラは牌が決まらない'` はすべて維持する。

#### 3.1.2 「巡目」表記の統一対象

| ファイル | 箇所 | 変更前 | 変更後 |
| --- | --- | --- | --- |
| `src/ui/engine/EngineResult.tsx` | 213 行 | `{displayTurn}順目` | `{displayTurn}巡目` |
| `src/ui/engine/engine.css` | 156 行（コメント） | `「n順目」` | `「n巡目」` |
| `src/ui/engine/engine-view.test.tsx` | 180–191 行・366 行 | `3順目`・`17順目`・テスト名/コメントの `「n順目」` | `3巡目`・`17巡目`・テスト名/コメントの `「n巡目」`（`not.toContain('>3順<')` に加え `not.toContain('>3順目<')` も確認） |
| `src/ui/screen/EngineScreen.test.tsx` | 582 行・590 行 | `'3順目'`・`'10順目'` | `'3巡目'`・`'10巡目'` |

※ `EngineResult.tsx:217`（`label="巡目"`）および `TurnChart.tsx:61`（`aria-label="巡目ごとの推移"`）は既に「巡目」であり変更不要。

### 3.2 版番号更新とテスト追従

1. **版番号の更新**:
   - コマンドで `package.json` と `package-lock.json` を同時に更新する（**`--no-git-tag-version` を絶対に外さない**）:
     ```bash
     npm version 2.0.0 --no-git-tag-version
     ```
   - `package.json` の `"version": "2.0.0"`・`"private": true`、および `package-lock.json` のトップレベル `"version"` と `packages[""].version` の 2 行のみが `"2.0.0"` に変わっていることを `git diff package.json package-lock.json` で確認する。
2. **テスト更新（`src/ui/screen/HelpScreen.test.tsx`）**:
   - `G3-T1`: 期待値を `'バージョン 2.0.0-dev'` → `'バージョン 2.0.0'`、テスト名を `'G3-T1: renderHelpHtml() が「バージョン 2.0.0」を含む'` へ更新。
   - `G3-T2`・`G3-T3`: 既存のまま維持（`pkg.version` との一致・ライセンスボタンより後ろ）。
   - `Issue #139 U-11`（または新規テストケース `V2-H1`・`V2-H2` を追加）:
     - `V2-H1`: ヘルプの「確率・期待値」節に `i巡目` が含まれず、18 巡方針の近似・4 向聴以上対象外・本場と供託を含めない旨・一人麻雀/ツモ和了のみが含まれること。
     - `V2-H2`: ヘルプの「点数計算表」節に本場（積み棒）・供託・点差表示の記述が含まれること。

### 3.3 `README.md` の更新

既存の節構成（タイトル・公開 URL・スクリーンショット・できること・使い方・ホーム画面への追加・対応環境・ライセンス・開発者向け）および既存スクリーンショット 2 枚（`docs/images/screenshot-hora.png`・`docs/images/screenshot-nanikiru.png`、「画像はイメージです。」の注記）を維持したまま、以下を更新する。

1. **「できること」節**:
   - 既存 7 項目に v1.1〜v2.0 の新機能を自然に反映する（ヘルプ画面と矛盾させない）:
     - 向聴数・有効牌・何切るの項目に続けて（または独立項目として）「聴牌・向聴・何切るからの和了率・聴牌率・期待値シミュレーションと巡目ごとのグラフ表示」を追記。
     - 点数計算表の項目を「設定に連動した点数計算表の表示（本場の反映、供託を含む点差表示に対応）」へ更新。
     - 「ローカル役オン時の十三不搭の成立・チャンス案内」を追記（箇条書き全体は 8〜9 項目程度に簡潔にまとめる）。
2. **「対応環境」節**:
   - 既存の iOS / iPadOS Safari・Android Chrome・PC ブラウザの記述を維持し、次を追記する:
     - 「確率・期待値シミュレーションはモジュール Worker を使用するため、Firefox では 114 以降が必要です（Firefox 89〜113 では利用できません）。」

### 3.4 リリースノート下書き（`docs/release-notes/v2.0.0.md` 新規作成）

`docs/release-notes/v1.1.0.md` のトーンと構成を踏襲し、冒頭に公開前注記、末尾に「監修メモ」節を置く。

```markdown
> この文書は GitHub Release 用の下書きである。オーナーの監修前に公開しない。

# 三麻点数計算機 v2.0.0

三人麻雀に特化したスマホ向けの点数計算機（PWA）です。
https://bluekurage119.github.io/mj-3player-calc/

## 主な変更点（v1.1.0 からの差分）

### 何切る確率・期待値シミュレーション（#111・#138・#139・#150・#151・#153）
- 聴牌・向聴・何切るの結果から「計算」ボタンで専用画面を開き、巡目ごとの和了率・聴牌率・期待値を計算してグラフと候補一覧で確認できるようになりました（Rust/WASM 計算エンジン + Web Worker によるオフライン動作）。
- 「概算」と「手替わりを詳しく」の 2 段階の計算方式、1〜18 巡目の表示スライダー（再計算なしで即時切替）、和了率・聴牌率・期待値での並び替え、計算途中の取り消しに対応しています。
- 計算画面の候補ソートボタンのタップ領域を拡大しました（#165）。

### UI・PWA・権利表示の改善
- **ヘッダー下端部の仕上げ改善（#142）**: スクロール量に応じてヘッダー背景色が連続的に変化する MD3 on-scroll 表現へ改善し、固定カード・ダイアログとの重なり順を整理しました。
- **iOS 27 ステータスバー強制ブラー対策（#158）**: ステータスバー領域の透けを防ぐガード要素と `theme-color` 調整を行いました。
- **円形プログレスインジケーターへの置換（#159）**: 計算中表示を iOS Safari でも安定して描画される円形プログレスインジケーターへ置き換えました。
- **PWA 更新時の遅延チャンク 404 対策（#166）**: アプリ更新時に開いたままの旧タブで未訪問画面が 404 にならないよう、待機型 Service Worker と更新通知スナックバー・自動復旧を導入しました。
- **権利表示の拡充（#164）**: 新設の計算エンジン（`wasm/engine`）の推移的ランタイム依存（`bitflags`・`thiserror`）を `CREDITS.md` およびアプリ内ライセンス画面に追加し、見出しを統一しました。
- **ヘルプ・表記の整理（#152）**: ヘルプ画面の「確率・期待値」節と「点数計算表」節（本場・点差・供託）を更新し、表示表記を「巡目」に統一しました。

## 既知の制約
- **確率・期待値シミュレーションの前提と近似**:
  - 他家の和了・鳴き・流局を考慮しない一人麻雀モデルで、ツモ和了のみを数えます。
  - 18 巡分のツモを見込んだ期待値最大方針による累積近似です。4 向聴以上の手牌は計算対象外です。
  - 山と裏ドラは確率で近似します。一発・ダブル立直・天和・地和・海底は含めず、立直棒の 1,000 点は差し引きません。本場（積み棒）と供託も計算に含めません。
- **テーマ設定とステータスバー・起動背景（#158）**: アプリ内で手動テーマを OS と逆（例: OS ダーク＋アプリライト）に設定している場合、ステータスバーの `theme-color` とヘッダー色に差が生じます。また、PWA の起動時背景（`manifest` の `background_color`）は暗色固定です。
- **視覚効果を減らす設定（`prefers-reduced-motion`）**: OS で視覚効果を減らす設定が有効な場合、計算中の円形プログレスインジケーターは静止表示になります（#162 で見直し予定）。
- **Firefox の対応バージョン**: 確率・期待値シミュレーションはモジュール Worker を使用するため、Firefox 89〜113 では利用できません（Firefox 114 以降で対応）。

## 今後の予定
- **v2.0.1**:
  - H2-1. 共有画像のデザインの確定（#124）
  - 計算完了時のチェックマーク演出と、reduced-motion 時の表示方針の見直し（#162）
  - 巡目別期待値の計算方針（18 回目標方針 vs 残り回数最適）とヘルプ文言の見直し（#167）
  - Cloud Run プレビュー環境の未起票申し送り 3 点の整理（#171）
  - 計算画面・画面遷移の UI/状態改善（#172）
  - 計算エンジン・Worker の境界条件修正と境界自動テストの強化（#173）
  - CI への `cargo test` 追加と開発ツール・ワークフロー整備（#174）
- **v2.1**:
  - D4-1. スマート入力モード(仮称)（#58）
  - 牌画像のダークテーマ（#112）
  - 利用者プリセットの名前付き保存（#113）

差分: https://github.com/BlueKurage119/mj-3player-calc/compare/v1.1.0...v2.0.0

---

## 監修メモ（公開時にこの節と冒頭注記を削除する）
- v2.0.0 の公開対象となる機能・既知の制約・今後の予定の文面についてオーナー監修後に GitHub Release へ反映する。
- `#166` の更新通知スナックバーは本番/プレビュー更新時にオーナー実機確認を行う。
```

### 3.5 事前審査の文書整理（Q4 確定）

1. **`docs/mahjong-rules.md`（§4.3、181 行目）**:
   - `【設計案】一つの手牌・和了牌・ツモ/ロンに、...` を `【確定】一つの手牌・和了牌・ツモ/ロンに、...` へ更新する（#82 確定済み・#92 申し送り・本 Issue オーナー承認済み）。
   - 先頭の更新日（3 行目）に「2026-11-24（Issue #152 で §4.3 を【確定】へ更新）」を追記する。

2. **`docs/design/issue-123-cloud-run-preview.md` の環境固有識別子のプレースホルダ化**:
   - 対象箇所のすべての環境固有識別子を次のプレースホルダへ置換する（**コミットメッセージ・PR 本文にも具体値を書かない**）:
     - GCP プロジェクト ID → `<GCP_PROJECT_ID>`
     - GCP プロジェクト番号（12 桁） → `<GCP_PROJECT_NUMBER>`
     - 確定プレビュー URL 中のプロジェクト番号部分 → `https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/`
     - ランタイム SA 名 / メールアドレス → `<RUNTIME_SA_NAME>` / `<RUNTIME_SA_NAME>@<GCP_PROJECT_ID>.iam.gserviceaccount.com`
     - デプロイ SA 名 / メールアドレス → `<DEPLOYER_SA_NAME>` / `<DEPLOYER_SA_NAME>@<GCP_PROJECT_ID>.iam.gserviceaccount.com`
     - 無関係な既存サービス 4 件の固有名 → 個別名称を削除し「既存サービス 4 件」「既存他サービス」等の一般表現へ置換
     - 既存の WIF Pool 固有名 → 「既存の WIF Pool」等の一般表現へ置換
     - 専用 WIF Pool 名 → `<WIF_POOL>`
     - 既存共用 Artifact Registry リポジトリ名 → `<GAR_REPOSITORY>`
   - ※ `.github/workflows/preview-cloud-run.yml` は変更しない（文書整理のみ）。
   - ※ `docs/design/issue-123-cloud-run-preview.md` の冒頭メタデータ付近に「環境固有識別子は公開リポジトリ整理のためプレースホルダ表記へ置換済み（Issue #152）」と 1 行注記する。

3. **`docs/license-policy.md`（23 行目）**:
   - 23 行目の「確認方法」列にある管理外 `wasm/engine/Cargo.lock` への参照を削除し、次のように整理する:
     - `wasm/engine/Cargo.toml`（`shanten-dp = "=0.3.2"` の推移的依存）・上流リポジトリ（`bitflags/bitflags`・`dtolnay/thiserror`）の `LICENSE-MIT`・`CREDITS.md`
   - 備考として `CREDITS.md` と整合するよう、`Cargo.lock` を管理しないため推移的依存の版は固定していない旨と齟齬がない表記にする。

4. **`docs/requirements.md`（v2.0 反映）**:
   - 3 行目の更新日に Issue #152 の v2.0 反映を追記。
   - §1（12 行目）: `【確定】Version 1 のリリースを優先する。何切るの期待値計算(Epic F のフェーズ2)は v1 の後に回す` → `【確定】Version 1 のリリースを優先し、何切るの期待値計算(Epic F のフェーズ2)は v2.0 で実装した(Issue #111・#138・#139)`。
   - §3.4（49 行目）: `【確定】フェーズ2(v1 の後):` → `【確定】フェーズ2(v2.0 で実装済み):`（本文のクリーンルーム・`shanten-dp` 記述は維持）。
   - §4（78 行目）: `v2 で採用予定の何切る確率計算(mahjong-cpp 同等の機能。Issue #7 の F3)は対象外` → `v2.0 で実装した何切る確率・期待値計算(Issue #111・#138・#139)は Web Worker で非同期計算するため 100ms 以内の対象外`。
   - ※ §3.5（62 行目）や §4（93 行目）の `【設計案】` タグは勝手に `【確定】` へ変えない（絶対遵守事項 3.1.6）。

5. **`docs/development.md`**:
   - 「構成」節に以下を追記:
     - `wasm/engine/` — 何切る確率・期待値計算エンジン（Rust/WASM、`shanten-dp` 利用）
     - `src/engine/` — 計算エンジンの TypeScript 層・Web Worker クライアント
   - 「開発」節の初回手順およびコマンド表を更新:
     - `npm run build:wasm` の用途を「手牌分解器および計算エンジン（WASM）のビルド」へ更新（`wasm/decomposer/`・`wasm/engine/` の両方をビルドする旨）。初回手順の括弧内も `decomposer`・`engine` に更新。
     - `npm run test:engine-mc`（モンテカルロ精度検証テスト、`ENGINE_MC=1`）と `npm run build:engine-bench`（エンジン計測用ビルド）をコマンド表へ追記。
   - 「リリース」節に v2.0.0 の役割分担と手順書（[issue-152-v2-release.md](design/issue-152-v2-release.md#8-統合デプロイリリース手順書役割分担)）へのリンクを追記する。

6. **`AGENTS.md`**:
   - 79–80 行の GFM 表区切りを 6 列へ修正: `| --- | --- | --- | --- | --- | --- |`
   - §1（9 行目）および §5（103 行目）に、確率・期待値計算エンジン（`src/engine/`・`wasm/engine/`、Rust/wasm-pack で WASM 化）を追記。
   - §6（110–118 行）の主要コマンドに `npm run build:wasm` の対象（手牌分解器・計算エンジン両 WASM）を更新し、`npm run test:engine-mc`・`npm run build:engine-bench` を追記。

---

## 4. バンドル目標値（09 号）

### 4.1 設計時の基準値実測（`develop/v2.0` `9daba3f`）

- 計測日時: 2026-11-24
- 計測コマンド: `npm run build` 後、`dist/index.html` の `<script type="module" src>` と `<link rel="modulepreload" href>` が指す JS を `gzip -9 -c <file> | wc -c` で計測。
- 対象ファイル: `dist/assets/index-DITob5rL.js`（`modulepreload` なし）
- **設計時基準値（初回 JS）**: **131,291 B**（生サイズ 487,710 B、2 回計測で同値）
  - 参考（遅延チャンク・WASM・Worker。初回 JS 合計には含めない）:
    - `dist/assets/HelpScreen-CxsjweWo.js`: 4,107 B（gzip -9、生 11,941 B）
    - `dist/assets/EngineScreen-B3FiHuBG.js`: 11,653 B（gzip -9、生 42,143 B）
    - `dist/assets/engine_bg-BxECnJPS.wasm`: 24,462 B（gzip -9、生 54,897 B）
    - `dist/assets/decomposer_bg-BFXNTJCr.wasm`: 30,216 B（gzip -9、生 68,821 B）
    - `dist/assets/worker-OAZdGGHs.js`: 257 B（gzip -9、生 394 B）
    - Workbox precache: 66 エントリ（1,279.52 KiB）

### 4.2 増分の積算と目標値

| 変更内容 | 初回 JS 増分見込み | 根拠 |
| --- | --- | --- |
| `package.json` 版番号 `2.0.0-dev` → `2.0.0` | +0 B | 版番号表示は遅延チャンク `HelpScreen-*.js` に入る（文字数減で遅延チャンク側が数 B 減る程度） |
| `HelpScreen.tsx` 文言確定 | +0 B | 遅延チャンク `HelpScreen-*.js` のみ変化（数十〜百数十 B 程度の増減） |
| `EngineResult.tsx`（`順目` → `巡目`） | +0 B | 遅延チャンク `EngineScreen-*.js` 内の 1 文字置換のみ |
| `README.md`・`docs/`・`AGENTS.md`・テスト | +0 B | ビルド成果物に含まれない |
| **合計増分** | **+0 B** | 遅延チャンクのハッシュ文字列変化等により ±数 B 程度の揺らぎは許容 |

- **目標値**: **131,291 B**（基準値 131,291 B + 積算増分 +0 B）。09 号に従い、目標値超過を理由に不合格にしない。

### 4.3 `docs/rules/09-bundle-budget-protocol.md` の更新（製造範囲）

製造担当は実装後に `npm run build` を 2 回実行して初回 JS を実測し、同値であることを確認したうえで、`docs/rules/09-bundle-budget-protocol.md` の「現在の基準値」を製造後の確定実測値へ更新する。

- 旧基準値 `128,883 B`（v1.0.0 / G3）の行は履歴表にそのまま残す。
- 履歴表の末尾に次の 2 行を追記する:
  - `Issue #152 設計時(develop/v2.0 9daba3f)` | `131,291 B` | `v1.0.0 以降（v1.1.0・F3・#142・#158・#159・#166 等）の累積`
  - `Issue #152 PR(v2.0.0)` | `<実測値> B` | `基準 131,291 B との差 <増分> B（版番号・ヘルプ・巡目表記は遅延チャンク側）`

---

## 5. 変更対象ファイル一覧

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `package.json` | 変更 | `version` を `2.0.0` に更新（`private: true` 維持） |
| `package-lock.json` | 変更 | `npm version 2.0.0 --no-git-tag-version` による 2 行更新 |
| `src/ui/screen/HelpScreen.tsx` | 変更 | 「点数計算表」節へ本場・点差・供託反映、「確率・期待値」節の仮置きコメント・`i巡目` 解消と確定文面差し替え |
| `src/ui/screen/HelpScreen.test.tsx` | 変更 | `G3-T1` を `2.0.0` に更新、確定文面検証テスト追加・更新 |
| `src/ui/engine/EngineResult.tsx` | 変更 | `{displayTurn}順目` → `{displayTurn}巡目` |
| `src/ui/engine/engine.css` | 変更 | コメント `「n順目」` → `「n巡目」` |
| `src/ui/engine/engine-view.test.tsx` | 変更 | 「順目」→「巡目」追従 |
| `src/ui/screen/EngineScreen.test.tsx` | 変更 | `'3順目'`・`'10順目'` → `'3巡目'`・`'10巡目'` |
| `README.md` | 変更 | 「できること」へ v1.1〜v2.0 新機能追記、「対応環境」へ Firefox 114+ 注記 |
| `docs/release-notes/v2.0.0.md` | 新規 | オーナー監修用リリースノート下書き |
| `docs/mahjong-rules.md` | 変更 | §4.3 `【設計案】` → `【確定】`、更新日追記 |
| `docs/design/issue-123-cloud-run-preview.md` | 変更 | 環境固有識別子のプレースホルダ化 |
| `docs/license-policy.md` | 変更 | 23 行目の管理外 `Cargo.lock` 参照整理 |
| `docs/requirements.md` | 変更 | v2.0 反映（§1・§3.4・§4 78 行目・更新日） |
| `docs/development.md` | 変更 | `wasm/engine/`・`src/engine/`・`build:wasm`・`test:engine-mc`・`build:engine-bench`・リリース手順リンク追記 |
| `AGENTS.md` | 変更 | 80 行目の表区切り列崩れ修正、`wasm/engine`・コマンド追記 |
| `docs/rules/09-bundle-budget-protocol.md` | 変更 | v2.0.0 確定基準値の更新と履歴表 2 行追記 |

コミット粒度の目安:
1. 版番号更新・ヘルプ文言確定・「巡目」統一・テスト追従
2. `README.md`・`docs/release-notes/v2.0.0.md`
3. 事前審査の文書整理（`mahjong-rules.md`・`issue-123-cloud-run-preview.md`・`license-policy.md`・`requirements.md`・`development.md`・`AGENTS.md`）※ コミット文に環境固有識別子の具体値を書かない
4. `docs/rules/09-bundle-budget-protocol.md` の基準値確定更新

---

## 6. 受け入れ条件チェックリスト（検収担当向け）

検収担当は以下を上から順に実行し、結果を PR 本文に記録する。プレビューサーバーは確認後にポート指定等で自分が起動したプロセスのみ必ず停止する（`pkill` 一括終了禁止、01 号・G-02）。

- **AC-1（版番号と差分範囲）**:
  - `node -p "require('./package.json').version + ' ' + require('./package.json').private"` が `2.0.0 true`。
  - `node -p "const l=require('./package-lock.json'); l.version+' '+l.packages[''].version"` が `2.0.0 2.0.0`。
  - `git diff origin/develop/v2.0 -- package-lock.json` の変更がトップレベル `version` と `packages[""].version` の 2 行のみであること。
- **AC-2（タグ・Release 未作成）**:
  - `git tag --points-at HEAD` が空、`git ls-remote --tags origin v2.0.0` が空であること。
- **AC-3（表記統一とヘルプ文言）**:
  - `grep -rn "順目" src/` の出力が空であること。
  - `grep -n "仮置き\|i巡目" src/ui/screen/HelpScreen.tsx` の出力が空であること。
  - `HelpScreen.tsx` の「点数計算表」節に本場（積み棒）・点差・供託が記載され、「確率・期待値」節に 18 巡方針の累積近似・4 向聴以上対象外・一人麻雀/ツモ和了のみ・本場/供託除外が記載されていること（目視およびテストで確認）。
- **AC-4（静的検査・単体テスト）**:
  - `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test`・`npm run check:theme`・`npm run check:icons` がすべて終了コード 0 で成功すること。
  - `npx vitest run src/ui/screen/HelpScreen.test.tsx src/ui/engine/engine-view.test.tsx src/ui/screen/EngineScreen.test.tsx` で `G3-T1`〜`T3`・`G4-T3`〜`T5`・`Issue #139 U-11`（`V2-H1`・`V2-H2` 含む）・巡目表示テストが全件パスすること。
- **AC-5（本番ビルドの 375px 表示・版番号・巡目表示）**:
  - `npm run build` → `npx vite preview --port 4173` で起動し、ブラウザで `http://localhost:4173/mj-3player-calc/` を幅 375px で開く。
  - (a) メイン画面で `document.documentElement.scrollWidth <= document.documentElement.clientWidth` が `true`、コンソールエラー 0 件。
  - (b) メニュー → ヘルプを開き、末尾に「バージョン 2.0.0」が表示され、横スクロールがないこと。「点数計算表・共有画像」「確率・期待値」の各節を開いて確定文面が表示されること。
  - (c) メイン画面で 13 枚または 14 枚の聴牌/向聴（例: ランダム 14 枚）から「計算」→ 計算実行し、スライダー横の表示が「3巡目」等（`順目` ではない）で表示され、幅 375px で横スクロールがないこと。
- **AC-6（本番ビルドの SW / precache 確認）**:
  - AC-5 のプレビュー画面で:
    - (a) `navigator.serviceWorker.getRegistration()` の `active.state` が `'activated'`、`scope` が `'http://localhost:4173/mj-3player-calc/'`。
    - (b) 再読み込み後 `navigator.serviceWorker.controller` が非 null。
    - (c) `caches` 内の precache URL 一覧に `index.html`・`decomposer_bg-*.wasm`・`engine_bg-*.wasm`・`worker-*.js`・`HelpScreen-*.js`・`EngineScreen-*.js` がすべて含まれること。
    - (d) `docs/images/` 由来のファイルが `dist/` および precache に含まれないこと（`find dist -name 'screenshot-*'` が空）。
  - 確認完了後、起動した `vite preview` プロセスを停止する。
- **AC-7（09 号 初回 JS 計測と基準値更新）**:
  - §4.1 の手順で `dist/index.html` 参照の初回 JS を 2 回 `gzip -9 -c <file> | wc -c` で計測し、基準値 **131,291 B**・実測値・増分・積算（+0 B）との差を PR 本文に記録すること（目標値超過でも不合格にしない）。
  - `docs/rules/09-bundle-budget-protocol.md` の「現在の基準値」が実測値と一致し、根拠記述・旧基準値 `128,883 B` の行・§4.3 の追記 2 行があること。
- **AC-8（`README.md` とリンク整合）**:
  - `README.md` の「できること」に確率・期待値シミュレーション、点数計算表（本場・点差・供託）、十三不搭メッセージが記載され、「対応環境」に Firefox 114+ のモジュール Worker 要件が記載されていること。
  - 既存スクリーンショット 2 枚が維持され、`git diff origin/develop/v2.0 -- docs/images/` が空であること。
  - `README.md` と `docs/development.md` 内の相対リンク（および `img src`）がすべて実在すること。
- **AC-9（リリースノート下書き `docs/release-notes/v2.0.0.md`）**:
  - 冒頭に「オーナーの監修前に公開しない」注記、末尾に「監修メモ」節があること。
  - 主な変更点（F3、#142、#158、#159、#166、#164、#165）、既知の制約（シミュレーション前提/近似、手動テーマと OS 逆転時の `theme-color` 差・PWA 起動背景暗色固定、`prefers-reduced-motion` 静止表示、Firefox 89〜113 非対応）、今後の予定（`v2.0.1`: #124・#162・#167・#171〜#174、`v2.1`: #58・#112・#113）が記載されていること。
- **AC-10（事前審査の文書整理と伏せ字確認）**:
  - `docs/mahjong-rules.md` §4.3 が `【確定】` になっていること。
  - `docs/design/issue-123-cloud-run-preview.md` を目視およびパターン検索（`grep -nE '[0-9]{10,13}' docs/design/issue-123-cloud-run-preview.md` が空、`grep -n 'iam\.gserviceaccount\.com' docs/design/issue-123-cloud-run-preview.md` がプレースホルダ表記のみ）で検査し、GCP プロジェクト ID・プロジェクト番号・実 SA メールアドレス・無関係な既存サービス名・WIF Pool 固有名が残っていないこと。また、コミットメッセージおよび PR 本文にも具体値を記載していないこと。
  - `docs/license-policy.md` に `Cargo.lock` の文字列が残っていないこと（`grep -n "Cargo\.lock" docs/license-policy.md` が空）。
  - `docs/requirements.md`（§1・§3.4・§4 78 行目）・`docs/development.md`（`wasm/engine/`・`src/engine/`・`test:engine-mc`・`build:engine-bench`）・`AGENTS.md`（80 行目の表区切り 6 列、`wasm/engine`・コマンド追記）が §3.5 のとおり更新されていること。
- **AC-11（変更範囲・絶対遵守事項・PR 記載事項）**:
  - `git diff --stat origin/develop/v2.0` が §5 の一覧（および本設計書 `docs/design/issue-152-v2-release.md`）に収まり、`.github/workflows/`・`public/` に差分がないこと。
  - ホームディレクトリ名・絶対パスが変更差分に含まれないこと（`git diff origin/develop/v2.0 | grep -nE '/(Users|home)/'` が空）。
  - PR の base が `develop/v2.0` であること。PR 本文に §2.3 のオーナー実機確認済み事実および実挙動未確認項目（`#166` スナックバー等）が明記されていること。

---

## 7. リスク・注意点

- `npm version 2.0.0 --no-git-tag-version` で `--no-git-tag-version` を付け忘れるとタグとコミットが生成されるため、必ずフラグを付ける（AC-2）。
- `docs/design/issue-123-cloud-run-preview.md` の伏せ字化にあたり、**コミットメッセージ・PR 本文・レビューコメントに伏せ字前の具体値を引用しない**こと（Git 履歴や PR ログへ具体値を残さないため）。
- `HelpScreen.tsx` の編集で 1 文目（`G4-T4`）や `id="help-engine"` を崩すと既存テストが落ちるため、§3.1.1 の構成を守る。
- `docs/requirements.md` 内の未確定項目（§3.5 の利用者プリセット `【設計案】` 等）は誤って `【確定】` に変えない。

---

## 8. 統合・デプロイ・リリース手順書（役割分担）

本節の手順は `#152` 準備 PR が `develop/v2.0` へマージされた後に実施する。製造・検収担当は実施しない。

### 8.1 最終統合 PR・マージ・ブランチ削除（オーナー操作）

1. `#152` 準備 PR が `develop/v2.0` へマージされ、`git merge-base --is-ancestor <準備PRマージコミット> origin/develop/v2.0` が真であることを確認する。
2. `develop/v2.0` → `main` の最終統合 PR を作成する（base: `main`、head: `develop/v2.0`）。
3. CI（lint・typecheck・format:check・test・build）がすべて成功したことを確認し、**merge commit**（squash しない）で `main` へマージする（01 号 統合ブランチ運用規約）。
4. マージと同時に `develop/v2.0` ブランチを削除する。
5. マージ後、`git fetch origin && git merge-base --is-ancestor <最終統合マージコミット> origin/main && echo ok` が `ok` であることを確認する。
6. `v2.0` マイルストーンに残るオープン Issue（`#152`・`#170` 等）がすべてクローズされたことを確認する（自動クローズされなかったものは手動クローズする）。

### 8.2 GitHub Pages 手動デプロイ・公開確認・リリースノート監修（オーナー操作）

1. GitHub Actions → `Deploy` ワークフローを `main` ブランチで手動実行（`workflow_dispatch`）する（手順詳細は [issue-109-pages-deploy.md](issue-109-pages-deploy.md#7-オーナーが行う手順リポジトリ設定)）。
2. 公開 URL（`https://bluekurage119.github.io/mj-3player-calc/`）にアクセスし、以下を確認する:
   - 旧版を開いていた端末・タブで Issue #166 の更新通知スナックバーが表示され、更新後に正常動作すること。
   - ヘルプ画面末尾が「バージョン 2.0.0」になり、「点数計算表」「確率・期待値」節が確定文面になっていること。
   - 確率・期待値計算画面でスライダー横が「n巡目」表示になっていること。
3. `docs/release-notes/v2.0.0.md` の文面を監修し、公開可否と修正有無を確定する（公開時は冒頭注記と末尾「監修メモ」節を除く）。

### 8.3 タグ作成・GitHub Release 作成・ビルド生成物 ZIP 添付（統括・エージェント側）

**前提ゲート**: §8.1（`main` 統合マージ）および §8.2（GitHub Pages デプロイ確認・リリースノート監修完了）のすべてをオーナーが確認し、リリース作業の実行指示を受けた後に実施する。

1. `main` の最新（最終統合マージコミット）を取得し、注釈付きタグ `v2.0.0` を作成・push する:
   ```bash
   git fetch origin
   git checkout main && git pull --ff-only
   git tag -a v2.0.0 -m "v2.0.0" HEAD
   git push origin v2.0.0
   ```
2. 本番ビルドを実行し、配布物 `dist/` を圧縮して `v2.0.0.zip` を作成する（`v1.1.0` の `v1.1.0.zip` と同一形式。作業ツリーを汚さないよう一時ディレクトリまたはリポジトリ外へ出力する）:
   ```bash
   npm run build:wasm
   npm ci
   npm run build
   (cd dist && zip -r /tmp/v2.0.0.zip .)
   ```
   ※ 作成後、`unzip -l /tmp/v2.0.0.zip | head` でルート直下に `index.html`・`assets/`・`sw.js` 等が収まっていること、および `git status --porcelain` が空であることを確認する。
3. 監修済みリリースノート本文（冒頭注記と「監修メモ」節を除いたもの）を一時ファイルへ用意し、まず下書き（`--draft`）として GitHub Release を作成し `v2.0.0.zip` を添付する:
   ```bash
   gh release create v2.0.0 /tmp/v2.0.0.zip \
     --title "v2.0.0" \
     --notes-file /tmp/v2.0.0-notes.md \
     --verify-tag \
     --draft
   ```
4. `gh release view v2.0.0` でタイトル・本文・添付アセット `v2.0.0.zip` を確認し、オーナー承認のうえで公開する:
   ```bash
   gh release edit v2.0.0 --draft=false
   ```
5. 一時ファイル（`/tmp/v2.0.0.zip`・`/tmp/v2.0.0-notes.md`）を削除して終了する。

---

## 9. 後続 Issue への引き継ぎ事項

- **v2.0.1 向け既知課題**: `#124`（共有画像デザイン確定）、`#162`（完了チェックマーク演出と `prefers-reduced-motion` 見直し）、`#167`（巡目別期待値の計算方針とヘルプ文言の再見直し）、`#171`（Cloud Run プレビュー申し送り 3 点）、`#172`（計算画面 UI/状態改善）、`#173`（計算エンジン・Worker 境界条件修正とテスト強化）、`#174`（CI への `cargo test` 追加と開発ツール整備）。
- **v2.1 向け機能**: `#58`（スマート入力モード）、`#112`（牌画像のダークテーマ）、`#113`（利用者プリセットの名前付き保存）。
- **09 号バンドル基準値**: 本 Issue のマージ後確定値が v2.0.1 以降の新しい基準値になる。
- **次期開発ブランチの版番号**: v2.0.1 等の統合ブランチを切る場合は、必要に応じて `package.json` を `-dev` 付きへ更新する運用を継続する。

---

作成モデル: Gemini 4 Neon
