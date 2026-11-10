import { describe, expect, it } from 'vitest';
import type { HandOptions } from '../../core/input';
import { createDefaultRule } from '../../core/rule';
import type { Table, Wind } from '../../core/table';
import {
  composeRiichi,
  formatWinds,
  handleSituationBodyKey,
  isSituationKeyEnabled,
  isSituationKeyVisible,
  normalizeHandOptions,
  situationLabels,
  situationSheetModel,
  splitRiichi,
  tenhoLabel
} from './situation-rules';

const createTestHandOptions = (
  overrides?: Partial<HandOptions>
): HandOptions => ({
  riichi: 'none',
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false,
  tsubameGaeshi: false,
  kanFuri: false,
  ...overrides
});

const createTestTable = (overrides?: Partial<Table>): Table => ({
  round: 'east',
  seat: 'east',
  continue: 0,
  deposit: 0,
  ...overrides
});

describe('situation-rules (D5)', () => {
  it('D5-C1: composeRiichi と splitRiichi を base3×open2 で往復検証する', () => {
    // 6通りの往復
    // 1. none, false -> 'none' -> { base: 'none', open: false }
    expect(composeRiichi('none', false)).toBe('none');
    expect(splitRiichi('none')).toEqual({ base: 'none', open: false });

    // 2. none, true -> 'none' (仕様: base='none' なら open を無視して 'none')
    expect(composeRiichi('none', true)).toBe('none');

    // 3. riichi, false -> 'riichi' -> { base: 'riichi', open: false }
    expect(composeRiichi('riichi', false)).toBe('riichi');
    expect(splitRiichi('riichi')).toEqual({ base: 'riichi', open: false });

    // 4. riichi, true -> 'open-riichi' -> { base: 'riichi', open: true }
    expect(composeRiichi('riichi', true)).toBe('open-riichi');
    expect(splitRiichi('open-riichi')).toEqual({ base: 'riichi', open: true });

    // 5. double-riichi, false -> 'double-riichi' -> { base: 'double-riichi', open: false }
    expect(composeRiichi('double-riichi', false)).toBe('double-riichi');
    expect(splitRiichi('double-riichi')).toEqual({
      base: 'double-riichi',
      open: false
    });

    // 6. double-riichi, true -> 'open-double-riichi' -> { base: 'double-riichi', open: true }
    expect(composeRiichi('double-riichi', true)).toBe('open-double-riichi');
    expect(splitRiichi('open-double-riichi')).toEqual({
      base: 'double-riichi',
      open: true
    });
  });

  it('D5-C2: isSituationKeyVisible/Enabled を rule と riichi で網羅する', () => {
    const defaultRule = createDefaultRule(); // ippatsu: true, localYaku: false, openRiichi: false
    const customRule = {
      ...defaultRule,
      ippatsu: false,
      localYaku: true
    };

    // isSituationKeyVisible
    expect(isSituationKeyVisible('ippatsu', defaultRule)).toBe(true);
    expect(isSituationKeyVisible('ippatsu', customRule)).toBe(false);

    expect(isSituationKeyVisible('tsubameGaeshi', defaultRule)).toBe(false);
    expect(isSituationKeyVisible('tsubameGaeshi', customRule)).toBe(true);
    expect(isSituationKeyVisible('kanFuri', defaultRule)).toBe(false);
    expect(isSituationKeyVisible('kanFuri', customRule)).toBe(true);

    for (const key of ['rinshan', 'chankan', 'haitei', 'tenho'] as const) {
      expect(isSituationKeyVisible(key, defaultRule)).toBe(true);
      expect(isSituationKeyVisible(key, customRule)).toBe(true);
    }

    // isSituationKeyEnabled
    const optsNone = createTestHandOptions({ riichi: 'none' });
    const optsRiichi = createTestHandOptions({ riichi: 'riichi' });

    // ippatsu: riichi=none では false、riichi では true(ただし rule.ippatsu=true の場合)
    expect(isSituationKeyEnabled('ippatsu', optsNone, defaultRule)).toBe(false);
    expect(isSituationKeyEnabled('ippatsu', optsRiichi, defaultRule)).toBe(
      true
    );
    expect(isSituationKeyEnabled('ippatsu', optsRiichi, customRule)).toBe(
      false
    );

    // localYaku 役
    expect(isSituationKeyEnabled('tsubameGaeshi', optsNone, defaultRule)).toBe(
      false
    );
    expect(isSituationKeyEnabled('tsubameGaeshi', optsNone, customRule)).toBe(
      true
    );
    expect(isSituationKeyEnabled('kanFuri', optsNone, defaultRule)).toBe(false);
    expect(isSituationKeyEnabled('kanFuri', optsNone, customRule)).toBe(true);

    // 常時有効な偶然役
    for (const key of ['rinshan', 'chankan', 'haitei', 'tenho'] as const) {
      expect(isSituationKeyEnabled(key, optsNone, defaultRule)).toBe(true);
      expect(isSituationKeyEnabled(key, optsRiichi, defaultRule)).toBe(true);
    }
  });

  it('D5-C3: tenhoLabel を seat(東・南・西) × localYaku(真偽) で検証する', () => {
    const defaultRule = createDefaultRule(); // localYaku: false
    const localYakuRule = { ...defaultRule, localYaku: true };

    const seats: Wind[] = ['east', 'south', 'west'];

    for (const seat of seats) {
      const table = createTestTable({ seat });
      if (seat === 'east') {
        expect(tenhoLabel(table, defaultRule)).toBe('天和');
        expect(tenhoLabel(table, localYakuRule)).toBe('天和');
      } else {
        expect(tenhoLabel(table, defaultRule)).toBe('地和');
        expect(tenhoLabel(table, localYakuRule)).toBe('地和/人和');
      }
    }
  });

  it('D5-C4: normalizeHandOptions でオープン立直・一発・ローカル役の正規化と同一参照を検証する', () => {
    const ruleStandard = createDefaultRule(); // openRiichi: false, ippatsu: true, localYaku: false
    const ruleAllEnabled = {
      ...ruleStandard,
      openRiichi: true,
      ippatsu: true,
      localYaku: true
    };
    const ruleNoIppatsu = {
      ...ruleStandard,
      ippatsu: false
    };

    // 1. openRiichi=false で open-riichi / open-double-riichi が非オープンへ落ちる
    const optsOpen = createTestHandOptions({ riichi: 'open-riichi' });
    expect(normalizeHandOptions(optsOpen, ruleStandard).riichi).toBe('riichi');

    const optsOpenDouble = createTestHandOptions({
      riichi: 'open-double-riichi'
    });
    expect(normalizeHandOptions(optsOpenDouble, ruleStandard).riichi).toBe(
      'double-riichi'
    );

    // openRiichi=true なら保持される
    expect(normalizeHandOptions(optsOpen, ruleAllEnabled).riichi).toBe(
      'open-riichi'
    );

    // 2. ippatsu=false ルールで ippatsu=false
    const optsIppatsu = createTestHandOptions({
      riichi: 'riichi',
      ippatsu: true
    });
    expect(normalizeHandOptions(optsIppatsu, ruleNoIppatsu).ippatsu).toBe(
      false
    );

    // 3. riichi='none' かつ ippatsu=true で ippatsu=false
    const optsNoneIppatsu = createTestHandOptions({
      riichi: 'none',
      ippatsu: true
    });
    expect(normalizeHandOptions(optsNoneIppatsu, ruleStandard).ippatsu).toBe(
      false
    );

    // 4. localYaku=false で 燕返し/槓振り が false
    const optsLocal = createTestHandOptions({
      tsubameGaeshi: true,
      kanFuri: true
    });
    const normalizedLocal = normalizeHandOptions(optsLocal, ruleStandard);
    expect(normalizedLocal.tsubameGaeshi).toBe(false);
    expect(normalizedLocal.kanFuri).toBe(false);

    // localYaku=true なら保持される
    const keptLocal = normalizeHandOptions(optsLocal, ruleAllEnabled);
    expect(keptLocal.tsubameGaeshi).toBe(true);
    expect(keptLocal.kanFuri).toBe(true);

    // 5. 変化なしの場合は同一参照を返す
    const cleanOpts = createTestHandOptions({
      riichi: 'riichi',
      ippatsu: true,
      rinshan: true
    });
    expect(normalizeHandOptions(cleanOpts, ruleStandard)).toBe(cleanOpts);
  });

  it('D5-C20: handleSituationBodyKey を 4通り網羅して検証する', () => {
    // 1. 非選択中 Enter -> シートが開く
    expect(handleSituationBodyKey('Enter', false)).toEqual({
      openSheet: true,
      preventDefault: false
    });

    // 2. 非選択中 Space -> 開く・スクロール防止
    expect(handleSituationBodyKey(' ', false)).toEqual({
      openSheet: true,
      preventDefault: true
    });
    expect(handleSituationBodyKey('Spacebar', false)).toEqual({
      openSheet: true,
      preventDefault: true
    });

    // 3. 選択中 Enter -> 何も起きない (シートは開いたまま)
    expect(handleSituationBodyKey('Enter', true)).toEqual({
      openSheet: false,
      preventDefault: false
    });

    // 4. 選択中 Space -> 何も起きない
    expect(handleSituationBodyKey(' ', true)).toEqual({
      openSheet: false,
      preventDefault: false
    });

    // その他キー
    expect(handleSituationBodyKey('Tab', false)).toEqual({
      openSheet: false,
      preventDefault: false
    });
  });

  it('formatWinds: 場風・自風をフォーマットする', () => {
    expect(formatWinds(createTestTable({ round: 'east', seat: 'south' }))).toBe(
      '東場・南家'
    );
    expect(formatWinds(createTestTable({ round: 'south', seat: 'west' }))).toBe(
      '南場・西家'
    );
    expect(formatWinds(createTestTable({ round: 'west', seat: 'east' }))).toBe(
      '西場・東家'
    );
  });

  it('situationLabels: 表示順序と文言を検証する', () => {
    const rule = {
      ...createDefaultRule(),
      openRiichi: true,
      localYaku: true
    };
    const table = createTestTable({ seat: 'south' });

    // 全役有効
    const opts = createTestHandOptions({
      riichi: 'open-double-riichi',
      ippatsu: true,
      rinshan: true,
      chankan: true,
      haitei: true,
      tenho: true,
      tsubameGaeshi: true,
      kanFuri: true
    });

    // 順序: 立直系 → 一発 → 嶺上開花 → 槍槓 → 海底/河底 → 天和系 → 燕返し → 槓振り
    expect(situationLabels(opts, table, rule)).toEqual([
      'オープンダブル立直',
      '一発',
      '嶺上開花',
      '槍槓',
      '海底/河底',
      '地和/人和',
      '燕返し',
      '槓振り'
    ]);

    // なしの場合
    expect(situationLabels(createTestHandOptions(), table, rule)).toEqual([]);
  });

  it('situationSheetModel: chip の key, label, selected, disabled 出し分けを検証する', () => {
    const defaultRule = createDefaultRule(); // ippatsu: true, localYaku: false
    const table = createTestTable({ seat: 'east' });
    const opts = createTestHandOptions({ riichi: 'none', rinshan: true });

    const model = situationSheetModel(opts, table, defaultRule);
    // localYaku 役は出ない。ippatsu は visible だが disabled
    expect(model.map(m => m.key)).toEqual([
      'ippatsu',
      'rinshan',
      'chankan',
      'haitei',
      'tenho'
    ]);

    const ippatsuChip = model.find(m => m.key === 'ippatsu');
    expect(ippatsuChip?.disabled).toBe(true);
    expect(ippatsuChip?.selected).toBe(false);

    const rinshanChip = model.find(m => m.key === 'rinshan');
    expect(rinshanChip?.disabled).toBe(false);
    expect(rinshanChip?.selected).toBe(true);

    const tenhoChip = model.find(m => m.key === 'tenho');
    expect(tenhoChip?.label).toBe('天和');
  });
});
