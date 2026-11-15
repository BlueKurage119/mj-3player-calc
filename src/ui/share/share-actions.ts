import { buildShareText } from './share-config';

const REVOKE_DELAY_MS = 1000;

/** Web Share API で画像ファイルとテキストを共有する */
export async function shareFile(
  file: File,
  text: string = buildShareText()
): Promise<void> {
  await navigator.share({ files: [file], text });
}

/** a[download] で画像ファイルを保存し、1 秒後に Object URL を解放する */
export function saveFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body?.appendChild?.(a);
  a.click();
  a.remove?.();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
