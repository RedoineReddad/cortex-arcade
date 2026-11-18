// Metadata for all mini games. Game code lives in js/games/<id>.js and is
// loaded on demand, so the library screen stays tiny.
//
// par: the score a solid adult player reaches; rating = 100 * score / par (capped at 120).

export const CATEGORIES = {
  math: { name: 'Calculation', color: '#f59e0b', icon: '➗' },
  memory: { name: 'Memory', color: '#a855f7', icon: '🧠' },
  attention: { name: 'Attention', color: '#06b6d4', icon: '🎯' },
  speed: { name: 'Speed', color: '#ef4444', icon: '⚡' },
  spatial: { name: 'Spatial', color: '#10b981', icon: '🧊' },
  logic: { name: 'Logic & Language', color: '#3b82f6', icon: '🧩' },
};

export const GAMES = [
  // ── Calculation ────────────────────────────────────────────────
  {
    id: 'chain-calc', title: 'Chain Reaction', cat: 'math', icon: '🔗', par: 160,
    blurb: '20 quick sums, solved as fast as you can.',
    twist: 'Every answer becomes the first number of the next problem, so one slip changes the whole chain.',
    howto: ['Type the answer on the keypad (or keyboard).', 'Your answer carries into the next sum.', 'Faster + more accurate = more points.'],
  },
  {
    id: 'rain-math', title: 'Rainfall Sums', cat: 'math', icon: '🌧️', par: 300,
    blurb: 'Pop falling equations before they hit the ground.',
    twist: 'Mirror drops (⇄) want their answer typed backwards: 12 becomes 21.',
    howto: ['Type an answer to pop the matching drop.', 'Three drops on the ground and it is over.', 'Mirror drops ⇄ need the digits reversed.'],
  },
  {
    id: 'triangle-twist', title: 'Triangle Twist', cat: 'math', icon: '🔺',  par: 120,
    blurb: 'Collapse a number triangle down to one value.',
    twist: 'Blue rows add neighbours and red rows subtract them (left − right).',
    howto: ['Combine each neighbouring pair to form the next row.', 'Row colour tells you the operation.', 'Type only the final bottom number.'],
  },
  {
    id: 'coin-change', title: 'Exact Change', cat: 'math', icon: '🪙', par: 120,
    blurb: 'Hand back the right change, using the fewest coins.',
    twist: 'The till is out of some coins, so the obvious way to make change won\'t always work.',
    howto: ['Work out the change: paid − price.', 'Tap coins to add them; tap the tray to undo.', 'Bonus for using the fewest coins possible.'],
  },
  {
    id: 'bubble-rank', title: 'Bubble Rank', cat: 'math', icon: '🫧', par: 140,
    blurb: 'Pop drifting expressions from smallest to largest.',
    twist: 'When the arrow flips (⬇), pop from largest to smallest instead.',
    howto: ['Work out each bubble\'s value.', 'Pop them in the order the arrow shows.', 'A wrong pop resets the round.'],
  },
  // ── Memory ─────────────────────────────────────────────────────
  {
    id: 'flash-grid', title: 'Spin Grid', cat: 'memory', icon: '🔲', par: 120,
    blurb: 'Memorise the lit tiles, then find them again.',
    twist: 'Before you answer, the board turns, so you have to track where the tiles moved to.',
    howto: ['Watch the tiles that light up.', 'The grid rotates.', 'Tap where those tiles are now.'],
  },
  {
    id: 'word-recall', title: 'Word Vault', cat: 'memory', icon: '📚', par: 150,
    blurb: 'Memorise a list of words, then pick them out.',
    twist: 'The decoys are close cousins of the real words (pear for apple), so a vague memory isn\'t enough.',
    howto: ['Study the words until time runs out.', 'Tap every word you saw.', 'Wrong picks cost points.'],
  },
  {
    id: 'echo-sequence', title: 'Backwards Echo', cat: 'memory', icon: '🎹', par: 140,
    blurb: 'Repeat the melody of lit pads.',
    twist: 'Orange rounds must be played back in reverse order.',
    howto: ['Watch and listen to the sequence.', 'Green frame: repeat it as played. Orange: repeat it backwards.', 'Three mistakes and you are out. Keys 1–8 play the pads.'],
  },
  {
    id: 'shuffle-pairs', title: 'Shifty Pairs', cat: 'memory', icon: '🃏', par: 100,
    blurb: 'Classic pairs, with cards that won\'t stay still.',
    twist: 'Every miss makes two face-down cards swap places. Watch them move.',
    howto: ['Flip two cards to find a pair.', 'After a miss, two hidden cards slide and swap.', 'Fewer flips = more points.'],
  },
  {
    id: 'head-count', title: 'Full House', cat: 'memory', icon: '🏠', par: 80,
    blurb: 'People come and go. How many are inside now?',
    twist: 'Cats sneak in and out too, and you won\'t know whether you\'ll be asked about people or cats until the end.',
    howto: ['Watch who enters and leaves the house.', 'Track people AND cats.', 'Answer the question at the end.'],
  },
  // ── Attention ──────────────────────────────────────────────────
  {
    id: 'color-clash', title: 'Color Clash', cat: 'attention', icon: '🎨', par: 320,
    blurb: 'A colour word printed in a different ink colour.',
    twist: 'The frame tells you which to answer: solid means the ink colour, dashed means the word.',
    howto: ['Solid frame → tap the INK colour.', 'Dashed frame → tap what the WORD says.', 'Go fast, but mistakes cost points. Keys 1–6 work too.'],
  },
  {
    id: 'flock-flanker', title: 'Flock Focus', cat: 'attention', icon: '🐦', par: 380,
    blurb: 'Which way is the lead bird pointing?',
    twist: 'At dusk (orange sky), ignore the birds and answer which way the whole flock is drifting.',
    howto: ['Day: answer the CENTRE bird\'s direction.', 'Dusk: answer the direction the flock MOVES.', 'Use arrow keys or the buttons.'],
  },
  {
    id: 'orbit-track', title: 'Orbit Tracker', cat: 'attention', icon: '🪐', par: 150,
    blurb: 'Keep your eyes on the marked orbs as they swirl.',
    twist: 'Orbs vanish while they cross the fog bands, so you have to keep tracking them blind.',
    howto: ['Remember the highlighted orbs.', 'They all look the same as they move.', 'Tap the ones you tracked when they stop.'],
  },
  {
    id: 'shape-back', title: 'Shape Back', cat: 'attention', icon: '⏪', par: 260,
    blurb: 'Does this card match the one before?',
    twist: 'The cue keeps changing what counts as a match: SHAPE on some cards, COLOUR on others.',
    howto: ['Compare each card with the one N cards back.', 'Check the cue: shape or colour?', 'Tap Match or No match.'],
  },
  {
    id: 'signal-sprint', title: 'Signal Sprint', cat: 'attention', icon: '🚦', par: 240,
    blurb: 'Tap the green signals fast and leave the red ones alone.',
    twist: 'When the screen turns purple the rule flips: tap red and leave green alone.',
    howto: ['Normally: tap GREEN, ignore RED.', 'Purple screen: tap RED, ignore GREEN.', 'Speed counts.'],
  },
  // ── Speed ──────────────────────────────────────────────────────
  {
    id: 'trail-mix', title: 'Trail Mix', cat: 'speed', icon: '🔢', par: 120,
    blurb: 'Connect the dots alternating numbers and letters.',
    twist: 'Halfway through, the dots you haven\'t reached yet jump to new places.',
    howto: ['Tap 1 → A → 2 → B → 3 → C …', 'Halfway, the rest of the board reshuffles.', 'Finish all boards as fast as you can.'],
  },
  {
    id: 'symbol-cipher', title: 'Glyph Cipher', cat: 'speed', icon: '🔣', par: 150,
    blurb: 'Decode glyphs into digits using the key.',
    twist: 'Every so often the key flips face-down and you have to decode from memory.',
    howto: ['Find the glyph in the key.', 'Tap its digit.', 'When the key hides, rely on memory.'],
  },
  {
    id: 'clock-lapse', title: 'Time Warp', cat: 'speed', icon: '⏰', par: 120,
    blurb: 'How much time passed between two clocks?',
    twist: 'Some clocks are reflected in a mirror and you have to flip them back in your head.',
    howto: ['Read both clocks.', 'Mirror clocks (🪞) are reversed left-to-right.', 'Pick the elapsed time.'],
  },
  // ── Spatial ────────────────────────────────────────────────────
  {
    id: 'cube-count', title: 'Cube Stack 3D', cat: 'spatial', icon: '🧊', par: 100, three: true,
    blurb: 'Count every cube in a rotating 3D stack.',
    twist: 'Cubes can\'t float, so hidden cubes under the visible ones count too. Later stacks ask about one colour only, and each column is a single colour.',
    howto: ['Watch the stack rotate.', 'Count the cubes, hidden supports included.', 'Type your count.'],
  },
  {
    id: 'twin-twist', title: 'Twin Twist 3D', cat: 'spatial', icon: '🔄', par: 120, three: true,
    blurb: 'Are two 3D shapes the same, or mirror images?',
    twist: 'The shapes keep tumbling, and you can drag one to turn it, but the clock is still running.',
    howto: ['Compare the two 3D shapes.', 'Same = one can be rotated into the other.', 'Mirror = it can\'t.'],
  },
  {
    id: 'blind-walk', title: 'Blind Walk', cat: 'spatial', icon: '🧭', par: 100,
    blurb: 'Follow the directions in your head and tap where you end up.',
    twist: 'Some steps are turns relative to where the walker is facing ("turn left"), not compass directions.',
    howto: ['Watch the instructions one by one.', 'The walker does not move; picture it.', 'Tap the final square.'],
  },
  {
    id: 'mirror-bounce', title: 'Laser Mirrors', cat: 'spatial', icon: '🔦', par: 100,
    blurb: 'Predict where the laser exits the mirror maze.',
    twist: 'The mirrors only show for a few seconds, so you have to trace the beam from memory.',
    howto: ['Memorise the mirrors.', 'They vanish and the laser fires.', 'Tap the edge where the beam leaves.'],
  },
  // ── Logic & Language ───────────────────────────────────────────
  {
    id: 'scale-logic', title: 'Balance Bench', cat: 'logic', icon: '⚖️', par: 100,
    blurb: 'Read the scales and work out which object is heaviest.',
    twist: 'Some scales balance groups (two cherries = one apple), so you have to do the sums as well as the comparisons.',
    howto: ['Study every scale.', 'Deduce the relative weights.', 'Tap the heaviest (or lightest) object as asked.'],
  },
  {
    id: 'sequence-sleuth', title: 'Pattern Sleuth', cat: 'logic', icon: '🔍', par: 100,
    blurb: 'What comes next in the sequence?',
    twist: 'Some sequences are two series woven together, so look at every other term.',
    howto: ['Find the rule.', 'It might be two interleaved rules.', 'Choose the next term.'],
  },
  {
    id: 'vowel-vanish', title: 'Vowel Vanish', cat: 'logic', icon: '🔤', par: 120,
    blurb: 'Words with their vowels removed. Rebuild them.',
    twist: 'At higher levels the gaps aren\'t marked, so you have to work out where the vowels went.',
    howto: ['Read the consonant skeleton and the category hint.', 'Fill the vowels / pick the word.', 'Speed bonus for quick answers.'],
  },
];

export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
