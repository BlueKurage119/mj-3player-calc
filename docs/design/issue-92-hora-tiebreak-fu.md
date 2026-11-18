# Issue #92 設計書: uniqueHoras の段6(生の符の比較)を検証する単体テスト追加

- 対象 Issue: #92 (`uniqueHoras` のテストが段6(生の符の比較)を検出できない)
- 設計担当モデル: `Gemini 4 Argon (High)`
- 基準コミット: `main` `b215a80` (2026-11-18 時点)
- 製造ブランチ(予定): `test/issue-92-hora-tiebreak-fu` (設計承認後に統括担当が本ブランチを作成し、本設計書を先行コミットする)
- 変更対象: 製造フェーズでは `src/core/hora-tiebreak.test.ts` のみ(テスト2件追加。`main...HEAD` 差分としては先行コミットされた本設計書と合わせた2ファイル)
- 状態: **設計確定**(第2版・独立レビュー指摘5件反映済み・未決事項なし)

## 1. 目的と範囲

### 1.1 目的

PR #91(Issue #82)で `src/core/hora.ts` の `uniqueHoras` に導入された多段比較のうち、**段6(生の符 `sumOfFu` の降順比較、`src/core/hora.ts` L1336 `if (af !== bf) return bf - af;`)** を削除しても既存の `src/core/hora-tiebreak.test.ts` が失敗しない問題を解消する。

段5(飜数)および段7a(待ちの順位 `waitingRank`)が同一で、かつ段7b(正準文字列 `canonicalKey` の辞書順昇順)単独では低符側が選ばれる `Hora` ペアを `uniqueHoras` に直接渡す単体テスト2件(`I92-01`・`I92-02`)を追加し、段6削除ミュータントを確実に検出(KILLED)できるようにする。

### 1.2 範囲内

- `src/core/hora-tiebreak.test.ts` への単体テスト2件(`I92-01`・`I92-02`)の追加
  - `I92-01`: 非満貫域・同基本点(切り上げ後40符・1飜=基本点320)・同飜数・同じ待ち(`tanki`)で生の符 36 と 40 を比較する単体テスト
  - `I92-02`: 満貫域・同飜数(6飜=基本点3000)・同じ待ち(`kanchan`)で生の符 40 と 44 を比較する単体テスト

### 1.3 範囲外(変更禁止)

- `src/core/hora.ts` を含むすべてのプロダクションコード(`src/`・`wasm/` 配下の実装ファイル)の変更
- `docs/design/issue-82-hora-tiebreak.md` 等の既存設計書や `docs/mahjong-rules.md` の変更
- `src/core/hora-tiebreak.test.ts` 内の既存テストケース `I82-01`〜`I82-06`(特に `I82-05(a)`・`I82-05(b)`)の変更・削除
- `generateResult` を経由する結合テストの追加(`uniqueHoras` 直接呼び出しの単体テストのみを対象とする)
- `git push` および PR 作成(検収完了後はオーナーが受入検査・PR発行を行う)

## 2. 参照資料と設計判断の根拠

### 2.1 ヒアリング済みの確定事項(統括担当経由・すべて確定)

| # | 確定事項 | 本設計での反映 |
| --- | --- | --- |
| 1 | 既存の `I82-05(a)(b)` はそのまま残し、新規テストケース(`I92-01`・`I92-02` の2件: 非満貫域・同基本点と、満貫域・同飜数)を `src/core/hora-tiebreak.test.ts` に追加する | §3・§4・§7 AC-2 |
| 2 | `uniqueHoras` 直接呼び出しの単体テストのみを対象とする。`src/core/hora.ts` 等の実装や `docs/design/issue-82-hora-tiebreak.md` 等の既存設計書は変更しない | §1.3・§3・§7 AC-1 |
| 3 | ブランチは `test/issue-92-hora-tiebreak-fu`。検収完了後はオーナーが受入検査・PR発行を行うため、受け入れ条件に `git push` や PR 作成を含めない | §6・§7 AC-6 |
| 4 | 段6削除ミュータントを確実に検出できることを設計時に実測確認する(段5・段7aが同じで、かつ段7b `canonicalKey` 単独では低符側が選ばれるデータ組にする) | §2.3・§4・§5.2 |

### 2.2 参照した資料と根拠

| # | 資料 | 確認した事実と導いた設計判断 |
| --- | --- | --- |
| 1 | Issue #92 本文(`gh issue view 92`) | PR #91 検収時のミューテーション検証で、`src/core/hora.ts` の段6(`if (af !== bf) return bf - af;`)を削除しても `src/core/hora-tiebreak.test.ts` 全12件が通過した事実を確認。待ちが同じで生の符だけが違う2件(刻子の符の差)を `uniqueHoras` に渡す単体テストで解決する方針を採用 |
| 2 | `src/core/hora.ts` (L1283〜L1351) | `uniqueHoras` の段1〜段7bの比較実装、`waitingRank`(`tanki`=0, `kanchan`=1, `penchan`=2, `shampon`=3, `ryammen`=4, 待ちなし=5)、および `canonicalKey`(`JSON.stringify([h.type, h.type === 'mentsu' ? h.melds : [], h.type === 'mentsu' ? h.fu : [], h.yaku])`)の実装を確認 |
| 3 | `src/core/fu.ts` (L12〜L67, L232〜L233) | `Fu` 型のユニオン定義(`KotsuFu` の `fu: 2 \| 4 \| 8 \| 16 \| 32` 等)と `sumOfFu` の計算式を確認。型を破るキャストなしで構築できる `Fu[]` リテラルを設計 |
| 4 | `src/core/hora-tiebreak.test.ts` (L1〜L605) | 既存の `canonicalKey` ヘルパー(L91〜L97)および `I82-05` の `expectBothOrders` パターン(L265〜L275)を確認。既存 `I82-01`〜`I82-06` に一切手を加えず、ファイル末尾に `describe('I92: ...')` を追加する構成とした |
| 5 | `docs/design/issue-82-hora-tiebreak.md` (§2.1・§3・§4.1) | `uniqueHoras` の各段の仕様と `I82-05` 単体テストの設計意図を確認 |
| 6 | `docs/mahjong-rules.md` (§1・§4.3・§6) | §1「萬子は 1m・9m のみ(2m〜8m なし)」【確定】、§6「基本点は、Wikipedia『麻雀の得点計算』の計算式で算出する」【確定】を確認。なお §4.3「解釈が複数あるときの選択(Issue #82)」は文面に Issue #82 製造時の `【設計案】` タグが残っているが、内容は Issue #82 のヒアリング確定事項1・4(オーナー確定済み)のみに基づく仕様である |
| 7 | `docs/design/issue-25-open-double-riichi-ippatsu.md` | テスト追加のみを行う Issue の設計書構成・ミューテーション確認手順の記述粒度を手本として参照 |

### 2.3 既存テストが段6削除ミュータントを検出できなかった原因(実物分析)

`src/core/hora.ts` L1336 の `if (af !== bf) return bf - af;` を削除した場合、比較は段7a(`waitingRank`)および段7b(`canonicalKey` の UTF-16 コード単位昇順)へフォールスルーする。既存テストで段6に関わる4箇所がいずれも SURVIVED となった理由は次のとおりである。

1. **`I82-01`・`I82-02` (R19 ロン)**: 両面待ち(生の符 38、`waitingRank` = 4)と単騎待ち(生の符 40、`waitingRank` = 0)の比較であり、段6を削除しても段7a(`0 < 4`)で単騎待ち(40符)が選ばれる。
2. **`I82-03`・`I82-04` (`1112223337899p` + `6p`)**: 三暗刻側(ロン46符/ツモ38符)と平和側(ロン30符/ツモ20符)はともに両面待ち(`waitingRank` = 4)で段7aは同値となるが、段7b の `canonicalKey` において `fu` 配列第2要素の `"type":"kotsu"`(三暗刻側)と `"type":"shuntsu"`(平和側)が比較され、辞書順で `"kotsu" < "shuntsu"` となるため、段6が無くても偶然に高符側(三暗刻側)が選ばれる。
3. **`I82-05(a)` (6飜・生の符 32 vs 40)**: `hora32` が `waitingType: 'kanchan'`(`waitingRank` = 1)、`hora40` が `waitingType: 'tanki'`(`waitingRank` = 0)であるため、段7a(`0 < 1`)で `hora40` が選ばれる。
4. **`I82-05(b)` (40符1飜・生の符 38 vs 40)**: `hora38` に `waiting` 要素が無く(`waitingRank` = 5)、`hora40` が `waitingType: 'tanki'`(`waitingRank` = 0)であるため、段7a(`0 < 5`)で `hora40` が選ばれる。

したがって、段6を単独で検証するには次の3条件をすべて満たすペアが必要である。

- **条件A**: 段1(`horaTile`)・段2(`by`)・段3(役満倍数=0)・段4(`calculateBasePoint`)・段5(飜数)がすべて同値であること
- **条件B**: 段7a(`waitingRank`)が同値(同じ `waitingType`)であること
- **条件C**: 段7b(`canonicalKey`)において **`canonicalKey(低符側) < canonicalKey(高符側)`** が成り立つこと(段6を削除したとき、段7bで低符側が選ばれて必ずテストが失敗すること)

## 3. 追加するテストの構造とシグネチャ

`src/core/hora-tiebreak.test.ts` の末尾(既存の `describe('同点の和了分解の選択 (I82-01〜I82-06)', ...)` の閉じ括弧の直後)に、次の `describe` ブロックを追加する。既存の import 文・ヘルパー関数(`canonicalKey` を含む)・既存の `describe` ブロックは変更しない。

```ts
describe('I92: uniqueHoras 直接呼び出しによる段6(生の符)の単体テスト (I92-01〜I92-02)', () => {
  const horaTile: Tile = { type: 'p', n: 1 };

  const expectBothOrders = (
    a: Hora,
    b: Hora,
    expected: Hora,
    rule: Rule = DEFAULT_RULE
  ): void => {
    const ab = uniqueHoras([a, b], rule);
    const ba = uniqueHoras([b, a], rule);
    expect(ab).toEqual([expected]);
    expect(ba).toEqual([expected]);
  };

  test('I92-01: 非満貫域・基本点同点(40符1飜=320)・同飜・同じ待ちで生の符 36 と 40 なら 40 が残る', () => {
    // ...
  });

  test('I92-02: 満貫域・同飜(6飜=基本点3000)・同じ待ちで生の符 40 と 44 なら 44 が残る', () => {
    // ...
  });
});
```

- テスト名は業務標準05(`docs/rules/05-verification-protocol.md`)の命名規約に従い、`I92-01: ...`・`I92-02: ...` とする。
- アサーションは `expectBothOrders` による `[expected]` との `toEqual` 完全一致とし、加えて前提条件である `sumOfFu` の値と `canonicalKey(低符側) < canonicalKey(高符側)` が `true` であることを `expect` で検証する。
- 三麻の不変条件(業務標準07)を守り、萬子の中張牌 `2m〜8m`(`TileCountsIndex` の `1〜7`)は一切使用しない。使用する `TileCountsIndex` は筒子(`9`=1p, `10`=2p, `11`=3p, `12`=4p, `17`=9p)のみとする。

## 4. テストケース詳細と期待値の手計算

`I92-01`・`I92-02` のデータはいずれも、実在の14枚牌姿から `generateHora` で生成したものではなく、既存の `I82-05` と同じ形式で **`uniqueHoras` の段6の比較条件だけを切り分けるために構築した合成 `Hora` データ**である(そのため `horaTile` は共通ダミーの `1p`(`{ type: 'p', n: 1 }`)に固定し、`fu` 配列の要素構成も必要最小限としている)。

### 4.1 テストケース一覧

| ID | 領域 | 飜数・役 | 待ち(`waitingType`) | 低符側 `fu` 合計(切り上げ後) | 高符側 `fu` 合計(切り上げ後) | 基本点 | 期待される選択 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `I92-01` | 非満貫域・同基本点 | 1飜 (`riichi`: 1) | `tanki` (順位0) | 生の符 36 (40符) | 生の符 40 (40符) | 320 | 高符側 (`hora40`) |
| `I92-02` | 満貫域・同飜数 | 6飜 (`chinitsu`: 6) | `kanchan` (順位1) | 生の符 40 (40符) | 生の符 44 (50符) | 3000 | 高符側 (`hora44`) |

### 4.2 `I92-01`: 非満貫域・同基本点(40符1飜=基本点320)

- **出典**: 選択順序は Issue #82 ヒアリング確定事項1(`docs/mahjong-rules.md` §4.3 3「飜数も同じなら、生の符(10符単位に切り上げる前の符の合計)が高い解釈」)、符と基本点の計算式は `docs/mahjong-rules.md` §6(Wikipedia「麻雀の得点計算」の式)による手計算。
- **共通設定**: `type: 'mentsu'`, `by: 'ron'`, `horaTile: { type: 'p', n: 1 }`, `melds: []`, `yaku: [{ type: 'yaku', name: 'riichi', han: 1 }]` (段6切り分け用の合成 `Hora` データ)
- **低符側 (`hora36`)**:
  - 副底: `{ type: 'futei', fu: 20 }` (20符)
  - 2p(`tile: 10`)の暗刻(中張牌): `{ type: 'kotsu', tile: 10, kotsuType: 'anko', fu: 4 }` (4符)
  - 門前加符: `{ type: 'menzen-ron', fu: 10 }` (10符)
  - 1p(`tile: 9`)の単騎待ち: `{ type: 'waiting', waitingType: 'tanki', block: { type: 'head', tile: 9, fu: 0 }, fu: 2 }` (2符)
  - 生の符の合計: $20 + 4 + 10 + 2 = 36$ → 10符単位に切り上げて $40$ 符
  - 基本点: $40 \times 2^{1+2} = 320$
- **高符側 (`hora40`)**:
  - 副底: `{ type: 'futei', fu: 20 }` (20符)
  - 9p(`tile: 17`)の暗刻(么九牌): `{ type: 'kotsu', tile: 17, kotsuType: 'anko', fu: 8 }` (8符)
  - 門前加符: `{ type: 'menzen-ron', fu: 10 }` (10符)
  - 1p(`tile: 9`)の単騎待ち: `{ type: 'waiting', waitingType: 'tanki', block: { type: 'head', tile: 9, fu: 0 }, fu: 2 }` (2符)
  - 生の符の合計: $20 + 8 + 10 + 2 = 40$ → 10符単位に切り上げて $40$ 符
  - 基本点: $40 \times 2^{1+2} = 320$
- **各段の比較確認**:
  - 段4(基本点): $320 = 320$ (同点)
  - 段5(飜数): $1 = 1$ (同飜)
  - 段6(生の符): $40 > 36$ → **`hora40` が選ばれる**
  - 段7a(`waitingRank`): ともに `tanki` で $0 = 0$ (同順位)
  - 段7b(`canonicalKey`): `fu` 配列第2要素の文字列が `{"type":"kotsu","tile":10,"kotsuType":"anko","fu":4}` vs `{"type":"kotsu","tile":17,"kotsuType":"anko","fu":8}` となり、最初の差分文字 `'0'` (U+0030) < `'7'` (U+0037) により `canonicalKey(hora36) < canonicalKey(hora40)` が成り立つ。したがって段6を削除すると段7bで `hora36` が選ばれる。

```ts
  test('I92-01: 非満貫域・基本点同点(40符1飜=320)・同飜・同じ待ちで生の符 36 と 40 なら 40 が残る', () => {
    // 出典: 選択規則は Issue #82 確定事項1(mahjong-rules.md §4.3 3)、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hora36: Hora = {
      type: 'mentsu',
      by: 'ron',
      horaTile,
      melds: [],
      fu: [
        { type: 'futei', fu: 20 },
        { type: 'kotsu', tile: 10, kotsuType: 'anko', fu: 4 },
        { type: 'menzen-ron', fu: 10 },
        {
          type: 'waiting',
          waitingType: 'tanki',
          block: { type: 'head', tile: 9, fu: 0 },
          fu: 2
        }
      ],
      yaku: [{ type: 'yaku', name: 'riichi', han: 1 }]
    };
    const hora40: Hora = {
      type: 'mentsu',
      by: 'ron',
      horaTile,
      melds: [],
      fu: [
        { type: 'futei', fu: 20 },
        { type: 'kotsu', tile: 17, kotsuType: 'anko', fu: 8 },
        { type: 'menzen-ron', fu: 10 },
        {
          type: 'waiting',
          waitingType: 'tanki',
          block: { type: 'head', tile: 9, fu: 0 },
          fu: 2
        }
      ],
      yaku: [{ type: 'yaku', name: 'riichi', han: 1 }]
    };
    expect(sumOfFu(hora36.fu)).toBe(36);
    expect(sumOfFu(hora40.fu)).toBe(40);
    expect(canonicalKey(hora36) < canonicalKey(hora40)).toBe(true);
    expectBothOrders(hora36, hora40, hora40);
  });
```

### 4.3 `I92-02`: 満貫域・同飜数(6飜=基本点3000)

- **出典**: 選択順序は Issue #82 ヒアリング確定事項1(`docs/mahjong-rules.md` §4.3 3)、符と基本点の計算式は `docs/mahjong-rules.md` §6(Wikipedia「麻雀の得点計算」の式)による手計算。
- **共通設定**: `type: 'mentsu'`, `by: 'ron'`, `horaTile: { type: 'p', n: 1 }`, `melds: []`, `yaku: [{ type: 'yaku', name: 'chinitsu', han: 6 }]`
  - **合成 `Hora` データに関する注記**: 本データは実在の14枚牌姿ではなく、`I82-05(a)` と同じ形式で段6の比較条件だけを切り分ける合成 `Hora` データである。そのため、段1のグループ化キーである `horaTile` は共通ダミーの `1p` に固定しつつ、待ち要素には `tile: 12`(456p の順子)の `kanchan` を置いている(`uniqueHoras` は `horaTile` と `waiting.block.tile` の整合を参照せず、段1では `horaTile` の一致、段6では `sumOfFu`、段7aでは `waitingType`、段7bでは `canonicalKey` のみを参照する)。
- **低符側 (`hora40`)**:
  - 副底: `{ type: 'futei', fu: 20 }` (20符)
  - 2p(`tile: 10`)の暗刻(中張牌): `{ type: 'kotsu', tile: 10, kotsuType: 'anko', fu: 4 }` (4符)
  - 3p(`tile: 11`)の暗刻(中張牌): `{ type: 'kotsu', tile: 11, kotsuType: 'anko', fu: 4 }` (4符)
  - 門前加符: `{ type: 'menzen-ron', fu: 10 }` (10符)
  - 456p(`tile: 12`)の嵌張待ち: `{ type: 'waiting', waitingType: 'kanchan', block: { type: 'shuntsu', tile: 12, fu: 0 }, fu: 2 }` (2符)
  - 生の符の合計: $20 + 4 + 4 + 10 + 2 = 40$ → 10符単位に切り上げて $40$ 符
  - 基本点: 6飜(跳満)のため符によらず $3000$
- **高符側 (`hora44`)**:
  - 副底: `{ type: 'futei', fu: 20 }` (20符)
  - 9p(`tile: 17`)の暗刻(么九牌): `{ type: 'kotsu', tile: 17, kotsuType: 'anko', fu: 8 }` (8符)
  - 3p(`tile: 11`)の暗刻(中張牌): `{ type: 'kotsu', tile: 11, kotsuType: 'anko', fu: 4 }` (4符)
  - 門前加符: `{ type: 'menzen-ron', fu: 10 }` (10符)
  - 456p(`tile: 12`)の嵌張待ち: `{ type: 'waiting', waitingType: 'kanchan', block: { type: 'shuntsu', tile: 12, fu: 0 }, fu: 2 }` (2符)
  - 生の符の合計: $20 + 8 + 4 + 10 + 2 = 44$ → 10符単位に切り上げて $50$ 符
  - 基本点: 6飜(跳満)のため符によらず $3000$
- **各段の比較確認**:
  - 段4(基本点): 切り上げ後の符は 40符 と 50符 で異なるが、満貫域(6飜跳満)のため基本点はともに $3000 = 3000$ (同点)
  - 段5(飜数): $6 = 6$ (同飜)
  - 段6(生の符): $44 > 40$ → **`hora44` が選ばれる**
  - 段7a(`waitingRank`): ともに `kanchan` で $1 = 1$ (同順位)
  - 段7b(`canonicalKey`): `fu` 配列第2要素の文字列が `{"type":"kotsu","tile":10,"kotsuType":"anko","fu":4}` vs `{"type":"kotsu","tile":17,"kotsuType":"anko","fu":8}` となり、`canonicalKey(hora40) < canonicalKey(hora44)` が成り立つ。したがって段6を削除すると段7bで `hora40` が選ばれる。

```ts
  test('I92-02: 満貫域・同飜(6飜=基本点3000)・同じ待ちで生の符 40 と 44 なら 44 が残る', () => {
    // 出典: 選択規則は Issue #82 確定事項1(mahjong-rules.md §4.3 3)、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hora40: Hora = {
      type: 'mentsu',
      by: 'ron',
      horaTile,
      melds: [],
      fu: [
        { type: 'futei', fu: 20 },
        { type: 'kotsu', tile: 10, kotsuType: 'anko', fu: 4 },
        { type: 'kotsu', tile: 11, kotsuType: 'anko', fu: 4 },
        { type: 'menzen-ron', fu: 10 },
        {
          type: 'waiting',
          waitingType: 'kanchan',
          block: { type: 'shuntsu', tile: 12, fu: 0 },
          fu: 2
        }
      ],
      yaku: [{ type: 'yaku', name: 'chinitsu', han: 6 }]
    };
    const hora44: Hora = {
      type: 'mentsu',
      by: 'ron',
      horaTile,
      melds: [],
      fu: [
        { type: 'futei', fu: 20 },
        { type: 'kotsu', tile: 17, kotsuType: 'anko', fu: 8 },
        { type: 'kotsu', tile: 11, kotsuType: 'anko', fu: 4 },
        { type: 'menzen-ron', fu: 10 },
        {
          type: 'waiting',
          waitingType: 'kanchan',
          block: { type: 'shuntsu', tile: 12, fu: 0 },
          fu: 2
        }
      ],
      yaku: [{ type: 'yaku', name: 'chinitsu', han: 6 }]
    };
    expect(sumOfFu(hora40.fu)).toBe(40);
    expect(sumOfFu(hora44.fu)).toBe(44);
    expect(canonicalKey(hora40) < canonicalKey(hora44)).toBe(true);
    expectBothOrders(hora40, hora44, hora44);
  });
```

## 5. 実挙動の確認状況と外部事実の確認記録

### 5.1 実挙動未確認の箇所

- なし(§5.2 のとおり、追加する2件のテストの通常通過・対照実験・段6削除ミュータントでの失敗・段6符号反転ミュータントでの失敗・lint/typecheck/format:check のすべてを設計時に実測済み)。

### 5.2 外部事実および設計時実測の確認記録

業務標準02「設計書に必ず含める項目」6 に基づき、設計時に実行したコマンドと結果を記録する。検証後、`src/core/hora.ts` および `src/core/hora-tiebreak.test.ts` への一時変更はすべて `git checkout -- src/core/hora.ts src/core/hora-tiebreak.test.ts` で復旧済みである。

| # | 確認対象 | 実行したコマンド | 実行結果(証拠) |
| --- | --- | --- | --- |
| 1 | Issue #92 の内容確認 | `gh issue view 92` | exit code 0。タイトル `uniqueHoras のテストが段6(生の符の比較)を検出できない`、Labels: `bug`、Milestone: `v1.1` を確認 |
| 2 | 基準コミットと開始時の作業ツリー状態 | `git status --porcelain && git rev-parse --short HEAD` | exit code 0。`git status --porcelain` は出力なし(クリーン)、HEAD は `b215a80` |
| 3 | 新規テスト追加時の通常テスト・型検査・lint・整形検査 | `npx vitest run src/core/hora-tiebreak.test.ts && npm run typecheck && npm run lint && npm run format:check` | exit code 0。`src/core/hora-tiebreak.test.ts` の 14 tests がすべて PASS、`tsc -b`・`biome lint`・`biome format` ともエラー0件。※ `.claude/worktrees/` 配下にワークツリーが存在する場合、`npx vitest run src/core/hora-tiebreak.test.ts` は部分一致で2ファイルを拾うため、単一ファイル指定には `npx vitest run --dir src/core hora-tiebreak.test.ts` が確実であることを確認 |
| 4 | ミューテーション対照実験(ダミーコメント挿入) | `src/core/hora.ts` L1335 のコメントを `// 段6: 生の符の降順 (対照実験ダミーコメント)` に変更後、`npx vitest run --dir src/core hora-tiebreak.test.ts` | exit code 0。`1 passed (1)`, `Tests 14 passed (14)` で SURVIVED となることを確認 |
| 5 | ミューテーション本番判定1(段6削除ミュータント) | `src/core/hora.ts` L1336 `if (af !== bf) return bf - af;` をコメントアウト後、`npx vitest run --dir src/core hora-tiebreak.test.ts` | exit code 1。`Tests 2 failed \| 12 passed (14)`。既存 `I82-01`〜`I82-06`(12件)はすべて PASS し、新規追加した `I92-01` と `I92-02` の **2件のみが FAIL(KILLED)** となることを確認 |
| 6 | ミューテーション本番判定2(段6比較向き反転ミュータント) | `src/core/hora.ts` L1336 を `if (af !== bf) return af - bf;` に変更後、`npx vitest run --dir src/core hora-tiebreak.test.ts` | exit code 1。`Tests 8 failed \| 6 passed (14)`。`I92-01`・`I92-02` の2件および `I82-01`〜`I82-05(a)(b)` の6件が FAIL(KILLED)となることを確認 |
| 7 | 一時変更の復旧確認 | `git checkout -- src/core/hora.ts src/core/hora-tiebreak.test.ts && git status --porcelain` | exit code 0。出力なし(コード変更が完全に復旧されたことを確認) |
| 8 | リモートブランチおよびPR不在の確認コマンド検証 | `git ls-remote --heads origin test/issue-92-hora-tiebreak-fu && gh pr list --head test/issue-92-hora-tiebreak-fu` | exit code 0。`git ls-remote` の出力は空、`gh pr list` は `no pull requests match your search in BlueKurage119/mj-3player-calc`(標準出力は空)であることを確認 |

## 6. 製造・検収への指示

- **設計承認後のブランチ作成・先行コミット(統括担当)**:
  - 業務標準01「設計書の資産化(必須)」に従い、設計承認後に統括担当がブランチ `test/issue-92-hora-tiebreak-fu` を作成し、本設計書 `docs/design/issue-92-hora-tiebreak-fu.md` を先行コミットする。
- **製造担当**:
  - 統括担当が本設計書を先行コミットした後の指定ブランチ `test/issue-92-hora-tiebreak-fu` 上で作業し、`src/core/hora-tiebreak.test.ts` のみを変更してコミットする。
  - 業務標準05「redを先に確認する(必須)」および「ミューテーション判定の必須手順」に従い、§7 の受け入れ条件4(対照実験 → 復元 → 段6削除ミュータントでの red 確認 → 復元 → 段6符号反転確認 → 復元)を実施し、手順と結果を最終報告に記載する。
  - コミット前に `npm run build`・`npm run typecheck`・`npm run lint`・`npm run format:check`・`npm test` を実行し、すべて exit code 0 であることを確認する。
  - `git push` および PR 作成は行わない。
- **検収担当**:
  - §7 の受け入れ条件1〜6を1項目ずつ実行して検証する。
  - 確定事項3により、検収完了後はオーナーが受入検査・PR発行を行うため、**全項目通過であっても `git push` および PR 作成(`gh pr create`)を行わないこと。**

## 7. 受け入れ条件

検収担当は各項目を実行し、記載の条件を満たすことを確認する。差分の基準は `main...HEAD` とする(統括担当による本設計書の先行コミットと、製造担当によるテスト追加コミットの双方が含まれる)。

- [ ] 1. **変更ファイルの範囲と作業ツリーの確認**: `git diff --name-only main...HEAD` を実行し、出力が先行コミットされた本設計書 `docs/design/issue-92-hora-tiebreak-fu.md` と `src/core/hora-tiebreak.test.ts` の2件のみであること(`src/core/hora.ts` 等の実装ファイルや `docs/design/issue-82-hora-tiebreak.md` 等の既存設計書が含まれないこと)。かつ `git status --short` の出力が空(未コミット変更・未追跡ファイルなし)であること。
- [ ] 2. **既存テストの保持と新規テストの内容確認**: `git diff main...HEAD -- src/core/hora-tiebreak.test.ts` を確認し、既存の `I82-01`〜`I82-06`(特に `I82-05(a)`・`I82-05(b)`)が変更・削除されておらず、末尾に §3・§4 の `I92-01`・`I92-02` の2件が追加されていること。また、各テストに出典コメントがあり、型を破るキャスト(`as unknown as` 等)や `2m〜8m`(`TileCountsIndex` 1〜7)が使用されていないこと。
- [ ] 3. **新規テストおよびファイル内全テストの通過確認**:
  - `npx vitest run --dir src/core hora-tiebreak.test.ts -t "I92-01:"` で `I92-01` 1件が PASS すること。
  - `npx vitest run --dir src/core hora-tiebreak.test.ts -t "I92-02:"` で `I92-02` 1件が PASS すること。
  - `npx vitest run --dir src/core hora-tiebreak.test.ts` で既存12件＋新規2件の計14件がすべて PASS すること。
- [ ] 4. **ミューテーション確認(業務標準05準拠: 対照実験 → 復元 → 本番判定 → 復元)**:
  - **手順4-1(対照実験と復元)**: `src/core/hora.ts` L1335 のコメント行 `// 段6: 生の符の降順` にダミー文字列を追記し、`npx vitest run --dir src/core hora-tiebreak.test.ts` を実行して 14件すべてが PASS(SURVIVED)することを確認する。確認後、`git checkout -- src/core/hora.ts` で一旦復元する。
  - **手順4-2(本番判定1: 段6削除ミュータントと復元)**: `src/core/hora.ts` L1336 の `if (af !== bf) return bf - af;` をコメントアウト(削除)し、`npx vitest run --dir src/core hora-tiebreak.test.ts` を実行して、`I92-01` と `I92-02` の **2件が FAIL(KILLED)** すること(既存12件は PASS)を確認する。確認後、`git checkout -- src/core/hora.ts` で一旦復元する。
  - **手順4-3(本番判定2: 段6符号反転ミュータントと復元)**: `src/core/hora.ts` L1336 を `if (af !== bf) return af - bf;` に書き換え、`npx vitest run --dir src/core hora-tiebreak.test.ts -t "I92-"` を実行して、`I92-01` と `I92-02` の **2件とも FAIL(KILLED)** することを確認する。確認後、`git checkout -- src/core/hora.ts` で復元する。
  - **手順4-4(最終復元確認)**: `git status --porcelain -- src/core/hora.ts` の出力が空(未コミット差分なし)であることを確認する。
- [ ] 5. **全体チェックの通過確認**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test`・`npm run build` がすべて exit code 0 で成功すること。
- [ ] 6. **リモート未プッシュ・PR未作成の確認**: `git ls-remote --heads origin test/issue-92-hora-tiebreak-fu` の出力が空であり、かつ `gh pr list --head test/issue-92-hora-tiebreak-fu` の標準出力が空(該当PR 0件)であることを確認する。

## 8. 後続Issueへの引き継ぎ事項

- `docs/mahjong-rules.md` §4.3「解釈が複数あるときの選択(Issue #82)」の冒頭(L167)には、Issue #82 製造時に貼られた `【設計案】` タグが残っている。本 Issue #92 のスコープは `src/core/hora-tiebreak.test.ts` の単体テスト追加のみであるため `docs/mahjong-rules.md` は変更しないが、ルール仕様書の整理を行う後続作業で `【確定】` タグへ更新することが望ましい。
