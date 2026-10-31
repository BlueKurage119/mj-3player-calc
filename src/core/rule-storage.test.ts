import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_RULE, type Rule, compareRules, isValidRule } from './rule';
import {
  RULE_STORAGE_KEY,
  RULE_STORAGE_VERSION,
  type RuleStorage,
  loadRule,
  restoreRule,
  saveRule,
  serializeRule
} from './rule-storage';

/** 全項目を所定値以外に変えたルール */
const createCustomRule = (): Rule => ({
  red: 2,
  honbaPoint: 400,
  depositPoint: 500,
  ippatsu: false,
  kuitan: false,
  roundedMangan: true,
  doubleWindFu: 2,
  accumlatedYakuman: false,
  multipleYakuman: false,
  kokushi13DoubleYakuman: false,
  suankoTankiDoubleYakuman: false,
  daisushiDoubleYakuman: false,
  pureChurenDoubleYakuman: false,
  north: 'yakuhai',
  tsumoLoss: 'north-split',
  localYaku: true,
  openRiichi: true
});

describe('ルールの保存と版管理 (B2-S01〜S12)', () => {
  it('B2-S01: 往復シリアライズと復元', () => {
    const custom = createCustomRule();
    const serialized = serializeRule(custom);
    const restored = restoreRule(serialized);

    expect(compareRules(restored.rule, custom)).toBe(true);
    expect(restored.issues).toEqual([]);
    expect(restored.reset).toBe(false);
    expect(restored.resetReason).toBeNull();
    expect(restored.found).toBe(true);
  });

  it('B2-S02: シリアライズJSON形式と余分なキーの排除', () => {
    const custom = createCustomRule();
    const serialized = serializeRule(custom);
    const parsed = JSON.parse(serialized);

    expect(parsed.version).toBe(RULE_STORAGE_VERSION);
    const defaultKeys = Object.keys(DEFAULT_RULE).sort();
    expect(Object.keys(parsed.rule).sort()).toEqual(defaultKeys);

    // 余分なキーを足したルールを渡しても保存されない
    const ruleWithExtra = {
      ...custom,
      extraField: 'unexpected'
    } as unknown as Rule;
    const parsedWithExtra = JSON.parse(serializeRule(ruleWithExtra));
    expect(Object.keys(parsedWithExtra.rule).sort()).toEqual(defaultKeys);
    expect('extraField' in parsedWithExtra.rule).toBe(false);
  });

  it('B2-S03: 欠落した項目の個別補完', () => {
    const custom = createCustomRule();
    const targets: (keyof Rule)[] = [
      'north',
      'tsumoLoss',
      'localYaku',
      'openRiichi'
    ];

    for (const target of targets) {
      const customRecord = { ...custom } as Record<string, unknown>;
      delete customRecord[target];
      const raw = JSON.stringify({ version: 1, rule: customRecord });
      const restored = restoreRule(raw);

      expect(restored.issues.map(i => i.key)).toEqual([target]);
      expect(restored.rule[target]).toBe(DEFAULT_RULE[target]);
      for (const key of Object.keys(DEFAULT_RULE) as (keyof Rule)[]) {
        if (key !== target) {
          expect(restored.rule[key]).toBe(custom[key]);
        }
      }
    }

    // 4項目すべて欠落かつ他は所定値
    const baseRecord = { ...DEFAULT_RULE } as Record<string, unknown>;
    for (const target of targets) {
      delete baseRecord[target];
    }
    const raw4 = JSON.stringify({ version: 1, rule: baseRecord });
    const restored4 = restoreRule(raw4);
    expect(compareRules(restored4.rule, DEFAULT_RULE)).toBe(true);
    expect(restored4.issues.length).toBe(4);
  });

  it('B2-S04: 不正値の個別補完とバリデーション', () => {
    const custom = createCustomRule();
    const invalidRecord = {
      ...custom,
      red: 3,
      honbaPoint: 100,
      kuitan: 1
    } as Record<string, unknown>;

    const raw = JSON.stringify({ version: 1, rule: invalidRecord });
    const restored = restoreRule(raw);

    const issueKeys = new Set(restored.issues.map(i => i.key));
    expect(issueKeys).toEqual(new Set(['red', 'honbaPoint', 'kuitan']));
    expect(restored.rule.red).toBe(DEFAULT_RULE.red);
    expect(restored.rule.honbaPoint).toBe(DEFAULT_RULE.honbaPoint);
    expect(restored.rule.kuitan).toBe(DEFAULT_RULE.kuitan);

    expect(restored.rule.depositPoint).toBe(custom.depositPoint);
    expect(restored.rule.ippatsu).toBe(custom.ippatsu);
    expect(restored.rule.north).toBe(custom.north);
    expect(restored.rule.tsumoLoss).toBe(custom.tsumoLoss);

    expect(isValidRule(restored.rule)).toBe(true);
    expect(restored.reset).toBe(false);
  });

  it('B2-S05: 保存データに含まれる余分なキーの除外', () => {
    const custom = createCustomRule();
    const raw = JSON.stringify({
      version: 1,
      rule: { ...custom, foo: 1 }
    });
    const restored = restoreRule(raw);
    expect('foo' in restored.rule).toBe(false);
    expect(restored.issues).toEqual([]);
  });

  it('B2-S06: 版番号不一致による全体リセット', () => {
    const custom = createCustomRule();
    const invalidVersions = [undefined, '1', 2, 0, 1.5, null];

    for (const ver of invalidVersions) {
      const payload: Record<string, unknown> = { rule: custom };
      if (ver !== undefined) {
        payload.version = ver;
      }
      const raw = JSON.stringify(payload);
      const restored = restoreRule(raw);

      expect(restored.reset).toBe(true);
      expect(restored.resetReason).toBe('version');
      expect(compareRules(restored.rule, DEFAULT_RULE)).toBe(true);
      expect(restored.issues).toEqual([]);
      expect(restored.found).toBe(true);
    }
  });

  it('B2-S07: 破損JSONおよび不正形式によるリセット', () => {
    // '{'・'' → 'parse'
    for (const broken of ['{', '']) {
      const restored = restoreRule(broken);
      expect(restored.reset).toBe(true);
      expect(restored.resetReason).toBe('parse');
      expect(compareRules(restored.rule, DEFAULT_RULE)).toBe(true);
      expect(restored.issues).toEqual([]);
      expect(restored.found).toBe(true);
    }

    // 'null'・'42'・'[]'・'"x"' → 'format'
    for (const notObj of ['null', '42', '[]', '"x"']) {
      const restored = restoreRule(notObj);
      expect(restored.reset).toBe(true);
      expect(restored.resetReason).toBe('format');
      expect(compareRules(restored.rule, DEFAULT_RULE)).toBe(true);
      expect(restored.issues).toEqual([]);
      expect(restored.found).toBe(true);
    }

    // {"version":1,"rule":null}・{"version":1} → 'format'
    for (const badRule of [
      JSON.stringify({ version: 1, rule: null }),
      JSON.stringify({ version: 1 })
    ]) {
      const restored = restoreRule(badRule);
      expect(restored.reset).toBe(true);
      expect(restored.resetReason).toBe('format');
      expect(compareRules(restored.rule, DEFAULT_RULE)).toBe(true);
      expect(restored.issues).toEqual([]);
      expect(restored.found).toBe(true);
    }
  });

  it('B2-S08: 保存データが存在しない場合(null)の初期化', () => {
    const restored = restoreRule(null);
    expect(restored.found).toBe(false);
    expect(restored.reset).toBe(false);
    expect(restored.resetReason).toBeNull();
    expect(restored.issues).toEqual([]);
    expect(compareRules(restored.rule, DEFAULT_RULE)).toBe(true);
  });

  it('B2-S09: 復元結果が毎回新しいオブジェクトであることの検証', () => {
    const s08Result = restoreRule(null);
    expect(s08Result.rule).not.toBe(DEFAULT_RULE);
    s08Result.rule.honbaPoint = 9999;
    expect(DEFAULT_RULE.honbaPoint).toBe(200);

    const s06Result = restoreRule(
      JSON.stringify({ version: 2, rule: createCustomRule() })
    );
    expect(s06Result.rule).not.toBe(DEFAULT_RULE);
    s06Result.rule.honbaPoint = 8888;
    expect(DEFAULT_RULE.honbaPoint).toBe(200);
  });

  it('B2-S10: loadRuleにおける保存データ不在時の挙動と不変性', () => {
    const map = new Map<string, string>();
    const setItemMock = vi.fn((key: string, value: string) => {
      map.set(key, value);
    });
    const getItemMock = vi.fn((key: string) => map.get(key) ?? null);
    const storage: RuleStorage = { getItem: getItemMock, setItem: setItemMock };

    const result = loadRule(storage);
    expect(compareRules(result.rule, DEFAULT_RULE)).toBe(true);
    expect(result.found).toBe(false);
    expect(setItemMock).toHaveBeenCalledTimes(0);

    // 補完が起きる保存値でも setItem は呼ばれない
    map.set(
      RULE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        rule: { red: 1 }
      })
    );
    setItemMock.mockClear();

    const result2 = loadRule(storage);
    expect(result2.found).toBe(true);
    expect(result2.issues.length).toBeGreaterThan(0);
    expect(setItemMock).toHaveBeenCalledTimes(0);
  });

  it('B2-S11: loadRuleにおけるストレージ無効または例外時のフォールバック', () => {
    const targets: (RuleStorage | null | undefined)[] = [
      null,
      undefined,
      {
        getItem: () => {
          throw new Error('Storage access denied');
        },
        setItem: () => {}
      }
    ];

    for (const storage of targets) {
      const result = loadRule(storage);
      expect(result.reset).toBe(true);
      expect(result.resetReason).toBe('unavailable');
      expect(result.found).toBe(false);
      expect(result.issues).toEqual([]);
      expect(compareRules(result.rule, DEFAULT_RULE)).toBe(true);
    }
  });

  it('B2-S12: saveRuleにおける正常保存・連携読み込みと例外ハンドリング', () => {
    const map = new Map<string, string>();
    const storage: RuleStorage = {
      getItem: key => map.get(key) ?? null,
      setItem: (key, value) => {
        map.set(key, value);
      }
    };
    const custom = createCustomRule();

    const saveResult = saveRule(storage, custom);
    expect(saveResult).toBe(true);
    expect(map.get(RULE_STORAGE_KEY)).toBe(serializeRule(custom));

    const loaded = loadRule(storage);
    expect(compareRules(loaded.rule, custom)).toBe(true);

    // setItem が例外の保存先・null
    expect(saveRule(null, custom)).toBe(false);

    const throwingStorage: RuleStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('Quota exceeded');
      }
    };
    expect(saveRule(throwingStorage, custom)).toBe(false);
  });
});
