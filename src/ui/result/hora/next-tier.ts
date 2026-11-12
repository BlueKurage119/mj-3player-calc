// 出典: mj-mighty-calc (src/core/payment.ts の nextTierHint) を参考に作成
import type { HoraScore } from '../../../core/hora-score';
import type { Rule } from '../../../core/rule';
import type { LimitKey } from './labels';

export type { LimitKey };

const DEFAULT_TIER_RULE: Pick<Rule, 'roundedMangan' | 'accumlatedYakuman'> = {
  roundedMangan: false,
  accumlatedYakuman: true
};

/** calculateBasePoint と同じしきい値で限度を返す(満貫未満は null) */
export const limitOf = (
  fu: number,
  han: number,
  rule: Pick<Rule, 'roundedMangan' | 'accumlatedYakuman'> = DEFAULT_TIER_RULE
): LimitKey | null => {
  if (rule.accumlatedYakuman && han >= 13) return 'kazoe-yakuman';
  if (han >= 11) return 'sanbaiman';
  if (han >= 8) return 'baiman';
  if (han >= 6) return 'haneman';
  const raw = fu * 2 ** (han + 2);
  if (han >= 5 || raw >= (rule.roundedMangan ? 1920 : 2000)) return 'mangan';
  return null;
};

/** 次の段階。役満・数え役満・それ以上がない場合は null */
export const nextTier = (
  score: HoraScore,
  rule?: Pick<Rule, 'roundedMangan' | 'accumlatedYakuman'> | undefined
): { plusHan: number; limit: LimitKey } | null => {
  if (score.yakumanPoint > 0) return null;
  const effectiveRule = rule ?? DEFAULT_TIER_RULE;
  const fu = score.fu ?? 0;
  const cur = limitOf(fu, score.han, effectiveRule);
  if (cur === 'kazoe-yakuman') return null;

  for (let k = 1; score.han + k <= 13; k++) {
    const next = limitOf(fu, score.han + k, effectiveRule);
    if (next !== null && next !== cur) {
      return { plusHan: k, limit: next };
    }
  }
  return null;
};
