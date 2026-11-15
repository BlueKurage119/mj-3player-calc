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

export interface HeaderTextLayout {
  text: string;
  x: number;
  baselineY: number;
  fontSize: number;
  maxWidth: number;
  colorRole: ShareColorRole;
}

export interface HeaderPillLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  bgColorRole: ShareColorRole;
  bgOpacity: number;
  fgColorRole: ShareColorRole;
  iconPath: string | null;
  iconX: number;
  iconY: number;
  iconSize: number;
  text: string;
  textX: number;
  textY: number;
  fontSize: number;
}

export interface DoraLabelPillLayout {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  bgColorRole: ShareColorRole;
  bgOpacity: number;
  fgColorRole: ShareColorRole;
  textX: number;
  textY: number;
  fontSize: number;
  maxWidth: number;
}

export interface DoraChipLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  borderWidth: number;
  bgColorRole: ShareColorRole;
  borderColorRole: ShareColorRole;
}

export interface TotalLayout {
  digitsText: string;
  unitText: string;
  x: number;
  y: number;
  digitsFontPx: number;
  unitFontPx: number;
  unitX: number;
  digitsColorRole: ShareColorRole;
}

export interface LimitLayout {
  text: string;
  x: number;
  y: number;
  fontPx: number;
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

export interface YakuBadgeLayout {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  textX: number;
  textY: number;
  fontSize: number;
  bgColorRole: ShareColorRole;
  fgColorRole: ShareColorRole;
}

export interface YakuChipLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  bgColorRole: ShareColorRole;
  label: string;
  labelX: number;
  labelY: number;
  labelFontSize: number;
  labelMaxWidth: number;
  labelColorRole: ShareColorRole;
  hanBadge: YakuBadgeLayout | null;
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
  header: HeaderTextLayout;
  headerPills: HeaderPillLayout[];
  doraLabels: DoraLabelPillLayout[];
  doraChips: DoraChipLayout[];
  doraTiles: PlacedTile[];
  handTiles: PlacedTile[];
  byBadge: ByBadgeLayout;
  yakuTop: number;
  yakuBottom: number;
  yakuMode: 'normal' | 'yakuman';
  yakuChips: YakuChipLayout[];
  rank: RankTextLayout | null;
  declaration: RankTextLayout | null;
  rankBlockHeight: number;
  total: TotalLayout;
  limit: LimitLayout | null;
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

function fitTextWithEllipsis(
  text: string,
  maxWidth: number,
  startFontSize: number,
  minFontSize: number,
  step: number,
  weight: number,
  ellipsis: string,
  measure: MeasureTextWidth
): { text: string; fontSize: number } {
  let size = startFontSize;
  while (size > minFontSize) {
    if (measure(text, size, weight) <= maxWidth) {
      return { text, fontSize: size };
    }
    size -= step;
  }
  const clampedSize = Math.max(minFontSize, size);
  if (measure(text, clampedSize, weight) <= maxWidth) {
    return { text, fontSize: clampedSize };
  }
  let end = text.length;
  while (
    end > 0 &&
    measure(`${text.slice(0, end)}${ellipsis}`, clampedSize, weight) > maxWidth
  ) {
    end -= 1;
  }
  return {
    text: `${text.slice(0, end)}${ellipsis}`,
    fontSize: clampedSize
  };
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

  // 1. 見出し: 右端から 北(有効時) -> 供託 -> 本場 の順にピルを配置
  const pillSpecs: { iconPath: string | null; text: string }[] = [];
  if (data.nuki !== null) {
    pillSpecs.push({
      iconPath: null,
      text: `${theme.header.nukiPrefix}${data.nuki}`
    });
  }
  pillSpecs.push({
    iconPath: theme.header.depositIconPath,
    text: String(data.deposit)
  });
  pillSpecs.push({
    iconPath: theme.header.honbaIconPath,
    text: String(data.continueCount)
  });

  const headerPillsFromRight: HeaderPillLayout[] = [];
  let pillRightX = contentRight;
  for (const spec of pillSpecs) {
    const textW = measure(
      spec.text,
      theme.header.pillFontSize,
      theme.fontWeightSemiboldNum
    );
    const hasIcon = spec.iconPath !== null;
    const padX = hasIcon
      ? theme.header.pillPadX
      : theme.header.pillTextOnlyPadX;
    const width =
      padX * 2 +
      (hasIcon ? theme.header.pillIconSize + theme.header.pillIconGap : 0) +
      textW;
    const pillX = pillRightX - width;
    const pillY = theme.paddingTop;
    const iconX = pillX + padX;
    const iconY =
      pillY + (theme.header.pillHeight - theme.header.pillIconSize) / 2;
    const textX = hasIcon
      ? iconX + theme.header.pillIconSize + theme.header.pillIconGap
      : pillX + padX;
    const textY = pillY + theme.header.pillHeight / 2;

    headerPillsFromRight.push({
      x: pillX,
      y: pillY,
      width,
      height: theme.header.pillHeight,
      cornerRadius: theme.header.pillCornerRadius,
      bgColorRole: theme.colors.headerPillBg,
      bgOpacity: theme.header.pillBgOpacity,
      fgColorRole: theme.colors.headerPillFg,
      iconPath: spec.iconPath,
      iconX,
      iconY,
      iconSize: theme.header.pillIconSize,
      text: spec.text,
      textX,
      textY,
      fontSize: theme.header.pillFontSize
    });
    pillRightX = pillX - theme.header.pillGap;
  }
  const headerPills = headerPillsFromRight.reverse();
  const leftmostPillX = headerPills[0]?.x ?? contentRight;
  const headerMaxWidth = Math.max(
    0,
    leftmostPillX - theme.header.pillGap - theme.paddingX
  );

  const header: HeaderTextLayout = {
    text: data.situation,
    x: theme.paddingX,
    baselineY: theme.paddingTop + theme.header.baselineOffset,
    fontSize: theme.header.fontSize,
    maxWidth: headerMaxWidth,
    colorRole: theme.colors.header
  };
  const headerRect: Rect = {
    x: header.x,
    y: theme.paddingTop,
    width: Math.min(
      header.maxWidth,
      measure(data.situation, theme.header.fontSize, theme.fontWeightBoldNum)
    ),
    height: theme.header.height
  };
  const headerBottom = theme.paddingTop + theme.header.height;

  // 2. ドラ・裏ドラ欄: ラベルピル + 牌5枚のチップ
  const doraTop = headerBottom + theme.dora.gapFromHeader;
  const doraLabelTextW = measure(
    theme.dora.doraLabel,
    theme.dora.labelFontSize,
    theme.fontWeightRegularNum
  );
  const uradoraLabelTextW = measure(
    theme.dora.uradoraLabel,
    theme.dora.labelFontSize,
    theme.fontWeightRegularNum
  );
  const doraPillW = doraLabelTextW + theme.dora.labelPillPadX * 2;
  const uradoraPillW = uradoraLabelTextW + theme.dora.labelPillPadX * 2;

  const tileRowSpan = (count: number, tileW: number): number =>
    count > 0 ? count * tileW + (count - 1) * theme.dora.tileGap : 0;

  const estimateDoraWidth = (tileW: number): number => {
    const doraChipW =
      theme.dora.chipPadX * 2 + tileRowSpan(data.dora.length, tileW);
    const uraChipW =
      theme.dora.chipPadX * 2 + tileRowSpan(data.uradora.length, tileW);
    return (
      doraPillW +
      theme.dora.labelGap +
      doraChipW +
      theme.dora.groupGap +
      uradoraPillW +
      theme.dora.labelGap +
      uraChipW
    );
  };

  const doraTileWidth =
    estimateDoraWidth(theme.dora.tileWidth) > contentWidth
      ? theme.dora.tileWidthCompact
      : theme.dora.tileWidth;
  const doraTileHeight = doraTileWidth * theme.tileAspectHeightOverWidth;
  const doraChipHeight = Math.ceil(doraTileHeight) + theme.dora.chipPadY * 2;
  const doraLabelPillY =
    doraTop + (doraChipHeight - theme.dora.labelPillHeight) / 2;
  const doraTileY = doraTop + (doraChipHeight - doraTileHeight) / 2;

  const doraLabels: DoraLabelPillLayout[] = [];
  const doraChips: DoraChipLayout[] = [];
  const doraTiles: PlacedTile[] = [];
  let dx = theme.paddingX;

  const appendDoraGroup = (
    label: string,
    labelTextW: number,
    pillWidth: number,
    tiles: TileOrBack[]
  ) => {
    doraLabels.push({
      text: label,
      x: dx,
      y: doraLabelPillY,
      width: pillWidth,
      height: theme.dora.labelPillHeight,
      cornerRadius: theme.dora.labelPillCornerRadius,
      bgColorRole: theme.colors.doraLabelBg,
      bgOpacity: theme.dora.labelBgOpacity,
      fgColorRole: theme.colors.doraLabelFg,
      textX: dx + pillWidth / 2,
      textY: doraLabelPillY + theme.dora.labelPillHeight / 2,
      fontSize: theme.dora.labelFontSize,
      maxWidth: labelTextW
    });
    dx += pillWidth + theme.dora.labelGap;

    const chipWidth =
      theme.dora.chipPadX * 2 + tileRowSpan(tiles.length, doraTileWidth);
    doraChips.push({
      x: dx,
      y: doraTop,
      width: chipWidth,
      height: doraChipHeight,
      cornerRadius: theme.dora.chipCornerRadius,
      borderWidth: theme.dora.chipBorderWidth,
      bgColorRole: theme.colors.doraChipBg,
      borderColorRole: theme.colors.doraChipBorder
    });

    let tx = dx + theme.dora.chipPadX;
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      if (!tile) continue;
      doraTiles.push({
        tile,
        x: tx,
        y: doraTileY,
        width: doraTileWidth,
        height: doraTileHeight
      });
      tx += doraTileWidth;
      if (i < tiles.length - 1) {
        tx += theme.dora.tileGap;
      }
    }
    dx += chipWidth + theme.dora.groupGap;
  };

  appendDoraGroup(theme.dora.doraLabel, doraLabelTextW, doraPillW, data.dora);
  appendDoraGroup(
    theme.dora.uradoraLabel,
    uradoraLabelTextW,
    uradoraPillW,
    data.uradora
  );

  const doraRowBottom = doraTop + doraChipHeight;

  // 3. 牌列 (左基準 x = paddingX。右端に badgePadX を残して和了牌背面の印を収める)
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

  // 印(背面台 + 上部文字帯)の縦位置をドラ欄・見出しピル・ヘッダー文字との非交差条件から決定する
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
    ...headerPills.map(p => ({
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height
    })),
    ...doraChips.map(c => ({
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height
    })),
    ...doraLabels.map(l => ({
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height
    }))
  ];

  let handY =
    doraRowBottom + theme.hand.minGapFromDora + theme.hand.badgeLabelBand;
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

  // 4. フッター帯の上から点数行・符飜と申告行を下詰めで配置する
  const pointsBaselineY = theme.footer.top - theme.score.bottomPadding;
  const pointsTopY = pointsBaselineY - theme.score.pointsAscentHeight;

  let rank: RankTextLayout | null = null;
  let declaration: RankTextLayout | null = null;
  let rankBlockHeight = 0;
  let scoreBlockTop = pointsTopY;

  const declFontPx = theme.score.declarationFontSize;
  const declLineHeight = Math.ceil(
    declFontPx * theme.score.rankLineHeightRatio
  );

  if (data.rankText !== null && data.declarationText !== null) {
    const declW = measure(
      data.declarationText,
      declFontPx,
      theme.fontWeightRegularNum
    );
    let fontPx = theme.score.rankFontSize;
    let fitsSingleLine = false;
    let rankW = 0;
    while (true) {
      rankW = measure(data.rankText, fontPx, theme.fontWeightRegularNum);
      if (rankW + theme.score.declarationGap + declW <= contentWidth) {
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
      const declX = theme.paddingX + rankW + theme.score.declarationGap;
      declaration = {
        text: data.declarationText,
        x: declX,
        y: baselineY,
        fontPx: declFontPx,
        maxWidth: theme.width - theme.paddingX - declX,
        colorRole: theme.colors.declaration
      };
    } else {
      rankBlockHeight = lineHeight + theme.score.rankLineGap + declLineHeight;
      const declBaselineY = pointsTopY - theme.score.rankGap;
      const rankBaselineY =
        declBaselineY - declLineHeight - theme.score.rankLineGap;
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
        fontPx: declFontPx,
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
    rankBlockHeight = declLineHeight;
    const baselineY = pointsTopY - theme.score.rankGap;
    scoreBlockTop = baselineY - rankBlockHeight;
    declaration = {
      text: data.declarationText,
      x: theme.paddingX,
      y: baselineY,
      fontPx: declFontPx,
      maxWidth: contentWidth,
      colorRole: theme.colors.declaration
    };
  }

  // 点数行: 数字と小さい「点」を同じベースラインで並べ、限度名は残り幅で縮める
  const digitsW = measure(
    data.totalDigits,
    theme.score.pointsFontSize,
    theme.fontWeightBoldNum
  );
  const unitW = measure(
    data.totalUnit,
    theme.score.pointsUnitFontSize,
    theme.fontWeightBoldNum
  );
  const totalWidth = digitsW + unitW;
  const total: TotalLayout = {
    digitsText: data.totalDigits,
    unitText: data.totalUnit,
    x: theme.paddingX,
    y: pointsBaselineY,
    digitsFontPx: theme.score.pointsFontSize,
    unitFontPx: theme.score.pointsUnitFontSize,
    unitX: theme.paddingX + digitsW,
    digitsColorRole: theme.colors.points
  };
  let limit: LimitLayout | null = null;
  if (data.limitName !== null) {
    const limitW = measure(
      data.limitName,
      theme.score.limitFontSize,
      theme.fontWeightBoldNum
    );
    const avail = contentWidth - totalWidth - theme.score.pointsGap;
    const fitted = Math.floor(
      (avail * theme.score.limitFontSize) / Math.max(limitW, Number.EPSILON)
    );
    const limitFontPx = Math.max(
      theme.score.limitMinFontSize,
      Math.min(theme.score.limitFontSize, fitted)
    );
    limit = {
      text: data.limitName,
      x: contentRight,
      y: pointsBaselineY,
      fontPx: limitFontPx,
      colorRole: theme.colors.limitName
    };
  }

  // 5. 役明細: 通常(数え役満含む)は 2列×最大6行 縦読み、真の役満は 1列×最大5行
  const badgeBottom = finalBadgeRect.y + finalBadgeRect.height;
  const yakuTop = Math.max(
    theme.yaku.top,
    badgeBottom + theme.yaku.minGapFromBadge
  );
  const yakuBottom = scoreBlockTop - theme.yaku.gapToScore;

  const yakuMode: 'normal' | 'yakuman' = data.isYakuman ? 'yakuman' : 'normal';
  const yakuChips: YakuChipLayout[] = [];

  if (data.isYakuman) {
    const items = data.yaku.slice(0, theme.yaku.yakumanMaxCount);
    const labelMaxWidth =
      theme.yaku.yakumanChipWidth - theme.yaku.yakumanChipPadX * 2;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const chipX = theme.paddingX;
      const chipY =
        yakuTop + i * (theme.yaku.yakumanChipHeight + theme.yaku.yakumanRowGap);
      const fitted = fitTextWithEllipsis(
        item.label,
        labelMaxWidth,
        theme.yaku.yakumanFontSize,
        theme.yaku.yakumanMinFontSize,
        theme.yaku.fontShrinkStep,
        theme.fontWeightRegularNum,
        theme.ellipsis,
        measure
      );
      yakuChips.push({
        x: chipX,
        y: chipY,
        width: theme.yaku.yakumanChipWidth,
        height: theme.yaku.yakumanChipHeight,
        cornerRadius: theme.yaku.yakumanChipCornerRadius,
        bgColorRole: theme.colors.yakuChipBg,
        label: fitted.text,
        labelX: chipX + theme.yaku.yakumanChipPadX,
        labelY: chipY + theme.yaku.yakumanChipHeight / 2,
        labelFontSize: fitted.fontSize,
        labelMaxWidth,
        labelColorRole: theme.colors.yakuLabel,
        hanBadge: null
      });
    }
  } else {
    const items = data.yaku.slice(0, theme.yaku.normalMaxCount);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const col = Math.floor(i / theme.yaku.normalMaxRows);
      const row = i % theme.yaku.normalMaxRows;
      const chipX =
        theme.paddingX +
        col * (theme.yaku.normalChipWidth + theme.yaku.normalColGap);
      const chipY =
        yakuTop + row * (theme.yaku.normalChipHeight + theme.yaku.normalRowGap);

      const hanW = measure(
        item.han,
        theme.yaku.hanBadgeFontSize,
        theme.fontWeightBoldNum
      );
      const badgeW = hanW + theme.yaku.hanBadgePadX * 2;
      const badgeH = theme.yaku.hanBadgeHeight;
      const hanBadgeX =
        chipX +
        theme.yaku.normalChipWidth -
        theme.yaku.normalChipPadRight -
        badgeW;
      const hanBadgeY = chipY + (theme.yaku.normalChipHeight - badgeH) / 2;

      const labelX = chipX + theme.yaku.normalChipPadLeft;
      const labelY = chipY + theme.yaku.normalChipHeight / 2;
      const labelMaxWidth = Math.max(
        0,
        hanBadgeX - theme.yaku.normalHanGap - labelX
      );
      const fitted = fitTextWithEllipsis(
        item.label,
        labelMaxWidth,
        theme.yaku.normalFontSize,
        theme.yaku.normalMinFontSize,
        theme.yaku.fontShrinkStep,
        theme.fontWeightRegularNum,
        theme.ellipsis,
        measure
      );

      yakuChips.push({
        x: chipX,
        y: chipY,
        width: theme.yaku.normalChipWidth,
        height: theme.yaku.normalChipHeight,
        cornerRadius: theme.yaku.normalChipCornerRadius,
        bgColorRole: theme.colors.yakuChipBg,
        label: fitted.text,
        labelX,
        labelY,
        labelFontSize: fitted.fontSize,
        labelMaxWidth,
        labelColorRole: theme.colors.yakuLabel,
        hanBadge: {
          text: item.han,
          x: hanBadgeX,
          y: hanBadgeY,
          width: badgeW,
          height: badgeH,
          cornerRadius: theme.yaku.hanBadgeCornerRadius,
          textX: hanBadgeX + badgeW / 2,
          textY: chipY + theme.yaku.normalChipHeight / 2,
          fontSize: theme.yaku.hanBadgeFontSize,
          bgColorRole: theme.colors.yakuHanBg,
          fgColorRole: theme.colors.yakuHanFg
        }
      });
    }
  }

  // 6. フッター
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
    headerPills,
    doraLabels,
    doraChips,
    doraTiles,
    handTiles,
    byBadge,
    yakuTop,
    yakuBottom,
    yakuMode,
    yakuChips,
    rank,
    declaration,
    rankBlockHeight,
    total,
    limit,
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
