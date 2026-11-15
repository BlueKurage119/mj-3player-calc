import {
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_MIME,
  SHARE_IMAGE_WIDTH
} from './share-config';
import type { ShareColors } from './share-data';

export type ShareColorRole = keyof ShareColors;

export const DORA_SLOT_COUNT = 5;

export interface ShareTheme {
  width: number;
  height: number;
  mimeType: string;
  paddingX: number;
  paddingTop: number;
  sectionGap: number;
  fontFamily: string;
  fontWeightRegular: string;
  fontWeightBold: string;
  fontWeightRegularNum: number;
  fontWeightBoldNum: number;
  ellipsis: string;
  tileSvgWidth: number;
  tileSvgHeight: number;
  tileAspectHeightOverWidth: number;
  tileFaceScale: number;
  measure: {
    fullWidthRatio: number;
    halfWidthRatio: number;
    asciiMaxCode: number;
  };
  header: {
    fontSize: number;
    lineHeight: number;
  };
  dora: {
    slotCount: number;
    fontSize: number;
    tileWidth: number;
    tileWidthCompact: number;
    tileGap: number;
    labelGap: number;
    groupGap: number;
    doraLabel: string;
    uradoraLabel: string;
    nukiPrefix: string;
  };
  hand: {
    maxTileWidth: number;
    groupGapRatio: number;
    badgePadX: number;
    badgePadBottom: number;
    badgeLabelBand: number;
    badgeLeftNeighborGap: number;
    badgeCornerRadius: number;
    badgeFontSize: number;
    badgeOpacity: number;
    minGapFromDora: number;
    maxHeaderOverlapRatio: number;
    badgeRonLabel: string;
    badgeTsumoLabel: string;
  };
  yaku: {
    fontSize: number;
    minFontSize: number;
    maxRowHeight: number;
    fontRatio: number;
    hanRightX: number;
    hanReservedWidth: number;
    colGap: number;
  };
  score: {
    rankFontSize: number;
    rankMinFontSize: number;
    rankFontShrinkStep: number;
    rankLineHeightRatio: number;
    rankLineGap: number;
    declarationGapEm: number;
    rankGap: number;
    pointsFontSize: number;
    pointsLineHeight: number;
    limitFontSize: number;
    pointsGap: number;
    bottomPadding: number;
  };
  footer: {
    top: number;
    height: number;
    titleFontSize: number;
    urlFontSize: number;
    urlMinFontSize: number;
    fontShrinkStep: number;
    titleGap: number;
    textTopOffset: number;
    textQrGap: number;
    qrSize: number;
    qrTopOffset: number;
    qrQuietZone: number;
    qrMinModulePx: number;
    qrEccDefault: 'M';
    qrEccFallback: 'L';
  };
  colors: {
    background: ShareColorRole;
    header: ShareColorRole;
    label: ShareColorRole;
    yaku: ShareColorRole;
    rank: ShareColorRole;
    declaration: ShareColorRole;
    points: ShareColorRole;
    limitName: ShareColorRole;
    footerBg: ShareColorRole;
    footerTitle: ShareColorRole;
    footerUrl: ShareColorRole;
    qrBg: ShareColorRole;
    qrFg: ShareColorRole;
    byBadge: {
      ron: { bg: ShareColorRole; fg: ShareColorRole };
      tsumo: { bg: ShareColorRole; fg: ShareColorRole };
    };
  };
}

export const SHARE_THEME_V1: ShareTheme = {
  width: SHARE_IMAGE_WIDTH,
  height: SHARE_IMAGE_HEIGHT,
  mimeType: SHARE_IMAGE_MIME,
  paddingX: 64,
  paddingTop: 48,
  sectionGap: 32,
  fontFamily:
    'system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", sans-serif',
  fontWeightRegular: '400',
  fontWeightBold: '700',
  fontWeightRegularNum: 400,
  fontWeightBoldNum: 700,
  ellipsis: '…',
  tileSvgWidth: 300,
  tileSvgHeight: 400,
  tileAspectHeightOverWidth: 4 / 3,
  tileFaceScale: 0.9,
  measure: {
    fullWidthRatio: 1,
    halfWidthRatio: 0.6,
    asciiMaxCode: 127
  },
  header: {
    fontSize: 36,
    lineHeight: 44
  },
  dora: {
    slotCount: DORA_SLOT_COUNT,
    fontSize: 36,
    tileWidth: 40,
    tileWidthCompact: 36,
    tileGap: 4,
    labelGap: 8,
    groupGap: 32,
    doraLabel: 'ドラ',
    uradoraLabel: '裏ドラ',
    nukiPrefix: '北×'
  },
  hand: {
    maxTileWidth: 64,
    groupGapRatio: 0.3,
    badgePadX: 12,
    badgePadBottom: 12,
    badgeLabelBand: 48,
    badgeLeftNeighborGap: 8,
    badgeCornerRadius: 16,
    badgeFontSize: 32,
    badgeOpacity: 1,
    minGapFromDora: 16,
    maxHeaderOverlapRatio: 0.1,
    badgeRonLabel: 'ロン',
    badgeTsumoLabel: 'ツモ'
  },
  yaku: {
    fontSize: 40,
    minFontSize: 30,
    maxRowHeight: 64,
    fontRatio: 0.8,
    hanRightX: 720,
    hanReservedWidth: 160,
    colGap: 24
  },
  score: {
    rankFontSize: 72,
    rankMinFontSize: 48,
    rankFontShrinkStep: 4,
    rankLineHeightRatio: 1,
    rankLineGap: 16,
    declarationGapEm: 0.8,
    rankGap: 32,
    pointsFontSize: 120,
    pointsLineHeight: 120,
    limitFontSize: 96,
    pointsGap: 24,
    bottomPadding: 32
  },
  footer: {
    top: 1150,
    height: 200,
    titleFontSize: 56,
    urlFontSize: 28,
    urlMinFontSize: 24,
    fontShrinkStep: 1,
    titleGap: 16,
    textTopOffset: 48,
    textQrGap: 24,
    qrSize: 168,
    qrTopOffset: 16,
    qrQuietZone: 4,
    qrMinModulePx: 3,
    qrEccDefault: 'M',
    qrEccFallback: 'L'
  },
  colors: {
    background: 'surface',
    header: 'onSurface',
    label: 'onSurfaceVariant',
    yaku: 'onSurface',
    rank: 'onSurface',
    declaration: 'onSurfaceVariant',
    points: 'onSurface',
    limitName: 'error',
    footerBg: 'surfaceContainerHighest',
    footerTitle: 'onSurface',
    footerUrl: 'onSurfaceVariant',
    qrBg: 'surface',
    qrFg: 'onSurface',
    byBadge: {
      ron: { bg: 'primaryContainer', fg: 'onPrimaryContainer' },
      tsumo: { bg: 'tertiaryContainer', fg: 'onTertiaryContainer' }
    }
  }
};
