// JourneyNarrative.js
// Changes: skip captions are two beats (one phrase each); skipLine is the joined string.
// L42 arrival (level-42.mp3) waits 3s on black before epilogue-open.
// First L42 ending adds an Arc unlock card after Follow @spaceswoosh.app.
// Instagram CTA: https://www.instagram.com/spaceswoosh.app
// THE REPLY — Signal Story copy for Journey: pre-Level-1 lore, first-BOOP cue,
// per-level NAV voice lines (1–42), and the player-written ending epilogue.
// Runtime imports this directly.
//
// ============================================================================
// CHANGELOG — 40 -> 42 levels (read AUDIO_MIGRATION.md before touching clips)
// ----------------------------------------------------------------------------
// - Journey expanded from 40 to 42 flown levels.
// - INSERTED 4 new "fond" story beats in chapters 2-3 (build affection for the
//   senders before the tragedy). New level numbers: 11, 19, 21, 22.
// - REMOVED old L39 ("...let's answer them anyway") and old L40 ("...let them
//   hear us"). The ending is now a PLAYER-WRITTEN EPILOGUE that begins after
//   the final flown level (new L42) fades to black. See ENDING_EPILOGUE below.
// - Retired ENDING_BEATS (WE HEARD YOU / NAV apology / lights captions).
// - Because of the inserts, every recorded clip from old L11 onward shifts.
//   The old->new audio map is in AUDIO_MIGRATION.md. DO NOT renumber clips
//   without it. Old L36 ("We weren't the first to search") is retired — do
//   not copy it onto new L40 (sun line); record L40 new.
// - L4 text is the "fuel" line (blue = fuel). L23 concept moved to new L27.
// - 42 is intentional (hidden nod; never surfaced in UI).
// ============================================================================

/** @typedef {{ text: string, gapAfterMs?: number }} IntroBeat */

/** Default gap between string beats when no gapAfterMs is set. */
export const DEFAULT_BEAT_GAP_MS = 400;

/** Instagram handle on the epilogue footer card (doc spelling). */
export const EPILOGUE_INSTAGRAM_HANDLE = 'spaceswoosh.app';
export const EPILOGUE_INSTAGRAM_URL = 'https://www.instagram.com/spaceswoosh.app';

/** On-screen beats for the first Journey wall BOOP of an app session. */
export const FIRST_BOOP_BEATS = [
    { text: 'The walls forgive.', gapAfterMs: 400 },
    { text: 'Little else out here does.', gapAfterMs: 400 },
];

/** Full-screen lore shown once before the Journey map. */
export const PRE_LEVEL_1_LORE =
    'A message came to us out of the dark, torn apart by the distance. ' +
    'Its pieces are still scattered along the way it travelled. ' +
    'NAV will guide you back to find who sent it.';

/** Logbook title for the lore entry unlocked on Continue. */
export const PRE_LEVEL_1_LORE_TITLE = 'The Call';

/**
 * NAV voice line at the start of each Journey level (1-indexed, 1..42).
 * Clean display / logbook copy (SSML and stage directions stripped).
 * @type {Record<number, string>}
 */
export const LEVEL_MESSAGES = {
    1: 'There you are. Tap once. Let me see you turn.',
    2: 'Rocks ahead. Don\'t look at them. Look at the room between them.',
    3: 'That one is moving. Learn its path before you choose yours.',
    4: 'See the blue light? Take it. Blue is fuel out here. It keeps you moving.',
    5: 'Take the shield. For a few seconds... you can survive what should stop you.',
    6: 'Good. You can fly. Now let\'s find whoever called us.',
    7: 'We\'re retracing the signal\'s path. The old relay lanes fold the distance for us.',
    8: 'The transmission crossed thousands of systems. Most of it didn\'t survive.',
    9: 'There\'s an old relay ahead. Pass close. It may still remember part of the signal.',
    10: 'It does. A sequence of prime numbers. Someone wanted us to know this wasn\'t noise.',
    // NEW (insert A): counting
    11: 'They began with counting. One, two, three, all the way to ten. As if to say: we think, too.',
    12: 'They were trying very hard... not to be missed.',
    13: 'I like them already. Keep going.',
    14: 'Another relay. This fragment describes their star. Yellow. Ordinary. Stable.',
    15: 'Eight planets. They lived on the third.',
    16: 'Mostly ocean. One moon. A thin little atmosphere.',
    17: 'They sent pictures too. The encoding is damaged... but I\'m working on it.',
    18: 'There are buildings. Machines. Faces, I think.',
    // NEW (insert B): chemistry / DNA
    19: 'They drew the shape they\'re built from. A twist of it, over and over. Their own chemistry, handed to strangers.',
    20: 'And music. They put music in a message to strangers. That may be my favourite thing about them.',
    // NEW (insert C): sounds
    21: 'Not only music. Sounds. Rain. A heartbeat. Someone, somewhere, laughing.',
    // NEW (insert D): the map / come find us
    22: 'They even drew a map. Here is our star, here is our world. Come find us. So trusting.',
    23: 'They only sent it once. A hello into the dark, with no hope of an answer. And they sent it anyway.',
    24: 'I\'ve finished dating the transmission. There\'s a problem.',
    25: 'It was already more than a million years old... when we received it.',
    26: 'Don\'t stop. Old doesn\'t mean gone. Not necessarily.',
    27: 'No later transmissions appear anywhere along the route. One message, and then silence.',
    28: 'A civilization loud enough to send this... should have left something else behind.',
    29: 'I\'m searching. Keep flying.',
    30: 'Nothing. There\'s nothing.',
    31: 'I recovered part of their anatomy. Two arms. Two legs. Upright.',
    32: 'Five digits on each hand. Rather useful design, actually.',
    33: 'Another image cleared. Blue sky. Green vegetation. White clouds.',
    34: 'Fascinating. I found their name for the planet. Translation is still resolving.',
    35: 'Their star has a name too. One syllable.',
    36: 'Sol. They called it Sol.',
    37: 'The planet was called Earth.',
    38: 'I found them in the old archive... Their entire entry is one word. Unremarkable.',
    39: 'Unremarkable. They sang into the dark, and we filed them under "unremarkable."',
    40: 'I can see their sun from here. Yellow. Ordinary. Just as they said.',
    41: 'Sol is ahead. No artificial signals. No active structures.',
    42: 'Earth is still there. The ones who called... are not.',
};

/**
 * On-screen intro beats (1-indexed, 1..42). L1-5 string arrays (default gap).
 * L6+ { text, gapAfterMs } from ElevenLabs <break> after that sentence.
 * @type {Record<number, Array<string | IntroBeat>>}
 */
export const LEVEL_INTRO_BEATS = {
    1: ['There you are.', 'Tap once.', 'Let me see you turn.'],
    2: ['Rocks ahead.', 'Don\'t look at them.', 'Look at the room between them.'],
    3: ['That one is moving.', 'Learn its path before you choose yours.'],
    4: ['See the blue light?', 'Take it.', 'Blue is fuel out here.', 'It keeps you moving.'],
    5: ['Take the shield.', 'For a few seconds... you can survive what should stop you.'],
    6: [
        { text: 'Good.', gapAfterMs: 600 },
        { text: 'You can fly.', gapAfterMs: 500 },
        { text: 'Now let\'s find whoever called us.' },
    ],
    7: [
        { text: 'We\'re retracing the signal\'s path.', gapAfterMs: 500 },
        { text: 'The old relay lanes fold the distance for us.' },
    ],
    8: [
        { text: 'The transmission crossed thousands of systems.', gapAfterMs: 600 },
        { text: 'Most of it didn\'t survive.' },
    ],
    9: [
        { text: 'There\'s an old relay ahead.', gapAfterMs: 500 },
        { text: 'Pass close.', gapAfterMs: 400 },
        { text: 'It may still remember part of the signal.' },
    ],
    10: [
        { text: 'It does.', gapAfterMs: 500 },
        { text: 'A sequence of prime numbers.', gapAfterMs: 500 },
        { text: 'Someone wanted us to know this wasn\'t noise.' },
    ],
    // NEW A
    11: [
        { text: 'They began with counting.', gapAfterMs: 500 },
        { text: 'One, two, three, all the way to ten.', gapAfterMs: 600 },
        { text: 'As if to say: we think, too.' },
    ],
    12: [
        { text: 'They were trying very hard...', gapAfterMs: 500 },
        { text: 'not to be missed.' },
    ],
    13: [
        { text: 'I like them already.', gapAfterMs: 500 },
        { text: 'Keep going.' },
    ],
    14: [
        { text: 'Another relay.', gapAfterMs: 500 },
        { text: 'This fragment describes their star.', gapAfterMs: 500 },
        { text: 'Yellow.', gapAfterMs: 400 },
        { text: 'Ordinary.', gapAfterMs: 400 },
        { text: 'Stable.' },
    ],
    15: [
        { text: 'Eight planets.', gapAfterMs: 600 },
        { text: 'They lived on the third.' },
    ],
    16: [
        { text: 'Mostly ocean.', gapAfterMs: 500 },
        { text: 'One moon.', gapAfterMs: 500 },
        { text: 'A thin little atmosphere.' },
    ],
    17: [
        { text: 'They sent pictures too.', gapAfterMs: 500 },
        { text: 'The encoding is damaged... but I\'m working on it.' },
    ],
    18: [
        { text: 'There are buildings.', gapAfterMs: 400 },
        { text: 'Machines.', gapAfterMs: 500 },
        { text: 'Faces, I think.' },
    ],
    // NEW B
    19: [
        { text: 'They drew the shape they\'re built from.', gapAfterMs: 500 },
        { text: 'A twist of it, over and over.', gapAfterMs: 600 },
        { text: 'Their own chemistry, handed to strangers.' },
    ],
    20: [
        { text: 'And music.', gapAfterMs: 600 },
        { text: 'They put music in a message to strangers.', gapAfterMs: 600 },
        { text: 'That may be my favourite thing about them.' },
    ],
    // NEW C
    21: [
        { text: 'Not only music.', gapAfterMs: 500 },
        { text: 'Sounds.', gapAfterMs: 400 },
        { text: 'Rain.', gapAfterMs: 400 },
        { text: 'A heartbeat.', gapAfterMs: 500 },
        { text: 'Someone, somewhere, laughing.' },
    ],
    // NEW D
    22: [
        { text: 'They even drew a map.', gapAfterMs: 500 },
        { text: 'Here is our star, here is our world.', gapAfterMs: 500 },
        { text: 'Come find us.', gapAfterMs: 600 },
        { text: 'So trusting.' },
    ],
    23: [
        { text: 'They only sent it once.', gapAfterMs: 600 },
        { text: 'A hello into the dark, with no hope of an answer.', gapAfterMs: 800 },
        { text: 'And they sent it anyway.' },
    ],
    24: [
        { text: 'I\'ve finished dating the transmission.', gapAfterMs: 700 },
        { text: 'There\'s a problem.' },
    ],
    25: [
        { text: 'It was already more than a million years old...', gapAfterMs: 600 },
        { text: 'when we received it.' },
    ],
    26: [
        { text: 'Don\'t stop.', gapAfterMs: 500 },
        { text: 'Old doesn\'t mean gone.', gapAfterMs: 600 },
        { text: 'Not necessarily.' },
    ],
    27: [
        { text: 'No later transmissions appear anywhere along the route.', gapAfterMs: 800 },
        { text: 'One message, and then silence.' },
    ],
    28: [
        { text: 'A civilization loud enough to send this...', gapAfterMs: 500 },
        { text: 'should have left something else behind.' },
    ],
    29: [
        { text: 'I\'m searching.', gapAfterMs: 500 },
        { text: 'Keep flying.' },
    ],
    30: [
        { text: 'Nothing.', gapAfterMs: 2000 },
        { text: 'There\'s nothing.' },
    ],
    31: [
        { text: 'I recovered part of their anatomy.', gapAfterMs: 500 },
        { text: 'Two arms.', gapAfterMs: 400 },
        { text: 'Two legs.', gapAfterMs: 400 },
        { text: 'Upright.' },
    ],
    32: [
        { text: 'Five digits on each hand.', gapAfterMs: 500 },
        { text: 'Rather useful design, actually.' },
    ],
    33: [
        { text: 'Another image cleared.', gapAfterMs: 500 },
        { text: 'Blue sky.', gapAfterMs: 400 },
        { text: 'Green vegetation.', gapAfterMs: 400 },
        { text: 'White clouds.' },
    ],
    34: [
        { text: 'Fascinating.' },
        { text: 'I found their name for the planet.', gapAfterMs: 500 },
        { text: 'Translation is still resolving.' },
    ],
    35: [
        { text: 'Their star has a name too.', gapAfterMs: 600 },
        { text: 'One syllable.' },
    ],
    36: [
        { text: 'Sol.', gapAfterMs: 800 },
        { text: 'They called it Sol.' },
    ],
    37: [{ text: 'The planet was called Earth.' }],
    38: [
        { text: 'I found them in the old archive...', gapAfterMs: 700 },
        { text: 'Their entire entry is one word.', gapAfterMs: 600 },
        { text: 'Unremarkable.' },
    ],
    39: [
        { text: 'Unremarkable.', gapAfterMs: 900 },
        { text: 'They sang into the dark, and we filed them under "unremarkable."' },
    ],
    40: [
        { text: 'I can see their sun from here.', gapAfterMs: 600 },
        { text: 'Yellow.', gapAfterMs: 400 },
        { text: 'Ordinary.', gapAfterMs: 400 },
        { text: 'Just as they said.' },
    ],
    41: [
        { text: 'Sol is ahead.', gapAfterMs: 600 },
        { text: 'No artificial signals.', gapAfterMs: 500 },
        { text: 'No active structures.' },
    ],
    42: [
        { text: 'Earth is still there.', gapAfterMs: 1000 },
        { text: 'The ones who called...', gapAfterMs: 600 },
        { text: 'are not.' },
    ],
};

/**
 * ENDING EPILOGUE — begins AFTER the final flown level (L42) fades to black.
 * This replaces the old spoken L39/L40 and ENDING_BEATS. Flow:
 *   1. L42 cleared -> full fade to black, HUD gone.
 *   2. ~1.6s silent hold, then Day 42 voice + captions, 3s black gap, then NAV `open` beats.
 *   3. Prompt + text field appear. NAV goes SILENT (no waiting pressure).
 *   4. Player writes and submits, OR skips (two skip beats, one phrase each).
 *   5. Their words drift up into a single point of light. More lights bloom
 *      around it (implied: every other answer). NO further NAV voice.
 *   6. Counter card (live from DB). Footer follow card. First time only: Arc
 *      unlock card, then Options → Controls with Arc on. Later endings → title.
 * @type {object}
 */
export const ENDING_EPILOGUE = {
    open: [
        { text: 'They can\'t hear us anymore.', gapAfterMs: 900 },
        { text: 'But we can still answer.' },
    ],
    prompt: 'If you could say one thing to them, what would it be?',
    promptPlaceholder: 'Write it here.',
    submitLabel: 'Send it into the dark',
    skipLabel: 'Leave it unsaid',
    skip: [
        { text: 'Some things don\'t need words.', gapAfterMs: 700 },
        { text: 'A light appears for you either way.' },
    ],
    skipLine: 'Some things don\'t need words. A light appears for you either way.',
    offlineCounterCard: 'You answered the call.',
    // After submit/skip: NO NAV voice. Lights speak alone.
    counterCard: 'You are the {N} to answer the call.', // {N} = ordinal from DB, e.g. "4,102nd"
    footerCard: 'Follow @spaceswoosh.app to see what the others said.',
    arcUnlockLines: [
        'You\'ve unlocked Arc mode.',
        'Everybody hates it.',
        'Enjoy.',
    ],
    arcUnlockLabel: 'Take the controls',
};

/** @param {number} level */
export function levelMessage(level) {
    const n = Math.floor(Number(level) || 0);
    return LEVEL_MESSAGES[n] ?? null;
}

/**
 * Normalize intro beats to `{ text, gapAfterMs }[]`.
 * @param {number} level
 * @returns {IntroBeat[] | null}
 */
export function levelIntroBeats(level) {
    const n = Math.floor(Number(level) || 0);
    const raw = LEVEL_INTRO_BEATS[n];
    if (raw?.length) {
        return raw.map((beat) => {
            if (typeof beat === 'string') {
                return { text: beat, gapAfterMs: DEFAULT_BEAT_GAP_MS };
            }
            return {
                text: String(beat.text || '').trim(),
                gapAfterMs: beat.gapAfterMs ?? DEFAULT_BEAT_GAP_MS,
            };
        }).filter((b) => b.text);
    }
    const line = LEVEL_MESSAGES[n];
    return line ? [{ text: line, gapAfterMs: DEFAULT_BEAT_GAP_MS }] : null;
}
