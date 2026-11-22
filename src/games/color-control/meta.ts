import type { GameMeta } from '../../core/types';

export const colorControlMeta: GameMeta = {
  id: 'color-control',
  title: 'Color Control',
  tagline: 'Ink or word?',
  description: 'Colour words printed in the wrong ink. Follow the rule: tap the INK colour or what the WORD says.',
  howTo: [
    'INK: tap the colour the letters are printed in.',
    'WORD: tap the colour the word spells.',
    'The rule can flip at any time, and the timer bar gets shorter as you get better.',
  ],
  skill: 'flexibility',
  sceneKey: 'color-control',
  accent: '#ff7a59',
  emoji: '🎨',
};
