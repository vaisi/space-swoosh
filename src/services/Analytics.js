// Analytics.js
// One place to record a game event, whatever the platform underneath.
// Changes:
// - Created file: Game.js called the global `gtag` directly, which only exists
//   because index.html loads a remote Google Analytics script. That is a poor
//   fit for a packaged app — it is a network dependency at boot, it is unreliable
//   inside a WebView, and any remote-loaded tracker has to be declared in
//   Apple's privacy nutrition labels and Play's Data Safety form.
//
// So: web keeps gtag, native records nothing until a native SDK is wired in.
// Callers no longer care, and `gtag` is never referenced as a bare global (it
// threw a ReferenceError whenever the script was blocked).

import { Capacitor } from '@capacitor/core';

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
        // Intentionally a no-op for now. Wiring Firebase Analytics here
        // (@capacitor-firebase/analytics) needs a Firebase project plus the
        // google-services.json / GoogleService-Info.plist config files, and
        // both stores then need the SDK declared. Until those exist, shipping
        // no telemetry is the correct and compliant default.
        return;
    }

    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    try {
        window.gtag('event', name, params);
    } catch {
        // Analytics must never be able to break a run.
    }
}
