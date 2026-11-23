import { describe, expect, it } from 'vitest';
import { resolveBuildConfig } from './build-config.ts';

describe('ビルド設定解決 (CR-T1〜CR-T3)', () => {
  it('CR-T1: 未指定および VITE_APP_ENV=production のとき本番設定を返す', () => {
    expect(resolveBuildConfig({})).toEqual({
      appEnv: 'production',
      isPreview: false,
      base: '/mj-3player-calc/',
      shareUrl: 'https://bluekurage119.github.io/mj-3player-calc/',
      statusBarColorRole: 'surface-container'
    });

    expect(
      resolveBuildConfig({
        VITE_APP_ENV: 'production'
      })
    ).toEqual({
      appEnv: 'production',
      isPreview: false,
      base: '/mj-3player-calc/',
      shareUrl: 'https://bluekurage119.github.io/mj-3player-calc/',
      statusBarColorRole: 'surface-container'
    });
  });

  it('CR-T2: VITE_APP_ENV=preview のときプレビュー設定とステータスバー色ロール quaternary を返す', () => {
    expect(
      resolveBuildConfig({
        VITE_APP_ENV: 'preview',
        VITE_SHARE_URL:
          'https://mj-3player-calc-106538176815.asia-northeast1.run.app/'
      })
    ).toEqual({
      appEnv: 'preview',
      isPreview: true,
      base: '/',
      shareUrl: 'https://mj-3player-calc-106538176815.asia-northeast1.run.app/',
      statusBarColorRole: 'quaternary'
    });
  });

  it('CR-T3: 未知の VITE_APP_ENV・https:// で始まらない VITE_SHARE_URL で例外を投げる', () => {
    expect(() => resolveBuildConfig({ VITE_APP_ENV: 'staging' })).toThrow(
      /VITE_APP_ENV/
    );
    expect(() =>
      resolveBuildConfig({
        VITE_APP_ENV: 'preview',
        VITE_SHARE_URL: 'http://example.com/'
      })
    ).toThrow(/VITE_SHARE_URL/);
  });
});
