# Issue #95 F1-2. ランダム入力(ランダム14枚・ランダム清一色) 設計書

- 対象 Issue: [#95](https://github.com/BlueKurage119/mj-3player-calc/issues/95)(docs/issues-draft.md の F1-2)
- 版: 第2版(2026-11-15。AGY 独立レビューの指摘1〜6を反映。ユーザー判断事項 Q1〜Q3 の回答を反映)
- 状態: 承認済み(オーナー承認 2026-11-15、第2版)

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- `docs/issues-draft.md` F1-2(三点リーダーのメニューに「ランダム14枚」「ランダム清一色」。ドラを消去した門前14枚(暗槓なし)。清一色は筒子か索子)
- `ref-repo/mahjong-calc/src/lib/store/index.ts` の `set-input-random`(livewing の実装。牌山を `shuffle` し先頭から取る。整列後にランダムな1枚を末尾へ移す。`input` を `{ hand, melds: [], dora: [] }` に置換し、状況役は触らない)
- `src/ui/state/app-state.ts`・`src/ui/state/situation-rules.ts`・`src/ui/screen/AppHeader.tsx`・`src/core/tile/index.ts`・`src/core/rule.ts`・`src/core/util.ts`・`src/core/hora.ts`・`src/core/local-yaku.ts`
- 既存設計書 `docs/design/issue-51-screen-skeleton.md`(メニュー・オールクリア)、`docs/design/issue-89-tile-tap.md`(書式)

### 1.2 確定事項(オーナー確認済み。再検討しない)

| # | 確定事項 |
| --- | --- |
| K1 | メニューの並びは 設定 → Divider → ランダム14枚・ランダム清一色 → Divider → オールクリア。既存の `md` ラッパー `Menu`/`MenuItem`/`Divider` を使い、ラッパーは新設しない |
| K2(論点1=A) | 手牌を置換し、副露・ドラ・裏ドラ・抜き北(`nuki`)を消す。確認ダイアログなし。卓の設定(`table`)は残す |
| K3(論点2=B) | 状況役 `handOptions` は消さずに残す(livewing 合わせ)。整合問題の扱いは §7 Q1 のとおり(a)で確定 |
| K4(論点3=A) | 赤牌は `rule.red`(0〜2)に従い、牌山を赤枚数どおりに作る |
| K5(論点4=A) | 和了形でも引き直さない |
| K6(論点5=A) | 整列後、ランダムな1枚を末尾へ移す(livewing 相当) |
| K7(論点6=A) | 乱数関数を action の payload で渡す(既定 `Math.random`)。reducer は純粋に保つ。牌山生成・ランダム手牌生成を純関数として切り出し、乱数を引数にとる |
| K8 | 実行後はシートを閉じる(`inputFocus: null`、`tenkeyBuffer: ''`) |
| K9 | ランダム清一色は筒子か索子を等確率で選び、その種類の牌山(36枚、赤含む)から14枚。萬子は対象外 |
| K10 | 14枚は `isAvailableTiles` の制約(同種4枚・赤上限・三麻牌)を満たす |

### 1.3 実物で確認した事実

1. `AppAction`(`app-state.ts`)は判別共用体。`clear-all` は `input: createInitialInput()`・`handOptions: createInitialHandOptions()`・`inputFocus: null`・`tenkeyBuffer: ''` を返す(`table`・`rule`・`screen`・`sheetMode` は維持)。
2. `AppInput = Input & { uradora: Tile[] }`。`createInitialInput()` は `{ hand: [], melds: [], dora: [], uradora: [], nuki: 0 }`。
3. `HandOptions` は `riichi`・`ippatsu`・`rinshan`・`chankan`・`haitei`・`tenho`・`tsubameGaeshi`・`kanFuri`。
4. `rule.red` は `RedDora = 0 | 1 | 2`。`redCountOf(red, type)` は p・s で `red`、m・z で 0(三麻は萬子・字牌に赤なし)。
5. `src/core/util.ts` の `shuffle` は `Math.random` を直接呼ぶ(乱数を注入できない)。本 Issue では `shuffle` を変更せず、乱数を引数にとる別関数を UI 状態層に置く(core の既存呼び出し元に波及させないため)。
6. `isAvailableTiles(red, used, tiles)`(`src/core/tile/index.ts`)が三麻牌(2m〜8m の除外)・同種4枚・赤上限を判定する。
7. 状況役の正規化 `normalizeHandOptions`(`situation-rules.ts`)は **ルールだけ** を見て、オープン立直の降格・一発(立直なし/ルール無効で解除)・燕返し/槓振り(ローカル役無効で解除)を行う。呼ばれるのは `set-riichi`・`set-situation`・`set-rule` の3か所だけで、**副露や抜き北の増減に連動した状況役の自動解除は存在しない**(`add-meld`・`remove-meld`・`step nuki` 等は `handOptions` に触れない)。
8. `isSituationKeyEnabled` は一発(立直が前提)以外、副露・抜き北を見ない。したがって状況役シートのチップ・サマリのラベル(`situationLabels`)は、副露・抜き北の有無に関係なく選択中なら表示される。

## 2. 設計

### 2.1 変更ファイル一覧

| ファイル | 変更 |
| --- | --- |
| `src/ui/state/random-hand.ts`(新規) | 牌山生成・ランダム手牌生成の純関数 |
| `src/ui/state/index.ts`(バレル) | `RandomFn`・`RandomHandKind`・`createWall`・`shuffleWith`・`generateRandomHand` を再輸出する(`app-state.ts` は `random-hand.ts` から直接 import してよい) |
| `src/ui/state/random-hand.test.ts`(新規) | 純関数のテスト |
| `src/ui/state/app-state.ts` | `AppAction` に `set-random-hand` を追加し reducer で処理 |
| `src/ui/state/app-state.test.ts` | reducer のテストを追加 |
| `src/ui/screen/AppHeader.tsx` | メニュー項目2つと Divider を追加 |
| `src/ui/screen/AppHeader.tsx`(続き)・`AppHeader.test.tsx`(新規) | メニュー項目の定義と選択処理を純関数(§2.4)に切り出し、項目順と選択処理をテストする |
| `docs/requirements.md` | §2.6 の文言を【確定】で反映する(Q2。設計承認済み) |

`src/core/util.ts` の `shuffle` は変更しない。

### 2.2 純関数(`src/ui/state/random-hand.ts`)

```ts
export type RandomFn = () => number; // [0, 1) を返す。Math.random 互換
export type RandomHandKind = 'random14' | 'chinitsu';

/** 三麻の全牌山(108枚)。type を指定するとその種類だけ(p・s は36枚) */
export function createWall(red: Rule['red'], type?: 'm' | 'p' | 's' | 'z'): Tile[];
/** Fisher–Yates。random を注入できる版(引数の配列は変更しない) */
export function shuffleWith<T>(a: readonly T[], random: RandomFn): T[];
/** 14枚を返す。整列後、ランダムな1枚を末尾へ移した並び */
export function generateRandomHand(kind: RandomHandKind, red: Rule['red'], random: RandomFn): Tile[];
```

- 牌山の中身: 1m・9m 各4枚、1p〜9p・1s〜9s 各4枚、字牌 1z〜7z 各4枚(計108枚)。p・s の 5 は4枚のうち `redCountOf(red, type)` 枚を `red: true`、残りを `red: false`。数牌の 5 以外の `red` プロパティの有無は`Tile` 型(`src/core/tile/index.ts`)に従う。数牌の 5 だけが `red: boolean` を持ち、5 以外の数牌と字牌は `red` プロパティを持たない。
- `generateRandomHand`:
  1. `random14`: `shuffleWith(createWall(red), random)` の先頭14枚。
  2. `chinitsu`: `random() < 0.5 ? 'p' : 's'` で種類を決め、`shuffleWith(createWall(red, type), random)` の先頭14枚。
  3. `compareTiles` で整列し、`Math.floor(random() * 14)` 番目を取り除いて末尾に追加(K6)。
- `createWall` の並び順は 1m・9m → 1p〜9p → 1s〜9s → 1z〜7z とし、各 5p・5s は `red: true` を先にする。
- `shuffleWith` の走査方向は `src/core/util.ts` の `shuffle` と同じ(`i = length - 1` から `1` までの降順、`j = floor(random() * (i + 1))` と交換)。
- 乱数の消費順は上記の順で固定する(テストの再現性のため。固定乱数列スタブでの期待値が一意に定まる)。`random()` が 1 を返す異常値への防御は不要(`Math.random` の仕様は [0,1))。

### 2.3 アクションと reducer

```ts
| { type: 'set-random-hand'; kind: RandomHandKind; random?: RandomFn }
```

- `random` 省略時は `Math.random`。reducer 内で `Math.random` を参照するのはこの既定値だけとし、テストは必ず `random` を渡す(K7)。
- 返す状態:
  - `input`: `{ ...createInitialInput(), hand: generateRandomHand(kind, state.rule.red, random) }`(副露・ドラ・裏ドラ・nuki を消去。K2)
  - `inputFocus: null`、`tenkeyBuffer: ''`(K8)
  - `handOptions`: 現状のまま(K3・Q1=(a))
  - `table`・`rule`・`screen`・`sheetMode`: 維持
- 和了形の判定・引き直しはしない(K5)。

### 2.4 メニュー(`AppHeader.tsx`)

並び: 設定 → `<Divider />` → ランダム14枚 → ランダム清一色 → `<Divider />` → オールクリア(K1)。各 `onSelect` は既存項目と同じく `setMenuOpen(false)` のあと `dispatch({ type: 'set-random-hand', kind })`。クラス名は既存の `app-header__menu-item`。

- UI文言: 「ランダム14枚」「ランダム清一色」。補足説明は付けない。
- アイコン: 付けない(Q3 の回答。既存の「設定」「オールクリア」もアイコンなし。将来付ける場合は別途)。
- テスト容易性のため、メニュー項目の定義(文言・種別・Divider の位置)と、選択時の処理(`closeMenu` を呼んだあと `dispatch`)を、`AppHeader.tsx` から純関数として切り出して export する(Issue #89 の `HandCard.tsx` と同じ方式)。JSX 側は `renderToStaticMarkup` で項目順と Divider の位置を検査する。

### 2.5 テスト方針

テスト名は `F1-2-<番号>: <説明>` の形式(業務標準05)とする。乱数は固定列を返すスタブ(例: 配列を順に返す関数、または `() => 0`)を渡す。

- `random-hand.test.ts`
  - `createWall(red)` が108枚、p・s の赤5が `red` 枚(0/1/2 それぞれ)、2m〜8m を含まない
  - `createWall(red, 'p')` が36枚で全て筒子
  - `generateRandomHand('random14', …)` を複数の乱数列(固定シード相当の擬似乱数を含め数十通り)で実行し、常に14枚・`isAvailableTiles(red, [], hand)` が true
  - `chinitsu` で `random` の最初の値 <0.5 なら全て筒子、>=0.5 なら全て索子。萬子・字牌を含まない
  - 末尾移動: 末尾以外の13枚が `compareTiles` 順で整列済み、全14枚を整列すると13枚+末尾の整列結果と一致
  - 同じ乱数列なら同じ結果(再現性)
- `app-state.test.ts`
  - 副露・ドラ・裏ドラ・nuki>0 の状態から `set-random-hand` で全て空/0、手牌14枚
  - `table`(場風・自風・本場・供託)と `handOptions`(立直・嶺上等を立てた状態)が維持される
  - `inputFocus`(例: 手牌シートを開いた状態)が null、`tenkeyBuffer` が ''
  - `rule.red` を 0/2 にした状態で赤枚数が上限を超えない
- `AppHeader.test.tsx`
  - 現行の Vitest 環境は DOM なし(`jsdom`・`@testing-library/react` 未導入。既存 UI テストは `renderToStaticMarkup` と純関数)のため、次の2本立てとする。
    - `renderToStaticMarkup` で、メニュー内の項目の文言順が「設定」「ランダム14枚」「ランダム清一色」「オールクリア」で、設定とランダム14枚の間、ランダム清一色とオールクリアの間に Divider があることを検査する(`MenuItem` の `onSelect` は `useEffect` 内でイベントに接続されるため、静的描画では選択を発火できない)。
    - 切り出した選択処理の純関数に、`closeMenu` と `dispatch` のモックを渡して、「ランダム14枚」で `closeMenu` が呼ばれ `set-random-hand`(kind `random14`)が dispatch されること、清一色も同様であることを検査する。

### 2.6 要件の改訂(設計承認済み。製造時に【確定】で反映)

`docs/requirements.md` には現在、ヘッダーのメニュー・ランダム入力の記述がない。手牌の入力(§3.1)に次を追記する。

> 【確定】ヘッダーの三点リーダーのメニューに「ランダム14枚」「ランダム清一色」を置く。手牌を門前14枚に置き換え、副露・ドラ・裏ドラ・抜き北を消す。卓の設定と状況役は残す。赤牌はルールの赤枚数に従う。清一色は筒子か索子(Issue #95)。

Q2 の回答により、設計承認をもって【確定】タグで記載する。設計は承認済みのため、製造時に反映した。

### 2.7 バンドル目標値(業務標準09)

- 基準値: `main`(dc75755)で `npm run build` 後の初回 JS(`dist/assets/index-*.js` のみ。`modulepreload` なし)を `gzip -9` で測り、127,443 B。
- 増分の見込み(gzip): 純関数 3 つ ≈ 0.4 kB、reducer の分岐・アクション ≈ 0.1 kB、メニュー項目と選択処理 ≈ 0.2 kB。合計 ≈ 0.7 kB(700 B)。
- 目標値: 約 128,150 B(基準値 + 700 B)。目標値の超過は不合格条件ではない。
- 受け入れ条件 AC10 で実測値を記録する。

## 3. 後続 Issue への引き継ぎ

- `shuffleWith`・`createWall` は F3(聴牌確率等)の牌山シミュレーションで再利用できる。core に移す場合は F3 で判断する。
- 状況役と副露・抜き北の整合(嶺上・天和など。§7 Q1)は、連動した正規化を本 Issue の範囲外とする(Q1=(a))。必要になれば別 Issue とする。

## 4. 製造の前提と手順

1. 着手時に §2.6 を反映する(設計承認済み。【確定】タグ)。
2. 純関数 → reducer → メニュー の順に実装・テスト。
3. コミット前に lint・typecheck・format:check・test。

## 5. 受け入れ条件

| # | 実行すること | 合格条件 |
| --- | --- | --- |
| AC1 | `npm test` | 全件成功し、§2.5 のテストが `random-hand.test.ts`・`app-state.test.ts`・`AppHeader.test.tsx` に存在する |
| AC2 | `npm run lint`・`npm run typecheck`・`npm run format:check` | エラーなし |
| AC3 | `src/ui/state/app-state.ts` の reducer を目視 | `set-random-hand` の分岐で `Math.random` を参照するのは `random` 省略時の既定値だけ |
| AC4 | `git diff main -- src/core/util.ts` | 差分なし |
| AC5 | dev または preview でメニューを開く | 項目が 設定/区切り線/ランダム14枚/ランダム清一色/区切り線/オールクリア の順。2項目にアイコン・説明文なし |
| AC6 | 副露1件・ドラ1枚・裏ドラ1枚・抜き北1・本場1・立直オンにして「ランダム14枚」を5回実行 | 毎回、手牌14枚(2m〜8m なし、同種5枚以上なし、赤5筒・赤5索がそれぞれルールの赤枚数以下)、副露・ドラ・裏ドラ欄が空、抜き北0、本場1と立直が残る、シートが閉じている |
| AC7 | 「ランダム清一色」を10回実行 | 毎回14枚すべて筒子または索子(混在なし、萬子・字牌なし)。10回の中に筒子と索子の両方が出ることを確認(出なければ追加実行) |
| AC8 | 設定で赤を0にして「ランダム14枚」「ランダム清一色」を各5回 | 赤牌が一度も出ない |
| AC9 | 手牌シートを開いた状態(テンキー入力途中)からメニューで実行 | シートが閉じ、再度開いたテンキーのバッファが空 |
| AC10 | `npm run build` の後、業務標準09の方法で初回 JS を測る | 基準値 127,443 B・実測値・増分・積算(700 B)との差を最終報告と PR 本文に記録する(超過しても不合格にしない) |

## 6. 実挙動未確認

- AC5〜AC9 の画面確認は製造後に実施。Material Web の `Menu` で Divider を2本置いた見た目は未確認(既存は1本)。

## 7. ユーザー判断事項(回答済み)

回答(オーナー): Q1=(a)、Q2=了解(設計承認をもって【確定】で追記)、Q3=アイコンなし。以下は判断時の記録。

### Q1. 状況役を残したまま副露・抜き北を消したときの整合(論点2=B に伴う)

現行コードでの各項目の扱い(§1.3 の 7・8 と `src/core/hora.ts`・`src/core/local-yaku.ts` を確認):

| 項目 | 副露・nuki 消去後の計算 | 表示(チップ・サマリ) | 整合 |
| --- | --- | --- | --- |
| 立直・ダブル立直(オープン含む) | 門前になるので有効 | 表示 | 問題なし(むしろ副露時より整合) |
| 一発 | 立直に従う | 表示 | 問題なし |
| 嶺上開花 | `hora.ts` は「槓子の副露あり または nuki>0」を条件にするため、門前14枚(暗槓なし・nuki 0)では **役が付かない** | 選択中のまま「嶺上開花」と表示される | **不整合**(表示されるが計算されない) |
| 槍槓 | 副露を条件にしない。門前のロンで有効 | 表示 | 問題なし |
| 海底/河底 | 副露を条件にしない | 表示 | 問題なし |
| 天和/地和(人和) | `hora.ts` は副露なしを条件にする。副露ありで立てていた場合、**ランダム後に急に有効になる** | 表示 | 事実上の変化あり(立直との同時選択も既存のまま可能) |
| 燕返し・槓振り | 副露・nuki を条件にしない(他家の行為が条件) | 表示 | 問題なし |

既存の正規化はルールのみを見ており、手で副露を外した場合も同じ不整合(嶺上)は今でも起き得る。

選択肢:
- (a) 残す(現設計)。既存の正規化に任せる。livewing と同じ。実装最小。嶺上の表示と計算の食い違いは既存の手動操作と同じ性質のまま残る。
- (b) 不整合になる項目だけ解除(嶺上開花を false に。天和も副露起因で変化するため解除対象に含めるかは要選択)。表示と計算が一致する。ランダム入力にだけ特別な規則が入り、手動で副露を外したときとの挙動差が生じる。
- (c) 全消去(`createInitialHandOptions()`)。単純で不整合ゼロ。立直等を毎回つけ直す手間が増え、確定事項 K3 を覆すことになる。
- (d) (a) としたうえで、副露・抜き北の変化に連動した嶺上の正規化を別 Issue で全体に入れる。

質問文: 「ランダム入力で状況役を残すと、嶺上開花は選択表示のまま点数に入らない状態になり、天和/地和は副露が消えたことで有効になります。(a) そのまま残す、(b) 嶺上(と天和)だけ解除する、(c) 全部消す、(d) (a)にして全体の正規化を別 Issue にする、のどれにしますか。」

### Q2. 要件 §2.6 の追記を【確定】で書いてよいか

質問文: 「requirements.md にメニューのランダム入力を追記します。設計承認をもって【確定】タグで書いてよいですか。」

### Q3. メニュー項目のアイコン

質問文: 「ランダム14枚・ランダム清一色にアイコンを付けますか(案: 付けない。既存の設定・オールクリアもアイコンなし)。」
