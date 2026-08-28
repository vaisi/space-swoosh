// Purchases.js
// Thin wrapper around RevenueCat (@revenuecat/purchases-capacitor).
// Changes:
// - Successful buys also log GA4 `purchase` (value + currency) for Firebase
//   revenue. Restores do not. Skins keep the separate `purchase_skin` funnel.
// - Pro weekly/yearly product ids + customer Pro snapshot (active + product).
// - Created file: native-only IAP. On web, or when API keys are missing, every
//   call no-ops / returns empty so the ship picker still works offline and in
//   the browser. Product IDs and entitlement ids are the contract with the
//   RevenueCat dashboard — see docs/IAP.md.

import { Capacitor } from '@capacitor/core';
import { trackPurchase } from './Analytics.js';

const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';
const ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';

/** Auto-renewable — unlimited lives. */
export const PRO_WEEKLY_PRODUCT_ID = 'com.orbi.spaceswoosh.pro.weekly';
/** Auto-renewable — unlimited lives + one-time pick any 3 ships. */
export const PRO_YEARLY_PRODUCT_ID = 'com.orbi.spaceswoosh.pro.yearly';
/** RevenueCat entitlement attached to both Pro products. */
export const PRO_ENTITLEMENT_ID = 'pro';

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
 * Active entitlement ids from RevenueCat (e.g. "skin_pulse", "pro").
 * @returns {Promise<string[] | null>} `null` on failure so callers keep their
 *   local cache instead of wiping ownership on a flaky network.
 */
export async function getOwnedEntitlementIds() {
    const info = await getCustomerProInfo();
    return info ? info.entitlementIds : null;
}

/**
 * Snapshot of Pro subscription state from RevenueCat.
 * @returns {Promise<{
 *   entitlementIds: string[],
 *   proActive: boolean,
 *   yearlyActive: boolean,
 *   productId: string | null,
 * } | null>} `null` on failure (keep local cache).
 */
export async function getCustomerProInfo() {
    if (!configured || !Purchases) return null;

    try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        return proInfoFromCustomer(customerInfo);
    } catch (error) {
        console.error('[purchases] getCustomerInfo failed:', error);
        return null;
    }
}

function proInfoFromCustomer(customerInfo) {
    const active = customerInfo?.entitlements?.active || {};
    const entitlementIds = Object.keys(active);
    const proEnt = active[PRO_ENTITLEMENT_ID] || null;
    const productId = proEnt?.productIdentifier || null;
    const yearlyActive = productId === PRO_YEARLY_PRODUCT_ID;
    return {
        entitlementIds,
        proActive: Boolean(proEnt),
        yearlyActive,
        productId,
    };
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
            message: 'This product is not available in the store yet.',
        };
    }

    try {
        const { customerInfo } = await Purchases.purchasePackage({ aPackage });
        const info = proInfoFromCustomer(customerInfo);
        logPurchaseRevenue(productId, aPackage);
        return {
            ok: true,
            entitlementIds: info.entitlementIds,
            proActive: info.proActive,
            yearlyActive: info.yearlyActive,
            productId: info.productId,
        };
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
        const info = proInfoFromCustomer(customerInfo);
        return {
            ok: true,
            entitlementIds: info.entitlementIds,
            proActive: info.proActive,
            yearlyActive: info.yearlyActive,
            productId: info.productId,
        };
    } catch (error) {
        console.error('[purchases] restore failed:', error);
        return {
            ok: false,
            message: error?.message || 'Restore failed.',
        };
    }
}

export async function purchaseProWeekly() {
    return purchaseProduct(PRO_WEEKLY_PRODUCT_ID);
}

export async function purchaseProYearly() {
    return purchaseProduct(PRO_YEARLY_PRODUCT_ID);
}

/**
 * Best-effort localized price string for a product, or null.
 */
export async function getProductPriceString(productId) {
    const aPackage = await findPackageByProductId(productId);
    return aPackage?.product?.priceString || null;
}

function catalogFromProductId(productId) {
    if (productId === PRO_WEEKLY_PRODUCT_ID) {
        return { itemName: 'pro_weekly', itemCategory: 'pro' };
    }
    if (productId === PRO_YEARLY_PRODUCT_ID) {
        return { itemName: 'pro_yearly', itemCategory: 'pro' };
    }
    const match = /^com\.orbi\.spaceswoosh\.skin\.(.+)$/.exec(productId || '');
    if (match) return { itemName: match[1], itemCategory: 'skin' };
    return { itemName: productId || 'unknown', itemCategory: 'other' };
}

function logPurchaseRevenue(productId, aPackage) {
    const product = aPackage?.product || {};
    const { itemName, itemCategory } = catalogFromProductId(productId);
    const amount = Number(product.price);
    trackPurchase({
        value: Number.isFinite(amount) ? amount : 0,
        currency: product.currencyCode || 'USD',
        itemId: product.identifier || productId,
        itemName,
        itemCategory,
    });
}
