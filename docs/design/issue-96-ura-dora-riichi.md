# Issue #96 裏ドラを立直時だけ計算し、役名「裏ドラ」として表示する — 設計書(第3版)

第1版からの変更: オーナーの追加要望「役名に裏ドラを追加する」を受けて、コア(`src/core/`)の変更を範囲に含めた。立直の判定はコアへ移す。

第3版の変更: 第2版の要確認 Q1(裏ドラ表示牌が西のときの抜き北)が、オーナー確定(案a「数える」)になった。`docs/mahjong-rules.md` §1 への追記を範囲に含めた。

## 1. 確定事項と根拠

統括担当から渡された確定事項(オーナー確認済み)。

- 不具合の原因: `src/ui/calc/compute.ts` の `computeResult` が `handOptions.riichi` を見ずに `dora: [...s.input.dora, ...uradora]` をコアへ渡している(実物で確認済み)。
- 裏ドラを計算に入れるのは `riichi !== 'none'` のときだけ。対象は `'riichi'`・`'double-riichi'`・`'open-riichi'`・`'open-double-riichi'` の4種。出典は `docs/mahjong-rules.md` §1 の表「裏ドラ | 【確定】あり(立直時)」。
- 結果の役一覧では、裏ドラを表ドラと分けて「裏ドラ」と表示する(第2版の追加要望)。コアに役名 `ura-dora` を足す。
- 裏ドラ欄には、立直の有無を問わず入力できるままにする。入力欄と使用枚数の計上(`src/ui/state/hand-rules.ts`)は変更しない。
- 範囲外: 立直なしのときに裏ドラ欄を無効表示にする UI 変更。
- 抜き北と裏ドラ表示牌: 裏ドラ表示牌が西のときは、抜いた北1枚につき裏ドラ1飜を加える。表ドラと同じ式で計算する(オーナー確定 2026-11-14・Issue #96。第2版の Q1 で案a を採用)。`docs/mahjong-rules.md` §1 への追記も本Issueに含める(3.7)。
- 懸賞役: `docs/mahjong-rules.md` §93 は、懸賞役に「ドラ(表ドラ・槓ドラ・裏ドラ)」を含めている。このため `ura-dora` は懸賞役として扱い、`BONUS_YAKU` に加える(確定)。

## 2. 調査結果(実物確認)

### 2.1 経路

- UI からコアへ渡す経路は `computeResult` の1か所だけ。`use-result.ts` は `computeResult` を動的 import して呼ぶだけ。`SummaryCard.tsx` の `input.uradora` は表示にしか使っていない。
- `use-result.ts` の `useMemo` の依存に `handOptions` が入っている。立直を切り替えると再計算される。
- コアでの扱いは次のとおり。
  - `src/core/result.ts` が `generateHora(table, options, results, input, rule)` を2か所で呼ぶ。また、`generateChitoitsuHora(table, input.hand, options, input.dora, rule, input.nuki)` を1か所で呼ぶ。
  - `src/core/hora.ts` で dora・red-dora・nuki-dora を積んでいるのは2か所。`generateHora` 内(800行付近)と、`generateChitoitsuHora` 内(1100行付近)。
  - 両関数とも `options: HandOptions` を受け取っており、`options.riichi` を参照できる(立直役を積む箇所で既に参照している)。
- 結果の役一覧は、コアが積んだ順のまま表示している(`src/ui/result/` に役名で並べ替える処理はない)。このため表示順は `hora.ts` で積む順で決まる。

### 2.2 dora 系の役名を列挙している箇所(`grep -rln "nuki-dora" src` などで洗い出し)

| 箇所 | 対応 |
| --- | --- |
| `src/core/yaku.ts` の `yakuNames`(`'dora','red-dora','nuki-dora'`) | `'dora'` の直後に `'ura-dora'` を追加 |
| `src/core/hora.ts` の2か所 | 3.1 のとおり追加 |
| `src/ui/result/hora/labels.ts` の `YAKU_LABELS` | `'ura-dora': '裏ドラ'` を追加(`dora` の直後。コメントの出典記号は隣の行に合わせる) |
| `src/ui/result/hora-summary.ts` の `BONUS_YAKU` | `'ura-dora'` を追加(役なし判定 `isNoYaku` の懸賞役) |
| `src/ui/result/hora/names.test.ts` E2-1(`YAKU_LABELS` のキーが `yakuNames` と一致することの検査) | ラベルを追加すれば通る。変更不要 |
| `src/core/golden.test.ts`・`golden-cases.ts` | 3.4 のとおり |
| `src/ui/result/f1-discard.test.tsx` などの `'dora'` | テスト用の固定値で、影響なし |

- 打点の合計・数え役満・`discard-summary` の打点範囲・次の段階(`next-tier`)は、`yaku` 配列の飜を合計するだけで、役名を列挙していない。`ura-dora` を足せば自動的に合計に入る。

## 3. 設計

### 3.1 立直の判定はコアで行う(推奨・本設計で採用)

| 案 | 内容 | 評価 |
| --- | --- | --- |
| A: コアで判定(採用) | コアは常に裏ドラ表示牌を受け取り、`options.riichi !== 'none'` のときだけ `ura-dora` を積む | 「裏ドラは立直時のみ」という規則がコアの1か所に集まる。コアを直接呼ぶテスト(golden など)でも規則が守られる。コアは既に `options.riichi` を持っている |
| B: UI で判定 | `compute.ts` が立直なしのとき `uradora` を渡さない | コアに裏ドラ表示牌を渡すと、立直なしでも裏ドラが乗ってしまう。規則が UI 側に漏れ出る |

### 3.2 コアの変更

- `src/core/input.ts` の `Input` に、任意項目として `uradora?: Tile[]` を追加する(JSDoc は「裏ドラ表示牌。立直時のみ計算に入る。省略時は無し」)。
  - 任意項目にする理由: `Input` を直接作っている既存のテスト(golden、north、hora-tiebreak、result など)を書き換えずに済むため。`AppInput = Input & { uradora: Tile[] }` は交差型なので、UI 側では従来どおり必須のまま。
- `src/core/hora.ts`
  - `generateHora`: 表ドラ(`d`)の直後で、`options.riichi !== 'none'` のときに裏ドラの飜 `u` を計算する。`u > 0` なら `{ type: 'yaku', name: 'ura-dora', han: u }`(`ron: true, tsumo: true`)を積む。
  - `u` は表ドラと同じ式で計算する: `sumBy(uradora, 表示牌の次の牌の枚数) + nuki × (裏ドラ表示牌の中の西の枚数)`。西の扱いは 3.5 を参照(確定)。
  - 積む順序は dora → ura-dora → red-dora → nuki-dora とする。
  - `generateChitoitsuHora`: 引数の末尾に `uradora: Tile[] = []` を追加し、同じ規則で積む。
  - 表ドラ・裏ドラの計算は2か所で同じ式になるため、`hora.ts` 内に小さなヘルパー(例: 表示牌の配列・全牌の枚数・nuki から飜を返す関数)を作ってもよい(製造担当の裁量)。
- `src/core/result.ts`: `generateChitoitsuHora` の呼び出しに `input.uradora ?? []` を足す。`generateHora` は `input` をそのまま受け取るので変更不要。
- `src/core/yaku.ts`: `yakuNames` の `'dora'` の直後に `'ura-dora'` を追加する。

### 3.3 UI の変更

- `src/ui/calc/compute.ts`: 表ドラとの結合をやめ、`uradora` をそのまま `Input.uradora` として渡す(実質は `s.input` を `Input` として渡すだけになる)。立直の判定はしない。
- `src/ui/result/hora/labels.ts`: `'ura-dora': '裏ドラ'` を追加する。
- `src/ui/result/hora-summary.ts`: `BONUS_YAKU` に `'ura-dora'` を追加する(`['dora', 'ura-dora', 'red-dora', 'nuki-dora', 'ippatsu']`)。

### 3.4 golden(`src/core/golden-cases.ts`・`golden.test.ts`)は据え置く

- golden の入力は、裏ドラ表示牌を `dora` 文字列に混ぜたまま `Input.dora` に渡している。期待値も裏ドラを `dora` に合算した形で書いている。この方式は本変更の後も同じ結果になるため、データと期待値は変えない。
- `golden.test.ts` 17〜18行の「コアに専用の役名が無いため」は、事実と合わなくなる。この注記だけを「golden は裏ドラを表ドラに合算して表す(役名 `ura-dora` は別のテストで検証する)」という趣旨に改める。`golden-cases.ts` の注記(18・46・54行)は、golden の表記の約束として正しいので変えない。
- golden を `ura-dora` で書き直すかどうかは、本Issueの範囲外とする(後続Issueへの引き継ぎ)。

### 3.5 抜き北と西の裏ドラ表示牌

- `docs/mahjong-rules.md` §1 の表には「抜きドラ(ドラ表示牌が西) | 【確定】抜いた北もドラになる。抜いた北1枚につき抜きドラ1飜とドラ1飜」とある。
- 修正前の実装は、裏ドラ表示牌を表ドラに混ぜて同じ式(`nuki * westCount`)を通していた。つまり、裏ドラ表示牌が西なら抜き北も裏ドラになる挙動になっていた(立直なしでも乗る不具合は別にある)。
- 正本の文言は「ドラ表示牌」だけで、裏ドラ表示牌に同じ規則を当てはめるかは書かれていなかった。これについてオーナーの確定を得た(1章)。確定内容は、裏ドラ表示牌にも同じ規則を当てはめ、`nuki × 裏ドラ表示牌の西の枚数` を `ura-dora` に加えるというもの。修正前の立直時の打点も変わらない。

### 3.7 `docs/mahjong-rules.md` §1 への追記

§1 の表で、「抜きドラ(ドラ表示牌が西)」の行(33行目)の直後に、次の1行を追加する。

```
| 抜きドラ(裏ドラ表示牌が西) | 【確定】立直時、抜いた北も裏ドラになる。抜いた北1枚につき裏ドラ1飜(表ドラと同じ扱い)(ユーザー(オーナー)確定 2026-11-14、Issue #96) | — |
```

### 3.6 既存テストへの影響

main の ce595e5 で `npx vitest run` を実行した結果は、74ファイル・1179件合格(27件スキップ)。変更後の影響は次のとおり。

- `src/ui/calc/result-state.test.ts` D1-10a: 現在は「`dora: [A, B]` に結合し、`uradora` キーを取り除く」ことを期待している。変更後は `dora: [A]`・`uradora: [B]` がそのまま渡るので**失敗する**。新しい仕様(結合しない・`uradora` を渡す)に合わせて書き換える。
- `src/ui/state/app-state.test.ts` D4-C10: `toBeDefined` だけを確かめているので影響なし。
- `src/ui/result/hora/names.test.ts` E2-1: `yakuNames` と `YAKU_LABELS` の両方に足せば通る。片方だけだと失敗する(漏れを検出する安全網になる)。
- golden、north、hora-tiebreak などのコアのテスト: `Input` を `uradora` なしで作っているので、結果は変わらない(任意項目のため)。
- 上記以外で、裏ドラの加算を前提にしたテストは grep で見つからなかった。

## 4. テスト計画

### 4.1 コア(新規 `src/core/ura-dora.test.ts`)

門前の平和形など確実に和了する手で、裏ドラ表示牌が手牌の牌を1枚以上ドラにする状態を用意する。七対子の形でも1件用意する。

1. 立直なし(`riichi: 'none'`)では、役に `ura-dora` が出ない。
2. 4種の立直(`it.each`)で、役に `ura-dora` が出て、飜数が裏ドラの枚数と一致する。役の順序が `dora` の直後になる(表ドラも乗る形で確かめる)。
3. 七対子(`generateChitoitsuHora` の経路)でも、2と同じ結果になる。
4. `uradora` を省略した `Input` では `ura-dora` が出ず、ほかの役と飜数は `uradora: []` のときと同じ。
5. 抜き北×西×裏ドラ: 立直時に裏ドラ表示牌を `3z`(西)1枚、`nuki = 2` とし、手牌に北がない和了形にする。役に `ura-dora` 2飜と `nuki-dora` 2飜が出て、`dora` は出ない(表ドラ表示牌は西以外にする)。同じ状態で立直なしにすると、`ura-dora` は出ない。

### 4.2 UI

6. `result-state.test.ts` D1-10a を書き換える: `generateResult` に `dora: [A]`・`uradora: [B]` が渡ることを確かめる。
7. `computeResult` で立直を解除すると消えること: `appReducer` の `set-riichi` で `'riichi'` から `'none'` に変えた後の状態では `ura-dora` が出ない。その状態でも `input.uradora` は残っている。
8. `hora-summary.test.ts`: 懸賞役だけ(`ura-dora` のみ、および `dora` と `ura-dora`)の和了で `isNoYaku` が true になる。
9. `names.test.ts` E2-3 に `YAKU_LABELS['ura-dora']` が `'裏ドラ'` であることの確認を1行足す。

## 5. 要確認

- なし(第2版の Q1 はオーナー確定として1章・3.5・3.7に移した)。

## 6. 受け入れ条件

検収担当はブランチ `fix/issue-96-ura-dora-riichi` 上で、次を1項目ずつ実行する。

- [ ] `src/core/hora.ts` を読む。`generateHora` と `generateChitoitsuHora` の両方で、`options.riichi !== 'none'` のときだけ `ura-dora` を積み、積む位置が `dora` の直後であることを確認する。
- [ ] `src/core/input.ts` の `Input.uradora` が任意項目(`?`)であることを確認する。`src/core/yaku.ts`・`labels.ts`・`hora-summary.ts` の `BONUS_YAKU` に `ura-dora` があることも確認する。
- [ ] `src/ui/calc/compute.ts` が立直の判定をせず、表ドラとの結合もしていないことを確認する。
- [ ] `git diff main --stat` で、変更ファイルが 8章の一覧に収まっていることを確認する。
- [ ] `npx vitest run src/core/ura-dora.test.ts src/ui/calc/result-state.test.ts src/ui/result/hora-summary.test.ts src/ui/result/hora/names.test.ts` を実行し、4章の1〜9がすべて合格することを確認する。4種の立直それぞれのケースが出力に出ていること。
- [ ] 一時的に `hora.ts` の立直条件を外し(常に積む状態にし)、4.1 の1が失敗することを確認する。確認したら元に戻し、差分を残さない。
- [ ] 4.1 の5(抜き北×西×裏ドラ)のテストが含まれていて、合格していることを確認する。
- [ ] `docs/mahjong-rules.md` §1 の表で、「抜きドラ(ドラ表示牌が西)」の行の直後に、3.7 の行が追加されていることを確認する。出典表記(オーナー確定 2026-11-14、Issue #96)が入っていること。
- [ ] `npx vitest run src/core/golden.test.ts` が合格し、`golden-cases.ts` に差分がないことを確認する。
- [ ] 実機確認(`npm run build` → `vite preview`): 門前の和了形を入力し、裏ドラ欄に手牌の牌をドラにする表示牌を入れて、次の4点を確かめる。
  - 立直なしでは、役一覧に「裏ドラ」がなく飜も加算されない。
  - 立直を選ぶと、「ドラ」の直後に「裏ドラ n」が出る。
  - 立直を解除すると、「裏ドラ」が消える。
  - 裏ドラ欄の表示牌は、立直なしの間も入力・表示されたまま残っている。
- [ ] `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラーなく終わる。
- [ ] 変更ファイルにホームディレクトリ名・絶対パスが含まれない。

## 7. 後続Issueへの引き継ぎ

- 立直なしのときに裏ドラ欄を無効表示にする UI 変更は、範囲外として残る。計算側は本Issueで立直なしの裏ドラを無視するようになるため、UI だけを変えれば済む。
- golden の期待値を `ura-dora` で書き分けるかどうか(3.4)。

## 8. 変更ファイル一覧

- 本番コード(7本): `src/core/input.ts`、`src/core/yaku.ts`、`src/core/hora.ts`、`src/core/result.ts`、`src/ui/calc/compute.ts`、`src/ui/result/hora/labels.ts`、`src/ui/result/hora-summary.ts`
- テスト(5本): `src/core/ura-dora.test.ts`(新規)、`src/ui/calc/result-state.test.ts`、`src/ui/result/hora-summary.test.ts`、`src/ui/result/hora/names.test.ts`、`src/core/golden.test.ts`(注記コメントのみ)
- docs: 本設計書、`docs/mahjong-rules.md`(§1 に1行追記)

## 9. 実挙動未確認の箇所

- 4章のテストに使う具体的な牌姿と期待飜数は、製造担当が実行して確定する。
- 6章の実機確認は、設計時点では実行していない。
