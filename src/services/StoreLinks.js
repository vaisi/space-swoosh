// StoreLinks.js
// Play / App Store listing URLs for the Rate button fallback.
// Changes: Created — package id is the Play URL; Apple numeric id comes from
// VITE_APP_STORE_APPLE_ID (App Store Connect record, not Firebase).

export const PLAY_PACKAGE_ID = 'com.orbi.spaceswoosh';
export const PLAY_STORE_URL =
    `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE_ID}`;

/** Numeric App Store Connect id, or empty until the listing record exists. */
export function appStoreAppleId() {
    return String(import.meta.env.VITE_APP_STORE_APPLE_ID || '').trim();
}

/** Write-review deep link, or empty when the Apple id is not configured. */
export function appStoreReviewUrl() {
    const id = appStoreAppleId();
    if (!id) return '';
    return `https://apps.apple.com/app/id${id}?action=write-review`;
}

/** Capacitor Android ships to Play; unused on native iOS (Swift has its own). */
export function storeReviewUrl() {
    return PLAY_STORE_URL;
}
