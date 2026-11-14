# Issue #96 裏ドラが立直の有無にかかわらずドラとして加算される — 設計書

## 1. 確定事項と根拠

統括担当から渡された確定事項(オーナー確認済み)を前提とする。

- 原因: `src/ui/calc/compute.ts` の `computeResult` が `handOptions.riichi` を見ずに `dora: [...s.input.dora, ...uradora]` をコアへ渡している(実物で確認済み)。
- 裏ドラ表示牌を計算に入れるのは `handOptions.riichi !== 'none'` のときだけ。対象は `'riichi'`・`'double-riichi'`・`'open-riichi'`・`'open-double-riichi'` の4種(型は `src/core/input.ts` の `HandOptions['riichi']`)。出典は `docs/mahjong-rules.md` §1 の表「裏ドラ | 【確定】あり(立直時)」。
- 裏ドラ欄への入力は立直の有無を問わず可能のまま。入力欄・使用枚数の計上(`src/ui/state/hand-rules.ts` の使用中全牌に `uradora` を含める処理)は変更しない。計算に入れないだけとする。
- 範囲外: 立直なしのとき裏ドラ欄を無効表示にする UI 変更、`src/core/` の変更。

## 2. 調査結果(実物確認)

- コアへ入力を渡す経路は `computeResult` の1か所だけ。`use-result.ts` は `computeResult` を動的 import して `evaluateResult` 経由で呼ぶのみ。`src/ui/` 内で `generateResult` を直接呼ぶ本体コードはない(テストのみ)。
- `SummaryCard.tsx` の `input.uradora` は表示牌の描画だけで、計算には関与しない。変更不要。
- `use-result.ts` の `useMemo` 依存配列に `handOptions` が含まれるため、立直の切替で再計算される。立直解除で裏ドラが消える挙動は `computeResult` の修正だけで成立する。
- 既存テストの影響(main 先頭 ce595e5 で `npx vitest run src/ui/calc src/ui/state/app-state.test.ts` は 55件すべて合格):
  - `src/ui/calc/result-state.test.ts` の **D1-10a** は初期状態(`riichi: 'none'`)のまま `uradora: [tileB]` を渡し、`generateResult` に `dora: [tileA, tileB]` が渡ることを期待している。**修正後は失敗する。** 本Issueで、このテストの状態に `handOptions: { ...base.handOptions, riichi: 'riichi' }` を加えて立直ありの結合を確かめる内容に改める(テスト名も「立直時に」を含む名前へ変更)。
  - `src/ui/state/app-state.test.ts` の **D4-C10** は `riichi: 'none'` で裏ドラを渡すが、`expect(res).toBeDefined()` のみで影響なし。
  - 同ファイル F62-1 等の `uradora` は reducer の状態検証で、計算を通らないため影響なし。
  - `src/ui/result/`・`src/ui/screen/` のテストに、裏ドラ加算を前提にした打点の期待値はない(`uradora` を含むのは `IndicatorCard.test.tsx`・`buffer-selection.test.tsx` の入力操作のみ)。

## 3. 変更内容

### 3.1 `src/ui/calc/compute.ts`

シグネチャは変更しない。

```ts
export const computeResult = (
  s: Pick<AppState, 'table' | 'input' | 'handOptions' | 'rule'>
): Result
```

`uradora` を `dora` に結合する条件を `s.handOptions.riichi !== 'none'` に限定する。立直なしのときは `dora: s.input.dora` とする。どちらの場合も、コアへ渡す入力から `uradora` キーを取り除く現行の動作は変えない。

### 3.2 テスト(`src/ui/calc/result-state.test.ts`)

- D1-10a を前節のとおり立直ありに改める。
- 新規テストを追加する(IDは製造担当が既存の命名に合わせて決めてよい)。
  1. **立直なしで乗らない**: `riichi: 'none'`、`dora: [A]`、`uradora: [B]` で `generateResult` のspyに渡る `dora` が `[A]` だけであり、`uradora` キーがないこと。
  2. **4種の立直で乗る**: `'riichi'`・`'double-riichi'`・`'open-riichi'`・`'open-double-riichi'` の4種を `it.each` で回し、渡る `dora` が `[A, B]` であること。spyで引数を見るだけなので4種とも網羅する(コストが小さく、判定条件の書き間違い(例: `=== 'riichi'`)を検出できるため)。
  3. **打点で確かめる(結合テスト)**: 門前の和了形で、裏ドラ表示牌が手牌の牌をドラにする状態を用意し、`riichi: 'riichi'` と `'none'` で `computeResult` を呼んだ結果を比べる。立直ありの和了結果の飜数が「立直1飜 + 裏ドラ枚数」を含み、立直なしでは裏ドラ分が含まれないこと(飜数の取り出し方は既存の `src/ui/result/hora-summary.test.ts` 等の書き方に合わせる)。
  4. **立直解除で消える**: 同じ状態に `appReducer` の `set-riichi`(`riichi: 'riichi'` → `'none'`)を適用した後の状態で `computeResult` を呼ぶと、裏ドラが `dora` に含まれないこと。あわせて `input.uradora` 自体は保持されていること(入力は消さない)。

## 4. 受け入れ条件

検収担当はブランチ `fix/issue-96-ura-dora-riichi` 上で次を1項目ずつ実行する。

- [ ] `src/ui/calc/compute.ts` を読み、`uradora` の結合が `handOptions.riichi !== 'none'` のときに限られ、`riichi === 'none'` では `s.input.dora` だけが渡ることを確認する。
- [ ] `git diff main --stat` で、変更が `src/ui/calc/compute.ts`・`src/ui/calc/result-state.test.ts`(および本設計書)に限られ、`src/core/` と UI コンポーネントに変更がないことを確認する。
- [ ] `npx vitest run src/ui/calc/result-state.test.ts` を実行し、3.2 の1〜4のテストと改訂後の D1-10a がすべて合格することを確認する。4種の立直それぞれのケースが出力に現れること。
- [ ] 一時的に 3.1 の条件を外した(常に結合する)状態で 3.2 の1と3が失敗することを確認し、元に戻す(テストが不具合を検出できることの確認。差分を残さない)。
- [ ] 実機確認(`npm run build` 後に `vite preview`): 門前の和了形を入力し、裏ドラ欄に手牌の牌をドラにする表示牌を入れる。立直なしでは結果の飜にドラ(裏ドラ)が加算されず、立直を選ぶと加算され、立直を解除すると加算が消えること。裏ドラ欄の表示牌は立直なしでも入力・表示されたままであること。
- [ ] `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラーなく終わる。
- [ ] 変更ファイルにホームディレクトリ名・絶対パスが含まれない。

## 5. 要確認

- なし。(表示上、結果の役一覧で裏ドラを表ドラと区別して表示するかは本Issueの範囲外で、現行どおり「ドラ」として合算される。)

## 6. 後続Issueへの引き継ぎ

- 立直なしのとき裏ドラ欄を無効表示にする UI 変更は範囲外として残る。行う場合、計算側は本Issueで既に立直なしを無視するため、UI だけの変更で済む。
- コアは裏ドラを表ドラと同じ `dora` 配列で受け取るため、役一覧で「裏ドラ」を別表記にするにはコア入力の拡張が必要になる。

## 7. 実挙動未確認の箇所

- 3.2 の3で使う和了形の具体的な牌姿と期待飜数は、製造担当がテスト作成時に実行して確定する。設計時点では実行していない。
- 4章の実機確認の手順は、設計時点では実行していない。
