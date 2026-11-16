import fs from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import { readTokenValues, resolveColorPlaceholders } from './theme-colors.ts';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    const idx = (crc ^ byte) & 0xff;
    crc = (CRC_TABLE[idx] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * RGBA ピクセル配列を colorType=2 (RGB, アルファなし) の PNG バイト列へ変換する。
 */
function encodeRgbPng(
  width: number,
  height: number,
  rgbaPixels: Uint8Array
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: Truecolor (RGB, no alpha)
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  const stride = 1 + width * 3;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const srcOffset = (y * width + x) * 4;
      const dstOffset = rowStart + 1 + x * 3;
      raw[dstOffset] = rgbaPixels[srcOffset] ?? 0;
      raw[dstOffset + 1] = rgbaPixels[srcOffset + 1] ?? 0;
      raw[dstOffset + 2] = rgbaPixels[srcOffset + 2] ?? 0;
    }
  }

  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    PNG_SIGNATURE,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
}

function renderPng(
  svgText: string,
  width: number,
  opaqueBackground?: string
): Buffer {
  const resvg = new Resvg(svgText, {
    fitTo: { mode: 'width', value: width },
    ...(opaqueBackground ? { background: opaqueBackground } : {})
  });
  const rendered = resvg.render();
  if (opaqueBackground !== undefined) {
    return encodeRgbPng(rendered.width, rendered.height, rendered.pixels);
  }
  return Buffer.from(rendered.asPng());
}

interface GeneratedAsset {
  relPath: string;
  content: Buffer;
}

function buildAssets(rootDir: string): GeneratedAsset[] {
  const tokensPath = path.resolve(rootDir, 'src/ui/theme/tokens.css');
  const iconSvgPath = path.resolve(rootDir, 'assets-src/icon/icon.svg');
  const maskableSvgPath = path.resolve(
    rootDir,
    'assets-src/icon/icon-maskable.svg'
  );

  const tokensCss = fs.readFileSync(tokensPath, 'utf-8');
  const lightTokens = readTokenValues(tokensCss, 'light', [
    'primary-container'
  ]);

  const iconSvgRaw = fs.readFileSync(iconSvgPath, 'utf-8');
  const maskableSvgRaw = fs.readFileSync(maskableSvgPath, 'utf-8');

  const resolvedIconSvg = resolveColorPlaceholders(iconSvgRaw, lightTokens);
  const resolvedMaskableSvg = resolveColorPlaceholders(
    maskableSvgRaw,
    lightTokens
  );

  const appleBg = lightTokens['primary-container'];

  return [
    {
      relPath: 'public/favicon.svg',
      content: Buffer.from(resolvedIconSvg, 'utf-8')
    },
    {
      relPath: 'public/icons/icon-192.png',
      content: renderPng(resolvedIconSvg, 192)
    },
    {
      relPath: 'public/icons/icon-512.png',
      content: renderPng(resolvedIconSvg, 512)
    },
    {
      relPath: 'public/icons/icon-maskable-512.png',
      content: renderPng(resolvedMaskableSvg, 512)
    },
    {
      relPath: 'public/icons/apple-touch-icon-180.png',
      content: renderPng(resolvedMaskableSvg, 180, appleBg)
    }
  ];
}

function run(): void {
  const isCheck = process.argv.includes('--check');
  const rootDir = process.cwd();
  const assets = buildAssets(rootDir);

  if (isCheck) {
    let hasMismatch = false;
    for (const asset of assets) {
      const targetPath = path.resolve(rootDir, asset.relPath);
      if (!fs.existsSync(targetPath)) {
        console.error(`Missing icon asset: ${asset.relPath}`);
        hasMismatch = true;
        continue;
      }
      const existing = fs.readFileSync(targetPath);
      if (Buffer.compare(existing, asset.content) !== 0) {
        console.error(`Outdated icon asset: ${asset.relPath}`);
        hasMismatch = true;
      }
    }
    if (hasMismatch) {
      process.exit(1);
    }
    console.log('Icon assets are up to date.');
    process.exit(0);
  }

  for (const asset of assets) {
    const targetPath = path.resolve(rootDir, asset.relPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, asset.content);
    console.log(`Generated ${asset.relPath} (${asset.content.length} B)`);
  }
}

run();
