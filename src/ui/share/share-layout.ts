import type { TileOrBack } from '../../core/tile';
import type { ShareData } from './share-data';
import type { ShareColorRole, ShareTheme } from './share-theme';

export type MeasureTextWidth = (
  text: string,
  fontPx: number,
  weight: number
) => number;

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

export interface RankTextLayout {
  text: string;
  x: number;
  y: number;
  fontPx: number;
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
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  opacity: number;
  labelX: number;
  labelY: number;
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
  yakuTop: number;
  yakuBottom: number;
  yakuRows: YakuLayoutRow[];
  rank: RankTextLayout | null;
  declaration: RankTextLayout | null;
  rankBlockHeight: number;
  score: {
    totalText: string;
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

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createDefaultMeasurer(theme: ShareTheme): MeasureTextWidth {
  return (text, fontPx) => {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const ratio =
        code <= theme.measure.asciiMaxCode
          ? theme.measure.halfWidthRatio
          : theme.measure.fullWidthRatio;
      width += fontPx * ratio;
    }
    return width;
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

function intersectArea(a: Rect, b: Rect): number {
  const xOverlap = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  );
  return xOverlap * yOverlap;
}

function fitSingleLineFontPx(
  text: string,
  maxWidth: number,
  theme: ShareTheme,
  measure: MeasureTextWidth
): number {
  let fontPx = theme.score.rankFontSize;
  while (
    fontPx - theme.score.rankFontShrinkStep >= theme.score.rankMinFontSize &&
    measure(text, fontPx, theme.fontWeightRegularNum) > maxWidth
  ) {
    fontPx -= theme.score.rankFontShrinkStep;
  }
  return fontPx;
}

/** ShareData と ShareTheme からキャンバス上の座標を算出する純関数 */
export function layoutShareImage(
  data: ShareData,
  theme: ShareTheme,
  measureTextWidth?: MeasureTextWidth
): ShareLayout {
  const measure = measureTextWidth ?? createDefaultMeasurer(theme);
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
  const headerRect: Rect = {
    x: header.x,
    y: header.y,
    width: Math.min(
      contentWidth,
      measure(data.situation, theme.header.fontSize, theme.fontWeightRegularNum)
    ),
    height: theme.header.lineHeight
  };
  y += theme.header.lineHeight + theme.sectionGap;

  // ドラ・裏ドラ・抜き北行の幅を測り、利用幅を超えるならコンパクト幅へ縮める
  const doraLabelW = measure(
    theme.dora.doraLabel,
    theme.dora.fontSize,
    theme.fontWeightRegularNum
  );
  const uradoraLabelW = measure(
    theme.dora.uradoraLabel,
    theme.dora.fontSize,
    theme.fontWeightRegularNum
  );
  const nukiText =
    data.nuki !== null ? `${theme.dora.nukiPrefix}${data.nuki}` : null;
  const nukiLabelW =
    nukiText !== null
      ? measure(nukiText, theme.dora.fontSize, theme.fontWeightRegularNum)
      : 0;

  const tileRowSpan = (count: number, tileW: number): number =>
    count > 0 ? count * tileW + (count - 1) * theme.dora.tileGap : 0;

  const estimateDoraWidth = (tileW: number): number => {
    const doraSpan =
      doraLabelW +
      (data.dora.length > 0
        ? theme.dora.labelGap + tileRowSpan(data.dora.length, tileW)
        : 0);
    const uraSpan =
      uradoraLabelW +
      (data.uradora.length > 0
        ? theme.dora.labelGap + tileRowSpan(data.uradora.length, tileW)
        : 0);
    const nukiSpan = nukiText !== null ? theme.dora.groupGap + nukiLabelW : 0;
    return doraSpan + theme.dora.groupGap + uraSpan + nukiSpan;
  };

  const doraTileWidth =
    estimateDoraWidth(theme.dora.tileWidth) > contentWidth
      ? theme.dora.tileWidthCompact
      : theme.dora.tileWidth;
  const doraTileHeight = doraTileWidth * theme.tileAspectHeightOverWidth;
  const doraRowHeight = Math.max(theme.dora.fontSize, doraTileHeight);
  const doraCenterY = y + doraRowHeight / 2;
  const doraTileY = doraCenterY - doraTileHeight / 2;

  const doraLabels: PlacedText[] = [];
  const doraTiles: PlacedTile[] = [];
  let dx = theme.paddingX;

  const appendDoraGroup = (
    label: string,
    labelWidth: number,
    tiles: TileOrBack[]
  ) => {
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

  appendDoraGroup(theme.dora.doraLabel, doraLabelW, data.dora);
  appendDoraGroup(theme.dora.uradoraLabel, uradoraLabelW, data.uradora);
  if (nukiText !== null) {
    appendDoraGroup(nukiText, nukiLabelW, []);
  }

  const doraRowBottom = y + doraRowHeight;

  // 牌列 (左基準 x = paddingX。右端に badgePadX を残して和了牌背面の印を収める)
  const meldTileCount = data.meldTiles.reduce((sum, m) => sum + m.length, 0);
  const totalTileCount = data.bodyTiles.length + meldTileCount + 1;
  const totalGapCount =
    (data.bodyTiles.length > 0 ? 1 : 0) + data.meldTiles.length;
  const hasHoraGap = totalGapCount > 0;
  const otherGapCount = Math.max(0, totalGapCount - 1);

  const availableHandWidth = contentWidth - theme.hand.badgePadX;
  const minHoraGap = theme.hand.badgePadX + theme.hand.badgeLeftNeighborGap;
  const wByRatio =
    availableHandWidth /
    (totalTileCount + totalGapCount * theme.hand.groupGapRatio);
  const wByMinHoraGap =
    (availableHandWidth - (hasHoraGap ? minHoraGap : 0)) /
    (totalTileCount + otherGapCount * theme.hand.groupGapRatio);

  const tileWidth = Math.min(theme.hand.maxTileWidth, wByRatio, wByMinHoraGap);
  const tileHeight = tileWidth * theme.tileAspectHeightOverWidth;
  const groupGap = tileWidth * theme.hand.groupGapRatio;
  const horaGap = hasHoraGap ? Math.max(groupGap, minHoraGap) : 0;

  let hx = theme.paddingX;
  const handXEntries: { tile: TileOrBack; x: number }[] = [];
  const pushTilesX = (tiles: TileOrBack[]) => {
    for (const tile of tiles) {
      handXEntries.push({ tile, x: hx });
      hx += tileWidth;
    }
  };

  if (data.bodyTiles.length > 0) {
    pushTilesX(data.bodyTiles);
    hx += data.meldTiles.length > 0 ? groupGap : horaGap;
  }
  for (let i = 0; i < data.meldTiles.length; i++) {
    const meld = data.meldTiles[i];
    if (!meld) continue;
    pushTilesX(meld);
    hx += i < data.meldTiles.length - 1 ? groupGap : horaGap;
  }
  const horaTileX = hx;
  pushTilesX([data.horaTile]);

  // 印(背面台 + 上部文字帯)の縦位置をドラ欄・ヘッダーとの非交差条件から決定する
  const badgeLabel =
    data.by === 'ron' ? theme.hand.badgeRonLabel : theme.hand.badgeTsumoLabel;
  const badgeLabelW = measure(
    badgeLabel,
    theme.hand.badgeFontSize,
    theme.fontWeightBoldNum
  );
  const badgeX = horaTileX - theme.hand.badgePadX;
  const badgeWidth = tileWidth + theme.hand.badgePadX * 2;
  const badgeHeight =
    theme.hand.badgeLabelBand + tileHeight + theme.hand.badgePadBottom;
  const badgeLabelCenterX = horaTileX + tileWidth / 2;

  const badgeRectAt = (candidateHandY: number): Rect => ({
    x: badgeX,
    y: candidateHandY - theme.hand.badgeLabelBand,
    width: badgeWidth,
    height: badgeHeight
  });
  const badgeLabelRectAt = (candidateHandY: number): Rect => ({
    x: badgeLabelCenterX - badgeLabelW / 2,
    y:
      candidateHandY -
      theme.hand.badgeLabelBand / 2 -
      theme.hand.badgeFontSize / 2,
    width: badgeLabelW,
    height: theme.hand.badgeFontSize
  });

  const protectedRects: Rect[] = [
    ...doraTiles.map(t => ({
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height
    })),
    ...doraLabels.map(l => ({
      x: l.x,
      y: l.y - l.fontSize / 2,
      width: l.maxWidth,
      height: l.fontSize
    }))
  ];

  let handY = doraRowBottom + theme.hand.minGapFromDora;
  for (const rect of protectedRects) {
    if (
      rectsOverlap(badgeRectAt(handY), rect) ||
      rectsOverlap(badgeLabelRectAt(handY), rect)
    ) {
      const neededForBadge = rect.y + rect.height + theme.hand.badgeLabelBand;
      const neededForLabel =
        rect.y +
        rect.height +
        theme.hand.badgeLabelBand / 2 +
        theme.hand.badgeFontSize / 2;
      handY = Math.max(handY, neededForBadge, neededForLabel);
    }
  }

  const headerArea = headerRect.width * headerRect.height;
  if (headerArea > 0) {
    const maxAllowedArea = headerArea * theme.hand.maxHeaderOverlapRatio;
    const badgeBox = badgeRectAt(handY);
    if (intersectArea(badgeBox, headerRect) > maxAllowedArea) {
      const xOverlap =
        Math.min(badgeBox.x + badgeBox.width, headerRect.x + headerRect.width) -
        Math.max(badgeBox.x, headerRect.x);
      if (xOverlap > 0) {
        const maxDy = maxAllowedArea / xOverlap;
        const minTop = headerRect.y + headerRect.height - maxDy;
        handY = Math.max(handY, minTop + theme.hand.badgeLabelBand);
      }
    }
    const labelBox = badgeLabelRectAt(handY);
    if (intersectArea(labelBox, headerRect) > maxAllowedArea) {
      const xOverlap =
        Math.min(labelBox.x + labelBox.width, headerRect.x + headerRect.width) -
        Math.max(labelBox.x, headerRect.x);
      if (xOverlap > 0) {
        const maxDy = maxAllowedArea / xOverlap;
        const minTop = headerRect.y + headerRect.height - maxDy;
        handY = Math.max(
          handY,
          minTop + theme.hand.badgeLabelBand / 2 + theme.hand.badgeFontSize / 2
        );
      }
    }
  }

  const handTiles: PlacedTile[] = handXEntries.map(entry => ({
    tile: entry.tile,
    x: entry.x,
    y: handY,
    width: tileWidth,
    height: tileHeight
  }));

  const badgeColors = theme.colors.byBadge[data.by];
  const finalBadgeRect = badgeRectAt(handY);
  const byBadge: ByBadgeLayout = {
    label: badgeLabel,
    x: finalBadgeRect.x,
    y: finalBadgeRect.y,
    width: finalBadgeRect.width,
    height: finalBadgeRect.height,
    cornerRadius: theme.hand.badgeCornerRadius,
    opacity: theme.hand.badgeOpacity,
    labelX: badgeLabelCenterX,
    labelY: handY - theme.hand.badgeLabelBand / 2,
    fontSize: theme.hand.badgeFontSize,
    bgColorRole: badgeColors.bg,
    fgColorRole: badgeColors.fg
  };

  // フッター帯の上から点数行・符飜と申告行を下詰めで配置する
  const pointsBaselineY = theme.footer.top - theme.score.bottomPadding;
  const pointsTopY = pointsBaselineY - theme.score.pointsLineHeight;

  let rank: RankTextLayout | null = null;
  let declaration: RankTextLayout | null = null;
  let rankBlockHeight = 0;
  let scoreBlockTop = pointsTopY;

  if (data.rankText !== null && data.declarationText !== null) {
    let fontPx = theme.score.rankFontSize;
    let fitsSingleLine = false;
    let rankW = 0;
    let gapPx = 0;
    let declW = 0;
    while (true) {
      rankW = measure(data.rankText, fontPx, theme.fontWeightRegularNum);
      gapPx = fontPx * theme.score.declarationGapEm;
      declW = measure(data.declarationText, fontPx, theme.fontWeightRegularNum);
      if (rankW + gapPx + declW <= contentWidth) {
        fitsSingleLine = true;
        break;
      }
      if (
        fontPx - theme.score.rankFontShrinkStep <
        theme.score.rankMinFontSize
      ) {
        break;
      }
      fontPx -= theme.score.rankFontShrinkStep;
    }

    const lineHeight = Math.ceil(fontPx * theme.score.rankLineHeightRatio);
    if (fitsSingleLine) {
      rankBlockHeight = lineHeight;
      const baselineY = pointsTopY - theme.score.rankGap;
      scoreBlockTop = baselineY - rankBlockHeight;
      rank = {
        text: data.rankText,
        x: theme.paddingX,
        y: baselineY,
        fontPx,
        maxWidth: rankW,
        colorRole: theme.colors.rank
      };
      declaration = {
        text: data.declarationText,
        x: theme.paddingX + rankW + gapPx,
        y: baselineY,
        fontPx,
        maxWidth: contentWidth - rankW - gapPx,
        colorRole: theme.colors.declaration
      };
    } else {
      rankBlockHeight = lineHeight * 2 + theme.score.rankLineGap;
      const declBaselineY = pointsTopY - theme.score.rankGap;
      const rankBaselineY =
        declBaselineY - lineHeight - theme.score.rankLineGap;
      scoreBlockTop = declBaselineY - rankBlockHeight;
      rank = {
        text: data.rankText,
        x: theme.paddingX,
        y: rankBaselineY,
        fontPx,
        maxWidth: contentWidth,
        colorRole: theme.colors.rank
      };
      declaration = {
        text: data.declarationText,
        x: theme.paddingX,
        y: declBaselineY,
        fontPx,
        maxWidth: contentWidth,
        colorRole: theme.colors.declaration
      };
    }
  } else if (data.rankText !== null) {
    const fontPx = fitSingleLineFontPx(
      data.rankText,
      contentWidth,
      theme,
      measure
    );
    rankBlockHeight = Math.ceil(fontPx * theme.score.rankLineHeightRatio);
    const baselineY = pointsTopY - theme.score.rankGap;
    scoreBlockTop = baselineY - rankBlockHeight;
    rank = {
      text: data.rankText,
      x: theme.paddingX,
      y: baselineY,
      fontPx,
      maxWidth: contentWidth,
      colorRole: theme.colors.rank
    };
  } else if (data.declarationText !== null) {
    const fontPx = fitSingleLineFontPx(
      data.declarationText,
      contentWidth,
      theme,
      measure
    );
    rankBlockHeight = Math.ceil(fontPx * theme.score.rankLineHeightRatio);
    const baselineY = pointsTopY - theme.score.rankGap;
    scoreBlockTop = baselineY - rankBlockHeight;
    declaration = {
      text: data.declarationText,
      x: theme.paddingX,
      y: baselineY,
      fontPx,
      maxWidth: contentWidth,
      colorRole: theme.colors.declaration
    };
  }

  const yakuTop =
    handY + tileHeight + theme.hand.badgePadBottom + theme.sectionGap;
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
    yakuTop,
    yakuBottom,
    yakuRows,
    rank,
    declaration,
    rankBlockHeight,
    score: {
      totalText: data.totalText,
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
