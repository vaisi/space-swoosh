// platform.js
// Lightweight device / canvas-budget detection for Safari vs Android/desktop.
// Changes:
// - Phone and tablet browsers play the canvas. html[data-web-gate=play]
//   reserves a bottom "Get the app" bar (App Store or Play, from
//   preferredStoreTarget()). Desktop web stays data-web-gate=desktop with
//   QR rails. Native clears the gate. The full-screen store wall is gone.
// - clientPlatform(): 'ios' | 'android' | 'web' for analytics + Supabase rows.
// - isDesktopWeb() / isNativeApp() / markDocumentShell(): Open World teach copy
//   and the desktop store rails branch on desktop web vs native/touch.
// - isAndroidNative(): Capacitor Android only (not Chrome). Camera reseat now
//   runs on every JS platform; this flag is kept for other native-only gates.
// - iOS DPR cap raised 1.5 → 2.0: 1.5 sits below the retina threshold (visibly
//   soft); 2.0 reads sharp while still ~56% fewer pixels than native DPR 3.
//   Safe on heat because cheap Canvas + draw LOD + opaque context + hitch clamp
//   stay on, and the paint throttle is already gone. Matches Android-native ≤2.
// - Budget is fill-rate only (DPR/opaque); pacing is plain rAF everywhere —
//   Game.js no longer paint-throttles iOS.
// - Phase 1: iOS shared one Canvas2D budget (was DPR 1.5). Android Cap native
//   stays ≤2; desktop ≤3.
// - Created: iOS (Safari + Capicitor WKWebView) shares one Canvas2D budget —
//   retina fill-rate is the lag/heat source on spaceswoosh.app Safari.

import { Capacitor } from '@capacitor/core';

/**
 * True for iPhone / iPod / iPad, including iPadOS that reports as MacIntel.
 */
export function isIosDevice() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/i.test(ua)) return true;
    // iPadOS 13+ Safari: desktop UA, but multi-touch.
    if (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1) {
        return true;
    }
    return false;
}

/** True for Android browsers and WebViews. Desktop Chrome is not Android. */
export function isAndroidDevice() {
    if (typeof navigator === 'undefined') return false;
    return /Android/i.test(navigator.userAgent || '');
}

/**
 * Store the phone download bar should emphasize.
 * @returns {'ios' | 'android' | 'both'}
 */
export function preferredStoreTarget() {
    if (isIosDevice()) return 'ios';
    if (isAndroidDevice()) return 'android';
    return 'both';
}

/**
 * Canvas2D on Apple WebKit (Safari tab or Capicitor WKWebView) cannot sustain
 * full-retina (DPR 3) path fills the way Chromium / desktop do. Budget pixels
 * and VFX on those devices; do not throttle the rAF scheduler.
 */
export function needsIosCanvasBudget() {
    return isIosDevice();
}

/**
 * Cap the backing-store DPR.
 * iOS web + native: 2.0 (retina-sharp, ~56% fewer pixels than native 3, cheap
 * Canvas/LOD still on). Other Cap native: 2. Desktop/Android web: 3.
 */
export function canvasMaxDpr() {
    if (isIosDevice()) return 2;
    if (Capacitor.isNativePlatform()) return 2;
    return 3;
}

/** Prefer an opaque 2D buffer when we always paint paper first. */
export function preferOpaqueCanvas() {
    return Capacitor.isNativePlatform() || isIosDevice();
}

/** True only on the Capacitor Android app — not Android Chrome / desktop. */
export function isAndroidNative() {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/** Packaged iOS / Android shell — not a browser tab. */
export function isNativeApp() {
    return Capacitor.isNativePlatform();
}

/**
 * Store / analytics platform label. Capacitor native is ios|android;
 * every browser tab (including phone Safari/Chrome) is web.
 * @returns {'ios' | 'android' | 'web'}
 */
export function clientPlatform() {
    if (!Capacitor.isNativePlatform()) return 'web';
    const platform = Capacitor.getPlatform();
    if (platform === 'ios' || platform === 'android') return platform;
    return 'web';
}

/**
 * Desktop browser with a mouse/trackpad. Phone browsers and native apps are
 * tap/swipe even if the viewport is wide.
 */
export function isDesktopWeb() {
    if (isNativeApp()) return false;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * `html[data-shell=web|native]` so CSS can hide store chrome in the app.
 * `data-web-gate=play` is a phone/tablet browser (game + download bar).
 * `data-web-gate=desktop` is a mouse/trackpad browser (game + QR rails).
 */
export function markDocumentShell() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.shell = isNativeApp() ? 'native' : 'web';
    if (isNativeApp()) {
        delete root.dataset.webGate;
        delete root.dataset.storeTarget;
        syncWebStoreDom(root);
        return;
    }
    root.dataset.storeTarget = preferredStoreTarget();
    root.dataset.webGate = isDesktopWeb() ? 'desktop' : 'play';
    syncWebStoreDom(root);
}

/** Keep the phone download bar out of the accessibility tree when it is hidden. */
function syncWebStoreDom(root) {
    const bar = document.querySelector('.phone-store-bar');
    if (!bar) return;
    const shown = root.dataset.webGate === 'play';
    bar.inert = !shown;
    bar.setAttribute('aria-hidden', shown ? 'false' : 'true');
}
