import type { RuleItem } from '../../core/rule-items';

export const RULE_HELP_TEXTS: Partial<Record<RuleItem['key'], string>> = {
  tsumoLoss:
    'ツモ損あり: 北家の負担分は誰も払わない。北家分折半: 北家の負担額をツモられた2人で折半して上乗せする。ロン打点折半: ロンの打点を2人で折半して支払う。',
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
