export interface ShareSupport {
  share: boolean;
  copy: boolean;
}

/** Web Share API (files) と Clipboard PNG 書き込みの対応状況を同期判定する */
export function detectShareSupport(): ShareSupport {
  let share = false;
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof File !== 'undefined'
  ) {
    try {
      const probe = new File([], 'probe.png', { type: 'image/png' });
      share = navigator.canShare({ files: [probe] }) === true;
    } catch {
      share = false;
    }
  }

  const copy =
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function';

  return { share, copy };
}
