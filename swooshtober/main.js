// main.js
// Changes: Logs swooshtober_view through the same analytics path as the
// game, so a visit to /swooshtober/ shows up in Realtime. The starfield
// is imported from src/site/stars.js, shared with the About and How to
// play pages. Loads the live Zigzag distance top 10 from high_scores.

import { initAnalytics, track } from '../src/services/Analytics.js';
import { supabase } from '../src/config/supabase.js';
import { SKIN_DEFS } from '../src/ships/skinDefs.js';
import { appStoreUrl, PLAY_STORE_URL } from '../src/services/StoreLinks.js';
import { mountStars } from '../src/site/stars.js';

const SHIP_NAMES = Object.fromEntries(SKIN_DEFS.map((skin) => [skin.id, skin.name]));
const TROPHIES = ['🥇', '🥈', '🥉'];

/** Leave null until a claim has been checked. Call sign and distance only. */
const PUBLISHED_WINNER = null;

const OPENS = '2026-10-15T00:00:00';
const CLOSES = '2026-11-01T00:00:00';

const store = document.querySelector('#app-store');
const iosCard = document.querySelector('#play-ios');
const appHref = appStoreUrl();
if (appHref) {
    if (store) store.href = appHref;
    if (iosCard) iosCard.href = appHref;
}
const play = document.querySelector('#play-store');
const androidCard = document.querySelector('#play-android');
if (play) play.href = PLAY_STORE_URL;
if (androidCard) androidCard.href = PLAY_STORE_URL;

const stars = document.querySelector('#stars');
if (stars instanceof HTMLCanvasElement) mountStars(stars);

function bucharestWall(date = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Bucharest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
    const hour = parts.hour === '24' ? '00' : parts.hour;
    return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`;
}

function formatKm(value) {
    return new Intl.NumberFormat('en-US').format(Math.floor(Number(value)));
}

function renderPhase() {
    const phaseEl = document.querySelector('#phase');
    if (!phaseEl) return;

    if (PUBLISHED_WINNER && PUBLISHED_WINNER.callSign && PUBLISHED_WINNER.scoreKm != null) {
        phaseEl.textContent = `Winner: ${PUBLISHED_WINNER.callSign} · ${formatKm(PUBLISHED_WINNER.scoreKm)} KM`;
        return;
    }

    const wall = bucharestWall();
    if (wall < OPENS) {
        phaseEl.textContent = 'Starts 15 October 2026 at 00:00, Bucharest time.';
        return;
    }
    if (wall >= CLOSES) {
        phaseEl.textContent = 'That’s closed. I’m checking the scores. I announce the result on 1 November.';
        return;
    }
    phaseEl.textContent = 'Open now. Send your score by 31 October 2026 at 23:59, Bucharest time.';
}

function shipName(id) {
    return (id && SHIP_NAMES[id]) || '';
}

function appendText(parent, text) {
    parent.appendChild(document.createTextNode(text));
}

function renderLiveBoard(rows, total) {
    const list = document.querySelector('#live-rows');
    const status = document.querySelector('#live-status');
    const page = document.querySelector('#live-page');
    if (!list || !status || !page) return;

    list.replaceChildren();
    if (!rows.length) {
        status.textContent = 'No scores on the live board yet.';
        return;
    }

    rows.forEach((row, index) => {
        const rank = index + 1;
        const item = document.createElement('li');
        item.className = 'liveboard__row' + (rank <= 3 ? ' liveboard__row--top' : '') + (rank === 1 ? ' liveboard__row--lead' : '');

        const rankEl = document.createElement('span');
        rankEl.className = 'liveboard__rank';
        rankEl.textContent = TROPHIES[rank - 1] || String(rank);

        const who = document.createElement('span');
        who.className = 'liveboard__who';
        appendText(who, row.player_name || '—');
        const ship = shipName(row.ship_id);
        if (ship) {
            const shipEl = document.createElement('span');
            shipEl.className = 'liveboard__ship';
            shipEl.textContent = `, ${ship}`;
            who.appendChild(shipEl);
        }

        const scoreEl = document.createElement('span');
        scoreEl.className = 'liveboard__score';
        scoreEl.textContent = formatKm(row.score);

        item.append(rankEl, who, scoreEl);

        if (rank === 1) {
            const sketch = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            sketch.setAttribute('class', 'liveboard__sketch');
            sketch.setAttribute('viewBox', '0 0 250 96');
            sketch.setAttribute('aria-hidden', 'true');
            sketch.innerHTML = [
                '<path d="M22 58 C32 56 38 64 36 72 C34 82 26 86 18 84 C8 82 6 74 8 66 C10 56 14 56 22 58"/>',
                '<path d="M34 60 C42 28 96 12 152 22"/>',
                '<path d="M138 14 L156 22 L136 32"/>',
                '<text x="162" y="30" transform="rotate(-6 162 30)">wins $50</text>',
            ].join('');
            item.appendChild(sketch);
        }

        list.appendChild(item);
    });

    const pages = Math.max(1, Math.ceil((total || rows.length) / 10));
    page.textContent = `Page 1 / ${pages}`;
    status.textContent = '';
}

async function loadLiveBoard() {
    const status = document.querySelector('#live-status');
    if (!status) return;
    if (!supabase) {
        status.textContent = 'The live board isn’t available right now.';
        return;
    }

    const { data, error, count } = await supabase
        .from('high_scores')
        .select('player_name, ship_id, score', { count: 'exact' })
        .eq('flight_style', 'zigzag')
        .order('score', { ascending: false })
        .range(0, 9);

    if (error) {
        status.textContent = 'The live board didn’t load. Refresh to try again.';
        return;
    }
    renderLiveBoard(data || [], count || 0);
}

initAnalytics();
track('swooshtober_view', {
    page: '/swooshtober/',
});

renderPhase();
loadLiveBoard();
