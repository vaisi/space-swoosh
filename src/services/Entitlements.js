// Entitlements.js
// Which ship skins the player owns. Free skins are always owned; premium skins
// unlock via RevenueCat and are cached in localStorage for offline play.
// Changes:
// - Night paper: SIGNAL_RGB follows brand `color.signalRgb` (soft orchid).
// - UNLOCK_ALL_SKINS false for store: Pulse/Quill gated via RevenueCat again.
//   Flip true only for local playtest builds.
// - Created file: ownership is separate from "selected skin" (ships/skins.js).
//   Selecting a locked skin starts a purchase; Restore Purchases refreshes the
//   cache from the store. On the web (no IAP), premium skins stay locked.

import { color } from '../brand/tokens.js';
import { SKIN_DEFS } from '../ships/skinDefs.js';
import {
    getOwnedEntitlementIds,
    getProductPriceString,
    initPurchases,
    purchaseProduct,
    purchasesAvailable,
    restorePurchases as restoreFromStore,
} from './Purchases.js';

const CACHE_KEY = 'ownedSkinIds';
/** Live accent RGB — prefer `color.signalRgb` at call sites; kept for export. */
export function getSignalRgb() {
    return color.signalRgb;
}
const SIGNAL_RGB = color.signalRgb;

/** Playtest unlock — keep false for store builds (RevenueCat premium gating). */
export const UNLOCK_ALL_SKINS = false;

/** @type {Set<string>} */
let owned = new Set(loadCache());
/** @type {Map<string, string>} productId -> priceString */
const priceCache = new Map();

function freeSkinIds() {
    if (UNLOCK_ALL_SKINS) return SKIN_DEFS.map((s) => s.id);
    return SKIN_DEFS.filter((s) => !s.productId).map((s) => s.id);
}

function loadCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return freeSkinIds();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return freeSkinIds();
        return [...new Set([...freeSkinIds(), ...parsed])];
    } catch {
        return freeSkinIds();
    }
}

function persist() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify([...owned]));
    } catch {
        /* private mode */
    }
}

function skinById(id) {
    return SKIN_DEFS.find((s) => s.id === id) || null;
}

function applyEntitlementIds(entitlementIds) {
    const next = new Set(freeSkinIds());
    for (const skin of SKIN_DEFS) {
        if (skin.entitlementId && entitlementIds.includes(skin.entitlementId)) {
            next.add(skin.id);
        }
    }
    owned = next;
    persist();
}

export function isSkinOwned(id) {
    const skin = skinById(id);
    if (!skin) return false;
    if (UNLOCK_ALL_SKINS || !skin.productId) return true;
    return owned.has(id);
}

export function isSkinPremium(id) {
    return Boolean(skinById(id)?.productId);
}

export function getOwnedSkinIds() {
    return [...owned];
}

export function getSkinPriceLabel(id) {
    const skin = skinById(id);
    if (!skin?.productId) return null;
    return priceCache.get(skin.productId) || null;
}

/** Boot: configure RevenueCat and hydrate ownership from the store. */
export async function initEntitlements() {
    owned = new Set(loadCache());
    await initPurchases();
    await refreshEntitlements();
    await prefetchPrices();
}

export async function refreshEntitlements() {
    if (!purchasesAvailable()) return getOwnedSkinIds();
    const ids = await getOwnedEntitlementIds();
    // null = store call failed — keep the local cache. An empty array is a
    // real answer (no entitlements / refunded) and must clear premium unlocks.
    if (ids) applyEntitlementIds(ids);
    return getOwnedSkinIds();
}

async function prefetchPrices() {
    if (!purchasesAvailable()) return;
    await Promise.all(
        SKIN_DEFS.filter((s) => s.productId).map(async (skin) => {
            const price = await getProductPriceString(skin.productId);
            if (price) priceCache.set(skin.productId, price);
        })
    );
}

/**
 * Buy a premium skin. No-op success if already owned.
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, message?: string }>}
 */
export async function purchaseSkin(id) {
    const skin = skinById(id);
    if (!skin) return { ok: false, message: 'Unknown ship.' };
    if (!skin.productId) {
        owned.add(id);
        persist();
        return { ok: true };
    }
    if (owned.has(id)) return { ok: true };

    const result = await purchaseProduct(skin.productId);
    if (result.ok) {
        if (result.entitlementIds) applyEntitlementIds(result.entitlementIds);
        else {
            owned.add(id);
            persist();
        }
    }
    return result;
}

/**
 * @returns {Promise<{ ok: boolean, message?: string, count?: number }>}
 */
export async function restorePurchases() {
    const result = await restoreFromStore();
    if (!result.ok) return result;

    applyEntitlementIds(result.entitlementIds || []);
    const premiumOwned = SKIN_DEFS.filter(
        (s) => s.productId && owned.has(s.id)
    ).length;

    return {
        ok: true,
        count: premiumOwned,
        message:
            premiumOwned > 0
                ? `Restored ${premiumOwned} ship${premiumOwned === 1 ? '' : 's'}.`
                : 'No previous purchases found.',
    };
}

export { SIGNAL_RGB };
