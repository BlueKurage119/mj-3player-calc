import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AppBuildEnv } from './build-config.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENV_BUILD_ARTIFACTS_LOG = 'BUILD_ARTIFACTS_LOG';

export type BuildRunner = (outDir: string, env: AppBuildEnv) => void;

export interface BuildToOptions {
  /** 一時ディレクトリの親。既定 os.tmpdir() */
  tmpRoot?: string;
  /** ビルド実行関数。既定 runViteBuild */
  run?: BuildRunner;
}

/** 子プロセスで vite build を実行する(既定の BuildRunner) */
export function runViteBuild(outDir: string, env: AppBuildEnv): void {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/vite'),
    ['build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        VITE_APP_ENV: env
      },
      stdio: 'pipe'
    }
  );
  const log = process.env[ENV_BUILD_ARTIFACTS_LOG];
  if (log) {
    fs.appendFileSync(log, `${env}\n`);
  }
}

/** 一時ディレクトリを作ってビルドし、そのパスを返す。失敗時は一時ディレクトリを削除して例外を再送出する */
export function buildTo(env: AppBuildEnv, options?: BuildToOptions): string {
  const tmpRoot = options?.tmpRoot ?? os.tmpdir();
  const run = options?.run ?? runViteBuild;
  const outDir = fs.mkdtempSync(path.join(tmpRoot, `mj3-build-${env}-`));
  try {
    run(outDir, env);
  } catch (e) {
    fs.rmSync(outDir, { recursive: true, force: true });
    throw e;
  }
  return outDir;
}

/** buildTo の戻り値を削除する。undefined は何もしない */
export function removeBuild(outDir: string | undefined): void {
  if (outDir === undefined) {
    return;
  }
  fs.rmSync(outDir, { recursive: true, force: true });
}
