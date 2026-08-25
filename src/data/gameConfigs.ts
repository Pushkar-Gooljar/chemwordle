import { AROMATIC_DATA, AROMATIC_REAGENTS, AROMATIC_CATALYSTS, AROMATIC_CONDITIONS } from './aromaticData';
import { ALIPHATIC_DATA, ALIPHATIC_REAGENTS, ALIPHATIC_CATALYSTS, ALIPHATIC_CONDITIONS } from './aliphaticData';
import { type GameConfig } from './types';
import { type Mode } from './srsTypes';

export const GAME_CONFIGS: Record<Mode, GameConfig> = {
  aromatic: {
    title: 'Aromatic Chemistry Wordle',
    startNode: 'benzene',
    data: AROMATIC_DATA,
    reagents: AROMATIC_REAGENTS,
    catalysts: AROMATIC_CATALYSTS,
    conditions: AROMATIC_CONDITIONS,
    themeColor: 'primary',
    filters: [
      { label: '2,4-Directing', value: '2,4-directing' },
      { label: '3-Directing', value: '3-directing' },
    ],
  },
  aliphatic: {
    title: 'Aliphatic Chemistry Wordle',
    startNode: 'alkane',
    data: ALIPHATIC_DATA,
    reagents: ALIPHATIC_REAGENTS,
    catalysts: ALIPHATIC_CATALYSTS,
    conditions: ALIPHATIC_CONDITIONS,
    themeColor: 'blue',
    filters: [
      { label: 'Hydrocarbons', value: 'hydrocarbon' },
      { label: 'Oxygen-containing', value: 'oxygen' },
      { label: 'Nitrogen-containing', value: 'nitrogen' },
    ],
  },
};
