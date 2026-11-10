import type { Rule } from '../../core/rule';
import type { RuleItem } from '../../core/rule-items';

export const RULE_HELP_TEXTS: Partial<Record<RuleItem['key'], string>> = {
  north:
    '抜きドラ: 抜いた北1枚につき1飜。抜かずに手牌で使う北は客風牌。共通役牌: 北の刻子・槓子で1飜役「役牌：北」。',
  localYaku: '採用しているローカル役を一括でオン・オフする。',
  openRiichi:
    'オープンリーチは2飜、オープンダブルリーチは3飜。立直の選択肢に加わる。',
  doubleWindFu: '連風牌の雀頭の符を4符か2符から選ぶ。',
  honbaPoint:
    '1本場あたりの点数。ロンは放銃者が全額、ツモはツモられた2人が折半して払う。',
  depositPoint: '供託1本あたりの点数。和了者が本数×この点数を受け取る。',
  red: '赤ドラは5p・5sだけ。2枚は各1枚、4枚は各2枚。'
};

/** ツモ損ダイアログの選択肢ごとの説明 (docs/mahjong-rules.md §4.2.2 の確定事項) */
export const TSUMO_LOSS_DESCRIPTIONS: Record<Rule['tsumoLoss'], string> = {
  loss: '通常どおり計算し、北家の負担分は誰も払わない',
  'north-split': '北家の負担額を、ツモられた2人で折半して上乗せする',
  'ron-split': 'ロンの打点を、親子に関わらず2人で折半して支払う'
};
