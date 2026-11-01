import type { TileOrBack } from '../../core/tile';
import backUrl from './assets/Back.svg?no-inline';
import chunUrl from './assets/Chun.svg?no-inline';
import frontUrl from './assets/Front.svg?no-inline';
import hatsuUrl from './assets/Hatsu.svg?no-inline';
import man1Url from './assets/Man1.svg?no-inline';
import man9Url from './assets/Man9.svg?no-inline';
import nanUrl from './assets/Nan.svg?no-inline';
import peiUrl from './assets/Pei.svg?no-inline';
import pin1Url from './assets/Pin1.svg?no-inline';
import pin2Url from './assets/Pin2.svg?no-inline';
import pin3Url from './assets/Pin3.svg?no-inline';
import pin4Url from './assets/Pin4.svg?no-inline';
import pin5DoraUrl from './assets/Pin5-Dora.svg?no-inline';
import pin5Url from './assets/Pin5.svg?no-inline';
import pin6Url from './assets/Pin6.svg?no-inline';
import pin7Url from './assets/Pin7.svg?no-inline';
import pin8Url from './assets/Pin8.svg?no-inline';
import pin9Url from './assets/Pin9.svg?no-inline';
import shaaUrl from './assets/Shaa.svg?no-inline';
import sou1Url from './assets/Sou1.svg?no-inline';
import sou2Url from './assets/Sou2.svg?no-inline';
import sou3Url from './assets/Sou3.svg?no-inline';
import sou4Url from './assets/Sou4.svg?no-inline';
import sou5DoraUrl from './assets/Sou5-Dora.svg?no-inline';
import sou5Url from './assets/Sou5.svg?no-inline';
import sou6Url from './assets/Sou6.svg?no-inline';
import sou7Url from './assets/Sou7.svg?no-inline';
import sou8Url from './assets/Sou8.svg?no-inline';
import sou9Url from './assets/Sou9.svg?no-inline';
import tonUrl from './assets/Ton.svg?no-inline';

/** 牌 1 枚の画像。face が null のときは base だけを描く(白・裏) */
export interface TileImage {
  base: string; // Front.svg または Back.svg の URL
  face: string | null; // 図柄の URL
}

const pinUrls = [
  pin1Url,
  pin2Url,
  pin3Url,
  pin4Url,
  pin5Url,
  pin6Url,
  pin7Url,
  pin8Url,
  pin9Url
];

const souUrls = [
  sou1Url,
  sou2Url,
  sou3Url,
  sou4Url,
  sou5Url,
  sou6Url,
  sou7Url,
  sou8Url,
  sou9Url
];

const honorUrls: Record<number, string | null> = {
  1: tonUrl,
  2: nanUrl,
  3: shaaUrl,
  4: peiUrl,
  5: null, // 白は図柄なし
  6: hatsuUrl,
  7: chunUrl
};

const honorLabels: Record<number, string> = {
  1: '東',
  2: '南',
  3: '西',
  4: '北',
  5: '白',
  6: '發',
  7: '中'
};

/** 三麻で使わない牌(2m〜8m、赤 5m)は例外を投げる */
export function tileImageOf(tile: TileOrBack): TileImage {
  if (tile.type === 'back') {
    return { base: backUrl, face: null };
  }

  if (tile.type === 'm') {
    if (tile.n === 1) {
      return { base: frontUrl, face: man1Url };
    }
    if (tile.n === 9) {
      return { base: frontUrl, face: man9Url };
    }
    throw new Error(`三麻で使わない牌: ${JSON.stringify(tile)}`);
  }

  if (tile.type === 'p') {
    if (tile.n === 5 && tile.red) {
      return { base: frontUrl, face: pin5DoraUrl };
    }
    const face = pinUrls[tile.n - 1];
    if (face === undefined) {
      throw new Error(`無効な筒子: ${JSON.stringify(tile)}`);
    }
    return { base: frontUrl, face };
  }

  if (tile.type === 's') {
    if (tile.n === 5 && tile.red) {
      return { base: frontUrl, face: sou5DoraUrl };
    }
    const face = souUrls[tile.n - 1];
    if (face === undefined) {
      throw new Error(`無効な索子: ${JSON.stringify(tile)}`);
    }
    return { base: frontUrl, face };
  }

  if (tile.type === 'z') {
    const face = honorUrls[tile.n];
    if (face === undefined) {
      throw new Error(`無効な字牌: ${JSON.stringify(tile)}`);
    }
    return { base: frontUrl, face };
  }

  throw new Error(`未知の牌種: ${JSON.stringify(tile)}`);
}

/** 既定の aria-label(2.5)。三麻で使わない牌は tileImageOf と同様に例外を投げる */
export function tileLabelOf(tile: TileOrBack): string {
  if (tile.type === 'back') {
    return '裏';
  }

  if (tile.type === 'm') {
    if (tile.n === 1) {
      return '1萬';
    }
    if (tile.n === 9) {
      return '9萬';
    }
    throw new Error(`三麻で使わない牌: ${JSON.stringify(tile)}`);
  }

  if (tile.type === 'p') {
    if (tile.n === 5 && tile.red) {
      return '赤5筒';
    }
    return `${tile.n}筒`;
  }

  if (tile.type === 's') {
    if (tile.n === 5 && tile.red) {
      return '赤5索';
    }
    return `${tile.n}索`;
  }

  if (tile.type === 'z') {
    const label = honorLabels[tile.n];
    if (label === undefined) {
      throw new Error(`無効な字牌: ${JSON.stringify(tile)}`);
    }
    return label;
  }

  throw new Error(`未知の牌種: ${JSON.stringify(tile)}`);
}
