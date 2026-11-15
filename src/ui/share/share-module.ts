import type { ScoredHora } from '../../core/result';
import type { ResultContext, ShareInput } from '../result/hora/HoraDetail';
import { readLightColors } from './light-colors';
import { renderShareImage } from './render-share-image';
import { saveFile, shareFile } from './share-actions';
import {
  SHARE_IMAGE_MIME,
  buildShareFileName,
  buildShareText
} from './share-config';
import { buildShareData } from './share-data';
import { layoutShareImage } from './share-layout';
import { SHARE_THEME_V1 } from './share-theme';

/** 和了結果と入力状況から共有用 PNG File を生成する(結果→画像の唯一の公開入口) */
export async function createShareImage(
  hora: ScoredHora,
  context: ResultContext & { share: ShareInput }
): Promise<File> {
  const data = buildShareData(hora, context);
  const layout = layoutShareImage(data, SHARE_THEME_V1);
  const colors = readLightColors();
  const blob = await renderShareImage(layout, SHARE_THEME_V1, colors);
  const fileName = buildShareFileName(data.by);
  return new File([blob], fileName, { type: SHARE_IMAGE_MIME });
}

export { shareFile, saveFile, buildShareText };
