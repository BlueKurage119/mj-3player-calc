// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PwaUpdateState } from '../../pwa/use-pwa-update';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';

const { mockUsePwaUpdate } = vi.hoisted(() => ({
  mockUsePwaUpdate: vi.fn<() => PwaUpdateState>()
}));

vi.mock('../../pwa/use-pwa-update', () => ({
  usePwaUpdate: mockUsePwaUpdate
}));

describe('PwaUpdatePrompt (Issue #166)', () => {
  beforeEach(() => {
    mockUsePwaUpdate.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('166-T10: needRefresh: true で「新しいバージョンがあります」「更新」のみが表示され、更新押下で applyUpdate が呼ばれ、updating: true で無効化される', () => {
    const applyUpdate = vi.fn(() => Promise.resolve());

    mockUsePwaUpdate.mockReturnValue({
      needRefresh: false,
      updating: false,
      applyUpdate
    });
    const view = render(<PwaUpdatePrompt />);
    expect(view.container.querySelector('.snackbar')).toBeNull();

    mockUsePwaUpdate.mockReturnValue({
      needRefresh: true,
      updating: false,
      applyUpdate
    });
    view.rerender(<PwaUpdatePrompt />);

    const snackbar = view.container.querySelector('.snackbar');
    expect(snackbar).not.toBeNull();
    expect(snackbar?.querySelector('.snackbar__message')?.textContent).toBe(
      '新しいバージョンがあります'
    );

    const buttons = snackbar?.querySelectorAll('button') ?? [];
    expect(buttons.length).toBe(1);
    const updateButton = buttons[0];
    expect(updateButton?.textContent).toBe('更新');
    expect(updateButton?.disabled).toBe(false);

    if (updateButton) {
      fireEvent.click(updateButton);
    }
    expect(applyUpdate).toHaveBeenCalledTimes(1);

    mockUsePwaUpdate.mockReturnValue({
      needRefresh: true,
      updating: true,
      applyUpdate
    });
    view.rerender(<PwaUpdatePrompt />);

    const disabledButton = view.container.querySelector('button');
    expect(disabledButton?.disabled).toBe(true);
    if (disabledButton) {
      fireEvent.click(disabledButton);
    }
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});
