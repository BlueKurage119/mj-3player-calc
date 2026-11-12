# Issue #50 設計書: 設定画面・ルール16項目(D6)

- 対象: [Issue #50](https://github.com/BlueKurage119/mj-3player-calc/issues/50)(Epic D の D6)。ブランチ `feature/issue-50-settings-screen`
- 本書で決めるもの: 設定画面の中身(テーマ・プリセット・ルール16項目)、保存・読込の接続、読込注記、ツールチップ、本場・供託の入力部品、設定画面ヘッダーの左寄せ修正、6404a90 の revert
- 本書で決めないもの: 利用者プリセットの名前付き保存(別Issue)、詳細設定内のグループ分けの確定(後日ユーザーが決める。§4.3 は仮)、バンドル予算値の改訂(別途協議)
- 改訂: 実装(5ec6876〜ddc40a6)後、ユーザーの直接監修(1bc60c7〜0b10b76)で実装が変わったため、実装を正として本書を改訂した。変更点は §12

## 1. 参照資料と判断の根拠

| 資料 | 導いた判断 |
| --- | --- |
| 統括担当から渡されたヒアリング済み確定事項 1〜12 | §2 の表に番号で対応づけ、そのまま前提とする |
| [docs/issues-draft.md](../issues-draft.md) D6 項 | 範囲(RULE_ITEMS から画面を組み立てる・プリセット一致表示・loadRule/saveRule 接続・テーマ切替) |
| [issue-51-screen-skeleton.md](issue-51-screen-skeleton.md) §2.3・§7 | `SettingsScreen` を置き換える。`loaded` の扱いは D6 で決める(→ §5.2) |
| [issue-49-situation-input.md](issue-49-situation-input.md) §5・§12 | `set-rule` は handOptions・抜き北を正規化する。6404a90 を revert する。D6 で遅延読み込みの削減量を計測する |
| [issue-29-rule-items.md](issue-29-rule-items.md)・[issue-30-rule-storage.md](issue-30-rule-storage.md)・[issue-31-rule-preset.md](issue-31-rule-preset.md) | `RULE_ITEMS`(kind 3種。実数は17項目=基本5+詳細12。Issue 名の「16項目」とは数が合わないが、画面は `RULE_ITEMS` の全項目を出す)、`loadRule`/`saveRule`/`LoadedRule`、`RULE_PRESETS`/`findRulePreset` をそのまま使う。core は変更しない |
| `src/ui/md/Switch.tsx`・`Dialog.tsx` | 既存ラッパーを使う(Switch は boolean。当初は `Select.tsx` も使う設計だったが監修で廃止。§12) |
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
| 5 | help ツールチップ。対象は8項目(監修で確定: 赤ドラ・北の扱い・積み棒・供託・切り上げ満貫・役満の複合・オープン立直・ローカル役) | §4.4 |
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
| `src/ui/settings/RuleItemRow.tsx` | 新規 | 1項目の行(kind で ConnectedButtonGroup/Switch/PointField を出し分け、help を付ける。`tsumoLoss` は `TsumoLossRow` へ) |
| `src/ui/settings/TsumoLossRow.tsx` | 新規(監修) | ツモ損の行ボタン+説明付きラジオのダイアログ(§4.7) |
| `src/ui/md/Radio.tsx` | 新規(監修) | `md-radio` のラッパー。`md-radio` の JSX 型は同ファイル内で拡張。`md/index.ts` から export |
| `src/ui/md/index.ts` | 改修(監修) | `Radio`・`RadioProps` の export を追加 |
| `src/ui/settings/PointField.tsx` | 新規 | 積み棒(本場)・供託の ±+直接入力 |
| `src/ui/settings/HelpTooltip.tsx` | 新規 | help ボタン+tooltip、同時1つの管理(`HelpTooltipScope`) |
| `src/ui/settings/rule-groups.ts` | 新規 | 基本/詳細とグループ定義(データ1か所) |
| `src/ui/settings/rule-help.ts` | 新規 | ツールチップ文言 `RULE_HELP_TEXTS`(§4.4)、表示名の上書き `RULE_LABEL_OVERRIDES`・`ruleItemLabel`(§4.8)、ツモ損ダイアログの説明 `TSUMO_LOSS_DESCRIPTIONS`(§4.7) |
| `src/ui/settings/settings-logic.ts` | 新規 | 純関数: `commitPointValue`・`changedDetailLabels`・`formatChangedSummary`・`sanitizeDigits`・`applyRuleChange`、選択項目用の `choiceOptions`・`choiceValue`・`resolveChoice`・`currentChoiceLabel` |
| `src/ui/settings/use-rule-settings.ts` | 新規 | `set-rule`+`saveRule` をまとめるフック |
| `src/ui/settings/settings.css` | 新規 | 設定画面のスタイル(md トークンのみ) |
| `src/ui/settings/index.ts` | 新規 | 再エクスポート |
| `src/ui/state/AppStateProvider.tsx` | 改修 | 6404a90 revert。`loaded` から注記フラグを保持する Context を追加 |
| `src/ui/state/rule-persistence.ts` | 新規 | `safeLocalStorage` を Provider から移し、`needsLoadNotice` を置く |
| `src/ui/state/index.ts` | 改修 | `useRuleLoadNotice` を再エクスポート |
| `src/ui/icons/symbol-paths.ts` | 改修 | `SYMBOL_HELP`(Material Symbols outlined `help` 24px)・`SYMBOL_EXPAND_MORE`(同 `expand_more`)・`SYMBOL_CHEVRON_RIGHT`(同 `chevron_right`。監修)を追加。出典コメントは既存のまま |
| `src/ui/icons/index.ts` | 改修 | 上記3定数の named export を追加(バレルは個別 export 方式) |
| `src/ui/settings/tooltip-logic.ts` | 新規 | 純粋な reducer `reduceTooltip`、位置補正の純関数 `computeTooltipShiftX`(監修。§4.4) |
| `src/ui/screen/main-screen.css` | 改修 | `.app-header__inner--start` を追加(メイン画面は不変) |
| テスト | 新規 | §7 |

`src/core/` は変更しない。`Stepper`・`ConnectedButtonGroup`・`Select`・`Switch` は変更しない(`Select` は監修で設定画面から使わなくなった。`src/ui/md` の変更は `Radio.tsx` の新規と `index.ts` の export 追加だけ。`PointField` のボタンは `stepper.css` のクラスを流用せず、同じトークンを使う独自クラスで見た目を合わせる。Stepper の CSS 変更が設定画面に波及しないため)。

## 4. 画面仕様

### 4.1 全体(上から)

```
[←] 設定                        ← ヘッダー(§4.6)
(読込注記 1行。条件付き §5.2)
[自動|ライト|ダーク]             ← ConnectedButtonGroup(行幅いっぱい)
──────────
段位戦ルール / カスタム   [段位戦ルールに戻す]
赤ドラ (?)    [赤なし|2枚|4枚]
喰い断        [Switch]
一発          [Switch]
北の扱い (?)  [抜きドラ|共通役牌]
ツモ損        ツモ損あり  >       ← 行全体がボタン → ダイアログ(§4.7)
詳細設定  ˅                      ← 閉時のみ副テキスト(§4.3)
  (開時: 詳細グループ見出し+項目)
```

- セクション見出し「テーマ」「ルール」を置く(md typescale title-small 相当)。「ルール」見出しはプリセット行の上。見ればわかる説明書きは置かない
- テーマ(監修): ConnectedButtonGroup を行幅いっぱい(`width: 100%`)にし、ラベルは折り返さない(`white-space: nowrap`。`settings.css`)。実測の各ボタン幅は 375px で約102px、320px で約84px
- 選択項目(監修。Select は使わない): 赤ドラ・北の扱い・連風牌の雀頭は、左に項目ラベル(+help)、同じ行の右に ConnectedButtonGroup(`label={ruleItemLabel(item)}` を radiogroup の aria-label に)。収まらない幅だけ折り返す(375px・320px では3項目とも同じ行に収まる)。値の変換は `choiceOptions`・`choiceValue`・`resolveChoice`
- ツモ損: §4.7 のダイアログ選択
- Switch 行: 左に項目ラベル+help、右に `Switch`(`label={ruleItemLabel(item)}` を aria-label として渡す)
- PointField 行: 左に項目ラベル+help、右に PointField
- 項目行の最小高は 48dp(3rem)。行間の区切りは余白で取り、Divider はセクション間だけ
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
    subgroups: [{ id: 'double-yakuman', title: 'ダブル役満', note: 'オフのときはシングル役満',
      keys: ['kokushi13DoubleYakuman', 'suankoTankiDoubleYakuman', 'daisushiDoubleYakuman', 'pureChurenDoubleYakuman'] }] },
  { id: 'local', title: 'ローカル', keys: ['openRiichi', 'localYaku'] }
];

export const DETAIL_RULE_KEYS: readonly RuleKey[] = DETAIL_RULE_GROUPS.flatMap(g => [
  ...g.keys, ...(g.subgroups ?? []).flatMap(s => s.keys)
]);
```

- 不変条件(テストで担保): `BASIC_RULE_KEYS` と `DETAIL_RULE_KEYS` の和が `RULE_ITEMS` の key と過不足なく一致し、重複が無い。行の描画はキーから `RULE_ITEMS` を引く(ラベル・選択肢は `RULE_ITEMS` が正)
- ダブル役満の子セクション(確定。見出し・補足の文言は暫定): 見出し「ダブル役満」(title-small より一段弱い label-large 相当)、その直下に補足「オフのときはシングル役満」(監修で変更。body-small、`--md-sys-color-on-surface-variant`)。4種の行ラベルは `RULE_ITEMS` のまま短く(「国士無双十三面待ち」「四暗刻単騎」「大四喜」「純正九蓮宝燈」)。意味の根拠: `src/core/hora.ts` で各キーは役満の point を 2(オン)/1(オフ)に切り替えるだけで、オフでも役は成立し1倍の役満として数える。子セクションは `role="group"`+`aria-labelledby`(見出し)・`aria-describedby`(補足)
- アコーディオン: 自作のディスクロージャー(`<button type="button" aria-expanded aria-controls>`+`<div id role="region" aria-labelledby hidden={!open}>`)。`<details>` を採らない理由: (1) 開閉を React state で持ち、副テキストの出し分けを state と一致させたい(`<details>` は `toggle` イベント経由の同期が要る)、(2) 行全体に既存 `Ripple`・`FocusRing` を付けて他の行と同じ MD3 の状態層を出したい(`<summary>` は既定マーカーとフォーカス表現の打ち消しが要る)、(3) WAI-ARIA の Disclosure パターンで a11y は同等。展開アイコンは `SYMBOL_EXPAND_MORE`(§3 で追加)を開時に180°回転。遷移は `var(--md-sys-motion-duration-short4)`・`var(--md-sys-motion-easing-standard)`、`prefers-reduced-motion: reduce` で `transition: none`
- 開閉領域 `.settings-accordion__content` は `display: flex` を持つため、`hidden` 属性が上書きされて閉でも表示される不具合があった(監修で発見)。`.settings-accordion__content[hidden] { display: none; }` を併記する
- 既定は閉。開閉状態は保存しない(コンポーネント内 `useState(false)`)
- 副テキスト(閉時のみ): `changedDetailLabels(rule)` = `DETAIL_RULE_KEYS` の順で `rule[key] !== item.defaultValue` の項目の `ruleItemLabel(item)`(§4.8。本場は「積み棒」)。`formatChangedSummary(labels)`:
  - 0件 → `null`(非表示)
  - 1〜3件 → `labels.join('・')`(例「積み棒・供託」)
  - 4件以上 → 先頭3件を `・` で連結+`ほか{N}件`(N=件数−3。例「積み棒・供託・数え役満ほか2件」)
  - 値は出さない。開いている間は非表示

### 4.4 ツールチップ(help)

`HelpTooltip` の props: `{ id: string; label: string /* 項目名 */; text: string }`。

- DOM: ラベル直後に `<span class="help-tooltip">`(ラッパー)の中へ `<button type="button" class="help-tooltip__button" aria-label="{label}の説明" aria-expanded={open} aria-describedby="{id}">`(中は `SymbolIcon` の `SYMBOL_HELP`、18〜20px 表示、タップ領域は 48×48dp を `::before` で確保し隣接操作要素と 8dp 以上離す)+ `<span id="{id}" role="tooltip" class="help-tooltip__bubble" hidden={!visible}>`
- `aria-describedby` は常時付ける。`hidden` の間は吹き出しが a11y ツリーから外れるが、`aria-describedby` の参照先は hidden でも説明文として計算される(accname 仕様)ため、スクリーンリーダー利用者はボタンにフォーカスしただけで説明を得られる。視覚表示と独立に説明を届けられるので、表示中だけ付ける方式より適切と判断
- 表示条件: クリック(タップ)でトグル。`@media (hover: hover)` の端末ではホバーでも表示し、ホバー判定はラッパー `.help-tooltip` 全体(ボタン+吹き出し)にかける(吹き出しにカーソルを移しても閉じない。WCAG 1.4.13)。`:focus-visible` でも表示(`onFocus`/`onBlur` で `matches(':focus-visible')` を見て state 化)
- 閉じる: 外側の `pointerdown`(document)、`Escape` キー、別の help を開いたとき
- 同時1つ: `HelpTooltipScope`(Context)を `SettingsScreen` 直下に置き、state は `tooltip-logic.ts` の純粋な reducer で持つ:
  ```ts
  export type TooltipState = { openId: string | null; via: 'click' | 'hover' | 'focus' | null };
  export type TooltipEvent =
    | { type: 'click'; id: string } | { type: 'hover-enter'; id: string } | { type: 'hover-leave'; id: string }
    | { type: 'focus-visible'; id: string } | { type: 'blur'; id: string }
    | { type: 'escape' } | { type: 'outside-pointerdown' };
  export const reduceTooltip = (s: TooltipState, e: TooltipEvent): TooltipState;
  ```
  規則: click は同じ id が開いていれば閉、違えばその id を開く(via click)。hover-enter/focus-visible は開く。hover-leave/blur は該当 id が via hover/focus で開いているときだけ閉じる(click で開いたものは残す)。escape・outside-pointerdown は閉じる。DOM イベントからこの event への変換だけをコンポーネントが行う
- 見た目: 背景 `--md-sys-color-inverse-surface`、文字 `--md-sys-color-inverse-on-surface`、角丸 `--md-sys-shape-corner-extra-small` 相当、body-small 文字。`max-width: min(280px, 100vw - 32px)`。位置はボタン直下。左右の見切れ防止(監修で改訂): 表示時に吹き出しの `getBoundingClientRect()` と `document.documentElement.clientWidth` から純関数 `computeTooltipShiftX(rect, viewportWidth, margin = 16): number` で補正量を求め(右はみ出しを戻し、なお左が margin 未満なら左端を優先)、state(数値)として `margin-left` に適用する。閉じるたびに 0 へ戻す。基準を `window.innerWidth` から `clientWidth` に変えた理由: `innerWidth` は実表示幅とずれ、右にはみ出して横スクロールが出た。`transform` ではなく `margin-left` にした理由: `transform` では補正後も `scrollWidth` が広がる現象が出た(原因は未特定)。`white-space: pre-line` で文言中の `\n` を改行として表示する。フェードは `opacity` を `var(--md-sys-motion-duration-short2)` と `var(--md-sys-motion-easing-standard)` で遷移(`static-tokens.css` の既存トークン。ms・cubic-bezier の直書き禁止)。`prefers-reduced-motion: reduce` で `transition: none`
- HEX 直書き禁止(既存トークン変数のみ)

文言(UI 監修でユーザーが定めた。実物の `src/ui/settings/rule-help.ts` の `RULE_HELP_TEXTS` を正とする。確定扱いにするのは画面文言のみで、ルールの記述としての確定は docs/mahjong-rules.md の各節による):

| 項目 | 文言(実物) | 関連する節 |
| --- | --- | --- |
| 赤ドラ | 2枚では各1枚、4枚では各2枚の5筒・5索を赤ドラにします。 | §1 |
| 北の扱い | 抜きドラ: 抜いた北1枚につき1飜。抜かずに手牌で使う北は客風牌扱いです。(改行)共通役牌: 北の刻子・槓子で1飜役「役牌：北」。 | §2 |
| 積み棒 | 0〜10,000点の範囲内で、200の整数倍になるように指定してください。 | §3.2 |
| 供託 | 0〜10,000点の範囲内で、100の整数倍になるように指定してください。 | §3.2 |
| 切り上げ満貫 | 基本点1,920点（子のロン7,700点）を満貫にできます。 | §3.3(定義はユーザー監修の文言による) |
| 役満の複合 | オフにすると、点数の高い役満で計算されます。 | §3.3(同上) |
| オープン立直 | オープンリーチは2飜、オープンダブルリーチは3飜です。立直の選択肢に加わります。 | §4.2・§4.2.2 |
| ローカル役 | 採用しているローカル役を一括でオン・オフします。 | §4.2 |

help 対象は上の8項目。ツモ損(ダイアログ内に説明がある。§4.7)と連風牌の雀頭には付けない。切り上げ満貫・役満の複合の help は、設計時点では出典不足で付けない方針だったが、UI 監修でユーザーが文言を定めて付けた。

### 4.5 積み棒(本場)・供託(`PointField`)

props: `{ item: NumberRuleItem; value: number; onCommit: (value: number) => void }`。

- 入力欄の幅(監修): `width: calc(5ch + 1.625rem + 2px)`(約78px)。5桁「10000」と単位「点」が欠けずに表示される(375px・320px で実測)

- 構成: [−] [入力欄] [+] を `<div role="group" aria-label={item.label}>` で束ねる。単位「点」は入力欄内の接尾辞で `aria-hidden="true"`。入力欄と接尾辞に既存 `.tabular-nums` クラス(`static-tokens.css`)を付ける。±は 48dp の icon button 相当(`--md-sys-color-secondary-container` 等、Stepper と同じトークン)。`aria-label`「{label}を減らす」「{label}を増やす」
- ±: `onCommit(clamp(value ∓ step))`。`value <= min` で − を disabled、`value >= max` で + を disabled
- 入力欄: `<input type="text" inputmode="numeric" aria-label="{label}" maxLength={5}>`。表示値は内部 `draft: string`(初期 `String(value)`)。`onChange` で `sanitizeDigits`(`/\D/g` を除去)した文字列だけを draft に入れる(数字以外は入力時点で受け付けない)。入力中は `onCommit` しない
- 確定: `blur` と `Enter`(`keydown`)で `next = commitPointValue(draft, item, value)`、`onCommit(next)` の後、**確定のたびに必ず** `setDraft(String(next))`(value が同値で再描画が起きなくても、例えば "999"→本場 800 のような表示残りを防ぐ)
- `value` prop が外から変わったとき(±・プリセット戻し)は draft を `String(value)` に同期
- 編集中に「戻る」「段位戦ルールに戻す」・±を押した場合: ボタンの `pointerdown` で入力欄の `blur` が先に発火して確定(`set-rule`+保存)し、その後の `click` でボタンの処理が走る。別イベントなので React は間で描画を反映する(戻すボタンは確定後の rule に対して既定へ戻す)。実挙動は A36 で確認
- `commitPointValue(raw: string, item: NumberRuleItem, current: number): number`
  - `raw === ''` → `current`
  - `n = Number.parseInt(raw, 10)`、`n < min` → `min`、`n > max` → `max`
  - それ以外は `min + Math.floor((n - min) / step) * step`(下側の刻みへ切り捨て)
  - 例: 本場 250→200、10200→10000、0→0、供託 1050→1000、50→0、空欄→元の値

### 4.6 ヘッダーの左寄せ修正

- `SettingsScreen` の `.app-header__inner` に修飾クラス `app-header__inner--start` を追加。`main-screen.css` に `.app-header__inner--start { justify-content: flex-start; }`
- メイン画面の `.app-header__inner`(`space-between`)は変えない
- 戻るボタンとタイトルの間隔は既存 `gap: 0.5rem` のまま

### 4.7 ツモ損のダイアログ選択(監修。`TsumoLossRow`)

props: `{ item: SelectRuleItem; rule: Rule; onChange: (value: Rule['tsumoLoss']) => void }`。

- 行全体が `<button type="button" aria-haspopup="dialog">`(Ripple・FocusRing 付き)。左に「ツモ損」、右に現在値(`currentChoiceLabel`)と `SYMBOL_CHEVRON_RIGHT`
- 押すと既存 `Dialog`(見出し「ツモ損」)を開く。中は `role="radiogroup"` に `Radio`(`md-radio`)3つ。各選択肢はラベル+説明(`TSUMO_LOSS_DESCRIPTIONS`。`describedBy` で radio に結び付ける)
- 説明文(docs/mahjong-rules.md §3.1 の【確定】文言そのまま): ツモ損あり「通常どおり計算し、北家の負担分は誰も払わない」/北家分折半「北家の負担額を、ツモられた2人で折半して上乗せする」/ロン打点折半「ロンの打点を、親子に関わらず2人で折半して支払う」
- 選択すると即反映(`set-rule`+保存。現在値と同じなら反映しない)してダイアログを閉じる。スクリムのタップ・Esc は変更なしで閉じる

### 4.8 表示名の上書き(監修)

- `RULE_LABEL_OVERRIDES = { honbaPoint: '積み棒' }`、`ruleItemLabel(item)` で設定画面の表示名を得る(行ラベル・help の aria-label・PointField の aria-label・副テキスト)。core の `rule-items.ts` の label(「本場」)は変更しない

## 5. 状態・保存・読込

### 5.1 `use-rule-settings.ts`

```ts
export function useRuleSettings(): {
  rule: Rule;
  setRule: (next: Rule) => void;          // dispatch set-rule → saveRule(safeLocalStorage(), next)
  setRuleValue: <K extends keyof Rule>(key: K, value: Rule[K]) => void; // { ...rule, [key]: value } を setRule
};
```

- 本体は純関数 `applyRuleChange(rule: Rule, key, value, storage: RuleStorage | null): { rule: Rule; saved: boolean }`(同ファイル。Node でテストする)。フックは `safeLocalStorage()` を渡して呼び、`dispatch({ type: 'set-rule', rule })` する
- 副作用(`saveRule`)はハンドラ側で呼び、reducer は純粋のまま。戻り値 false は無視(無言で継続)。true のときは `dismissLoadNotice()`(§5.2)を呼ぶ
- 選択項目(ConnectedButtonGroup・ツモ損ダイアログ)の string → 値の変換は `resolveChoice(item, v)`(`item.options` から `String(o.value) === v` を探す。見つからなければ何もしない)

### 5.2 読込注記

- `rule-persistence.ts`:
  ```ts
  export const safeLocalStorage = (): RuleStorage | null;          // Provider から移設(挙動不変)
  export const needsLoadNotice = (loaded: LoadedRule): boolean =>
    loaded.found && (loaded.reset || loaded.issues.length > 0);
  ```
- `AppStateProvider`: 初期化で1回だけ `loadRule` し、`rule` は `createInitialState(loaded.rule)`(revert 後の形)。`needsLoadNotice(loaded)` を `useState` の初期値で保持し、`RuleLoadNoticeContext`(`{ show: boolean; dismiss: () => void }`)で配る。`useReducer` の初期化関数と `loadRule` を二重に呼ばないよう、`useState(() => loadRule(...))` で `loaded` を作ってから両方に渡す
- `useRuleLoadNotice(): { show: boolean; dismiss: () => void }` を `state/index.ts` から公開
- 表示: 設定画面上部(ヘッダー直下)に1行。文言「保存されていたルールを読み込めなかったため、既定値で補いました」(UI 監修で確認)。文字色は `var(--md-sys-color-error)`(`tokens.css` にライト・ダーク両方あり。背景なし)。`role="status"`
- 表示期間(確定): 設定画面を開くたびに表示し、`saveRule` が成功したら消す(`dismiss`)。保存失敗の間は出し続ける

### 5.3 6404a90 の revert

- `git revert 6404a90` 相当の差分(強制 true の除去とコメント削除)。その後 §5.2 の改修を加える。core の既定値は変えない
- 初期化の切り出し: `safeLocalStorage()` は `window` を直接参照し Node のテスト環境で検証できないため、`rule-persistence.ts` に純関数を置き、Provider はこれを呼ぶだけにする:
  ```ts
  export interface InitialAppData { state: AppState; loadNotice: boolean }
  export const createInitialStateFromStorage = (storage: RuleStorage | null): InitialAppData =>
    { const loaded = loadRule(storage); return { state: createInitialState(loaded.rule), loadNotice: needsLoadNotice(loaded) }; };
  ```
- 配線の担保(A20): (1) モック storage に `openRiichi:false`/`true` を保存した JSON を入れて `createInitialStateFromStorage` を呼び、`state.rule.openRiichi` が偽/真であること。(2) `SituationSheet` に `openRiichiAllowed` を偽/真で渡した `renderToStaticMarkup` でオープン chip の有無が変わること。(1)(2)で「保存値→初期 state→chip」の各段を担保し、Provider 内の `openRiichiAllowed={rule.openRiichi}` の受け渡しは A21・A22 の画面確認で担保する

### 5.4 遅延読み込み(確定)

- `App.tsx` で `const SettingsScreen = lazy(() => import('./screen/SettingsScreen'))`、`<Suspense fallback={null}>`(既存の Dev ギャラリーと同じ形)。`Select`・`Switch` と `src/ui/settings/` は設定画面チャンクからだけ import する(メイン側から import しない。`md/index.ts` の再エクスポート経由で初回 JS に残らないか、ビルド後に確認)
- 採否の条件: 製造時に lazy 前後で `npm run build` し、初回 JS(`dist/index.html` が読む js)を gzip -9 で実測。**lazy 版の初回 JS が非 lazy 版より 8,000 B 以上小さければ採用、それ未満なら lazy をやめて直接 import に戻す**(8,000 B は §9.1 の Select・Switch 増分見込み約13,500 B の6割弱。共有分の取り込み違いで縮んでも明確に有利と言える下限として置く)。両方の値と採否を検収報告・PR に記録する
- fallback は `null`(読み込みは PWA のプリキャッシュから即時のため)。オフラインでも開けることは A35 で確認

## 6. ルール変更の副作用

- `set-rule` は `handOptions`(状況役)と抜き北を正規化する(既存 reducer。設定画面で別途正規化しない)
- **ルールを戻しても、正規化で外れた状況役・抜き北は復元されない**(例: オープン立直をオフにして立直がオープンからなしへ戻った後、オンに戻しても立直はオープンにならない)。仕様とする
- 赤ドラ設定を下げても手牌・副露・ドラ表示牌の赤五は書き換えない(確定)。**実測結果(§9.2)**: `red=0` で手牌に赤5p を含む和了形を `computeResult` に通すと、例外にならず `red-dora` 1飜が付く(`red=1` と同じ結果)。原因は `src/core/hora.ts` の赤ドラ集計が入力牌の `red` フラグだけを数え `rule.red` を参照しないこと。本 Issue では対応せず、後続へ引き継ぐ(§10)。パレット側は対応済み(実物): `TilePalette.tsx` の `hasRed = rule.red > 0` で赤なしのとき赤五キーは非表示、`hand-rules.ts` の枚数上限(`isAvailableTiles`)で赤五の追加も無効化され、`TilePalette.test` に赤なし時の非描画テストがある。未解決の事実は2点: (1) ルール変更前に入力済みの手牌・副露の赤五は `set-rule` で置換・除去されない、(2) `hora.ts` が `rule.red` を参照せず入力の `red` フラグを常に数える

> 【事後注記】Issue #62([issue-62-red-reset.md](issue-62-red-reset.md))で、赤ドラ設定(`Rule.red`)が前の値と変わったときは手牌・副露・ドラ表示牌・裏ドラ表示牌をリセットするよう改めた(抜き北・状況役・卓は保持)。「赤五は書き換えない」判断と A33 の期待値は置き換わる。`hora.ts` が `rule.red` を参照しない点は変更していない(UI のリセットで実害が防がれるため、#62 に記録して閉じた)。

## 7. テスト構成

テスト基盤の前提(実物): vitest は Node 環境で、jsdom・happy-dom・@testing-library は無い。既存のコンポーネントテストは `renderToStaticMarkup` のみ。パッケージは追加しない。方針: (1) 操作の挙動は純関数・純粋な reducer に切り出して単体テスト、(2) コンポーネントは props 駆動で `renderToStaticMarkup` による静的描画(要素・aria 属性・disabled・副テキスト)だけを検証、(3) DOM イベントそのもの(hover・click・blur・Esc・外側 pointerdown・Enter)は §8 の画面確認で担保する。

| ファイル | 内容 |
| --- | --- |
| `src/ui/settings/settings-logic.test.ts` | `commitPointValue`(§4.5 の例すべて+min/max 境界)、`sanitizeDigits`(全角数字・英字・記号の除去)、`changedDetailLabels`(本場は「積み棒」)、`formatChangedSummary`(0/1/3/4/5件)、`choiceOptions`・`choiceValue`・`resolveChoice`・`currentChoiceLabel`、`applyRuleChange` |
| `src/ui/settings/tooltip-logic.test.ts` | `reduceTooltip`: click で開閉トグル・別 id へ切替(同時1つ)、hover-leave/blur は click で開いたものを閉じない、escape・outside-pointerdown で閉。`computeTooltipShiftX`: 右はみ出し・左はみ出し・両方(左優先)・はみ出しなし |
| `src/ui/settings/rule-groups.test.ts` | 基本+詳細が RULE_ITEMS と過不足・重複なし。基本が確定3の5項目 |
| `src/ui/settings/rule-help.test.ts` | help 対象キーが §4.4 の8項目と一致(`tsumoLoss`・`doubleWindFu` を含まない)。`ruleItemLabel` の上書き(本場→積み棒) |
| `src/ui/settings/PointField.test.tsx` | 静的描画: value=min で − が disabled、max で + が disabled、`role="group"`・`aria-label`・`inputmode="numeric"`、「点」が `aria-hidden` |
| `src/ui/settings/HelpTooltip.test.tsx` | 静的描画: 閉で `aria-expanded="false"`・吹き出し `hidden`、開(Scope の初期 openId 指定)で `"true"`・hidden なし。`aria-describedby` が吹き出しの id と一致 |
| `src/ui/settings/RuleSection.test.tsx` | 静的描画(rule を props/Provider 初期値で与える): 基本5項目、閉時の副テキスト(変更なしで無し・2件・5件)、開時(初期 open 指定)にダブル役満の子見出し・補足「オフのときはシングル役満」・4項目と詳細側の help、赤ドラ・北の扱い・連風牌の雀頭がボタン群でツモ損が現在値つきのダイアログ行(`aria-haspopup="dialog"`)、プリセット行の「段位戦ルール」/「カスタム」と戻すボタンの disabled。監修で追加: `D6-RuleSection-accordion-hidden`(閉で `hidden`・`aria-expanded="false"`、開で無し・`"true"`)、`D6-RuleSection-accordion-css`(`.settings-accordion__content[hidden]` に `display: none`) |
| `src/ui/settings/use-rule-settings.test.ts` | `applyRuleChange(rule, key, value, storage)`(`settings-logic.ts`。新 rule を返し saveRule を呼ぶ。戻り値に保存成否)をモック storage で検証: 保存内容、setItem 例外でも例外にならず成否 false |
| `src/ui/state/rule-persistence.test.ts` | `needsLoadNotice`(found+reset、found+issues、未保存、正常)。`createInitialStateFromStorage`: `openRiichi:false`/`true`・`localYaku` 保存で初期 rule がそのまま(revert の担保)、注記フラグ |
| `src/ui/input/SituationSheet.test.tsx`(追記) | `openRiichiAllowed` 偽/真の静的描画でオープン chip の有無(既存に同等のテストがあれば流用し追記不要) |

既存テストは変更しない(revert で失敗するものがあれば、仮置きを前提にしたものに限り修正可。修正したテストは検収報告に列挙)。

## 8. 受け入れ条件

前提: 画面確認は `npm run dev -- --port 5201 --strictPort`(01号・G-02 の禁止事項に従う)。localStorage のキーは `mj3calc.rule`。md 部品の操作はポインタ操作か shadow 内 `button`/`input` に対して行う(host 要素への `.click()` は切り替わらないことがある。md-filter-chip で確認済みの癖)。

| # | 区分 | 手順 | 合格 |
| --- | --- | --- | --- |
| A1 | 静的 | `npm run lint`・`typecheck`・`format:check`・`test` | すべてエラーなし |
| A2 | 差分 | `git fetch && git diff origin/main --stat -- src/core` | 変更なし |
| A3 | 差分 | `git diff origin/main --stat -- src/ui/expressive src/ui/md` | `src/ui/expressive` は変更なし。`src/ui/md` は `Radio.tsx`(新規)と `index.ts`(Radio の export 追加のみ)だけ。`git diff origin/main -- src/ui/md/index.ts` が export 追加行だけであること |
| A4 | テスト | §7 の各テストファイルが存在し、§7 の表の内容のテストケースを含み、`npm test` で通過 | 通過 |
| A5 | 画面 | localStorage を空にしてリロード→メニュー「設定」 | 上から「テーマ」(自動/ライト/ダーク)、「段位戦ルール」と無効の「段位戦ルールに戻す」、基本5項目(赤ドラ[赤なし/2枚/4枚]・喰い断・一発・北の扱い[抜きドラ/共通役牌]・ツモ損「ツモ損あり >」)、閉じた「詳細設定」。ドロップダウン(Select)は無い。詳細の項目は見えない。注記なし |
| A6 | 画面 | テーマで「ダーク」→「ライト」→「自動」 | 画面の配色が即時に切り替わる。リロード後も選択が保持される(既存 theme の保存) |
| A7 | 画面 | 喰い断をオフ | プリセット表示が「カスタム」、戻すボタンが有効。DevTools で `mj3calc.rule` の `kuitan` が false |
| A8 | 画面 | 「段位戦ルールに戻す」 | 確認なしで「段位戦ルール」表示、喰い断オン、localStorage も既定 |
| A9 | 画面 | 詳細設定を開く。続けて閉じる | 開: §4.3 の仮グループ見出しと詳細12項目(積み棒・供託・切り上げ満貫・連風牌の雀頭[4符/2符]・数え役満・役満の複合・ダブル役満4種・オープン立直・ローカル役)が出る。役満グループ内に子見出し「ダブル役満」と補足「オフのときはシングル役満」があり、その下に4種が短いラベルで並ぶ。副テキストは出ない。画面全体で help は赤ドラ・北の扱い・積み棒・供託・切り上げ満貫・役満の複合・オープン立直・ローカル役の8つだけ(ツモ損・連風牌の雀頭には無い)。閉: 詳細の12項目が画面から消える(`.settings-accordion__content` の computed `display` が `none`) |
| A10 | 画面 | 詳細で積み棒を+1回、数え役満オフ→閉じる | 副テキスト「積み棒・数え役満」(DETAIL_RULE_KEYS 順) |
| A11 | 画面 | さらに供託+1・役満の複合オフ・オープン立直オン→閉じる | 「積み棒・供託・数え役満ほか2件」 |
| A12 | 画面 | リロード→設定 | 詳細は閉じている。変更値は保持され副テキストも同じ |
| A13 | 画面 | 積み棒入力欄に「2a5０」と打鍵(全角含む) | 欄には「25」等の半角数字だけが残る。その時点では localStorage が変わらない |
| A14 | 画面 | 積み棒欄に 250 → Enter / 10200 → 欄外タップ / 空にして欄外タップ | それぞれ 200 / 10000 / 直前の値。欄と localStorage が一致 |
| A15 | 画面 | 供託欄に 1050 → Enter、50 → Enter。続けて幅 375px・320px で積み棒・供託を 10000 にする | 1000、0。0 のとき − が無効。10000 のとき欄内に「10000」と「点」が欠けずに表示される(入力欄の `scrollWidth` ≤ `clientWidth`、幅は約78px) |
| A16 | 画面 | 積み棒を10000にする | + が無効 |
| A17 | 画面 | 赤ドラの help をタップ。次に北の扱いの help をタップ | 赤ドラ: 吹き出しが出て `aria-expanded="true"`、§4.4 の文言。もう一度タップ・Esc・外側タップでそれぞれ閉じる。北の扱い: 文言が2行(抜きドラ/共通役牌)で表示される。ホバー可能な環境(`matchMedia('(hover: hover)')` が真)では、赤ドラの help にホバー → ボタン右側の、ボタン下端と吹き出し上端の間(4px)の座標へポインタを置く(`elementFromPoint` が吹き出しの上端の橋 `.help-tooltip__bubble::before` を返す)→ 吹き出し内へ移動、の隙間経由の経路でも、吹き出しが閉じない(WCAG 1.4.13。PR #63 の Codex 指摘への対応) |
| A18 | 画面 | 赤ドラの help を開いたまま北の扱いの help をタップ | 赤ドラが閉じ北の扱いだけ表示 |
| A19 | 画面 | 幅 375px(合否の判定幅)・320px(非推奨幅。参考値で、不合格にしない)で8つの help(詳細内も)を1つずつ開き、吹き出しの `getBoundingClientRect()` と `document.documentElement.clientWidth`(W)、`document.documentElement.scrollWidth` を取る。help ボタンは、当たり判定(`::before`。右端をアイコンに揃え、左・上下へ張り出す)の矩形の中心座標 (cx, cy) から ±23px の4点(cx±23, cy)・(cx, cy±23) で `document.elementFromPoint` を呼ぶ。隣接する操作要素(ConnectedButtonGroup・Switch・PointField のボタン)との間隔を両者の当たり判定の矩形で測る | 吹き出しは left≥16 かつ right≤W−16。開いている間も `scrollWidth` が W を超えない(横スクロールが出ない)。閉じた後に開き直しても同じ。4点すべてが当該 help ボタン(またはその子孫)を返す(当たり判定 48×48 以上)。隣接操作要素との間隔 8px 以上 |
| A20 | テスト | `rule-persistence.test.ts` の `createInitialStateFromStorage`(openRiichi 偽/真)と、SituationSheet の `openRiichiAllowed` 偽/真の静的描画テスト(§5.3) | 偽でオープンが出ず、真で出る。初期 rule が保存値どおり |
| A21 | 画面 | localStorage 空でリロード→状況シート | オープン・燕返し・槓振りが出ない(revert 確認) |
| A22 | 画面 | 設定でオープン立直・ローカル役をオン→戻る→状況シート | オープン・燕返し・槓振りが出る。リロード後も出る |
| A23 | 画面 | 立直「オープン」を選んだ状態で設定のオープン立直をオフ→戻る→オンに戻す | 立直はオープンでなくなり、オンに戻しても復元されない(§6) |
| A24 | 画面 | `mj3calc.rule` に `{"version":1,"rule":{"red":9}}` を書いてリロード→設定 | ヘッダー直下に注記1行。メイン画面には出ない。戻る→再度設定でも出る。続けて喰い断を切り替えると注記が消え、戻る→再度設定でも出ない |
| A25 | 画面 | `mj3calc.rule` に `not json` を書いてリロード→設定 | 注記が出る |
| A26 | 画面 | localStorage 空でリロード→設定 | 注記が出ない |
| A27 | 画面 | 幅 375px・320px で設定画面を開き、`await document.fonts.ready` の後に計測(詳細設定も開いた状態で再計測) | 戻るボタンの右隣にタイトル「設定」(タイトルの left − 戻るボタンの right が 8px±1)。テーマのボタン群は行幅いっぱいで、3ボタンとも1行(各ボタンの高さが同じでラベルが折り返さない。各幅は 375px で約102px、320px で約84px)。赤ドラ・北の扱い・連風牌の雀頭のボタン群がラベルと同じ行にある(ボタン群の top がラベルの行内)。横スクロールなし(`scrollWidth` ≤ `clientWidth`) |
| A28 | 画面 | 幅 375px・320px でメイン画面 | ヘッダーのタイトルとメニューボタンの位置が main と同じ(`space-between` のまま) |
| A29 | コード | `grep -rnE "#[0-9a-fA-F]{3,8}\b\|[0-9]ms\b\|cubic-bezier" src/ui/settings src/ui/screen/SettingsScreen.tsx src/ui/screen/main-screen.css`(issue-49 の C17 と同形) | ヒットなし(main-screen.css の既存行でヒットした場合は、`git diff origin/main` で本 Issue の追加行でないことを確認できれば可) |
| A30 | 画面 | ダークテーマで help を開く。ツモ損の行をタップしてダイアログを開く | 吹き出しが inverse-surface 系の配色で読める。ダイアログ(見出し「ツモ損」)にラジオ3つと各説明(§4.7 の文言)が読める |
| A31 | 画面 | OS の視差効果を減らす(DevTools の `prefers-reduced-motion: reduce` エミュレート)で help・詳細を開閉 | 遷移アニメーションなし |
| A32 | 計測 | `npm run build` 後、初回 JS(issue-51 §2.11 の定義: `dist/index.html` の `<script type="module" src>` と `<link rel="modulepreload" href>` が指す JS を重複なく合算)を測る: `grep -oE '(src\|href)="[^"]+\.js"' dist/index.html \| sed -E 's/.*="\/?([^"]+)"/\1/' \| sort -u \| while read f; do gzip -9 -c "dist/$f" \| wc -c; done \| awk '{s+=$1} END {print s}'` | 値を検収報告と PR に記録(§9.1 の見込みとの差を併記。予算超過は不合格としない)。製造担当が記録した lazy 前後の値と採否が §5.4 の条件どおりであること |
| A33 | 画面 | 赤ドラ「2枚」で手牌に赤5pを含む和了形を入れてから、設定で「赤なし」にして戻る | 手牌の赤5pは書き換わらず残る。パレットの赤五キーは非表示。結果は赤ドラ1飜を含む(§6 の実測どおり。不合格としない、事実の記録) |
| A34 | 画面 | (lazy 採用時)DevTools Network を Slow 3G 相当にしてキャッシュ無効でリロード→設定 | 設定画面のチャンクが設定を開いた時点で読み込まれ、読み込み中は空表示(fallback null)で例外なし。読み込み後に通常表示 |
| A35 | 計測・画面 | (lazy 採用時)`npm run build` 後 `dist/sw.js` の precache 一覧に設定画面のチャンク名が含まれる。`npm run preview` で開き Service Worker 有効化後、DevTools でオフラインにしてリロード→設定 | チャンク名が一覧にある。オフラインでも設定画面が開く |
| A36 | 画面 | 詳細を開き積み棒欄に 999 と打鍵(確定しない)→そのまま「段位戦ルールに戻す」を押す。もう一度 999 と打鍵→そのまま「戻る」→再度設定を開く | 1回目: 積み棒は 800 で確定された後に既定へ戻り、欄は 200、プリセットは「段位戦ルール」。2回目: 積み棒 800 が保存され、開き直した欄も 800 |
| A37 | 画面 | ツモ損の行をタップ。「北家分折半」のラジオ(ポインタ操作)を選ぶ。再度開き、スクリムをタップ。再度開き Esc | 行に `aria-haspopup="dialog"`。選択: 即ダイアログが閉じ、行の現在値が「北家分折半」、プリセット「カスタム」、`mj3calc.rule` の `tsumoLoss` が `north-split`。スクリム・Esc: 閉じて値は変わらない |

> 【事後注記】Issue #62([issue-62-red-reset.md](issue-62-red-reset.md))で、赤ドラ設定(`Rule.red`)が前の値と変わったときは手牌・副露・ドラ表示牌・裏ドラ表示牌をリセットするよう改めた(抜き北・状況役・卓は保持)。「赤五は書き換えない」判断と A33 の期待値は置き換わる。`hora.ts` が `rule.red` を参照しない点は変更していない(UI のリセットで実害が防がれるため、#62 に記録して閉じた)。

## 9. 実測

### 9.1 バンドル(基準: main 1531258、`npm run build`、gzip -9)

- 初回 JS `index-*.js`: **122,100 B**、CSS 6,001 B
- 現在の初回 JS には `md-outlined-select`・`md-switch` が含まれない(未使用で除去されている)
- Select+SelectOption+Switch の増分: esbuild(minify・esm)で、プロジェクトが使う md 部品一式から select・switch を除いた束(39,634 B)と含めた束(53,155 B)の差 = **約13,500 B**(menu・ripple・focus 等の共有分は差し引き済み。概算)
- 設定画面の自作コード・CSS・help/expand アイコン: 約3,000〜5,000 B(見込み。未実測)
- 合計見込み: 初回 JS 約 **138,600〜140,600 B**(+16〜19 KB)
- 遅延読み込み(`React.lazy`、確定。§5.4)にした場合、上記のほぼ全量(約16〜19 KB)が初回から外れ、初回 JS は約122 KB(main とほぼ同じ)に保たれる見込み。設定画面チャンクは約16〜19 KB(gzip)。採否は §5.4 の条件で製造時の実測により決める

### 9.3 実装後の実測(gzip -9。A32 の定義)

| 時点 | 初回 JS | 備考 |
| --- | --- | --- |
| 製造時・直接 import 版 | 140,836 B | §9.1 の非 lazy 見込み 138,600〜140,600 B の上限を 236 B 上回る |
| 製造時・lazy 版 | 123,055 B | 差 17,781 B ≥ 8,000 B のため lazy を採用(§5.4 の条件を満たす) |
| 監修後・lazy 版 | **122,852 B** | 基準 main 1531258 の 122,100 B との差 +752 B。§9.1 の lazy 見込み「約122 KB」と整合 |

- 監修後の設定画面チャンクは 15,277 B(検収で再計測した値は 15,366 B。help の当たり判定修正などでの増。§9.1 の見込み 16〜19 KB を下回る。Select を使わなくなり Radio を使うようになったため)
- 上表は統括担当から渡された計測値。監修後の値は検収(A32)で再計測して確認する

### 9.2 赤ドラ設定を下げたときの計算

- 一時テスト(実行後削除)で、手牌 `1234[赤5]6789p 123s 99s`(14枚・ロン既定)を `createInitialState({...既定, red})` の state に載せ `computeResult` を実行
- `red=1`: 和了、`red-dora` 1飜、計3飜
- `red=0`: **例外なし・和了、`red-dora` 1飜、計3飜**(結果は red=1 と同じ)

> 【事後注記】Issue #62([issue-62-red-reset.md](issue-62-red-reset.md))で、赤ドラ設定(`Rule.red`)が前の値と変わったときは手牌・副露・ドラ表示牌・裏ドラ表示牌をリセットするよう改めた(抜き北・状況役・卓は保持)。「赤五は書き換えない」判断と A33 の期待値は置き換わる。`hora.ts` が `rule.red` を参照しない点は変更していない(UI のリセットで実害が防がれるため、#62 に記録して閉じた)。

## 10. 後続への引き継ぎ

- 詳細設定のグループ分けは `DETAIL_RULE_GROUPS` の差し替えだけで変更できる。確定後に配列と A9・A10 の期待値を更新する
- 利用者プリセットの名前付き保存(別Issue): プリセット行(`PresetRow`)に選択 UI を足す。`findRulePreset` は `RULE_PRESETS` 固定のため、利用者プリセットとの一致判定は別関数にする
- 読込注記の Context(`useRuleLoadNotice`)は他画面でも使える
- `PointField` は設定画面専用。D1・D4 の Stepper とは共通化していない
- help の文言は UI 監修でユーザーが定めた(§4.4)。切り上げ満貫・役満の複合の help は、設計時点では付けない方針だったが UI 監修で付けた(文言の定義は mahjong-rules.md には追記していない)
- 「本場」の表示名は設定画面だけ「積み棒」(`RULE_LABEL_OVERRIDES`)。core の `RULE_ITEMS` の label は「本場」のまま。他画面で設定項目名を出す場合は `ruleItemLabel` を使う
- `md/Radio.tsx` は他画面でも使える(ダイアログ内の説明付き選択)
- 赤五と赤ドラ設定の食い違い(事実): 赤ドラ設定を下げても入力済みの赤五は書き換えず、`src/core/hora.ts` の赤ドラ集計が入力牌の `red` フラグだけを数えて `rule.red` を参照しないため、`red=0` でも赤5pが赤ドラ1飜に数えられる(§9.2 の実測)。パレットの赤五キーは赤なしで非表示・枚数上限で無効化済み(`TilePalette.tsx`・`hand-rules.ts`)。未解決は「入力済みの手牌・副露の赤五が `set-rule` で置換・除去されない」「`hora.ts` が `rule.red` を参照しない」の2点。対応案は (a) Epic E の結果表示で注意を出す、(b) ルール変更時の入力済み赤五の扱いを決める(自動変換の可否は要ユーザー判断)、の2案。Issue 化済み(#62)

> 【事後注記】Issue #62([issue-62-red-reset.md](issue-62-red-reset.md))で、赤ドラ設定(`Rule.red`)が前の値と変わったときは手牌・副露・ドラ表示牌・裏ドラ表示牌をリセットするよう改めた(抜き北・状況役・卓は保持)。「赤五は書き換えない」判断と A33 の期待値は置き換わる。`hora.ts` が `rule.red` を参照しない点は変更していない(UI のリセットで実害が防がれるため、#62 に記録して閉じた)。

## 11. 実挙動未確認

- テンキーで `red` を下げた後に赤五(`0`)を打鍵したときの見え方(パレットはコード・テストで確認済み。§6)
- ~~Select の 375px・320px での配置~~ → 監修で Select を廃止したため解消(§4.1)
- ~~自作コードの gzip 増分~~ → 実測済み(§9.3)
- ツールチップの `transform` 補正で `scrollWidth` が広がった現象の原因(§4.4。`margin-left` 方式で回避済み)

## 12. UI監修による変更履歴

実装(5ec6876〜ddc40a6)後、ユーザーの直接監修で次のとおり変えた(ユーザー確定)。

| # | 変更 | 理由・経緯 | コミット | 本書 |
| --- | --- | --- | --- | --- |
| 1 | テーマの ConnectedButtonGroup を行幅いっぱいにし、ラベルを折り返さない | ラベルの折り返し防止(375px で各102px、320px で各84px) | 1bc60c7 | §4.1・A27 |
| 2 | ツールチップの位置補正の基準を `document.documentElement.clientWidth` にし、補正量を `computeTooltipShiftX` に切り出して `margin-left` に適用(閉じるたび0) | `window.innerWidth` 基準では右にはみ出して横スクロールが出た。`transform` では補正後も `scrollWidth` が広がった(原因は未特定) | 349832a | §4.4・A19 |
| 3 | Select を廃止。赤ドラ・北の扱い・連風牌の雀頭は見出しと同じ行の ConnectedButtonGroup、ツモ損は行ボタン→説明付きラジオのダイアログ。`md/Radio.tsx`・`SYMBOL_CHEVRON_RIGHT` を追加 | 選択肢が2〜3個で一覧できる方がよい。ツモ損は方式の説明が要る | c401c5f・d8ce4dd | §3・§4.1・§4.7・A5・A27・A30・A37 |
| 4 | help を8項目(赤ドラ・北の扱い・積み棒・供託・切り上げ満貫・役満の複合・オープン立直・ローカル役)にし、文言をユーザーが確定。ツモ損・連風牌の雀頭には付けない | ツモ損はダイアログ内に説明がある。文言は画面文言として監修で確定 | 0b10b76 | §4.4・A9・A17 |
| 5 | 「本場」の表示名を設定画面だけ「積み棒」(`RULE_LABEL_OVERRIDES`・`ruleItemLabel`) | 画面全体の呼び名を積み棒に揃える。core の label は変えない | 0b10b76 | §4.3・§4.8・A10〜A16・A36 |
| 6 | ダブル役満の補足を「オフのときはシングル役満」に変更 | 意味を明確にする | 0b10b76 | §4.3・A9 |
| 7 | `.settings-accordion__content[hidden] { display: none; }` を追加し、静的テスト2つ(`D6-RuleSection-accordion-hidden`・`-css`)を追加 | `display: flex` が `hidden` を上書きし、閉でも詳細が表示されていた | d8ce4dd | §4.3・§7・A9 |
| 8 | PointField の入力欄幅を `calc(5ch + 1.625rem + 2px)`(約78px) | 5桁「10000」と「点」が欠けていた | 0723ea9 | §4.5・A15 |
| 9 | バンドルの実測を追記 | lazy 採用の根拠と監修後の値の記録 | — | §9.3 |

