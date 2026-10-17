// Real-site patterns found on production sites: inner scroll containers (Lenis
// wrapper), CSS-module class names, mask reveals, repeated hover transitions,
// fluid type and scroll locked by an overlay.
// Usage: npm run build && node test/patterns.mjs
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';

const root = path.resolve(import.meta.dirname, '..');
const extPath = path.join(root, '.output/chrome-mv3');
const exe = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const server = createServer(async (req, res) => {
  try {
    const body = await readFile(path.join(root, 'test/fixture', new URL(req.url, 'http://x').pathname));
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(4792, r));
const ctx = await chromium.launchPersistentContext(await mkdtemp(path.join(tmpdir(), 'ms-pat-')), {
  executablePath: exe, headless: true, viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
});
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };

try {
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  const extId = new URL(sw.url()).host;
  const page = await ctx.newPage();
  await page.goto('http://localhost:4792/inner-scroll.html');
  await page.waitForTimeout(1600);
  const panel = await ctx.newPage();
  await panel.goto(`chrome-extension://${extId}/sidepanel.html`);
  const tabOf = (u) => panel.evaluate(async (u) => (await chrome.tabs.query({ url: u }))[0].id, u);
  const send = (id, msg) => panel.evaluate(([id, msg]) => chrome.tabs.sendMessage(id, msg), [id, msg]);
  const tabId = await tabOf('http://localhost:4792/inner-scroll.html');

  const scan = (await send(tabId, { type: 'scan' })).data;
  const title = scan.motions.find((m) => m.target.includes('__title'));
  check(!!title, `CSS-module classes give readable selectors (${title?.target})`);
  check(title?.name === 'hero__reset-translate', `CSS-module keyframe names are prettified (${title?.name})`);
  check(title?.masked === true, 'mask reveal detected (parent clips overflow)');
  const kf = scan.stylesheetKeyframes.filter((k) => /reset-translate/.test(k.name));
  check(kf.length === 1 && kf[0].aliases?.length === 2, `identical @keyframes collapsed (${scan.stylesheetKeyframes.length} kept, aliases: ${kf[0]?.aliases?.join(', ')})`);
  const hit = await page.evaluate((sel) => document.querySelectorAll(sel).length, title.target);
  check(hit === 1, 'readable selector still finds exactly the element');

  await page.bringToFront();
  const rec = (await send(tabId, { type: 'record-scroll' })).data.recording;
  console.log('      scroller:', rec.scroller, '| tracks:', rec.tracks.map((t) => `${t.mode} ${t.target}`).join(' | '));
  check(rec.scroller === '#wrapper', 'recorder finds the inner scroll container');
  check(rec.tracks.some((t) => t.target === '#parallax' && t.mode === 'scrubbed'), 'recorder captures parallax inside the inner scroller');
  check(rec.tracks.some((t) => t.target === 'footer'), 'recorder captures view() reveal inside the inner scroller');

  // Brief from the extension's own Export all.
  await panel.goto(`chrome-extension://${extId}/sidepanel.html?tabId=${tabId}`);
  await panel.getByRole('button', { name: 'Scan page' }).first().click();
  await panel.getByText('Detected libraries').waitFor();
  await panel.getByRole('button', { name: 'Record scroll' }).click();
  await panel.getByRole('button', { name: 'Record scroll' }).waitFor({ timeout: 120000 });
  const [dl] = await Promise.all([panel.waitForEvent('download'), panel.getByRole('button', { name: 'Export all' }).first().click()]);
  const files = unzipSync(new Uint8Array(await readFile(await dl.path())));
  const readme = strFromU8(files[Object.keys(files).find((n) => n.endsWith('README.md'))]);
  const fs = await import('node:fs/promises');
  await fs.writeFile(path.join(root, 'test/screenshots/README-inner-scroll.md'), readme);
  check(/slides up by 100% of its own height over 500ms.*revealed through a mask/.test(readme), 'brief: % translate + mask reveal in plain words');
  check(/\(6 elements\)/.test(readme) && (readme.match(/card-module/g) ?? []).length === 1, 'brief: identical hover on 6 cards is one row');
  check(/This page scrolls inside `#wrapper`/.test(readme), 'brief: explains the inner scroller');
  check(/Type sizes are \*\*fluid\*\*/.test(readme), 'brief: notes fluid type');
  const keyframesCss = strFromU8(files[Object.keys(files).find((n) => n.endsWith('site-keyframes.css'))]);
  check(/Same as: header__reset-translate, footer__reset-translate/.test(keyframesCss), 'site-keyframes.css lists aliases instead of repeating');

  // Locked page: clear explanation instead of an empty result.
  const locked = await ctx.newPage();
  await locked.goto('http://localhost:4792/locked.html');
  await locked.waitForTimeout(500);
  const lockedRec = (await send(await tabOf('http://localhost:4792/locked.html'), { type: 'record-scroll' })).data.recording;
  check(lockedRec.scroller === 'window' && /Scrolling was locked/.test(lockedRec.note ?? ''), `locked page recorded with a warning: "${lockedRec.note?.slice(0, 60)}…"`);
  check(rec.tracks.find((t) => t.target === 'footer')?.mode === 'scrubbed', 'short view() reveal still labelled scrubbed');
} finally {
  await ctx.close();
  server.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll pattern checks passed');
process.exit(failures ? 1 : 0);
