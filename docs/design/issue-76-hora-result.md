# Issue #76 E2. 和了の結果 設計書

- Epic: E(結果表示, #6)
- ブランチ: `feature/issue-76-hora-result`
- 依存: E1 #75(`docs/design/issue-75-result-switch.md`)。関連: #62
- 後続: E3 #77(聴牌の結果)・E4 #78・Epic F
- 改訂: 2026-11-14 第9版(Issue #82 で R19 の符が 40 に決まった)。第8版(独立レビュー判定の反映)。第7版(UI 監修のイメージに合わせたカード構成・書式・次の段階のバッジ。10章)

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- Issue #76 本文とコメント(PR #80 のレビューで E2 に持ち越した (a)(b))
- `docs/design/issue-75-result-switch.md`(2.2 の境界、2.5 のバナー、4章の引き継ぎ、7章の UI 監修)
- `docs/design/issue-32-result-payment.md`(`ScoredHora`・`HoraScore`・§2.1 Q3、B4-M01/M02)
- `docs/design/issue-13-sanma-payment.md`(`Payment` とツモ損3方式)・`issue-12-sanma-north.md`(`north`・`nuki-dora`、§8 の役なし判定の引き継ぎ)・`issue-14-local-yaku.md` §3(ローカル役の名前)・`issue-46-palette-input.md`(和了牌の発光の判断委任)・`issue-50-settings-screen.md`(D6。ルール変更で入力を書き換えない判断)
- `docs/mahjong-rules.md`、業務標準 01〜09号
- 実コード: `src/core/{result,hora-score,hora,fu,yaku,score,payment,input,rule}.ts`・`src/core/tile/index.ts`、`src/ui/result/*`、`src/ui/screen/{ResultPanel,ResultBanner,MainScreen}.tsx`・`main-screen.css`、`src/ui/state/{app-state,hand-rules,situation-rules}.ts`、`src/ui/settings/use-rule-settings.ts`、`src/ui/md/index.ts`・`src/ui/expressive/`・`src/ui/icons/symbol-paths.ts`
- 参照実装(リポジトリ外の参照用クローン。リポジトリのルートから見て `../ref-repo/`):
  - livewing/mahjong-calc(MIT): `src/components/{HoraItem,HoraItemSummary,FuDetail,YakuList,Score,LimitBadge}.tsx`、`locales/ja.yml`、`src/lib/store/index.ts`(`set-current-rule`)
  - mj-mighty-calc(自作。ライセンス未設定): `src/ui/ResultPanel.tsx`(`CandidateCard`)、`src/index.css` の `.candidate` 系(`.candidate-head`・`.candidate-sub`・`.sub-main`・`.pay-detail`・`.tier-hint`・`.side-badge`・`.rank`)、`src/core/payment.ts` の `basePoints`・`nextTierHint`(自作部分。riichi 非依存)。riichi 系に依存するファイル(`App.tsx`・`ui/LuckSheet.tsx`・`ui/TileImage.tsx`・`core/{almighty,tiles,analysis,yakuNames,backend}.ts`)は読むだけで移植しない

### 1.2 確定事項(ユーザー決定。再検討しない)

| # | 確定事項 | 本書での反映 |
| --- | --- | --- |
| 1 | バナー(和了形)は、ツモとロンそれぞれの打点だけを出す。13枚で和了牌が複数あるときは最高打点だけ。書式は設計書で決める | 2.4 |
| 2 | 本体は見出し行・役一覧・符の内訳・点数と支払いの内訳。ツモとロンの2枚を並べる(並び順は E2 では「ロン→ツモ」。2.5)、常時展開(`HoraItem({hora})`)。デザインは mj-mighty-calc の ResultPanel を参考に、MD3 のトークンと既存の UI 部品に合わせる | 2.5・2.6 |
| 3 | 符の内訳は**折りたたみ**(既定は閉じる)。開くと「面子(または雀頭)・名称・符数」を1行1項目のリストにする。面子・雀頭は既存の `Tile` で牌の並びを見せる(第2版。初版のバッジ案から変更) | 2.6.3 |
| 4 | 役名・符名・限度名の表は和了本体専用の遅延チャンクに置く(`React.lazy`)。バナーは表を使わない。初回 JS を増やさない。09号に従う | 2.2・2.10 |
| 5 | 役なしは UI 側で判定する(core は変えない)。1飜縛りとし、懸賞役(ドラ・赤ドラ・抜きドラ・一発)だけなら「役なし」として点数を隠す(役満があれば別) | 2.3・1.4 |
| 6 | `nuki-dora` は「抜きドラ」、`north` は「北」(正本の「役牌：北」は役の呼び名として残す)。役名は正本(`docs/mahjong-rules.md`)の表記に合わせる | 2.7 |
| 7 | 役満の複合なし(`multipleYakuman: false`)では、成立した役満をすべて役一覧に出し、計算だけ採用した1つ分にする。「不採用」の表示はしない。限度名は `yakumanPoint` から導く | 2.6.2・2.7.3 |
| 8 | 複数の和了候補(分解の違い)は扱わない(core の `uniqueHoras` が (和了牌, by) ごとに1件に絞る) | 3章 |
| 9 | 赤牌の食い違いは、設定で赤牌の枚数を変えたら入力をリセットする仕様で防ぐ(livewing と同様)。E2 の注意表示は作らない。リセットは E2 に含めず、E2 完了後に #62 の別 PR で行う(仕様は 4章) | 3章・4章 |
| 10 | 和了牌の発光表示は採らない | 3章 |
| 11 | E1 持ち越し: (a) バナーが入力欄の末尾に重なる件を直す(下余白に `--result-banner-height` を加える)。(b) 要約カードの表示遅れは調査だけ(修正しない)。(c) 実機確認は検収後にユーザーが行う | 2.9・2.11・7章 |
| 12 | 製造方式に依存する記述を入れない | 全体 |
| 13 | 役名・符名・限度名の表は、ユーザーが直接編集して監修する。コードの論理を含まないデータだけの1ファイルにし、各行に出典コメントを付け、型で全件網羅を守る | 2.7・2.7.4 |
| 14 | 基本点の行を出す | 2.6.4 |
| 15 | 細部の書式はユーザーが UI 監修で調整する。書式の純関数と表を分離する。二倍以上の役満は漢数字で「二倍役満」「三倍役満」…と統一し、「ダブル役満」「トリプル役満」は使わない。単独は「役満」 | 2.4・2.7.3 |
| 16 | (第7版・UI 監修)カードは mj-mighty-calc の `CandidateCard` の構成に準拠する(万能牌はない): 見出し行の左に「ロン/ツモのバッジ+和了牌1枚」、右に大きく点数。その下の左に「N飜 M符」+限度名(赤字)、その下に次の段階のバッジ、右端に右揃えで支払いの内訳。その下に役一覧(飜は右)、その下に符の折りたたみ | 2.6 |
| 17 | (第7版)和了牌は各カードのバッジの横に置く。和了牌ごとのまとめ・結果パネル先頭の和了牌の列は廃止し、`HoraDetail` は `hora[]` を並び順のまま平らに並べる(13枚で複数の和了牌のときも同じ)。カードはロンが先、ツモが後 | 2.5 |
| 18 | (第7版)次の段階のバッジ「＋k飜で{限度名}」を範囲に加える。役満・数え役満、数え役満なしの三倍満では出さない。ロン・ツモの両方に出す。遅延チャンク内で実装し、core は変えない | 2.6.5 |
| 19 | (第7版)点数は3桁区切りあり。ツモの区切りは「・」(例「700・1,300」「1,000オール」)。見出し・「は」の行・バナーで同じ書式関数を使う | 2.4・2.7.3 |
| 20 | (第7版)支払いの内訳: ツモは「は {本場込み}」(本場があるときだけ)と「合計 {total}点」(本場・供託があれば「合計 {total}(+{bonus})点」)。ロンは「は {本場込みの支払額}」(本場があるときだけ)と「(+{bonus})点」(本場・供託があるときだけ)の2行。どちらも無ければ何も出さない。アプリをそのまま読めば点数申告できる形にするため(第7版の追加確定) | 2.6.4 |
| 21 | (第7版)ロン・ツモのバッジの一方を tertiary、他方を primary にする(入れ替えやすく1か所で定義)。基本点の位置と計算式の追加は UI 監修で決める | 2.6・4章 |

### 1.3 実行して確かめた事実(使い捨てのテストで `generateResult` を実行。実行後に削除し、`git status` が空であることを確認済み)

表の「子·親」「計」は core の値の記録で、画面の書式(3桁区切り・「・」)は 2.4 による。ルールは `DEFAULT_RULE`(赤 1=5p・5s 各1枚、ツモ損あり、役満の複合あり、数え役満あり、北=抜きドラ)を基準とし、「変更」列だけ変えた。場は東。

| ID | 牌姿(最後が和了牌) | 自風・変更 | ロン | ツモ |
| --- | --- | --- | --- | --- |
| R01 | `234p567p34s678s99p` + `2s` | 南 | 平和1 / 30符 / 1000 | 門前清自摸和1・平和1 / 20符 / 400·700(計1100) |
| R02 | 同上 | 東 | 1500 | 700オール(計1400) |
| R03 | 同上 | 南・北家分折半 | 1000 | 600·900(計1500) |
| R04 | 同上 | 東・北家分折半 | 1500 | 1100オール(計2200) |
| R05 | 同上 | 南・ロン打点折半 | 1000 | 700·700(計1400) |
| R06 | 同上 | 東・ロン打点折半 | 1500 | 1000オール(計2000) |
| R07 | 同上 | 南・2本場・供託1本 | 1000、本場込み 1400、`honba` 400・`deposit` 1000・`bonus` 1400 | 400·700、本場込み 600·900、計1100、`bonus` 1400 |
| R08 | 同上 | 東・2本場・供託1本 | 1500、本場込み 1900 | 700オール、本場込み 900オール |
| R09 | 同上 | 南・抜き北2 | 平和1・抜きドラ2 / 3900 | 4飜20符 / 1300·2600 |
| R10 | `234p567p34s678s55p` + `2s`、ドラ表示 `4p` | 南 | 断么九1・平和1・ドラ3 = 5飜 / 基本点2000(満貫)/ 8000 | 6飜 / 3000(跳満)/ 3000·6000 |
| R11 | `123p456p789p23p99p` + `4p` | 南 | 平和1・一気通貫2・清一色6 = 9飜 / 4000(倍満)/ 16000 | 10飜 / 4000·8000 |
| R12 | R11 + 立直・一発 | 南 | 11飜 / 6000(三倍満)/ 24000 | 12飜 / 6000·12000 |
| R13 | R12 + ドラ表示 `3p` | 南 | 13飜 / 8000・`yakumanPoint` 0(数え役満)/ 32000 | 14飜 / 8000·16000 |
| R14 | `555z666z77z123p99s` + `7z` | 南 | 大三元(役満1)/ `fu` null / 32000 | 8000·16000 |
| R15 | `19m19p19s1234567z` + `1m` | 南 | 国士無双十三面待ち(役満2)/ 16000 / 64000 | 16000·32000 |
| R16 | `19m19p19s1234561z` + `7z` | 南 | 国士無双(役満1)/ 32000 | 8000·16000 |
| R17 | `1122p3344s5566s7z` + `7z` | 南 | 七対子2 / 25符 / 1600 | 3飜25符 / 800·1600 |
| R18 | 同上 | 東 | 2400 | 1600オール |
| R19 | `444z123p456p789s9s` + `9s` | 南・北=役牌 | 北1 / 1300。**単騎待ちの分解(生40)に決まる(Issue #82)**。符: 副底20・暗刻(北)8・雀頭0・待ち(単騎2)・門前ロン10 | 2飜40符(生32)/ 700·1300 |
| R20 | 同上 | 南・北=抜きドラ | **`yaku: []`・`han` 0・40符・基本点160・700(役なし)** | 門前清自摸和1 / 400·700 |
| R21 | `111z2z555z666z777z` + `2z`(B4-M01) | 南・複合あり | 四暗刻単騎(2)・大三元(1)・字一色(1) / `yakumanPoint` 4 / 128000 | 32000·64000 |
| R22 | 同上(B4-M02) | 南・**複合なし** | 役一覧は同じ3役満 / `yakumanPoint` 2 / 基本点16000 / 64000 | 16000·32000 |
| R23 | 同上 | 東・複合なし | 96000 | 32000オール |
| R24 | `123p456p234s789s1z` + `1z` | 南 | **`yaku: []`・40符(生34)・基本点160・700(役なし)**。符: 副底20・順子0×4・単騎待ち2(雀頭 東 2)・門前ロン10 | 門前清自摸和1・30符(生26)/ 300·500 |
| R25 | 同上 | 東 | `yaku: []`・1000(役なし) | 500オール |
| R26 | R24 + ドラ表示 `4z` | 南 | **`yaku: [dora 2]`・基本点640・2600(役なし)** | 3飜 / 1000·2000 |
| R28 | 13枚 `234p567p34s678s99p` | 南 | 和了牌 `2s`・`5s`・赤`5s` の3種×ロン/ツモ = 6件。ロン最高は赤5s の 2000、ツモ最高は赤5s の 700·1300(計2000) | — |
| R29 | 同上 | 東 | 2s・5s は 1500 / 700オール、赤5s は 2900 / 1300オール | — |

- 第7版で、条件9〜17 が使う牌姿(R02・R03・R05・R07・R09・R09+抜き北3(切り上げ満貫なし/あり)・R10〜R17・R20〜R22・R24・R26・R29。R13 は数え役満なしでも)の期待値を `generateResult` で再実行して確認済み(2026-11-12)。R09+抜き北3 はロン 4飜30符・基本点1920・7700、切り上げ満貫ありで 2000・8000。R13 数え役満なしは 13飜・基本点6000・24000。R02 で1本場だとロン本場込み1700・ツモ 800オール(参考)。
- 第4版で、条件9〜17 が使う牌姿(R01・R02・R03・R05・R07・R09〜R11・R13〜R17・R19〜R22・R24・R26・R29)の期待値を `generateResult` で再実行して確認済み(2026-11-12。上表と一致)。
- R28: `rule.red` が 1 以上のとき、`5s` と赤 `5s` は別の和了牌として `hora[]` に並ぶ。「最高打点」はロン・ツモそれぞれで別々に選ぶ(和了牌が異なってもよい)。
- R22: `yakumanMultiplier` は `multipleYakuman: false` のとき point の最大値(四暗刻単騎の 2)。役一覧(`hora.yaku`)からは他の役満は消えない。
- 一発: `hora.ts` は `ippatsu` を立直系の役を付ける分岐の中でだけ付ける(面子手は立直系の分岐 468〜485行の中の `if (options.ippatsu)` 478〜484行、七対子は 1022〜1028行)。UI も立直なしでは一発を選べない(`situation-rules.ts` 76行)。したがって**一発だけ(または一発と懸賞役だけ)の和了は生じず**、一発が付く和了には必ず立直系の役がある。役なし判定で一発を懸賞役に数えても、現行の core では判定結果は変わらない。
- 符の `waiting` 項目は、待ちの符(`fu`)と、待ちを含むブロック(`block`。単騎なら雀頭、双碰なら刻子、両面等なら順子)の符を持つ。雀頭は単騎のとき `waiting.block` にだけ現れ、`head` 項目は出ない(R24)。面子・雀頭の牌は `TileCountsIndex`(0〜8 萬子、9〜17 筒子、18〜26 索子、27〜33 字牌)で持つ。

### 1.4 役なし(1飜縛り)の解釈と出典(07号)

- 現行の `docs/mahjong-rules.md` には、1飜縛り・懸賞役の記述が**無い**。関連する記述は §1(赤ドラ・槓ドラ・裏ドラはあり)、§2(抜きドラは「1飜(ドラ扱い)」)、§4.1(一発はあり。なしのときは一発を役として数えない)。
- 本 Issue でユーザー(オーナー)が「1飜縛り。懸賞役(ドラ・一発)は縛りに含めない」を確定した(2026-11-12)。懸賞役の範囲は、既存記述と次のように整合させる: ドラ=表ドラ・槓ドラ・裏ドラ(§1。UI は裏ドラ表示牌をドラ表示牌と合わせて core に渡すため、`yaku` では `dora` に入る)、赤ドラ(§1)、抜きドラ(§2「ドラ扱い」)、一発(§4.1)。
- 参考: `issue-12-sanma-north.md` §8、`issue-20-test-naming.md`(抜きドラのみの手を「役なし」と呼ぶ)、livewing `Score.tsx`(役がすべて `dora`・`red-dora` なら点数を出さない)。
- 正本への追記は 2.13 のとおり、本設計書のコミットに含める(統括担当が行う)。

### 1.5 mj-mighty-calc の結果表示の調査結果

- 1枚のカード(`.candidate`)に、上段「ツモ/ロンのバッジ・和了牌・点数(大)」、中段左「N翻 M符+ランク(満貫等)」、中段右「本場込み(`は …`)・合計(`合計 X(+bonus)点`)」、下段に役一覧。(以下は mj-mighty-calc の事実)ツモ・ロンの順に縦に2枚並べる。E2 はこれと異なり、core の `uniqueHoras` の並び(`ronAndTsumo`)に合わせて「ロン→ツモ」とする(2.4・2.5)。役なしの側は「役なし」とだけ出す。
- **符は合計(「M符」)だけで、内訳を出さない(折りたたみも無い)。** 本書の符の内訳(折りたたみのリスト)は mj-mighty-calc に無い追加である(確定事項3 で採用済み)。
- 点数の書式: `700・1,300`(子・親)/`2,000オール`/ロン `12,000`(3桁区切りあり。`toLocaleString()`)。
- 次の段階: `nextTierHint(han, fu, yakuman, kiriage)` が、han を1ずつ増やして限度名(`basePoints` の `rank`)が変わる最初の k を「＋k飜で{rank}」とする。役満・数え役満は null。han+k は 13 まで。E2 はこれを本プロジェクトの限度の定義(`calculateBasePoint`)に合わせて書き直す(2.6.5)。
- `.tier-hint` は `primary-container` 地、`.rank` は error 色の太字、`.pay-detail` は右揃え・折り返しなし、`.side-badge` は primary 地。
- テーマ: `src/ui/theme/tokens.css` に `--md-sys-color-tertiary`・`--md-sys-color-on-tertiary`・`--md-sys-color-tertiary-container`・`--md-sys-color-on-tertiary-container` が定義されている(実物で確認。ライト・ダークとも生成済み)。

### 1.6 UI 部品の実物確認

- `src/ui/md/index.ts` のラッパーは Button・IconButton・Chip・Switch・Radio・Select・Tabs・Menu・Dialog・Divider・FocusRing・Ripple。**開閉(disclosure)のラッパーは無い**。Material Web にも開閉部品は無い(06号4 の「Material Web で表現できない部品」にあたる)。
- アイコン: `src/ui/icons/symbol-paths.ts` に `SYMBOL_EXPAND_MORE` がある(`SymbolIcon` で描ける)。新たなアイコンの追加は不要。
- 牌: `Tile`(`src/ui/tile`)は E1 の `slots.tsx` で既に初回 JS に入っている。`countsIndexToTile` は `src/core/tile` の実行時関数で、`src/ui/result` からは import しない(E1 の規律)。

## 2. 設計

### 2.1 モジュール構成

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/result/hora-summary.ts` | 新規 | 初回 JS に入る純関数: `isNoYaku`・`formatNumber`・`formatPoints`・`pickBestByBy`・`horaGlanceParts`(2.3・2.4) |
| `src/ui/result/hora-summary.test.ts` | 新規 | 上の単体テスト |
| `src/ui/result/slots.tsx` | 改修 | `HoraBody` を遅延チャンクの入口に、`HoraGlance` を打点表示に差し替える |
| `src/ui/result/ResultBody.tsx` | 改修 | `context` を受け取り `HoraBody` に渡す |
| `src/ui/result/hora/HoraDetail.tsx` | 新規(遅延) | 和了本体(default export)。`hora[]` の順に `HoraItem` を平らに並べる |
| `src/ui/result/hora/HoraItem.tsx` | 新規(遅延) | 和了1件の部品。見出し行(バッジ・和了牌・点数)・飜符と限度名・次の段階・支払い・役一覧・符の折りたたみ・基本点 |
| `src/ui/result/hora/next-tier.ts` | 新規(遅延) | 次の段階の純関数(2.6.5)。mj-mighty-calc `core/payment.ts` の `nextTierHint` を出典として明記 |
| `src/ui/result/hora/FuBreakdown.tsx` | 新規(遅延) | 符の内訳(折りたたみ)。2.6.3 |
| `src/ui/result/hora/fu-rows.ts` | 新規(遅延) | `Fu[]` から表示行を作る純関数と、牌の並びの導出(2.6.3) |
| `src/ui/result/hora/labels.ts` | 新規(遅延) | **データだけ**の表(役名・符名・限度名)。2.7 |
| `src/ui/result/hora/format.ts` | 新規(遅延) | 表を引いて文言を作る純関数(`yakuLabel`・`yakuHanText`・`limitName`・`fuRowName`・`nextTierText`・`payDetailLines`)。2.7.3 |
| `src/ui/result/hora/hora.css` | 新規(遅延) | 和了本体のスタイル(遅延チャンクの CSS になる) |
| `src/ui/expressive/Disclosure.tsx`・`disclosure.css` | 新規 | 開閉部品(2.6.3)。`hora/` からだけ使うので遅延チャンクに入る |
| `src/ui/result/hora/*.test.ts(x)`・`src/ui/expressive/Disclosure.test.tsx` | 新規 | 2.12 |
| `src/ui/screen/ResultPanel.tsx` | 改修 | `context` を受け取り `ResultBody` に渡す。遅延チャンクの先読み(2.2) |
| `src/ui/screen/MainScreen.tsx` | 改修 | `ResultPanel` に `{ table, rule }` を渡す |
| `src/ui/screen/main-screen.css` | 改修 | 下余白(2.9) |
| `src/ui/result/ResultGlance.test.tsx`・`src/ui/screen/ResultPanel.test.tsx` | 改修 | E1 の `hora` の仮表示を前提にしたケースを E2 の仕様に置き換える(2.12) |

- `src/core/` は変更しない。
- `src/ui/result/` 配下(`hora/` を含む)から `src/core/` へは `import type` だけとする(E1 の規律を維持)。符の生の合計は `sumOfFu` を import せず、同じ式(`f.fu + (f.type === 'waiting' ? f.block.fu : 0)` の合計)を `fu-rows.ts` に書く。`TileCountsIndex` から牌への変換も `fu-rows.ts` に小さく書く(1.3 の範囲区分。5 は赤にしない)。
- 赤牌の注意表示(初版の `red-excess.ts`・注意行)は作らない(確定事項9)。

### 2.2 遅延読み込み

```tsx
// slots.tsx
const HoraDetail = lazy(() => import('./hora/HoraDetail'));
export const preloadHoraDetail = () => import('./hora/HoraDetail');

export function HoraBody({ hora, context }: HoraBodyProps) {
  return (
    <div data-result-kind="hora" className="result-body result-body--hora">
      <Suspense fallback={null}>
        <HoraDetail hora={hora} context={context} />
      </Suspense>
    </div>
  );
}
```

- `data-result-kind="hora"` は外側の要素に付け、読み込み前でも出す(E1 の受け入れ条件・テストを維持)。
- 先読み: `ResultPanel` のマウント時の `useEffect` で `preloadHoraDetail()` を1回呼ぶ(失敗は握りつぶす。表示時は `lazy` が再試行する)。
- 名前の表・`HoraItem`・`FuBreakdown`・`Disclosure`・`hora.css` は `hora/` 配下からだけ import する。バナー(`HoraGlance`)と `hora-summary.ts` は `hora/` を import しない。

### 2.3 役なし判定(`hora-summary.ts`)

```ts
import type { ScoredHora } from '../../core/result';
/** 懸賞役(1飜縛りに含めない役)。表示用の表ではなく判定の定義 */
export const BONUS_YAKU = ['dora', 'red-dora', 'nuki-dora', 'ippatsu'] as const;
/** 役満がなく、通常役が懸賞役だけ(空を含む)なら true */
export const isNoYaku = (hora: ScoredHora): boolean;
```

- 判定: `hora.score.yakumanPoint === 0` かつ `hora.yaku.every(y => y.type === 'yaku' && BONUS_YAKU.includes(y.name))`。
- `north`(北の役牌)は役として数える。R19 は役あり、R20 は役なし。
- 一発は懸賞役に数える(確定事項5)。現行の core では一発に必ず立直系の役が付くため、一発で結果が変わる牌姿は無い(1.3)。
- 役なしの `HoraItem` は、見出し行に「ロン」「ツモ」のバッジ・和了牌と「役なし」だけを出し、点数・飜符・次の段階・役一覧・符の内訳・支払い・基本点を出さない(mj-mighty-calc と同じ)。

### 2.4 バナー(`HoraGlance`)

```ts
export type GlanceSide =
  | { by: 'ron' | 'tsumo'; kind: 'points'; text: string } // text は formatPoints の値
  | { by: 'ron' | 'tsumo'; kind: 'no-yaku' }
  | { by: 'ron' | 'tsumo'; kind: 'none' };               // その by の候補がない(天和等でロンがない場合)
/** ロン → ツモの順に2要素。各 by について isNoYaku でない候補のうち payment.total が最大の1件 */
export const horaGlanceParts = (hora: ScoredHora[]): GlanceSide[];
/** 3桁区切り。ロケールに依存しないよう手書き(String(n) を正規表現で3桁ごとに "," で区切る) */
export const formatNumber = (n: number): string;
/** ツモの支払いの区切り(UI 監修で変えるときはここだけ) */
export const TSUMO_SEPARATOR = '・';
/** 打点。detail の各値に withHonba を使うかを選べる。ロン: "2,600"。子のツモ: "子・親"("1,000・2,000")。親のツモ: "1,000オール" */
export const formatPoints = (payment: Payment, withHonba = false): string;
```

- 書式(確定事項15・19。UI 監修で調整する前提で、文言は `formatPoints` とバナー部品の中だけで組む): `ロン 1,500 / ツモ 700・1,300`。数字は `tabular-nums`。本場・供託は入れない(`withHonba = false`)。
- 3桁区切りは `toLocaleString` を使わず手書きにする(実行環境のロケールで記号が変わるのを避けるため)。テストで `1500`→`1,500`、`128000`→`128,000`、`700`→`700` を確かめる。
- 片方が役なし: `ロン 役なし / ツモ 300・500`(R24)。両方とも役なし(候補なし含む)のときは `役なし` だけ。`kind: 'none'` の側は出さない。
- 同点のときは `hora[]` で先に現れたもの。和了牌の牌画像・「和了」の文字・限度名は出さない。
- ルート要素 `data-result-kind="hora"`、各側に `data-glance-by="ron|tsumo"`。

### 2.5 本体(`HoraDetail`)の構成

```ts
export interface ResultContext {
  table: Table; // 雀頭の符名(場風・自風)に使う
  rule: Pick<Rule, 'roundedMangan' | 'accumlatedYakuman'>; // 次の段階(2.6.5)に使う
}
export interface HoraDetailProps { hora: ScoredHora[]; context?: ResultContext }
```

- `hora[]` を並び順のまま、`HoraItem` を縦に平らに並べる(確定事項17)。`uniqueHoras` の並びは和了牌ごとにロン → ツモ(1.3 の R28・R29)。和了牌ごとのまとめ・見出しの牌は作らない。2枚を横に並べない(幅 375 で収まらないため)。
- `ResultBody`・`ResultPanel` は `context?: ResultContext` を受け取り、`HoraBody` にだけ渡す。`MainScreen` は `useAppState()` の `table` と `rule` を渡す。`context` が無いとき(テスト)は、雀頭の符名を 2.7.2 の「風牌雀頭」にする。

### 2.6 `HoraItem({ hora, context })`

E1 の引き継ぎの `HoraItem({ hora: ScoredHora })` に、`context?: ResultContext`(2.5。`table` は雀頭の符名、`rule`(`roundedMangan`・`accumlatedYakuman`)は次の段階(2.6.5)に使う)を加える。`HoraDetail` は受け取った `context` をそのまま各 `HoraItem` に渡す。ルート `<article class="hora-item" data-hora-by="ron|tsumo" data-no-yaku?>`。mj-mighty-calc の `CandidateCard` の構成(`.candidate-head`・`.candidate-sub`(`.sub-main`・`.pay-detail`)・`.tier-hint`・`.yaku-list`)に準拠し、色を次のトークンで置き換える(確定事項16)。色・形・文字はすべてトークン(06号)。

| 部分 | 指定 |
| --- | --- |
| カード | 背景 `--md-sys-color-surface-container-low`、角丸 `--md-sys-shape-corner-large`、内側余白 0.75rem 1rem、カード間 0.5rem。強調枠・影なし |
| ツモ/ロンのバッジ | ロン: 背景 `--md-sys-color-primary`・文字 `--md-sys-color-on-primary`。ツモ: 背景 `--md-sys-color-tertiary`・文字 `--md-sys-color-on-tertiary`(提案。確定事項21)。`hora.css` の `.hora-item[data-hora-by="ron"]`・`[data-hora-by="tsumo"]` で `--by-badge-bg`・`--by-badge-fg` を定義する1か所だけで決め、入れ替えはこの2行を入れ替える。角丸 `--md-sys-shape-corner-small`、label-medium |
| 和了牌 | バッジの右に `Tile` 1枚(`--tile-width: 1.75rem`)。赤5は赤のまま |
| 点数(大) | 見出し行の右端。headline-small、`tabular-nums`、`--md-sys-color-on-surface` |
| 飜符・基本点・支払い | body-medium、`--md-sys-color-on-surface-variant`、`tabular-nums`。支払いは右揃え・折り返しなし |
| 限度名 | 飜符の右に文字だけ(バッジにしない)。文字 `--md-sys-color-error`、太字(title-small)。役満は飜符の位置に限度名だけ |
| 次の段階のバッジ | 背景 `--md-sys-color-primary-container`・文字 `--md-sys-color-on-primary-container`、label-medium、角丸 `--md-sys-shape-corner-small`。飜符の行の下 |
| 区切り | 役一覧の上に `Divider`(`src/ui/md`) |

構成(上から):

```
┌ [ツモ][牌]                      3,000・6,000 ┐  見出し行(2.6.1)
│ 7飜 30符 跳満                は 3,100・6,100 │  左: 飜符+限度名 / 右: 支払い(2.6.4)
│ [＋1飜で倍満]          合計 9,000(+1,200)点 │  左: 次の段階(2.6.5)。ロンの右端は「は 7,900」「(+200)点」の形
│──────────────────────────│
│ 立直 ………………………………………… 1飜 │  役一覧(2.6.2)
│ 符 30 ▼                                    │  符の折りたたみ(2.6.3)
└ 基本点 3000                                ┘  基本点(2.6.4。位置は UI 監修で決める)
```

#### 2.6.1 見出し行

- 左: バッジ(「ロン」/「ツモ」)と和了牌1枚。右: 点数(大)= `formatPoints(payment)`(例 ロン `1,500`、子ツモ `700・1,300`、親ツモ `700オール`)。
- 2行目の左(`.sub-main` 相当): 通常役は `N飜 M符`(`score.fu` が null なら符を省く)と限度名(赤字)。役満は限度名だけ。限度名は `limitName(score)`(2.7.3)。満貫未満は出さない。その下に次の段階のバッジ(2.6.5)。
- 2行目の右(`.pay-detail` 相当): 支払いの内訳(2.6.4)。行が無ければ右側は空。

#### 2.6.2 役一覧

- `hora.yaku` を core の順のまま全件、`<ul>` の1行1役で、役名を左、飜を右に揃える。役満の行は point から「役満」「二倍役満」(2.7.3 と同じ語)。
- 役満の複合なし(R22)でも全役満を出し、不採用の役満を淡くしない・印を付けない。点数・限度名は `score`(採用分)だけで決まる(R22: 限度名「二倍役満」、ロン 64000)。

#### 2.6.3 符の内訳(折りたたみ)

- 出す条件: `score.yakumanPoint === 0` かつ `hora.type` が `mentsu` または `chitoitsu`。国士無双・十三不搭・役満・役なしでは出さない。
- **見出し(閉じていても見える)**: `Disclosure` の開閉ボタンに、符の合計と切り上げを出す。`raw % 10 !== 0` なら `符 34 → 40`、割り切れるなら `符 30`、七対子は `符 25`。右端に `SYMBOL_EXPAND_MORE`(開くと180度回転。`prefers-reduced-motion` では回転の遷移なし)。既定は閉じる。
- **開いた中身**: `<ul>` の1行1項目。各行は「牌の並び・名称・符数」の3列(牌は左、符数は右寄せ・`tabular-nums`)。
  - 行の作り方(`fuRows(fu: Fu[], table?: Table): FuRow[]`。`hora.fu` の順):

    | `Fu` | 行 | 牌の並び |
    | --- | --- | --- |
    | `futei` | 副底 20 | なし |
    | `shuntsu` | 順子 0 | 3枚(`tile`, +1, +2) |
    | `kotsu` | 2.7.2 の刻子名 | 明刻・暗刻 3枚、明槓 4枚、暗槓 4枚(両端を裏向き) |
    | `head` | 2.7.2 の雀頭名 | 2枚 |
    | `waiting` | 2行に分ける: (1) `block` を上の規則で1行、(2) 待ちの名(2.7.2)と `waiting.fu` | (1) は `block` の牌、(2) はなし |
    | `menzen-ron`・`tsumo`・`pinfu-tsumo` | 名称と符数 | なし |
    | 七対子 | 七対子 25 | なし |

  - **0符の項目も出す**(面子の構成が分かるように。例 R24 ロン: 副底20・門前ロン10・順子0×4・雀頭(東)2・単騎待ち2)。符数の表示は `{n}符`。**並びは、副底の次にツモ符・門前加符(`menzen-ron`・`tsumo`・`pinfu-tsumo`)を置き、そのほかは core の並び(UI 監修で変更)**。
  - 牌は `Tile` を `--tile-width: 1.25rem` で並べる。暗槓の両端の裏向きは、`Tile` の `tile` に `TileOrBack` の `{ type: 'back' }` を渡す(`src/ui/tile/Tile.tsx`・`tile-image.ts` に既にある)。
- **開閉部品** `src/ui/expressive/Disclosure.tsx`:

  ```tsx
  export interface DisclosureProps {
    summary: React.ReactNode;     // 開閉ボタンの中身
    children: React.ReactNode;    // 開いたときの中身
    defaultOpen?: boolean;        // 既定 false
  }
  ```

  - `<button type="button" aria-expanded aria-controls>` と、`hidden` を切り替える中身の領域。開閉状態は部品内の `useState`(カードごとの局所状態。保存しない。入力が変わって `HoraItem` が作り直されれば閉じに戻ってよい)。
  - 06号4 に従い自作する(`src/ui/md` に開閉のラッパーが無く、Material Web にも無いため。1.6)。押下の波紋は既存の `Ripple`、フォーカスは `FocusRing` を使う。色・形・モーションはトークンだけ(ボタンは文字 `--md-sys-color-on-surface-variant`、角丸 `--md-sys-shape-corner-small`、回転は `--md-sys-motion-spring-effects-fast-*`)。
  - `<details>` は使わない(開閉の見た目と `aria-expanded` を部品側で揃えるため)。
- mj-mighty-calc との差: mj-mighty-calc は符の合計だけを出す。本書は合計と切り上げを見出しに出し、内訳を折りたたみで追加する(1.5)。

#### 2.6.4 点数と支払いの内訳

`payDetailLines(payment): string[]`(`format.ts`)が右端の行を返す(確定事項20)。
- ツモ: (1) `payment.honba > 0` のときだけ `は {formatPoints(payment, true)}`(R07 `は 600・900`、R08 親 `は 900オール`)。(2) 常に `合計 {total}点`、`bonus > 0` なら `合計 {total}(+{bonus})点`(R07 `合計 1,100(+1,400)点`、R02 `合計 1,400点`)。
- ロン: (1) `payment.honba > 0` のときだけ `は {formatPoints(payment, true)}`(= `detail.discarder.withHonba`。放銃者の本場込みの支払い。供託は含まない)。(2) `payment.bonus > 0` のときだけ `(+{bonus})点`(本場+供託。和了者の追加の受け取り)。合計の行は出さない。どちらも無ければ右端は空。
  - 実行値(R01 の手・子・南家): 本場2・供託0 → `は 1,400`・`(+400)点`。本場0・供託1 → `(+1,000)点` だけ。本場2・供託1(R07)→ `は 1,400`・`(+1,400)点`。本場2・供託0・1本場 400点(`honbaPoint: 400`)→ `は 1,800`・`(+800)点`(ツモは `は 800・1,100`・`合計 1,100(+800)点`)。
- 行の文言(「は 」「(+…)点」「合計 …点」)は `format.ts` の `payDetailLines` の中だけで組む(UI 監修で変えるときはここだけ)。
- 基本点の行: `基本点 {basePoint}`(確定事項14)。カードの最後(符の折りたたみの下)に `BasePointLine` という小さな部品として置く。折りたたみの中に入れるか、計算式(`符 × 2^(飜+2)` 等)を加えるかは UI 監修で決める(4章)。部品を分けておけば位置の移動は1行で済む。
- ツモ損の方式名は出さない(06号2)。
- これらの文言は `format.ts` の純関数で組む(UI 監修で直しやすくするため)。

#### 2.6.5 次の段階のバッジ(`next-tier.ts`)

出典: mj-mighty-calc `src/core/payment.ts` の `nextTierHint`(自作部分。1.5)。限度の定義だけ本プロジェクトの `calculateBasePoint`(`src/core/score.ts`)に合わせる。core は import しない(型のみの規律)ので、同じ式を `next-tier.ts` に小さく書く。

```ts
export type LimitKey = 'mangan' | 'haneman' | 'baiman' | 'sanbaiman' | 'kazoe-yakuman'; // labels.ts の LIMIT_LABELS のキー(実装済みの labels.ts と同じ)
/** calculateBasePoint と同じしきい値で限度を返す(満貫未満は null) */
export const limitOf = (fu: number, han: number, rule: Pick<Rule, 'roundedMangan' | 'accumlatedYakuman'>): LimitKey | null;
/** 次の段階。役満・数え役満・それ以上がない場合は null */
export const nextTier = (score: HoraScore, rule: Pick<Rule, 'roundedMangan' | 'accumlatedYakuman'>): { plusHan: number; limit: LimitKey } | null;
```

- `limitOf`: `accumlatedYakuman && han >= 13` → kazoe-yakuman、`han >= 11` → sanbaiman、`>= 8` → baiman、`>= 6` → haneman、`han >= 5` または `fu × 2^(han+2) >= (roundedMangan ? 1920 : 2000)` → mangan、それ以外 null。fu は `score.fu`(切り上げ済み。七対子 25)。
- `nextTier`: `score.yakumanPoint > 0` なら null。現在の限度 `cur = limitOf(fu, han)`。`cur === 'kazoe-yakuman'` なら null。k = 1, 2, … で `han + k <= 13` の間、`limitOf(fu, han + k)` が null でなく `cur` と違う最初の k を返す。見つからなければ null(数え役満なしの三倍満は 13飜でも三倍満なので null になる)。
- 文言: `nextTierText`(`format.ts`)が `＋{plusHan}飜で{LIMIT_LABELS[limit]}` を作る(全角「＋」。UI 監修で変えるときはここだけ)。
- ロン・ツモの両方のカードに出す。役なしのカードには出さない。
- `HoraItem` は `rule`(`roundedMangan`・`accumlatedYakuman`)を要するため、`ResultContext` に `rule` を加える(2.5)。`context` が無いとき(テスト)は `DEFAULT_RULE` 相当の値(切り上げ満貫なし・数え役満あり)を `next-tier.ts` 内の定数で持つ。
- 1.3 の実行値による例(子・南家):

  | 牌姿 | 現在 | 次の段階 |
  | --- | --- | --- |
  | R01 ロン 1飜30符(基本点240) | — | ＋4飜で満貫 |
  | R01 ツモ 2飜20符 | — | ＋3飜で満貫 |
  | R09+抜き北3 ロン 4飜30符(基本点1920。切り上げ満貫なし) | — | ＋1飜で満貫 |
  | 同 切り上げ満貫あり(基本点2000) | 満貫 | ＋2飜で跳満 |
  | R10 ロン 5飜 | 満貫 | ＋1飜で跳満 |
  | R10 ツモ 6飜 | 跳満 | ＋2飜で倍満 |
  | R11 ロン 9飜 | 倍満 | ＋2飜で三倍満 |
  | R12 ロン 11飜30符 | 三倍満 | ＋2飜で数え役満 |
  | R12 ツモ 12飜20符 | 三倍満 | ＋1飜で数え役満 |
  | R12 数え役満なし(ロン 11飜・ツモ 12飜。値は同じ) | 三倍満 | 出さない(ロン・ツモとも) |
  | R13 ロン 13飜 | 数え役満 | 出さない |
  | R13 数え役満なし(13飜・基本点6000) | 三倍満 | 出さない |

  R13 は数え役満の有無のどちらでも null になり、`rule` の渡し忘れを検出できない。`rule` の参照は R12 のあり/なしの対照で確かめる(05号のミューテーション確認: `accumlatedYakuman` を無視する実装ではなしの側が落ちる)。R12 の値は `generateResult` で確認済み(数え役満あり・なしとも ロン 11飜30符・基本点6000・24,000、ツモ 12飜20符・6000・6,000・12,000)。
  | R14 大三元 | 役満 | 出さない |

### 2.7 名前の表(`hora/labels.ts`。ユーザーが直接編集する)

#### 2.7.0 ファイルの形

```ts
// 役名・符名・限度名の表示名。ユーザーが監修のために直接編集するファイル。
// ここには表(データ)だけを置き、文言の組み立ては format.ts に書く。
// 各行の末尾のコメントは出典(R=docs/mahjong-rules.md、I12/I14=設計書、L=livewing ja.yml、U=ユーザー確定、案=出典なし)。
import type { NormalYaku, Yakuman } from '../../../core/yaku';

export const YAKU_LABELS: Record<NormalYaku['name'], string> = {
  riichi: '立直', // L
  // …43件
};
export const YAKUMAN_LABELS: Record<Yakuman['name'], string> = { /* 29件 */ };
export const FU_LABELS = { futei: '副底', /* … */ } as const satisfies Record<FuLabelKey, string>;
export const LIMIT_LABELS = { mangan: '満貫', haneman: '跳満', baiman: '倍満', sanbaiman: '三倍満', 'kazoe-yakuman': '数え役満' } as const satisfies Record<LimitKey, string>;
export const YAKUMAN_MULTIPLE_LABELS: Record<number, string> = { 1: '役満', 2: '二倍役満', /* … 10 */ };
```

- 数え役満のキーは `'kazoe-yakuman'`(実装済みの `labels.ts` 40・154行、`format.ts` 46行に合わせた。第8版。実装の変更は不要)。
- `labels.ts` には関数・条件分岐・計算を書かない(`import type` と定数だけ)。`FuLabelKey`・`LimitKey` の型は `labels.ts` の先頭に文字列リテラルの合併型で置き、`next-tier.ts`・`format.ts` はそれを `import type` する。限度名(満貫〜数え役満)は限度名の表示と次の段階のバッジで同じ表を引く。
- `Record<…['name'], string>` と `satisfies` により、役・符・限度の項目に過不足があると `npm run typecheck` が失敗する。

#### 2.7.1 役名(`yakuNames` 43種・`yakumanNames` 29種)

出典の略号は 2.7.0 のとおり。R に表記があるものは R に合わせた(確定事項6)。

| name | 表示 | 出典 | name | 表示 | 出典 |
| --- | --- | --- | --- | --- | --- |
| riichi | 立直 | L | double-riichi | ダブル立直 | R・L |
| ippatsu | 一発 | R・L | honitsu | 混一色 | L |
| tsumo | 門前清自摸和 | L | junchan | 純全帯么九 | L |
| tanyao | 断么九 | L | ryampeko | 二盃口 | L |
| pinfu | 平和 | L | chinitsu | 清一色 | L |
| iipeko | 一盃口 | L | dora | ドラ | L |
| field-wind | 場風牌 | L | red-dora | 赤ドラ | R・L |
| seat-wind | 自風牌 | L | nuki-dora | 抜きドラ | U・R・I12 |
| white | 白 | L | open-riichi | オープン立直 | I14 |
| green | 發 | L | open-double-riichi | オープンダブル立直 | I14 |
| red | 中 | L | tsubame-gaeshi | 燕返し | R・I14 |
| north | 北 | U(R の呼び名は「役牌：北」) | kan-furi | 槓振り | R・I14 |
| rinshan | 嶺上開花 | L | toiputao | 推不倒 | R・I14 |
| chankan | 槍槓 | R(L は「搶槓」) | shiiaru-raotai | 十二落抬 | R・I14 |
| haitei | 海底撈月 | R(L は「海底摸月」) | uumensai | 五門斉 | R・I14 |
| hotei | 河底撈魚 | R・L | sanrenko | 三連刻 | R・I14 |
| sanshoku-dojun | 三色同順 | R・L | isshoku-sanjun | 一色三順 | R・I14 |
| sanshoku-doko | 三色同刻 | L | | | |
| ittsu | 一気通貫 | R・L | | | |
| chanta | 混全帯么九 | L | | | |
| chitoitsu | 七対子 | L | | | |
| toitoi | 対々和 | L | | | |
| sananko | 三暗刻 | L | | | |
| honroto | 混老頭 | L | | | |
| sankantsu | 三槓子 | L | | | |
| shosangen | 小三元 | L | | | |

| name | 表示 | 出典 | name | 表示 | 出典 |
| --- | --- | --- | --- | --- | --- |
| kokushi | 国士無双 | L | renho | 人和 | R・I14 |
| kokushi-13 | 国士無双十三面待ち | R・L | surenko | 四連刻 | R・I14 |
| suanko | 四暗刻 | L | isshoku-yonjun | 一色四順 | R・I14 |
| suanko-tanki | 四暗刻単騎 | R(L は「四暗刻単騎待ち」) | beni-kujaku | 紅孔雀 | R・I14 |
| daisangen | 大三元 | L | koitten | 紅一点 | R・I14 |
| tsuiso | 字一色 | R・L | kokuiso | 黒一色 | R・I14 |
| shosushi | 小四喜 | L | daisharin | 大車輪 | R・I14 |
| daisushi | 大四喜 | R・L | daichikurin | 大竹林 | R・I14 |
| ryuiso | 緑一色 | R・L | ishino-ue | 石の上にも三年 | R・I14 |
| chinroto | 清老頭 | L | shisanputa | 十三不搭 | R・I14 |
| sukantsu | 四槓子 | L | kinmonkyo | 金門橋 | R・I14 |
| churen | 九蓮宝燈 | L | tohoku-shinkansen | 東北新幹線 | R・I14 |
| pure-churen | 純正九蓮宝燈 | R・L | junsei-ryuiso | 純正緑一色 | R・I14 |
| tenho | 天和 | R・L | daichisei | 大七星 | R・I14 |
| chiho | 地和 | R・L | | | |

- 飜の表示: 通常役 `{han}飜`(ドラ類も同じ。R09「抜きドラ 2飜」)。役満の行は point から 2.7.3 の語。

#### 2.7.2 符名

| キー | 表示 | 出典 |
| --- | --- | --- |
| futei | 副底 | L |
| shuntsu | 順子 | L |
| menzen-ron | 門前ロン | L |
| tsumo | ツモ | L |
| pinfu-tsumo | 平和ツモ | L |
| chitoitsu | 七対子 | L |
| {yaochu,chunchan}-{minko,anko,minkan,ankan} | 么九牌明刻・么九牌暗刻・么九牌明槓・么九牌暗槓・中張牌明刻・中張牌暗刻・中張牌明槓・中張牌暗槓(么九=字牌・1・9) | L |
| head / double-wind-head / round-wind-head / seat-wind-head / dragon-head / north-head / wind-head | 雀頭・連風牌雀頭・場風牌雀頭・自風牌雀頭・三元牌雀頭・北雀頭・風牌雀頭 | L(北雀頭・風牌雀頭は案) |
| ryammen / kanchan / penchan / shampon / tanki | 両面待ち・嵌張待ち・辺張待ち・双碰待ち・単騎待ち | L |

- 雀頭のキーの選び方(`format.ts`): 三元牌 → dragon-head、北で符が付く(`north: 'yakuhai'`)→ north-head、場風かつ自風 → double-wind-head、場風 → round-wind-head、自風 → seat-wind-head、それ以外 → head。`table` が無く風牌で符が付くとき → wind-head。

#### 2.7.3 限度名と書式の関数(`format.ts`)

- `limitName(score)`: `yakumanPoint > 0` なら `YAKUMAN_MULTIPLE_LABELS[yakumanPoint]`(1 役満、2 二倍役満、3 三倍役満、4 四倍役満 … 10 十倍役満。11 以上は `{n}倍役満`)。`yakumanPoint === 0` なら `basePoint` 2000 満貫 / 3000 跳満 / 4000 倍満 / 6000 三倍満 / 8000 数え役満。2000 未満は `null`(L の `LimitBadge` と同じしきい値)。切り上げ満貫の 1920 も `basePoint` が 2000 になるので満貫。
- 「ダブル役満」「トリプル役満」の語は使わない(確定事項15)。役一覧の役満の行・限度名のバッジとも同じ表を引く。
- `yakuHanText(yaku)`: 通常役 `{han}飜`、役満 `YAKUMAN_MULTIPLE_LABELS[point]`。

#### 2.7.4 監修の手引き(設計書の記述。製造担当は `labels.ts` 先頭のコメントにも要約を書く)

1. 表示名を変えるときは `src/ui/result/hora/labels.ts` の右辺の文字列だけを直す。左辺(キー)と行末の出典コメントは消さない(出典を変えたらコメントも直す)。
2. 編集後に `npm run typecheck` と `npm test` を実行し、エラーが無いことを確かめる。キーの消し忘れ・打ち間違いは `typecheck` で、空の表示名は `names.test.ts` で分かる。
3. 役名を正本(`docs/mahjong-rules.md`)と違う表記にする場合は、統括担当に伝えて正本も揃える(07号3)。
4. 画面で確かめるときは、受け入れ条件 9〜17 の牌姿を使う。

### 2.8 (削除)

初版の「赤牌の注意」は、確定事項9 により削除した。

### 2.9 E1 持ち越し (a): 下余白

- `main-screen.css` の `.main-screen__bottom-spacer` の `height` を `calc(var(--sheet-height, 0px) + var(--result-banner-height, 0px))` にする。`--result-banner-height` は E1 の `ResultBanner` がすでに `:root` に書いている(gap 込み、非表示時 `0px`)。
- バナーの表示/非表示で余白が変わり、スクロール位置の補正で表示が切り替わり続けないことを受け入れ条件 18 で確かめる。

### 2.10 初回 JS(09号)

- 基準値: **124,850 B**(#62(PR #81)マージ後の main 9910db3。第6版で更新。当初は起点 febdbe7 の 124,831 B)。2026-11-12 に `npm run build` し、`dist/index.html` の `<script type="module" src>` が指す `assets/index-BcA3TqtJ.js` を `gzip -9 -c | wc -c` で測った(modulepreload なし。`registerSW.js` は対象外)。
- 参考(遅延チャンク): `SettingsScreen-*.js` 15,267 B、`compute-*.js` 9,638 B。
- 初回 JS の増分の積算: `lazy`/`Suspense` と先読み 約0.15 kB、`hora-summary.ts`(3桁区切りを含む)約0.45 kB、`context` の受け渡し 約0.05 kB、E1 の `HoraBody`/`HoraGlance` 仮表示の削除 約 −0.1 kB。計 **約 +0.55 kB**。`Tile`・`SymbolIcon`・`Ripple`・`FocusRing`・`Divider` は既に初回 JS にあり、遅延チャンクから参照しても初回 JS は増えない(製造でビルド後に確かめる)。
- 目標値: **約 125,400 B**(基準値 124,850 B + 積算した増分 約 550 B)。超過は不合格にしない。
- 遅延チャンク(`HoraDetail-*.js`)の見込み: 名前の表(72役+符名+限度名)約1.2 kB、`HoraDetail`・`HoraItem` 約1.6 kB、`FuBreakdown`・`fu-rows`・`Disclosure` 約1.2 kB、`format.ts` 約0.4 kB、`next-tier.ts` 約0.3 kB、カード構成の変更(和了牌・右端の支払い)約0.2 kB、まとめの廃止 約 −0.2 kB。計 **約 4.8 kB**(gzip -9)。CSS は別ファイル。

### 2.11 E1 持ち越し (b): 要約カードの表示遅れの調査タスク(修正しない)

製造担当が実施し、最終報告に書く。コードは変えない(計測用のコードは console で注入し、ファイルに残さない)。

1. **比較対象**: 本ブランチの起点 febdbe7(E1 後)と、E1 前の main 0aa542d。0aa542d は別の worktree か一時的な checkout で動かし、作業後に本ブランチへ戻す。dev サーバーの起動・停止は 01号に従う(自分が起動したものだけ止める)。
2. **再現手順**: Browser pane 375×812。手牌に R01 の14枚を入れ、シートを閉じる。ページ先頭からゆっくり(`window.scrollBy(0, 40)` を 100ms 間隔)と速く(`window.scrollTo(0, 600)` 1回)スクロールし、状況・ドラ・手牌の各カードが画面外に出たとき要約カード(`.summary-card`)が現れるまでを見る。逆方向も行う。
3. **計測方法**: console で、各カードの `getBoundingClientRect()` と `.summary-card` の `getComputedStyle().opacity`・クラス/属性の変化を `requestAnimationFrame` ごとに `performance.now()` 付きで記録する。「カードの見えている割合が 0.1 を下回った時刻」から「要約カードの opacity が 1 になった時刻」までを遅れとする。各条件3回。
4. **報告項目**: (1) 再現したか、(2) 両コミットの遅れ(ms、3回分)、(3) `--md-sys-motion-spring-effects-fast-duration` の実値、`useInView` の `rootMargin`・`minRatio`、(4) 原因の見立て(判定・遷移時間・再描画のどれか)、(5) E1 起因か、E1 前からあるか。修正案は書いてよいが実装しない。

### 2.12 テスト

方針は E1 と同じ(jsdom・Testing Library を追加しない。表示は `renderToStaticMarkup`、判定は純関数)。テストの入力は `generateResult` で作ってよい(UI の書式のテストであり、点数の正しさは core の golden テストが担う。期待値は 1.3 の実行結果)。テスト名は `E2-<番号>: …`。

- `hora-summary.test.ts`: `isNoYaku` が R20・R24・R26 で true、R19・R01・R22 で false。`yaku` が `dora`・`red-dora`・`nuki-dora`・`ippatsu` の各1種だけ(手書きの `ScoredHora`)でも true、`ippatsu`+`riichi` では false。`formatNumber` が `700`→`700`・`1500`→`1,500`・`128000`→`128,000`(`toLocaleString` を使わない)。`formatPoints` がロン `1,000`、子ツモ `400・700`、親ツモ `700オール`、`withHonba` で R07 ツモ `600・900`。`horaGlanceParts` が R28 でロン `2,000`・ツモ `700・1,300`、R24 でロン役なし・ツモ `300・500`。
- `names.test.ts`: `YAKU_LABELS`・`YAKUMAN_LABELS` のキーが `yakuNames`・`yakumanNames` と同じ集合で、値がすべて空でない。`nuki-dora` = 抜きドラ、`north` = 北、`chankan` = 槍槓、`haitei` = 海底撈月、`suanko-tanki` = 四暗刻単騎。`labels.ts` のソースに `function`・`=>`・`if`・`?` の各トークンが無い(データだけであることの静的検査)。
- `format.test.ts`: `limitName` が basePoint 1920 未満で null、2000・3000・4000・6000・8000(役満0)で満貫〜数え役満、yakumanPoint 1・2・3・4・11 で 役満・二倍役満・三倍役満・四倍役満・11倍役満。`ダブル`・`トリプル` を返さない。
- `next-tier.test.ts`: 2.6.5 の表の13行をすべて。とくに R12 の数え役満あり(ロン「＋2飜」・ツモ「＋1飜」で数え役満)となし(ロン・ツモとも null)の対照を必ず含める(入力は `generateResult` の出力。数え役満なし・切り上げ満貫ありはルールを変えて)。`format.test.ts` に `nextTierText` が `＋1飜で跳満` を返すこと、`payDetailLines` が R07 ツモ `['は 600・900', '合計 1,100(+1,400)点']`、R07 ロン `['は 1,400', '(+1,400)点']`、本場2・供託0 のロン `['は 1,400', '(+400)点']`、本場0・供託1 のロン `['(+1,000)点']`、`honbaPoint: 400`・本場2 のロン `['は 1,800', '(+800)点']`、R02 ツモ `['合計 1,400点']`、R02 ロン `[]` を返すことを加える(入力は `generateResult` の出力)。
- `fu-rows.test.ts`: R24 ロンで行が順に「副底 20」「門前ロン 10」「順子 0」×4(牌3枚ずつ)「風牌雀頭 2」相当(`table` に場風東を渡せば「場風牌雀頭 2」、牌2枚)「単騎待ち 2」。R19 ロンで「么九牌暗刻 8」(牌3枚)を含み、合計の生の値が 40。暗槓の行が牌4枚。
- `Disclosure.test.tsx`: 既定で `aria-expanded="false"` かつ中身の領域に `hidden`、`defaultOpen` で `aria-expanded="true"`。`aria-controls` が中身の `id` を指す。
- `HoraDetail.test.tsx`(`HoraDetail` を直接 import): R28 で `article.hora-item` が6件、`data-hora-by` が ron・tsumo の交互で、各カードに牌画像が1枚ずつ(和了牌のまとめの見出しが無い)。R01 ロンで「平和」「1飜」「30符」「＋4飜で満貫」「基本点 240」と開閉ボタンの「符 30」。R24 ロンで「役なし」が出て `700` と「符」が出ない。R24+立直(`riichi:'riichi'`。単騎の1通りで生34・40符・1300、n=7項目)で「符 34 → 40」。R17 で「符 25」。R16 で開閉ボタンが無い。R22 で3役満がすべて出て「二倍役満」と `64,000`、「ダブル」の文字が無い。R07 でツモに「は 600・900」「合計 1,100(+1,400)点」、ロンに「は 1,400」「(+1,400)点」があり「合計」が無い。R13 と R14 で「＋」の文字が無い。
- **第7版の書式変更に伴う既存テストの直し(製造範囲)**: 実物を洗い出した結果、3桁区切り・区切り「・」・ロンの右端の変更より前の期待値が次に残っている。すべて第7版の書式に直す。
  - `src/ui/result/ResultGlance.test.tsx` 77行(テスト名「ロン 1500」)・130行 `toContain('1500')` → `1,500`。139行(名「300·500」)・194行 `toContain('300·500')` → `300・500`。
  - `src/ui/result/hora-summary.test.ts` 298行 `'1000'` → `'1,000'`、313行 `'400·700'` → `'400・700'`、330行(テスト名)、369行 `'2000'` → `'2,000'`、370行 `'700·1300'` → `'700・1,300'`、406行 `'300·500'` → `'300・500'`。
  - `src/ui/result/hora/format.test.ts` 93行 `'1400'` → `'1,400'`、94行 `'は 1400'` → `'は 1,400'`、95行 ロンの `'合計 1000(+1400)点'` は第7版でロンに合計の行が無くなったため `'(+1,400)点'`(`payDetailLines` の期待値)に置き換える、111・112行 `'600·900'` → `'600・900'`、113行 `'合計 1100(+1400)点'` → `'合計 1,100(+1,400)点'`。
  - `src/ui/result/hora/HoraDetail.test.tsx` 235行(テスト名)・284行 `toContain('64000')` → `64,000`、289行(テスト名)・333行 `'は 1400'` → `'は 1,400'`、334行 ロンの `'合計 1000(+1400)点'` → `'(+1,400)点'` と、ロンに「合計」が無いことの確認。
  - テスト名に古い書式が入っているもの(上記の 77・139・330・235・289行)は名前も直す。直したあと `grep -nE "'[^']*([0-9]{4}|·)[^']*'" src/ui/result/*.test.ts* src/ui/result/hora/*.test.ts*` で、牌の指定以外に4桁以上の区切りなしの数字と「·」が残っていないことを確かめる。
- 既存テストの改訂: `ResultGlance.test.tsx` の `E1-6: hora のとき「和了」と牌…`・`…ツモ・ロンの語は出さない` の2件は E1 の仮表示の仕様のため、E2 のバナー仕様(2.4)のテストに置き換える。`ResultPanel.test.tsx` の `E1-7: ok で hora のとき…`(96〜97行)の `expect(html).toContain('和了')` は、E2 で仮見出し「和了」を削除し `<Suspense fallback={null}>` で描くため失敗する。この行を外し、`data-result-kind="hora"` と `data-state="ok"` の確認だけを残す。同テストの `hora` の入力は `score` を持たない手書きの値なので、`generateResult` の出力に替える(`HoraGlance` は `ResultPanel` では描かれないが、将来の参照に備える)。実物を確認した範囲では、E1 の仮表示に依存するアサーションはこの1行と `ResultGlance.test.tsx` の上記2件だけ(`just-hora`・`shanten` の `E1-7` は E2 で変わらない)。改訂の理由をコミットメッセージに書く。

### 2.13 ルールの正本への追記(1飜縛り)

- 置き場: `docs/mahjong-rules.md` §4 の冒頭(「## 4. 役」の直後、「### 4.1 三麻での成立」の前)に「### 4.0 和了の条件」を新設する。§4.1 は三麻での成立、§4.2 はローカル役で、どちらにも属さないため。
- 追記文案:

  ```markdown
  ### 4.0 和了の条件

  - 【確定】1飜縛り。役満がなく、懸賞役だけでは和了できない(役なし)。懸賞役は、ドラ(表ドラ・槓ドラ・裏ドラ)・赤ドラ・抜きドラ(§1・§2)と一発(§4.1)を指す。北の役牌(§2 の共通役牌)は懸賞役ではない(ユーザー(オーナー)確定 2026-11-12、Issue #76)
  - 参考: 計算コアは役なしの和了も点数付きで返す。役なしの判定と表示は UI で行う(Issue #12 §8、Issue #20、livewing の `Score.tsx`)
  ```

- **本設計書のコミットに含める**(統括担当が行う)。理由: 設計担当の成果物は本設計書1本に限られ(02号)、正本の改訂は統括担当の役目である(07号3)。製造の前提となるルールなので、製造より前に正本に入っている必要がある。製造担当は `docs/mahjong-rules.md` を変更しない。
- 食い違いの確認: 既存の §1・§2・§4.1 の記述と矛盾しない(1.4)。一発の扱いは 1.3 のとおり実装と整合する。

## 3. 範囲外

- 待ち牌の残り枚数・聴牌の一覧としての見せ方(E3)。
- 複数の和了候補(分解の違い)の表示【確定8】。和了牌の発光表示【確定10】。
- 赤牌の注意表示(確定事項9 で廃止)。赤牌の枚数を変えたときの入力のリセット(#62。4章)と `hora.ts` の変更。
- **変更禁止**: `src/ui/state/app-state.ts`・`src/ui/state/hand-rules.ts`・`src/ui/settings/` 配下・`src/core/` 配下(受け入れ条件2)。
- **既知の事実**: 赤牌のリセット(#62)は PR #81 でマージ済み(第6版で更新)。設定で赤牌の枚数を変えると入力がリセットされるため、設定と食い違う赤5の入力は UI からは起こらない。`hora.ts` が `rule.red` を参照しない件は #62 で「実害なし」として扱う(core は変えない)。
- 要約カードの表示遅れの修正(2.11 は調査のみ)。
- `src/core/` の変更。点差(livewing の `PointDiff`)。次の段階のバッジは第7版で範囲に含めた(2.6.5)。

## 4. 後続への引き継ぎ

- **E3**: `HoraItem` は和了牌・by・点数を自分で持つので、一覧側は `hora[]` を並べるだけでよい。E2 の `HoraDetail`(平らな並び)は聴牌の表示にそのまま転用できる。待ち牌の残り枚数等を足すときは一覧側に加え、`HoraItem` は変えない。`horaGlanceParts`・`isNoYaku`・`formatPoints` はそのまま使える。13枚の聴牌のバナーは E2 の「ロン・ツモそれぞれの最高打点」で出している。赤5と通常の5が別の和了牌として並ぶ(R28)。
- **F**: 打牌候補の `next` に和了があるときの打点表示に `formatPoints`・`isNoYaku` を使える。
- **UI 監修**: 文言は `labels.ts`(表)と `format.ts`・`hora-summary.ts`(書式。区切り記号 `TSUMO_SEPARATOR`・3桁区切り `formatNumber`・次の段階 `nextTierText`・支払い `payDetailLines`)に集めてある。2.7.4 の手引きに従う。残る監修事項: (1) 基本点の行の位置(折りたたみの中に入れるか。`BasePointLine` を移すだけ)と計算式の追加、(2) ロン・ツモのバッジの tertiary/primary の入れ替え(`hora.css` の2行)。
- **#62(E2 完了後に別 PR。ユーザー確定 Q7a〜d)**:
  - 仕様: `set-rule` で、種別(m・p・s)ごとの赤5の枚数(`redCountOf(rule.red, type)`)のどれかが前の値と違うときだけ、手牌・副露・ドラ表示牌・裏ドラ表示牌を空にする。抜き北の枚数・状況役・卓(場風・自風・本場・供託)は保つ。変わらなければ入力を保つ(livewing の `set-current-rule` と同様)。確認ダイアログは出さない。
  - 置き場の目安: `src/ui/state/app-state.ts` の `set-rule`(335〜349行)の1か所。設定画面は個別の項目もプリセットも `set-rule` で送る。`app-state.test.ts` の `set-rule` のテストの改訂要否を確認する。
  - D6(`issue-50-settings-screen.md`)の「ルール変更で入力を書き換えない」判断を、赤5の枚数の変更に限って変える。#62 の設計書・製造で issue-50 に事後注記を追記する。
  - core(`hora.ts` が `rule.red` を参照しない件)は変えない。#62 に「UI のリセットにより UI 経由では食い違いが生じず、実害なし」と記録して閉じる。

## 5. 実挙動未確認

- 2.9 の下余白の変更で、375×812 の重なりが解消するか(受け入れ条件 18 で確かめる)。
- 2.11 の遅れが再現するか。
- 遅延チャンクの先読みで、初回の和了表示に空白が見えないか(受け入れ条件 9)。
- 2.10 の増分・遅延チャンクの見込みは積算で、実測していない。
- tertiary のバッジのダークでのコントラスト(受け入れ条件 19 で確かめる)。
- 1.3 の値は core を直接実行して得た。画面上の手順(受け入れ条件 9〜17)は画面では未確認。

## 6. 受け入れ条件

検収はリポジトリのルートで行う。画面は Browser pane 375×812(`resize_window` preset mobile)で `npm run dev` を見る(01号に従う)。手牌は手牌カードからパレットで入れ、14枚目が和了牌になる。

**共通の準備(各条件の前に毎回)**: 場=東・自風は条件の指定(無ければ東=親)、本場・供託 0。設定画面で次を確かめ、違えば合わせる: ツモ損「ツモ損あり」、切り上げ満貫「なし」、数え役満「あり」、役満の複合「認める」、北「抜きドラ」、1本場の点数 200、供託 1000、赤ドラ所定(5p・5s 各1枚)。dev では保存済みのルール(ツモ損「ロン打点折半」等)が読み込まれることがあり、1.3 の R 表(`DEFAULT_RULE`=ツモ損あり)とツモの値が変わるため、ツモ損は必ず合わせる。以下の期待値は、この設定での `generateResult` と `format.ts`・`hora-summary.ts` の出力を実際に実行して確かめた値(2026-11-12)。

**見る場所**: 結果パネル `section[aria-label="計算結果"]` の中の `article.hora-item`(ロン/ツモのカード)。カード内は、見出し行 `.hora-item__head`(左 `.hora-item__badge`・`.hora-item__tile`、右 `.hora-item__points`)、2行目 `.hora-item__sub`(左 `.hora-item__sub-rank`(飜符と赤字の `.hora-item__limit-name`)・`.hora-item__tier-hint`、右 `.hora-item__pay-detail`)、役一覧 `.hora-item__yaku-list`、符の折りたたみ `.fu-breakdown`(開閉ボタン `.disclosure__summary`、中身 `.fu-breakdown__row`・`.fu-breakdown__formula`)、点差 `.point-diff`(開閉ボタン `.disclosure__summary`)。文字は `textContent` で比べる(空白は1つに詰めて比べてよい。点差の行はラベルと値が別の要素なので、それぞれの要素で比べる)。

1. **コマンド**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がエラーなく終わる。
2. **変更禁止ファイル**: (a) `git diff main --stat -- src/core src/ui/state/app-state.ts src/ui/state/hand-rules.ts src/ui/settings` が空(main にもこれらの変更は無いので、main 比で判定できる。赤牌のリセットは #62 で行う)。(b) `git diff <設計コミット> --stat -- docs/mahjong-rules.md` が空(正本の追記は本ブランチの設計コミットに含まれるため、main 比では差分が出る。2.13。`<設計コミット>` のハッシュは統括担当が製造・検収への依頼文で渡す)。
3. **import type の規律**: `grep -rnE "^import [^t].*core/" src/ui/result` が0件。
4. **遅延チャンク**: `npm run build` 後、`dist/assets` に `HoraDetail-*.js` があり、`dist/index.html` に書かれていない。`index-*.js` に `門前清自摸和`・`抜きドラ`・`倍役満` の文字列が含まれない(`grep -c` が 0)。`HoraDetail-*.js` には含まれる。
5. **初回 JS の記録**: 09号の方法で初回 JS(B)と `HoraDetail-*.js` の gzip -9 の値を測り、基準値 124,850 B・目標値 約125,400 B・遅延チャンク見込み 約4.8 kB と並べて最終報告に書く。超過は不合格にしない。
6. **単体テスト**: `npx vitest run src/ui/result src/ui/expressive/Disclosure.test.tsx src/ui/screen/ResultPanel.test.tsx` が全件通過し、2.12 の各ケースがテスト名から確認できる。`package.json` に `jsdom`・`happy-dom`・`@testing-library/*` が無い。
7. **名前の表**: `src/ui/result/hora/labels.ts` の72役が 2.7.1 の表のとおりで、各行に出典コメントがある(目視で照合)。`labels.ts` に関数・条件分岐が無い。試しに `YAKU_LABELS` から1行消すと `npm run typecheck` が失敗する(確認後に戻し、`git diff` が残らない)。
8. **E1 の規律の維持**: E1 受け入れ条件3(振り分けの一意性)の grep が `classify.ts` のみ(テストファイルを除く)。
9. **通常の和了(親)とカードの構成**: 手牌 `2p3p4p 5p6p7p 3s4s 6s7s8s 9p9p` に `2s`(R02)。(a) 結果パネルに `result-panel--flat` クラスがあり(大きなカードのくくりが無い)、`article.hora-item` が2件だけで、1件目 `data-hora-by="ron"`、2件目 `"tsumo"`。和了牌のまとめの見出しは無い。(b) ロン: バッジ「ロン」と `2s` の牌1枚、点数「1,500」。2行目「30符 1飜」、限度名なし、「＋4飜で満貫」、右端の支払いなし。役一覧「平和」「1飜」。符の開閉ボタン「符 30・基本点 240」。カード内に別の「基本点」の行が無い。(c) ツモ: 点数「700オール」、「20符 2飜」「＋3飜で満貫」、右端「合計 1,400点」だけ(「は」の行なし)。役一覧「門前清自摸和」「平和」。開閉ボタン「符 20・基本点 320」。(d) 役一覧の飜の数字が役名より右(`getBoundingClientRect().right` がカードの右端寄り)。(e) ロンのバッジの背景色が `--md-sys-color-primary`、ツモが `--md-sys-color-tertiary` の計算値と一致。(f) 和了直後に結果パネルが空白のまま 1 秒以上残らない。**判定は本番ビルド(`npm run build` → `npx vite preview`)で行い、dev は参考値とする**(検収で実画面を測ったところ、リロード直後に遅延チャンクを初めて読むときの空白は dev で約 1,240ms、本番ビルドで約 450ms。dev は ESM を変換しないぶん遅い。2回目以降は空白が出ない)。
10. **符の折りたたみ・基本点の式・点差**: 条件9 のロンのカード。(a) 符の開閉ボタンが `aria-expanded="false"`、中身は `hidden`。押すと `"true"` になり、`.fu-breakdown__row` が上から「副底 20符」「門前ロン 10符」「順子 0符」×3(各行に牌3枚)「雀頭 0符」(9p 2枚)「順子 0符」(2s3s4s。`2s` の牌に `.fu-breakdown__win-tile`)「両面待ち 0符」の8行。0符の行のうち、`2s3s4s` の行以外(順子×3・雀頭・両面待ち)に `fu-breakdown__row--muted` が付き、副底・門前ロン・`2s3s4s` の行には付かない。各行の牌の列 `.fu-breakdown__tiles` の左端と幅がすべての行で同じ。その下の `.fu-breakdown__formula` が「基本点 = 符 × 2飜+2 = 30 × 21+2 = 240」(`<sup>` を含む `textContent`)。もう一度押すと閉じる。(b) ツモのカードの符の明細は「副底 20符」「平和ツモ 0符」(薄くしない)「順子 0符」×3「雀頭 0符」「順子 0符」(和了牌つき)「両面待ち 0符」。ロンの開閉はツモに影響しない。(c) 点差: 見出し「点差」の開閉ボタンが既定で閉じている。開くと、ロン「放銃者との点差 3,000点」「傍観者との点差 1,500点」、ツモ(親の和了)「他家との点差 2,100点」の1行。(d) 役一覧と符の開閉ボタンの間、符のブロックと点差の間に `md-divider`(`Divider`)がある。
11. **バナー**: 条件9 の状態で `resize_window` を 375×500 にする(375×812 では結果パネルの上端が画面に入りバナーが出ない。E1 条件9 の事後改訂と同じ)。**判定は本番ビルド(`vite preview`)で行い、dev は参考値とする**。次の3つの手順で確かめる(Browser pane が表示されている状態で行う)。
    - **手順A**: シートを閉じてから `scrollTo(0,0)`。→ 閉じてから約1秒以内に、バナー(`button[aria-label="計算結果へ移動"]`)が visible になり、「ロン 1,500」と「ツモ 700オール」が出て、和了牌の牌画像と「和了」の文字が無い。
    - **手順C**: シートを開き(自動スクロールが起きる)、シートが開いたまま `scrollTo(0,0)` して(結果パネルの上端が画面の外)から、シートを閉じる。→ 閉じてから約1秒以内に visible になり、文言は手順A と同じ。シートが開いている間(`--sheet-height`=250px)は hidden(残り高さが 160 未満のため)。
    - **手順B**: シートを開く→自動スクロールで結果パネルの上端が画面の内側に入る→シートを閉じる。→ パネルが見えているので、バナーは hidden のまま(設計どおり)。
    - 終わったら 375×812 に戻す。
    - (緩和の記録・検収後の統括判断)元の条件は「シートを閉じて `scrollTo(0,0)` するとバナーが出る」の1手順だった。検収で prod の hidden が1回観測されたが、調査(prod、375×500)では手順A(約200ms)・手順C(約600ms、`--sheet-height` 250px→0px)とも visible になり、再現しなかった。手順B の hidden は設計どおり。Browser pane が非表示のとき、描画・スクロールイベント・IntersectionObserver の通知が間引かれ、hidden が観測された可能性がある(推測・未検証)。このため判定を3手順に分け、prod で判定する。
12. **13枚・複数の和了牌**: 条件9 の手から `2s` を除いた13枚(R29。親)。バナー(375×500)が「ロン 2,900」「ツモ 1,300オール」。本体の `article.hora-item` が6件、上から 2s ロン・2s ツモ・5s ロン・5s ツモ・赤5s ロン・赤5s ツモの順に平らに並び、各カードのバッジの横にその和了牌(赤5s は赤の画像)。2s・5s はロン「1,500」・ツモ「700オール」、赤5s はロン「2,900」「30符 2飜」「＋3飜で満貫」、ツモ「1,300オール」「20符 3飜」「＋2飜で満貫」。
13. **子・本場・供託・ツモ損**: 自風を南で条件9 の14枚。次の順に操作する。(1) 本場 2・供託 1(R07): ロンは点数「1,000」、右端「は 1,400」「(+1,400)点」(「合計」が無い)、点差「放銃者との点差 3,800点」「傍観者との点差 2,400点」。ツモは「400・700」、右端「は 600・900」「合計 1,100(+1,400)点」、点差「親との点差 3,400点」「子との点差 3,100点」。(2) 供託を 0: ロン「は 1,400」「(+400)点」、ツモ「は 600・900」「合計 1,100(+400)点」。(3) 本場を 0・供託を 1: ロンは「(+1,000)点」だけ、ツモは「合計 1,100(+1,000)点」だけ(どちらも「は」が無い)。(4) 本場 2・供託 0 にし、設定で1本場の点数を 400: ロン「は 1,800」「(+800)点」、ツモ「は 800・1,100」「合計 1,100(+800)点」。(5) 1本場の点数を 200 に、本場・供託を 0 に戻す(ロンの右端は空、ツモは「合計 1,100点」)。(6) 設定でツモ損を「北家分折半」→ ツモ「600・900」「合計 1,500点」。「ロン打点折半」→ ツモ「700オール」(子のツモでも2人の支払いが同じため)「合計 1,400点」、点差「他家との点差 2,100点」の1行。確認後、ツモ損を「ツモ損あり」に戻す。
14. **役なし・ドラのみ**: 自風を南。`1p2p3p 4p5p6p 2s3s4s 7s8s9s 東` に `東`(R24)。(a) ロンのカードに `data-no-yaku` があり、見出し行はバッジ・`東` の牌・「役なし」で、点数・2行目(飜符・次の段階・支払い)・役一覧・点差が無い。仕切り線の下に符の開閉ボタン「符 34 → 40」(「基本点」の文字が無い)だけがあり、開くと明細(「副底 20符」「門前ロン 10符」「順子 0符」×4「場風牌雀頭 2符」(東2枚、和了牌つき)「単騎待ち 2符」)が出て、`.fu-breakdown__formula` が無い。(b) ツモは「300・500」「30符 1飜」「＋4飜で満貫」「門前清自摸和」、開閉ボタン「符 26 → 30・基本点 240」。(c) バナー「ロン 役なし」「ツモ 300・500」。(d) ドラ表示牌に `北` を入れる(R26)と、ロンは役なしのまま(「2,600」が出ない)、ツモは「1,000・2,000」「30符 3飜」「＋2飜で満貫」。
15. **抜きドラ・切り上げ満貫**: 自風を南。条件9 の14枚で抜き北を 2(R09)→ ロン「3,900」「30符 3飜」「＋2飜で満貫」・役一覧に「抜きドラ」「2飜」。抜き北を 3 → ロン「7,700」「30符 4飜」「＋1飜で満貫」、開閉ボタン「符 30・基本点 1920」。設定で切り上げ満貫を「あり」→ ロン「8,000」「30符 4飜」「満貫」(赤字。`color` が `--md-sys-color-error` の計算値)「＋2飜で跳満」、式「満貫 = 2000」。切り上げ満貫を「なし」に戻し、抜き北を 0 にする。手を `北北北 1p2p3p 4p5p6p 7s8s9s 9s` + `9s` にする(R20。北=抜きドラ)と、ロンが役なし(符の見出しの値は分解の違いで変わりうるため見ない)、ツモ「400・700」「40符 1飜」。
16. **満貫〜役満・次の段階・符の行**: 自風を南で次を入れ、点数・2行目・限度名(赤字)・次の段階・式が一致する。
    - R10(`234p567p34s678s55p` + `2s`、ドラ表示 `4p`): ロン「8,000」「30符 5飜」「満貫」「＋1飜で跳満」式「満貫 = 2000」。ツモ「3,000・6,000」「20符 6飜」「跳満」「＋2飜で倍満」。
    - R11(`123p456p789p23p99p` + `4p`): ロン「16,000」「30符 9飜」「倍満」「＋2飜で三倍満」。ツモ「4,000・8,000」「20符 10飜」「＋1飜で三倍満」。
    - R12(R11 + 状況入力で立直・一発): ロン「24,000」「30符 11飜」「三倍満」「＋2飜で数え役満」。ツモ「6,000・12,000」「20符 12飜」「＋1飜で数え役満」。設定で数え役満を「なし」→ 点数・限度名は同じで、ロン・ツモとも次の段階が無い。「あり」に戻す。
    - R13(R12 + ドラ表示 `3p`): ロン「32,000」「30符 13飜」「数え役満」(符・飜を出す)、次の段階なし、式「数え役満 = 8000」。設定で数え役満を「なし」→ ロン「24,000」「三倍満」、次の段階なし。「あり」に戻す。
    - R14(`555z666z77z123p99s` + `7z`): ロン「32,000」、2行目は「役満」だけ(符・飜の文字が無い)、次の段階なし。符の開閉ボタン「符 50・基本点 8000」、式「役満 = 8000」、明細に「么九牌暗刻 8符」×2。ツモは開閉ボタン「符 46 → 50・基本点 8000」。
    - R15(`19m19p19s1234567z` + `1m`): 2行目「二倍役満」だけ、ロン「64,000」。符の開閉ボタンが無く、カード内に「基本点 16000」の行がある。R16(国士無双)も同様に「役満」「32,000」「基本点 8000」の行。
    - R17(`1122p3344s5566s7z` + `7z`): ロン「1,600」「25符 2飜」「＋3飜で満貫」、開閉ボタン「符 25・基本点 400」。開くと明細は「七対子 25符」の1行で、`.fu-breakdown__list--no-tiles` があり名称がリストの左端から始まる。
17. **役満の複合なし**: 自風を南、設定で役満の複合を「認めない」にし、`東東東 南 白白白 發發發 中中中` + `南`(R22)。役一覧に「四暗刻単騎」「大三元」「字一色」の3つがすべて同じ見た目で出て(四暗刻単騎の行は「二倍役満」、ほかは「役満」)、2行目は「二倍役満」だけ、ロン「64,000」、ツモ「16,000・32,000」。符の開閉ボタンはロン「符 66 → 70・基本点 16000」、式「二倍役満 = 16000」、明細に「自風牌雀頭 2符」(和了牌つき)「単騎待ち 2符」。複合を「認める」に戻すと「四倍役満」・ロン「128,000」・ツモ「32,000・64,000」(R21)。画面のどこにも「ダブル」「トリプル」の文字が無い。
18. **下余白(E1 持ち越し a)**: 375×812、条件9 の手。`getComputedStyle(document.querySelector('.main-screen__bottom-spacer')).height` が `--sheet-height` と `--result-banner-height` の和(±1px)。シートを閉じた状態と開いた状態のそれぞれで、ページ末尾までスクロールしたとき、`[aria-label="副露を追加"]` の `getBoundingClientRect().bottom` がバナーの `top` 以下であるか、バナーが非表示。ページ末尾で 2 秒間、バナーの `visibility` を 100ms ごとに記録し、切り替わりが1回以下。
19. **ダーク・トークン**: E1 条件17 と同じ方法でダークにし、ロン/ツモのバッジ・限度名(赤字)・次の段階のバッジ・符と点差の開閉ボタン・符の明細の行(薄い行・和了牌の薄いピンク)の背景と文字が切り替わる。ライトとダークのそれぞれで、ロン・ツモのバッジの文字色と背景色のコントラスト比を console で計算し(`getComputedStyle` の色から相対輝度を求める)4.5 以上。`git diff main -- src | grep -nE "#[0-9a-fA-F]{3,8}\b"` が CSS の色値としてヒットしない。
20. **出典表示**: mj-mighty-calc・livewing を参考にしたファイルの先頭コメントに出典(リポジトリ名と元ファイル名)がある。`LICENSE` の著作権表示が変わっていない。`git diff main -- src | grep -nE "/(Users|home)/"` が0件。
21. **調査タスク(E1 持ち越し b)**: 最終報告に 2.11 の報告項目(1)〜(5)がすべてある。`git diff main` に計測用のコードが無い。
22. **実機確認の申し送り(E1 持ち越し c)**: 最終報告に、ユーザーが実機(iOS Safari / Android Chrome)で確かめる手順(7章)がある(合否には含めない)。

## 7. 実機確認(検収後にユーザーが行う。合否に含めない)

条件 9・10・11・18 の操作を実機で行い、(1) バナーが「副露を追加」付近に重ならない、(2) 初めて和了形にしたとき本体が空白のまま残らない、(3) 符の内訳の開閉が押しやすく牌が読める、(4) 要約カードの出方に遅れを感じない、(5) シートを閉じたあと、結果パネルが画面外のとき(375 幅前後で画面の高さが低い状態)にバナーが出る(条件11 の手順A・C に相当)、(6) ダークとライトの切り替えで、配色の切り替わりに遅れを感じない(検収で、本番ビルドで約1.5秒の遅れが観測されたが、Browser pane の非表示の影響の可能性があり、再測定できていない)、を確かめる。E1 持ち越し (b) は 2.11 の報告を首席がユーザーに提示し、修正するか別 Issue にするかを決める。

## 8. (欠番)

## 9. 未決事項(要ヒアリング)

未決事項なし。初版の Q1〜Q6、第2版の Q7(a〜d)、第7版の UI 監修方針はユーザーが確定した(確定事項の表と 4章・10章)。ロン=primary・ツモ=tertiary の割り当てと基本点の位置・計算式は、確定事項21 のとおり UI 監修で調整する(設計としては提案どおりで製造できる)。

## 10. 改訂履歴

- 2026-11-12 第2版: 初版 9章へのユーザー回答を反映。
  - Q1 → 確定事項3: 符の内訳を折りたたみのリスト(牌の並び・名称・符数)に変更。0符の行も出す。合計と切り上げは開閉ボタンに出す。`Disclosure` を `src/ui/expressive` に自作。
  - Q2 → 確定事項5: 1飜縛り。懸賞役をドラ・赤ドラ・抜きドラ・一発とし、`isNoYaku` に一発を追加。正本の追記文案と置き場を 2.13 に記載(本設計書のコミットに含める)。
  - Q3 → 確定事項6・13: 役名を正本の表記に統一。表をデータだけの `labels.ts` に分け、監修の手引き(2.7.4)を追加。
  - Q4 → 確定事項14: 基本点の行を出す。
  - Q5 → 確定事項9: 赤牌の注意表示(初版 2.8・`red-excess.ts`・関連のテストと受け入れ条件・R27/R30)を削除。リセット仕様の置き場を Q7 として要ヒアリング。
  - Q6 → 確定事項15: 書式は現行提案のまま、表と書式関数を分離。二倍以上の役満を「二倍役満」「三倍役満」…に統一。
- 2026-11-12 第3版: 第2版 Q7 へのユーザー回答を反映。
  - Q7a: 赤牌のリセットは E2 に含めず、E2 完了後に #62 の別 PR で行う。入力側のファイルを変更禁止に加えた(3章・受け入れ条件2)。
  - Q7b・Q7c: リセットの仕様(対象=手牌・副露・ドラ表示牌・裏ドラ表示牌、種別ごとの赤5の枚数が変わったときだけ、確認なし)と D6 の判断の変更を 4章に記録した。
  - Q7d: core は変えず、#62 に「実害なし」と記録して閉じる(4章)。
  - リセットが入るまで食い違う赤5の入力が起こりうることを、既知の事実として 3章に記載した。
- 2026-11-12 第4版: 独立レビューの真偽判定を反映。条件9〜17 の牌姿の期待値を再実行して確認(1.3)。`ResultPanel.test.tsx` の `toContain('和了')` の扱いを 2.12 に明記。受け入れ条件2 の正本の判定を設計コミット比に変更。条件番号の誤記(17→18、9〜16→9〜17)を訂正。ツモ・ロンの並び順の記述を統一(1.2・1.5)。条件8 にテストファイル除外を明記。`Tile` の裏向き(`{ type: 'back' }`)を確定事実に書き直し、`hora.ts` の行番号を実物に合わせた。
- 2026-11-12 第5版: 製造の検証で、R19 の符が分解の順序の違いで「38 → 40」と「40」のどちらにもなる(core の挙動。同点の多面張)と判明。R19 の期待値を「どちらも合格」に直し、符の切り上げの確認は分解が1通りの R24+立直(生34 → 40)に替えた。core の変更はしない(後続の検討事項)。
- 2026-11-12 第6版: main(#62 マージ済み、9910db3)を取り込み。基準値を 124,850 B、目標値を約 125,370 B に更新。3章の赤牌リセットの記述を「PR #81 でマージ済み」に更新。
- 2026-11-12 第7版: ユーザーの UI 監修(イメージ画像。mj-mighty-calc の `CandidateCard` 準拠)を反映。確定事項16〜21 を追加。
  - カード構成: 見出し行にバッジ+和了牌1枚と点数、その下に飜符+限度名(赤字)と次の段階のバッジ、右端に右揃えの支払い、役一覧(飜は右)、符の折りたたみ、基本点(2.6)。
  - 和了牌ごとのまとめを廃止し、`hora[]` を平らに並べる(2.5)。E3 への引き継ぎを書き換え(4章)。
  - 次の段階のバッジ「＋k飜で{限度名}」を範囲に追加(2.6.5・`next-tier.ts`)。`ResultContext` に `rule` を追加。3章を修正。
  - 点数の書式を3桁区切り(手書き)・ツモの区切り「・」に変更(2.4)。支払いの内訳をツモ「は …」「合計 …」、ロン「(+bonus)点」のみに変更(2.6.4)。
  - ロン=primary・ツモ=tertiary のバッジ(1か所で入れ替え可能)。tertiary のトークンの存在を `tokens.css` で確認(1.5)。限度名を赤字の文字に、次の段階を primary-container のバッジに。
  - 受け入れ条件 5・9・11〜17・19 とテスト(2.12)を書式・構成に合わせて改訂し、期待値を `generateResult` で再実行して確認。R19 を条件から外した。バンドルの積算を更新(目標 約125,400 B、遅延チャンク 約4.8 kB)。
  - 追加確定: ロンの右端を「は {本場込み}」(本場があるとき)と「(+{bonus})点」(本場・供託があるとき)の2行に変更(確定事項20・2.6.4)。本場のみ・供託のみ・両方・1本場400点の実行値で条件13とテストを改訂。
- 2026-11-12 第8版: 独立レビューの判定を反映。条件13 の操作順を整理(R07 でロン・ツモを確認→ロンの各パターンとツモの値→設定と本場・供託を戻す→ツモ損)。次の段階の rule 参照を R12 の数え役満あり/なしの対照で確かめる(2.6.5・2.12・条件16)。第7版の書式に追従していない既存テストの期待値を実物で洗い出して 2.12 に列挙(`64000` 等)。2.6 の見出しを `HoraItem({ hora, context })` に統一。数え役満のキーを実装済みの `'kazoe-yakuman'` に統一。構成図の左上を `[ツモ]` に訂正。
- 2026-11-12 UI 監修による変更(ユーザー指示。設計承認は省略): 子ツモでも2人の支払いが等しいとき(ロン打点折半など)は「{n}オール」と表示する(`formatPoints`。本場込みの値でも、等しければ「オール」、等しくなければ「・」)。
- 2026-11-12 UI 監修による変更(ユーザー指示): 符の内訳で、ツモ符・門前加符(`menzen-ron`・`tsumo`・`pinfu-tsumo`)を副底の次に表示する(2.6.3・条件10・`fu-rows.test.ts`)。
- 2026-11-12 UI 監修による変更(ユーザー指示): ロン・ツモのカードを入れる結果パネルの大きなカードのくくり(背景・余白・角丸・最小高さ)をやめる。和了の結果のときだけ `ResultPanel` が `result-panel--flat` を付け、背景を透明・余白0・最小高さ0にする(聴牌・向聴など他の種類は従来のまま)。
- 2026-11-12 UI 監修による変更(ユーザー指示): 役一覧と符の折りたたみの間に仕切り線(`Divider`)を入れる。符の折りたたみの見出しに基本点を加え(「符 34 → 40  基本点 640」)、折りたたみがあるカードでは見出しとは別の「基本点」の行を出さない(折りたたみのない役満・国士・十三不塔のカードは従来どおり基本点の行を出す)。
- 2026-11-12 UI 監修による変更(ユーザー指示): (1) 符の折りたたみの見出しは、符と基本点を中黒でつなぐ(「符 34 → 40・基本点 640」)。(2) 符の概念がない国士無双・十三不塔以外は、役満が確定していても符を出す(面子手・七対子の役満でも、飜符の行に「{符}符」、折りたたみ(切り上げ後の符は生の符から計算)を出す)。(3) 折りたたみの中の符の明細の下に基本点の式を置く(満貫未満: 「基本点 = 符 × 2^(飜+2) = 40 × 2^(2+2) = 640」、満貫以上・役満: 「{限度名} = {基本点}」)。`format.ts` の `baseFormula`。
- 2026-11-12 UI 監修による変更(ユーザー指示): (1) 飜符の行は「{符}符{飜}飜」(符が先。例「20符3飜」。区切りの空白なし)。(2) 役満(二倍役満以上を含み、数え役満を除く)のカードの飜符の行には符を出さない(限度名だけ)。符の折りたたみ(見出し・明細・式)は役満でも出す。直前の変更((2)の符の行)を置き換える。
- 2026-11-12 UI 監修による変更(ユーザー指示): (1) 飜符の行は「{符}符 {飜}飜」(符の後に空白を入れる。直前の「区切りの空白なし」を置き換える)。(2) 符の折りたたみ(または折りたたみのない役満・国士・十三不塔の基本点の行)の下に仕切り線を入れる(このあとに点数差の項目を足すため。役なしのカードには入れない)。
- 2026-11-12 UI 監修による変更(ユーザー指示): 点差の項目を追加する(livewing の `PointDiff` を三麻に合わせたもの。`PointDiff.tsx`・`format.ts` の `pointDiffRows`)。符・基本点のブロックの下の仕切り線の下に、見出し「点差」の折りたたみ(既定は閉じる)で置く。役なしのカードには出さない。点差 = 和了者の受取総額(打点+本場+供託)+ その相手の支払い(本場込み。支払わない相手は受取総額だけ)。ロンは「放銃者との点差」「傍観者との点差」。ツモは、子の和了で親と子に差があるとき「親との点差」「子との点差」、親の和了または差がないとき(ロン打点折半など)は「他家との点差」の1行。「点数の変化」(+N飜の段階表)は作らない(次の段階のバッジで代える)。
- 2026-11-12 UI 監修による変更(ユーザー指示): 符の明細で、0符の行を薄く表示する(`fu-rows.ts` の `muted`、`fu-breakdown__row--muted` で不透明度 0.5)。ただし平和ツモの行は薄くしない。
- 2026-11-12 UI 監修による変更(ユーザー指示): 役なしのカードに、符の明細(折りたたみ)だけを足す。見出しは「符 34 → 40」(基本点は付けない)、基本点の式・点差・次の段階は出さない。役一覧がないので、見出し行と折りたたみの間に仕切り線を入れる。条件14(役なし)の「符が出ない」を置き換える。
- 2026-11-12 UI 監修による変更(ユーザー指示): 符の明細の牌の列を、槓子(4枚)ぶんの幅(5.375rem)で固定し、槓子の行も名称・符数の位置がほかの行とそろうようにする。
- 2026-11-12 UI 監修による変更(ユーザー指示): 符の明細で、待ちのブロックの和了牌の牌に薄いピンクを重ねる(`fu-rows.ts` の `winTileIndex`、`fu-breakdown__win-tile`。エラー色を 28% で重ねる。牌の絵が白地の画像なので背景ではなく重ねる。枠線は付けない)。同じ牌が複数あるブロック(単騎の雀頭・双碰の刻子)は先頭の1枚。和了牌を含むブロックの行は、0符でも薄くしない。
- 2026-11-12 UI 監修による変更(ユーザー指示): 符の明細に牌の行が1つもないとき(七対子)は、牌の列を詰めて名称を左端に寄せる(`fu-breakdown__list--no-tiles`)。
- 2026-11-12 6章の改訂(統括の指示): 受け入れ条件 9〜17・19 と前書きを、上の UI 監修の変更と現状の実装(`src/ui/result/`・`src/ui/screen/`)に揃えた。共通の準備(ツモ損を「ツモ損あり」に合わせる等)と見る場所(クラス名)を前書きに追加。期待値は `generateResult` と `format.ts`・`hora-summary.ts` の出力を実行して確認。
- 2026-11-12 受け入れ条件の緩和(検収後の統括判断): 条件9(f) の判定を、dev から本番ビルド(`vite preview`)に変更する。dev は参考値(実測: dev 約 1,240ms、本番ビルド約 450ms)。先読みの位置の変更は行わない。
- 2026-11-12 受け入れ条件の緩和(検収後の統括判断・ユーザー確定「B」): 条件11 の判定を本番ビルドに変え、手順A・B・C の3手順に分ける(書き直しと緩和の経緯は6章の条件11)。7章の実機確認に、バナーの表示(手順A・C 相当)と、ダーク切り替えの遅れの有無を加える。
- 2026-11-14 第9版: Issue #82 で R19 の符が 40 に決まった(1.3 R19・2.12 `fu-rows.test.ts`・6章 条件15 を改訂)。
