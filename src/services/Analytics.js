// Analytics.js
// One place to record a game event, whatever the platform underneath.
// Changes:
// - Web: Firebase Analytics JS (same project as iOS/Android, spaceswoosh-faa9c)
//   instead of standalone gtag. Falls back to gtag if VITE_FIREBASE_APP_ID is
//   missing. Native still uses @capacitor-firebase/analytics.
// - Every event auto-attaches `platform` (ios|android|web).
// - GA4 `purchase` helper (value + currency) for RevenueCat revenue in Firebase.
// - User properties: equipped_ship, max_journey_level, theme.
// - Sanitize params for Firebase (string | number only). Booleans like
//   `completed: true` were putBoolean'd by the plugin and can cause Android to
//   drop the whole custom event — convert to 0/1. Truncate long strings.

import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { clientPlatform } from '../core/platform.js';

const isNative = () => Capacitor.isNativePlatform();

/** Public web SDK config — same project as google-services.json / iOS plist. */
const FIREBASE_WEB_CONFIG = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCJrjzvI2U0w79UiyRw3EjHte09m888zwg',
    authDomain: 'spaceswoosh-faa9c.firebaseapp.com',
    projectId: 'spaceswoosh-faa9c',
    storageBucket: 'spaceswoosh-faa9c.firebasestorage.app',
    messagingSenderId: '149157024817',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-SMEY63Z40C',
};

let webAnalytics = null;
let webLogEvent = null;
let webSetUserProperties = null;
const pendingEvents = [];
const pendingProps = [];

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
 * Boot Firebase Analytics on web. Native iOS/Android already have the SDK
 * from google-services.json / GoogleService-Info.plist.
 */
export function initAnalytics() {
    if (isNative() || typeof document === 'undefined') return;
    if (webAnalytics) return;

    const appId = String(FIREBASE_WEB_CONFIG.appId || '').trim();
    if (!appId) {
        console.warn(
            '[analytics] VITE_FIREBASE_APP_ID missing — using gtag fallback until a '
            + 'Firebase Web app is registered on spaceswoosh-faa9c.'
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
    if (!window.gtag) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() { window.dataLayer.push(arguments); };
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
