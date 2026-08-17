// Entitlements.js
// Ship ownership + Pro subscription state. Free skins (no productId) are always
// owned; premium skins unlock via RevenueCat, annual Pro picks, or IAP.
// Changes:
// - UNLOCK_ALL_SKINS true for playtest hangar (must flip false before store).
// - Pro weekly/yearly: `pro` entitlement, offline cache, yearly ship-pick claim.
// - Annual picks (any 3 premium skins) merge into isSkinOwned and stay after lapse.
// - Free roster is productId-driven (Focus/Flicker/Ember/Saber); others premium.
// - Night paper: SIGNAL_RGB follows brand `color.signalRgb` (soft orchid).
// - UNLOCK_PRO false for store. UNLOCK_ALL_SKINS is playtest-true until store.
// - Created file: ownership is separate from "selected skin" (ships/skins.js).

import { color } from '../brand/tokens.js';
import { SKIN_DEFS } from '../ships/skinDefs.js';
import {
    getCustomerProInfo,
    getProductPriceString,
    initPurchases,
    PRO_ENTITLEMENT_ID,
    PRO_WEEKLY_PRODUCT_ID,
    PRO_YEARLY_PRODUCT_ID,
    purchaseProduct,
    purchaseProWeekly as buyProWeekly,
    purchaseProYearly as buyProYearly,
    purchasesAvailable,
    restorePurchases as restoreFromStore,
} from './Purchases.js';

const CACHE_KEY = 'ownedSkinIds';
const PRO_CACHE_KEY = 'proState';
const ANNUAL_PICKS_KEY = 'annualShipPicks';
const ANNUAL_CLAIMED_KEY = 'annualShipPicksClaimed';

/** Live accent RGB — prefer `color.signalRgb` at call sites; kept for export. */
export function getSignalRgb() {
    return color.signalRgb;
}
const SIGNAL_RGB = color.signalRgb;

/** Playtest unlock — true so the hangar can fly every ship. Flip false for store. */
export const UNLOCK_ALL_SKINS = true;
/** Playtest Pro — keep false for store builds. */
export const UNLOCK_PRO = false;

export const ANNUAL_SHIP_PICK_COUNT = 3;

/** @type {Set<string>} */
let owned = new Set(loadSkinCache());
/** @type {Set<string>} */
let annualPicks = new Set(loadAnnualPicks());
let annualPicksClaimed = loadAnnualClaimed();
/** @type {{ active: boolean, yearlyActive: boolean }} */
let proState = loadProCache();
/** @type {Map<string, string>} productId -> priceString */
const priceCache = new Map();

function freeSkinIds() {
    if (UNLOCK_ALL_SKINS) return SKIN_DEFS.map((s) => s.id);
    return SKIN_DEFS.filter((s) => !s.productId).map((s) => s.id);
}

function loadSkinCache() {
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

function loadProCache() {
    try {
        const raw = localStorage.getItem(PRO_CACHE_KEY);
        if (!raw) return { active: false, yearlyActive: false };
        const parsed = JSON.parse(raw);
        return {
            active: Boolean(parsed?.active),
            yearlyActive: Boolean(parsed?.yearlyActive),
        };
    } catch {
        return { active: false, yearlyActive: false };
    }
}

function loadAnnualPicks() {
    try {
        const raw = localStorage.getItem(ANNUAL_PICKS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((id) => typeof id === 'string');
    } catch {
        return [];
    }
}

function loadAnnualClaimed() {
    try {
        return localStorage.getItem(ANNUAL_CLAIMED_KEY) === '1';
    } catch {
        return false;
    }
}

function persistSkins() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify([...owned]));
    } catch {
        /* private mode */
    }
}

function persistPro() {
    try {
        localStorage.setItem(PRO_CACHE_KEY, JSON.stringify(proState));
    } catch {
        /* private mode */
    }
}

function persistAnnualPicks() {
    try {
        localStorage.setItem(ANNUAL_PICKS_KEY, JSON.stringify([...annualPicks]));
        localStorage.setItem(ANNUAL_CLAIMED_KEY, annualPicksClaimed ? '1' : '0');
    } catch {
        /* private mode */
    }
}

function skinById(id) {
    return SKIN_DEFS.find((s) => s.id === id) || null;
}

function mergeOwnedWithPicks(base) {
    const next = new Set(base);
    for (const id of annualPicks) next.add(id);
    return next;
}

function applyEntitlementIds(entitlementIds) {
    const next = new Set(freeSkinIds());
    for (const skin of SKIN_DEFS) {
        if (skin.entitlementId && entitlementIds.includes(skin.entitlementId)) {
            next.add(skin.id);
        }
    }
    owned = mergeOwnedWithPicks(next);
    persistSkins();
}

function applyProFromInfo(info) {
    if (!info) return;
    const active = Boolean(info.proActive)
        || (info.entitlementIds || []).includes(PRO_ENTITLEMENT_ID);
    proState = {
        active,
        yearlyActive: Boolean(info.yearlyActive),
    };
    persistPro();
}

export function isProActive() {
    return UNLOCK_PRO || proState.active;
}

export function isYearlyProActive() {
    return UNLOCK_PRO || proState.yearlyActive;
}

export function needsAnnualShipPick() {
    if (annualPicksClaimed) return false;
    if (annualPicks.size >= ANNUAL_SHIP_PICK_COUNT) return false;
    return isYearlyProActive();
}

export function getAnnualShipPicks() {
    return [...annualPicks];
}

export function areAnnualShipPicksClaimed() {
    return annualPicksClaimed || annualPicks.size >= ANNUAL_SHIP_PICK_COUNT;
}

/** Skip the picker when there is nothing left to unlock (already own all). */
export function markAnnualShipPicksComplete() {
    annualPicksClaimed = true;
    persistAnnualPicks();
}

/**
 * Permanently unlock premium skins from the yearly Pro claim (up to 3, or
 * fewer when fewer premium ships remain locked).
 * @param {string[]} skinIds
 * @returns {{ ok: boolean, message?: string }}
 */
export function claimAnnualShipPicks(skinIds) {
    if (!Array.isArray(skinIds) || skinIds.length === 0) {
        return { ok: false, message: 'Pick at least one ship.' };
    }
    if (skinIds.length > ANNUAL_SHIP_PICK_COUNT) {
        return { ok: false, message: `Pick at most ${ANNUAL_SHIP_PICK_COUNT} ships.` };
    }
    const unique = [...new Set(skinIds)];
    if (unique.length !== skinIds.length) {
        return { ok: false, message: 'Pick different ships.' };
    }
    for (const id of unique) {
        const skin = skinById(id);
        if (!skin?.productId) {
            return { ok: false, message: 'Pick premium ships only.' };
        }
    }
    annualPicks = new Set(unique);
    annualPicksClaimed = true;
    owned = mergeOwnedWithPicks(owned);
    persistAnnualPicks();
    persistSkins();
    return { ok: true };
}

export function isSkinOwned(id) {
    const skin = skinById(id);
    if (!skin) return false;
    if (UNLOCK_ALL_SKINS || !skin.productId) return true;
    if (annualPicks.has(id)) return true;
    return owned.has(id);
}

export function isSkinPremium(id) {
    return Boolean(skinById(id)?.productId);
}

export function getOwnedSkinIds() {
    return [...new Set([...owned, ...annualPicks])];
}

export function getSkinPriceLabel(id) {
    const skin = skinById(id);
    if (!skin?.productId) return null;
    return priceCache.get(skin.productId) || null;
}

export function getProPriceLabel(period) {
    const productId = period === 'yearly'
        ? PRO_YEARLY_PRODUCT_ID
        : PRO_WEEKLY_PRODUCT_ID;
    return priceCache.get(productId) || null;
}

/** Boot: configure RevenueCat and hydrate ownership + Pro from the store. */
export async function initEntitlements() {
    owned = new Set(loadSkinCache());
    annualPicks = new Set(loadAnnualPicks());
    annualPicksClaimed = loadAnnualClaimed();
    proState = loadProCache();
    owned = mergeOwnedWithPicks(owned);
    await initPurchases();
    await refreshEntitlements();
    await prefetchPrices();
}

export async function refreshEntitlements() {
    if (!purchasesAvailable()) return getOwnedSkinIds();
    const info = await getCustomerProInfo();
    if (!info) return getOwnedSkinIds();
    applyEntitlementIds(info.entitlementIds);
    applyProFromInfo(info);
    return getOwnedSkinIds();
}

async function prefetchPrices() {
    if (!purchasesAvailable()) return;
    const ids = [
        ...SKIN_DEFS.filter((s) => s.productId).map((s) => s.productId),
        PRO_WEEKLY_PRODUCT_ID,
        PRO_YEARLY_PRODUCT_ID,
    ];
    await Promise.all(
        ids.map(async (productId) => {
            const price = await getProductPriceString(productId);
            if (price) priceCache.set(productId, price);
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
        persistSkins();
        return { ok: true };
    }
    if (isSkinOwned(id)) return { ok: true };

    const result = await purchaseProduct(skin.productId);
    if (result.ok) {
        if (result.entitlementIds) applyEntitlementIds(result.entitlementIds);
        else {
            owned.add(id);
            persistSkins();
        }
        if (result.proActive != null) applyProFromInfo(result);
    }
    return result;
}

/**
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, message?: string, yearlyActive?: boolean }>}
 */
export async function purchaseProWeekly() {
    const result = await buyProWeekly();
    if (result.ok) {
        if (result.entitlementIds) applyEntitlementIds(result.entitlementIds);
        applyProFromInfo(result);
    }
    return result;
}

/**
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, message?: string, yearlyActive?: boolean }>}
 */
export async function purchaseProYearly() {
    const result = await buyProYearly();
    if (result.ok) {
        if (result.entitlementIds) applyEntitlementIds(result.entitlementIds);
        applyProFromInfo({
            ...result,
            yearlyActive: true,
            proActive: true,
        });
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
    applyProFromInfo(result);
    const premiumOwned = SKIN_DEFS.filter(
        (s) => s.productId && isSkinOwned(s.id)
    ).length;

    const proNote = isProActive() ? ' Pro restored.' : '';
    return {
        ok: true,
        count: premiumOwned,
        message:
            premiumOwned > 0
                ? `Restored ${premiumOwned} ship${premiumOwned === 1 ? '' : 's'}.${proNote}`
                : (isProActive()
                    ? 'Pro restored.'
                    : 'No previous purchases found.'),
    };
}

export { SIGNAL_RGB, PRO_WEEKLY_PRODUCT_ID, PRO_YEARLY_PRODUCT_ID, PRO_ENTITLEMENT_ID };
