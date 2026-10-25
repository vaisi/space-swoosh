// Analytics.js
// One place to record a game event, whatever the platform underneath.
// Changes:
// - Native startup calls FirebaseAnalytics.setEnabled(true) so a stale
//   google-services / plist flag cannot leave collection off. The plugin
//   persists that flag; the following launch is the one Realtime sees.
// - Web reads import.meta.env.VITE_FIREBASE_* directly (Vite inlines those).
//   Firebase JS when VITE_FIREBASE_APP_ID is set; gtag to
//   VITE_FIREBASE_MEASUREMENT_ID (default G-T7PQRTJH1Z) only when it is not.
// - Before that tag loads, consent default grants analytics_storage and
//   denies ad storage. An EEA hit with those signals unset (gcd letter l,
//   no gcs) returns 204 and never appears in Realtime.
// - Web: Firebase Analytics JS (same project as iOS/Android, spaceswoosh-faa9c)
//   instead of standalone gtag. Native still uses @capacitor-firebase/analytics.
// - Phone web logs `web_store_prompt` (store_target ios|android|both) when the
//   download bar is on screen, and `web_store_click` (store ios|play) on tap.
// - Every event auto-attaches `platform` (ios|android|web).
// - GA4 `purchase` helper (value + currency) for RevenueCat revenue in Firebase.
// - User properties: equipped_ship, max_journey_level, theme.
// - Sanitize params for Firebase (string | number only). Booleans like
//   `completed: true` were putBoolean'd by the plugin and can cause Android to
//   drop the whole custom event — convert to 0/1. Truncate long strings.
// - Each VITE_FIREBASE_* read is a direct import.meta.env member, guarded when
//   Vite is absent, so Node scripts can import.
// - Review prompt: review_prompt_shown (trigger day_6|day_13), review_prompt_yes,
//   not_really_enjoying, review_prompt_later, review_from_options.

import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { clientPlatform } from '../core/platform.js';

const isNative = () => Capacitor.isNativePlatform();

/**
 * Vite inlines each `import.meta.env.VITE_*` member. A copy of the env
 * object (`const env = import.meta.env`) does not. Outside Vite, env is
 * missing, so the lookup is guarded and the public fallbacks still apply.
 */
function vitePublic(value, fallback = '') {
    if (value == null) return fallback;
    const text = String(value).trim();
    return text || fallback;
}

const hasViteEnv = typeof import.meta !== 'undefined' && import.meta.env;

/** Public web SDK config — same project as google-services.json / iOS plist. */
const FIREBASE_WEB_CONFIG = {
    apiKey: vitePublic(
        hasViteEnv ? import.meta.env.VITE_FIREBASE_API_KEY : undefined,
        'AIzaSyCJrjzvI2U0w79UiyRw3EjHte09m888zwg',
    ),
    authDomain: 'spaceswoosh-faa9c.firebaseapp.com',
    projectId: 'spaceswoosh-faa9c',
    storageBucket: 'spaceswoosh-faa9c.firebasestorage.app',
    messagingSenderId: '149157024817',
    appId: vitePublic(hasViteEnv ? import.meta.env.VITE_FIREBASE_APP_ID : undefined),
    measurementId: vitePublic(
        hasViteEnv ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : undefined,
        'G-T7PQRTJH1Z',
    ),
};

let webAnalytics = null;
let webLogEvent = null;
let webSetUserProperties = null;
let consentDefaulted = false;
let gtagScriptStarted = false;
const pendingEvents = [];
const pendingProps = [];

/**
 * EEA traffic with no consent signal is dropped from Realtime even when
 * /g/collect returns 204. This game has no ad use and already collects
 * gameplay analytics on iOS and Android, so analytics storage is granted
 * and the three ad signals stay denied. Must run before gtag.js executes.
 */
function ensureConsentDefault() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    if (consentDefaulted) return;
    consentDefaulted = true;
    window.gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'granted',
    });
}

/**
 * Firebase Analytics only accepts string / number (long|double) params.
 * Booleans and nested values get rejected or silently dropped on Android.
 */
function sanitizeParams(params = {}) {
    const out = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'boolean') {
            out[key] = value ? 1 : 0;
            continue;
        }
        if (typeof value === 'number') {
            if (Number.isFinite(value)) out[key] = value;
            continue;
        }
        if (typeof value === 'string') {
            out[key] = value.length > 100 ? value.slice(0, 100) : value;
            continue;
        }
        out[key] = String(value).slice(0, 100);
    }
    return out;
}

function withPlatform(params = {}) {
    return sanitizeParams({
        platform: clientPlatform(),
        ...params,
    });
}

export function analyticsPlatform() {
    return clientPlatform();
}

function flushWebQueue() {
    if (!webAnalytics || !webLogEvent) return;
    while (pendingEvents.length) {
        const { name, params } = pendingEvents.shift();
        try {
            webLogEvent(webAnalytics, name, params);
        } catch {
            /* analytics must never break a run */
        }
    }
    if (webSetUserProperties && pendingProps.length) {
        const blob = {};
        while (pendingProps.length) {
            const { key, value } = pendingProps.shift();
            blob[key] = value;
        }
        try {
            webSetUserProperties(webAnalytics, blob);
        } catch {
            /* ignore */
        }
    }
}

/**
 * Boot analytics.
 * Web: Firebase JS when a Web app id is configured, otherwise gtag.
 * Native: turn collection on. Android uploads when the app backgrounds
 * (or about hourly while it stays open). DebugView is immediate.
 */
export function initAnalytics() {
    if (typeof document === 'undefined') return;

    if (isNative()) {
        FirebaseAnalytics.setEnabled({ enabled: true }).catch((err) => {
            console.warn('[analytics] setEnabled failed', err);
        });
        return;
    }

    if (webAnalytics) return;

    ensureConsentDefault();

    const appId = String(FIREBASE_WEB_CONFIG.appId || '').trim();
    if (!appId) {
        console.warn(
            '[analytics] VITE_FIREBASE_APP_ID missing — gtag '
            + FIREBASE_WEB_CONFIG.measurementId
            + '. Register a Web app on spaceswoosh-faa9c so the Firebase SDK is used.'
        );
        initGtagFallback();
        return;
    }

    import('firebase/app').then(async ({ initializeApp, getApps }) => {
        const { getAnalytics, isSupported, logEvent, setUserProperties } = await import('firebase/analytics');
        const supported = await isSupported().catch(() => false);
        if (!supported) {
            initGtagFallback();
            return;
        }
        const app = getApps().length
            ? getApps()[0]
            : initializeApp({ ...FIREBASE_WEB_CONFIG, appId });
        webAnalytics = getAnalytics(app);
        webLogEvent = logEvent;
        webSetUserProperties = setUserProperties;
        flushWebQueue();
    }).catch((err) => {
        console.warn('[analytics] firebase web init failed', err);
        initGtagFallback();
    });
}

function initGtagFallback() {
    if (typeof document === 'undefined') return;
    const measurementId = FIREBASE_WEB_CONFIG.measurementId;
    if (!measurementId) return;
    ensureConsentDefault();
    if (!gtagScriptStarted) {
        gtagScriptStarted = true;
        window.gtag('js', new Date());
        window.gtag('config', measurementId);
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        document.head.appendChild(script);
    }
    webLogEvent = (_analytics, name, params) => window.gtag('event', name, params);
    webSetUserProperties = (_analytics, props) => {
        try { window.gtag('set', 'user_properties', props); } catch { /* ignore */ }
    };
    webAnalytics = { fallback: 'gtag' };
    flushWebQueue();
}

/**
 * Record a gameplay event.
 *
 * @param {string} name    GA-style event name, e.g. 'game_over'.
 * @param {object} [params] Flat key/value payload.
 */
export function track(name, params = {}) {
    const safe = withPlatform(params);

    if (isNative()) {
        FirebaseAnalytics.logEvent({ name, params: safe }).catch((err) => {
            console.warn('[analytics] logEvent failed', name, err);
        });
        return;
    }

    if (webAnalytics && webLogEvent) {
        try {
            webLogEvent(webAnalytics, name, safe);
        } catch {
            // Analytics must never be able to break a run.
        }
        return;
    }

    pendingEvents.push({ name, params: safe });
}

/**
 * Firebase user property (string, max 36 chars). Used for equipped ship,
 * furthest Journey day, and theme so Explorations can slice purchases by them.
 */
export function setUserProperty(key, value) {
    if (!key) return;
    const text = value == null ? null : String(value).slice(0, 36);

    if (isNative()) {
        FirebaseAnalytics.setUserProperty({ key, value: text }).catch((err) => {
            console.warn('[analytics] setUserProperty failed', key, err);
        });
        return;
    }

    if (webAnalytics && webSetUserProperties) {
        try {
            webSetUserProperties(webAnalytics, { [key]: text });
        } catch {
            /* ignore */
        }
        return;
    }

    pendingProps.push({ key, value: text });
}

export function syncProfileProperties({
    shipId,
    maxJourneyLevel,
    theme,
} = {}) {
    if (shipId) setUserProperty('equipped_ship', shipId);
    if (maxJourneyLevel != null && Number.isFinite(Number(maxJourneyLevel))) {
        setUserProperty('max_journey_level', String(Math.floor(maxJourneyLevel)));
    }
    if (theme) setUserProperty('theme', theme);
}

/**
 * GA4 recommended `purchase` event so Firebase revenue reports populate.
 * Flat params only — nested `items` arrays are dropped on native Firebase.
 */
export function trackPurchase({
    value,
    currency,
    itemId,
    itemName,
    itemCategory,
} = {}) {
    const amount = Number(value);
    track('purchase', {
        value: Number.isFinite(amount) ? amount : 0,
        currency: currency || 'USD',
        item_id: itemId || '',
        item_name: itemName || '',
        item_category: itemCategory || '',
    });
}
