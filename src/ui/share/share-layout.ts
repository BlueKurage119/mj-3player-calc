import type { TileOrBack } from '../../core/tile';
import type { ShareData } from './share-data';
import type { ShareColorRole, ShareTheme } from './share-theme';

export interface PlacedTile {
  tile: TileOrBack;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedText {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  maxWidth: number;
  colorRole: ShareColorRole;
}

export interface YakuLayoutRow {
  label: string;
  han: string;
  labelX: number;
  labelMaxWidth: number;
  hanRightX: number;
  y: number;
  fontSize: number;
  colorRole: ShareColorRole;
}

export interface ByBadgeLayout {
  label: string;
  cx: number;
  cy: number;
  radius: number;
  fontSize: number;
  bgColorRole: ShareColorRole;
  fgColorRole: ShareColorRole;
}

export interface QrLayout {
  url: string;
  x: number;
  y: number;
  size: number;
  quietZone: number;
  minModulePx: number;
  eccDefault: 'M';
  eccFallback: 'L';
  bgColorRole: ShareColorRole;
  fgColorRole: ShareColorRole;
}

export interface ShareLayout {
  width: number;
  height: number;
  backgroundColorRole: ShareColorRole;
  header: PlacedText;
  doraLabels: PlacedText[];
  doraTiles: PlacedTile[];
  handTiles: PlacedTile[];
  byBadge: ByBadgeLayout;
  yakuRows: YakuLayoutRow[];
  rank: PlacedText | null;
  score: {
    pointsText: string;
    pointsFontSize: number;
    limitName: string | null;
    limitFontSize: number;
    x: number;
    rightX: number;
    baselineY: number;
    maxWidth: number;
    pointsGap: number;
    pointsColorRole: ShareColorRole;
    limitColorRole: ShareColorRole;
  };
  footer: {
    band: {
      x: number;
      y: number;
      width: number;
      height: number;
      colorRole: ShareColorRole;
    };
    title: PlacedText;
    url: (PlacedText & { minFontSize: number }) | null;
    qr: QrLayout | null;
  };
}

/** ShareData と ShareTheme からキャンバス上の座標を算出する純関数 */
export function layoutShareImage(
  data: ShareData,
  theme: ShareTheme
): ShareLayout {
  const contentWidth = theme.width - theme.paddingX * 2;
  const contentRight = theme.width - theme.paddingX;
  let y = theme.paddingTop;

  const header: PlacedText = {
    text: data.situation,
    x: theme.paddingX,
    y,
    fontSize: theme.header.fontSize,
    maxWidth: contentWidth,
    colorRole: theme.colors.header
  };
  y += theme.header.lineHeight + theme.sectionGap;

  const doraTileWidth = theme.dora.tileWidth;
  const doraTileHeight = doraTileWidth * theme.tileAspectHeightOverWidth;
  const doraRowHeight = Math.max(theme.dora.fontSize, doraTileHeight);
  const doraCenterY = y + doraRowHeight / 2;
  const doraTileY = doraCenterY - doraTileHeight / 2;

  const doraLabels: PlacedText[] = [];
  const doraTiles: PlacedTile[] = [];
  let dx = theme.paddingX;

  const appendDoraGroup = (label: string, tiles: TileOrBack[]) => {
    const labelWidth =
      label.length * theme.dora.fontSize * theme.dora.labelCharWidthRatio;
    doraLabels.push({
      text: label,
      x: dx,
      y: doraCenterY,
      fontSize: theme.dora.fontSize,
      maxWidth: labelWidth,
      colorRole: theme.colors.label
    });
    dx += labelWidth;
    if (tiles.length > 0) {
      dx += theme.dora.labelGap;
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        if (!tile) continue;
        doraTiles.push({
          tile,
          x: dx,
          y: doraTileY,
          width: doraTileWidth,
          height: doraTileHeight
        });
        dx += doraTileWidth;
        if (i < tiles.length - 1) {
          dx += theme.dora.tileGap;
        }
      }
    }
    dx += theme.dora.groupGap;
  };

  appendDoraGroup(theme.dora.doraLabel, data.dora);
  if (data.uradora !== null && data.uradora.length > 0) {
    appendDoraGroup(theme.dora.uradoraLabel, data.uradora);
  }
  if (data.nuki !== null) {
    appendDoraGroup(`${theme.dora.nukiPrefix}${data.nuki}`, []);
  }

  y += doraRowHeight + theme.sectionGap;

  const meldTileCount = data.meldTiles.reduce((sum, m) => sum + m.length, 0);
  const totalTileCount = data.bodyTiles.length + meldTileCount + 1;
  const gapCount = (data.bodyTiles.length > 0 ? 1 : 0) + data.meldTiles.length;
  const equivalentUnits = totalTileCount + gapCount * theme.hand.groupGapRatio;

  const tileWidth = Math.min(
    theme.hand.maxTileWidth,
    contentWidth / equivalentUnits
  );
  const tileHeight = tileWidth * theme.tileAspectHeightOverWidth;
  const groupGap = tileWidth * theme.hand.groupGapRatio;
  const totalHandWidth = totalTileCount * tileWidth + gapCount * groupGap;
  let hx = theme.paddingX + (contentWidth - totalHandWidth) / 2;

  const handTiles: PlacedTile[] = [];
  const pushTiles = (tiles: TileOrBack[]) => {
    for (const tile of tiles) {
      handTiles.push({
        tile,
        x: hx,
        y,
        width: tileWidth,
        height: tileHeight
      });
      hx += tileWidth;
    }
  };

  if (data.bodyTiles.length > 0) {
    pushTiles(data.bodyTiles);
    hx += groupGap;
  }
  for (const meld of data.meldTiles) {
    pushTiles(meld);
    hx += groupGap;
  }
  pushTiles([data.horaTile]);

  const badgeRadius = theme.hand.badgeDiameter / 2;
  const badgeColors = theme.colors.byBadge[data.by];
  const byBadge: ByBadgeLayout = {
    label:
      data.by === 'ron' ? theme.hand.badgeRonLabel : theme.hand.badgeTsumoLabel,
    cx: contentRight - theme.hand.badgeInsetRight - badgeRadius,
    cy: y - theme.hand.badgeOverlapTop + badgeRadius,
    radius: badgeRadius,
    fontSize: theme.hand.badgeFontSize,
    bgColorRole: badgeColors.bg,
    fgColorRole: badgeColors.fg
  };

  y += tileHeight + theme.sectionGap;

  const pointsBaselineY = theme.footer.top - theme.score.bottomPadding;
  const pointsTopY = pointsBaselineY - theme.score.pointsLineHeight;

  let rank: PlacedText | null = null;
  let scoreBlockTop = pointsTopY;
  if (data.rankText !== null) {
    const rankBaselineY = pointsTopY - theme.score.rankGap;
    scoreBlockTop = rankBaselineY - theme.score.rankLineHeight;
    rank = {
      text: data.rankText,
      x: theme.paddingX,
      y: rankBaselineY,
      fontSize: theme.score.rankFontSize,
      maxWidth: contentWidth,
      colorRole: theme.colors.rank
    };
  }

  const yakuTop = y;
  const yakuBottom = scoreBlockTop - theme.sectionGap;
  const availableYakuHeight = Math.max(0, yakuBottom - yakuTop);
  const yakuCount = data.yaku.length;
  const rowHeight =
    yakuCount > 0
      ? Math.min(theme.yaku.maxRowHeight, availableYakuHeight / yakuCount)
      : 0;
  const yakuFontSize = Math.max(
    theme.yaku.minFontSize,
    Math.min(theme.yaku.fontSize, Math.floor(rowHeight * theme.yaku.fontRatio))
  );
  const yakuLabelMaxWidth =
    theme.yaku.hanRightX -
    theme.paddingX -
    theme.yaku.hanReservedWidth -
    theme.yaku.colGap;

  const yakuRows: YakuLayoutRow[] = data.yaku.map((item, idx) => ({
    label: item.label,
    han: item.han,
    labelX: theme.paddingX,
    labelMaxWidth: yakuLabelMaxWidth,
    hanRightX: theme.yaku.hanRightX,
    y: yakuTop + rowHeight * idx + rowHeight / 2,
    fontSize: yakuFontSize,
    colorRole: theme.colors.yaku
  }));

  const qrX = contentRight - theme.footer.qrSize;
  const qrY = theme.footer.top + theme.footer.qrTopOffset;
  const footerTextMaxWidth = qrX - theme.footer.textQrGap - theme.paddingX;
  const footerTitleY = theme.footer.top + theme.footer.textTopOffset;
  const footerUrlY =
    footerTitleY + theme.footer.titleFontSize + theme.footer.titleGap;

  return {
    width: theme.width,
    height: theme.height,
    backgroundColorRole: theme.colors.background,
    header,
    doraLabels,
    doraTiles,
    handTiles,
    byBadge,
    yakuRows,
    rank,
    score: {
      pointsText: data.pointsText,
      pointsFontSize: theme.score.pointsFontSize,
      limitName: data.limitName,
      limitFontSize: theme.score.limitFontSize,
      x: theme.paddingX,
      rightX: contentRight,
      baselineY: pointsBaselineY,
      maxWidth: contentWidth,
      pointsGap: theme.score.pointsGap,
      pointsColorRole: theme.colors.points,
      limitColorRole: theme.colors.limitName
    },
    footer: {
      band: {
        x: 0,
        y: theme.footer.top,
        width: theme.width,
        height: theme.footer.height,
        colorRole: theme.colors.footerBg
      },
      title: {
        text: data.appName,
        x: theme.paddingX,
        y: footerTitleY,
        fontSize: theme.footer.titleFontSize,
        maxWidth: footerTextMaxWidth,
        colorRole: theme.colors.footerTitle
      },
      url:
        data.url !== null && data.urlLabel !== null
          ? {
              text: data.urlLabel,
              x: theme.paddingX,
              y: footerUrlY,
              fontSize: theme.footer.urlFontSize,
              minFontSize: theme.footer.urlMinFontSize,
              maxWidth: footerTextMaxWidth,
              colorRole: theme.colors.footerUrl
            }
          : null,
      qr:
        data.url !== null
          ? {
              url: data.url,
              x: qrX,
              y: qrY,
              size: theme.footer.qrSize,
              quietZone: theme.footer.qrQuietZone,
              minModulePx: theme.footer.qrMinModulePx,
              eccDefault: theme.footer.qrEccDefault,
              eccFallback: theme.footer.qrEccFallback,
              bgColorRole: theme.colors.qrBg,
              fgColorRole: theme.colors.qrFg
            }
          : null
    }
  };
}
