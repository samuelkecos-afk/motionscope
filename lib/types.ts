// Shared data shapes passed between the page, the content script and the side panel.
// Everything here must be plain JSON (no DOM nodes, no functions).

export type Engine = 'css-animation' | 'css-transition' | 'waapi' | 'gsap';

export type TimelineKind = 'document' | 'scroll' | 'view' | 'unknown';

export interface MotionKeyframe {
  offset: number | null;
  easing?: string;
  [prop: string]: string | number | null | undefined;
}

export interface ScrollRange {
  start?: string; // e.g. "top 80%" (GSAP) or "entry 0%" (CSS view timeline)
  end?: string;
  startPx?: number; // resolved scroll position, when known
  endPx?: number;
  scrub?: boolean | number;
  pin?: boolean;
  trigger?: string; // selector of the trigger element
}

export interface MotionItem {
  id: string;
  engine: Engine;
  name: string; // animation-name, transitioned property, GSAP id, or a generated label
  target: string; // CSS selector of the animated element
  targetCount: number; // >1 for GSAP tweens with several targets (staggers)
  duration: number; // ms (GSAP converted from seconds)
  delay: number; // ms
  easing: string;
  iterations: number | 'infinite';
  direction?: string;
  fill?: string;
  stagger?: number; // ms between targets
  keyframes: MotionKeyframe[];
  timeline: TimelineKind;
  scroll?: ScrollRange;
  finished?: boolean; // captured live but no longer running
  parent?: string; // id of parent GSAP timeline
}

export interface LibraryHit {
  name: string;
  version?: string;
  evidence: string;
}

export interface SplitTextHit {
  target: string;
  unit: 'char' | 'word' | 'line';
  pieces: number;
  sample: string;
}

export interface ScrollTrack {
  target: string;
  props: string[]; // which properties changed
  mode: 'scrubbed' | 'triggered' | 'pinned';
  startPx: number;
  endPx: number;
  startLabel: string; // "top 85%" style: element edge vs viewport position at start
  endLabel: string;
  from: Record<string, string>;
  to: Record<string, string>;
  easing: string; // best fitting easing for the main property
  samples: { scroll: number; values: Record<string, number> }[];
}

export interface ScrollRecording {
  pageHeight: number;
  viewportHeight: number;
  steps: number;
  tracks: ScrollTrack[];
}

export interface ColorToken {
  value: string; // hex
  count: number;
  usage: string[]; // "text", "background", "border"
}

export interface TypeStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  count: number;
  tags: string[];
}

export interface CountedValue {
  value: string;
  count: number;
}

export interface DesignTokens {
  colors: ColorToken[];
  fonts: CountedValue[];
  fontSizes: CountedValue[];
  typeStyles: TypeStyle[];
  spacing: CountedValue[];
  spacingBase?: number;
  radii: CountedValue[];
  shadows: CountedValue[];
  durations: CountedValue[];
  easings: CountedValue[];
  cssVariables: { name: string; value: string }[];
  breakpoints: string[];
  elementsScanned: number;
}

export interface MotionScan {
  url: string;
  title: string;
  scannedAt: string;
  libraries: LibraryHit[];
  motions: MotionItem[];
  splitText: SplitTextHit[];
  stylesheetKeyframes: { name: string; css: string }[];
}

export interface FullScan extends MotionScan {
  tokens: DesignTokens;
}

// Messages between the isolated content script and the MAIN-world script.
export const BRIDGE = 'motionscope-bridge';

export type BridgeRequest =
  | { kind: 'scan-motion' }
  | { kind: 'record-scroll'; stepRatio?: number; settleMs?: number }
  | { kind: 'highlight'; selector: string };

// Messages from the side panel / background to the content script.
export type PanelRequest =
  | { type: 'scan' }
  | { type: 'record-scroll' }
  | { type: 'highlight'; selector: string }
  | { type: 'ping' };
