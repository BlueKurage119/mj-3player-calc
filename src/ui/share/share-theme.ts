import { CUSTOM_DEPOSIT_STICK, CUSTOM_HONBA_STICK } from '../icons';
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
  fontWeightSemibold: string;
  fontWeightBold: string;
  fontWeightRegularNum: number;
  fontWeightSemiboldNum: number;
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
    baselineOffset: number;
    height: number;
    pillHeight: number;
    pillCornerRadius: number;
    pillPadX: number;
    pillTextOnlyPadX: number;
    pillIconSize: number;
    pillIconGap: number;
    pillFontSize: number;
    pillGap: number;
    pillBgOpacity: number;
    nukiPrefix: string;
    iconViewBoxSize: number;
    iconViewBoxMinY: number;
    honbaIconPath: string;
    depositIconPath: string;
  };
  dora: {
    gapFromHeader: number;
    slotCount: number;
    labelFontSize: number;
    labelPillHeight: number;
    labelPillCornerRadius: number;
    labelPillPadX: number;
    labelBgOpacity: number;
    labelGap: number;
    groupGap: number;
    tileWidth: number;
    tileWidthCompact: number;
    tileGap: number;
    chipPadX: number;
    chipPadY: number;
    chipCornerRadius: number;
    chipBorderWidth: number;
    doraLabel: string;
    uradoraLabel: string;
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
    top: number;
    minGapFromBadge: number;
    gapToScore: number;
    normalMaxRows: number;
    normalMaxCount: number;
    normalChipWidth: number;
    normalChipHeight: number;
    normalChipCornerRadius: number;
    normalColGap: number;
    normalRowGap: number;
    normalFontSize: number;
    normalMinFontSize: number;
    normalChipPadLeft: number;
    normalChipPadRight: number;
    normalHanGap: number;
    hanBadgeHeight: number;
    hanBadgeCornerRadius: number;
    hanBadgeFontSize: number;
    hanBadgePadX: number;
    yakumanMaxCount: number;
    yakumanChipWidth: number;
    yakumanChipHeight: number;
    yakumanChipCornerRadius: number;
    yakumanRowGap: number;
    yakumanFontSize: number;
    yakumanMinFontSize: number;
    yakumanChipPadX: number;
    fontShrinkStep: number;
  };
  score: {
    rankFontSize: number;
    rankMinFontSize: number;
    rankFontShrinkStep: number;
    rankLineHeightRatio: number;
    rankLineGap: number;
    declarationFontSize: number;
    declarationGap: number;
    rankGap: number;
    pointsFontSize: number;
    pointsUnitFontSize: number;
    pointsAscentHeight: number;
    limitFontSize: number;
    limitMinFontSize: number;
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
    headerPillBg: ShareColorRole;
    headerPillFg: ShareColorRole;
    doraLabelBg: ShareColorRole;
    doraLabelFg: ShareColorRole;
    doraChipBg: ShareColorRole;
    doraChipBorder: ShareColorRole;
    yakuChipBg: ShareColorRole;
    yakuLabel: ShareColorRole;
    yakuHanBg: ShareColorRole;
    yakuHanFg: ShareColorRole;
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
  fontWeightSemibold: '600',
  fontWeightBold: '700',
  fontWeightRegularNum: 400,
  fontWeightSemiboldNum: 600,
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
    fontSize: 52,
    baselineOffset: 56,
    height: 72,
    pillHeight: 72,
    pillCornerRadius: 36,
    pillPadX: 20,
    pillTextOnlyPadX: 24,
    pillIconSize: 64,
    pillIconGap: 8,
    pillFontSize: 44,
    pillGap: 16,
    pillBgOpacity: 0.16,
    nukiPrefix: '北 ',
    iconViewBoxSize: 960,
    iconViewBoxMinY: -960,
    honbaIconPath: CUSTOM_HONBA_STICK,
    depositIconPath: CUSTOM_DEPOSIT_STICK
  },
  dora: {
    gapFromHeader: 30,
    slotCount: DORA_SLOT_COUNT,
    labelFontSize: 30,
    labelPillHeight: 52,
    labelPillCornerRadius: 26,
    labelPillPadX: 17,
    labelBgOpacity: 0.16,
    labelGap: 8,
    groupGap: 20,
    tileWidth: 44,
    tileWidthCompact: 36,
    tileGap: 0,
    chipPadX: 10,
    chipPadY: 8,
    chipCornerRadius: 14,
    chipBorderWidth: 2,
    doraLabel: 'ドラ',
    uradoraLabel: '裏ドラ'
  },
  hand: {
    maxTileWidth: 64,
    groupGapRatio: 0.3,
    badgePadX: 14,
    badgePadBottom: 12,
    badgeLabelBand: 52,
    badgeLeftNeighborGap: 8,
    badgeCornerRadius: 20,
    badgeFontSize: 32,
    badgeOpacity: 1,
    minGapFromDora: 16,
    maxHeaderOverlapRatio: 0.1,
    badgeRonLabel: 'ロン',
    badgeTsumoLabel: 'ツモ'
  },
  yaku: {
    top: 408,
    minGapFromBadge: 16,
    gapToScore: 16,
    normalMaxRows: 6,
    normalMaxCount: 12,
    normalChipWidth: 468,
    normalChipHeight: 64,
    normalChipCornerRadius: 16,
    normalColGap: 16,
    normalRowGap: 12,
    normalFontSize: 34,
    normalMinFontSize: 26,
    normalChipPadLeft: 20,
    normalChipPadRight: 12,
    normalHanGap: 16,
    hanBadgeHeight: 44,
    hanBadgeCornerRadius: 22,
    hanBadgeFontSize: 30,
    hanBadgePadX: 22,
    yakumanMaxCount: 5,
    yakumanChipWidth: 952,
    yakumanChipHeight: 76,
    yakumanChipCornerRadius: 20,
    yakumanRowGap: 12,
    yakumanFontSize: 44,
    yakumanMinFontSize: 32,
    yakumanChipPadX: 24,
    fontShrinkStep: 1
  },
  score: {
    rankFontSize: 72,
    rankMinFontSize: 48,
    rankFontShrinkStep: 4,
    rankLineHeightRatio: 1,
    rankLineGap: 16,
    declarationFontSize: 44,
    declarationGap: 32,
    rankGap: 32,
    pointsFontSize: 120,
    pointsUnitFontSize: 64,
    pointsAscentHeight: 96,
    limitFontSize: 96,
    limitMinFontSize: 56,
    pointsGap: 24,
    bottomPadding: 82
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
    headerPillBg: 'onSecondaryContainer',
    headerPillFg: 'onSecondaryContainer',
    doraLabelBg: 'onSecondaryContainer',
    doraLabelFg: 'onSecondaryContainer',
    doraChipBg: 'surfaceContainer',
    doraChipBorder: 'outlineVariant',
    yakuChipBg: 'surfaceContainer',
    yakuLabel: 'onSurface',
    yakuHanBg: 'primary',
    yakuHanFg: 'onPrimary',
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
