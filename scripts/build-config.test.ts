import { describe, expect, it } from 'vitest';
import { resolveBuildConfig } from './build-config.ts';

describe('ビルド設定解決 (CR-T1〜CR-T3)', () => {
  it('CR-T1: 未指定および VITE_APP_ENV=production のとき本番設定を返す', () => {
    expect(resolveBuildConfig({})).toEqual({
      appEnv: 'production',
      isPreview: false,
      base: '/mj-3player-calc/',
      shareUrl: 'https://bluekurage119.github.io/mj-3player-calc/',
      previewColor: 'quaternary',
      statusBarColorRole: 'surface'
    });

    expect(
      resolveBuildConfig({
        VITE_APP_ENV: 'production',
        VITE_PREVIEW_COLOR: 'tertiary'
      })
    ).toEqual({
      appEnv: 'production',
      isPreview: false,
      base: '/mj-3player-calc/',
      shareUrl: 'https://bluekurage119.github.io/mj-3player-calc/',
      previewColor: 'tertiary',
      statusBarColorRole: 'surface'
    });
  });

  it('CR-T2: VITE_APP_ENV=preview のときプレビュー設定とステータスバー色ロールを返す', () => {
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
      previewColor: 'quaternary',
      statusBarColorRole: 'quaternary-container'
    });

    expect(
      resolveBuildConfig({
        VITE_APP_ENV: 'preview',
        VITE_PREVIEW_COLOR: 'tertiary',
        VITE_SHARE_URL:
          'https://mj-3player-calc-106538176815.asia-northeast1.run.app/'
      })
    ).toEqual({
      appEnv: 'preview',
      isPreview: true,
      base: '/',
      shareUrl: 'https://mj-3player-calc-106538176815.asia-northeast1.run.app/',
      previewColor: 'tertiary',
      statusBarColorRole: 'tertiary-container'
    });
  });

  it('CR-T3: 未知の VITE_APP_ENV・未知の VITE_PREVIEW_COLOR・https:// で始まらない VITE_SHARE_URL で例外を投げる', () => {
    expect(() => resolveBuildConfig({ VITE_APP_ENV: 'staging' })).toThrow(
      /VITE_APP_ENV/
    );
    expect(() =>
      resolveBuildConfig({
        VITE_APP_ENV: 'preview',
        VITE_PREVIEW_COLOR: 'primary'
      })
    ).toThrow(/VITE_PREVIEW_COLOR/);
    expect(() =>
      resolveBuildConfig({
        VITE_APP_ENV: 'preview',
        VITE_SHARE_URL: 'http://example.com/'
      })
    ).toThrow(/VITE_SHARE_URL/);
  });
});
