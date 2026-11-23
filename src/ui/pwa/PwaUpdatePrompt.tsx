import type React from 'react';
import { usePwaUpdate } from '../../pwa/use-pwa-update';
import { Snackbar } from '../expressive';

/** PWA の新バージョン待機を検知し、画面下部に更新通知を表示する */
export function PwaUpdatePrompt(): React.JSX.Element {
  const { needRefresh, updating, applyUpdate } = usePwaUpdate();

  return (
    <Snackbar
      open={needRefresh}
      message="新しいバージョンがあります"
      actionLabel="更新"
      actionDisabled={updating}
      onAction={() => {
        void applyUpdate();
      }}
    />
  );
}
