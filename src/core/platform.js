// platform.js
// Lightweight device / canvas-budget detection for Safari vs Android/desktop.
// Changes:
// - Created: iOS (Safari + Capicitor WKWebView) shares one Canvas2D budget —
//   ProMotion + retina fill-rate is the lag source on spaceswoosh.app Safari.
//   Android browser/app and desktop stay on the uncapped snappy path.

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
 * 120 Hz × 3× DPR fills the way Chromium / desktop do. Budget those devices.
 */
export function needsIosCanvasBudget() {
    return isIosDevice();
}

/**
 * Cap the backing-store DPR. Native and all iOS use 2×; other web (Android
 * browser, desktop) may use up to 3× for sharper menus.
 */
export function canvasMaxDpr() {
    if (Capacitor.isNativePlatform() || isIosDevice()) return 2;
    return 3;
}

/** Prefer an opaque 2D buffer when we always paint paper first. */
export function preferOpaqueCanvas() {
    return Capacitor.isNativePlatform() || isIosDevice();
}
