import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { ScoredHora } from '../../../core/result';
import {
  SYMBOL_CONTENT_COPY,
  SYMBOL_DOWNLOAD,
  SYMBOL_SHARE,
  SymbolIcon
} from '../../icons';
import { IconButton } from '../../md';
import { detectShareSupport, loadShareModule } from '../../share';
import type { ResultContext, ShareInput } from './HoraDetail';

const COPY_STATUS_DURATION_MS = 4000;

export interface ShareControlsProps {
  hora: ScoredHora;
  context: ResultContext & { share: ShareInput };
}

export interface PreparedShare {
  file: File;
  text: string;
  shareFile: (file: File, text?: string) => Promise<void>;
}

export interface ShareHandlerDeps {
  hora: ScoredHora;
  context: ResultContext & { share: ShareInput };
  preparedRef: { current: PreparedShare | null };
  setBusy: (busy: boolean) => void;
  clearStatus: () => void;
  showStatus: (message: string, autoClearMs?: number) => void;
}

function errorNameOf(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'name' in err) {
    const name = (err as { name?: unknown }).name;
    return typeof name === 'string' ? name : null;
  }
  return null;
}

/** 共有・保存・コピーボタンのクリックハンドラを生成する */
export function createShareHandlers(deps: ShareHandlerDeps) {
  const { hora, context, preparedRef, setBusy, clearStatus, showStatus } = deps;

  const handleShare = async () => {
    const prepared = preparedRef.current;
    if (prepared !== null) {
      preparedRef.current = null;
      setBusy(true);
      clearStatus();
      try {
        // 保持中の再押下では await を挟まず同期に share() を呼ぶ
        await prepared.shareFile(prepared.file, prepared.text);
      } catch (err) {
        if (errorNameOf(err) !== 'AbortError') {
          showStatus('画像を作成できませんでした');
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    clearStatus();
    try {
      const mod = await loadShareModule();
      const file = await mod.createShareImage(hora, context);
      const text = mod.buildShareText();
      try {
        await mod.shareFile(file, text);
      } catch (err) {
        const name = errorNameOf(err);
        if (name === 'NotAllowedError') {
          preparedRef.current = {
            file,
            text,
            shareFile: mod.shareFile
          };
          showStatus('準備ができました。もう一度押してください');
          return;
        }
        if (name !== 'AbortError') {
          showStatus('画像を作成できませんでした');
        }
      }
    } catch {
      showStatus('画像を作成できませんでした');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    clearStatus();
    try {
      const mod = await loadShareModule();
      const file = await mod.createShareImage(hora, context);
      mod.saveFile(file);
    } catch {
      showStatus('画像を作成できませんでした');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    setBusy(true);
    clearStatus();
    try {
      // クリックハンドラの同期区間内で ClipboardItem と clipboard.write を呼ぶ (Safari 対応)
      const item = new ClipboardItem({
        'image/png': loadShareModule().then(m =>
          m.createShareImage(hora, context)
        )
      });
      await navigator.clipboard.write([item]);
      showStatus('コピーしました', COPY_STATUS_DURATION_MS);
    } catch {
      showStatus('画像を作成できませんでした');
    } finally {
      setBusy(false);
    }
  };

  return { handleShare, handleSave, handleCopy };
}

/** 共有・保存・コピーのアイコンボタン群 */
export function ShareControls({
  hora,
  context
}: ShareControlsProps): React.JSX.Element {
  const support = detectShareSupport();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preparedRef = useRef<PreparedShare | null>(null);
  const shareInput = context.share;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearStatus = () => {
    clearTimer();
    setStatus(null);
  };

  const showStatus = (message: string, autoClearMs?: number) => {
    clearTimer();
    setStatus(message);
    if (autoClearMs !== undefined) {
      timerRef.current = setTimeout(() => {
        setStatus(null);
        timerRef.current = null;
      }, autoClearMs);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: カードの対象(和了結果・入力状態)変化時に保持済みファイルを破棄する
  useEffect(() => {
    preparedRef.current = null;
  }, [hora, shareInput]);

  const { handleShare, handleSave, handleCopy } = createShareHandlers({
    hora,
    context,
    preparedRef,
    setBusy,
    clearStatus,
    showStatus
  });

  return (
    <div className="share-controls">
      <div className="share-controls__actions">
        {support.share ? (
          <IconButton
            variant="standard"
            label="画像を共有"
            disabled={busy}
            className="share-controls__button"
            onClick={handleShare}
          >
            <SymbolIcon d={SYMBOL_SHARE} />
          </IconButton>
        ) : null}
        <IconButton
          variant="standard"
          label="画像を保存"
          disabled={busy}
          className="share-controls__button"
          onClick={handleSave}
        >
          <SymbolIcon d={SYMBOL_DOWNLOAD} />
        </IconButton>
        {support.copy ? (
          <IconButton
            variant="standard"
            label="画像をコピー"
            disabled={busy}
            className="share-controls__button"
            onClick={handleCopy}
          >
            <SymbolIcon d={SYMBOL_CONTENT_COPY} />
          </IconButton>
        ) : null}
      </div>
      <output className="share-controls__status">{status ?? ''}</output>
    </div>
  );
}
