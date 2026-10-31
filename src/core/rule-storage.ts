import {
  type Rule,
  type RuleIssue,
  DEFAULT_RULE,
  createDefaultRule,
  isValidRule,
  validateRule
} from './rule';

/** 保存キー */
export const RULE_STORAGE_KEY = 'mj3calc.rule';

/** 現行の保存形式の版。保存形式(Rule の項目構成)を非互換に変えたら上げる */
export const RULE_STORAGE_VERSION = 1;

/** 保存されるJSONの形 */
export interface StoredRule {
  version: number;
  rule: Rule;
}

/** 保存先 */
export type RuleStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type RuleResetReason = 'unavailable' | 'parse' | 'format' | 'version';

export interface LoadedRule {
  rule: Rule;
  /** 補完した項目(validateRule の結果そのまま)。reset 時と保存データ無しのときは空 */
  issues: RuleIssue[];
  /** ルール全体を既定に戻したか */
  reset: boolean;
  /** reset の理由。reset が false なら null */
  resetReason: RuleResetReason | null;
  /** 保存データが存在したか(getItem が null 以外を返した) */
  found: boolean;
}

const pickRule = (rule: Rule): Record<string, unknown> => {
  const keys = Object.keys(DEFAULT_RULE) as (keyof Rule)[];
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    picked[key] = rule[key];
  }
  return picked;
};

const createResetResult = (resetReason: RuleResetReason): LoadedRule => ({
  rule: createDefaultRule(),
  issues: [],
  reset: true,
  resetReason,
  found: true
});

export const serializeRule = (rule: Rule): string =>
  JSON.stringify({
    version: RULE_STORAGE_VERSION,
    rule: pickRule(rule)
  });

export const restoreRule = (raw: string | null): LoadedRule => {
  if (raw === null) {
    return {
      rule: createDefaultRule(),
      issues: [],
      reset: false,
      resetReason: null,
      found: false
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return createResetResult('parse');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return createResetResult('format');
  }

  const stored = parsed as Record<string, unknown>;
  if (stored.version !== RULE_STORAGE_VERSION) {
    return createResetResult('version');
  }

  if (
    typeof stored.rule !== 'object' ||
    stored.rule === null ||
    Array.isArray(stored.rule)
  ) {
    return createResetResult('format');
  }

  const storedRule = stored.rule as Record<string, unknown>;
  const issues = validateRule(storedRule);
  const bad = new Set(issues.map(i => i.key));
  const keys = Object.keys(DEFAULT_RULE) as (keyof Rule)[];
  const built: Record<string, unknown> = {};

  for (const key of keys) {
    built[key] = bad.has(key) ? DEFAULT_RULE[key] : storedRule[key];
  }

  if (!isValidRule(built)) {
    return createResetResult('format');
  }

  return {
    rule: built,
    issues,
    reset: false,
    resetReason: null,
    found: true
  };
};

export const loadRule = (
  storage: RuleStorage | null | undefined
): LoadedRule => {
  if (!storage) {
    return {
      rule: createDefaultRule(),
      issues: [],
      reset: true,
      resetReason: 'unavailable',
      found: false
    };
  }

  let raw: string | null;
  try {
    raw = storage.getItem(RULE_STORAGE_KEY);
  } catch {
    return {
      rule: createDefaultRule(),
      issues: [],
      reset: true,
      resetReason: 'unavailable',
      found: false
    };
  }

  return restoreRule(raw);
};

export const saveRule = (
  storage: RuleStorage | null | undefined,
  rule: Rule
): boolean => {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(RULE_STORAGE_KEY, serializeRule(rule));
    return true;
  } catch {
    return false;
  }
};
