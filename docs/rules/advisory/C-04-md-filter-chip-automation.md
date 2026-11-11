---
title: md-filter-chip の自動操作の罠
description: 自動操作で md-filter-chip の host 要素に click() を送っても選択状態が切り替わらない。切り替わる操作と、実機の挙動
phases: [検収]
products: [Claude]
notes: Claude Codeのブラウザ操作(mcp__Claude_Browser__* の javascript_tool・computer)で確認した事実。Codex/Antigravityの同等ツールでの挙動は未確認
---

# md-filter-chip の自動操作の罠

対象: 主に`mj3calc-inspector`(検収)。ブラウザ操作で`md-filter-chip`(`MdFilterChip`ラッパー経由で使う選択チップ)の選択状態を切り替えて確認する場面。ここに書くのは確認の例であり、必須事項ではない(必須事項は業務標準を参照)。

**出典: このリポジトリのD5(状況入力、[docs/design/issue-49-situation-input.md](../../design/issue-49-situation-input.md))の検収・監修中に判明した。**

## 事象

- 自動操作(DevToolsの`javascript`や`computer`操作)で`md-filter-chip`のhost要素に`.click()`を送っても、選択状態が切り替わらない。
- 切り替わる操作は次の2つ。
  - shadow DOM内の`button`に対して`click()`する。
  - 実際のポインタ操作(座標クリック)を使う。
- 実機のタップでは問題なく切り替わる。つまり実装の欠陥ではなく、自動操作側の制約である。

## 対処

1. チップを切り替える検証では、host要素への`.click()`で「切り替わらない」結果になっても、すぐ実装の不具合と判定しない。
2. shadow DOM内の`button`への`click()`か、座標クリックで再確認する。
3. それでも判断できないときは、実機タップでの確認を[C-02-ui-verification-backorder.md](C-02-ui-verification-backorder.md)の逆発注でユーザーへ回す。
