import type { ScoredHora } from '../../core/result';
import type { Wind } from '../../core/table';
import type { Tile, TileOrBack } from '../../core/tile';
import { formatPoints } from '../result/hora-summary';
import type { ResultContext, ShareInput } from '../result/hora/HoraDetail';
import {
  calcDisplayFu,
  limitName,
  yakuHanText,
  yakuLabel
} from '../result/hora/format';
import { meldTiles } from '../screen/MeldArea';
import { maxHandLength, splitWinningTile } from '../state';
import {
  APP_NAME,
  SHARE_URL,
  resolveShareUrl,
  shareUrlLabel
} from './share-config';

export interface ShareData {
  by: 'ron' | 'tsumo';
  bodyTiles: Tile[];
  meldTiles: TileOrBack[][];
  horaTile: Tile;
  dora: Tile[];
  uradora: Tile[] | null;
  nuki: number | null;
  yaku: { label: string; han: string }[];
  rankText: string | null;
  limitName: string | null;
  pointsText: string;
  situation: string;
  appName: string;
  url: string | null;
  urlLabel: string | null;
}

export interface ShareColors {
  surface: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceContainerHighest: string;
  primary: string;
  onPrimary: string;
  tertiary: string;
  onTertiary: string;
  error: string;
}

const WIND_KANJI: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西'
};

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
  const rankText =
    score.yakumanPoint === 0
      ? `${displayFu !== null ? `${displayFu}符 ` : ''}${score.han}飜`
      : null;

  const uradora =
    share.riichi !== 'none' && share.uradora.length > 0
      ? [...share.uradora]
      : null;

  const situation = `${WIND_KANJI[table.round]}場 ${table.continue}本場 供託${table.deposit} ${WIND_KANJI[table.seat]}家`;

  return {
    by: hora.by,
    bodyTiles,
    meldTiles: melds,
    horaTile: hora.horaTile,
    dora: [...share.dora],
    uradora,
    nuki: share.nukiEnabled ? share.nuki : null,
    yaku: hora.yaku.map(y => ({
      label: yakuLabel(y.name),
      han: yakuHanText(y)
    })),
    rankText,
    limitName: limitName(score),
    pointsText: formatPoints(score.payment),
    situation,
    appName: APP_NAME,
    url: resolveShareUrl(shareUrl),
    urlLabel: shareUrlLabel(shareUrl)
  };
}
