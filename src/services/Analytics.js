// Analytics.js
// One place to record a game event, whatever the platform underneath.
// Changes:
// - Web: Google Analytics via gtag (measurement ID G-SMEY63Z40C).
// - Native (Capacitor Android / Cap iOS): Firebase Analytics via
//   @capacitor-firebase/analytics once google-services.json /
//   GoogleService-Info.plist are present. Failures never break a run.
// - Shipping SpriteKit iOS (`ios-native/`) is a separate binary and is not
//   covered by this module until Firebase is added there.
// - Run-end / equip events carry ship_id so Firebase can rank most-played ships.
// - Pref events: set_theme, set_sound (master), set_sound_channel (music/sfx/voice).
// - Sanitize params for Firebase (string | number only). Booleans like
//   `completed: true` were putBoolean'd by the plugin and can cause Android to
//   drop the whole custom event — convert to 0/1. Truncate long strings.

import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

const MEASUREMENT_ID = 'G-SMEY63Z40C';

const isNative = () => Capacitor.isNativePlatform();

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

/**
 * Load Google Analytics — web only, and only once. Previously this was a pair
 * of hardcoded <script> tags in index.html, which meant the packaged app
 * fetched a remote tracker on every launch.
 */
export function initAnalytics() {
    if (isNative() || typeof document === 'undefined') return;
    if (window.gtag) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);
}

/**
 * Record a gameplay event.
 *
 * @param {string} name    GA-style event name, e.g. 'game_over'.
 * @param {object} [params] Flat key/value payload.
 */
export function track(name, params = {}) {
    const safe = sanitizeParams(params);

    if (isNative()) {
        FirebaseAnalytics.logEvent({ name, params: safe }).catch((err) => {
            console.warn('[analytics] logEvent failed', name, err);
        });
        return;
    }

    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    try {
        window.gtag('event', name, safe);
    } catch {
        // Analytics must never be able to break a run.
    }
}
