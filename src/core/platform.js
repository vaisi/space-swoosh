// platform.js
// Lightweight device / canvas-budget detection for Safari vs Android/desktop.
// Changes:
// - isAndroidNative(): Capacitor Android only — production camera reseat after
//   wormhole / black-hole dips. Hazard Lab enables the same reseat on web too.
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
