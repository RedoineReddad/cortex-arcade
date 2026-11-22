import type { GameMeta } from '../../core/types';

export const speedMathMeta: GameMeta = {
  id: 'speed-math',
  title: 'Speed Math',
  tagline: 'Calculations ×20',
  description: '20 rapid-fire sums. They get harder every five, and wrong answers cost you time.',
  howTo: [
    'Type the answer on the keypad (or your keyboard).',
    'It checks itself as soon as you have typed enough digits.',
    'Each wrong answer adds +3s to your clock and breaks your combo.',
  ],
  skill: 'calculation',
  sceneKey: 'speed-math',
  accent: '#7c6cff',
  emoji: '➗',
};
