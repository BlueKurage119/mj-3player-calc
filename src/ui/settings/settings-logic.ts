import type { Rule } from '../../core/rule';
import { type NumberRuleItem, RULE_ITEMS } from '../../core/rule-items';
import { type RuleStorage, saveRule } from '../../core/rule-storage';
import { DETAIL_RULE_KEYS } from './rule-groups';

const RULE_ITEM_MAP = new Map(RULE_ITEMS.map(item => [item.key, item]));

/**
 * 本場・供託の入力文字列を確定値へコミットする
 * - 空文字は現在の値を維持
 * - min 未満は min、max 超過は max
 * - それ以外は下側の step 刻みへ切り捨て
 */
export function commitPointValue(
  raw: string,
  item: NumberRuleItem,
  current: number
): number {
  if (raw === '') {
    return current;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    return current;
  }
  if (n < item.min) {
    return item.min;
  }
  if (n > item.max) {
    return item.max;
  }
  return item.min + Math.floor((n - item.min) / item.step) * item.step;
}

/**
 * 数字以外の文字（全角数字・英字・記号など）を除去する
 */
export function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * 詳細設定項目の中で、既定値から変更されている項目のラベル一覧を DETAIL_RULE_KEYS 順で返す
 */
export function changedDetailLabels(rule: Rule): string[] {
  const result: string[] = [];
  for (const key of DETAIL_RULE_KEYS) {
    const item = RULE_ITEM_MAP.get(key);
    if (item && rule[key] !== item.defaultValue) {
      result.push(item.label);
    }
  }
  return result;
}

/**
 * 変更された詳細項目のラベル一覧から、アコーディオン閉時の副テキストを生成する
 * - 0件 → null
 * - 1〜3件 → 「・」区切り (例: 「本場・供託」)
 * - 4件以上 → 先頭3件「・」区切り + 「ほか{N}件」 (例: 「本場・供託・数え役満ほか2件」)
 */
export function formatChangedSummary(labels: readonly string[]): string | null {
  if (labels.length === 0) {
    return null;
  }
  if (labels.length <= 3) {
    return labels.join('・');
  }
  const head = labels.slice(0, 3).join('・');
  const remaining = labels.length - 3;
  return `${head}ほか${remaining}件`;
}

/**
 * ルール値変更を適用し、localStorage へ保存する
 */
export function applyRuleChange<K extends keyof Rule>(
  rule: Rule,
  key: K,
  value: Rule[K],
  storage: RuleStorage | null
): { rule: Rule; saved: boolean } {
  const next: Rule = {
    ...rule,
    [key]: value
  };
  const saved = saveRule(storage, next);
  return { rule: next, saved };
}
