# Issue #50 設計書: 設定画面・ルール16項目(D6)

- 対象: [Issue #50](https://github.com/BlueKurage119/mj-3player-calc/issues/50)(Epic D の D6)。ブランチ `feature/issue-50-settings-screen`
- 本書で決めるもの: 設定画面の中身(テーマ・プリセット・ルール16項目)、保存・読込の接続、読込注記、ツールチップ、本場・供託の入力部品、設定画面ヘッダーの左寄せ修正、6404a90 の revert
- 本書で決めないもの: 利用者プリセットの名前付き保存(別Issue)、詳細設定内のグループ分けの確定(後日ユーザーが決める。§4.3 は仮)、バンドル予算値の改訂(別途協議)

## 1. 参照資料と判断の根拠

| 資料 | 導いた判断 |
| --- | --- |
| 統括担当から渡されたヒアリング済み確定事項 1〜12 | §2 の表に番号で対応づけ、そのまま前提とする |
| [docs/issues-draft.md](../issues-draft.md) D6 項 | 範囲(RULE_ITEMS から画面を組み立てる・プリセット一致表示・loadRule/saveRule 接続・テーマ切替) |
| [issue-51-screen-skeleton.md](issue-51-screen-skeleton.md) §2.3・§7 | `SettingsScreen` を置き換える。`loaded` の扱いは D6 で決める(→ §5.2) |
| [issue-49-situation-input.md](issue-49-situation-input.md) §5・§12 | `set-rule` は handOptions・抜き北を正規化する。6404a90 を revert する。D6 で遅延読み込みの削減量を計測する |
| [issue-29-rule-items.md](issue-29-rule-items.md)・[issue-30-rule-storage.md](issue-30-rule-storage.md)・[issue-31-rule-preset.md](issue-31-rule-preset.md) | `RULE_ITEMS`(kind 3種。実数は17項目=基本5+詳細12。Issue 名の「16項目」とは数が合わないが、画面は `RULE_ITEMS` の全項目を出す)、`loadRule`/`saveRule`/`LoadedRule`、`RULE_PRESETS`/`findRulePreset` をそのまま使う。core は変更しない |
| `src/ui/md/Select.tsx`・`Switch.tsx` | 既存ラッパーを使う(値は Select が string、Switch が boolean) |
| `src/ui/expressive/ConnectedButtonGroup.tsx`・`Stepper.tsx` | テーマ3択は ConnectedButtonGroup。Stepper は変更しない(確定4) |
| `src/ui/theme/use-theme.ts` | `useTheme()` の `preference`/`setPreference` を使う |
| [docs/mahjong-rules.md](../mahjong-rules.md) | ツールチップ文言の出典(§4.4)。【確定】の記述だけを使う |
| 参考実装: リポジトリ mj-stats-viewer の統計セクションのツールチップ | 構成(button+role=tooltip、外側タップ・Esc で閉じる)の参考のみ。コードは流用しない |
| 実測(§9) | バンドル増分、赤ドラ設定を下げたときの計算結果 |

## 2. 確定事項との対応

| 確定 | 内容 | 本書 |
| --- | --- | --- |
| 1 | テーマ → プリセット行 → ルール | §4.1 |
| 2 | プリセットは段位戦ルール1つ。一致表示・「段位戦ルールに戻す」(確認なし) | §4.2 |
| 3 | 基本5項目+「詳細設定」アコーディオン(既定閉・非保存)。閉時の変更項目名の副テキスト | §4.3 |
| 4 | 本場・供託の専用部品(±・直接入力・確定時のみ反映・下側切り捨て) | §4.5 |
| 5 | help ツールチップ。対象は改訂で8項目(切り上げ満貫・役満の複合を除き、赤ドラを追加) | §4.4 |
| 6 | 変更のたび saveRule。失敗は無言。壊れ/補完時だけ注記し、保存に成功したら消す(改訂) | §5 |
| 7 | 6404a90 revert と openRiichi 配線の担保 | §5.3・受け入れ A20〜A22 |
| 8 | 改訂: 設定画面を `React.lazy` 化する。製造時の実測で明確に有利でなければやめる | §5.4・§9 |
| 9 | set-rule の正規化に任せる。状況役は復元されない。赤五は書き換えない(食い違いは後続へ引き継ぐ) | §6・§10 |
| 改訂4 | 役満グループ内に「ダブル役満」の子セクション。4種のラベルは短いまま | §4.3 |
| 10 | 設定画面ヘッダーのタイトル左寄せ | §4.6 |
| 11 | バンドル積算 | §9 |
| 12 | トークン・日本語・MD3・検収時の注意・5201 | 全体・§8 |

## 3. モジュール構成

| パス | 区分 | 内容 |
| --- | --- | --- |
| `src/ui/screen/SettingsScreen.tsx` | 改修 | 中身の実装。ヘッダーに左寄せ修飾クラスを付ける。`lazy` 用に default export も持つ |
| `src/ui/App.tsx` | 改修 | `SettingsScreen` を `lazy(() => import('./screen/SettingsScreen'))` にし、`<Suspense fallback={null}>` で包む(§5.4) |
| `src/ui/settings/ThemeSection.tsx` | 新規 | テーマ3択 |
| `src/ui/settings/PresetRow.tsx` | 新規 | 一致表示+「段位戦ルールに戻す」 |
| `src/ui/settings/RuleSection.tsx` | 新規 | 基本項目+詳細設定アコーディオン |
| `src/ui/settings/RuleItemRow.tsx` | 新規 | 1項目の行(kind で Select/Switch/PointField を出し分け、help を付ける) |
| `src/ui/settings/PointField.tsx` | 新規 | 本場・供託の ±+直接入力 |
| `src/ui/settings/HelpTooltip.tsx` | 新規 | help ボタン+tooltip、同時1つの管理(`HelpTooltipScope`) |
| `src/ui/settings/rule-groups.ts` | 新規 | 基本/詳細とグループ定義(データ1か所) |
| `src/ui/settings/rule-help.ts` | 新規 | ツールチップ文言(§4.4) |
| `src/ui/settings/settings-logic.ts` | 新規 | 純関数: `commitPointValue`・`changedDetailLabels`・`formatChangedSummary`・`sanitizeDigits` |
| `src/ui/settings/use-rule-settings.ts` | 新規 | `set-rule`+`saveRule` をまとめるフック |
| `src/ui/settings/settings.css` | 新規 | 設定画面のスタイル(md トークンのみ) |
| `src/ui/settings/index.ts` | 新規 | 再エクスポート |
| `src/ui/state/AppStateProvider.tsx` | 改修 | 6404a90 revert。`loaded` から注記フラグを保持する Context を追加 |
| `src/ui/state/rule-persistence.ts` | 新規 | `safeLocalStorage` を Provider から移し、`needsLoadNotice` を置く |
| `src/ui/state/index.ts` | 改修 | `useRuleLoadNotice` を再エクスポート |
| `src/ui/icons/symbol-paths.ts` | 改修 | `SYMBOL_HELP`(Material Symbols outlined `help` 24px)を追加。出典コメントは既存のまま |
| `src/ui/screen/main-screen.css` | 改修 | `.app-header__inner--start` を追加(メイン画面は不変) |
| テスト | 新規 | §7 |

`src/core/` は変更しない。`Stepper`・`ConnectedButtonGroup`・`Select`・`Switch` は変更しない(`PointField` のボタンは `stepper.css` のクラスを流用せず、同じトークンを使う独自クラスで見た目を合わせる。Stepper の CSS 変更が設定画面に波及しないため)。

## 4. 画面仕様

### 4.1 全体(上から)

```
[←] 設定                        ← ヘッダー(§4.6)
(読込注記 1行。条件付き §5.2)
テーマ  [自動|ライト|ダーク]      ← ConnectedButtonGroup
──────────
段位戦ルール / カスタム   [段位戦ルールに戻す]
赤ドラ        [Select]
喰い断        [Switch]
一発          [Switch]
北の扱い (?)  [Select]
ツモ損 (?)    [Select]
詳細設定  ˅                      ← 閉時のみ副テキスト(§4.3)
  (開時: 詳細グループ見出し+項目)
```

- セクション見出し「テーマ」「ルール」を置く(md typescale title-small 相当)。「ルール」見出しはプリセット行の上。見ればわかる説明書きは置かない
- 項目行は左にラベル(+help)、右に操作部品。最小高 48dp(3rem)。行間の区切りは余白で取り、Divider はセクション間だけ
- 設定画面のスクロールは画面全体(`.main-screen` の既存レイアウト)

### 4.2 プリセット行

- 左: `findRulePreset(rule)` が `'ranked'` なら `RULE_PRESETS[0].name`(「段位戦ルール」)、`'custom'` なら「カスタム」
- 右: text ボタン「段位戦ルールに戻す」。`'ranked'` のときは disabled。押すと `setRule(createDefaultRule())`(確認ダイアログなし)
- 名前付き保存は置かない

### 4.3 基本/詳細とグループ定義

`rule-groups.ts`:

```ts
import type { RuleItem } from '../../core/rule-items';
type RuleKey = RuleItem['key'];

export const BASIC_RULE_KEYS: readonly RuleKey[] =
  ['red', 'kuitan', 'ippatsu', 'north', 'tsumoLoss'];

export interface DetailRuleSubgroup { id: string; title: string; note?: string; keys: readonly RuleKey[] }
export interface DetailRuleGroup {
  id: string; title: string; keys: readonly RuleKey[];
  subgroups?: readonly DetailRuleSubgroup[]; // keys の後に描画
}

/** 【仮】グループ分けは後日ユーザーが決める。差し替えはこの配列だけで済むこと */
export const DETAIL_RULE_GROUPS: readonly DetailRuleGroup[] = [
  { id: 'points', title: '点数', keys: ['honbaPoint', 'depositPoint', 'roundedMangan', 'doubleWindFu'] },
  { id: 'yakuman', title: '役満', keys: ['accumlatedYakuman', 'multipleYakuman'],
    subgroups: [{ id: 'double-yakuman', title: 'ダブル役満', note: 'オフのときは役満',
      keys: ['kokushi13DoubleYakuman', 'suankoTankiDoubleYakuman', 'daisushiDoubleYakuman', 'pureChurenDoubleYakuman'] }] },
  { id: 'local', title: 'ローカル', keys: ['openRiichi', 'localYaku'] }
];

export const DETAIL_RULE_KEYS: readonly RuleKey[] = DETAIL_RULE_GROUPS.flatMap(g => [
  ...g.keys, ...(g.subgroups ?? []).flatMap(s => s.keys)
]);
```

- 不変条件(テストで担保): `BASIC_RULE_KEYS` と `DETAIL_RULE_KEYS` の和が `RULE_ITEMS` の key と過不足なく一致し、重複が無い。行の描画はキーから `RULE_ITEMS` を引く(ラベル・選択肢は `RULE_ITEMS` が正)
- ダブル役満の子セクション(確定。見出し・補足の文言は暫定): 見出し「ダブル役満」(title-small より一段弱い label-large 相当)、その直下に補足「オフのときは役満」(body-small、`--md-sys-color-on-surface-variant`)。4種の行ラベルは `RULE_ITEMS` のまま短く(「国士無双十三面待ち」「四暗刻単騎」「大四喜」「純正九蓮宝燈」)。意味の根拠: `src/core/hora.ts` で各キーは役満の point を 2(オン)/1(オフ)に切り替えるだけで、オフでも役は成立し1倍の役満として数える。子セクションは `role="group"`+`aria-labelledby`(見出し)・`aria-describedby`(補足)
- アコーディオン: 自作のディスクロージャー(`<button type="button" aria-expanded aria-controls>`+`<div id role="region" aria-labelledby hidden={!open}>`)。`<details>` を採らない理由: (1) 開閉を React state で持ち、副テキストの出し分けを state と一致させたい(`<details>` は `toggle` イベント経由の同期が要る)、(2) 行全体に既存 `Ripple`・`FocusRing` を付けて他の行と同じ MD3 の状態層を出したい(`<summary>` は既定マーカーとフォーカス表現の打ち消しが要る)、(3) WAI-ARIA の Disclosure パターンで a11y は同等。展開アイコンは `expand_more` 相当を回転(180°、`prefers-reduced-motion: reduce` で遷移なし)。アイコンは既存 `custom-paths`/`symbol-paths` に無ければ `SYMBOL_EXPAND_MORE` を追加
- 既定は閉。開閉状態は保存しない(コンポーネント内 `useState(false)`)
- 副テキスト(閉時のみ): `changedDetailLabels(rule)` = `DETAIL_RULE_KEYS` の順で `rule[key] !== item.defaultValue` の項目の `label`。`formatChangedSummary(labels)`:
  - 0件 → `null`(非表示)
  - 1〜3件 → `labels.join('・')`(例「本場・供託」)
  - 4件以上 → 先頭3件を `・` で連結+`ほか{N}件`(N=件数−3。例「本場・供託・数え役満ほか2件」)
  - 値は出さない。開いている間は非表示

### 4.4 ツールチップ(help)

`HelpTooltip` の props: `{ id: string; label: string /* 項目名 */; text: string }`。

- DOM: ラベル直後に `<button type="button" class="help-tooltip__button" aria-label="{label}の説明" aria-expanded={open} aria-describedby="{id}">`(中は `SymbolIcon` の `SYMBOL_HELP`、18〜20px 表示、タップ領域は 48×48dp を `::before` 等で確保し隣接要素と 8dp 以上離す)+ `<span id="{id}" role="tooltip" class="help-tooltip__bubble" hidden={!visible}>`
- 表示条件: クリック(タップ)でトグル。`@media (hover: hover)` の端末ではホバーでも表示。`:focus-visible` でも表示(CSS の `:has()`/隣接セレクタではなく、`onFocus`/`onBlur` で `matches(':focus-visible')` を見て state 化。表示判定を1か所にするため)
- 閉じる: 外側の `pointerdown`(document)、`Escape` キー、別の help を開いたとき
- 同時1つ: `HelpTooltipScope`(Context。`openId: string | null` と `setOpenId`)を `SettingsScreen` 直下に置く。ホバー/フォーカスで出る表示もこの `openId` に乗せる
- 見た目: 背景 `--md-sys-color-inverse-surface`、文字 `--md-sys-color-inverse-on-surface`、角丸 `--md-sys-shape-corner-extra-small` 相当、body-small 文字。`max-width: min(280px, 100vw - 32px)`。位置はボタン直下。左右の見切れ防止は表示時に `getBoundingClientRect()` で左右16pxに収まるよう `left` を補正(JS)。`prefers-reduced-motion: reduce` でフェードなし(既定はフェード 100ms 程度)
- HEX 直書き禁止(既存トークン変数のみ)

文言(`rule-help.ts`。出典は docs/mahjong-rules.md の節。【確定】の記述の要約):

| 項目 | 文言案 | 出典 |
| --- | --- | --- |
| ツモ損 | ツモ損あり: 北家の負担分は誰も払わない。北家分折半: 北家の負担額をツモられた2人で折半して上乗せする。ロン打点折半: ロンの打点を2人で折半して支払う。 | §3.1 |
| 北の扱い | 抜きドラ: 抜いた北1枚につき1飜。抜かずに手牌で使う北は客風牌。共通役牌: 北の刻子・槓子で1飜役「役牌：北」。 | §2 |
| ローカル役 | 採用しているローカル役を一括でオン・オフする。 | §4.2 |
| オープン立直 | オープンリーチは2飜、オープンダブルリーチは3飜。立直の選択肢に加わる。 | §4.2・§4.2.2 |
| 連風牌の雀頭 | 連風牌の雀頭の符を4符か2符から選ぶ。 | §4.1 |
| 本場 | 1本場あたりの点数。ロンは放銃者が全額、ツモはツモられた2人が折半して払う。 | §3.2 |
| 供託 | 供託1本あたりの点数。和了者が本数×この点数を受け取る。 | §3.2 |
| 赤ドラ(暫定) | 赤ドラは5p・5sだけ。2枚は各1枚、4枚は各2枚。 | §1 |

help 対象は上の8項目(ツモ損・北の扱い・ローカル役・オープン立直・連風牌の雀頭・本場・供託・赤ドラ)。切り上げ満貫・役満の複合には付けない(確定。mahjong-rules.md への追記もしない。§10)。

### 4.5 本場・供託(`PointField`)

props: `{ item: NumberRuleItem; value: number; onCommit: (value: number) => void }`。

- 構成: [−] [入力欄] [+](右に単位「点」を入力欄内の接尾辞として表示)。±は 48dp の icon button 相当(`--md-sys-color-secondary-container` 等、Stepper と同じトークン)。`aria-label`「{label}を減らす」「{label}を増やす」
- ±: `onCommit(clamp(value ∓ step))`。`value <= min` で − を disabled、`value >= max` で + を disabled
- 入力欄: `<input type="text" inputmode="numeric" aria-label="{label}" maxLength={5}>`。表示値は内部 `draft: string`(初期 `String(value)`)。`onChange` で `sanitizeDigits`(`/\D/g` を除去)した文字列だけを draft に入れる(数字以外は入力時点で受け付けない)。入力中は `onCommit` しない
- 確定: `blur` と `Enter`(`keydown`)で `next = commitPointValue(draft, item, value)`、`onCommit(next)`(値が同じでも draft は `String(next)` に戻す)
- `value` prop が外から変わったとき(±・プリセット戻し)は draft を `String(value)` に同期
- `commitPointValue(raw: string, item: NumberRuleItem, current: number): number`
  - `raw === ''` → `current`
  - `n = Number.parseInt(raw, 10)`、`n < min` → `min`、`n > max` → `max`
  - それ以外は `min + Math.floor((n - min) / step) * step`(下側の刻みへ切り捨て)
  - 例: 本場 250→200、10200→10000、0→0、供託 1050→1000、50→0、空欄→元の値

### 4.6 ヘッダーの左寄せ修正

- `SettingsScreen` の `.app-header__inner` に修飾クラス `app-header__inner--start` を追加。`main-screen.css` に `.app-header__inner--start { justify-content: flex-start; }`
- メイン画面の `.app-header__inner`(`space-between`)は変えない
- 戻るボタンとタイトルの間隔は既存 `gap: 0.5rem` のまま

## 5. 状態・保存・読込

### 5.1 `use-rule-settings.ts`

```ts
export function useRuleSettings(): {
  rule: Rule;
  setRule: (next: Rule) => void;          // dispatch set-rule → saveRule(safeLocalStorage(), next)
  setRuleValue: <K extends keyof Rule>(key: K, value: Rule[K]) => void; // { ...rule, [key]: value } を setRule
};
```

- 副作用(`saveRule`)はハンドラ側で呼び、reducer は純粋のまま。戻り値 false は無視(無言で継続)。true のときは `dismissLoadNotice()`(§5.2)を呼ぶ
- Select の string → 値の変換は `item.options.find(o => String(o.value) === v)?.value`(見つからなければ何もしない)

### 5.2 読込注記

- `rule-persistence.ts`:
  ```ts
  export const safeLocalStorage = (): RuleStorage | null;          // Provider から移設(挙動不変)
  export const needsLoadNotice = (loaded: LoadedRule): boolean =>
    loaded.found && (loaded.reset || loaded.issues.length > 0);
  ```
- `AppStateProvider`: 初期化で1回だけ `loadRule` し、`rule` は `createInitialState(loaded.rule)`(revert 後の形)。`needsLoadNotice(loaded)` を `useState` の初期値で保持し、`RuleLoadNoticeContext`(`{ show: boolean; dismiss: () => void }`)で配る。`useReducer` の初期化関数と `loadRule` を二重に呼ばないよう、`useState(() => loadRule(...))` で `loaded` を作ってから両方に渡す
- `useRuleLoadNotice(): { show: boolean; dismiss: () => void }` を `state/index.ts` から公開
- 表示: 設定画面上部(ヘッダー直下)に1行。文言「保存されていたルールを読み込めなかったため、既定値で補いました」(UI 監修で確認)。色は `--md-sys-color-error` 系トークン(テキストのみ、背景なし)。`role="status"`
- 表示期間(確定): 設定画面を開くたびに表示し、`saveRule` が成功したら消す(`dismiss`)。保存失敗の間は出し続ける

### 5.3 6404a90 の revert

- `git revert 6404a90` 相当の差分(強制 true の除去とコメント削除)。その後 §5.2 の改修を加える。core の既定値は変えない
- 配線の担保: `SituationSheet` の `openRiichiAllowed={rule.openRiichi}` を、Provider 経由で検知する結合テストを追加(§7 の `AppStateProvider.test.tsx`)

### 5.4 遅延読み込み(確定)

- `App.tsx` で `const SettingsScreen = lazy(() => import('./screen/SettingsScreen'))`、`<Suspense fallback={null}>`(既存の Dev ギャラリーと同じ形)。`Select`・`Switch` と `src/ui/settings/` は設定画面チャンクからだけ import する(メイン側から import しない。`md/index.ts` の再エクスポート経由で初回 JS に残らないか、ビルド後に確認)
- 採否の条件: 製造時に lazy 前後で `npm run build` し、初回 JS(`dist/index.html` が読む js)を gzip -9 で実測。**lazy 版の初回 JS が非 lazy 版より 8,000 B 以上小さければ採用、それ未満なら lazy をやめて直接 import に戻す**(8,000 B は §9.1 の Select・Switch 増分見込み約13,500 B の6割弱。共有分の取り込み違いで縮んでも明確に有利と言える下限として置く)。両方の値と採否を検収報告・PR に記録する
- fallback は `null`(読み込みは PWA のプリキャッシュから即時のため)。オフラインでも開けることは A35 で確認

## 6. ルール変更の副作用

- `set-rule` は `handOptions`(状況役)と抜き北を正規化する(既存 reducer。設定画面で別途正規化しない)
- **ルールを戻しても、正規化で外れた状況役・抜き北は復元されない**(例: オープン立直をオフにして立直がオープンからなしへ戻った後、オンに戻しても立直はオープンにならない)。仕様とする
- 赤ドラ設定を下げても手牌・副露・ドラ表示牌の赤五は書き換えない(確定)。**実測結果(§9.2)**: `red=0` で手牌に赤5p を含む和了形を `computeResult` に通すと、例外にならず `red-dora` 1飜が付く(`red=1` と同じ結果)。原因は `src/core/hora.ts` の赤ドラ集計が入力牌の `red` フラグだけを数え `rule.red` を参照しないこと。本 Issue では対応せず、後続へ引き継ぐ(§10)。手牌パレット側で赤五の追加ボタンがどう見えるかは**実挙動未確認**

## 7. テスト構成

| ファイル | 内容 |
| --- | --- |
| `src/ui/settings/settings-logic.test.ts` | `commitPointValue`(§4.5 の例すべて+min/max 境界)、`sanitizeDigits`、`changedDetailLabels`、`formatChangedSummary`(0/1/3/4/5件) |
| `src/ui/settings/rule-groups.test.ts` | 基本+詳細が RULE_ITEMS と過不足・重複なし。基本が確定3の5項目 |
| `src/ui/settings/rule-help.test.ts` | help 対象キーが §4.4 の8項目と一致(`roundedMangan`・`multipleYakuman` を含まない) |
| `src/ui/settings/PointField.test.tsx` | 数字以外が入らない、入力中は onCommit されない、blur/Enter で確定値、空欄で元の値、±の disabled |
| `src/ui/settings/HelpTooltip.test.tsx` | クリックで開閉・aria-expanded、Esc・外側 pointerdown で閉、2つ目を開くと1つ目が閉 |
| `src/ui/screen/SettingsScreen.test.tsx` | プリセット表示の切替と戻す、詳細の開閉と副テキスト、Switch/Select 変更で state と localStorage(モック storage)が更新、注記の出し分けと保存成功で消えること(保存失敗のモックでは残る)。ダブル役満の子セクション(見出し・補足・4項目) |
| `src/ui/state/AppStateProvider.test.tsx` | localStorage に `openRiichi:false` を保存 → 状況シートにオープンが出ない/`true` → 出る。`localYaku` も同様に燕返しで確認。注記フラグ(found+reset、found+issues、未保存)。`needsLoadNotice` の単体 |

既存テストは変更しない(revert で失敗するものがあれば、仮置きを前提にしたものに限り修正可。修正したテストは検収報告に列挙)。

## 8. 受け入れ条件

前提: 画面確認は `npm run dev -- --port 5201 --strictPort`(01号・G-02 の禁止事項に従う)。localStorage のキーは `mj3calc.rule`。md 部品の操作はポインタ操作か shadow 内 `button`/`input` に対して行う(host 要素への `.click()` は切り替わらないことがある。md-filter-chip で確認済みの癖)。

| # | 区分 | 手順 | 合格 |
| --- | --- | --- | --- |
| A1 | 静的 | `npm run lint`・`typecheck`・`format:check`・`test` | すべてエラーなし |
| A2 | 差分 | `git diff main --stat -- src/core` | 変更なし |
| A3 | 差分 | `git diff main -- src/ui/expressive/Stepper.tsx src/ui/expressive/stepper.css src/ui/md` | 変更なし |
| A4 | テスト | §7 の各テストファイルが存在し通過 | 通過 |
| A5 | 画面 | localStorage を空にしてリロード→メニュー「設定」 | 上から「テーマ」(自動/ライト/ダーク)、「段位戦ルール」と無効の「段位戦ルールに戻す」、基本5項目(赤ドラ・喰い断・一発・北の扱い・ツモ損)、閉じた「詳細設定」。注記なし |
| A6 | 画面 | テーマで「ダーク」→「ライト」→「自動」 | 画面の配色が即時に切り替わる。リロード後も選択が保持される(既存 theme の保存) |
| A7 | 画面 | 喰い断をオフ | プリセット表示が「カスタム」、戻すボタンが有効。DevTools で `mj3calc.rule` の `kuitan` が false |
| A8 | 画面 | 「段位戦ルールに戻す」 | 確認なしで「段位戦ルール」表示、喰い断オン、localStorage も既定 |
| A9 | 画面 | 詳細設定を開く | §4.3 の仮グループ見出しと詳細12項目(本場・供託・切り上げ満貫・連風牌の雀頭・数え役満・役満の複合・ダブル役満4種・オープン立直・ローカル役)が出る。役満グループ内に子見出し「ダブル役満」と補足「オフのときは役満」があり、その下に4種が短いラベルで並ぶ。副テキストは出ない。help は赤ドラ・北の扱い・ツモ損・本場・供託・連風牌の雀頭・オープン立直・ローカル役の8つだけ(切り上げ満貫・役満の複合には無い) |
| A10 | 画面 | 詳細で本場を+1回、数え役満オフ→閉じる | 副テキスト「本場・数え役満」(DETAIL_RULE_KEYS 順) |
| A11 | 画面 | さらに供託+1・役満の複合オフ・オープン立直オン→閉じる | 「本場・供託・数え役満ほか2件」 |
| A12 | 画面 | リロード→設定 | 詳細は閉じている。変更値は保持され副テキストも同じ |
| A13 | 画面 | 本場入力欄に「2a5０」と打鍵(全角含む) | 欄には「25」等の半角数字だけが残る。その時点では localStorage が変わらない |
| A14 | 画面 | 本場欄に 250 → Enter / 10200 → 欄外タップ / 空にして欄外タップ | それぞれ 200 / 10000 / 直前の値。欄と localStorage が一致 |
| A15 | 画面 | 供託欄に 1050 → Enter、50 → Enter | 1000、0。0 のとき − が無効 |
| A16 | 画面 | 本場を10000にする | + が無効 |
| A17 | 画面 | ツモ損の help をタップ | 吹き出しが出て `aria-expanded="true"`。§4.4 の文言。もう一度タップ・Esc・外側タップでそれぞれ閉じる |
| A18 | 画面 | ツモ損の help を開いたまま北の扱いの help をタップ | ツモ損が閉じ北の扱いだけ表示 |
| A19 | 画面 | 幅 320px で各 help(詳細内も)を開く | 吹き出しが左右とも画面内に収まる(`getBoundingClientRect` の left≥0・right≤320)。help ボタンの当たり判定が 48×48 以上 |
| A20 | テスト | `AppStateProvider.test.tsx` の openRiichi 結合テスト | false でオープンが出ず、true で出る |
| A21 | 画面 | localStorage 空でリロード→状況シート | オープン・燕返し・槓振りが出ない(revert 確認) |
| A22 | 画面 | 設定でオープン立直・ローカル役をオン→戻る→状況シート | オープン・燕返し・槓振りが出る。リロード後も出る |
| A23 | 画面 | 立直「オープン」を選んだ状態で設定のオープン立直をオフ→戻る→オンに戻す | 立直はオープンでなくなり、オンに戻しても復元されない(§6) |
| A24 | 画面 | `mj3calc.rule` に `{"version":1,"rule":{"red":9}}` を書いてリロード→設定 | ヘッダー直下に注記1行。メイン画面には出ない。戻る→再度設定でも出る。続けて喰い断を切り替えると注記が消え、戻る→再度設定でも出ない |
| A25 | 画面 | `mj3calc.rule` に `not json` を書いてリロード→設定 | 注記が出る |
| A26 | 画面 | localStorage 空でリロード→設定 | 注記が出ない |
| A27 | 画面 | 幅 375px・320px で設定画面 | 戻るボタンの右隣にタイトル「設定」(タイトルの left − 戻るボタンの right が 8px±1)。横スクロールなし |
| A28 | 画面 | 幅 375px・320px でメイン画面 | ヘッダーのタイトルとメニューボタンの位置が main と同じ(`space-between` のまま) |
| A29 | コード | `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/ui/settings` | ヒットなし |
| A30 | 画面 | ダークテーマで help を開く | 吹き出しが inverse-surface 系の配色で読める |
| A31 | 画面 | OS の視差効果を減らす(DevTools の `prefers-reduced-motion: reduce` エミュレート)で help・詳細を開閉 | 遷移アニメーションなし |
| A32 | 計測 | `npm run build` 後、初回 JS(`dist/index.html` が読む js)を `gzip -9 -c | wc -c` | 値を検収報告と PR に記録(§9.1 の見込みとの差を併記。予算超過は不合格としない)。製造担当が記録した lazy 前後の値と採否が §5.4 の条件どおりであること |
| A33 | 画面 | 赤ドラ「2枚」で手牌に赤5pを含む和了形を入れてから、設定で「赤なし」にして戻る | 手牌の赤5pは書き換わらず残る。結果は赤ドラ1飜を含む(§6 の実測どおり。不合格としない、事実の記録) |
| A34 | 画面 | (lazy 採用時)DevTools Network を Slow 3G 相当にしてキャッシュ無効でリロード→設定 | 設定画面のチャンクが設定を開いた時点で読み込まれ、読み込み中は空表示(fallback null)で例外なし。読み込み後に通常表示 |
| A35 | 計測・画面 | (lazy 採用時)`npm run build` 後 `dist/sw.js` の precache 一覧に設定画面のチャンク名が含まれる。`npm run preview` で開き Service Worker 有効化後、DevTools でオフラインにしてリロード→設定 | チャンク名が一覧にある。オフラインでも設定画面が開く |

## 9. 実測

### 9.1 バンドル(基準: main 1531258、`npm run build`、gzip -9)

- 初回 JS `index-*.js`: **122,100 B**、CSS 6,001 B
- 現在の初回 JS には `md-outlined-select`・`md-switch` が含まれない(未使用で除去されている)
- Select+SelectOption+Switch の増分: esbuild(minify・esm)で、プロジェクトが使う md 部品一式から select・switch を除いた束(39,634 B)と含めた束(53,155 B)の差 = **約13,500 B**(menu・ripple・focus 等の共有分は差し引き済み。概算)
- 設定画面の自作コード・CSS・help/expand アイコン: 約3,000〜5,000 B(見込み。未実測)
- 合計見込み: 初回 JS 約 **138,600〜140,600 B**(+16〜19 KB)
- 遅延読み込み(`React.lazy`、確定。§5.4)にした場合、上記のほぼ全量(約16〜19 KB)が初回から外れ、初回 JS は約122 KB(main とほぼ同じ)に保たれる見込み。設定画面チャンクは約16〜19 KB(gzip)。採否は §5.4 の条件で製造時の実測により決める

### 9.2 赤ドラ設定を下げたときの計算

- 一時テスト(実行後削除)で、手牌 `1234[赤5]6789p 123s 99s`(14枚・ロン既定)を `createInitialState({...既定, red})` の state に載せ `computeResult` を実行
- `red=1`: 和了、`red-dora` 1飜、計3飜
- `red=0`: **例外なし・和了、`red-dora` 1飜、計3飜**(結果は red=1 と同じ)

## 10. 後続への引き継ぎ

- 詳細設定のグループ分けは `DETAIL_RULE_GROUPS` の差し替えだけで変更できる。確定後に配列と A9・A10 の期待値を更新する
- 利用者プリセットの名前付き保存(別Issue): プリセット行(`PresetRow`)に選択 UI を足す。`findRulePreset` は `RULE_PRESETS` 固定のため、利用者プリセットとの一致判定は別関数にする
- 読込注記の Context(`useRuleLoadNotice`)は他画面でも使える
- `PointField` は設定画面専用。D1・D4 の Stepper とは共通化していない
- 切り上げ満貫・役満の複合の help は本 Issue では付けない。付けるかどうかは UI 監修時にユーザーが検討する
- 赤ドラ help の文言は暫定(UI 監修で確認)
- 赤五と赤ドラ設定の食い違い(事実): 赤ドラ設定を下げても入力済みの赤五は書き換えず、`src/core/hora.ts` の赤ドラ集計が入力牌の `red` フラグだけを数えて `rule.red` を参照しないため、`red=0` でも赤5pが赤ドラ1飜に数えられる(§9.2 の実測)。対応案は (a) D2 のパレットで設定外の赤ボタンを無効化する、(b) Epic E の結果表示で注意を出す、の2案。Issue 化は保留

## 11. 実挙動未確認

- 手牌パレット・テンキーで、`red` を下げた後に赤五の追加がどう見えるか(§6)
- Select・Switch を設定画面で使ったときのレイアウト(320px 幅での Select の最小幅)。md-outlined-select の既定最小幅が行に収まらない場合、Select に `min-width` 上書きのクラスを当てる(製造時に実測)
- 自作コードの gzip 増分(§9.1 の 3,000〜5,000 B は見込み)
