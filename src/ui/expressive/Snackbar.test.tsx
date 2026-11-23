// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Snackbar } from './index';

const css = readFileSync(path.resolve(__dirname, 'snackbar.css'), 'utf8');

describe('自作 Snackbar (Issue #166)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('166-T8: open={false} ではホストのみ描画され、open={true} でメッセージとアクションボタンのみが描画され操作できる', () => {
    const onAction = vi.fn();

    const closed = render(
      <Snackbar
        open={false}
        message="新しいバージョンがあります"
        actionLabel="更新"
        onAction={onAction}
      />
    );
    const closedHost = closed.container.firstElementChild;
    expect(closedHost).not.toBeNull();
    expect(closedHost?.getAttribute('class')).toBe('snackbar-host');
    expect(closedHost?.getAttribute('role')).toBe('status');
    expect(closedHost?.getAttribute('aria-live')).toBe('polite');
    expect(closedHost?.getAttribute('aria-atomic')).toBe('true');
    expect(closedHost?.children.length).toBe(0);
    closed.unmount();

    const opened = render(
      <Snackbar
        open={true}
        message="新しいバージョンがあります"
        actionLabel="更新"
        onAction={onAction}
        className="extra-class"
      />
    );
    const openHost = opened.container.firstElementChild;
    expect(openHost?.getAttribute('class')).toBe('snackbar-host extra-class');

    const snackbar = openHost?.querySelector('.snackbar');
    expect(snackbar).not.toBeNull();

    const messageEl = snackbar?.querySelector('.snackbar__message');
    expect(messageEl?.textContent).toBe('新しいバージョンがあります');

    const buttons = snackbar?.querySelectorAll('button') ?? [];
    expect(buttons.length).toBe(1);
    const actionButton = buttons[0];
    expect(actionButton?.textContent).toBe('更新');
    expect(actionButton?.disabled).toBe(false);

    if (actionButton) {
      fireEvent.click(actionButton);
    }
    expect(onAction).toHaveBeenCalledTimes(1);

    opened.rerender(
      <Snackbar
        open={true}
        message="新しいバージョンがあります"
        actionLabel="更新"
        actionDisabled={true}
        onAction={onAction}
      />
    );
    const disabledButton = opened.container.querySelector('button');
    expect(disabledButton?.disabled).toBe(true);
    if (disabledButton) {
      fireEvent.click(disabledButton);
    }
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('166-T9: snackbar.css は MD3 トークンのみを使用し、HEX・rgb(・px・ms・cubic-bezier 直書きがなく、z-index: 25 と reduced-motion に対応する', () => {
    // 意図的アサーション: CSS ソース内の MD3 トークン参照・z-index・reduced-motion 規則を個別に検証するため部分一致を使う
    expect(css).toContain('--md-sys-color-inverse-surface');
    expect(css).toContain('--md-sys-color-inverse-on-surface');
    expect(css).toContain('--md-sys-color-inverse-primary');
    expect(css).toContain('--md-sys-motion-spring-');
    expect(css).toContain('--md-sys-shape-corner-');
    expect(css).toMatch(/z-index:\s*25;/);
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*transition:\s*none;/
    );
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgb\(/);
    expect(css).not.toMatch(/[0-9]px/);
    expect(css).not.toMatch(/[0-9]ms/);
    expect(css).not.toContain('cubic-bezier');
  });
});
