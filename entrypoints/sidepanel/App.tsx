import { useCallback, useEffect, useMemo, useState } from 'react';
import { motionToCss, motionToGsap, toCssVariables, toDTCG, toTailwindTheme, trackToGsap } from '@/lib/export';
import type { Engine, FullScan, MotionItem, ScrollRecording, ScrollTrack } from '@/lib/types';
import { highlight, recordScroll, scan, targetTabId } from './api';

type Tab = 'overview' | 'motion' | 'scroll' | 'tokens' | 'export';

const ENGINE_LABEL: Record<Engine, string> = {
  'css-animation': 'CSS anim',
  'css-transition': 'Transition',
  waapi: 'WAAPI',
  gsap: 'GSAP',
};

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const ms = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(2)}s` : `${Math.round(n)}ms`);

export default function App() {
  const [tabId, setTabId] = useState<number>();
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<FullScan>();
  const [recording, setRecording] = useState<ScrollRecording>();
  const [busy, setBusy] = useState<'' | 'scan' | 'record'>('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    targetTabId().then(setTabId);
    if (new URLSearchParams(location.search).get('tabId')) return;
    const onActivated = (info: { tabId: number }) => {
      setTabId(info.tabId);
      setData(undefined);
      setRecording(undefined);
    };
    browser.tabs.onActivated.addListener(onActivated);
    return () => browser.tabs.onActivated.removeListener(onActivated);
  }, []);

  const runScan = useCallback(async () => {
    if (tabId == null) return;
    setBusy('scan');
    setError('');
    try {
      const res = await scan(tabId);
      setData(res.scan);
      setNote(res.lateInjected ? 'MotionScope was added after this page loaded, so animations that already finished were missed. Reload the page and scan again for a full capture.' : '');
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy('');
    }
  }, [tabId]);

  const runRecord = useCallback(async () => {
    if (tabId == null) return;
    setBusy('record');
    setError('');
    setTab('scroll');
    try {
      const res = await recordScroll(tabId);
      setRecording(res.recording);
      // Scrolling fires scroll-triggered animations, so refresh the motion list too.
      setData((d) => (d ? { ...d, motions: res.motions } : d));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy('');
    }
  }, [tabId]);

  const onTarget = useCallback((sel: string) => tabId != null && highlight(tabId, sel), [tabId]);

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="logo" aria-hidden>◎</span> MotionScope
        </div>
        <div className="actions">
          <button className="primary" disabled={!!busy || tabId == null} onClick={runScan}>
            {busy === 'scan' ? 'Scanning…' : data ? 'Rescan' : 'Scan page'}
          </button>
          <button disabled={!!busy || tabId == null} onClick={runRecord} title="Scrolls the page from top to bottom and records what moves">
            {busy === 'record' ? 'Recording…' : 'Record scroll'}
          </button>
        </div>
      </header>
      {data && <div className="page-title" title={data.url}>{data.title || data.url}</div>}
      {error && <div className="banner error">{error}</div>}
      {note && <div className="banner">{note}</div>}

      <nav>
        {(['overview', 'motion', 'scroll', 'tokens', 'export'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            {t === 'motion' && data ? <span className="count">{data.motions.length}</span> : null}
            {t === 'scroll' && recording ? <span className="count">{recording.tracks.length}</span> : null}
          </button>
        ))}
      </nav>

      <main>
        {!data && !recording && busy !== 'record' ? (
          <Empty onScan={runScan} disabled={!!busy || tabId == null} />
        ) : (
          <>
            {tab === 'overview' && data && <Overview data={data} recording={recording} />}
            {tab === 'motion' && data && <MotionList items={data.motions} onTarget={onTarget} />}
            {tab === 'scroll' && <ScrollView recording={recording} busy={busy === 'record'} onTarget={onTarget} />}
            {tab === 'tokens' && data && <Tokens data={data} />}
            {tab === 'export' && data && <Export data={data} recording={recording} />}
            {!data && tab !== 'scroll' && <p className="muted pad">Run a scan to see this tab.</p>}
          </>
        )}
      </main>
    </div>
  );
}

function Empty({ onScan, disabled }: { onScan: () => void; disabled: boolean }) {
  return (
    <div className="empty">
      <h2>Inspect this page's motion and design system</h2>
      <p><b>Scan page</b> reads CSS animations, transitions, Web Animations, GSAP and ScrollTrigger, motion libraries, split text, and design tokens.</p>
      <p><b>Record scroll</b> scrolls the page top to bottom and records every element that moves, fades or pins, including motion no API exposes.</p>
      <button className="primary" onClick={onScan} disabled={disabled}>Scan page</button>
    </div>
  );
}

// ---------------- Overview ----------------

function Overview({ data, recording }: { data: FullScan; recording?: ScrollRecording }) {
  const byEngine = useMemo(() => {
    const m: Record<string, number> = {};
    data.motions.forEach((x) => (m[x.engine] = (m[x.engine] ?? 0) + 1));
    return m;
  }, [data.motions]);
  const scrollLinked = data.motions.filter((m) => m.timeline === 'scroll' || m.timeline === 'view').length;
  return (
    <div className="pad stack">
      <section>
        <h3>Detected libraries</h3>
        {data.libraries.length ? (
          <div className="chips">
            {data.libraries.map((l) => (
              <span className="chip" key={l.name} title={l.evidence}>
                {l.name}
                {l.version ? <small> {l.version}</small> : null}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted">No known motion libraries found.</p>
        )}
      </section>
      <section className="stats">
        <Stat label="Animations" value={data.motions.length} />
        <Stat label="Scroll-linked" value={scrollLinked} />
        <Stat label="Split text" value={data.splitText.length} />
        <Stat label="@keyframes" value={data.stylesheetKeyframes.length} />
        <Stat label="Colors" value={data.tokens.colors.length} />
        <Stat label="Scroll tracks" value={recording?.tracks.length ?? '—'} />
      </section>
      <section>
        <h3>By engine</h3>
        <div className="chips">
          {Object.entries(byEngine).map(([k, v]) => (
            <span key={k} className={`chip engine-${k}`}>{ENGINE_LABEL[k as Engine]} · {v}</span>
          ))}
          {!Object.keys(byEngine).length && <span className="muted">Nothing running yet. Try interacting with the page or recording a scroll.</span>}
        </div>
      </section>
      {data.splitText.length > 0 && (
        <section>
          <h3>Split text</h3>
          <ul className="plain">
            {data.splitText.map((s) => (
              <li key={s.target}>
                <code>{s.unit}</code> × {s.pieces} — “{s.sample}”
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ---------------- Motion ----------------

function MotionList({ items, onTarget }: { items: MotionItem[]; onTarget: (s: string) => void }) {
  const [engine, setEngine] = useState<Engine | 'all'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string>();
  const filtered = items.filter(
    (m) => (engine === 'all' || m.engine === engine) && (!q || `${m.name} ${m.target}`.toLowerCase().includes(q.toLowerCase())),
  );
  const maxEnd = Math.max(1, ...filtered.filter((m) => m.timeline === 'document' && m.iterations !== 'infinite').map((m) => m.delay + m.duration));

  return (
    <div>
      <div className="toolbar">
        <input placeholder="Filter by name or selector" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">
          {(['all', 'css-animation', 'css-transition', 'waapi', 'gsap'] as const).map((e) => (
            <button key={e} className={engine === e ? 'active' : ''} onClick={() => setEngine(e)}>
              {e === 'all' ? 'All' : ENGINE_LABEL[e]}
            </button>
          ))}
        </div>
      </div>
      {!filtered.length && <p className="muted pad">No animations match.</p>}
      <ul className="rows">
        {filtered.map((m) => (
          <li key={m.id} className={open === m.id ? 'open' : ''}>
            <div className="row" onClick={() => setOpen(open === m.id ? undefined : m.id)}>
              <span className={`badge engine-${m.engine}`}>{ENGINE_LABEL[m.engine]}</span>
              <div className="row-main">
                <div className="row-title">
                  {m.name}
                  {m.engine !== 'gsap' && (m.timeline === 'scroll' || m.timeline === 'view') && <span className="tag">{m.timeline}()</span>}
                  {m.scroll && m.engine === 'gsap' && <span className="tag">ScrollTrigger</span>}
                  {m.finished && <span className="tag dim">finished</span>}
                </div>
                <button className="link" onClick={(e) => { e.stopPropagation(); onTarget(m.target); }} title="Show on page">
                  {m.target}{m.targetCount > 1 ? ` +${m.targetCount - 1}` : ''}
                </button>
              </div>
              <div className="row-meta">
                {m.duration > 0 ? ms(m.duration) : '—'}
                <small>{m.easing}</small>
              </div>
            </div>
            {m.timeline === 'document' && m.iterations !== 'infinite' && m.duration > 0 && (
              <div className="bar"><span style={{ left: `${(m.delay / maxEnd) * 100}%`, width: `${Math.max(1, (m.duration / maxEnd) * 100)}%` }} /></div>
            )}
            {open === m.id && <MotionDetail m={m} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MotionDetail({ m }: { m: MotionItem }) {
  const [view, setView] = useState<'css' | 'gsap' | 'json'>(m.engine === 'gsap' ? 'gsap' : 'css');
  const code = view === 'css' ? motionToCss(m) : view === 'gsap' ? motionToGsap(m) : JSON.stringify(m, null, 2);
  return (
    <div className="detail">
      <dl>
        <dt>Duration</dt><dd>{ms(m.duration)}</dd>
        <dt>Delay</dt><dd>{ms(m.delay)}</dd>
        <dt>Easing</dt><dd>{m.easing}</dd>
        <dt>Iterations</dt><dd>{String(m.iterations)}</dd>
        {m.direction && <><dt>Direction</dt><dd>{m.direction}</dd></>}
        {m.stagger != null && <><dt>Stagger</dt><dd>{ms(m.stagger)}</dd></>}
        {m.scroll && (
          <>
            <dt>Scroll range</dt>
            <dd>{m.scroll.start ?? 'normal'} → {m.scroll.end ?? 'normal'}{m.scroll.scrub ? ` · scrub ${m.scroll.scrub}` : ''}{m.scroll.pin ? ' · pin' : ''}</dd>
            {m.scroll.trigger && <><dt>Trigger</dt><dd>{m.scroll.trigger}</dd></>}
          </>
        )}
      </dl>
      {m.keyframes.length > 0 && (
        <table className="kf">
          <thead><tr><th>offset</th>{keyframeProps(m).map((p) => <th key={p}>{p}</th>)}</tr></thead>
          <tbody>
            {m.keyframes.map((k, i) => (
              <tr key={i}><td>{k.offset == null ? '—' : `${Math.round(k.offset * 100)}%`}</td>{keyframeProps(m).map((p) => <td key={p}>{String(k[p] ?? '')}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
      <CodeBlock code={code} tabs={['css', 'gsap', 'json']} active={view} onTab={(t) => setView(t as typeof view)} />
    </div>
  );
}

function keyframeProps(m: MotionItem) {
  const set = new Set<string>();
  m.keyframes.forEach((k) => Object.keys(k).forEach((p) => p !== 'offset' && set.add(p)));
  return [...set];
}

function CodeBlock({ code, tabs, active, onTab }: { code: string; tabs?: string[]; active?: string; onTab?: (t: string) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code">
      <div className="code-head">
        <div className="seg small">
          {tabs?.map((t) => (
            <button key={t} className={active === t ? 'active' : ''} onClick={() => onTab?.(t)}>{t.toUpperCase()}</button>
          ))}
        </div>
        <button className="ghost" onClick={() => { copy(code); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>{code}</pre>
    </div>
  );
}

// ---------------- Scroll ----------------

function ScrollView({ recording, busy, onTarget }: { recording?: ScrollRecording; busy: boolean; onTarget: (s: string) => void }) {
  const [open, setOpen] = useState<number>();
  if (busy) return <p className="muted pad">Scrolling the page and sampling every element. Leave the tab open; this takes a few seconds per screen of content.</p>;
  if (!recording) return <p className="muted pad">Press <b>Record scroll</b> to capture scroll-linked motion.</p>;
  const total = Math.max(1, recording.pageHeight - recording.viewportHeight);
  return (
    <div>
      <p className="muted pad small">
        {recording.tracks.length} moving elements across {recording.steps} scroll steps. Page height {recording.pageHeight}px.
      </p>
      <ul className="rows">
        {recording.tracks.map((t, i) => (
          <li key={i} className={open === i ? 'open' : ''}>
            <div className="row" onClick={() => setOpen(open === i ? undefined : i)}>
              <span className={`badge mode-${t.mode}`}>{t.mode}</span>
              <div className="row-main">
                <div className="row-title">{t.props.join(', ')}</div>
                <button className="link" onClick={(e) => { e.stopPropagation(); onTarget(t.target); }}>{t.target}</button>
              </div>
              <div className="row-meta">{t.startLabel}<small>{t.easing}</small></div>
            </div>
            <div className="bar scroll"><span style={{ left: `${(t.startPx / total) * 100}%`, width: `${Math.max(0.8, ((t.endPx - t.startPx) / total) * 100)}%` }} /></div>
            {open === i && <TrackDetail t={t} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sparkline({ t }: { t: ScrollTrack }) {
  const props = (['opacity', 'x', 'y', 'scale', 'rotate'] as const).filter((p) => t.props.includes(p));
  if (!props.length || t.samples.length < 2) return null;
  const W = 280, H = 60;
  const x0 = t.samples[0].scroll, x1 = t.samples[t.samples.length - 1].scroll || x0 + 1;
  const colors = ['#ff3d7f', '#4cc9f0', '#f9c74f', '#90be6d', '#c77dff'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="spark" role="img" aria-label="Property values over scroll">
      {props.map((p, k) => {
        const vals = t.samples.map((s) => s.values[p]);
        const min = Math.min(...vals), max = Math.max(...vals);
        const span = max - min || 1;
        const d = t.samples.map((s, i) => `${i ? 'L' : 'M'}${(((s.scroll - x0) / (x1 - x0 || 1)) * W).toFixed(1)},${(H - 4 - ((s.values[p] - min) / span) * (H - 8)).toFixed(1)}`).join(' ');
        return <path key={p} d={d} fill="none" stroke={colors[k]} strokeWidth="1.5" />;
      })}
    </svg>
  );
}

function TrackDetail({ t }: { t: ScrollTrack }) {
  return (
    <div className="detail">
      <Sparkline t={t} />
      <dl>
        <dt>Range</dt><dd>{t.startPx}px → {t.endPx}px</dd>
        <dt>Starts</dt><dd>{t.startLabel}</dd>
        <dt>Ends</dt><dd>{t.endLabel}</dd>
        {Object.keys(t.from).map((p) => (
          <span key={p} style={{ display: 'contents' }}><dt>{p}</dt><dd>{t.from[p]} → {t.to[p]}</dd></span>
        ))}
        <dt>Easing</dt><dd>{t.easing}</dd>
      </dl>
      <CodeBlock code={trackToGsap(t)} tabs={['gsap']} active="gsap" />
    </div>
  );
}

// ---------------- Tokens ----------------

function Tokens({ data }: { data: FullScan }) {
  const t = data.tokens;
  return (
    <div className="pad stack">
      <section>
        <h3>Colors <small>{t.colors.length}</small></h3>
        <div className="swatches">
          {t.colors.map((c) => (
            <button key={c.value} className="swatch" onClick={() => copy(c.value)} title={`${c.usage.join(', ')} · ${c.count}× · click to copy`}>
              <span style={{ background: c.value }} />
              <code>{c.value}</code>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>Type styles</h3>
        <ul className="type">
          {t.typeStyles.slice(0, 12).map((s, i) => (
            <li key={i}>
              <div className="type-sample" style={{ fontFamily: s.fontFamily, fontSize: `min(${s.fontSize}, 32px)`, fontWeight: Number(s.fontWeight), letterSpacing: s.letterSpacing }}>
                {s.fontFamily}
              </div>
              <div className="muted small">{s.fontSize} / {s.lineHeight} · {s.fontWeight} · {s.tags.join(', ')} · {s.count}×</div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Spacing {t.spacingBase ? <small>{t.spacingBase}px base</small> : null}</h3>
        <div className="spacing">
          {t.spacing.map((s) => (
            <div key={s.value} className="space-row">
              <code>{s.value}</code>
              <span style={{ width: `min(${s.value}, 100%)` }} />
              <small className="muted">{s.count}×</small>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3>Radii</h3>
        <div className="radii">
          {t.radii.map((r) => (
            <div key={r.value}><span style={{ borderRadius: r.value }} /><code>{r.value}</code></div>
          ))}
        </div>
      </section>
      {t.shadows.length > 0 && (
        <section>
          <h3>Shadows</h3>
          <div className="shadows">
            {t.shadows.map((s) => (
              <div key={s.value} title={s.value}><span style={{ boxShadow: s.value }} /></div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3>Motion tokens</h3>
        <div className="two">
          <div>
            <h4>Durations</h4>
            <ul className="plain">{t.durations.map((d) => <li key={d.value}><code>{d.value}</code> <small className="muted">{d.count}×</small></li>)}</ul>
          </div>
          <div>
            <h4>Easings</h4>
            <ul className="plain">{t.easings.map((d) => <li key={d.value}><code>{d.value}</code> <small className="muted">{d.count}×</small></li>)}</ul>
          </div>
        </div>
      </section>
      {t.breakpoints.length > 0 && (
        <section>
          <h3>Breakpoints</h3>
          <div className="chips">{t.breakpoints.map((b) => <span className="chip" key={b}>{b}</span>)}</div>
        </section>
      )}
      <section>
        <details>
          <summary>CSS variables ({t.cssVariables.length})</summary>
          <pre className="vars">{t.cssVariables.map((v) => `${v.name}: ${v.value};`).join('\n')}</pre>
        </details>
      </section>
      <p className="muted small">{t.elementsScanned} visible elements scanned.</p>
    </div>
  );
}

// ---------------- Export ----------------

function Export({ data, recording }: { data: FullScan; recording?: ScrollRecording }) {
  const [format, setFormat] = useState<'dtcg' | 'css' | 'tailwind' | 'gsap' | 'keyframes'>('dtcg');
  const code = useMemo(() => {
    switch (format) {
      case 'dtcg': return JSON.stringify(toDTCG(data.tokens), null, 2);
      case 'css': return toCssVariables(data.tokens);
      case 'tailwind': return toTailwindTheme(data.tokens);
      case 'keyframes': return data.stylesheetKeyframes.map((k) => k.css).join('\n\n') || '/* No @keyframes found */';
      case 'gsap': {
        const parts = data.motions.filter((m) => m.engine === 'gsap' && m.target !== '(timeline)').map(motionToGsap);
        if (recording) parts.push(...recording.tracks.map(trackToGsap));
        return parts.length ? `gsap.registerPlugin(ScrollTrigger);\n\n${parts.join('\n\n')}` : '// No GSAP motion yet. Record a scroll to generate ScrollTrigger code.';
      }
    }
  }, [format, data, recording]);
  const host = (() => { try { return new URL(data.url).hostname; } catch { return 'page'; } })();
  return (
    <div className="pad stack">
      <div className="seg">
        {(['dtcg', 'css', 'tailwind', 'keyframes', 'gsap'] as const).map((f) => (
          <button key={f} className={format === f ? 'active' : ''} onClick={() => setFormat(f)}>
            {{ dtcg: 'DTCG', css: 'CSS vars', tailwind: 'Tailwind', keyframes: '@keyframes', gsap: 'GSAP' }[f]}
          </button>
        ))}
      </div>
      <CodeBlock code={code} />
      <button onClick={() => download(`motionscope-${host}.json`, { ...data, scrollRecording: recording })}>Download full scan (JSON)</button>
    </div>
  );
}
