// 出典: livewing/mahjong-calc locales/ja.yml を参考に作成
// 役名・符名・限度名の表示名。ユーザーが監修のために直接編集するファイル。
// ここには表(データ)だけを置き、文言の組み立ては format.ts に書く。
// 各行の末尾のコメントは出典(R=docs/mahjong-rules.md、I12/I14=設計書、L=livewing ja.yml、U=ユーザー確定、案=出典なし)。
import type { NormalYaku, Yakuman } from '../../../core/yaku';

export type FuLabelKey =
  | 'futei'
  | 'shuntsu'
  | 'menzen-ron'
  | 'tsumo'
  | 'pinfu-tsumo'
  | 'chitoitsu'
  | 'yaochu-minko'
  | 'yaochu-anko'
  | 'yaochu-minkan'
  | 'yaochu-ankan'
  | 'chunchan-minko'
  | 'chunchan-anko'
  | 'chunchan-minkan'
  | 'chunchan-ankan'
  | 'head'
  | 'double-wind-head'
  | 'round-wind-head'
  | 'seat-wind-head'
  | 'dragon-head'
  | 'north-head'
  | 'wind-head'
  | 'ryammen'
  | 'kanchan'
  | 'penchan'
  | 'shampon'
  | 'tanki';

export type LimitKey =
  | 'mangan'
  | 'haneman'
  | 'baiman'
  | 'sanbaiman'
  | 'kazoe-yakuman';

export const YAKU_LABELS: Record<NormalYaku['name'], string> = {
  riichi: '立直', // L
  'double-riichi': 'ダブル立直', // R・L
  ippatsu: '一発', // R・L
  honitsu: '混一色', // L
  tsumo: '門前清自摸和', // L
  junchan: '純全帯么九', // L
  tanyao: '断么九', // L
  ryampeko: '二盃口', // L
  pinfu: '平和', // L
  chinitsu: '清一色', // L
  iipeko: '一盃口', // L
  dora: 'ドラ', // L
  'ura-dora': '裏ドラ', // U・R・I96
  'field-wind': '場風牌', // L
  'red-dora': '赤ドラ', // R・L
  'seat-wind': '自風牌', // L
  'nuki-dora': '抜きドラ', // U・R・I12
  white: '白', // L
  'open-riichi': 'オープン立直', // I14
  green: '發', // L
  'open-double-riichi': 'オープンダブル立直', // I14
  red: '中', // L
  'tsubame-gaeshi': '燕返し', // R・I14
  north: '北', // U(R の呼び名は「役牌：北」)
  'kan-furi': '槓振り', // R・I14
  rinshan: '嶺上開花', // L
  toiputao: '推不倒', // R・I14
  chankan: '槍槓', // R(L は「搶槓」)
  'shiiaru-raotai': '十二落抬', // R・I14
  haitei: '海底撈月', // R(L は「海底摸月」)
  uumensai: '五門斉', // R・I14
  hotei: '河底撈魚', // R・L
  sanrenko: '三連刻', // R・I14
  'sanshoku-dojun': '三色同順', // R・L
  'isshoku-sanjun': '一色三順', // R・I14
  'sanshoku-doko': '三色同刻', // L
  ittsu: '一気通貫', // R・L
  chanta: '混全帯么九', // L
  chitoitsu: '七対子', // L
  toitoi: '対々和', // L
  sananko: '三暗刻', // L
  honroto: '混老頭', // L
  sankantsu: '三槓子', // L
  shosangen: '小三元' // L
};

export const YAKUMAN_LABELS: Record<Yakuman['name'], string> = {
  kokushi: '国士無双', // L
  renho: '人和', // R・I14
  'kokushi-13': '国士無双十三面待ち', // R・L
  surenko: '四連刻', // R・I14
  suanko: '四暗刻', // L
  'isshoku-yonjun': '一色四順', // R・I14
  'suanko-tanki': '四暗刻単騎', // R(L は「四暗刻単騎待ち」)
  'beni-kujaku': '紅孔雀', // R・I14
  daisangen: '大三元', // L
  koitten: '紅一点', // R・I14
  tsuiso: '字一色', // R・L
  kokuiso: '黒一色', // R・I14
  shosushi: '小四喜', // L
  daisharin: '大車輪', // R・I14
  daisushi: '大四喜', // R・L
  daichikurin: '大竹林', // R・I14
  ryuiso: '緑一色', // R・L
  'ishino-ue': '石の上にも三年', // R・I14
  chinroto: '清老頭', // L
  shisanputa: '十三不搭', // R・I14
  sukantsu: '四槓子', // L
  kinmonkyo: '金門橋', // R・I14
  churen: '九蓮宝燈', // L
  'tohoku-shinkansen': '東北新幹線', // R・I14
  'pure-churen': '純正九蓮宝燈', // R・L
  'junsei-ryuiso': '純正緑一色', // R・I14
  tenho: '天和', // R・L
  daichisei: '大七星', // R・I14
  chiho: '地和' // R・L
};

export const FU_LABELS = {
  futei: '副底', // L
  shuntsu: '順子', // L
  'menzen-ron': '門前ロン', // L
  tsumo: 'ツモ', // L
  'pinfu-tsumo': '平和ツモ', // L
  chitoitsu: '七対子', // L
  'yaochu-minko': '么九牌明刻', // L
  'yaochu-anko': '么九牌暗刻', // L
  'yaochu-minkan': '么九牌明槓', // L
  'yaochu-ankan': '么九牌暗槓', // L
  'chunchan-minko': '中張牌明刻', // L
  'chunchan-anko': '中張牌暗刻', // L
  'chunchan-minkan': '中張牌明槓', // L
  'chunchan-ankan': '中張牌暗槓', // L
  head: '雀頭', // L
  'double-wind-head': '連風牌雀頭', // L
  'round-wind-head': '場風牌雀頭', // L
  'seat-wind-head': '自風牌雀頭', // L
  'dragon-head': '三元牌雀頭', // L
  'north-head': '北雀頭', // 案
  'wind-head': '風牌雀頭', // 案
  ryammen: '両面待ち', // L
  kanchan: '嵌張待ち', // L
  penchan: '辺張待ち', // L
  shampon: '双碰待ち', // L
  tanki: '単騎待ち' // L
} as const satisfies Record<FuLabelKey, string>;

export const LIMIT_LABELS = {
  mangan: '満貫', // L
  haneman: '跳満', // L
  baiman: '倍満', // L
  sanbaiman: '三倍満', // L
  'kazoe-yakuman': '数え役満' // L
} as const satisfies Record<LimitKey, string>;

export const YAKUMAN_MULTIPLE_LABELS: Record<number, string> = {
  1: '役満', // U
  2: '二倍役満', // U
  3: '三倍役満', // U
  4: '四倍役満', // U
  5: '五倍役満', // U
  6: '六倍役満', // U
  7: '七倍役満', // U
  8: '八倍役満', // U
  9: '九倍役満', // U
  10: '十倍役満' // U
};
