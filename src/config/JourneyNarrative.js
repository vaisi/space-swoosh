// JourneyNarrative.js
// Signal Story copy for Journey: pre-Level-1 lore screen and per-level voice
// lines (1–40). Source prose also lives in docs/spaceswoosh_signal_story.md;
// this module is what the runtime imports so we do not parse markdown in-game.
// Changes:
// - FIRST_BOOP_BEATS: session-once Journey sidewall cue text (+ 0.4s gap).
// - L38 three beats; L36 “first to search”; L31 “has a name”; L30 Fascinating.
// - THE REPLY arc: lore + LEVEL_MESSAGES[6..40] (Earth / Sol). L1–5 unchanged.
// - LEVEL_INTRO_BEATS expanded to 6–40 as { text, gapAfterMs } from ElevenLabs
//   <break> tags; L1–5 stay string beats (default gap).

/** @typedef {{ text: string, gapAfterMs?: number }} IntroBeat */

/**
 * On-screen beats for the first Journey wall BOOP of an app session
 * (matches First-boop-voice.mp3 / first-boop.mp3).
 * @type {IntroBeat[]}
 */
export const FIRST_BOOP_BEATS = [
    { text: 'The walls forgive.', gapAfterMs: 400 },
    { text: 'Little else out here does.', gapAfterMs: 400 },
];

/** Full-screen lore shown once before the Journey map. */
export const PRE_LEVEL_1_LORE =
    'Something called out from very far away. Much later, something answered. ' +
    'You are carrying that answer back along the path it came. ' +
    'Keep moving... and listen to the voice.';

/** Logbook title for the lore entry unlocked on Continue. */
export const PRE_LEVEL_1_LORE_TITLE = 'The Call';

/**
 * Navigator voice line at the start of each Journey level (1-indexed).
 * Clean display / logbook copy (SSML and stage directions stripped).
 * @type {Record<number, string>}
 */
export const LEVEL_MESSAGES = {
    1: 'There you are. Tap once. Let me see you turn.',
    2: 'Rocks ahead. Don\'t look at them. Look at the room between them.',
    3: 'That one is moving. Learn its path before you choose yours.',
    4: 'See the blue light? Take it. It will help us hold the signal together.',
    5: 'Take the shield. For a few seconds... you can survive what should stop you.',
    6: 'Good. You can fly. Now let\'s find whoever called us.',
    7: 'We\'re retracing the signal\'s path. The old relay lanes fold the distance for us.',
    8: 'The transmission crossed thousands of systems. Most of it didn\'t survive.',
    9: 'There\'s an old relay ahead. Pass close. It may still remember part of the signal.',
    10: 'It does. A sequence of prime numbers. Someone wanted us to know this wasn\'t noise.',
    11: 'They were trying very hard... not to be missed.',
    12: 'I like them already. Keep going.',
    13: 'Another relay. This fragment describes their star. Yellow. Ordinary. Stable.',
    14: 'Eight planets. They lived on the third.',
    15: 'Mostly ocean. One moon. A thin little atmosphere.',
    16: 'They sent pictures too. The encoding is damaged... but I\'m working on it.',
    17: 'There are buildings. Machines. Faces, I think.',
    18: 'And music. They put music in a message to strangers.',
    19: 'That may be my favourite thing about them.',
    20: 'I\'ve finished dating the transmission. There\'s a problem.',
    21: 'It was already more than a million years old... when we received it.',
    22: 'Don\'t stop. Old doesn\'t mean gone. Not necessarily.',
    23: 'No other transmissions appear anywhere along the route.',
    24: 'A civilization loud enough to send this... Should have left something else behind.',
    25: 'I\'m searching. Keep flying.',
    26: 'Nothing.',
    27: 'I recovered part of their anatomy. Two arms. Two legs. Upright.',
    28: 'Five digits on each hand. Rather useful design, actually.',
    29: 'Another image cleared. Blue sky. Green vegetation. White clouds.',
    30: 'Fascinating. I found their name for the planet. Translation is still resolving.',
    31: 'Their star has a name too. One syllable.',
    32: 'Sol. They called it Sol.',
    33: 'The planet was called Earth.',
    34: 'You knew that name... didn\'t you?',
    35: 'I didn\'t. It isn\'t ours.',
    36: 'We weren\'t the first to search. They were.',
    37: 'Sol is ahead. No artificial signals. No active structures.',
    38: 'Earth is still there. Whatever sent the message... is not.',
    39: 'We came a million years too late. Carry the answer anyway.',
    40: 'There it is. Take their answer home.',
};

/**
 * On-screen intro beats (1-indexed). L1–5: string arrays (default gap).
 * L6–40: { text, gapAfterMs } from ElevenLabs <break> after that sentence.
 * @type {Record<number, Array<string | IntroBeat>>}
 */
export const LEVEL_INTRO_BEATS = {
    1: ['There you are.', 'Tap once.', 'Let me see you turn.'],
    2: ['Rocks ahead.', 'Don\'t look at them.', 'Look at the room between them.'],
    3: ['That one is moving.', 'Learn its path before you choose yours.'],
    4: ['See the blue light?', 'Take it.', 'It will help us hold the signal together.'],
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
    11: [
        { text: 'They were trying very hard...', gapAfterMs: 500 },
        { text: 'not to be missed.' },
    ],
    12: [
        { text: 'I like them already.', gapAfterMs: 500 },
        { text: 'Keep going.' },
    ],
    13: [
        { text: 'Another relay.', gapAfterMs: 500 },
        { text: 'This fragment describes their star.', gapAfterMs: 500 },
        { text: 'Yellow.', gapAfterMs: 400 },
        { text: 'Ordinary.', gapAfterMs: 400 },
        { text: 'Stable.' },
    ],
    14: [
        { text: 'Eight planets.', gapAfterMs: 600 },
        { text: 'They lived on the third.' },
    ],
    15: [
        { text: 'Mostly ocean.', gapAfterMs: 500 },
        { text: 'One moon.', gapAfterMs: 500 },
        { text: 'A thin little atmosphere.' },
    ],
    16: [
        { text: 'They sent pictures too.', gapAfterMs: 500 },
        { text: 'The encoding is damaged... but I\'m working on it.' },
    ],
    17: [
        { text: 'There are buildings.', gapAfterMs: 400 },
        { text: 'Machines.', gapAfterMs: 500 },
        { text: 'Faces, I think.' },
    ],
    18: [
        { text: 'And music.', gapAfterMs: 600 },
        { text: 'They put music in a message to strangers.' },
    ],
    19: [{ text: 'That may be my favourite thing about them.' }],
    20: [
        { text: 'I\'ve finished dating the transmission.', gapAfterMs: 700 },
        { text: 'There\'s a problem.' },
    ],
    21: [
        { text: 'It was already more than a million years old...', gapAfterMs: 600 },
        { text: 'when we received it.' },
    ],
    22: [
        { text: 'Don\'t stop.', gapAfterMs: 500 },
        { text: 'Old doesn\'t mean gone.', gapAfterMs: 600 },
        { text: 'Not necessarily.' },
    ],
    23: [{ text: 'No other transmissions appear anywhere along the route.' }],
    24: [
        { text: 'A civilization loud enough to send this...', gapAfterMs: 500 },
        { text: 'Should have left something else behind.' },
    ],
    25: [
        { text: 'I\'m searching.', gapAfterMs: 500 },
        { text: 'Keep flying.' },
    ],
    26: [{ text: 'Nothing.' }],
    27: [
        { text: 'I recovered part of their anatomy.', gapAfterMs: 500 },
        { text: 'Two arms.', gapAfterMs: 400 },
        { text: 'Two legs.', gapAfterMs: 400 },
        { text: 'Upright.' },
    ],
    28: [
        { text: 'Five digits on each hand.', gapAfterMs: 500 },
        { text: 'Rather useful design, actually.' },
    ],
    29: [
        { text: 'Another image cleared.', gapAfterMs: 500 },
        { text: 'Blue sky.', gapAfterMs: 400 },
        { text: 'Green vegetation.', gapAfterMs: 400 },
        { text: 'White clouds.' },
    ],
    30: [
        { text: 'Fascinating.' },
        { text: 'I found their name for the planet.', gapAfterMs: 500 },
        { text: 'Translation is still resolving.' },
    ],
    31: [
        { text: 'Their star has a name too.', gapAfterMs: 600 },
        { text: 'One syllable.' },
    ],
    32: [
        { text: 'Sol.', gapAfterMs: 800 },
        { text: 'They called it Sol.' },
    ],
    33: [{ text: 'The planet was called Earth.' }],
    34: [
        { text: 'You knew that name...', gapAfterMs: 600 },
        { text: 'didn\'t you?' },
    ],
    35: [
        { text: 'I didn\'t.', gapAfterMs: 800 },
        { text: 'It isn\'t ours.' },
    ],
    36: [
        { text: 'We weren\'t the first to search.', gapAfterMs: 700 },
        { text: 'They were.' },
    ],
    37: [
        { text: 'Sol is ahead.', gapAfterMs: 600 },
        { text: 'No artificial signals.', gapAfterMs: 500 },
        { text: 'No active structures.' },
    ],
    38: [
        { text: 'Earth is still there.', gapAfterMs: 700 },
        { text: 'Whatever sent the message...', gapAfterMs: 500 },
        { text: 'is not.' },
    ],
    39: [
        { text: 'We came a million years too late.', gapAfterMs: 800 },
        { text: 'Carry the answer anyway.' },
    ],
    40: [
        { text: 'There it is.', gapAfterMs: 800 },
        { text: 'Take their answer home.' },
    ],
};

/** Default gap between string beats (L1–5) when no gapAfterMs is set. */
export const DEFAULT_BEAT_GAP_MS = 400;

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
