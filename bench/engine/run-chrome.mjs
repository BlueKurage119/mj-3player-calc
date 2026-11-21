import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
let targetUrl = 'http://localhost:4317/';
let outFile = '';
let filterConfigs = null;
let filterHands = null;
let remainingDraws = 18;
let runs = 10;
let handBudgetMs = 1e12;
let runTimeoutMs = 1e12;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--configs' && args[i + 1]) {
    filterConfigs = new Set(args[++i].split(','));
  } else if (a === '--hands' && args[i + 1]) {
    filterHands = new Set(args[++i].split(','));
  } else if (a === '--draws' && args[i + 1]) {
    remainingDraws = Number(args[++i]);
  } else if (a === '--runs' && args[i + 1]) {
    runs = Number(args[++i]);
  } else if (a === '--run-timeout' && args[i + 1]) {
    runTimeoutMs = Number(args[++i]);
  } else if (a === '--hand-budget' && args[i + 1]) {
    handBudgetMs = Number(args[++i]);
  } else if (a === '--out' && args[i + 1]) {
    outFile = args[++i];
  } else if (!a.startsWith('--')) {
    if (targetUrl === 'http://localhost:4317/' && a.startsWith('http')) {
      targetUrl = a;
    } else if (!outFile) {
      outFile = a;
    }
  }
}

const chromePath =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const cdpPort = 9337;

// 構成の名前: A=手替わりなし、Bp_Mx=B′(M=x)、Bt_Mx=B′+戻し(M=x)。
// 接尾辞 _S は対案S(候補ごとの s_c を基準にする測定用の内部フラグ。14枚入力の比較用)
const mk = (tegawari, backtrack, diffSlack, oneShantenSlack = false) => ({
  tegawari,
  backtrack,
  diffSlack,
  oneShantenSlack
});
const CONFIGS = [
  { name: 'A', options: mk(false, false, 0) },
  ...[0, 1, 2].map(m => ({ name: `Bp_M${m}`, options: mk(true, false, m) })),
  ...[0, 1, 2].map(m => ({ name: `Bt_M${m}`, options: mk(true, true, m) })),
  ...[0, 1, 2].map(m => ({
    name: `Bt_M${m}_S`,
    options: mk(true, true, m),
    perCandidateRef: true
  })),
  { name: 'Bt_M0_O', options: mk(true, true, 0, true) },
  {
    name: 'Bt_M0_O_S',
    options: mk(true, true, 0, true),
    perCandidateRef: true
  },
  ...[0, 1, 2].map(m => ({
    name: `Bp_M${m}_S`,
    options: mk(true, false, m),
    perCandidateRef: true
  }))
];

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  const m = Math.floor(n / 2);
  return n % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function waitForCdp(port, retries = 40) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find(t => t.type === 'page');
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('CDP connection timeout');
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', ev => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(
        `Evaluate error: ${JSON.stringify(res.exceptionDetails)}`
      );
    }
    return res.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-bench-'));
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      targetUrl
    ],
    { stdio: 'ignore' }
  );

  try {
    const wsUrl = await waitForCdp(cdpPort);
    const cdp = new CdpClient(wsUrl);
    await cdp.send('Runtime.enable');

    // __bench が準備できるまで待つ
    for (let i = 0; i < 50; i++) {
      const ok = await cdp.evaluate('Boolean(window.__bench)');
      if (ok) break;
      await new Promise(r => setTimeout(r, 100));
    }

    const handsAll = await cdp.evaluate('window.__bench.listHands()');
    // --hands は id そのもの、または接頭辞(例: S3 は S3-01〜S3-10、C は C-01〜)で指定する
    const hands = filterHands
      ? handsAll.filter(h =>
          [...filterHands].some(f => h.id === f || h.id.startsWith(`${f}-`))
        )
      : handsAll;
    const activeConfigs = filterConfigs
      ? CONFIGS.filter(c => filterConfigs.has(c.name))
      : CONFIGS;
    const results = [];

    for (const cfg of activeConfigs) {
      const cfgResults = [];
      for (const h of hands) {
        const res = await cdp.evaluate(
          `window.__bench.runOneHand(${JSON.stringify(h.id)}, ${JSON.stringify(cfg.name)}, ${JSON.stringify(cfg.options)}, ${runs}, ${remainingDraws}, ${cfg.perCandidateRef ? 'true' : 'false'}, ${handBudgetMs}, ${runTimeoutMs})`
        );
        cfgResults.push(res);
        process.stderr.write(
          `[${cfg.name}] ${h.id} (s=${h.shanten}, T=${remainingDraws}): states=${res.stateCount}, tempai=${res.tempaiCount}, searches=${res.searchCount}, runs=${res.runsMs.length}, med=${res.medianMs.toFixed(2)}ms, min=${res.minMs.toFixed(2)}ms, max=${res.maxMs.toFixed(2)}ms${res.error ? ` ERR=${res.error}` : ''}\n`
        );
      }

      // 向聴別集計
      const summary = {};
      for (const sh of [1, 2, 3]) {
        const sub = cfgResults.filter(
          r => r.shanten === sh && r.runsMs.length > 0
        );
        if (sub.length === 0) continue;
        const meds = sub.map(r => r.medianMs);
        const worstSingle = Math.max(...sub.flatMap(r => r.runsMs));
        summary[sh] = {
          medianOfMedians: median(meds),
          minMedian: Math.min(...meds),
          maxMedian: Math.max(...meds),
          worstSingle,
          minStates: Math.min(...sub.map(r => r.stateCount)),
          maxStates: Math.max(...sub.map(r => r.stateCount)),
          minTempai: Math.min(...sub.map(r => r.tempaiCount)),
          maxTempai: Math.max(...sub.map(r => r.tempaiCount))
        };
      }
      results.push({
        config: cfg.name,
        remainingDraws,
        summary,
        hands: cfgResults
      });
      // 構成ごとに途中経過を保存する(長時間の測定が途中で止まっても残る)
      if (outFile) {
        fs.writeFileSync(
          outFile,
          JSON.stringify({ targetUrl, results }, null, 2),
          'utf8'
        );
      }
    }

    const json = JSON.stringify({ targetUrl, results }, null, 2);
    if (outFile) {
      fs.writeFileSync(outFile, json, 'utf8');
    }
    console.log(json);
    cdp.close();
  } finally {
    await new Promise(resolve => {
      if (chrome.exitCode !== null) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, 1500);
      chrome.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      chrome.kill('SIGTERM');
    });
    fs.rmSync(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100
    });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
