// Runs in the page's own JavaScript world (MAIN) from document_start, so it can
// see window.gsap etc. and hook element.animate() before the site uses it.
// It has no access to extension APIs; it talks to content.ts via postMessage.

import { collectMotions, detectLibraries, detectSplitText, installMotionHooks } from '@/lib/motion';
import { recordScroll } from '@/lib/scroll-recorder';
import { BRIDGE, type BridgeRequest } from '@/lib/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    installMotionHooks();

    window.addEventListener('message', async (e) => {
      if (e.source !== window || e.data?.source !== BRIDGE || e.data.dir !== 'req') return;
      const { id, req } = e.data as { id: string; req: BridgeRequest };
      const reply = (payload: object) => window.postMessage({ source: BRIDGE, dir: 'res', id, ...payload }, '*');
      try {
        if (req.kind === 'scan-motion') {
          reply({ data: { libraries: detectLibraries(), motions: collectMotions(), splitText: detectSplitText() } });
        } else if (req.kind === 'record-scroll') {
          const recording = await recordScroll({ stepRatio: req.stepRatio, settleMs: req.settleMs });
          reply({ data: { recording, motions: collectMotions() } });
        }
      } catch (err) {
        reply({ error: String((err as Error)?.stack ?? err) });
      }
    });
  },
});
