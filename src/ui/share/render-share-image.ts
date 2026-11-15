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

function fillRoundedRect(
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
  ctx.fill();
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

  // 1. 背景
  ctx.fillStyle = colors[layout.backgroundColorRole];
  ctx.fillRect(0, 0, layout.width, layout.height);

  // 2. ヘッダー文字行
  ctx.fillStyle = colors[layout.header.colorRole];
  ctx.font = formatFont(
    theme.fontWeightRegular,
    layout.header.fontSize,
    theme.fontFamily
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    layout.header.text,
    layout.header.x,
    layout.header.y,
    layout.header.maxWidth
  );

  // 3. ドラ・裏ドラ・抜き北
  ctx.textBaseline = 'middle';
  for (const label of layout.doraLabels) {
    ctx.fillStyle = colors[label.colorRole];
    ctx.font = formatFont(
      theme.fontWeightRegular,
      label.fontSize,
      theme.fontFamily
    );
    ctx.fillText(label.text, label.x, label.y, label.maxWidth);
  }
  drawTileGroup(ctx, layout.doraTiles, loadedImages, theme);

  // 4. ツモ/ロンの印の背面台 (牌列より先に描き、和了牌の全面を見せる)
  if (layout.byBadge.opacity < 1) {
    ctx.save();
    ctx.globalAlpha = layout.byBadge.opacity;
    ctx.fillStyle = colors[layout.byBadge.bgColorRole];
    fillRoundedRect(
      ctx,
      layout.byBadge.x,
      layout.byBadge.y,
      layout.byBadge.width,
      layout.byBadge.height,
      layout.byBadge.cornerRadius
    );
    ctx.restore();
  } else {
    ctx.fillStyle = colors[layout.byBadge.bgColorRole];
    fillRoundedRect(
      ctx,
      layout.byBadge.x,
      layout.byBadge.y,
      layout.byBadge.width,
      layout.byBadge.height,
      layout.byBadge.cornerRadius
    );
  }

  // 5. 牌列 (和了牌を含む全牌)
  drawTileGroup(ctx, layout.handTiles, loadedImages, theme);

  // 6. ツモ/ロンの印の文字 (文字帯にあり牌と重ならない)
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

  // 7. 役一覧
  ctx.textBaseline = 'middle';
  for (const row of layout.yakuRows) {
    ctx.fillStyle = colors[row.colorRole];
    ctx.font = formatFont(
      theme.fontWeightRegular,
      row.fontSize,
      theme.fontFamily
    );
    ctx.textAlign = 'left';
    ctx.fillText(row.label, row.labelX, row.y, row.labelMaxWidth);
    ctx.textAlign = 'right';
    ctx.fillText(row.han, row.hanRightX, row.y);
  }

  // 8. 符・飜と申告
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

  // 9. 点数と格 (同一ベースライン)
  let pointsFontSize = layout.score.pointsFontSize;
  let limitFontSize = layout.score.limitFontSize;
  if (layout.score.limitName !== null) {
    ctx.font = formatFont(
      theme.fontWeightBold,
      pointsFontSize,
      theme.fontFamily
    );
    const pointsWidth = ctx.measureText(layout.score.totalText).width;
    ctx.font = formatFont(
      theme.fontWeightBold,
      limitFontSize,
      theme.fontFamily
    );
    const limitWidth = ctx.measureText(layout.score.limitName).width;
    const needed = pointsWidth + layout.score.pointsGap + limitWidth;
    if (needed > layout.score.maxWidth) {
      const ratio = layout.score.maxWidth / needed;
      pointsFontSize = Math.floor(pointsFontSize * ratio);
      limitFontSize = Math.floor(limitFontSize * ratio);
    }
  }

  ctx.fillStyle = colors[layout.score.pointsColorRole];
  ctx.font = formatFont(theme.fontWeightBold, pointsFontSize, theme.fontFamily);
  ctx.textAlign = 'left';
  ctx.fillText(layout.score.totalText, layout.score.x, layout.score.baselineY);

  if (layout.score.limitName !== null) {
    ctx.fillStyle = colors[layout.score.limitColorRole];
    ctx.font = formatFont(
      theme.fontWeightBold,
      limitFontSize,
      theme.fontFamily
    );
    ctx.textAlign = 'right';
    ctx.fillText(
      layout.score.limitName,
      layout.score.rightX,
      layout.score.baselineY
    );
  }

  // 10. フッター帯・文字・QR
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
