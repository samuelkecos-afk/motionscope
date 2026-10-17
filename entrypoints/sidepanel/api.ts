import type { FullScan, MotionItem, PanelRequest, ScrollRecording } from '@/lib/types';

/** The tab to inspect: ?tabId= (handy for testing) or the active tab. */
export async function targetTabId(): Promise<number | undefined> {
  const fromUrl = new URLSearchParams(location.search).get('tabId');
  if (fromUrl) return Number(fromUrl);
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

/** Inject the scripts into tabs that were open before the extension was installed. */
async function ensureInjected(tabId: number): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'ping' } satisfies PanelRequest);
    return false;
  } catch {
    await browser.scripting.executeScript({ target: { tabId }, files: ['/content-scripts/page.js'], world: 'MAIN' });
    await browser.scripting.executeScript({ target: { tabId }, files: ['/content-scripts/content.js'] });
    return true; // injected late: animations that already finished were missed
  }
}

async function send<T>(tabId: number, msg: PanelRequest): Promise<T> {
  const res = (await browser.tabs.sendMessage(tabId, msg)) as { ok: boolean; data?: T; error?: string } | undefined;
  if (!res) throw new Error('No answer from the page.');
  if (!res.ok) throw new Error(res.error ?? 'Unknown error');
  return res.data as T;
}

export async function scan(tabId: number) {
  const lateInjected = await ensureInjected(tabId);
  return { scan: await send<FullScan>(tabId, { type: 'scan' }), lateInjected };
}

export async function recordScroll(tabId: number) {
  await ensureInjected(tabId);
  return send<{ recording: ScrollRecording; motions: MotionItem[] }>(tabId, { type: 'record-scroll' });
}

export function highlight(tabId: number, selector: string) {
  return browser.tabs.sendMessage(tabId, { type: 'highlight', selector } satisfies PanelRequest).catch(() => {});
}
