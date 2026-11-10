import type { Rule } from '../../core/rule';
import type { RuleItem } from '../../core/rule-items';

/** 設定画面での表示名。core の label を使わない項目だけ上書きする(積み棒は画面全体で共通の呼び名に揃える) */
export const RULE_LABEL_OVERRIDES: Partial<Record<RuleItem['key'], string>> = {
  honbaPoint: '積み棒'
};

/** 設定画面で表示する項目名 */
export const ruleItemLabel = (item: Pick<RuleItem, 'key' | 'label'>): string =>
  RULE_LABEL_OVERRIDES[item.key] ?? item.label;

/** help ツールチップの文言(改行は \n。表示側で改行として扱う)。連風牌の雀頭・ツモ損には付けない */
export const RULE_HELP_TEXTS: Partial<Record<RuleItem['key'], string>> = {
  north:
    '抜きドラ: 抜いた北1枚につき1飜。抜かずに手牌で使う北は客風牌扱いです。\n共通役牌: 北の刻子・槓子で1飜役「役牌：北」。',
  localYaku: '採用しているローカル役を一括でオン・オフします。',
  openRiichi:
    'オープンリーチは2飜、オープンダブルリーチは3飜です。立直の選択肢に加わります。',
  honbaPoint:
    '0〜10,000点の範囲内で、200の整数倍になるように指定してください。',
  depositPoint:
    '0〜10,000点の範囲内で、100の整数倍になるように指定してください。',
  red: '2枚では各1枚、4枚では各2枚の5筒・5索を赤ドラにします。',
  roundedMangan: '基本点1,920点（子のロン7,700点）を満貫にできます。',
  multipleYakuman: 'オフにすると、点数の高い役満で計算されます。'
};

/** ツモ損ダイアログの選択肢ごとの説明 (docs/mahjong-rules.md §3.1 の確定事項) */
export const TSUMO_LOSS_DESCRIPTIONS: Record<Rule['tsumoLoss'], string> = {
  loss: '通常どおり計算し、北家の負担分は誰も払わない',
  'north-split': '北家の負担額を、ツモられた2人で折半して上乗せする',
  'ron-split': 'ロンの打点を、親子に関わらず2人で折半して支払う'
};
