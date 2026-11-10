# Issue #48 D4. 副露・抜き北・ドラ表示牌の入力 設計書

Epic D(#5)の Sub-Issue。依存: D1(#51)・D2(#46)・D3(#47)・D1-1(#55)。

## 1. 参照資料と判断の根拠

### 1.1 参照資料

- Issue #48 本文(範囲・未決事項)
- [docs/requirements.md](../requirements.md) §2(入力項目。27〜29 行目の副露・抜き北・ドラ)・§4(タップ領域)
- [docs/issues-draft.md](../issues-draft.md) D4 の項
- 既存設計書: [issue-51](issue-51-screen-skeleton.md)(置き場 `data-slot`・`SheetTarget`・条件 9/20/21)、[issue-46](issue-46-palette-input.md)(パレット)、[issue-47](issue-47-tenkey-input.md)(テンキー・切替)、[issue-55](issue-55-hand-card-redesign.md)(手牌カードのゴミ箱)、[issue-12](issue-12-sanma-north.md)(抜きドラ・北の扱い)
- コード: `src/core/input.ts`(`Meld`・`instantiateMeld`)、`src/ui/state/app-state.ts`・`hand-rules.ts`(`usedTiles`・`maxHandLength`・`canAppendTenkeyDigit`・`planAddTiles`)、`src/ui/calc/compute.ts`(表裏ドラの結合)、`src/ui/screen/MainScreen.tsx`・`HandCard.tsx`、`src/ui/input/TilePalette.tsx`・`Tenkey.tsx`・`use-tenkey-keyboard.ts`、`src/ui/expressive/ConnectedButtonGroup.tsx`、`src/ui/tile/Tile.tsx`(`TileOrBack` で裏向きを描ける)
- 業務標準: 01(dev サーバー禁止事項)・02・06・07

### 1.2 確定事項(ユーザー確定。再検討しない)

| # | 内容 |
| --- | --- |
| 1 | 加槓と明槓は区別しない。副露の種類は「ポン・明槓・暗槓」の3つ。状態は core の `Meld`(`pon` / `kan closed:true\|false`)のまま |
| 2 | 副露の入力: 追加ボタン(点線枠「＋」)→空の副露カードが増え、シートが `{type:'meld', i}` で開く。シートは D2・D3 のキーボード(パレット/テンキー切替)の上に種類バー「ポン／明槓／暗槓」を常時置く(押したままの表示、既定はポン)。牌を1つ入力すると副露が確定する。副露カードにゴミ箱。副露の最大数は 4。使用枚数は `usedTiles`・`instantiateMeld` で判定し、使い切れない牌は disabled |
| 3 | ドラ・裏ドラ: 横並び2枚のカード(`data-slot="dora-uradora"`)。タップで `{type:'dora'\|'uradora'}` のシート。中身は手牌と同じパレット/テンキー切替。各最大5枚、各カードにゴミ箱。裏ドラのカードは常時表示。萬子は 1m・9m のみ(めくりは計算側)。計算コアへは `computeResult` が結合済み |
| 4 | 副露追加で手牌が `14−3×副露数` を超える場合、手牌の末尾から切り捨てて上限に合わせる(確認なし) |
| 5 | 抜き北は D1 実装済み。D4 では新規実装しない。`Rule.north==='yakuhai'` で無効+0 を受け入れ条件で再確認する |
| 6 | D1 条件 21(要約カード固定)は保留のまま。本 Issue で変えない |
| 7 | 含まない: core の `Chii` 型等の削除、状況役・風・積み棒・供託(D5)、設定(D6)、結果表示 |
| 8 | 「スマート入力モード(仮称)」は Issue #58(D4-1)として起票済み。本 Issue では所見のみ(5 章) |
| 9 | UI 監修・検収用 dev サーバーはポート 5201 を `--host` 付きで起動する。他のポートのサーバーは止めない |
| 10 | (設計後の回答 Q1=B案)手牌カードのゴミ箱の例外(40×24dp・左と下に 8dp の無反応帯)を、ドラ・裏ドラ・副露の各カードのゴミ箱にも広げる。要件 §4 を改訂する(1.3)。他の入力欄には広げない |
| 11 | (Q2=A案)副露の追加ボタンを押した時点で手牌を切り捨てる。何も入れずに閉じても戻さない(A5) |
| 12 | (Q3)確定済み副露の種類変更は牌を保持(A2)、牌タップで置き換え(A3)、牌確定でシートを閉じない(A4) |
| 13 | (Q4)副露のシートでは「1 枚削除」・「AC」・物理 Backspace を無効にし、副露の削除はカードのゴミ箱だけで行う(2.3) |
| 14 | 【確定事項 19 で置換(アイコン)】(UI 監修)全カード(手牌・ドラ・裏ドラ・副露)のゴミ箱のアイコンを Material Symbols「disabled_by_default」(四角囲みのバツ)に統一する。HandCard はアイコンの差し替えだけで、issue-55 の構造・当たり判定・aria-label・40×24dp・無反応帯・disabled 条件は変えない。空のときは従来どおり disabled 表示(非表示にしない) |
| 15 | (UI 監修)ドラ・裏ドラの表示牌は幅 20dp(目安)に縮小する。副露の牌は現状の大きさのまま |
| 16 | (UI 監修)カードの構造(上段=見出し+ボタン、無反応帯、牌の行)は保ち、余白だけを削って高さを減らす。ゴミ箱 40×24dp・左と下の 8dp 無反応帯・各タップ領域は守る(副露カードの構造は確定事項 18 で変更予定。ただし保留中) |
| 17 | (UI 監修2)ドラ・裏ドラの見出し `.indicator-card__title` をステッパーの見出し `.stepper__label` と同じ書体(typescale **label-medium** の font/size/line-height/weight トークン)にする。ユーザーの指示は「風牌の見出しと同じ大きさ」で、現存する入力欄の見出しはステッパーのものだけなので label-medium と解釈した。風セグメント(D5)の見出しも将来この書体に揃える想定。手牌の見出し(title-small)は変えない |
| 18 | (UI 監修2)副露カードの「牌の行」と「消すボタン」を1行にする(上段のボタンだけの行を無くす)。~~保留~~ → **確定事項 18' で保留解除** |
| 19 | (UI 監修2)全カード(手牌・ドラ・裏ドラ・副露)の消すボタンのアイコンを既存 `SYMBOL_CLOSE`(Material Symbols の close、ただの✕)にする。HandCard.tsx はアイコンの差し替えのみ。`SYMBOL_DISABLED_BY_DEFAULT` は未使用になるので削除し、テスト D4-ICON も更新する。確定事項 14 のアイコン部分を置換(「空でも disabled で表示」は維持) |
| 20 | (UI 監修2)底部シートの閉じるボタン(`BottomSheet.tsx`、aria-label「閉じる」)のアイコンを Material Symbols Outlined の `cancel`(丸囲みの✕)にする。定数 `SYMBOL_CANCEL` を追加する |
| 18' | (Q5=A案)副露カードの牌幅を **24dp 固定**にし、「牌の行+消すボタン」を1行にする(牌が左、ボタンが右、上段のボタンだけの行を無くす)。確定事項 16 の副露の牌幅 28px・高さ約 85px の記述を置換する。ボタン 40×24dp・左と下の 8dp 無反応帯・外枠 48dp 以上は維持 |
| 21 | (UI 監修2)テンキーモードの機能キー(「1 文字削除」・AC)を対象別に動かす(2.3 のテンキー表)。現状 `Tenkey.tsx` の AC は対象に関係なく `clear-hand`・aria-label「手牌をクリア」固定で、ドラ・裏ドラ入力中に押すと手牌が消える不具合がある |
| 22 | (UI 監修4、オーナー確認済み)ドラ・裏ドラカードの見出しと✕、副露カードの牌行と✕は、縦中心を揃える(差 0px)。✕のタップ領域(40×24dp・左 8dp・下 8dp の無反応帯)の仕様は変えない。下 8dp の無反応帯は疑似要素(`::after`)で確保してよい。手牌カードの見た目は変えない |
| 23 | (UI 監修4、オーナー確認済み)ドラ・裏ドラカードは表示牌 0 枚でも 5 枚でも高さが同じ(牌1行分=牌幅 20dp の牌の高さを常に確保)。副露の空スロットと牌入りカードも高さが同じ(牌幅 24dp の牌の高さ)。5 枚は1行のまま折り返さない |
| 24 | (検収で判明、オーナーが #48 に限り明示承認した例外)`src/ui/md/Button.tsx`(型付きラッパー)が `aria-label` を受け取らず捨てるため、パレットの AC(`TilePalette.tsx` の `md-filled-tonal-button.tile-palette__action`)に aria-label が付かない(main からの既存欠陥。main の「手牌をクリア」も実際は未描画)。`ButtonProps` に `'aria-label'?: string` を足し、4 つのバリアントのカスタム要素に通す数行の変更**のみ**を許可する。スタイル・他ラッパー・`md/index.ts` 等は変更しない。手牌の AC にも効くため、issue-55 の手牌カード・パレットの受け入れ条件を再確認する(C14e・C20) |
| 25 | (PR #59 の Codex 指摘・赤5の調査を受けたオーナー回答)副露のシートのパレットから赤5キー(5p赤・5s赤)を外し、代わりに縦2マス(1列×2行)の「赤牌切替」ボタンを置く。手牌・ドラ・裏ドラのパレットの赤5キーは従来どおり(2.11) |
| 26 | ルールの呼称: 「赤2ルール」= `Rule.red=1`、「赤4ルール」= `Rule.red=2`(`Rule.red` は p・s それぞれの赤5の枚数。`redCountOf`) |
| 27 | 5p または 5s の**ポン**を選んでいるとき、赤牌切替ボタンで `meld.tile.red`(boolean)を反転する。`instantiateMeld` によりポンの赤枚数は red=1 で 0↔1 枚、red=2 で 1↔2 枚(0 枚は存在しないので出さない) |
| 28 | 槓(明槓・暗槓。加槓は明槓と同一)は常に全赤(r 枚)で、切替は不要。赤は表示だけに反映する |
| 29 | 副露の牌の表示は `instantiateMeld(meld, rule.red)` の展開結果に合わせる(Codex 指摘2の解消)。`src/core` は変更しない |
| 30 | (Codex 指摘1)空の副露を対象にしているときに**同じ副露カードを再選択しても削除しない**(対象 index を不整合にしない)。空の副露から別の対象へ移るときに消す既存仕様(A5)は維持する |
| 31 | (オーナー確認済み、Q6=C)確定事項 25 の「縦2マス」は「横2マス」と読み替える。副露シートのパレットは 9 列のまま、4 行目の赤5(赤5p・赤5s)の2セルをそのまま1つの赤牌切替ボタンにする。10 列化・5 行目の追加・牌キーの明示配置は行わない |
| 32 | (オーナー確認済み、Q7=A)ボタンは赤5の牌画像+「×n」(副露に含まれる赤の枚数)、`aria-pressed`、aria-label「赤牌」 |
| 33 | (オーナー確認済み、Q8=A)赤ありのルールでは副露シートに常に出し、5p・5s のポン以外・在庫超過のときは disabled |
| 34 | (オーナー確認済み、Q9=A)テンキーモードには切替ボタンを出さず、`0`=赤5・`5`=普通の5 で選ぶ(`tenkey-commit` の meld 分岐。`'0'` 経路は赤のまま) |
| 35 | (オーナー確認済み、Q10=A)赤4ルールで普通の5のポンに赤が1枚含まれることの補足説明は出さない |
| 36 | (オーナー確認済み)暗槓の表向き2枚は赤を見せる(`[裏, xs[2], xs[3], 裏]`=展開結果の末尾2枚。例 [裏, 5p, 赤5p, 裏]) |
| 37 | (UI 監修5・項目1)入力途中の数字(`tenkeyBuffer`)は、選択中の欄(`inputFocus` が指す手牌・ドラ・裏ドラ・副露 i のカード)にだけ表示する。手牌以外が対象のとき、手牌カードに表示してはならない |
| 38 | (UI 監修5・項目2)選択中の欄(シートが開いていて `inputFocus` が指すカード)は、**カード背景色だけ**で示す。枠線・アウトラインは付けない。副露は対象の副露カード1枚だけが選択状態になり、シートが閉じたら解除する。使うトークンは確定事項 42 |
| 39 | (UI 監修5・項目3)パレット方式でも物理キー(数字・m/p/s/z)を有効にする(「案A」に準じる)。**issue-47 設計書の確定事項 10(「数字と m/p/s/z はテンキー方式のときだけ有効」)を本 Issue で変更する。** issue-47 設計書自体は改訂しない。パレット方式での入力モデルは確定事項 41 |
| 40 | (UI 監修5・項目3)ページ読み込み直後の初回オープン(カードをタップしただけ)でも物理キーが効くこと。ステッパー(抜き北・積み棒・供託)・設定の入力欄など、自身がキーを使う要素にフォーカスがあるときはキーを奪わない(D3 の意図を維持) |
| 41 | (ユーザー回答 Q11=P4)パレット方式の物理キーの入力モデルは P4: テンキー方式と同じバッファ入力(数字→m/p/s/z で確定)とし、物理 Backspace もバッファがあれば1文字削除、空なら対象別の削除(A8)とする。画面上のパレットの「1 枚削除」ボタンは従来どおり |
| 42 | (ユーザー回答 Q12)選択中の欄の背景は `--md-sys-color-primary-container`。文字・アイコン色は現行トークンのまま |
| 43 | (ユーザー回答 Q13=①)物理キーの不具合は `shouldHandleKeyTarget` の許可リスト型(カード本体3種を受付に追加)で直す。`src/ui/expressive/` は変更しない。Enter の二重処理は、**選択中カードの本体**の Enter/Space だけを無処理にし、フックは `e.defaultPrevented` のイベントを処理しない(2.12(3)(b))。選択中は Enter=閉じる、他カード本体は Enter=そのカードへ切替(従来どおり) |
| 44 | (ユーザー回答 Q14=(a))副露カードでは、入力途中の数字があるあいだ、牌列(または空枠)の代わりにバッファだけを表示する |

### 1.3 要件・下書きの改訂(製造で反映)

- `docs/requirements.md` 27 行目(【確定】行)を次に改める。冒頭「更新日」行に Issue #48 の改訂を追記する。
  > 【確定】副露はポン・明槓・暗槓(加槓は明槓と同一扱い。入力上は区別しない。チーはない)
- `docs/issues-draft.md` D4 の項の「副露はポン・明槓・暗槓・加槓(チーは出さない)」を「副露はポン・明槓・暗槓(加槓は明槓と同一扱い。チーは出さない)」に改める。**改める判断の根拠**: 下書きは Issue の索引として参照され、要件と食い違うと後続 Issue(D5 の槍槓等)の設計で誤読を招くため。
- `docs/requirements.md` §4 のゴミ箱の文(Issue #55 で追加した「手牌カードのゴミ箱(手牌クリア)に限り、…この緩和はゴミ箱にだけ適用し、他の入力欄には広げない(Issue #55)。」)を次に置き換える。更新日行の Issue #48 の追記は「Issue #48 で§2 の副露の種類を改訂し、§4 のゴミ箱の例外をドラ・裏ドラ・副露のカードに拡大」とする。
  > 手牌・ドラ・裏ドラ・副露の各カードのゴミ箱(手牌クリア・表示牌クリア・副露の削除)に限り、タップ領域を高さ 24dp(見た目と同じ。縦は拡張しない)・幅 40dp(最低 32dp)とする。この大きさは WCAG 2.2 の AA(24px)を満たし、AAA(44px)は満たさない。誤操作を防ぐため、ゴミ箱の左と下に 8dp の無反応帯(押しても何も起きない領域)を置く。ゴミ箱の上と右は各カード本体のタップ領域(シートを開く)と 0dp で隣接し、隣接ターゲット間隔 8dp の例外とする。この緩和は各カードのゴミ箱にだけ適用し、他の入力欄には広げない(Issue #55・#48)。
- 根拠(07 号): 加槓は core に型が無く、`Kan{closed:false}` として符・役・点数が明槓と同一に計算される(`src/core/input.ts` の `Meld` 定義・`instantiateMeld`)。加槓固有の効果は槍槓(`HandOptions.chankan`、D5 の状況役)だけで、副露の入力値には影響しない。

### 1.4 設計担当の判断と根拠(【設計案】)

| # | 判断 | 根拠 |
| --- | --- | --- |
| A1 | 空の副露は `{type:'pon', tile:null}` で状態に持つ。種類バーは「対象の副露の `type`/`closed`」をそのまま表示・変更する(別の状態を持たない) | core の `Meld` は `tile: Tile \| null` を許す。種類と牌を1つの `Meld` で持てば、追加の状態とその同期が要らない |
| A2 | **種類の変更は確定済み副露にも効く**(牌は保持)。変更後の枚数(ポン3→槓4)が使用枚数を超える場合、その種類ボタンを disabled にする | 「牌を入れ直す」より操作が少ない。使用枚数の検査を種類にも掛ければ不整合が起きない |
| A3 | 確定済み副露で牌をタップすると牌を置き換える(種類は保持)。置き換え後の枚数判定は「その副露を除いた使用牌」で行う | 1副露=1牌の入力なので、置き換えが自然。自分自身の牌を数えると同じ牌に戻せなくなるため除外する |
| A4 | 牌を確定してもシートは閉じない(対象は同じ副露のまま) | 非モーダルシート方針(D1)と手牌シートの挙動に合わせる。種類の付け直しができる |
| A5 | **手牌の切り捨ては `add-meld` の時点で行う**(確定事項 4)。空の副露を残したまま対象を離れた(シートを閉じた・別の対象を開いた)場合、その空の副露は削除する。切り捨てた手牌は戻さない | 追加の瞬間に上限が下がるため、見出し n/m と実際の枚数を常に一致させる。空の副露を残すと計算が未成立のまま残り、ゴミ箱で消す手間が増える |
| A6 | 副露・ドラ・裏ドラのシートも、ヘッダーにパレット/テンキー切替(`SheetModeToggle`)を出す。`sheetMode` は共有(対象ごとに分けない) | 確定事項 2・3。D3 で `sheetMode` は開閉をまたいで保持する設計 |
| A7 | テンキーの桁上限は対象ごと: 手牌は従来どおり、ドラ・裏ドラは `5 − 既存枚数`、副露は 1 桁 | 各対象の上限枚数に合わせる |
| A8 | 物理キーボード(`useTenkeyKeyboard`)は手牌に加えドラ・裏ドラ・副露でも有効にする。Backspace(バッファ空)は、ドラ・裏ドラでは末尾1枚削除、副露では何もしない。パレットモードの Backspace も同じく対象別にする(2.3 の表)。Enter でシートを閉じる既存動作は、そのまま新しい対象に広げる。画面上のテンキーの「1 文字削除」・AC も同じ規則で対象別にする(確定事項 21、2.3 のテンキー表) | テンキーをシートに出す以上、物理キーの挙動を揃える。副露の牌を Backspace で消すと空の副露が生まれ A5 と紛らわしいため何もしない。(UI 監修5 で変更、確定事項 41)物理 Backspace は両方式とも `tenkey-backspace` を dispatch する(バッファ優先、空なら対象別=上記と同じ結果) |
| A9 | 暗槓は両端2枚を裏向き(`{type:'back'}`)で描く。明槓は4枚、ポンは3枚を表向きで描く。種類の文字ラベルは出さない | 牌姿で種類が判別できる(AGENTS.md「見ればわかるラベルは省略」)。`Tile` は `TileOrBack` を描ける |
| A10 | ゴミ箱は副露カード=その副露の削除、ドラ/裏ドラカード=その表示牌の全消し。確認・Undo なし | 手牌カード(D1-1)と同じ操作感 |
| A11 | 【確定(Q1=B案)】ゴミ箱は手牌カードと同じ 40×24dp・左と下に 8dp の無反応帯。DOM は `HandCard` の `.hand-card__clear-zone` 方式(無反応帯の `padding-inline-start`・`padding-block-end` 8dp、外枠の `onClick` で `closest(無反応帯)` を無視)を流用する。【設計案】共通化: ゴミ箱+無反応帯を `CardClearButton`(`src/ui/screen/CardClearButton.tsx`。props: `aria-label`・`disabled`・`onClear`)に切り出し、ドラ・裏ドラ・副露で使う。手牌カードへの適用は任意(HandCard は変更しない方針のため、本 Issue では差し替えない。CSS の値は共通のクラスへ寄せてよい) | 確定事項 10。3 種のカードで同じ寸法・判定を保つには部品化が安全。HandCard を触らないのは issue-55 の受け入れ条件を再検証する範囲を増やさないため。(UI 監修5 追記)`HandCard.tsx` の変更は、アイコン差し替え(確定事項 19)と確定事項 37・38・40 の範囲(バッファの表示条件、外枠の選択クラス、本体 keydown の条件)に限る。構造・当たり判定・aria-label・寸法は変えない |
| A12 | 副露の並びは2列のグリッド。追加ボタンは末尾のセルに置き、副露が4つのときは出さない | 375px で槓の4枚(28px×4)とゴミ箱が1セル(約167px)に収まる。下記 2.5 の算出 |
| A13 | 副露カードの見出しは出さない(牌姿で分かる)。ドラ・裏ドラは見出し「ドラ」「裏ドラ」を出す(n/5 は出さない) | 両カードは牌が空のとき区別が付かないため見出しが要る。上限は disabled で分かる |

## 2. 設計

### 2.1 状態・アクション(`src/ui/state/app-state.ts`)

`AppState` の形は変えない(`input.melds`・`dora`・`uradora`・`inputFocus`・`sheetMode`・`tenkeyBuffer` を使う)。追加する型とアクション:

```ts
export type MeldKind = 'pon' | 'minkan' | 'ankan';
export type IndicatorTarget = 'dora' | 'uradora';

// AppAction に追加
| { type: 'add-meld' }
| { type: 'set-meld-kind'; i: number; kind: MeldKind }
| { type: 'set-meld-tile'; i: number; tile: Tile }
| { type: 'remove-meld'; i: number }
| { type: 'add-indicator-tile'; target: IndicatorTarget; tile: Tile }
| { type: 'remove-last-indicator-tile'; target: IndicatorTarget }
| { type: 'clear-indicators'; target: IndicatorTarget }
```

reducer の仕様:

| アクション | 動作 | 無効(state をそのまま返す)条件 |
| --- | --- | --- |
| `add-meld` | 次の順に処理する。(1) 直前の対象が空の副露なら A5 で削除する。(2) 直前の対象が手牌なら既存 `open-sheet` と同じ `sortHand` で整列する(手牌以外が対象なら `hand` は既に整列済み)。(3) その `hand` を `slice(0, maxHandLength(副露追加後のmelds))` で末尾から切り捨てる。(4) `melds` 末尾に `{type:'pon', tile:null}` を足す。(5) `inputFocus={type:'meld', i: 新index}`、`tenkeyBuffer=''` | `melds.length >= 4` |
| `set-meld-kind` | `pon`→`{type:'pon'}`、`minkan`→`{type:'kan', closed:false}`、`ankan`→`{type:'kan', closed:true}`。`tile` は保持 | i が範囲外、または `canSetMeld(state, i, 新Meld)` が偽 |
| `set-meld-tile` | `melds[i].tile = tile`。`tenkeyBuffer=''` | i が範囲外、または `canSetMeld` が偽 |
| `remove-meld` | `melds` から i を除く。`inputFocus` が `meld j` のとき: j===i → `null`(閉じる)、j>i → j−1 | i が範囲外 |
| `add-indicator-tile` | `input[target]` 末尾に足す。`tenkeyBuffer=''` | `canAddIndicatorTile` が偽 |
| `remove-last-indicator-tile` | 末尾1枚を除く | 0 枚 |
| `clear-indicators` | `input[target] = []` | — |
| `open-sheet`・`close-sheet`(変更) | 離れる対象が `meld i` で `melds[i].tile===null` なら、その副露を削除する(A5)。`open-sheet` の新しい対象が `meld j`(j>i)なら j−1 に補正する。手牌の整列は従来どおり | 従来どおり |
| `tenkey-digit`(変更) | 対象を `hand`・`dora`・`uradora`・`meld` に広げる。判定は `canAppendTenkeyDigit` を対象別に一般化(下記) | 対象がそれ以外 |
| `tenkey-backspace`(変更) | バッファ空のとき: 手牌=従来、ドラ・裏ドラ=末尾1枚削除、副露=何もしない | — |
| `tenkey-commit`(変更) | 手牌=従来。ドラ・裏ドラ=解決した牌列を逐次 `canAddIndicatorTile` で検査し全部通れば追加。副露=1枚に解決できたら `set-meld-tile` と同じ処理 | 解決失敗・検査失敗 |
| `clear-all` | 変更なし(`createInitialInput` で副露・ドラ・裏ドラも空になる) | — |

### 2.2 判定関数(`src/ui/state/hand-rules.ts` に追加)

```ts
export const MAX_MELDS = 4;
export const MAX_INDICATORS = 5;
export const meldOfKind = (kind: MeldKind, tile: Tile | null): Meld;
export const kindOfMeld = (meld: Meld): MeldKind;
/** melds[i] を next に置き換えても使用枚数が超えないか(melds[i] 自身は除いて数える) */
export const canSetMeld = (state: Pick<AppState,'input'|'rule'>, i: number, next: Meld): boolean;
/** 表示牌を1枚足せるか(枚数 < 5 かつ isAvailableTiles) */
export const canAddIndicatorTile = (state: Pick<AppState,'input'|'rule'>, target: IndicatorTarget, tile: Tile): boolean;
/** 対象別のテンキー桁追加判定。既存 canAppendTenkeyDigit は手牌の場合として残す */
export const canAppendTenkeyDigitFor = (state: Pick<AppState,'input'|'tenkeyBuffer'|'inputFocus'>, digit: string): boolean;
```

- `canSetMeld`: `usedTiles({...input, melds: melds.filter((_, k) => k !== i)}, red)` に `instantiateMeld(next, red)` を加えて `isAvailableTiles` で判定する(既存 `canAddHandTile` と同じ判定関数を使う。牌の存在しない 2m〜8m は `isAvailableTiles` が弾く)。`next.tile===null` なら常に真。
- `canAppendTenkeyDigitFor`: 共通条件(`/^[0-9]$/`・同じ数字 4 つまで)に加え、容量 = 手牌 `max − hand.length`、ドラ・裏ドラ `5 − 枚数`、副露 1。`tenkeyBuffer.length >= 容量` なら偽。
- 赤五のポン・槓は `instantiateMeld` に従う(赤牌をタップした場合は赤を含む面子として数える)。

### 2.3 シート(`MainScreen.tsx`)

- `header`: `inputFocus` が `hand`・`dora`・`uradora`・`meld` のとき `SheetModeToggle` を出す。
- 中身(`.sheet-slot` の子):
  - `hand`: 従来どおり。
  - `dora`/`uradora`: 従来のパレット/テンキーを対象指定で出す。
  - `meld`: 先頭に種類バー `MeldKindBar`、その下にパレット/テンキー。
- `TilePalette`・`Tenkey` は props で対象を受けず、`inputFocus` から対象を判断する(手牌のときの挙動は変えない)。パレットの disabled 判定とタップ時のアクション:

  | 対象 | disabled | タップ |
  | --- | --- | --- |
  | hand | `!canAddHandTile`(従来) | `add-hand-tile`(従来) |
  | dora/uradora | `!canAddIndicatorTile` | `add-indicator-tile` |
  | meld i | `!canSetMeld(state, i, meldOfKind(現在の種類, tile))` | `set-meld-tile` |

  パレットの機能キー(実物 `TilePalette.tsx` は「1 枚削除」`remove-last-hand-tile`、「AC」`aria-label="手牌をクリア"` `clear-hand`、「入力を終える」`close-sheet` の3つ)と、物理キー Backspace(`use-tenkey-keyboard.ts` の `case 'backspace'`。パレットモードでは現在 `remove-last-hand-tile` を直接 dispatch している)を、対象別に次のとおりにする。キーの構成・配置は変えない。

  | 対象 | 「1 枚削除」(画面上のパレットキー) | 「AC」の aria-label / アクション / disabled | 「入力を終える」 |
  | --- | --- | --- | --- |
  | hand | `remove-last-hand-tile`(従来) | 「手牌をクリア」/ `clear-hand` / 従来どおり | `close-sheet` |
  | dora | `remove-last-indicator-tile {target:'dora'}`。0 枚で disabled | 「ドラ表示牌をクリア」/ `clear-indicators {target:'dora'}` / 0 枚で disabled | `close-sheet` |
  | uradora | 同上(`'uradora'`) | 「裏ドラ表示牌をクリア」/ `clear-indicators {target:'uradora'}` / 0 枚で disabled | `close-sheet` |
  | meld i | disabled | disabled(aria-label「手牌をクリア」は使わず「副露をクリア」とする。副露の削除はカードのゴミ箱で行う) | `close-sheet` |

  物理 Backspace は、両方式とも `tenkey-backspace`(2.1 の表)を dispatch する(確定事項 41。バッファがあれば1文字削除、空なら hand/dora/uradora は末尾1枚削除、meld は何もしない。2.12(3)(c))。

  **テンキーの機能キー(確定事項 21)**: `Tenkey.tsx` の「1 文字削除」(現在 `tenkey-backspace`、disabled なし)と AC(現在 `clear-hand`・「手牌をクリア」固定)を対象別にする。判定は純粋関数 `tenkeyActionKeysFor(state)`(`tenkey-logic.ts`。戻り値: `{ backspace: { disabled }, clear: { action: AppAction | null, label, disabled } }`)に切り出し、コンポーネントはそれを描くだけにする。「入力を終える」は全対象 `close-sheet`(従来)。

  | 対象 | 「1 文字削除」(`tenkey-backspace`) の動作 | 「1 文字削除」disabled | AC の aria-label / アクション | AC disabled |
  | --- | --- | --- | --- | --- |
  | hand | バッファ末尾1文字、空なら手牌末尾1枚(従来) | バッファ空かつ手牌0枚 | 「手牌をクリア」/ `clear-hand`(従来) | 従来どおり(変えない) |
  | dora | バッファ末尾1文字、空ならドラ末尾1枚 | バッファ空かつドラ0枚 | 「ドラ表示牌をクリア」/ `clear-indicators {target:'dora'}`(バッファも空にする) | ドラ0枚かつバッファ空 |
  | uradora | 同上(裏ドラ) | バッファ空かつ裏ドラ0枚 | 「裏ドラ表示牌をクリア」/ `clear-indicators {target:'uradora'}` | 裏ドラ0枚かつバッファ空 |
  | meld i | バッファ末尾1文字、空なら何もしない | バッファ空 | 「副露をクリア」/ なし | 常に disabled |

  `clear-indicators` は `tenkeyBuffer=''` も行う(2.1 の表に追記扱い)。物理キーとの整合: テンキーモードの物理 Backspace は上表の「1 文字削除」と同じ `tenkey-backspace`、パレットモードの物理 Backspace は 2.3 のパレット表に従う(両表で、バッファ空時の削除対象は hand=手牌末尾・dora/uradora=表示牌末尾・meld=何もしない で一致)。物理キーに AC 相当は無い。hand の「1 文字削除」の disabled は新設だが、押しても何も起きない状態を表すだけで動作は変わらない。

- `MeldKindBar`(新規、`src/ui/input/MeldKindBar.tsx`): `ConnectedButtonGroup` を流用し `label="副露の種類"`、選択肢「ポン」「明槓」「暗槓」。値は `kindOfMeld(melds[i])`。各ボタンの `disabled` は `!canSetMeld(state, i, meldOfKind(kind, melds[i].tile))`。押下で `set-meld-kind`。高さは ConnectedButtonGroup の既定(48dp)。パレット/テンキーとの間隔 8dp。

### 2.4 ドラ・裏ドラカード(`src/ui/screen/IndicatorCard.tsx`、新規)

- `data-slot="dora-uradora"` の置き場を `<div className="indicator-row">` にし、`IndicatorCard target="dora"` と `target="uradora"` を横並び(`display:grid; grid-template-columns: 1fr 1fr; gap: 8dp`)で置く。
- 構造は手牌カード(issue-55 2.1)に倣う: 外枠 `.indicator-card`(クリックでシートを開く、`role` なし)、上段に見出し(「ドラ」/「裏ドラ」)とゴミ箱、下段に `role="button"`・`tabIndex=0`・`aria-label="ドラ表示牌を入力"`/`"裏ドラ表示牌を入力"` の本体。ゴミ箱は `aria-label="ドラ表示牌をクリア"`/`"裏ドラ表示牌をクリア"`、0 枚で disabled、押下で `clear-indicators`(シートは開かない)。
- 牌幅(確定事項 15): `--tile-width: 1.25rem`(**20px** 固定)。375px 幅でカード幅 (343 − 8)/2 = 167.5px、本体幅 167.5 − 16 = 151.5px。5 枚の行幅 = 20 × 5 + gap 1 × 4 + 牌列 padding 2 × 2 = **108px** < 151.5px で1行に収まる(算出)。牌の高さ = 20 × 4/3 ≈ 26.7px。
- **縦中心と牌スペース(確定事項 22・23)**: 見出しの `padding-block-start` は付けない。`.indicator-card .card-clear-zone`・`.meld-card .card-clear-zone` は `position: relative; padding-block-end: 0` とし、下 8dp の無反応帯は `::after`(`inset-block-end: -0.5rem; inset-inline: 0; block-size: 0.5rem`)で✕の直下に重ねて確保する(レイアウト上の高さを持たないため、上段の高さは 24dp になり見出しと✕が同じ行の中で中央揃えになる)。牌の列(`.indicator-card__body` 内の牌行)に `min-height: calc(var(--tile-width) * 4 / 3)` を付け、0 枚でも牌1行分の高さを確保する。手牌カード(`.hand-card`)の無反応帯は従来どおり padding で確保し、変更しない。
- 抜き北・ステッパーは変更しない。

### 2.5 副露カードと追加ボタン(`src/ui/screen/MeldArea.tsx`、新規)

- `data-slot="melds"` の置き場を `<div className="meld-area">`(2列グリッド、gap 8dp)にする。副露0のときも追加ボタンを出す。
- 副露カード `.meld-card`: 手牌カードと同じ構造(外枠クリック=`open-sheet {type:'meld', i}`、本体 `role="button"`・`aria-label="副露{i+1}を入力"`、ゴミ箱 `aria-label="副露{i+1}を削除"` → `remove-meld`)。ゴミ箱は副露が空でも有効。牌の描画は A9。`tile===null` の間は牌の代わりに空の枠(牌1枚分の高さ)を出す。シートの対象になっている副露カードは見た目を変えない(手牌カードに合わせる)。
- 追加ボタン `.meld-add`: ネイティブ `<button>`、`aria-label="副露を追加"`、点線枠(`border: 1px dashed var(--md-sys-color-outline)`、角丸 `--md-sys-shape-corner-medium`)、中央に「＋」アイコン(`SymbolIcon`。パスは Material Symbols の add)。高さは副露カードと同じ(最低 48dp)。押下で `add-meld`。副露が4つのときは描画しない。
- **1行配置(確定事項 18')**: 副露カードは `[牌の行][無反応帯+消すボタン]` の1行。`.meld-card__row` を `display:flex; align-items:center;`(確定事項 22。UI 監修2時点の `flex-start` を置換)とし、牌の行(本体、`flex: 1 1 auto`、`role="button"`)を左、`CardClearButton`(無反応帯 `padding-inline-start: 8dp; padding-block-end: 8dp` の中に 40×24dp のボタン)を右に置く。ボタンは牌の行と縦中心を揃える(下 8dp の無反応帯は 2.4 と同じ `::after` で確保し、行の高さに影響させない)。空の副露の空枠は高さ `calc(1.5rem * 4 / 3)`(=32px、牌の高さと同じ。確定事項 23)。上段の行(`.meld-card__top-row`)は削除する。牌幅 `--tile-width: 1.5rem`(**24px 固定**)。
- 寸法(375px、算出): セル幅 (343 − 8)/2 = 167.5px、左右 padding 8dp を除く内側幅 151.5px。必要幅 = 牌 24×4 + gap 1×3 + 牌列 padding 2×2 = **103px** + 無反応帯 8 + ボタン 40 = **151px ≤ 151.5px**(余り 0.5px。1行に収まる)。ポン3枚は 78 + 48 = 126px。牌の高さ 24×4/3 = 32px、牌の行 = 32 + 4 = **36px**。右側はボタン 24px(下の帯は `::after` で高さを持たない)なので行の高さは 36px、ボタンは行の中で上下 6px ずつの位置になる。カード高さ = 6 + 36 + 6 = **≈ 48px**(外枠 48dp 以上を満たす。余りは約 0)。副露エリア(4副露=2段)= 48 × 2 + gap 8 = **≈ 104px**(副露3つ以下+追加ボタンでも2段、追加ボタンの高さは副露カードに合わせ 48dp)。
- 余り 0.5px は小さいため、製造で行が折り返す・はみ出す場合は牌列の `gap` や padding ではなく、牌幅を `min(1.5rem, calc((100cqi - 7px) / 4))` 相当に変える等で対応し、実測値を報告する(C14 で確認)。

### 2.6 タップ領域(要件 §4 との対応)

| 要素 | 大きさ | 根拠 |
| --- | --- | --- |
| ドラ・裏ドラ・副露カードの外枠(シートを開く領域) | 高さ 48dp 以上(外枠全体で満たす。本体単独の 48dp は求めない。2.4 の削減後はドラ・裏ドラ約 66.7px・副露約 48px) | §4 原則 |
| 各カードのゴミ箱 | **40×24dp**、左と下に 8dp の無反応帯(A11、issue-55 2.3 と同じ値)。上段の見出しの右に置く | 確定事項 10。要件 §4 改訂(1.3) |
| 追加ボタン | セル幅 × 48dp 以上 | §4 原則 |
| 種類バー | ConnectedButtonGroup 既定(高さ 48dp、ピル内隙間 2dp は §4 の例外) | §4 既定の例外 |
| パレット・テンキー | D2・D3 の規定のまま | §4 既存の例外 |

**高さの削減(確定事項 16、【設計案】)**: 削るのは余白だけとする。

| 項目 | 監修前(製造済み) | 新 |
| --- | --- | --- |
| カード(`.indicator-card`・`.meld-card`)の padding | 8dp 四方 | **上下 6dp**・左右 8dp(`padding: 0.375rem 0.5rem`)。ゴミ箱の右・上はカード本体のタップ領域のままで、当たり判定は変わらない |
| 本体(`__body`)の `min-height: 3rem` | あり | **削除**。シートを開くタップ領域はカード外枠全体(高さ ≥ 48dp)が担うため、本体単独で 48dp は不要 |
| 本体の padding 2px(和了牌枠・フォーカスリングの逃げ) | 2px | 維持(削らない) |
| 上段 24dp・無反応帯 8dp | — | 維持(確定事項 10) |

削減後の高さの目安(375px、算出、実測前):

| カード | 内訳 | 高さ |
| --- | --- | --- |
| ドラ・裏ドラ(牌 20dp。確定事項 22・23 で置換) | 6 + 24 + (26.7 + 4) + 6(下 8dp の帯は `::after` で本体に重なり高さを持たない。0〜5 枚で同じ) | **≈ 66.7px**(監修前 約 89px 以上、UI 監修1時点 約 75px) |
| 副露(確定事項 18' で置換。1行配置、牌 24dp) | 6 + 36 + 6 | **≈ 48px**(2.5) |
| 副露(空、牌1枚分の空枠 32px) | 同上 | ≈ 48px(牌入りと同じ。確定事項 23) |

いずれもカード外枠は 48dp 以上で §4 原則を満たす。

当たり判定(各カード共通): ゴミ箱の矩形=押下で削除/クリア(シートは開かない)、ゴミ箱の左 8dp・下 8dp=何も起きない、それ以外のカード内=シートを開く。

### 2.7 色・形

**消すボタンのアイコン(確定事項 19。確定事項 14 の記述を置換)**: `CardClearButton` と `HandCard` のアイコンを `<SymbolIcon d={SYMBOL_CLOSE} size="1.25rem" />` にする(既存定数。新規取得は不要)。表示 20dp は確定事項 14 の設計案を引き継ぐ(✕のグリフは 200〜760/960 の範囲で表示約 11.7dp 角となり、40×24dp の当たり判定に余裕で収まる)。色・disabled の扱いは従来どおり。`SYMBOL_DISABLED_BY_DEFAULT` は `symbol-paths.ts`・`index.ts` から削除し、それを参照するテスト(D4-ICON)を `SYMBOL_CLOSE` の確認に改める。

**見出しの書体(確定事項 17)**: `.indicator-card__title` の `font-family`・`font-size`・`line-height`・`font-weight` を `--md-sys-typescale-label-medium-*` にする(`.stepper__label` と同じトークン)。色は現状のまま。上段の高さはゴミ箱の 24dp で決まるため、カードの高さは変わらない(算出)。

**シートの閉じるボタン(確定事項 20)**: `src/ui/icons/symbol-paths.ts` に `SYMBOL_CANCEL` を追加する。取得元は既存定数と同じ google/material-design-icons の `symbols/web/cancel/materialsymbolsoutlined/cancel_24px.svg`(Outlined、weight 400・fill 0)。パスは製造が公式 SVG から書き写す。ライセンスは既存のファイル冒頭ヘッダーでまかなう。`BottomSheet.tsx` の閉じるボタンの `<SymbolIcon d={SYMBOL_CLOSE} />` を `d={SYMBOL_CANCEL}` に替える。**変更はアイコンの `d` だけ**で、ボタンの寸法・当たり判定・aria-label・フォーカス処理・アイコンの size は変えない。`SYMBOL_CLOSE` はカードの消すボタンで引き続き使う。

色は `--md-sys-color-*` トークンのみ(HEX 禁止、06 号)。カード背景・角丸は手牌カードと同じトークンを使う。暗槓の裏牌は既存の `Tile` の裏画像。

### 2.11 赤5の副露と Codex 指摘の修正(確定事項 25〜30)

**(1) 副露の表示(確定事項 29、`MeldArea.tsx`)**: `meldTiles(meld, red: Rule['red'])` に改め、`instantiateMeld(meld, red)` の結果 `xs` から描く。`MeldAreaContent` の props に `red` を足し、`MeldArea` が `state.rule.red` を渡す。

| 種類 | 表示 |
| --- | --- |
| ポン | `xs` の3枚をそのまま(赤は末尾に並ぶ) |
| 明槓 | `xs` の4枚をそのまま |
| 暗槓 | `[back, xs[2], xs[3], back]`(表向き2枚は展開結果の末尾2枚=赤を優先して見せる)。確定事項 36 |
| 空 | 従来どおり空枠 |

例(5p): red=1 のポン赤なし=5p×3、赤あり=5p,5p,赤5p。red=2 のポン赤なし=5p,5p,赤5p、赤あり=5p,赤5p,赤5p。槓は red=1 で赤1枚、red=2 で赤2枚(暗槓 red=1 の表向きは 5p,赤5p)。

**(2) パレット(確定事項 25・27、`TilePalette.tsx`)**: `inputFocus.type==='meld'` かつ `rule.red>0` のとき、`RED_TILES` を描かず、赤牌切替ボタンを描く。手牌・ドラ・裏ドラでは従来どおり(赤5キーあり、切替ボタンなし)。`rule.red===0` の副露シートは切替ボタンを出さない(現状と同じ9列の配置)。
- 配置(確定事項 31): グリッドは 9 列のまま(`tile-palette.css` の `repeat(9, …)` を変えない)。副露シートでは `RED_TILES` の2キーの位置(4 行目の先頭2セル)に、切替ボタン1つを `grid-column: span 2` で置く(既存の `tile-palette__action--span-2` 相当のクラスを付けるか同等の指定)。後続の「1 枚削除」span2・AC span2・「入力を終える」span3 は `hasRed` の既存分岐のまま変えない(計 9 列)。1〜3 行目の牌キーの配置・寸法も変わらない。手牌・ドラ・裏ドラのパレットは従来どおり赤5キー2つ。
- 赤なしルール(`rule.red===0`): 既存コードは `hasRed` が偽のとき赤5キーを描かず、「1 枚削除」span3・AC span2・「入力を終える」span4 になる。副露シートでも同じとし、切替ボタンは出さない(現状と同一)。
- 要素(確定事項 32): ネイティブ `<button type="button" class="tile-palette__key tile-palette__red-toggle">`、`aria-pressed={meld.tile.red===true}`、`aria-label="赤牌"`。見た目は赤5の牌画像(`<Tile tile={{type: 種類, n:5, red:true}}/>`、種類未確定・5p/5s 以外のときは 5p)と、その横に現在の副露の赤枚数「×n」(`instantiateMeld` の赤の数、牌未確定は ×0)。高さは他キーと同じ 3rem のため画像と「×n」は横並びにする。押下中(aria-pressed=true)は背景を `--md-sys-color-secondary-container`(トークンのみ)。disabled の見た目は既存の牌キーの disabled と同じ規則に合わせる。
- 有効条件(確定事項 33): 判定関数 `meldRedToggle(state, i): { visible: boolean; disabled: boolean; next: Tile | null }` を `hand-rules.ts` に追加する。`visible = rule.red>0`。`disabled` は次の否定: 「`melds[i]` がポン、`tile` が 5p/5s、かつ `canSetMeld(state, i, {...meld, tile:{...tile, red: !tile.red}})`」。それ以外(牌未確定・5 以外・槓)は disabled。`next` は反転後の牌。押下で既存の `set-meld-tile {i, tile: next}` を dispatch する(新アクションは足さない)。
- 5p・5s キーのタップ(副露・ポン): 【設計案】`meldTileForKey(state, i, kind, tile)` を追加する。キーの牌は `red:false`。まず `red:false` で `canSetMeld`、だめなら `red:true` で試し、通った方を `set-meld-tile` に渡す。両方だめなら disabled。既に同じ種類の 5 が入っている副露で同じキーを押したときは現在の `red` を保持する(押し直しで赤が外れない)。例: red=1・手牌に普通の 5p が1枚 → 赤なしポン(普通 3 枚)は不可、赤ありポン(普通 2+赤 1)は可なので、キーは有効で赤ありポンになる。槓では `red` は計算に影響しないので `red:false` のまま。

**(3) テンキー(副露、確定事項 34)**: 既存の解決規則(`'0'`=赤5、`'5'`=普通の5)を維持する。副露で `'0'`→p/s のポンは `tile.red=true`、`'5'` は `red:false`(ただし (2) と同じ代替: `red:false` で不可なら `red:true`)。実装位置は `app-state.ts` の `tenkey-commit` の meld 分岐(`if (state.inputFocus.type === 'meld')` 内、現状 `canSetMeld` を1回呼んで不可なら `return state`)。`'5'` 由来の牌は `meldTileForKey` を通して決め、`'0'` 由来は `red:true` のまま従来どおり `canSetMeld` で判定する(`meldTileForKey` は「キーの牌は `red:false`」前提なので `'0'` 経路では使わない)。`tenkey-logic.ts` は機能キー判定のみで、この変更の対象ではない。テンキーモードには切替ボタンを出さない(切り替えたい場合は `0`/`5` で入れ直すか、パレットへ切替える)。

**(4) 在庫との整合**: 判定はすべて既存の `canSetMeld`(`usedTiles`+`instantiateMeld`+`isAvailableTiles`)で行い、赤の在庫(手牌の赤+他の副露の赤+表示牌の赤 ≤ r)も普通の5の在庫(4−r)もこれで守られる。種類バーで ポン(赤)→槓 の変更も従来どおり `canSetMeld` で disabled になる。`usedTiles`・`canSetMeld` 自体は変更しない。

**(5) open-sheet の修正(確定事項 30、`app-state.ts`)**: 空の副露を削除する条件に「`action.target` が `{type:'meld', i: state.inputFocus.i}`(同じ副露)ではない」を加える。同じ副露の再選択では削除も index 補正もせず、`inputFocus` はその副露のまま(手牌の整列分岐は対象が手牌でないので通らない)。それ以外(別の副露・手牌・ドラ等への移動、`close-sheet`)は A5 のまま。

### 2.12 UI 監修5: バッファの表示先・選択中の欄・物理キー(確定事項 37〜40)

PR #59 の UI 監修漏れ3点の修正。PR #59 に含める。

#### (1) バッファの表示先(確定事項 37)

現状: reducer の `tenkey-digit`・`tenkey-commit`・`tenkey-backspace` は `inputFocus` 別に正しく振り分けているが、表示 `.hand-card__buffer` は `HandCard.tsx` で `tenkeyBuffer.length > 0` だけを条件にしており、`inputFocus` を見ない。`IndicatorCard`・`MeldArea` には表示が無い。

- 表示条件を「`tenkeyBuffer.length > 0` かつ そのカードが選択中(2.12(2) の `isSelected`)」にする。
- 共通の表示部品として `.card-buffer`(`<span aria-hidden="true">{buffer}‸</span>`)を設ける。見た目は現行 `.hand-card__buffer` の指定(色 `--md-sys-color-primary` ほか)をそのまま移す。`HandCard` は `.hand-card__buffer` のクラス名を維持してよい(既存テスト互換)が、条件に `isHandFocused` を加える。
- 置き場所: 手牌=従来どおり牌の行の末尾。ドラ・裏ドラ=`.indicator-card` の牌の行の末尾(牌スペースは確定事項 23 で常時確保済み。5 枚のときは数字が打てない=`canAppendTenkeyDigitFor` が偽なので、はみ出さない)。副露=対象の副露カード内。副露は1牌しか持たないので、バッファは最大1桁(`canAppendTenkeyDigitFor` の既存判定に従う)。副露の置き方は確定事項 44(下記)。
- 副露の幅の実算: `.meld-card__tiles` は `--tile-width: min(1.5rem, calc((100cqi - 3 * 1px) / 4))`・`width: 100%`、`.meld-card__empty` も `width: 100%`(`main-screen.css` 430〜442 行)。槓4枚は 24×4+1×3=99px に本体 padding 2px×2 で約 103px となり、本体幅(独立レビューの実測 103.5px)をほぼ使い切る。牌列の横にバッファを flex で足すと、牌幅は `cqi` 基準のため縮まず、はみ出す。
- 副露のバッファの置き方(確定事項 44=(a) を採用): (a) バッファ中は牌列(または空枠)の代わりにバッファだけを表示する — 幅の問題が起きず実装が単純、ただし入力中は現在の牌が見えない(副露は1牌なので確定すれば置き換わるため実害は小さい)。(b) バッファを `position: absolute` で本体の右端に重ねる — 牌が見えたまま、ただし槓4枚では4枚目の牌に重なる。(c) `.meld-card__empty` の `width: 100%` を外し `flex: 1` にする — 空の副露には効くが、牌入り(特に槓4枚)の幅不足は解決しない。却下案: (b) は槓4枚で牌に重なる、(c) は牌入りの副露の幅不足を解決しない。(a) では、バッファ要素を `.meld-card__tiles`・`.meld-card__empty` と置き換えて本体内に描き、高さは空枠と同じ(`calc(1.5rem * 4 / 3)`)に揃えて C14i を保つ。
- 新たな props(presentational 部品は state を読まない): `IndicatorCardContentProps` に `selected: boolean`・`buffer: string`、`MeldAreaContentProps` に `selectedIndex: number | null`・`buffer: string` を追加する。値はラッパー(`IndicatorCard`・`MeldArea`)が `useAppState()` の `inputFocus`・`tenkeyBuffer` から算出して渡す(非選択のカードには `buffer` を渡しても描かない)。`HandCard` は自身で state を読む(従来どおり)。
- 縦中心揃え(確定事項 22)とカード高さ(C14i)を崩さないこと。バッファの行高は牌の高さ以下にする。

#### (2) 選択中の欄の見た目(確定事項 38)

現状: カード背景は3種とも `--md-sys-color-surface-container`(`main-screen.css` の `.hand-card`・`.indicator-card`・`.meld-card`)。選択中を示す表示は無く、`:focus-visible` のアウトライン(`--md-sys-color-primary` 2px)だけ。シートを開くと(成功すれば)フォーカスは閉じるボタンへ移るので、アウトラインも消える。

- 選択判定: `isSelected = inputFocus` が当該カードを指す(手牌 `type==='hand'`、ドラ/裏ドラ `type===target`、副露 `type==='meld' && i===index`)。`inputFocus` はシートを閉じると null になる(既存)ので、閉じれば自動で解除される。
- カード外枠に修飾クラス `--selected` を付ける: `.hand-card--selected`・`.indicator-card--selected`・`.meld-card--selected`。CSS は背景色の差し替えのみ(枠線・影・寸法は変えない)。
- `:focus-visible` のアウトラインは本体要素(`*__body`)に付いており、外枠の背景とは別要素なので共存する。アウトライン色 `--md-sys-color-primary` は下表のとおり選択色の上でも 3:1 以上。
- ゴミ箱(`CardClearButton`)は背景を持たないアイコンボタンなので、アイコン色(現行トークンのまま)が選択色の上で読めればよい(下表)。disabled(空)時の opacity 0.38 は選択色の上でも同じ扱い。
- モーション: **付けない**(背景の切替は即時)。シートのスライドと同時に起きるため、別の遷移を重ねない。付ける場合は 06 号に従い `--md-sys-motion-*` のトークンだけで書くが、本 Issue では採らない。

トークン候補とコントラスト(`tokens.css` の値で WCAG 2.x の相対輝度から算出。値は比)。見出し・ゴミ箱=`--md-sys-color-on-surface-variant`、バッファ・フォーカス線=`--md-sys-color-primary`、牌画像の縁は `--md-sys-color-outline` を目安、「非選択との差」は `surface-container` との比。

| 背景候補 | テーマ | 見出し/ゴミ箱 (on-surface-variant) | on-surface | バッファ・フォーカス線 (primary) | outline | 非選択(surface-container)との差 |
| --- | --- | --- | --- | --- | --- | --- |
| `primary-container` | ライト | 7.20 | 13.23 | 4.97 | 3.47 | 1.11(色相が緑で差が出る) |
| `primary-container` | ダーク | 5.51 | 7.25 | 5.47 | 2.96 | 1.75 |
| `secondary-container` | ライト | 7.21 | 13.25 | 4.98 | 3.48 | 1.11(彩度が低く差が弱い) |
| `secondary-container` | ダーク | 5.50 | 7.24 | 5.46 | 2.95 | 1.75 |
| `surface-container-high` | ライト | 7.57 | 13.91 | 5.23 | 3.65 | 1.06(ほぼ判別不能) |
| `surface-container-high` | ダーク | 8.49 | 11.17 | 8.43 | 4.56 | 1.13(ほぼ判別不能) |

- 採用は **`--md-sys-color-primary-container`**(確定事項 42)。文字・アイコンはすべて 4.5:1 以上、フォーカス線(非文字 3:1)も満たす。非選択カードとの差は、輝度比ではライトで小さいが色相(緑)で判別でき、ダークでは輝度差も最大。却下案: `surface-container-high` は非選択との差が小さすぎる。`secondary-container` は primary-container とほぼ同じ輝度で彩度が低く、選択の強調として弱い。`color-mix`(primary と surface の混色)は値の直書き(混合比)が要り、06 号「値を直書きしない」に抵触するおそれがあるため不採用。`surface-tint` は背景色として使うトークンではないため不採用。
- 見出し・ゴミ箱の文字色を `on-primary-container` に替える必要はない(現行トークンで基準を満たす)。替えない。
- 牌画像: 牌の地は画像自体が持つ明色で、ライトの `primary-container` との比は約 1.3(白基準)と小さい。牌の識別は画像自身の輪郭線に依存するので、C29 で実測する(識別できなければ統括へ戻す)。ダークでは約 9.3 で問題ない。

#### (3) 物理キー

**(a) 原因(コードで確認した事実)**

- `use-tenkey-keyboard.ts` は window の keydown で `shouldHandleKeyTarget(e.target)` が真のときだけ処理する。真になるのは target が null・body・documentElement・`.bottom-sheet` 内のとき。
- カードタップ時、`HandCard`・`IndicatorCard`・`MeldArea` の `handleCardClick` は本体(`*__body`、`role="button"`)へ `focus()` してから `open-sheet` する。
- `BottomSheet` の `useLayoutEffect` は open になった瞬間に閉じるボタンへ `focus()` する。`bottom-sheet.css` は閉状態で `visibility: hidden` で、`visibility` を transition させている。統括の実測では、少なくとも初回オープンで focus() 時点の算出値が hidden で focus() が効かず、フォーカスはカード本体(シート外)に残る(2回目以降は成功する場合があり、再現条件は未特定)。機構は未確定であり、本 Issue では原因を特定しない。結果 `shouldHandleKeyTarget` が偽となり、方式によらず全キーが無視される。
- `HandCard` のスクロール処理(`isHandFocused` の useEffect)は `scrollIntoView` を呼ぶだけで `focus()`・`blur()` を呼ばず、keydown にも関与しない。原因ではない(コードで確認。スクロール自体はフォーカスを移さない)。

**(b) 修正方針の比較**

| 案 | 内容 | 長所 | 短所 |
| --- | --- | --- | --- |
| ① 許可リスト型 | `shouldHandleKeyTarget` に「target が、開いている対象のカード本体(`.hand-card__body`・`.indicator-card__body`・`.meld-card__body`)の内側」を真の条件として追加 | 変更が `tenkey-logic.ts` だけ。フォーカスがどこに残っても、カードタップ由来なら必ず効く。ステッパー・設定入力欄は従来どおり偽 | 本体の `onKeyDown`(Enter/Space で open-sheet)とキーが二重に届く(下記の対処が要る) |
| ① 拒否リスト型 | シートが開いている間、シート外でも「自身がキーを使う要素」(input・textarea・select・button・a[href]・contenteditable・カスタム要素 `md-*`)以外は受け付ける | 将来の別の開き方にも効く | 拒否リストの漏れで設定欄等のキーを奪う危険。カスタム要素の判定が曖昧。D3 の意図からの後退が大きい |
| ② BottomSheet の遅延フォーカス | `visibility` が visible になってから(rAF・transitionstart 等)focus() | フォーカス位置が仕様どおりになり、a11y 的に正しい | `src/ui/expressive/` の変更(確定事項 20 は閉じるボタンのアイコンだけを例外にした)。タイミング依存で再現が不安定な不具合の修正としては検証が難しい。D1 条件 20(閉じた後に元の要素へ戻る)への影響確認が要る |
| ③ カードタップ時にシートへフォーカス | `handleCardClick` で本体ではなくシートへ focus | expressive を触らない | シートの DOM を各カードが知る必要があり結合が強い。②と同じ visibility 問題で失敗し得る |

- 採用は **①許可リスト型**(確定事項 43)。却下案: ①拒否リスト型は漏れで設定欄等のキーを奪う危険、③は結合が強く②と同じ visibility 問題で失敗し得る。`src/ui/expressive/` を変更しない(AGENTS §3.1 の禁止事項・既存の変更禁止方針に触れない)。②はフォーカス位置の正しさでは優れるが、例外承認が新たに要るため本 Issue では採らず、5 章へ引き継ぐ。
- 二重受信の対処(確定事項 43): 許可リストにより、シート表示中に**どのカード本体**にフォーカスがあってもフックがキーを受ける。そこで (i) 本体の `onKeyDown`(Enter/Space)は、そのカードが選択中のときだけ何もしない(preventDefault もしない)。`HandCard` の `handleBodyKeyDown`(122 行)、`IndicatorCard`・`MeldArea`(55 行)の同等処理に条件を追加する。(ii) 選択中でない本体は従来どおり `open-sheet` を出し `preventDefault()` する。(iii) フックは `e.defaultPrevented` のイベントを処理しない。結果、選択中は Enter=閉じる(フックの `close-sheet`)、他カードは Enter=そのカードへ切替(従来どおり)。Space はフックで扱わない。React の合成イベント(root で処理)が window リスナーより先に走る前提であり、製造時に C31 の実測で確認する。
- 判定関数は純粋関数のまま保つ。カード本体3種に共通の `data-` 属性(例 `data-sheet-opener`)を付け、そのセレクタを `tenkey-logic.ts` に export 定数(例 `SHEET_OPENER_SELECTOR`)として1か所に置く。カード側はその定数に対応する属性を付け、`shouldHandleKeyTarget(target)` はその定数で `closest` する(画面側のクラス名3つに結合しない)。`defaultPrevented` の判定とまとめた `shouldHandleKeyEvent(e)`(`Pick<KeyboardEvent,'target'|'defaultPrevented'>` を受ける)を足し、フックはそれを使う。テストは既存 D3-F2 と同じ擬似オブジェクト方式(C30)。「開いている対象のカードか」までは問わない(フックは `inputFocus` が対象のときしか登録されず、別カードの本体にフォーカスが残ることはタップ経路では起きない)。

**(c) パレット方式での物理キー(確定事項 39)と入力モデル(確定事項 41=P4)**

`mapTenkeyKey` の `mode === 'tenkey'` の分岐を外し、数字・m/p/s/z を両方式で返す(下記の案により後段の扱いが変わる)。修飾キー(Ctrl/Meta/Alt)・IME 変換中(`isComposing`)を null にする規則、Backspace・Enter の扱いは変えない。Escape は従来どおり `BottomSheet` が処理し、フックは扱わない。Shift は従来どおり無視しない(`e.key` が大文字になるだけで、`toLowerCase` で吸収)。

入力モデルの比較(P4 を採用。P1〜P3 は却下案として理由を残す):

| 案 | 内容 | 長所 | 短所 |
| --- | --- | --- | --- |
| P1 バッファ共通 | テンキー方式と同じ。数字でバッファに積み、m/p/s/z で確定。バッファは選択中のカードに表示(2.12(1))。パレットの見た目はそのまま | 実装最小(reducer の `sheetMode !== 'tenkey'` の早期 return を外すだけ)。操作がテンキー方式と同一で覚えることが無い | パレット表示中に画面上に無い「バッファ」が出る。パレットの「1 枚削除」と物理 Backspace の意味がバッファ有無で変わる |
| P2 1打鍵確定 | パレットに「選択中のスート」を新設し、数字1打で即確定 | 打鍵数が最少 | パレットにはスート選択の概念が無く、新規 UI と状態が要る。赤5『0』・字牌 z の切替など規則が増える。設計・検証コストが最大 |
| P3 自動切替 | パレット表示中に数字/スートを打つと `sheetMode` を `tenkey` に切り替え、以降 P1 と同じ | 表示と挙動が一致する(画面上のテンキーにバッファが見える) | `sheetMode` は開閉をまたいで保持する(D3)ため、以後ずっとテンキー表示になる。タップ派のユーザーが意図せず切り替わる。トグルの表示も切り替わる |
| P4 P1+Backspace の統一 | P1 に加え、パレット方式の Backspace も「バッファがあれば1文字削除、空なら対象別の削除(A8)」とテンキー方式と同じにする | 物理キーの挙動が方式に依存しなくなる | P1 とほぼ同じ。画面上のパレットの「1 枚削除」ボタンは従来どおりで、物理キーとだけ挙動が揃う |

- 採用は **P4**(確定事項 41)。却下理由: P1=物理 Backspace の意味が方式で食い違う、P2=新規 UI・状態が要り設計検証コスト最大、P3=`sheetMode` が保持され意図せずテンキー表示に固定される。製造は P4 の列だけを実装する(P2 の列は参考)。
- 各案の対象別の挙動(P1・P3・P4 は判定が同じ。既存関数を流用し新規判定を作らない):

| 対象 | 数字の受付 | 確定(m/p/s/z) | 上限・使用済み・赤 | P2 の場合 |
| --- | --- | --- | --- | --- |
| 手牌 | `canAppendTenkeyDigitFor` | `planAddTiles`(14枚上限・4枚上限・赤5は在庫に応じ代替=既存) | 既存のまま | スート選択状態+`canAddHandTile` |
| ドラ・裏ドラ | `canAppendTenkeyDigitFor`(最大5枚) | 既存の indicator 分岐。1m・9m・字牌以外・4枚超は確定しない(既存) | 既存 | `canAddIndicatorTile` |
| 副露 | `canAppendTenkeyDigitFor`(1桁) | 既存の meld 分岐(`canSetMeld`、`0`=赤5・`5`=普通の5、確定事項 34) | 既存。パレットの赤牌切替ボタン(確定事項 31〜33)とは独立 | 赤の扱いを別途決める必要あり |
| 共通 | 確定できないキー(例 `8z`)は無処理(既存の `resolveTenkeyBuffer` が null) | — | — | — |

- Backspace の現行との差分: 現行パレット方式は対象別の末尾削除(A8)。P1・P3 はバッファがあっても末尾削除のまま(P3 は切替後テンキー扱い)、P4 はバッファ優先。

### 2.8 変更ファイル一覧

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/state/app-state.ts` | 変更 | 2.1 |
| `src/ui/state/hand-rules.ts` | 変更 | 2.2 |
| `src/ui/state/index.ts` | 変更 | 追加分の再輸出 |
| `src/ui/input/TilePalette.tsx`・`Tenkey.tsx`・`use-tenkey-keyboard.ts` | 変更 | 対象の一般化(2.3・A8) |
| `src/ui/input/MeldKindBar.tsx` | 新規 | 種類バー |
| `src/ui/screen/IndicatorCard.tsx`・`MeldArea.tsx`・`CardClearButton.tsx` | 新規 | 2.4・2.5・A11 |
| `src/ui/screen/MainScreen.tsx`・`main-screen.css` | 変更 | 置き場の差し替え・シートの分岐・スタイル |
| `src/ui/icons/symbol-paths.ts` | 変更 | add アイコン(無ければ) |
| テスト(`app-state.test.ts`・`hand-rules.test.ts`・新規コンポーネントのテスト) | 追加 | 4 章の自動テスト |
| `docs/requirements.md`・`docs/issues-draft.md` | 変更 | 1.3 |

| `src/ui/icons/symbol-paths.ts`・`index.ts` | 変更(UI 監修・監修2) | `SYMBOL_CANCEL` の追加と再輸出、`SYMBOL_DISABLED_BY_DEFAULT` の削除(確定事項 19・20) |
| `src/ui/expressive/BottomSheet.tsx` | 変更(UI 監修2) | 閉じるボタンのアイコンの `d` を `SYMBOL_CANCEL` に差し替えるのみ(確定事項 20)。expressive 配下は従来変更しない方針だったが、この確定により加える |
| `.indicator-card__title` の CSS(`main-screen.css`) | 変更(UI 監修2) | 書体を label-medium に(確定事項 17) |
| D4-ICON のテスト | 変更(UI 監修2) | `SYMBOL_CLOSE` の確認に改める |
| `src/ui/screen/HandCard.tsx` | 変更(UI 監修) | **ゴミ箱アイコンの差し替えのみ**(2.7) |
| `src/ui/screen/CardClearButton.tsx`・`main-screen.css` | 変更(UI 監修) | アイコン差し替え、2.4・2.6 の余白と牌幅 |
| `src/ui/screen/MeldArea.tsx`(+テスト) | 変更(確定事項 29) | `meldTiles(meld, red)` を `instantiateMeld` ベースに、`red` の受け渡し(2.11(1)) |
| `src/ui/input/TilePalette.tsx`・`tile-palette.css`(+テスト) | 変更(確定事項 25・27) | 副露シートで赤5キー2つを赤牌切替ボタン1つ(span 2)に置き換える(2.11(2))。`tile-palette.css` はグリッド定義を変えず、`.tile-palette__red-toggle` の押下中の背景・画像と「×n」の横並びの指定を足すのみ |
| `src/ui/state/hand-rules.ts`・`index.ts`(+テスト) | 変更(確定事項 27) | `meldRedToggle`・`meldTileForKey` の追加 |
| `src/ui/state/app-state.ts`(+テスト) | 変更(確定事項 30・34) | open-sheet の同一副露再選択、`tenkey-commit` の meld 分岐でのテンキーの赤5代替(2.11(3)(5))。`tenkey-logic.ts` は 2.11 では変更しない |
| `src/ui/md/Button.tsx` | 変更(検収指摘、例外承認) | `ButtonProps` に `'aria-label'?: string` を追加し、4 バリアントのカスタム要素に渡すのみ(確定事項 24) |
| `src/ui/screen/HandCard.tsx`・`IndicatorCard.tsx`・`MeldArea.tsx`(+テスト) | 変更(UI 監修5、確定事項 37・38・40・43) | バッファ表示を選択中のカードに限定・追加(副露は Q14)、外枠に `--selected` クラス、本体に `data-` 属性(`SHEET_OPENER_SELECTOR`)、本体の Enter/Space を選択中のときだけ無処理(2.12)。`IndicatorCardContentProps` に `selected`・`buffer`、`MeldAreaContentProps` に `selectedIndex`・`buffer` を追加。HandCard の変更範囲は 2.8 末尾の段落のとおり |
| `src/ui/screen/main-screen.css` | 変更(UI 監修5) | `.card-buffer`、`.hand-card--selected`・`.indicator-card--selected`・`.meld-card--selected`(背景色のみ) |
| `src/ui/input/tenkey-logic.ts`・`use-tenkey-keyboard.ts`(+テスト) | 変更(UI 監修5、確定事項 39〜41・43) | `SHEET_OPENER_SELECTOR` と `shouldHandleKeyEvent` の追加、`shouldHandleKeyTarget` の許可リスト化(2.12(3)(b))、`mapTenkeyKey` の方式分岐の撤去。`resolveKeyboardAction` の Backspace は両方式・全対象で `tenkey-backspace` を返す(パレット方式で hand に出していた `remove-last-hand-tile`、dora/uradora に出していた `remove-last-indicator-tile` の物理 dispatch は `tenkey-backspace` に置換。reducer の `tenkey-backspace`(app-state.ts 299〜337 行)はバッファ空のとき両アクション(191 行・539 行)と同じ結果、meld は不変で、現行パレット分岐と結果が一致する)。テスト D3-K2・D4-K2 の改訂 |
| `src/ui/state/app-state.ts`(+テスト) | 変更(UI 監修5、確定事項 41) | `tenkey-digit` の `sheetMode !== 'tenkey'` 早期 return の撤去(D3-S3 の改訂)。`tenkey-backspace` は変更不要(既にバッファ優先→対象別) |

`src/core/` は変更しない(確定事項 29 でも同じ)。`src/ui/md/` は `Button.tsx` の確定事項 24 の範囲以外を変更しない(他ラッパー・`index.ts`・スタイルは不可)。`HandCard.tsx` の変更は、アイコン差し替え(確定事項 19)と確定事項 37・38・40 の範囲(バッファの表示条件、外枠の選択クラス、本体 keydown の条件)に限る。構造・当たり判定・aria-label・寸法は変えない(見出しの m は `maxHandLength(melds)` で既に副露に追従する)。

### 2.9 バンドル

目標値(102,000 B)は超過中で、超過は容認する。本 Issue はコンポーネント3つと reducer の追加で数 KB 増の見込み。ビルド後の実測値を PR に記載する。

### 2.10 製造の段階化(コミット目安)

1. 状態・判定関数と単体テスト(2.1・2.2。UI なしで C1〜C8 が通る)
2. シート(種類バー・パレット/テンキーの対象の一般化・物理キー)とカード(2.3〜2.7)、コンポーネントテスト
3. `docs/requirements.md`(§2 副露・§4 ゴミ箱・更新日)・`docs/issues-draft.md` の改訂(1.3)

UI 監修の修正(既存3コミットは変えず、追加で1〜2コミット):

4. `fix`: ゴミ箱アイコンを disabled_by_default に統一(`symbol-paths.ts`・`CardClearButton`・`HandCard`)
5. `fix`: ドラ・裏ドラの牌幅 20dp とカードの余白削減(`main-screen.css`)。4 と 5 は1コミットにまとめてもよい
6. `fix`: UI 監修2(確定事項 17・19・20): 消すボタンを `SYMBOL_CLOSE` に、シートの閉じるボタンを `SYMBOL_CANCEL` に、ドラ・裏ドラ見出しを label-medium に。`SYMBOL_DISABLED_BY_DEFAULT` とその参照の削除、D4-ICON の更新。確定事項 18 は次の 7 で行う
7. `fix`: UI 監修2(確定事項 18'・21): 副露カードの1行配置と牌幅 24dp、テンキー機能キーの対象別化(`tenkeyActionKeysFor` と単体テスト、`Tenkey.tsx`)。2つに分けてもよい
8. `fix`: UI 監修4(確定事項 22・23): 見出し・牌行と✕の縦中心揃え、無反応帯の `::after` 化、ドラ・裏ドラの牌スペース常時確保(`main-screen.css`・`CardClearButton.test.tsx`)

9. `fix`: Codex 指摘(確定事項 29・30): 副露の表示を `instantiateMeld` に合わせる、open-sheet の同一副露再選択で削除しない。C22・C23
10. `feat`: 赤牌切替(確定事項 25・27・28): 判定関数とテスト → パレット・テンキー。C24〜C27。Q6〜Q10 は回答済み(確定事項 31〜36)

11. `fix`: UI 監修5(確定事項 37・38): バッファの表示先と選択中の欄の背景。C28・C29
12. `fix`: UI 監修5(確定事項 39・40): 物理キーの受付(初回オープン)とパレット方式の物理キー。P4(確定事項 41)で着手可。C30・C31

経緯: 設計書の初版コミット後、UI 監修1〜4 として、✕アイコン(`SYMBOL_CLOSE`)と見出し書体(確定事項 17・19・20)、副露の1行化と牌幅 24dp・テンキー機能キーの対象別化(確定事項 18'・21)、縦中心揃えと牌スペースの常時確保(確定事項 22・23)を順に反映した。本書は実装(UI 監修4 まで)に合わせて改訂済み。

## 3. 実挙動未確認の一覧

| 項目 | 状況 | 確認方法 |
| --- | --- | --- |
| カード・牌の寸法(2.4〜2.6) | 算出のみ | C14 |
| 空の副露(`tile:null`)を含む入力での計算結果の表示 | core は `instantiateMeld` で [] を返し、`fu.ts` で null を扱う分岐があるが、結果パネルの表示は未確認。A5 で対象を離れると消えるため、問題になるのはシートを開いている間だけ | C17 で目視し、例外が出ないことを確認 |
| `ConnectedButtonGroup` の disabled 項目の見た目と、選択中の項目が disabled になる状況 | 選択中の種類自体は常に有効(自身を除いて数えるため)。他の種類が disabled になる見た目は未確認 | C12 |
| 暗槓の裏牌の見た目 | 未確認 | C14 で目視 |
| 実機(iOS Safari・Android Chrome)での指のタップ、シートとカードのスクロール | 実機未確認 | 監修時に実機で操作 |

## 4. 受け入れ条件

前提: 検収幅は 375×812。dev サーバーはポート 5201 を `npm run dev -- --port 5201 --host` で起動し、Browser pane で開く。**他のポートで動いているサーバーは止めない。終了時は自分が起動した 5201 のみ停止する**(01 号の dev サーバー禁止事項)。ルールは既定(北=抜きドラ、赤2枚)。

### 自動テスト(`npm test`)

- [ ] **C1 add-meld**: 初期状態で `add-meld` → `melds` が `[{type:'pon', tile:null}]`、`inputFocus` が `{type:'meld', i:0}`。4 回目まで増え、5 回目は state が同一(参照が等しい)。
- [ ] **C2 手牌の切り捨て**: 手牌 14 枚(入力順 a1…a14、`inputFocus=null`)で `add-meld` → 手牌が先頭 11 枚 a1…a11。手牌 10 枚なら変わらない。`inputFocus={type:'hand'}` で未整列の 14 枚から `add-meld` → 整列後の先頭 11 枚になる。
- [ ] **C3 set-meld-tile / 使用枚数**: 手牌に 1p を 1 枚持つ状態で副露0にポン 1p → 成立(手牌1+ポン3=4枚)。手牌に 1p を 2 枚持つ状態ではポン 1p は state 不変(2+3=5枚)。手牌に 1p を 1 枚持ちポン 1p を確定した状態で、別の副露(空)に 1p を入れようとすると state 不変(1+3+3=7枚)。2m を入れようとすると state 不変。確定済みのポン 1p に 2p を入れると牌が 2p に置き換わる。確定済みのポン 1p に同じ 1p を入れても成立する(自身を除いて数える)。
- [ ] **C4 set-meld-kind**: ポン 1p(他に 1p 無し)を明槓・暗槓に変えると `{type:'kan', closed:false}`・`{closed:true}` になり牌は 1p のまま。手牌に 1p が 1 枚ある状態ではポン 1p を明槓に変えられない(state 不変)。空の副露の種類変更は常に成立する。
- [ ] **C5 remove-meld と対象の補正**: 副露3つ、`inputFocus=meld 2` で `remove-meld i:0` → 副露2つ、`inputFocus=meld 1`。`inputFocus=meld 1` で `remove-meld i:1` → `inputFocus=null`。
- [ ] **C6 空の副露の削除(A5)**: `add-meld` 直後に `close-sheet` → `melds` が空。同じく `open-sheet {type:'dora'}` → `melds` が空で `inputFocus` が dora。牌を確定した副露は `close-sheet` で残る。index 補正の検証は、通常操作では作れない状態を直接組み立てて reducer に与える: `melds=[{pon,null},{pon,1p}]`・`inputFocus=meld 0` で `open-sheet meld 1` → `melds=[{pon,1p}]`、`inputFocus=meld 0`。
- [ ] **C7 表示牌**: `add-indicator-tile dora` で 5 枚まで入り、6 枚目は state 不変。2m は不可。ドラ 1p ×3 + 裏ドラ 1p ×1 の後、手牌に 1p を足せない(`canAddHandTile` が偽)。`remove-last-indicator-tile`・`clear-indicators` が対象の側だけを変える。
- [ ] **C8 テンキーの一般化**: `inputFocus=dora` で表示牌 3 枚のとき `tenkey-digit` は 2 桁まで、3 桁目は不変。`tenkey-commit p` で 2 枚追加。`inputFocus=meld 0` では 1 桁まで。`'1'`→`tenkey-commit p` で副露0が 1p になる。`inputFocus=meld 0` でバッファ空の `tenkey-backspace` は不変、`dora` では末尾1枚が消える。D3 の既存テストのうち、`app-state.test.ts` の D3-S3 のパレット方式のブロックと `tenkey-logic.test.ts` の D3-K2 は確定事項 39・41 により期待値を反転して改訂し、それ以外の D3 テストは無変更で通る。物理キー(`resolveKeyboardAction`)の Backspace は、両方式・全対象で `tenkey-backspace` を返す(`use-tenkey-keyboard.test.ts` の D4-K2 を改訂。meld でも `tenkey-backspace` を返し、reducer 側で不変になる)。
- [ ] **C9 抜き北(確定事項 5)**: `rule.north='yakuhai'` で `step nuki +1` が不変、`set-rule` で yakuhai にすると `nuki` が 0 になる(既存テストの存在と合格を確認)。
- [ ] **C10 計算コアへの受け渡し**: `computeResult` に渡す `Input.dora` が `[...dora, ...uradora]` で、`melds` が状態のまま渡る(既存テストがあればその合格、無ければ追加)。

### 画面(375px、dev 5201)

測定条件: 寸法の実測はモバイルのビューポート指定(375×812、mobile emulation。スクロールバーはオーバーレイ)で行う。クラシックスクロールバーが出るデスクトップ相当では `.meld-area` が約 15px 狭くなり、副露の牌幅が `min()` の安全弁で約 22.25px になる。これは仕様どおりの挙動であり不合格ではない(合否はモバイル指定の実測で判定する)。

- [ ] **C11 追加ボタン**: 初期表示で `[aria-label="副露を追加"]` が1つあり、計算値 `border-style` が `dashed`。押すとシートが開き、`[role="radiogroup"][aria-label="副露の種類"]` 内の `role="radio"`「ポン」が `aria-checked="true"`(実物 `ConnectedButtonGroup.tsx` の選択表現)。副露カードが1枚増える。副露が4枚で追加ボタンが存在しない。
- [ ] **C12 種類バーと牌の確定**: 種類バーがパレット(またはテンキー)の上にある(`getBoundingClientRect().bottom` < パレット先頭の `top`)。ポンのまま 1p をタップすると副露カードに 1p が3枚表示され、シートは開いたまま。明槓を押すと 4 枚、暗槓を押すと 4 枚で両端が裏(`img` の alt/クラスで裏牌を確認)。手牌に 1p が 1 枚ある状態で明槓・暗槓の `role="radio"` 要素が `disabled` 属性を持つ。1p を使い切った後のパレットで 1p のキーが `disabled` 属性を持つ。副露のシートで「1 枚削除」と「副露をクリア」が `disabled` 属性を持ち、物理 Backspace で副露の牌が消えない。
- [ ] **C13 切り捨て(画面)**: 手牌 14 枚の状態で追加ボタンを押すと、手牌カードの見出しが `手牌 (11/11)`。
- [ ] **C14 寸法と配置**: ドラ・裏ドラカードが同じ `top` で横並び、各幅 167.5±1px。ドラ満杯 5 枚で牌の `width` が 20±0.5px、本体の `scrollWidth === clientWidth`(1行)。副露の牌の `width` が 24±0.5px、槓4枚で牌の行とボタンが同じ行にある(縦の揃いは C14i の縦中心基準で判定する。牌の行の `right` ≤ 無反応帯の `left` + 0.5)、牌の行の `scrollWidth === clientWidth`。カード外枠の高さ: ドラ・裏ドラ 66.7±3px(確定事項 22・23 で置換)、副露 48±3px(かつ ≥ 48)、4副露で `.meld-area` の高さ 104±4px(算出値。外れた場合は実測値を報告し統括が判断)。各カード外枠・追加ボタンの高さ ≥ 48px。カードの `padding-top`・`padding-bottom` が 6px。CSS に HEX 値を追加していない(`git diff` で `#[0-9a-fA-F]{3,8}` の追加が無い)。
- [ ] **C14a ゴミ箱の矩形(375px、dev)**: ドラ・裏ドラ・副露(1つ以上)の各カードについて、ゴミ箱の `getBoundingClientRect()` の `width` が 40±0.5、`height` が 24±0.5。無反応帯(`.hand-card__clear-zone` 相当のクラス。A11 の部品の要素)の矩形 z とゴミ箱の矩形 r について `z.left = r.left − 8 ± 0.5`、`z.bottom = r.bottom + 8 ± 0.5`、`z.right = r.right ± 0.5`、`z.top = r.top ± 0.5`。
- [ ] **C14b 当たり判定(375px、dev、各カード別)**: ドラ(表示牌3枚)・裏ドラ(1枚)・副露(ポン確定済み)の各カードで、issue-55 C6 の表と同じ点(ゴミ箱中央、角丸の内側の四隅 ±4px、真上の外 r.top−1、真下の外 r.bottom+1・+7、無反応帯の外(下)z.bottom+1、左の外 r.left−1・−7、無反応帯の外(左)z.left−1、左下の角 (r.left−4, r.bottom+4))を `document.elementFromPoint` で評価し、同表と同じ期待(ゴミ箱/無反応帯/カード本体)になる。`.hand-card` は各カードの外枠に読み替える。副露カード(1行配置)では次の読み替えを加える: 「無反応帯の外(左)z.left−1」は牌の行(`role="button"`)に当たりシートを開く。「無反応帯の外(下)z.bottom+1」は 確定事項 22 の縦中心揃えで z.bottom = r.bottom + 8 = 行の上端 + 38px となりカードの下 padding(6px)の内側のため、外枠(カード)に当たりシートを開く(`closest('.meld-card')` が非 null・無反応帯は null)。「真上の外 r.top−1」はカードの上 padding でシートを開く。槓4枚でも同じ判定になる。
- [ ] **C14c 押下の結果(375px、dev)**: 各カードで、無反応帯の2点(真下 +1・左 −1)の要素へ `click()` を送るとシートが開かず状態が変わらない。真上の外・無反応帯の外(下・左)へ送るとシートがそのカードの対象で開く(各回の前に Esc)。ゴミ箱中央へ送ると、ドラ・裏ドラは表示牌が0枚、副露はその副露が消え、シートは開かない。表示牌0枚のドラ・裏ドラでゴミ箱(disabled)中央へ `click()` を送ってもシートが開かない。
- [ ] **C14d 消すボタンとシートのアイコン(375px、dev)**: 手牌・ドラ・裏ドラ・副露の各消すボタンの svg の `path` の `d` 属性が `SYMBOL_CLOSE` と一致する。`SYMBOL_DISABLED_BY_DEFAULT` と旧ゴミ箱のパス `M6 19c0 1.1…` がコードに残っていない(`grep`)。svg の矩形が 20±0.5 × 20±0.5 で、ボタンの矩形の内側にある。空のときもボタンが描画され `disabled` 属性を持つ。色の計算値が従来(on-surface-variant、disabled 時 不透明度 0.38)と同じ。底部シートを開き、`[aria-label="閉じる"]` 内の svg の `path` の `d` が `SYMBOL_CANCEL` と一致し、閉じるボタンの `getBoundingClientRect()` の幅・高さが main(本 Issue 前)と同じで、押すとシートが閉じる。`BottomSheet.tsx` の差分がアイコン定数の差し替え(import と `d`)だけである(`git diff`)。
- [ ] **C14f 見出しの書体(375px、dev)**: `.indicator-card__title` の計算値 `font-size`・`font-weight`・`line-height`・`font-family` が `.stepper__label` の計算値と一致する。`.hand-card__title` の計算値が本 Issue 前(title-small)から変わらない。ドラ・裏ドラカードの高さが C14 の合格値の範囲のまま。
- [ ] **C14i 縦中心と牌スペース(375px、dev。確定事項 22・23)**: (1) ドラ・裏ドラカードの外枠の高さが、表示牌 0 枚と 5 枚で一致する(差 ≤ 0.5px、いずれも 66.7±3px)。5 枚で牌がすべて同じ `top`(1行)。(2) `.indicator-card__title` の矩形と✕の矩形の縦中心(`(top+bottom)/2`)の差が 0.5px 以内(0 枚・5 枚の両方)。(3) 副露カード(空・ポン・槓4枚)で、牌の行(空のときは空枠)と✕の縦中心の差が 0.5px 以内(`top` の差は問わない。C14 の旧条件「`top` の差 ≤ 1px」はこれに統合して削除)。空の副露と牌入りの副露のカード高さが一致する(差 ≤ 0.5px)。(4) ドラ・裏ドラ・副露の✕が 40±0.5 × 24±0.5 で、C14a の無反応帯の関係(`::after` の矩形を z として `z.left = r.left − 8`、`z.bottom = r.bottom + 8`。下側は `::after` を `elementFromPoint` で拾うため、z は無反応帯要素の `getBoundingClientRect()` と `getComputedStyle(el,'::after')` から求める)と C14b・C14c の当たり判定が合格のまま。(5) 手牌カードの✕と無反応帯の `getBoundingClientRect()` が main(本 Issue 前)と同じ(各 ±0.5px)。(6) `document.documentElement.scrollWidth === clientWidth`(横はみ出しなし)。
- [ ] **C20 パレット AC の aria-label(375px、dev。確定事項 24)**: 手牌・ドラ・裏ドラ・副露の各シートをパレットモードで開き、`md-filled-tonal-button.tile-palette__action`(AC)の `aria-label` 属性が DOM 上でそれぞれ「手牌をクリア」「ドラ表示牌をクリア」「裏ドラ表示牌をクリア」「副露をクリア」である(C12・C15 の文言と一致)。`src/ui/md/Button.tsx` の差分が `ButtonProps` への `'aria-label'` 追加と 4 バリアントへの受け渡しだけで、`src/ui/md/` の他ファイルに差分が無い(`git diff`)。
- [ ] **C22 副露の表示(自動テスト、確定事項 29)**: `meldTiles` が red=0/1/2 × ポン赤なし/赤あり/明槓/暗槓 × 5p で 2.11(1) の表・例どおり(赤の数と並び、暗槓の両端が back)。1p 等 5 以外は従来と同じ。
- [ ] **C23 open-sheet(自動テスト、確定事項 30)**: `melds=[{pon,1p},{pon,null}]`・`inputFocus=meld 1` で `open-sheet meld 1` → `melds` 2 つのまま・`inputFocus=meld 1`。続けて `set-meld-tile i:1` が成立する。`open-sheet meld 0` → 空の副露が消え `inputFocus=meld 0`。`close-sheet` → 空の副露が消える(C6 も合格のまま)。`open-sheet meld 1` で同じ副露を再選択した後に `close-sheet` → 空の副露が消える。
- [ ] **C24 赤牌切替の判定(自動テスト)**: `meldRedToggle` が、red=0 で `visible=false`。red=1・ポン 5p(赤なし)で有効・`next.red=true`、反転後に切替えて赤なしへ戻る。手牌に赤5p がある red=1 では赤なし→赤ありが disabled。red=2・ポン 5p(赤なし=赤1枚)で有効、手牌に赤5p 1枚なら disabled(赤 1+2=3>2)。槓・1p・牌未確定で disabled。reducer で `next` を `set-meld-tile` すると `usedTiles` の赤の数が 0↔1(red=1)・1↔2(red=2)に変わる。red=2 の確認はすべて reducer で `set-rule`(red:2)を dispatch した状態で行う(ルール設定UIは D6 で、dev 画面では red=2 にできないため)。
- [ ] **C25 5キーの代替(自動テスト)**: red=1・手牌に普通の 5p 1枚で、副露ポンへの 5p キーが有効で、押すと `tile.red=true`。赤ありの 5p ポンに 5p キーを押しても `red=true` のまま。テンキー `'5'`→p でも同じ。`'0'`→p で `red=true`。
- [ ] **C26 パレット(375px、dev、mobile、確定事項 25・31〜33)**: 基準として手牌のシート(red=1。`DEFAULT_RED=1` の既定状態)で赤5p・赤5s キーの矩形と全牌キー・機能キーの矩形を記録する。副露のシートで、`[aria-label]` に赤5の2キーが無く、`.tile-palette__red-toggle` が1つあり、その `left`・`top` が基準の赤5p キーと ±0.5px、`right` が基準の赤5s キーの `right` と ±0.5px、高さが基準キーと ±0.5px(=2セル分と一致)。他の牌キー・「1 枚削除」・AC・「入力を終える」の矩形が基準と ±0.5px で一致し、`.tile-palette` の `grid-template-columns` の列数が 9。切替ボタンの幅 ≥ 44px かつ高さが既存の牌キーと同じ(3rem=48px)。`aria-label="赤牌"`、牌画像(赤5)と「×n」の文字を含む。ポン 5p 確定後に押すと `aria-pressed` が false↔true に反転し、「×0」↔「×1」、副露カードの牌が 5p×3 ↔ 5p,5p,赤5p になる。槓・1p・牌未確定で `disabled`。テンキーモードの副露シートに `.tile-palette__red-toggle` が無い。手牌・ドラ・裏ドラのシートでは赤5キーが2つあり切替ボタンが無い(従来どおり)。`document.documentElement.scrollWidth === clientWidth`。red=0 の配置は C24・コンポーネントテストで確認する(dev 画面では red=0 にできないため。コンポーネントテストで red=0 の副露シートに切替ボタンも赤5キーも無いことを確認する)。
- [ ] **C27 表示(375px、dev、red=1 のみ、確定事項 29・36)**: red=1(`DEFAULT_RED=1` の既定状態)で、暗槓 5p の副露カードの牌が [裏, 5p, 赤5p, 裏]、明槓 5p が赤1枚を含む。red=2 の表示は dev 画面に設定UIが無い(D6)ため確認せず、C22 の自動テストで代える。
- [ ] **C28 バッファ表示(自動テスト・コンポーネント、確定事項 37)**: `tenkeyBuffer='1'` で `inputFocus` を hand・dora・uradora・meld 0 と変えたとき、バッファ要素(`‸` を含む)が対象のカードにだけ1つ存在し、他のカード(特に手牌カード)に無い。`inputFocus=null` ではどこにも無い。 `inputFocus=meld i` でバッファがあるとき、その副露カードは牌列・空枠を描かずバッファだけを描く(確定事項 44、`MeldAreaContent` の `renderToStaticMarkup`)。
- [ ] **C28b 副露のバッファと幅(375px、dev、確定事項 44)**: 槓4枚の副露を開き `1` を打つと、牌列の代わりにバッファだけが出て(`.meld-card__tiles` が無い)、カード高さが打つ前と ±0.5px で一致し、`Backspace` で消すと牌4枚(各幅 24±0.5px)に戻る。いずれの時点でも `document.documentElement.scrollWidth === clientWidth`、カードの `scrollWidth === clientWidth`(はみ出しなし)。
- [ ] **C29 選択中の背景(コンポーネント+375px、dev、ライト/ダーク、確定事項 38)**: (自動)`inputFocus` に応じて対象の外枠にだけ `--selected` クラスが付き、副露2つのとき対象の1枚だけ。`close-sheet` で全カードから外れる。(dev)各カードを開いたとき外枠の `getComputedStyle().backgroundColor` が`--md-sys-color-primary-container`の算出値と一致し、`outline-style`・`border` が開く前と同じ(枠線なし)。他のカードは `surface-container` のまま。閉じると戻る。`resize_window` の colorScheme light・dark の両方で、スクリーンショットで牌画像・見出し・✕・バッファが判別できる(識別不能なら不合格として統括へ戻す)。C14i の寸法が合格のまま。 追記: (dev)選択中の背景は、手牌・ドラ・副露の3カードとも、`getComputedStyle(外枠).backgroundColor` の算出値が `--md-sys-color-primary-container` の算出値(`getComputedStyle(document.documentElement).getPropertyValue`)と一致すること。クラスの付与だけで合格としない。(自動)`main-screen.css` の文字列を読み、`.hand-card--selected`・`.indicator-card--selected`・`.meld-card--selected` の各規則が、対応する基底規則(`.hand-card`・`.indicator-card`・`.meld-card` の background 指定)より後ろにある、または詳細度が高いことを検査する。
- [ ] **C30 物理キー判定(自動テスト、確定事項 39・40・41・43)**: 改訂対象テスト: D3-S3(パレット方式の `tenkey-digit` が同一 state → バッファに積まれる)、D3-K2(パレットで `7`・`m` が null → digit/suit を返す)、D4-K2(パレットの Backspace が対象別アクション → `tenkey-backspace`)。テスト環境は vitest の既定(node。jsdom・@testing-library は無く、追加しない)なので、判定は既存 D3-F2 と同じく `closest` を持つ擬似オブジェクトで行う: カード本体の属性(2.12(3)(b) の `data-` 属性セレクタ)に一致する擬似要素で真、一致しない擬似要素(ステッパーのボタン相当)で偽、`.bottom-sheet` 内で真(従来)。`mapTenkeyKey` が palette でも数字・m/p/s/z を返し、修飾キー・`isComposing` では null。reducer: palette で `tenkey-digit 1`→`tenkey-commit p` で 1p 追加、バッファありの `tenkey-backspace` が1文字削除。キーイベント判定の純粋関数(2.12(3)(b) の `shouldHandleKeyEvent`)が `defaultPrevented: true` の擬似イベントで偽。カード本体の keydown 処理は、選択中なら Enter で `open-sheet` を出さず preventDefault もしない、選択中でない本体では従来どおり `open-sheet` を出し preventDefault する(=別カード本体の Enter で `open-sheet` が出て、フックの `close-sheet` は出ない)。React の合成イベントと window リスナーの順序(本体の onKeyDown が先に走り `defaultPrevented` が立つこと)は、製造時に C31(6) の実測で確認する。 追記: カード本体の keydown は手牌・ドラ・副露のそれぞれで次の4通りを検証する: 選択中×Enter、選択中×Space → `open-sheet` を出さず `preventDefault` もしない。非選択×Enter、非選択×Space → `open-sheet` を出し `preventDefault` する。
- [ ] **C31 物理キー実測(375px、dev 5201、mobile:true、確定事項 39・40・41・43)**: キーは `computer` の key アクションで実際に送る。`sheetMode` は永続化されず、リロード直後は必ずパレット方式である。各ケースで送信前に `document.activeElement` のクラスを記録する。(1) **不具合条件(必須)**: リロード → カードを left_click で1回タップしただけの状態(パレット方式)で、手牌 `1` `2` `3` `p` → 手牌に 1p2p3p(三麻に 2m〜8m は無いので m の連番は使わない)。リロードして ドラ `9` `m` → 9m。リロードして 副露を追加(ポン)し `5` `p` → 5p のポン。パレット表示のまま(テンキーに切り替わらない)、バッファありの `Backspace` が1文字削除。(2) テンキー方式: リロード → カードをタップ → トグルをタップ(テンキー方式へ)→ 同じカード本体をもう1度タップ(同一対象の open-sheet は状態を変えず本体へ focus() し直す。`HandCard.tsx` 110 行・`IndicatorCard.tsx` 40 行・`MeldArea.tsx` 51 行)→ `document.activeElement` が `*__body` であることを記録 → (1) と同じキーを送り同じ結果。(3) 入力途中の数字が対象のカードに表示され、手牌以外では手牌カードに出ない(C28 の実物確認)。(4) 選択中カードの本体にフォーカスがある状態で `Enter` → シートが閉じ、再度開いていない。(5) 手牌のシートを開いたまま、ドラカード本体にフォーカスを移して `Enter` → ドラのシートに切り替わる(閉じない)。(6) 抜き北ステッパーのボタンにフォーカスを置いて(シートを開いた状態でも)数字キーを送り、手牌が変わらない。
- [ ] **C14e 手牌カードの非回帰**: issue-55 の C5(ゴミ箱 40×24)・C6(当たり判定の点)・C7(押下の結果)ほか手牌カード・パレットの条件を再実行し合格(確定事項 24 の `Button.tsx` 変更後に実施)。HandCard.tsx の差分が、アイコン部分(import と svg 要素)と確定事項 37・38・40 の範囲(バッファの表示条件、外枠の選択クラス、本体 keydown の条件)だけで、構造・当たり判定・aria-label・寸法に関わる差分が無い(`git diff` で確認)。
- [ ] **C14g テンキーの機能キー(自動テスト)**: `tenkeyActionKeysFor` について 2.3 のテンキー表の全行(hand/dora/uradora/meld × バッファ空/あり × 対象の牌0枚/あり)の `label`・`action`・`disabled` が表どおり。reducer で `inputFocus=dora`・手牌 13 枚・ドラ 2 枚から AC の `action` を dispatch すると、ドラが0枚・手牌 13 枚のまま。`tenkey-backspace` で dora はバッファ空ならドラ末尾1枚、meld はバッファ空で不変、バッファありなら末尾1文字。
- [ ] **C14h テンキーの機能キー(375px、dev)**: テンキーモードでドラのシートを開き、AC の aria-label が「ドラ表示牌をクリア」、押すとドラだけが空になり手牌カードの見出しの n が変わらない。ドラ0枚・バッファ空で AC と「1 文字削除」が `disabled` 属性を持つ。裏ドラも同様(「裏ドラ表示牌をクリア」)。副露のシートで AC が `disabled`(aria-label「副露をクリア」)、「1 文字削除」はバッファ空で `disabled`、数字を1つ入れると有効になり押すとバッファが消える。手牌のシートの AC は従来どおり「手牌をクリア」で手牌を消す。
- [ ] **C15 ドラのシート**: ドラカードの本体を押すとシートが開き、ヘッダーにパレット/テンキー切替がある。パレットの 1m・9m・字牌が押せ、2m〜8m のキーは存在しない(D2 のまま)。5 枚入れると全牌キーが disabled。テンキーで `1` `9` → `m` で 1m・9m が入る。パレットモードで「1 枚削除」と物理キー Backspace でそれぞれ末尾1枚が消え、手牌は変わらない。「AC」の aria-label が「ドラ表示牌をクリア」で、押すとドラだけが空になり手牌は変わらない。0 枚で「1 枚削除」「AC」が `disabled` 属性を持つ。Enter でシートが閉じる。裏ドラも同様(aria-label「裏ドラ表示牌をクリア」)。手牌のシートでは「1 枚削除」・物理 Backspace・「手牌をクリア」が従来どおり手牌に効く。ゴミ箱で全消しされ、シートは開かない。
- [ ] **C16 副露の削除**: 副露カードのゴミ箱で副露が消え、手牌カードの見出しの m が 3 増える。開いている副露のゴミ箱を押すとシートが閉じる。
- [ ] **C17 空の副露**: 追加ボタン→何も押さずに Esc → 副露カードが消える。シートを開いている間、結果パネルにコンソールエラーが出ない(`read_console_messages` で error が 0)。
- [ ] **C18 抜き北(確定事項 5)**: 設定で北を共通役牌にすると、抜き北ステッパーが disabled で値 0(D4 の画面で再確認)。抜きドラに戻すと有効。
- [ ] **C19 D1 条件 20・21 の維持**: issue-51 条件 20 を手牌カードについて再実行し合格。ドラ・裏ドラ・副露カードの本体からシートを開き Esc で閉じた後、`document.activeElement` が開いたカードの本体(削除された空の副露を除く)。シートの開閉で `history.length` が変わらない。条件 21 は保留中のため判定方法を実行し、main と結果が同じであることだけを確認する(確定事項 6)。
- [ ] **C20 要件・下書き**: `docs/requirements.md` 27 行目が 1.3 の文言で、更新日行に Issue #48 がある。`docs/issues-draft.md` D4 の項に「加槓」が単独の種類として残っていない。 §4 のゴミ箱の文が 1.3 の文言に置き換わり、「他の入力欄には広げない」が残っている。牌の当たり判定の追記が無い。
- [ ] **C21 品質**: `npm run lint`・`typecheck`・`format:check`・`test`・`build` が通る。バンドルの実測値を PR に記載(目標超過は容認)。ホームディレクトリ名・絶対パスがコード・ドキュメントに無い。dev サーバーは 5201 のみ停止し、他のポートのプロセスが残っていることを `lsof -i -P | grep LISTEN` で確認。

## 5. 後続 Issue への引き継ぎ

- D5(状況役): 槍槓・嶺上開花の入力は `HandOptions` で扱う。加槓は状態上 `kan closed:false` のため、「加槓した」かどうかを副露から推定しない。嶺上開花の前提(槓がある)を副露から判定する場合は `kan` の有無で足りる。
- D5: 要約カード(D1 条件 21)は本 Issue で変えていない。
- core の `Chii` 型等の削除(別 Issue)は、副露の UI に影響しない(UI は `Pon`/`Kan` しか作らない)。
- Issue #58(D4-1 スマート入力モード(仮称)、依存 #48): 本 Issue は副露を「種類+牌」(`Meld`)の単位で持ち、種類(`set-meld-kind`)と牌(`set-meld-tile`)を独立に変えられるため、#58 は手牌の除去と `Meld` の追加をまとめるアクションを足すだけで載せられ、本 Issue の状態設計は #58 を妨げない。#58 の設計は本書では行わない。
- D6(ルール設定): red=0 でテンキー `'0'` 確定した副露は `tile.red=true` のまま残り、後で red≥1 に変えると赤ありとして扱われ、手牌の赤との合計上限が再検査されない(既存の挙動。計算・表示自体は正しい)。ルール変更時の入力の再検査を D6 で扱うこと。
- (UI 監修5)issue-47 設計書の確定事項 10 は改訂しない。issue-47 冒頭の改訂履歴に、確定事項 10 の変更(本書の確定事項 39・41)への参照を1行追記する(統括が実施。製造の対象外)。
- (UI 監修5)`BottomSheet` の閉じるボタンへのフォーカスが、少なくとも初回オープンで効かない件(再現条件は未特定、2.12(3)(a))は、本 Issue では判定側(①)で回避しただけで、フォーカス位置自体は直しておらず原因も特定していない。原因の特定と a11y 上の修正(②など)は、expressive の変更として別 Issue で扱う。
- 各カードのゴミ箱の寸法は要件 §4 の例外(Issue #55・#48)に従う。寸法を変える場合は §4 の改訂が要る。

## 6. 要ヒアリング事項(統括担当へ)

設計時の Q1〜Q4 はユーザー回答で解決済み(1.2 の確定事項 10〜13)。

- Q5 は A 案で解決済み(確定事項 18')。

### UI 監修5(独立レビュー後, Q14): 回答済み(確定)

Q14=(a)→確定事項 44。以下は回答時の選択肢(記録)。

- **Q14 副露カードのバッファの置き方**(2.12(1)): **(a) バッファ中は牌列の代わりにバッファだけを表示(採用。幅の問題が起きない。入力中は現在の牌が見えない)** / (b) `position: absolute` で右端に重ねる(牌は見えるが槓4枚で4枚目に重なる) / (c) 空枠の `width: 100%` を `flex: 1` に(空の副露にしか効かず槓4枚は解決しない)。

### UI 監修5(Q11〜Q13): 回答済み(確定)

ユーザー回答: Q11=P4→確定事項 41、Q12=primary-container→42、Q13=①許可リスト型→43。未確定事項として残すものはない。以下は回答時の選択肢(記録)。

- **Q11 パレット方式の物理キーの入力モデル**(2.12(3)(c)): P1 バッファ共通 / P2 1打鍵確定(スート選択の新 UI) / P3 物理キーで自動的にテンキー方式へ切替 / **P4 P1+Backspace もテンキー方式と同じ(採用)**。
- **Q12 選択中の欄の背景トークン**(2.12(2)): **`primary-container`(採用)** / `secondary-container`(控えめ) / `surface-container-high`(非選択との差がほぼ無く非推奨)。
- **Q13 フォーカス不具合の直し方**(2.12(3)(b)): **①許可リスト型(採用、expressive 不変)** / ②BottomSheet の遅延フォーカス(expressive の例外変更が要る)。

### 赤牌切替(Q6〜Q10・暗槓の表示): 回答済み(確定)

オーナー確認済み。Q6=C(横2マス・9 列のまま)→確定事項 31、Q7=A→32、Q8=A→33、Q9=A→34、Q10=A→35、暗槓の表向きに赤を見せる→36。未確定事項として残すものはない。
