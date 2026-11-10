import type { HandOptions } from '../../core/input';
import type { Rule } from '../../core/rule';
import type { Table, Wind } from '../../core/table';

export type RiichiBase = 'none' | 'riichi' | 'double-riichi';

export type SituationToggleKey =
  | 'ippatsu'
  | 'rinshan'
  | 'chankan'
  | 'haitei'
  | 'tenho'
  | 'tsubameGaeshi'
  | 'kanFuri';

const WIND_KANJI: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西'
};

export function splitRiichi(r: HandOptions['riichi']): {
  base: RiichiBase;
  open: boolean;
} {
  switch (r) {
    case 'open-riichi':
      return { base: 'riichi', open: true };
    case 'open-double-riichi':
      return { base: 'double-riichi', open: true };
    case 'riichi':
      return { base: 'riichi', open: false };
    case 'double-riichi':
      return { base: 'double-riichi', open: false };
    case 'none':
      return { base: 'none', open: false };
    default:
      return { base: 'none', open: false };
  }
}

export function composeRiichi(
  base: RiichiBase,
  open: boolean
): HandOptions['riichi'] {
  if (base === 'none') {
    return 'none';
  }
  if (base === 'riichi') {
    return open ? 'open-riichi' : 'riichi';
  }
  return open ? 'open-double-riichi' : 'double-riichi';
}

export function isSituationKeyVisible(
  key: SituationToggleKey,
  rule: Rule
): boolean {
  if (key === 'ippatsu') {
    return rule.ippatsu;
  }
  if (key === 'tsubameGaeshi' || key === 'kanFuri') {
    return rule.localYaku;
  }
  return true;
}

export function isSituationKeyEnabled(
  key: SituationToggleKey,
  opts: HandOptions,
  rule: Rule
): boolean {
  if (!isSituationKeyVisible(key, rule)) {
    return false;
  }
  if (key === 'ippatsu') {
    return opts.riichi !== 'none';
  }
  return true;
}

export function tenhoLabel(table: Table, rule: Rule): string {
  if (table.seat === 'east') {
    return '天和';
  }
  return rule.localYaku ? '地和/人和' : '地和';
}

export function situationLabels(
  opts: HandOptions,
  table: Table,
  rule: Rule
): string[] {
  const labels: string[] = [];

  // 立直系
  if (opts.riichi === 'riichi') {
    labels.push('立直');
  } else if (opts.riichi === 'double-riichi') {
    labels.push('ダブル立直');
  } else if (opts.riichi === 'open-riichi') {
    if (rule.openRiichi) {
      labels.push('オープン立直');
    }
  } else if (opts.riichi === 'open-double-riichi') {
    if (rule.openRiichi) {
      labels.push('オープンダブル立直');
    }
  }

  // 偶然役
  if (opts.ippatsu && isSituationKeyEnabled('ippatsu', opts, rule)) {
    labels.push('一発');
  }
  if (opts.rinshan && isSituationKeyEnabled('rinshan', opts, rule)) {
    labels.push('嶺上開花');
  }
  if (opts.chankan && isSituationKeyEnabled('chankan', opts, rule)) {
    labels.push('槍槓');
  }
  if (opts.haitei && isSituationKeyEnabled('haitei', opts, rule)) {
    labels.push('海底/河底');
  }
  if (opts.tenho && isSituationKeyEnabled('tenho', opts, rule)) {
    labels.push(tenhoLabel(table, rule));
  }
  if (
    opts.tsubameGaeshi &&
    isSituationKeyEnabled('tsubameGaeshi', opts, rule)
  ) {
    labels.push('燕返し');
  }
  if (opts.kanFuri && isSituationKeyEnabled('kanFuri', opts, rule)) {
    labels.push('槓振り');
  }

  return labels;
}

export function areHandOptionsEqual(a: HandOptions, b: HandOptions): boolean {
  return (
    a.riichi === b.riichi &&
    a.ippatsu === b.ippatsu &&
    a.rinshan === b.rinshan &&
    a.chankan === b.chankan &&
    a.haitei === b.haitei &&
    a.tenho === b.tenho &&
    a.tsubameGaeshi === b.tsubameGaeshi &&
    a.kanFuri === b.kanFuri
  );
}

export function normalizeHandOptions(
  opts: HandOptions,
  rule: Rule
): HandOptions {
  let nextRiichi = opts.riichi;
  if (!rule.openRiichi) {
    if (nextRiichi === 'open-riichi') {
      nextRiichi = 'riichi';
    } else if (nextRiichi === 'open-double-riichi') {
      nextRiichi = 'double-riichi';
    }
  }

  const nextIppatsu =
    !rule.ippatsu || nextRiichi === 'none' ? false : opts.ippatsu;
  const nextTsubame = !rule.localYaku ? false : opts.tsubameGaeshi;
  const nextKanFuri = !rule.localYaku ? false : opts.kanFuri;

  if (
    nextRiichi === opts.riichi &&
    nextIppatsu === opts.ippatsu &&
    nextTsubame === opts.tsubameGaeshi &&
    nextKanFuri === opts.kanFuri
  ) {
    return opts;
  }

  return {
    ...opts,
    riichi: nextRiichi,
    ippatsu: nextIppatsu,
    tsubameGaeshi: nextTsubame,
    kanFuri: nextKanFuri
  };
}

export function formatWinds(table: Table): string {
  return `${WIND_KANJI[table.round]}場・${WIND_KANJI[table.seat]}家`;
}

export interface SituationChipItem {
  key: SituationToggleKey;
  label: string;
  selected: boolean;
  disabled: boolean;
}

export function situationSheetModel(
  opts: HandOptions,
  table: Table,
  rule: Rule
): SituationChipItem[] {
  const items: SituationChipItem[] = [];

  const candidateKeys: SituationToggleKey[] = [
    'ippatsu',
    'rinshan',
    'chankan',
    'haitei',
    'tenho',
    'tsubameGaeshi',
    'kanFuri'
  ];

  for (const key of candidateKeys) {
    if (!isSituationKeyVisible(key, rule)) {
      continue;
    }
    let label: string;
    switch (key) {
      case 'ippatsu':
        label = '一発';
        break;
      case 'rinshan':
        label = '嶺上開花';
        break;
      case 'chankan':
        label = '槍槓';
        break;
      case 'haitei':
        label = '海底/河底';
        break;
      case 'tenho':
        label = tenhoLabel(table, rule);
        break;
      case 'tsubameGaeshi':
        label = '燕返し';
        break;
      case 'kanFuri':
        label = '槓振り';
        break;
    }
    items.push({
      key,
      label,
      selected: opts[key],
      disabled: !isSituationKeyEnabled(key, opts, rule)
    });
  }

  return items;
}

export interface SituationKeyHandlerResult {
  openSheet: boolean;
  preventDefault: boolean;
}

export function handleSituationBodyKey(
  key: string,
  isSelected: boolean
): SituationKeyHandlerResult {
  if (isSelected) {
    return { openSheet: false, preventDefault: false };
  }
  if (key === 'Enter') {
    return { openSheet: true, preventDefault: false };
  }
  if (key === ' ' || key === 'Spacebar') {
    return { openSheet: true, preventDefault: true };
  }
  return { openSheet: false, preventDefault: false };
}
