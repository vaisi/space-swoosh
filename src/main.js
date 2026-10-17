// main.js
// Entry point: bootstraps the game.
// Changes:
// - Phone and tablet browsers boot the canvas. A bottom bar links the
//   matching store (web_store_prompt / web_store_click). Desktop web
//   promotes Swooshtober on the left and both store downloads on the
//   right. The left clock counts down to 31 October 23:59 Bucharest.
//   Native boots with no store chrome.
// - Do not await RevenueCat / entitlements before the menu: the free roster
//   plus ownedSkinIds cache is enough for the first hangar paint. A
//   Play Billing hang must not pin the native splash.
// - 3s splash failsafe plus initNative hide-first so launchAutoHide:false can
//   never leave the cream launch screen up.
// - Font preload is time-capped in ensureBrandFonts(); splash hide does not
//   wait on webfonts.
// - markDocumentShell() so desktop web can show store rails; native hides them.
// - Playtest `?signal=1` opens Submit Signal with sample stats; `?kb=N`
//   fakes IME height so the keyboard sheet can be checked in a browser.
// - Playtest `?level=42&nearend=1` starts that Journey day near the finish;
//   no intro captions; level-42.mp3 plays after the fade with the written ending.
// - Preload the brand webfonts (Space Grotesk / Space Mono) before the first
//   canvas paint so the on-brand HUD and end screens render correctly from
//   frame one instead of flashing a system fallback.
// - Wire the native shell (hardware back, lifecycle, wake lock, status bar,
//   splash dismissal) after the first frame. It no-ops on the web, and it is
//   deliberately not awaited before `start()` so a slow plugin can never delay
//   the menu appearing.

import { Game } from './game/Game.js';
import { GameConfig } from './config/GameConfig.js';
import { ensureBrandFonts } from './utils/BrandDraw.js';
import { initTheme } from './brand/theme.js';
import {
    markDocumentShell,
    preferredStoreTarget,
} from './core/platform.js';
import { hideSplashScreen, initNative } from './native/index.js';
import { initAnalytics, track } from './services/Analytics.js';
import { PLAY_STORE_URL, appStoreUrl } from './services/StoreLinks.js';
import { initEntitlements } from './services/Entitlements.js';
import { playtestLevelFromQuery } from './services/JourneyProgress.js';
import { CaptureManager } from './capture/CaptureManager.js';

const SPLASH_FAILSAFE_MS = 3000;

/** Phone browsers keep playing; the bar is the download path. */
function bindPhoneStoreBar() {
    if (document.documentElement.dataset.webGate !== 'play') return;
    track('web_store_prompt', { store_target: preferredStoreTarget() });
    const bar = document.querySelector('.phone-store-bar');
    if (!bar) return;
    bar.addEventListener('click', (event) => {
        const link = event.target.closest('[data-store]');
        if (!link) return;
        track('web_store_click', { store: link.dataset.store || '' });
    });
}

const SWOOSH_OPENS = '2026-10-15T00:00:00';
const SWOOSH_CLOSES = '2026-11-01T00:00:00';

function bucharestOffsetMs(date) {
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
    const wallAsUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(hour),
        Number(parts.minute),
        Number(parts.second),
    );
    return wallAsUtc - date.getTime();
}

/** UTC millis for a Europe/Bucharest wall time, `YYYY-MM-DDTHH:mm:ss`. */
function bucharestInstant(wall) {
    const [datePart, timePart] = wall.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    let utc = wallAsUtc - bucharestOffsetMs(new Date(wallAsUtc));
    utc = wallAsUtc - bucharestOffsetMs(new Date(utc));
    return utc;
}

function startSwooshtoberClock() {
    const clock = document.getElementById('swoosh-clock');
    const when = document.getElementById('swoosh-when');
    if (!clock || !when || document.documentElement.dataset.webGate !== 'desktop') return;

    const units = {
        d: clock.querySelector('[data-unit="d"]'),
        h: clock.querySelector('[data-unit="h"]'),
        m: clock.querySelector('[data-unit="m"]'),
        s: clock.querySelector('[data-unit="s"]'),
    };
    const opens = bucharestInstant(SWOOSH_OPENS);
    const closes = bucharestInstant(SWOOSH_CLOSES);
    const pad = (value) => String(value).padStart(2, '0');

    function paint() {
        const now = Date.now();
        if (now >= closes) {
            when.textContent = 'Ended';
            clock.hidden = true;
            return true;
        }
        const target = now < opens ? opens : closes;
        when.textContent = now < opens ? 'Starts in' : 'Ends in';
        clock.hidden = false;
        const total = Math.max(0, Math.floor((target - now) / 1000));
        units.d.textContent = String(Math.floor(total / 86400));
        units.h.textContent = pad(Math.floor((total % 86400) / 3600));
        units.m.textContent = pad(Math.floor((total % 3600) / 60));
        units.s.textContent = pad(total % 60);
        return false;
    }

    if (paint()) return;
    const timer = setInterval(() => {
        if (paint()) clearInterval(timer);
    }, 1000);
}

function applyStoreHrefs() {
    const ios = appStoreUrl();
    const play = PLAY_STORE_URL;
    for (const node of document.querySelectorAll('[data-store="ios"]')) {
        if (ios) node.setAttribute('href', ios);
    }
    for (const node of document.querySelectorAll('[data-store="play"]')) {
        if (play) node.setAttribute('href', play);
    }
}

window.addEventListener('load', async () => {
    initAnalytics();

    // Tokens + page shell before fonts/canvas so the first frame matches preference.
    initTheme();
    markDocumentShell();
    applyStoreHrefs();
    bindPhoneStoreBar();
    startSwooshtoberClock();

    const splashFailsafe = setTimeout(() => {
        hideSplashScreen().catch(() => {});
    }, SPLASH_FAILSAFE_MS);

    // Time-capped: a hung WebView font request must not block the menu.
    await ensureBrandFonts();

    const game = new Game(GameConfig);
    game.start();
    game.captureManager = new CaptureManager(game);
    const playtestLevel = playtestLevelFromQuery();
    if (playtestLevel != null) game.tryBeginJourneyLevel(playtestLevel);

    initEntitlements().catch((error) => {
        console.error('Entitlements failed to initialize:', error);
    });

    try {
        await initNative(game);
    } catch (error) {
        console.error('Native shell failed to initialize:', error);
        await hideSplashScreen();
    } finally {
        clearTimeout(splashFailsafe);
    }
});
