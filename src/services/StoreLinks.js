// StoreLinks.js
// Play / App Store listing URLs for Rate, the web store gate, and QR codes.
// Changes: Live Apple id 6801885446; appStoreUrl() is locale-neutral so the
// device Store opens. Used by the mobile download prompt and desktop QR rails.

export const PLAY_PACKAGE_ID = 'com.orbi.spaceswoosh';
export const PLAY_STORE_URL =
    `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE_ID}`;

/** App Store Connect numeric id. Env overrides the shipped listing id. */
export const APP_STORE_APPLE_ID_DEFAULT = '6801885446';

/** Numeric App Store Connect id, or empty until the listing record exists. */
export function appStoreAppleId() {
    return String(
        import.meta.env?.VITE_APP_STORE_APPLE_ID || APP_STORE_APPLE_ID_DEFAULT,
    ).trim();
}

/** Locale-neutral listing. Phones open the App Store; desktops open the page. */
export function appStoreUrl() {
    const id = appStoreAppleId();
    if (!id) return '';
    return `https://apps.apple.com/app/id${id}`;
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
