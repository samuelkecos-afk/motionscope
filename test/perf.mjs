// Measures how much main-thread work MotionScope adds to a busy page while the
// user is NOT using it (no scan). Compares the same page with and without the
// extension. Usage: npm run build && node test/perf.mjs
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const fixture = path.join(root, 'test/fixture');
const extPath = path.join(root, '.output/chrome-mv3');
const exe = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const TABS = 4;
const SECONDS = 6;

const server = createServer(async (req, res) => {
  try {
    const body = await readFile(path.join(fixture, new URL(req.url, 'http://x').pathname));
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(4790, r));

async function measure(withExtension) {
  const args = withExtension ? [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`] : [];
  const ctx = await chromium.launchPersistentContext(await mkdtemp(path.join(tmpdir(), 'ms-perf-')), { executablePath: exe, headless: true, args });
  const pages = [];
  for (let i = 0; i < TABS; i++) {
    const p = await ctx.newPage();
    await p.goto('http://localhost:4790/stress.html');
    pages.push(p);
  }
  await pages[0].waitForTimeout(1000);
  const sessions = await Promise.all(pages.map(async (p) => {
    const s = await ctx.newCDPSession(p);
    await s.send('Performance.enable');
    return s;
  }));
  const read = async () => Promise.all(sessions.map(async (s) => {
    const m = Object.fromEntries((await s.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    return m.ScriptDuration + m.TaskDuration * 0; // script time only
  }));
  const before = await read();
  await pages[0].waitForTimeout(SECONDS * 1000);
  const after = await read();
  const heap = await pages[0].evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
  await ctx.close();
  const scriptMs = after.map((v, i) => (v - before[i]) * 1000);
  return { perTabScriptMs: scriptMs.reduce((a, b) => a + b, 0) / TABS, heapMB: heap / 1e6 };
}

const base = await measure(false);
const ext = await measure(true);
server.close();
const overhead = ext.perTabScriptMs - base.perTabScriptMs;
const pct = (overhead / (SECONDS * 1000)) * 100;
console.log(`Page alone:      ${base.perTabScriptMs.toFixed(0)} ms script per tab over ${SECONDS}s, heap ${base.heapMB.toFixed(1)} MB`);
console.log(`With MotionScope: ${ext.perTabScriptMs.toFixed(0)} ms script per tab over ${SECONDS}s, heap ${ext.heapMB.toFixed(1)} MB`);
console.log(`Idle overhead:   ${overhead.toFixed(0)} ms per tab (${pct.toFixed(1)}% of one CPU core per tab, ${TABS} tabs open)`);
const LIMIT_PCT = 2;
console.log(pct <= LIMIT_PCT ? `PASS  idle overhead under ${LIMIT_PCT}%` : `FAIL  idle overhead above ${LIMIT_PCT}%`);
process.exit(pct <= LIMIT_PCT ? 0 : 1);
