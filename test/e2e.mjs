// End-to-end check: loads the built extension into Chromium, opens the fixture
// page, runs a scan and a scroll recording, and asserts on the results.
// Usage: npm run build && node test/e2e.mjs
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const fixture = path.join(root, 'test/fixture');
const extPath = path.join(root, '.output/chrome-mv3');
const shots = path.join(root, 'test/screenshots');
const exe = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  try {
    const file = path.join(fixture, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(4789, r));
await mkdir(shots, { recursive: true });

const ctx = await chromium.launchPersistentContext(await mkdtemp(path.join(tmpdir(), 'motionscope-')), {
  executablePath: exe,
  headless: true,
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
});

let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

try {
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  const extId = new URL(sw.url()).host;

  const page = await ctx.newPage();
  await page.goto('http://localhost:4789/');
  await page.waitForTimeout(1500);

  const panel = await ctx.newPage();
  await panel.setViewportSize({ width: 400, height: 900 });
  await panel.goto(`chrome-extension://${extId}/sidepanel.html`);
  const tabId = await panel.evaluate(async () => (await chrome.tabs.query({ url: 'http://localhost:4789/*' }))[0].id);
  await panel.goto(`chrome-extension://${extId}/sidepanel.html?tabId=${tabId}`);

  // --- Raw scan through the same message channel the UI uses ---
  const res = await panel.evaluate((id) => chrome.tabs.sendMessage(id, { type: 'scan' }), tabId);
  check(res?.ok, `scan answered${res?.ok ? '' : `: ${res?.error}`}`);
  const scan = res.data;
  const libs = scan.libraries.map((l) => l.name);
  console.log('      libraries:', libs.join(', '));
  check(libs.includes('GSAP') && libs.includes('ScrollTrigger'), 'detects GSAP + ScrollTrigger');
  check(libs.includes('CSS scroll-driven animations'), 'detects native CSS scroll-driven animations');
  const by = (e) => scan.motions.filter((m) => m.engine === e);
  console.log('      motions by engine:', ['css-animation', 'css-transition', 'waapi', 'gsap'].map((e) => `${e}=${by(e).length}`).join(' '));
  check(by('css-animation').some((m) => m.name === 'float' && m.iterations === 'infinite'), 'CSS @keyframes float (infinite)');
  check(by('css-animation').some((m) => m.name === 'fade-up' && m.delay === 200), 'CSS fade-up captured even after it finished');
  check(by('css-animation').some((m) => m.name === 'reveal' && m.timeline === 'view'), 'CSS view() timeline with range');
  check(by('css-transition').some((m) => /transform|background-color/.test(m.name)), 'CSS transition on .btn');
  check(by('waapi').some((m) => m.name === 'waapi-slide' && m.iterations === 3), 'element.animate() with id + iterations');
  const stCards = by('gsap').find((m) => m.target.includes('gsap-card'));
  check(stCards && stCards.scroll?.start === 'top 80%' && stCards.stagger === 120 && stCards.targetCount === 3, 'GSAP stagger tween with ScrollTrigger start + stagger');
  check(by('gsap').some((m) => m.scroll?.scrub === true && m.target === '#scrub-box'), 'GSAP scrubbed ScrollTrigger');
  check(scan.splitText.some((s) => s.unit === 'char' && s.target === '#headline'), 'split text by characters on #headline');
  const t = scan.tokens;
  console.log('      colors:', t.colors.map((c) => c.value).join(' '));
  check(t.colors.some((c) => c.value === '#b0174a') && t.colors.some((c) => c.value === '#15151a'), 'button + text colors extracted');
  check(t.fonts.some((f) => f.value === 'Arial') && t.fonts.some((f) => f.value === 'Georgia'), 'font families');
  check(t.cssVariables.some((v) => v.name === '--brand'), 'CSS variables from :root');
  check(t.breakpoints.length === 2, `breakpoints (${t.breakpoints.join(' | ')})`);
  check(scan.stylesheetKeyframes.length >= 3, `@keyframes from stylesheets (${scan.stylesheetKeyframes.map((k) => k.name).join(', ')})`);

  // --- UI: scan, then record scroll ---
  await panel.getByRole('button', { name: 'Scan page' }).first().click();
  await panel.getByText('Detected libraries').waitFor();
  await panel.screenshot({ path: path.join(shots, '1-overview.png'), fullPage: true });
  await panel.getByRole('button', { name: /^Motion/ }).click();
  await panel.locator('.row').first().click();
  await panel.screenshot({ path: path.join(shots, '2-motion.png'), fullPage: true });
  await panel.getByRole('button', { name: /^Tokens/ }).click();
  await panel.screenshot({ path: path.join(shots, '3-tokens.png'), fullPage: true });

  // In real use the inspected tab is visible next to the side panel.
  await page.bringToFront();
  const t0 = Date.now();
  await panel.getByRole('button', { name: 'Record scroll' }).click();
  await panel.getByRole('button', { name: 'Record scroll' }).waitFor({ timeout: 120000 });
  console.log(`      scroll recording took ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await panel.locator('.rows .row').first().waitFor();
  const rec = await panel.evaluate((id) => chrome.tabs.sendMessage(id, { type: 'record-scroll' }), tabId);
  const tracks = rec.data.recording.tracks;
  for (const tr of tracks) console.log(`      track ${tr.mode.padEnd(9)} ${tr.target.padEnd(28)} ${tr.props.join(',').padEnd(18)} ${tr.startLabel} → ${tr.endLabel}  ease=${tr.easing}`);
  check(tracks.some((tr) => tr.target === '#parallax' && tr.mode === 'scrubbed' && tr.props.includes('y') && tr.props.includes('opacity')), 'recorder finds hand-written parallax (y + opacity)');
  check(tracks.some((tr) => tr.target === '#scrub-box' && tr.mode === 'scrubbed' && tr.props.includes('x')), 'recorder finds GSAP scrubbed box');
  check(tracks.some((tr) => tr.target === '#pinned' && tr.mode === 'pinned'), 'recorder finds sticky/pinned element');
  check(tracks.some((tr) => tr.target.includes('view-reveal')), 'recorder finds CSS view() reveal');
  check(!tracks.some((tr) => tr.target.includes('float')), 'recorder ignores infinite (non-scroll) animation');

  const uiTracks = await panel.locator('.rows > li').evaluateAll((lis) => lis.map((li) => li.querySelector('.badge').textContent + ' ' + li.querySelector('.link').textContent));
  console.log('      UI tracks (first recording):', uiTracks.join(' | '));
  check(!uiTracks.some((t) => t.includes('#waapi-box')), 'timed animation running since page load is not reported as scroll motion');
  check(uiTracks.filter((t) => t.includes('gsap-card')).every((t) => t.startsWith('triggered')) && uiTracks.some((t) => t.includes('gsap-card')), 'GSAP play-once cards reported as triggered');
  await panel.locator('.rows .row').first().click();
  await panel.screenshot({ path: path.join(shots, '4-scroll.png'), fullPage: true });
  await panel.locator('nav').getByRole('button', { name: /^Export/ }).click();
  await panel.screenshot({ path: path.join(shots, '5-export.png'), fullPage: true });

  // --- Export all: one ZIP a builder can use ---
  const [dl] = await Promise.all([panel.waitForEvent('download'), panel.getByRole('button', { name: 'Export all (.zip)' }).click()]);
  const zipPath = path.join(shots, dl.suggestedFilename());
  await dl.saveAs(zipPath);
  const { unzipSync, strFromU8 } = await import('fflate');
  const files = unzipSync(new Uint8Array(await readFile(zipPath)));
  const names = Object.keys(files);
  console.log('      zip:', dl.suggestedFilename(), '→', names.map((n) => n.split('/').slice(1).join('/')).join(', '));
  const need = ['README.md', 'tokens/tokens.dtcg.json', 'tokens/tokens.css', 'tokens/tailwind-theme.css', 'motion/motion.json', 'motion/animations.css', 'motion/site-keyframes.css', 'motion/gsap-animations.js', 'raw/scan.json'];
  check(need.every((n) => names.some((x) => x.endsWith('/' + n))), 'Export all ZIP contains brief, tokens, motion code and raw data');
  const readme = strFromU8(files[names.find((n) => n.endsWith('README.md'))]);
  const fs = await import('node:fs/promises');
  await fs.writeFile(path.join(shots, 'README-sample.md'), readme);
  check(/fades in, moves up 40px over 1\.08s, easing power3\.out, staggered 30ms across 17 elements/.test(readme), 'brief describes split-text intro in plain language');
  check(/plays when #gsap-section hits "top 80%"/.test(readme), 'brief explains ScrollTrigger start point');
  check(/`#parallax`.*tied to scroll position/.test(readme), 'brief includes motion found by the scroll recorder');
  check(/\| `#15151a` \| Text \|/.test(readme) && /\| `#b0174a` \| Accent \/ brand \|/.test(readme), 'brief assigns color roles (text, accent)');
  check(/`p\.hero-sub` \| fades in, moves up 24px over 800ms/.test(readme), 'brief turns CSS transforms into plain words');
  check(/`div\.card\.float` \| moves up 12px and back over 3s/.test(readme), 'brief describes looping float as "and back"');
  check(!/gsap-card:nth-of-type\(2\)/.test(readme), 'brief does not repeat staggered GSAP cards from the recording');
  check(!/scrub-box` \|[^|]*over 500ms/.test(readme), 'brief omits timer duration for scrubbed animations');
  const gsapJs = strFromU8(files[names.find((n) => n.endsWith('gsap-animations.js'))]);
  check(gsapJs.includes('prefers-reduced-motion') && gsapJs.includes('scrollTrigger'), 'GSAP export respects reduced motion and includes ScrollTriggers');
  const motionJson = JSON.parse(strFromU8(files[names.find((n) => n.endsWith('motion/motion.json'))]));
  check(motionJson.scrollRecording?.tracks?.length >= 4, 'motion.json includes the scroll recording');

  // Copy brief button puts the brief on the clipboard.
  // Headless Chrome can't grant clipboard access to extension pages, so capture the write.
  await panel.evaluate(() => { navigator.clipboard.writeText = async (t) => { window.__copied = t; }; });
  await panel.getByRole('button', { name: 'Copy brief for AI builder' }).click();
  const clip = await panel.evaluate(() => window.__copied ?? '');
  check(clip.startsWith('# Design & motion spec'), 'Copy brief puts the Markdown brief on the clipboard');
} finally {
  await ctx.close();
  server.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
