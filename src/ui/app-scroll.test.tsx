// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { type Dispatch, useEffect } from 'react';
import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppContent } from './App';
import { type AppAction, AppStateProvider, useAppDispatch } from './state';

// happy-dom 21.x は HTMLElement.prototype.attachInternals 未実装のため、
// Material Web (@material/web) の form-associated 要素がマウント時に呼ぶ最小シムを定義する
if (
  typeof HTMLElement !== 'undefined' &&
  typeof HTMLElement.prototype.attachInternals !== 'function'
) {
  HTMLElement.prototype.attachInternals = function (): ElementInternals {
    return {
      form: null,
      labels: [] as unknown as NodeList,
      shadowRoot: this.shadowRoot,
      states: new Set() as unknown as CustomStateSet,
      validationMessage: '',
      validity: {} as ValidityState,
      willValidate: true,
      checkValidity: () => true,
      reportValidity: () => true,
      setFormValue: () => {},
      setValidity: () => {}
    } as unknown as ElementInternals;
  };
}

function DispatchProbe({
  onDispatch
}: {
  onDispatch: (d: Dispatch<AppAction>) => void;
}): React.JSX.Element | null {
  const dispatch = useAppDispatch();
  useEffect(() => {
    onDispatch(dispatch);
  }, [dispatch, onDispatch]);
  return null;
}

describe('AppContent 画面遷移時のスクロール', () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  afterEach(() => {
    cleanup();
    Element.prototype.scrollIntoView = originalScrollIntoView;
    vi.restoreAllMocks();
  });

  it('172-T5: 初回描画では scrollTo せず、画面遷移時に先頭へ戻し、Help の scrollIntoView は遅延読込の初回・2回目とも打ち消さない', async () => {
    const events: string[] = [];
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      events.push('scrollTo');
    });
    Element.prototype.scrollIntoView = () => {
      events.push('scrollIntoView');
    };

    let dispatch: Dispatch<AppAction> | null = null;
    const view = render(
      <AppStateProvider>
        <AppContent />
        <DispatchProbe
          onDispatch={d => {
            dispatch = d;
          }}
        />
      </AppStateProvider>
    );

    const getDispatch = (): Dispatch<AppAction> => {
      if (!dispatch) throw new Error('dispatch 未初期化');
      return dispatch;
    };

    // 1. 初回の描画だけでは scrollTo が呼ばれない
    expect(events).toEqual([]);

    // 2. engine へ遷移 → scrollTo が記録される
    act(() => {
      getDispatch()({ type: 'navigate', screen: 'engine' });
    });
    await waitFor(() => {
      expect(events).toEqual(['scrollTo']);
    });

    // 3. open-help(focus engine・returnTo engine)→ 初回遅延読込後に scrollTo → scrollIntoView の順
    act(() => {
      getDispatch()({
        type: 'open-help',
        focus: 'engine',
        returnTo: 'engine'
      });
    });
    await waitFor(() => {
      expect(view.container.querySelector('#help-engine')).not.toBeNull();
      expect(events.slice(-2)).toEqual(['scrollTo', 'scrollIntoView']);
    });

    // 4. engine へ戻る → scrollTo が記録される
    const afterFirstHelp = events.length;
    act(() => {
      getDispatch()({ type: 'navigate', screen: 'engine' });
    });
    await waitFor(() => {
      expect(events.slice(afterFirstHelp)).toEqual(['scrollTo']);
    });

    // 5. 再び open-help → 読込済みの2回目でも scrollTo → scrollIntoView の順で後に scrollTo がない
    const beforeSecondHelp = events.length;
    act(() => {
      getDispatch()({
        type: 'open-help',
        focus: 'engine',
        returnTo: 'engine'
      });
    });
    await waitFor(() => {
      expect(view.container.querySelector('#help-engine')).not.toBeNull();
      expect(events.slice(beforeSecondHelp)).toEqual([
        'scrollTo',
        'scrollIntoView'
      ]);
    });
  });
});
