/**
 * 出典: 本プロジェクトで自作
 * 麻雀の点棒アイコン (viewBox: 0 -960 960 960、単一 path、塗りのみ)
 * 供託: 千点棒 (中央に大きな点1つを抜きで表現)
 * 積み棒: 百点棒 (中央に小さな点 縦2×横4=8個を抜きで表現)
 */

const STICK_OUTLINE =
  'M180-580h600a60 60 0 0 1 60 60v80a60 60 0 0 1-60 60H180a60 60 0 0 1-60-60v-80a60 60 0 0 1 60-60z';

/**
 * 供託 (千点棒) アイコン path
 * 棒の中央に直径 120 (棒の高さの 60%) の円を抜く
 */
export const CUSTOM_DEPOSIT_STICK = `${STICK_OUTLINE}M480-540a60 60 0 1 0 0 120 60 60 0 1 0 0-120z`;

/**
 * 百点棒 (積み棒) の8つの小円 (縦2段 × 横4列、半径 18 = 直径 36、棒の高さの約 18%)
 */
const DOT_COLS = [405, 455, 505, 555];
const DOT_ROWS = [-525, -435];
const HONBA_DOTS = DOT_COLS.flatMap(cx =>
  DOT_ROWS.map(cy => `M${cx}${cy - 18}a18 18 0 1 0 0 36 18 18 0 1 0 0-36z`)
).join('');

/**
 * 積み棒 (百点棒) アイコン path
 */
export const CUSTOM_HONBA_STICK = `${STICK_OUTLINE}${HONBA_DOTS}`;
