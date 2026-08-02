// Purchases.js
// Thin wrapper around RevenueCat (@revenuecat/purchases-capacitor).
// Changes:
// - Created file: native-only IAP. On web, or when API keys are missing, every
//   call no-ops / returns empty so the ship picker still works offline and in
//   the browser. Product IDs and entitlement ids are the contract with the
//   RevenueCat dashboard — see docs/IAP.md.

import { Capacitor } from '@capacitor/core';

const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';
const ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';

let configured = false;
let Purchases = null;

function isNative() {
    return Capacitor.isNativePlatform();
}

function apiKeyForPlatform() {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return IOS_KEY;
    if (platform === 'android') return ANDROID_KEY;
    return '';
}

export function isPurchasesConfigured() {
    return configured;
}

export function purchasesAvailable() {
    return isNative() && Boolean(apiKeyForPlatform());
}

/** Configure once at boot. Safe to call on the web (no-ops). */
export async function initPurchases() {
    if (!purchasesAvailable()) {
        if (isNative()) {
            console.warn(
                '[purchases] VITE_REVENUECAT_* key missing for this platform — IAP disabled.'
            );
        }
        return false;
    }

    try {
        ({ Purchases } = await import('@revenuecat/purchases-capacitor'));
        await Purchases.configure({ apiKey: apiKeyForPlatform() });
        configured = true;
        return true;
    } catch (error) {
        console.error('[purchases] configure failed:', error);
        configured = false;
        return false;
    }
}

/**
 * Active entitlement ids from RevenueCat (e.g. "skin_pulse").
 * @returns {Promise<string[] | null>} `null` on failure so callers keep their
 *   local cache instead of wiping ownership on a flaky network.
 */
export async function getOwnedEntitlementIds() {
    if (!configured || !Purchases) return null;

    try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        const active = customerInfo?.entitlements?.active || {};
        return Object.keys(active);
    } catch (error) {
        console.error('[purchases] getCustomerInfo failed:', error);
        return null;
    }
}

/**
 * Look up a store package whose product identifier matches `productId`.
 * Walks the current offering first, then every offering.
 */
export async function findPackageByProductId(productId) {
    if (!configured || !Purchases || !productId) return null;

    try {
        const offerings = await Purchases.getOfferings();
        const pools = [];
        if (offerings.current?.availablePackages) {
            pools.push(offerings.current.availablePackages);
        }
        for (const offering of Object.values(offerings.all || {})) {
            if (offering?.availablePackages) pools.push(offering.availablePackages);
        }

        for (const packages of pools) {
            const match = packages.find(
                (pkg) => pkg?.product?.identifier === productId
            );
            if (match) return match;
        }
        return null;
    } catch (error) {
        console.error('[purchases] getOfferings failed:', error);
        return null;
    }
}

/**
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, message?: string, entitlementIds?: string[] }>}
 */
export async function purchaseProduct(productId) {
    if (!purchasesAvailable()) {
        return {
            ok: false,
            message: 'Purchases are available in the iOS and Android apps.',
        };
    }
    if (!configured || !Purchases) {
        return { ok: false, message: 'Store is not configured yet.' };
    }

    const aPackage = await findPackageByProductId(productId);
    if (!aPackage) {
        return {
            ok: false,
            message: 'This ship is not available in the store yet.',
        };
    }

    try {
        const { customerInfo } = await Purchases.purchasePackage({ aPackage });
        const active = customerInfo?.entitlements?.active || {};
        return { ok: true, entitlementIds: Object.keys(active) };
    } catch (error) {
        // User-cancelled purchases are not errors worth alarming over.
        const code = error?.code || error?.errorCode;
        const cancelled =
            code === '1' ||
            code === 1 ||
            /cancel/i.test(error?.message || '');
        if (cancelled) return { ok: false, cancelled: true };
        console.error('[purchases] purchase failed:', error);
        return {
            ok: false,
            message: error?.message || 'Purchase failed.',
        };
    }
}

/**
 * @returns {Promise<{ ok: boolean, entitlementIds?: string[], message?: string }>}
 */
export async function restorePurchases() {
    if (!purchasesAvailable()) {
        return {
            ok: false,
            message: 'Restore is available in the iOS and Android apps.',
        };
    }
    if (!configured || !Purchases) {
        return { ok: false, message: 'Store is not configured yet.' };
    }

    try {
        const { customerInfo } = await Purchases.restorePurchases();
        const active = customerInfo?.entitlements?.active || {};
        return { ok: true, entitlementIds: Object.keys(active) };
    } catch (error) {
        console.error('[purchases] restore failed:', error);
        return {
            ok: false,
            message: error?.message || 'Restore failed.',
        };
    }
}

/**
 * Best-effort localized price string for a product, or null.
 */
export async function getProductPriceString(productId) {
    const aPackage = await findPackageByProductId(productId);
    return aPackage?.product?.priceString || null;
}
