// ReviewPrompt.js
// Enjoyment card eligibility + persistence for Capacitor Android.
// Changes: Created — Day 6 ask, Later snoozes to Day 13, then done. Native
// only. Yes calls the Play in-app review sheet; Not really is analytics only.

import { isNativeApp } from '../core/platform.js';
import { track } from './Analytics.js';
import { maxCompletedLevel } from './JourneyProgress.js';

export const REVIEW_STORAGE_KEY = 'ssReviewPrompt';
export const REVIEW_FIRST_DAY = 6;
export const REVIEW_SNOOZE_DAY = 13;

const STATUSES = new Set(['pending', 'later', 'yes', 'no', 'done']);

function readStatus() {
    try {
        const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
        if (STATUSES.has(raw)) return raw;
    } catch {
        /* private mode */
    }
    return 'pending';
}

function writeStatus(status) {
    try {
        localStorage.setItem(REVIEW_STORAGE_KEY, status);
    } catch {
        /* quota / private mode */
    }
}

/**
 * Which auto-prompt this clear qualifies for, or null.
 * @param {number} maxCompleted
 * @returns {'day_6' | 'day_13' | null}
 */
export function reviewTrigger(maxCompleted) {
    if (!isNativeApp()) return null;
    const status = readStatus();
    const day = Math.floor(Number(maxCompleted) || 0);
    if (status === 'pending' && day >= REVIEW_FIRST_DAY) return 'day_6';
    if (status === 'later' && day >= REVIEW_SNOOZE_DAY) return 'day_13';
    return null;
}

export function shouldOfferReview(progress) {
    return reviewTrigger(maxCompletedLevel(progress)) != null;
}

export function markReviewPromptShown(trigger) {
    track('review_prompt_shown', { trigger: trigger || 'day_6' });
}

/**
 * Persist the choice and fire the matching analytics event.
 * Later on the Day 13 card is terminal (`done`); Later on Day 6 snoozes.
 * @param {'yes' | 'no' | 'later'} choice
 * @param {'day_6' | 'day_13'} trigger
 */
export function respondToReviewPrompt(choice, trigger) {
    const beat = trigger === 'day_13' ? 'day_13' : 'day_6';
    if (choice === 'yes') {
        writeStatus('yes');
        track('review_prompt_yes', { trigger: beat });
        return;
    }
    if (choice === 'no') {
        writeStatus('no');
        track('not_really_enjoying', { trigger: beat });
        return;
    }
    writeStatus(beat === 'day_13' ? 'done' : 'later');
    track('review_prompt_later', { trigger: beat });
}

export function trackReviewFromOptions() {
    track('review_from_options');
}
