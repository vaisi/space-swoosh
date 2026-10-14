// DeathTally.js
// Dev-only crash record. On with ?deaths=1. Counts the obstacle that killed
// you and whatever else was sharing the screen, and shows a copyable summary.
// Changes:
// - Created file: session tally, fixed panel, Copy button. No network.

import { demandTypeOf } from '../config/ObstacleDemand.js';

const STORAGE_KEY = 'ss-death-tally';

export function deathTallyEnabled() {
    if (typeof location === 'undefined') return false;
    return new URLSearchParams(location.search).get('deaths') === '1';
}

function loadRows() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const rows = raw ? JSON.parse(raw) : [];
        return Array.isArray(rows) ? rows : [];
    } catch {
        return [];
    }
}

/** Other catalogued types overlapping the view, besides the one that hit. */
function companyOf(killer, manager) {
    const { camera, height } = manager.game;
    const top = camera.y - height * 0.6;
    const bottom = camera.y + height;
    const types = new Set();
    for (const obstacle of manager.obstacles) {
        if (obstacle === killer || obstacle.retired) continue;
        if (obstacle.y < top || obstacle.y > bottom) continue;
        const type = demandTypeOf(obstacle);
        if (type !== 'simple') types.add(type);
    }
    return [...types].sort();
}

export class DeathTally {
    constructor() {
        this.rows = loadRows();
        this.panel = null;
        this.mount();
        this.render();
    }

    note(obstacle, manager) {
        const type = demandTypeOf(obstacle);
        const withTypes = companyOf(obstacle, manager);
        this.rows.push({ type, with: withTypes });
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.rows));
        } catch {
            // A full session store must not block the crash.
        }
        this.render();
    }

    summary() {
        const byType = new Map();
        for (const row of this.rows) {
            const bucket = byType.get(row.type) || [];
            bucket.push(row.with.length ? row.with.join(' + ') : 'alone');
            byType.set(row.type, bucket);
        }
        const lines = [`Deaths ${this.rows.length}`];
        for (const type of [...byType.keys()].sort()) {
            const bucket = byType.get(type);
            lines.push(`${type} ${bucket.length}`);
            const pairs = new Map();
            for (const label of bucket) pairs.set(label, (pairs.get(label) || 0) + 1);
            for (const [label, count] of [...pairs.entries()].sort()) {
                lines.push(`  with ${label} ${count}`);
            }
        }
        return lines.join('\n');
    }

    mount() {
        const panel = document.createElement('aside');
        panel.id = 'death-tally';
        panel.style.cssText = [
            'position:fixed', 'left:8px', 'bottom:8px', 'z-index:99999',
            'max-width:280px', 'max-height:40vh', 'overflow:auto',
            'padding:8px 10px', 'background:rgba(28,27,25,0.92)',
            'color:#e1d9c1', 'font:12px/1.4 ui-monospace,monospace',
            'border-radius:6px', 'white-space:pre-wrap',
        ].join(';');
        const body = document.createElement('div');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Copy';
        button.style.cssText = 'margin-top:6px;font:12px ui-monospace,monospace';
        button.addEventListener('click', () => {
            const text = this.summary();
            const done = () => { button.textContent = 'Copied'; };
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
            } else {
                fallbackCopy(text, done);
            }
        });
        panel.append(body, button);
        document.body.appendChild(panel);
        this.panel = panel;
        this.body = body;
    }

    render() {
        if (!this.body) return;
        this.body.textContent = this.summary();
    }
}

function fallbackCopy(text, done) {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); done(); } catch { /* leave the panel text selectable */ }
    area.remove();
}
