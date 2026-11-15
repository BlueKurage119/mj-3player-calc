import type { ScoredHora } from '../../core/result';
import type { Tile, TileOrBack } from '../../core/tile';
import { formatNumber, formatPoints } from '../result/hora-summary';
import type { ResultContext, ShareInput } from '../result/hora/HoraDetail';
import {
  calcDisplayFu,
  limitName,
  yakuHanText,
  yakuLabel
} from '../result/hora/format';
import { meldTiles } from '../screen/MeldArea';
import { formatWinds, maxHandLength, splitWinningTile } from '../state';
import {
  APP_NAME,
  SHARE_URL,
  resolveShareUrl,
  shareUrlLabel
} from './share-config';
import { DORA_SLOT_COUNT } from './share-theme';

export interface ShareData {
  by: 'ron' | 'tsumo';
  bodyTiles: Tile[];
  meldTiles: TileOrBack[][];
  horaTile: Tile;
  dora: TileOrBack[];
  uradora: TileOrBack[];
  nuki: number | null;
  continueCount: number;
  deposit: number;
  isYakuman: boolean;
  yaku: { label: string; han: string }[];
  rankText: string | null;
  limitName: string | null;
  totalDigits: string;
  totalUnit: '点';
  declarationText: string | null;
  situation: string;
  appName: string;
  url: string | null;
  urlLabel: string | null;
}

export interface ShareColors {
  surface: string;
  surfaceContainer: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceContainerHighest: string;
  outlineVariant: string;
  onSecondaryContainer: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  primary: string;
  onPrimary: string;
  tertiary: string;
  onTertiary: string;
  error: string;
}

function padDoraSlots(tiles: readonly Tile[], count: number): TileOrBack[] {
  return Array.from({ length: count }, (_, i) => tiles[i] ?? { type: 'back' });
}

/** 共有画像用の表示データを組み立てる純関数 */
export function buildShareData(
  hora: ScoredHora,
  context: ResultContext & { share: ShareInput },
  shareUrl: string | null = SHARE_URL
): ShareData {
  const { table, share } = context;
  const { body } = splitWinningTile(share.hand, maxHandLength(share.melds));
  const bodyTiles = body.map(item => item.tile);
  const melds = share.melds
    .map(m => meldTiles(m, share.red))
    .filter(tiles => tiles.length > 0);

  const displayFu = calcDisplayFu(hora);
  const { score } = hora;
  const isYakuman = score.yakumanPoint > 0;
  const rankText = !isYakuman
    ? `${displayFu !== null ? `${displayFu}符 ` : ''}${score.han}飜`
    : null;

  const dora = padDoraSlots(share.dora, DORA_SLOT_COUNT);
  const uradora =
    share.riichi !== 'none'
      ? padDoraSlots(share.uradora, DORA_SLOT_COUNT)
      : padDoraSlots([], DORA_SLOT_COUNT);

  return {
    by: hora.by,
    bodyTiles,
    meldTiles: melds,
    horaTile: hora.horaTile,
    dora,
    uradora,
    nuki: share.nukiEnabled ? share.nuki : null,
    continueCount: table.continue,
    deposit: table.deposit,
    isYakuman,
    yaku: hora.yaku.map(y => ({
      label: yakuLabel(y.name),
      han: yakuHanText(y)
    })),
    rankText,
    limitName: limitName(score),
    totalDigits: formatNumber(score.payment.total),
    totalUnit: '点',
    declarationText: hora.by === 'tsumo' ? formatPoints(score.payment) : null,
    situation: formatWinds(table),
    appName: APP_NAME,
    url: resolveShareUrl(shareUrl),
    urlLabel: shareUrlLabel(shareUrl)
  };
}
