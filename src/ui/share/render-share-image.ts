import { tileImageOf } from '../tile';
import { qrMatrix } from './qr';
import type { ShareColors } from './share-data';
import type { PlacedTile, QrLayout, ShareLayout } from './share-layout';
import type { ShareTheme } from './share-theme';
import { loadSvgImage } from './svg-image';

function formatFont(weight: string, size: number, family: string): string {
  return `${weight} ${size}px ${family}`;
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  minFontSize: number,
  maxWidth: number,
  theme: ShareTheme,
  weight: string
): void {
  let size = fontSize;
  while (size > minFontSize) {
    ctx.font = formatFont(weight, size, theme.fontFamily);
    if (ctx.measureText(text).width <= maxWidth) {
      ctx.fillText(text, x, y);
      return;
    }
    size -= theme.footer.fontShrinkStep;
  }

  const clampedSize = Math.max(minFontSize, size);
  ctx.font = formatFont(weight, clampedSize, theme.fontFamily);
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }

  let end = text.length;
  while (
    end > 0 &&
    ctx.measureText(`${text.slice(0, end)}${theme.ellipsis}`).width > maxWidth
  ) {
    end -= 1;
  }
  ctx.fillText(`${text.slice(0, end)}${theme.ellipsis}`, x, y, maxWidth);
}

function drawQr(
  ctx: CanvasRenderingContext2D,
  qr: QrLayout,
  colors: ShareColors
): void {
  ctx.fillStyle = colors[qr.bgColorRole];
  ctx.fillRect(qr.x, qr.y, qr.size, qr.size);

  let matrix = qrMatrix(qr.url, qr.eccDefault);
  let modulePx = Math.floor(qr.size / (matrix.length + qr.quietZone * 2));
  if (modulePx < qr.minModulePx) {
    matrix = qrMatrix(qr.url, qr.eccFallback);
    modulePx = Math.floor(qr.size / (matrix.length + qr.quietZone * 2));
  }
  const totalSize = matrix.length * modulePx;
  const offset = Math.floor((qr.size - totalSize) / 2);

  ctx.fillStyle = colors[qr.fgColorRole];
  for (let row = 0; row < matrix.length; row++) {
    const line = matrix[row];
    if (!line) continue;
    for (let col = 0; col < line.length; col++) {
      if (line[col]) {
        ctx.fillRect(
          qr.x + offset + col * modulePx,
          qr.y + offset + row * modulePx,
          modulePx,
          modulePx
        );
      }
    }
  }
}

function drawTileGroup(
  ctx: CanvasRenderingContext2D,
  tiles: PlacedTile[],
  loadedImages: Map<string, HTMLImageElement>,
  theme: ShareTheme
): void {
  for (const placed of tiles) {
    const imgInfo = tileImageOf(placed.tile);
    const baseImg = loadedImages.get(imgInfo.base);
    if (baseImg) {
      ctx.drawImage(baseImg, placed.x, placed.y, placed.width, placed.height);
    }
    if (imgInfo.face !== null) {
      const faceImg = loadedImages.get(imgInfo.face);
      if (faceImg) {
        const fw = placed.width * theme.tileFaceScale;
        const fh = placed.height * theme.tileFaceScale;
        const fx = placed.x + (placed.width - fw) / 2;
        const fy = placed.y + (placed.height - fh) / 2;
        ctx.drawImage(faceImg, fx, fy, fw, fh);
      }
    }
  }
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRoundedRectWithOpacity(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
  opacity: number
): void {
  if (opacity < 1) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    traceRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = color;
  traceRoundedRect(ctx, x, y, width, height, radius);
  ctx.fill();
}

function drawSvgPathIcon(
  ctx: CanvasRenderingContext2D,
  pathData: string,
  x: number,
  y: number,
  size: number,
  viewBoxSize: number,
  viewBoxMinY: number,
  color: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  const scale = size / viewBoxSize;
  ctx.scale(scale, scale);
  ctx.translate(0, -viewBoxMinY);
  ctx.fill(new Path2D(pathData));
  ctx.restore();
}

/** ShareLayout をオフスクリーン canvas へ描画し PNG Blob を返す */
export async function renderShareImage(
  layout: ShareLayout,
  theme: ShareTheme,
  colors: ShareColors
): Promise<Blob> {
  const urls = new Set<string>();
  for (const placed of [...layout.doraTiles, ...layout.handTiles]) {
    const { base, face } = tileImageOf(placed.tile);
    urls.add(base);
    if (face !== null) {
      urls.add(face);
    }
  }

  const loadedImages = new Map<string, HTMLImageElement>();
  await Promise.all(
    Array.from(urls).map(async url => {
      const img = await loadSvgImage(
        url,
        theme.tileSvgWidth,
        theme.tileSvgHeight
      );
      loadedImages.set(url, img);
    })
  );

  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D コンテキストを取得できませんでした');
  }

  // 背景
  ctx.fillStyle = colors[layout.backgroundColorRole];
  ctx.fillRect(0, 0, layout.width, layout.height);

  // 見出し: 左に場風・自風、右に本場・供託・北ピル
  ctx.fillStyle = colors[layout.header.colorRole];
  ctx.font = formatFont(
    theme.fontWeightBold,
    layout.header.fontSize,
    theme.fontFamily
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    layout.header.text,
    layout.header.x,
    layout.header.baselineY,
    layout.header.maxWidth
  );

  for (const pill of layout.headerPills) {
    fillRoundedRectWithOpacity(
      ctx,
      pill.x,
      pill.y,
      pill.width,
      pill.height,
      pill.cornerRadius,
      colors[pill.bgColorRole],
      pill.bgOpacity
    );
    if (pill.iconPath !== null) {
      drawSvgPathIcon(
        ctx,
        pill.iconPath,
        pill.iconX,
        pill.iconY,
        pill.iconSize,
        theme.header.iconViewBoxSize,
        theme.header.iconViewBoxMinY,
        colors[pill.fgColorRole]
      );
    }
    ctx.fillStyle = colors[pill.fgColorRole];
    ctx.font = formatFont(
      theme.fontWeightSemibold,
      pill.fontSize,
      theme.fontFamily
    );
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(pill.text, pill.textX, pill.textY);
  }

  // ドラ・裏ドラ欄 (ラベルピル + 牌チップ)
  for (const label of layout.doraLabels) {
    fillRoundedRectWithOpacity(
      ctx,
      label.x,
      label.y,
      label.width,
      label.height,
      label.cornerRadius,
      colors[label.bgColorRole],
      label.bgOpacity
    );
    ctx.fillStyle = colors[label.fgColorRole];
    ctx.font = formatFont(
      theme.fontWeightRegular,
      label.fontSize,
      theme.fontFamily
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.text, label.textX, label.textY, label.maxWidth);
  }

  for (const chip of layout.doraChips) {
    traceRoundedRect(
      ctx,
      chip.x,
      chip.y,
      chip.width,
      chip.height,
      chip.cornerRadius
    );
    ctx.fillStyle = colors[chip.bgColorRole];
    ctx.fill();
    ctx.strokeStyle = colors[chip.borderColorRole];
    ctx.lineWidth = chip.borderWidth;
    ctx.stroke();
  }
  drawTileGroup(ctx, layout.doraTiles, loadedImages, theme);

  // ツモ/ロンの印の背面台 (牌列より先に描き、和了牌の全面を見せる)
  fillRoundedRectWithOpacity(
    ctx,
    layout.byBadge.x,
    layout.byBadge.y,
    layout.byBadge.width,
    layout.byBadge.height,
    layout.byBadge.cornerRadius,
    colors[layout.byBadge.bgColorRole],
    layout.byBadge.opacity
  );

  // 牌列 (和了牌を含む全牌)
  drawTileGroup(ctx, layout.handTiles, loadedImages, theme);

  // ツモ/ロンの印の文字 (文字帯にあり牌と重ならない)
  ctx.fillStyle = colors[layout.byBadge.fgColorRole];
  ctx.font = formatFont(
    theme.fontWeightBold,
    layout.byBadge.fontSize,
    theme.fontFamily
  );
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    layout.byBadge.label,
    layout.byBadge.labelX,
    layout.byBadge.labelY
  );

  // 役明細チップ
  for (const chip of layout.yakuChips) {
    ctx.fillStyle = colors[chip.bgColorRole];
    traceRoundedRect(
      ctx,
      chip.x,
      chip.y,
      chip.width,
      chip.height,
      chip.cornerRadius
    );
    ctx.fill();

    ctx.fillStyle = colors[chip.labelColorRole];
    ctx.font = formatFont(
      theme.fontWeightRegular,
      chip.labelFontSize,
      theme.fontFamily
    );
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(chip.label, chip.labelX, chip.labelY, chip.labelMaxWidth);

    if (chip.hanBadge !== null) {
      const badge = chip.hanBadge;
      ctx.fillStyle = colors[badge.bgColorRole];
      traceRoundedRect(
        ctx,
        badge.x,
        badge.y,
        badge.width,
        badge.height,
        badge.cornerRadius
      );
      ctx.fill();

      ctx.fillStyle = colors[badge.fgColorRole];
      ctx.font = formatFont(
        theme.fontWeightBold,
        badge.fontSize,
        theme.fontFamily
      );
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badge.text, badge.textX, badge.textY);
    }
  }

  // 符・飜と申告
  ctx.textBaseline = 'alphabetic';
  if (layout.rank !== null) {
    ctx.fillStyle = colors[layout.rank.colorRole];
    ctx.font = formatFont(
      theme.fontWeightRegular,
      layout.rank.fontPx,
      theme.fontFamily
    );
    ctx.textAlign = 'left';
    ctx.fillText(
      layout.rank.text,
      layout.rank.x,
      layout.rank.y,
      layout.rank.maxWidth
    );
  }
  if (layout.declaration !== null) {
    ctx.fillStyle = colors[layout.declaration.colorRole];
    ctx.font = formatFont(
      theme.fontWeightRegular,
      layout.declaration.fontPx,
      theme.fontFamily
    );
    ctx.textAlign = 'left';
    ctx.fillText(
      layout.declaration.text,
      layout.declaration.x,
      layout.declaration.y,
      layout.declaration.maxWidth
    );
  }

  // 点数(数字と小さい「点」)と格 (同一ベースライン)
  ctx.fillStyle = colors[layout.total.digitsColorRole];
  ctx.textAlign = 'left';
  ctx.font = formatFont(
    theme.fontWeightBold,
    layout.total.digitsFontPx,
    theme.fontFamily
  );
  ctx.fillText(layout.total.digitsText, layout.total.x, layout.total.y);
  ctx.font = formatFont(
    theme.fontWeightBold,
    layout.total.unitFontPx,
    theme.fontFamily
  );
  ctx.fillText(layout.total.unitText, layout.total.unitX, layout.total.y);

  if (layout.limit !== null) {
    ctx.fillStyle = colors[layout.limit.colorRole];
    ctx.font = formatFont(
      theme.fontWeightBold,
      layout.limit.fontPx,
      theme.fontFamily
    );
    ctx.textAlign = 'right';
    ctx.fillText(layout.limit.text, layout.limit.x, layout.limit.y);
  }

  // フッター帯・文字・QR
  ctx.fillStyle = colors[layout.footer.band.colorRole];
  ctx.fillRect(
    layout.footer.band.x,
    layout.footer.band.y,
    layout.footer.band.width,
    layout.footer.band.height
  );

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = colors[layout.footer.title.colorRole];
  drawFittedText(
    ctx,
    layout.footer.title.text,
    layout.footer.title.x,
    layout.footer.title.y,
    layout.footer.title.fontSize,
    theme.footer.urlMinFontSize,
    layout.footer.title.maxWidth,
    theme,
    theme.fontWeightBold
  );

  if (layout.footer.url !== null) {
    ctx.fillStyle = colors[layout.footer.url.colorRole];
    drawFittedText(
      ctx,
      layout.footer.url.text,
      layout.footer.url.x,
      layout.footer.url.y,
      layout.footer.url.fontSize,
      layout.footer.url.minFontSize,
      layout.footer.url.maxWidth,
      theme,
      theme.fontWeightRegular
    );
  }

  if (layout.footer.qr !== null) {
    drawQr(ctx, layout.footer.qr, colors);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('PNG の生成に失敗しました'));
      }
    }, theme.mimeType);
  });
}
