import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const UPDATE_CHECK_MIN_INTERVAL_MS = 60_000;
export const ACTIVATION_WAIT_TIMEOUT_MS = 3_000;

export interface PwaUpdateState {
  /** 待機中の新 SW があり、更新通知を表示すべきとき true */
  needRefresh: boolean;
  /** 「更新」押下後、新 SW 有効化〜リロード待ちの間 true */
  updating: boolean;
  /** 待機中の新 SW に SKIP_WAITING を送りリロードを開始する */
  applyUpdate: () => Promise<void>;
}

export interface VisibilityUpdateCheckOptions {
  registration: Pick<ServiceWorkerRegistration, 'update'>;
  doc?: Pick<
    Document,
    'visibilityState' | 'addEventListener' | 'removeEventListener'
  >;
  isOnline?: () => boolean;
  now?: () => number;
  minIntervalMs?: number;
}

/**
 * visibilitychange による throttled な registration.update() リスナーを登録し、解除関数を返す。
 */
export function attachVisibilityUpdateCheck(
  options: VisibilityUpdateCheckOptions
): () => void {
  const doc =
    options.doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!doc) {
    return () => {};
  }

  const now = options.now ?? Date.now;
  const isOnline =
    options.isOnline ??
    (() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const minIntervalMs = options.minIntervalMs ?? UPDATE_CHECK_MIN_INTERVAL_MS;

  // 装着時点を初回確認済み扱いとし、minIntervalMs 経過後の visible 復帰から更新確認する
  let lastCheckAt = now();

  const handleVisibilityChange = () => {
    if (doc.visibilityState !== 'visible') {
      return;
    }
    if (!isOnline()) {
      return;
    }
    const currentNow = now();
    if (currentNow - lastCheckAt < minIntervalMs) {
      return;
    }
    lastCheckAt = currentNow;
    void Promise.resolve(options.registration.update()).catch(() => {
      // オフライン・通信断等での更新確認失敗時は握り潰して UI を維持する
    });
  };

  doc.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    doc.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

function waitForWorkerActivation(
  worker: ServiceWorker | null | undefined,
  timeoutMs = ACTIVATION_WAIT_TIMEOUT_MS
): Promise<void> {
  if (!worker || worker.state === 'activated' || worker.state === 'redundant') {
    return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      worker.removeEventListener('statechange', handleStateChange);
      clearTimeout(timer);
      resolve();
    };
    const handleStateChange = () => {
      if (worker.state === 'activated' || worker.state === 'redundant') {
        finish();
      }
    };
    const timer = setTimeout(finish, timeoutMs);
    worker.addEventListener('statechange', handleStateChange);
  });
}

export function usePwaUpdate(): PwaUpdateState {
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(
    undefined
  );
  const [registration, setRegistration] = useState<
    ServiceWorkerRegistration | undefined
  >(undefined);
  const mountedRef = useRef(false);
  const updatingRef = useRef(false);
  const [updating, setUpdating] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      if (!reg) {
        return;
      }
      registrationRef.current = reg;
      if (mountedRef.current) {
        setRegistration(reg);
      }
    }
  });

  useEffect(() => {
    mountedRef.current = true;
    const target = registration ?? registrationRef.current;
    const cleanup = target
      ? attachVisibilityUpdateCheck({ registration: target })
      : undefined;
    return () => {
      mountedRef.current = false;
      cleanup?.();
    };
  }, [registration]);

  const applyUpdate = useCallback(async () => {
    if (updatingRef.current) {
      return;
    }
    updatingRef.current = true;
    setUpdating(true);
    try {
      // SKIP_WAITING 送信前に待機中 SW の参照を保持し、未制御タブ時の有効化完了を待てるようにする
      const waiting = registrationRef.current?.waiting;
      await updateServiceWorker(true);
      if (
        typeof navigator !== 'undefined' &&
        navigator.serviceWorker?.controller === null &&
        typeof window !== 'undefined'
      ) {
        await waitForWorkerActivation(waiting);
        window.location.reload();
      }
    } catch {
      updatingRef.current = false;
      setUpdating(false);
    }
  }, [updateServiceWorker]);

  return {
    needRefresh,
    updating,
    applyUpdate
  };
}
