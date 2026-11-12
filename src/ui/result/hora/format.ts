// 出典: livewing/mahjong-calc (src/components/{Score,LimitBadge,FuDetail}.tsx) を参考に作成
import type { Fu } from '../../../core/fu';
import type { HoraScore } from '../../../core/hora-score';
import type { Payment } from '../../../core/payment';
import type { Table } from '../../../core/table';
import type { TileCountsIndex } from '../../../core/tile';
import type { NormalYaku, Yakuman } from '../../../core/yaku';
import {
  FU_LABELS,
  type FuLabelKey,
  LIMIT_LABELS,
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

/** 本場込み打点 (ロン: "1400", 親ツモ: "900オール", 子ツモ: "600·900") */
export const formatPointsWithHonba = (payment: Payment): string => {
  if (payment.detail.by === 'ron') {
    return String(payment.detail.discarder.withHonba);
  }
  if (payment.detail.winner === 'dealer') {
    return `${payment.detail.eachNonDealer.withHonba}オール`;
  }
  return `${payment.detail.nonDealer.withHonba}·${payment.detail.dealer.withHonba}`;
};

/** 本場込みの行テキスト (payment.honba > 0 のときだけ。例: "は 1400") */
export const formatHonbaText = (payment: Payment): string | null => {
  if (payment.honba <= 0) return null;
  return `は ${formatPointsWithHonba(payment)}`;
};

/** 合計行テキスト (ツモは常時、ロンは bonus > 0 のとき) */
export const formatTotalText = (payment: Payment): string | null => {
  if (payment.detail.by === 'ron' && payment.bonus <= 0) {
    return null;
  }
  if (payment.bonus > 0) {
    return `合計 ${payment.total}(+${payment.bonus})点`;
  }
  return `合計 ${payment.total}点`;
};

/** 基本点行テキスト */
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
