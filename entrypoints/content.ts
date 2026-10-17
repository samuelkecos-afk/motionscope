// Isolated-world content script: the bridge between the side panel and the
// MAIN-world script, plus design-token extraction (needs only the DOM).

import { extractTokens } from '@/lib/tokens';
import { BRIDGE, type BridgeRequest, type FullScan, type PanelRequest } from '@/lib/types';

let seq = 0;
function askPage<T>(req: BridgeRequest, timeoutMs = 20000): Promise<T> {
  const id = `${Date.now()}-${++seq}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      reject(new Error('The page did not answer. Reload the tab and try again.'));
    }, timeoutMs);
    function onMsg(e: MessageEvent) {
      if (e.source !== window || e.data?.source !== BRIDGE || e.data.dir !== 'res' || e.data.id !== id) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMsg);
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.data as T);
    }
    window.addEventListener('message', onMsg);
    window.postMessage({ source: BRIDGE, dir: 'req', id, req }, '*');
  });
}

const fetchCss = (url: string) => browser.runtime.sendMessage({ type: 'fetch-css', url }) as Promise<string | null>;

async function fullScan(): Promise<FullScan> {
  const [motion, tokenResult] = await Promise.all([
    askPage<Pick<FullScan, 'libraries' | 'motions' | 'splitText'>>({ kind: 'scan-motion' }),
    extractTokens(fetchCss),
  ]);
  return {
    url: location.href,
    title: document.title,
    scannedAt: new Date().toISOString(),
    ...motion,
    stylesheetKeyframes: tokenResult.keyframes,
    tokens: tokenResult.tokens,
  };
}

function highlight(selector: string) {
  let el: Element | null = null;
  try {
    el = document.querySelector(selector.replace(/::?(before|after)$/, ''));
  } catch {
    return false;
  }
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => {
    const r = el!.getBoundingClientRect();
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'fixed', left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px`,
      outline: '2px solid #ff3d7f', background: 'rgba(255,61,127,0.12)', borderRadius: '4px', zIndex: '2147483647',
      pointerEvents: 'none', transition: 'opacity 0.4s',
    });
    document.documentElement.appendChild(box);
    setTimeout(() => (box.style.opacity = '0'), 1400);
    setTimeout(() => box.remove(), 1900);
  }, 350);
  return true;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    browser.runtime.onMessage.addListener((msg: PanelRequest, _sender, sendResponse) => {
      const respond = (p: Promise<unknown>) => {
        p.then((data) => sendResponse({ ok: true, data })).catch((e) => sendResponse({ ok: false, error: String(e?.message ?? e) }));
        return true; // keep the channel open for the async answer
      };
      switch (msg?.type) {
        case 'ping':
          sendResponse({ ok: true });
          return false;
        case 'scan':
          return respond(fullScan());
        case 'record-scroll':
          return respond(askPage({ kind: 'record-scroll' }, 240000));
        case 'highlight':
          sendResponse({ ok: highlight(msg.selector) });
          return false;
      }
      return false;
    });
  },
});
