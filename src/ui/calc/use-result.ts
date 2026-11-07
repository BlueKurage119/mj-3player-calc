import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../state';
import {
  type ComputeFn,
  type ResultState,
  evaluateResult
} from './result-state';

export type { ResultState };

export const useResult = (): ResultState => {
  const { table, input, handOptions, rule } = useAppState();
  const [compute, setCompute] = useState<ComputeFn | null>(null);
  const [loadError, setLoadError] = useState<unknown | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('./compute')
      .then(mod => {
        if (!cancelled) {
          setCompute(() => mod.computeResult);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setLoadError(err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () =>
      evaluateResult(compute, loadError, { table, input, handOptions, rule }),
    [compute, loadError, table, input, handOptions, rule]
  );
};
