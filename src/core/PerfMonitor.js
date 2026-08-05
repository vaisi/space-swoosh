// PerfMonitor.js
// Phase 0 frame-delta harness: p50/p95/p99 + histogram (not average fps).
// Changes:
// - Created: ring buffer of worked-frame dts; overlay for ?perf=1; console
//   summary every ~3s. Hitch ratio = p99/p50.

const BUF = 600; // ~10s at 60 Hz
const BUCKETS = [
    { label: '<8', max: 8 },
    { label: '8-12', max: 12 },
    { label: '12-16', max: 16 },
    { label: '16-20', max: 20 },
    { label: '20-33', max: 33 },
    { label: '33-50', max: 50 },
    { label: '50+', max: Infinity },
];

function percentileSorted(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
    );
    return sorted[idx];
}

export class PerfMonitor {
    constructor() {
        /** @type {number[]} */
        this.samples = [];
        this.write = 0;
        this.lastLogAt = 0;
        this.overlayEl = null;
        this.modeLabel = '';
    }

    /** Record one worked frame's wall delta in ms. */
    sample(dtMs) {
        if (!(dtMs > 0) || !Number.isFinite(dtMs)) return;
        const clamped = Math.min(dtMs, 250);
        if (this.samples.length < BUF) {
            this.samples.push(clamped);
        } else {
            this.samples[this.write % BUF] = clamped;
            this.write++;
        }
    }

    setModeLabel(label) {
        this.modeLabel = label || '';
    }

    /** @returns {{ n: number, p50: number, p95: number, p99: number, hitch: number, hist: string }} */
    stats() {
        const sorted = this.samples.slice().sort((a, b) => a - b);
        const p50 = percentileSorted(sorted, 50);
        const p95 = percentileSorted(sorted, 95);
        const p99 = percentileSorted(sorted, 99);
        const hitch = p50 > 0 ? p99 / p50 : 0;

        const histCounts = BUCKETS.map(() => 0);
        for (const v of this.samples) {
            let idx = BUCKETS.length - 1;
            for (let i = 0; i < BUCKETS.length; i++) {
                if (v < BUCKETS[i].max) {
                    idx = i;
                    break;
                }
            }
            histCounts[idx]++;
        }
        const hist = BUCKETS.map((b, i) => `${b.label}:${histCounts[i]}`).join(' ');

        return { n: this.samples.length, p50, p95, p99, hitch, hist };
    }

    ensureOverlay() {
        if (this.overlayEl || typeof document === 'undefined') return;
        const el = document.createElement('pre');
        el.id = 'perfOverlay';
        el.setAttribute('aria-hidden', 'true');
        Object.assign(el.style, {
            position: 'fixed',
            left: '6px',
            top: '6px',
            zIndex: '99999',
            margin: '0',
            padding: '6px 8px',
            font: '11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
            color: '#1A1A1A',
            background: 'rgba(225, 217, 193, 0.92)',
            border: '1px solid rgba(26,26,26,0.35)',
            borderRadius: '2px',
            pointerEvents: 'none',
            whiteSpace: 'pre',
            maxWidth: '96vw',
        });
        document.body.appendChild(el);
        this.overlayEl = el;
    }

    /** Update DOM overlay + occasional console summary. */
    tickOverlay(extra = '') {
        this.ensureOverlay();
        const s = this.stats();
        if (!this.overlayEl || s.n < 8) return;

        const lines = [
            `PERF ${this.modeLabel}`.trim(),
            `n=${s.n}  p50=${s.p50.toFixed(1)}  p95=${s.p95.toFixed(1)}  p99=${s.p99.toFixed(1)}`,
            `hitch p99/p50=${s.hitch.toFixed(2)}  ( >4 ⇒ hitch problem )`,
            s.hist,
            extra,
        ].filter(Boolean);

        this.overlayEl.textContent = lines.join('\n');

        const now = performance.now();
        if (now - this.lastLogAt > 3000) {
            this.lastLogAt = now;
            console.log('[perf]', lines.join(' | '));
        }
    }
}
