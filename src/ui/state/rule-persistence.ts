import type { LoadedRule, RuleStorage } from '../../core/rule-storage';
import { loadRule } from '../../core/rule-storage';
import { type AppState, createInitialState } from './app-state';

export const safeLocalStorage = (): RuleStorage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const needsLoadNotice = (loaded: LoadedRule): boolean =>
  loaded.found && (loaded.reset || loaded.issues.length > 0);

export interface InitialAppData {
  state: AppState;
  loadNotice: boolean;
}

export const createInitialStateFromStorage = (
  storage: RuleStorage | null
): InitialAppData => {
  const loaded = loadRule(storage);
  return {
    state: createInitialState(loaded.rule),
    loadNotice: needsLoadNotice(loaded)
  };
};
