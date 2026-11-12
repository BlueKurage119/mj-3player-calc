// 出典: livewing/mahjong-calc (src/components/{Score,LimitBadge,FuDetail}.tsx) を参考に作成
import type { Fu } from '../../../core/fu';
import type { HoraScore } from '../../../core/hora-score';
import type { Payment } from '../../../core/payment';
import type { Table } from '../../../core/table';
import type { TileCountsIndex } from '../../../core/tile';
import type { NormalYaku, Yakuman } from '../../../core/yaku';
import { formatNumber, formatPoints } from '../hora-summary';
import {
  FU_LABELS,
  type FuLabelKey,
  LIMIT_LABELS,
  type LimitKey,
  YAKU_LABELS,
  YAKUMAN_LABELS,
  YAKUMAN_MULTIPLE_LABELS
} from './labels';

/** 役名の表示文字列 */
export const yakuLabel = (
  name: NormalYaku['name'] | Yakuman['name']
): string => {
  if (name in YAKU_LABELS) {
    return YAKU_LABELS[name as NormalYaku['name']];
  }
  if (name in YAKUMAN_LABELS) {
    return YAKUMAN_LABELS[name as Yakuman['name']];
  }
  return name;
};

/** 飜・役満の表示文字列 (例: "1飜", "役満", "二倍役満") */
export const yakuHanText = (yaku: NormalYaku | Yakuman): string => {
  if (yaku.type === 'yaku') {
    return `${yaku.han}飜`;
  }
  return YAKUMAN_MULTIPLE_LABELS[yaku.point] ?? `${yaku.point}倍役満`;
};

/** 限度名のバッジ文字列 (満貫未満は null) */
export const limitName = (score: HoraScore): string | null => {
  if (score.yakumanPoint > 0) {
    return (
      YAKUMAN_MULTIPLE_LABELS[score.yakumanPoint] ??
      `${score.yakumanPoint}倍役満`
    );
  }
  if (score.basePoint >= 8000) return LIMIT_LABELS['kazoe-yakuman'];
  if (score.basePoint >= 6000) return LIMIT_LABELS.sanbaiman;
  if (score.basePoint >= 4000) return LIMIT_LABELS.baiman;
  if (score.basePoint >= 3000) return LIMIT_LABELS.haneman;
  if (score.basePoint >= 2000) return LIMIT_LABELS.mangan;
  return null;
};

/** 雀頭の符ラベルキーを決定する */
export const headFuKey = (
  headTile: TileCountsIndex,
  fu: number,
  table?: Table
): FuLabelKey => {
  if (fu === 0) return 'head';
  // 三元牌 (白: 31, 發: 32, 中: 33)
  if (headTile >= 31) return 'dragon-head';
  // 風牌 (東: 27, 南: 28, 西: 29, 北: 30)
  if (headTile >= 27 && headTile <= 30) {
    if (table) {
      const winds = ['east', 'south', 'west', 'north'];
      const isRound = headTile === 27 + winds.indexOf(table.round);
      const isSeat = headTile === 27 + winds.indexOf(table.seat);
      if (isRound && isSeat) return 'double-wind-head';
      if (isRound) return 'round-wind-head';
      if (isSeat) return 'seat-wind-head';
      if (headTile === 30) return 'north-head';
      return 'wind-head';
    }
    return 'wind-head';
  }
  return 'head';
};

/** 刻子の符ラベルキーを決定する */
export const kotsuFuKey = (
  tile: TileCountsIndex,
  kotsuType: 'minko' | 'anko' | 'minkan' | 'ankan'
): FuLabelKey => {
  const isYaochu = tile >= 27 || tile % 9 === 0 || tile % 9 === 8;
  const prefix = isYaochu ? 'yaochu' : 'chunchan';
  return `${prefix}-${kotsuType}` as FuLabelKey;
};

/** 符項目の表示名を取得する */
export const fuRowName = (
  fuItem: Fu,
  table?: Table
): { name: string; key: FuLabelKey } => {
  switch (fuItem.type) {
    case 'futei':
      return { name: FU_LABELS.futei, key: 'futei' };
    case 'shuntsu':
      return { name: FU_LABELS.shuntsu, key: 'shuntsu' };
    case 'kotsu': {
      const key = kotsuFuKey(fuItem.tile, fuItem.kotsuType);
      return { name: FU_LABELS[key], key };
    }
    case 'head': {
      const key = headFuKey(fuItem.tile, fuItem.fu, table);
      return { name: FU_LABELS[key], key };
    }
    case 'waiting': {
      const key = fuItem.waitingType;
      return { name: FU_LABELS[key], key };
    }
    case 'menzen-ron':
      return { name: FU_LABELS['menzen-ron'], key: 'menzen-ron' };
    case 'tsumo':
      return { name: FU_LABELS.tsumo, key: 'tsumo' };
    case 'pinfu-tsumo':
      return { name: FU_LABELS['pinfu-tsumo'], key: 'pinfu-tsumo' };
  }
};

/** 次の段階のバッジ文字列 (例: "＋1飜で跳満") */
export const nextTierText = (tier: {
  plusHan: number;
  limit: LimitKey;
}): string => {
  return `＋${tier.plusHan}飜で${LIMIT_LABELS[tier.limit]}`;
};

/**
 * 支払いの内訳行を返す
 * ツモ: (1) payment.honba > 0 のとき「は {formatPoints(payment, true)}」
 *      (2) 常に「合計 {total}点」、bonus > 0 なら「合計 {total}(+{bonus})点」
 * ロン: (1) payment.honba > 0 のとき「は {formatPoints(payment, true)}」
 *      (2) payment.bonus > 0 のとき「(+{bonus})点」
 */
export const payDetailLines = (payment: Payment): string[] => {
  const lines: string[] = [];
  if (payment.detail.by === 'tsumo') {
    if (payment.honba > 0) {
      lines.push(`は ${formatPoints(payment, true)}`);
    }
    const bonusPart =
      payment.bonus > 0 ? `(+${formatNumber(payment.bonus)})` : '';
    lines.push(`合計 ${formatNumber(payment.total)}${bonusPart}点`);
    return lines;
  }

  // ロン
  if (payment.honba > 0) {
    lines.push(`は ${formatPoints(payment, true)}`);
  }
  if (payment.bonus > 0) {
    lines.push(`(+${formatNumber(payment.bonus)})点`);
  }
  return lines;
};

/** 基本点行テキスト */
/** 基本点の式(符の内訳の下に出す)。満貫以上は限度名と基本点だけ、満貫未満は 符 × 2^(飜+2) */
export type BaseFormula =
  | { kind: 'formula'; fu: number; han: number; base: number }
  | { kind: 'limit'; name: string; base: number };

export const baseFormula = (score: HoraScore, fu: number): BaseFormula => {
  const name = limitName(score);
  if (name !== null) {
    return { kind: 'limit', name, base: score.basePoint };
  }
  return { kind: 'formula', fu, han: score.han, base: score.basePoint };
};

export const formatBasePointText = (basePoint: number): string => {
  return `基本点 ${basePoint}`;
};

/** 符内訳の見出しテキスト (例: "符 30", "符 34 → 40", "符 25") */
export const formatFuSummary = (
  rawFu: number,
  displayFu: number | null,
  horaType: 'mentsu' | 'chitoitsu' | 'kokushi' | 'shisanputa'
): string => {
  if (horaType === 'chitoitsu') {
    return '符 25';
  }
  if (rawFu % 10 !== 0) {
    const ceilFu = displayFu ?? Math.ceil(rawFu / 10) * 10;
    return `符 ${rawFu} → ${ceilFu}`;
  }
  return `符 ${rawFu}`;
};

/** 点差(和了で相手との点差が縮まる額)の1行 */
export interface PointDiffRow {
  label: string;
  /** 「N点」の N(本場・供託を含む) */
  points: number;
}

/**
 * 点差の行を作る(livewing の PointDiff を三麻に合わせたもの)。
 * 和了者の受取総額(打点+本場+供託)に、相手の支払い(本場込み)を足す。支払わない相手は受取総額だけ。
 * ロン: 放銃者・傍観者。ツモ: 親が和了または親と子の差がない(ロン打点折半など)ときは「他家」、
 * 子が和了して差があるときは「親」「子」。
 */
export const pointDiffRows = (payment: Payment): PointDiffRow[] => {
  const gain = payment.total + payment.bonus;
  const detail = payment.detail;
  if (detail.by === 'ron') {
    return [
      { label: '放銃者との点差', points: gain + detail.discarder.withHonba },
      { label: '傍観者との点差', points: gain }
    ];
  }
  if (detail.winner === 'dealer') {
    return [
      {
        label: '他家との点差',
        points: gain + detail.eachNonDealer.withHonba
      }
    ];
  }
  const dealerPoints = gain + detail.dealer.withHonba;
  const nonDealerPoints = gain + detail.nonDealer.withHonba;
  if (dealerPoints === nonDealerPoints) {
    return [{ label: '他家との点差', points: dealerPoints }];
  }
  return [
    { label: '親との点差', points: dealerPoints },
    { label: '子との点差', points: nonDealerPoints }
  ];
};
