export const PRELOAD_RELOAD_STORAGE_KEY = 'mj3calc:preload-reload-at';
export const PRELOAD_RELOAD_COOLDOWN_MS = 10_000;

export interface PreloadRecoveryDeps {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  now?: () => number;
  reload?: () => void;
  cooldownMs?: number;
}

function resolveStorage(
  deps?: PreloadRecoveryDeps
): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (deps?.storage !== undefined) {
    return deps.storage;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * ガード状態を確認し、自動リロードを許可すべきなら true を返す（副作用なし）。
 * storage 不在・例外時は安全側として false を返す。
 */
export function shouldReloadOnPreloadError(
  deps?: PreloadRecoveryDeps
): boolean {
  const storage = resolveStorage(deps);
  if (!storage) {
    return false;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(PRELOAD_RELOAD_STORAGE_KEY);
  } catch {
    return false;
  }

  if (raw === null || raw === '') {
    return true;
  }

  const lastAt = Number(raw);
  if (!Number.isFinite(lastAt)) {
    return true;
  }

  const currentNow = (deps?.now ?? Date.now)();
  const cooldownMs = deps?.cooldownMs ?? PRELOAD_RELOAD_COOLDOWN_MS;
  return currentNow - lastAt >= cooldownMs;
}

/**
 * vite:preloadError イベントを処理する。
 * 許可された場合はタイムスタンプ記録・event.preventDefault()・reload() を行い true を返す。
 * 抑止または storage 書き込み失敗時はリロードせず false を返す。
 */
export function handlePreloadError(
  event: Event,
  deps?: PreloadRecoveryDeps
): boolean {
  const currentNow = (deps?.now ?? Date.now)();
  const allowed = shouldReloadOnPreloadError({
    ...deps,
    now: () => currentNow
  });
  if (!allowed) {
    return false;
  }

  const storage = resolveStorage(deps);
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(PRELOAD_RELOAD_STORAGE_KEY, String(currentNow));
  } catch {
    return false;
  }

  event.preventDefault();
  if (deps?.reload) {
    deps.reload();
  } else if (typeof window !== 'undefined') {
    window.location.reload();
  }
  return true;
}

/**
 * window に 'vite:preloadError' リスナーを登録し、解除関数を返す。
 */
export function installPreloadErrorRecovery(
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  deps?: PreloadRecoveryDeps
): () => void {
  const win = target ?? (typeof window !== 'undefined' ? window : undefined);
  if (!win) {
    return () => {};
  }

  const listener = (event: Event) => {
    handlePreloadError(event, deps);
  };
  win.addEventListener('vite:preloadError', listener);
  return () => {
    win.removeEventListener('vite:preloadError', listener);
  };
}
