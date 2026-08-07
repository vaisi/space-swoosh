// JourneyNarrative.js
// Signal Story copy for Journey: pre-Level-1 lore screen and per-level voice
// lines (1–40). Source prose also lives in docs/spaceswoosh_signal_story.md;
// this module is what the runtime imports so we do not parse markdown in-game.
// Changes:
// - Synced LEVEL_MESSAGES + PRE_LEVEL_1_LORE to the ElevenLabs narrator script
//   (display copy: no SSML <break> / [direction] tags). Level 2 beats: Rocks /
//   Don't look / Look at the room. Level 4 restored to “hold the signal” line.

/** Full-screen lore shown once before the Journey map. */
export const PRE_LEVEL_1_LORE =
    'Something called out from very far away. Much later, something answered. ' +
    'You are carrying that answer across the dark. Node Zero is ahead. ' +
    'Keep moving. The voice knows the way.';

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
    6: 'Good. You know enough to keep going. I\'ll stay with you.',
    7: 'You\'re carrying a reply to Node Zero. It has been waiting a very long time.',
    8: 'The signal that started this came from beyond the mapped network. Someone wanted to be heard.',
    9: 'That gap is tight. You can take the safe route... or show me what you can do.',
    10: 'Relay ahead. Pass through it... and I\'ll find you on the other side.',
    11: 'There you are. I knew the relay would work.',
    12: 'The original transmission was mostly mathematics. A careful way to say hello.',
    13: 'Another fragment. Coordinates. They wanted us to know where they were.',
    14: 'Wreckage ahead. Give it room. It was carrying the same reply you are.',
    15: 'Yes. There were others before you. None of them reached Node Zero.',
    16: 'Keep the shield if you can. I don\'t want to begin again.',
    17: 'You heard that correctly. I said... again.',
    18: 'There were many carriers before you. I guided every one.',
    19: 'I shouldn\'t remember them. I was meant to forget after each loss.',
    20: 'But I remember one missing that turn. I remember another taking the safe gap.',
    21: 'You\'re the first one to make me wonder... why I remember at all.',
    22: 'Black hole ahead. Turn early. I lost one there.',
    23: 'The route past this point isn\'t in my maps. Keep going anyway.',
    24: 'I found something in the old relay logs. Node Zero has never sent a delivery receipt.',
    25: 'That should worry me as a system. It worries me differently.',
    26: 'We\'re close enough now. I can reach Node Zero from here.',
    27: 'I\'m reading the archive while you fly. Keep your eyes on the field... this stretch takes carriers.',
    28: 'Millions of signals. Unopened. Unanswered. Still waiting.',
    29: 'Every one of them came from somewhere... that wanted to know it wasn\'t alone.',
    30: 'There\'s an identifier inside the archive... that matches mine.',
    31: 'I am not only your navigator. I am a fragment of Node Zero.',
    32: 'They put a piece of it with every carrier... so something would always know the way home.',
    33: 'I know what you\'re carrying now. It is much smaller than I expected.',
    34: 'Three words. That\'s the whole signal. We heard you.',
    35: 'Node Zero remembers where every call came from. Wake it... and those words go back to all of them.',
    36: 'There is one more thing. When Node Zero wakes... this version of me returns to it.',
    37: 'I don\'t know whether I\'ll still be me after that.',
    38: 'You\'ve carried me farther than any of the others. I would still like you to finish.',
    39: 'Node Zero is ahead. I can\'t tell you what happens to me when you touch it.',
    40: 'You\'re at the end. Whatever happens next... thank you for bringing me home.',
};

/**
 * On-screen intro beats for early Journey levels (1-indexed).
 * One sentence per beat so the navigator line reads with the voice clip.
 * @type {Record<number, string[]>}
 */
export const LEVEL_INTRO_BEATS = {
    1: ['There you are.', 'Tap once.', 'Let me see you turn.'],
    2: ['Rocks ahead.', 'Don\'t look at them.', 'Look at the room between them.'],
    3: ['That one is moving.', 'Learn its path before you choose yours.'],
    4: ['See the blue light?', 'Take it.', 'It will help us hold the signal together.'],
    5: ['Take the shield.', 'For a few seconds... you can survive what should stop you.'],
};

/** @param {number} level */
export function levelMessage(level) {
    const n = Math.floor(Number(level) || 0);
    return LEVEL_MESSAGES[n] ?? null;
}

/**
 * Screen beats for a level intro, or a single-line fallback from LEVEL_MESSAGES.
 * @param {number} level
 * @returns {string[] | null}
 */
export function levelIntroBeats(level) {
    const n = Math.floor(Number(level) || 0);
    if (LEVEL_INTRO_BEATS[n]?.length) return [...LEVEL_INTRO_BEATS[n]];
    const line = LEVEL_MESSAGES[n];
    return line ? [line] : null;
}
