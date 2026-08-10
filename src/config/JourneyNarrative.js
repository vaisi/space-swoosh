// JourneyNarrative.js
// THE REPLY — Signal Story copy for Journey: pre-Level-1 lore, first-BOOP cue,
// and per-level NAV voice lines (1-40). Runtime imports this directly.
//
// Locked decisions (THE REPLY, recovery framing):
// - Lore: "Reach them. Answer them." (duty planted, payload unwritten).
// - No "answer/reply" carried as cargo. You recover the message toward its
//   source; the answer is composed only at the end.
// - L26 two beats ("Nothing." / "There's nothing.").
// - L38 "The ones who called are not." L39 pivot. L40 "Let them hear us."
// - Ending payload: WE HEARD YOU. NAV: "I'm sorry they never knew." Then the
//   lights, then "We weren't the only ones who answered."
// Changes: L16 three-beat encoding line; L38 "are not."; L34 archive; L23;
// recovery-frame lore + L18–19, L26, L35, L39–40, ENDING_BEATS.

/** @typedef {{ text: string, gapAfterMs?: number }} IntroBeat */

/** Default gap between string beats when no gapAfterMs is set. */
export const DEFAULT_BEAT_GAP_MS = 400;

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
 * NAV voice line at the start of each Journey level (1-indexed).
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
    18: 'And music. They put music in a message to strangers. That may be my favourite thing about them.',
    19: 'They only sent it once. A hello into the dark, with no hope of an answer. And they sent it anyway.',
    20: 'I\'ve finished dating the transmission. There\'s a problem.',
    21: 'It was already more than a million years old... when we received it.',
    22: 'Don\'t stop. Old doesn\'t mean gone. Not necessarily.',
    23: 'No later transmissions appear anywhere along the route. One message, and then silence.',
    24: 'A civilization loud enough to send this... should have left something else behind.',
    25: 'I\'m searching. Keep flying.',
    26: 'Nothing. There\'s nothing.',
    27: 'I recovered part of their anatomy. Two arms. Two legs. Upright.',
    28: 'Five digits on each hand. Rather useful design, actually.',
    29: 'Another image cleared. Blue sky. Green vegetation. White clouds.',
    30: 'Fascinating. I found their name for the planet. Translation is still resolving.',
    31: 'Their star has a name too. One syllable.',
    32: 'Sol. They called it Sol.',
    33: 'The planet was called Earth.',
    34: 'I found their entry in the old archive... Their entire entry is one word. Unremarkable.',
    35: 'Unremarkable. They sang into the dark, and we filed them under "unremarkable."',
    36: 'We weren\'t the first to search. They were.',
    37: 'Sol is ahead. No artificial signals. No active structures.',
    38: 'Earth is still there. The ones who called... are not.',
    39: 'We came a million years too late. Let\'s answer them anyway.',
    40: 'There it is. Let them hear us.',
};

/**
 * On-screen intro beats (1-indexed). L1-5: string arrays (default gap).
 * L6-40: { text, gapAfterMs } from ElevenLabs <break> after that sentence.
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
        { text: 'The encoding is damaged', gapAfterMs: 350 },
        { text: '...but I\'m working on it.' },
    ],
    17: [
        { text: 'There are buildings.', gapAfterMs: 400 },
        { text: 'Machines.', gapAfterMs: 500 },
        { text: 'Faces, I think.' },
    ],
    18: [
        { text: 'And music.', gapAfterMs: 600 },
        { text: 'They put music in a message to strangers.', gapAfterMs: 600 },
        { text: 'That may be my favourite thing about them.' },
    ],
    19: [
        { text: 'They only sent it once.', gapAfterMs: 600 },
        { text: 'A hello into the dark, with no hope of an answer.', gapAfterMs: 700 },
        { text: 'And they sent it anyway.' },
    ],
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
    23: [
        { text: 'No later transmissions appear anywhere along the route.', gapAfterMs: 800 },
        { text: 'One message,', gapAfterMs: 500 },
        { text: 'and then silence.' },
    ],
    24: [
        { text: 'A civilization loud enough to send this...', gapAfterMs: 500 },
        { text: 'should have left something else behind.' },
    ],
    25: [
        { text: 'I\'m searching.', gapAfterMs: 500 },
        { text: 'Keep flying.' },
    ],
    26: [
        { text: 'Nothing.', gapAfterMs: 2000 },
        { text: 'There\'s nothing.' },
    ],
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
        { text: 'I found their entry in the old archive...', gapAfterMs: 700 },
        { text: 'Their entire entry is one word.', gapAfterMs: 600 },
        { text: 'Unremarkable.' },
    ],
    35: [
        { text: 'Unremarkable.', gapAfterMs: 800 },
        { text: 'They sang into the dark, and we filed them under "unremarkable."' },
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
        { text: 'Earth is still there.', gapAfterMs: 1000 },
        { text: 'The ones who called...', gapAfterMs: 600 },
        { text: 'are not.' },
    ],
    39: [
        { text: 'We came a million years too late.', gapAfterMs: 800 },
        { text: 'Let\'s answer them anyway.' },
    ],
    40: [
        { text: 'There it is.', gapAfterMs: 800 },
        { text: 'Let them hear us.' },
    ],
};

/** Ending sequence, played after the final relay is touched. */
export const ENDING_BEATS = {
    payload: 'WE HEARD YOU.',
    afterPayload: [
        { text: 'I\'m sorry they never knew.', gapAfterMs: 1200 },
    ],
    onLightsAppear: [
        { text: 'Oh.', gapAfterMs: 900 },
    ],
    final: [
        { text: 'We weren\'t the only ones who answered.' },
    ],
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
