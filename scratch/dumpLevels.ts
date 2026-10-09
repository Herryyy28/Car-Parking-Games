import fs from 'fs';
import { CANDIDATE_LEVELS } from './testLevels.ts';

const code = 'export const HANDCRAFTED_LEVELS_7_TO_25 = ' + JSON.stringify(CANDIDATE_LEVELS, null, 2) + ';\n';
fs.writeFileSync('./scratch/levels7_25.json', code);
console.log('Saved levels7_25.json successfully!');
