import fs from 'fs';
import { CANDIDATE_LEVELS } from './testLevels.ts';

let ts = `import { Direction, VehicleType, LevelData } from './levelRepository.ts';

export const CHAPTER_ONE_EXTENDED_LEVELS: LevelData[] = [\n`;

for (const lvl of CANDIDATE_LEVELS) {
  ts += `  // ========================================================\n`;
  ts += `  // LEVEL ${lvl.id}: ${lvl.name}\n`;
  ts += `  // ========================================================\n`;
  ts += `  {\n`;
  ts += `    id: ${lvl.id},\n`;
  ts += `    name: '${lvl.name}',\n`;
  ts += `    world: ${lvl.world},\n`;
  ts += `    parMoves: ${lvl.parMoves},\n`;
  ts += `    timeLimit: ${lvl.timeLimit},\n`;
  ts += `    grid: { rows: ${lvl.grid.rows}, cols: ${lvl.grid.cols} },\n`;
  ts += `    vehicles: [\n`;
  for (const v of lvl.vehicles) {
    ts += `      { id: '${v.id}', type: VehicleType.${v.type}, color: '${v.color}', row: ${v.row}, col: ${v.col}, direction: Direction.${v.direction}, length: ${v.length}, capacity: ${v.capacity} },\n`;
  }
  ts += `    ],\n`;
  ts += `    passengers: [\n`;
  for (let i = 0; i < lvl.passengers.length; i += 4) {
    const chunk = lvl.passengers.slice(i, i + 4);
    ts += `      ` + chunk.map(p => `{ id: '${p.id}', color: '${p.color}' }`).join(', ') + `,\n`;
  }
  ts += `    ],\n`;
  ts += `  },\n`;
}

ts += `];\n`;

fs.writeFileSync('./src/logic/chapterOneLevels.ts', ts);
console.log('Generated src/logic/chapterOneLevels.ts successfully!');
