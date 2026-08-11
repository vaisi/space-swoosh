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

import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

const MEASUREMENT_ID = 'G-SMEY63Z40C';

const isNative = () => Capacitor.isNativePlatform();

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
    if (isNative()) {
        FirebaseAnalytics.logEvent({ name, params }).catch(() => {
            // Analytics must never be able to break a run.
        });
        return;
    }

    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    try {
        window.gtag('event', name, params);
    } catch {
        // Analytics must never be able to break a run.
    }
}
