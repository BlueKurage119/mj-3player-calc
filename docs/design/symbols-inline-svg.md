# 出典不明のインライン SVG の Material Symbols 化 設計書

Issue は起票しない(統括・ユーザー決定)。確定事項(ユーザー判断): ①MdGallery の三角形は置換せず、その場コメントで「自作の幾何図形」と明記して残す。②backspace の塗り→輪郭線の変化は許容。③対象は実物の 7 か所(Symbols 化は 6 か所+MdGallery は自作明記)。ブランチ `feature/symbols-inline-svg`(基点 `main` 97a4493)。

## 1. 目的と範囲

出典の記録がなく、従来の Material Icons(塗り、viewBox `0 0 24 24`)と推測されるインライン SVG を、Material Symbols(outlined、24px)の公式 SVG の path に置き換え、`SymbolIcon` と `src/ui/icons/symbol-paths.ts` の定数に寄せる。出典・ライセンスの記録を既存の Symbols 方式(Apache-2.0、`LICENSES/Apache-2.0.txt`・`CREDITS.md`)に一本化することが目的であり、見た目の改善は目的にしない。

### 1.1 変更するもの

- 下表の 7 か所(`grep -rnE '<svg|<path' src --include='*.tsx'` で `src/ui/icons/` 以外にヒットする全件。設計時に実物で再確認済み)
- `src/ui/icons/symbol-paths.ts`(定数の追加)
- 関連テスト(§4)
- 本設計書

上記以外(CSS・共用部品 `IconButton`・`SymbolIcon` 本体・既存定数)は変更しない。既存テストの文字列期待に旧 path を含むものは無い(設計時に旧 path の先頭文字列で `*.test.*` を grep し 0 件)。

### 1.2 対象と置換先

| # | ファイル | 現在の形(Material Icons 相当の名前) | 置換先定数 | 表示寸法(現状維持) |
| --- | --- | --- | --- | --- |
| 1 | `src/ui/input/TilePalette.tsx`(1 枚削除) | backspace(塗り) | 既存 `SYMBOL_BACKSPACE` | 1.5rem |
| 2 | `src/ui/input/TilePalette.tsx`(入力を終える) | keyboard_return | 既存 `SYMBOL_KEYBOARD_RETURN` | 1.5rem |
| 3 | `src/ui/expressive/Stepper.tsx`(減らす) | remove | 新規 `SYMBOL_REMOVE` | 1.25rem(`size="1.25rem"` を渡す) |
| 4 | `src/ui/expressive/Stepper.tsx`(増やす) | add | 既存 `SYMBOL_ADD` | 1.25rem |
| 5 | `src/ui/screen/AppHeader.tsx`(メニュー) | more_vert | 新規 `SYMBOL_MORE_VERT` | 1.5rem |
| 6 | `src/ui/screen/SettingsScreen.tsx`(戻る) | arrow_back | 新規 `SYMBOL_ARROW_BACK` | 1.5rem |
| 7 | `src/ui/md/MdGallery.tsx`(ダミー `sampleIcon`) | 塗りの三角形(`M12 2L2 22h20L12 2z`) | 置換しない。`sampleIcon` の直前に「自作の幾何図形(三角形、出典なし)。Material Symbols ではない」旨の一行コメントを足す(確定。`custom-paths.ts` には移さない: ギャラリーのダミー専用で、その場コメントで足りる) | 1.5rem(不変) |

注: 実物の `<svg` は 7 個(TilePalette 2・Stepper 2・AppHeader 1・SettingsScreen 1・MdGallery 1)で、確定済み(HandCard に直書きは無い)。Symbols 化は 6 か所。

## 2. 設計

### 2.1 path の取得と記載

- 新規定数は `https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/<name>/materialsymbolsoutlined/<name>_24px.svg` を製造担当が取得し、`<path d="...">` の d を**無改変で**写す(自作・改変しない。`issue-47-tenkey-input.md` §2.8・確定事項15と同方針)。path は本設計書に書かない。
- 定数名は既存規約どおり `SYMBOL_<名前の大文字スネーク>`。既存定数の並びの末尾に追加し、ファイル先頭の出典コメントはそのまま(全定数が同じ出典のため追記不要)。
- 設計時に公式 SVG の存在を確認した名前: `remove`・`more_vert`・`arrow_back`(いずれも viewBox `0 -960 960 960`、単一 path)。

### 2.2 置換の形

各箇所の `<svg>…</svg>` を `<SymbolIcon d={SYMBOL_X} />` に置き換える(Stepper のみ `size="1.25rem"`)。`SymbolIcon` は `aria-hidden="true"`・`fill="currentColor"` を持つため、アクセシブルネーム・色は変わらない。import は既存の `src/ui/icons/` の公開経路(`index.ts` があればそこ)に合わせる。

### 2.3 見た目の差(公式 SVG の d を比較した事実)

座標は Icons が 24 単位、Symbols が 960 単位(1 単位 = 40)で換算した。

| # | 差 | 内容 |
| --- | --- | --- |
| 3 remove | なし(寸法一致) | Icons: x 5〜19・高さ 2。Symbols: x 200〜760(=5〜19)・高さ 80(=2)。同一矩形 |
| 4 add | なし(寸法一致) | 横棒・縦棒とも長さ 14・太さ 2 で一致 |
| 5 more_vert | ほぼなし | 点の直径 4・中心間隔 6 で一致(中心 y: Icons 6/12/18、Symbols 240/480/720 = 6/12/18) |
| 2 keyboard_return | 小 | 線の太さ 2 は一致。矢じりの位置・縦線の長さが異なる(Icons は縦線 y7〜13・左端 x2、Symbols は縦線 y6〜12・左端 x3)。全体が約 1 単位上・右に寄る |
| 6 arrow_back | 小 | 太さ 2 は一致。矢じりの角度・先端位置が異なる(Icons 先端 x4・軸 x7.83〜20、Symbols 先端 x4・軸 x7.8〜20 で矢じりの肩が 57/40 単位で微差) |
| 1 backspace | **大** | Icons は塗りつぶしの本体に × を抜いた形。Symbols outlined は**輪郭線のみの本体**に × を描く形で、塗り面積が大きく減る。テンキー入力(`SYMBOL_BACKSPACE` 使用、Issue #47)と同じ見た目に揃う |
| 7 三角形 | なし | 置換しないため不変(コメント追記のみ) |

weight はすべて既定(400)の outlined のみが対象。公式 `_24px.svg` は weight 400 のみで、weight 違いは別ファイル名(`wght` 付き)であり今回は使わない。

### 2.4 寸法・当たり判定

`<svg>` の幅・高さ(1.5rem / 1.25rem)を `size` で維持するため、ボタン・アイコンのボックス寸法と当たり判定は理論上不変。受け入れ条件 §4 で main と実測比較する。

### 2.5 バンドル(09 号、目標値方式)

- 基準値(設計時実測、`main` 97a4493、`npm run build` 後の `dist/index.html` が指す `type="module"` script の gzip -9): **122,853 B**(`assets/index-*.js`。modulepreload は無し。`registerSW.js` 140 B は module script でないため含めない)
- 積算: 新規定数(remove・more_vert・arrow_back で d 合計約 300 文字)の増分と、旧 Icons path 7 本(約 600 文字)と `<svg>` 属性の減分がほぼ相殺し、gzip 後で **±100 B 程度**と見積もる
- 目標値: **122,953 B**(基準値 + 100 B)。超過を不合格条件にしない

## 3. 確定済みの判断(旧・要ヒアリング事項)

1. MdGallery の三角形: 置換せず自作と明記して残す(§1.2 の行 7)。
2. backspace の塗り→輪郭線の変化: 許容(テンキー側と揃う)。塗り版は使わない。
3. 対象数: 7 か所で確定。

## 4. 受け入れ条件

1. `grep -rnE '<svg|<path' src --include='*.tsx' | grep -v 'src/ui/icons/'` の出力が `src/ui/md/MdGallery.tsx` の 2 行(`<svg`・`<path`)だけで、他に 0 行。MdGallery の直前に「自作の幾何図形」の旨のコメントがある(`grep -n '自作' src/ui/md/MdGallery.tsx` で出る)。
2. `grep -rnE 'viewBox="0 0 24 24"' src` の出力が `src/ui/md/MdGallery.tsx` の 1 行だけ。
3. 新規定数(`SYMBOL_REMOVE`・`SYMBOL_MORE_VERT`・`SYMBOL_ARROW_BACK`、`SYMBOL_CHANGE_HISTORY` は作らない)それぞれについて、公式 `_24px.svg` を curl で取得し、`<path d="...">` の d と定数値を機械比較して完全一致(検収は自分で取得して比較する。製造の報告だけで判断しない)。既存の `CardClearButton.test.tsx` の D4-ICON5 と同形式のテストを新規定数ごとに追加し、`npm test` で通過。
4. 各置換箇所が意図した定数を使っている: `grep -n 'SYMBOL_' <対象ファイル>` で §1.2 表の定数名が出る。Stepper は `size="1.25rem"` を渡している。
5. 寸法・当たり判定: `npm run build` → `npm run preview`(自分で起動したもののみ。終了も自分の PID で行い一括終了しない。01 号「devサーバーの禁止事項」)で main とブランチの両方を開き、375×812 で次の要素の `getBoundingClientRect()` の width・height を記録し、main と一致(差 0.5px 以内)。対象: 6 種の各ボタン(1 枚削除・入力を終える・減らす・増やす・メニュー・戻る)とその内部 `svg`。MdGallery は表示経路があれば同様、無ければ「実挙動未確認」と記録。計測の罠は G-08 を参照。
6. 見た目の記録: 上記 6 ボタンのスクリーンショット(main とブランチ)を取り、§2.3 の差(backspace が輪郭線になる等)以外の変化が無いことを目視で確認し、PR 本文に差を列挙。
7. アクセシブルネーム不変: 既存テスト(`TilePalette.test.tsx` 等の `aria-label`・`getByRole` 系)が無変更で通過。
8. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて成功。
9. バンドル: §2.5 の方法で初回 JS を gzip -9 実測し、基準値 122,853 B・実測値・増分・積算(+100 B)との差を製造報告と PR 本文に記録(超過は不合格にしない)。
10. `git diff --stat main` の変更ファイルが §1.1 の範囲内。ホームディレクトリ名・絶対パスが差分に無い(`git diff main | grep -nE '/Users/|/home/'` が 0 行)。

## 5. 参照資料

- `AGENTS.md`、`docs/rules/02-design-protocol.md`・`06-ui-md3-protocol.md`・`09-bundle-budget-protocol.md`・`01-dev-workflow-protocol.md`、advisory G-08・G-09・G-10
- `docs/design/issue-47-tenkey-input.md` §2.8・確定事項15(Symbols を無改変で写す方針)
- 既存 `src/ui/icons/SymbolIcon.tsx`・`symbol-paths.ts`・`custom-paths.ts`
- 公式 SVG(設計時に `remove`・`more_vert`・`arrow_back` を取得して形状比較)

## 6. 後続への引き継ぎ

- 以後、アイコンは `SymbolIcon` + `symbol-paths.ts`(公式)または `custom-paths.ts`(自作明記)のどちらかに限る。インライン `<svg>` の直書きは、受け入れ条件1の grep を将来の静的テスト化の候補とする(今回は追加しない)。
- 実挙動未確認: §2.3 の見た目の差は d の座標比較による推定であり、描画結果は検収の受け入れ条件5・6で確認する。
