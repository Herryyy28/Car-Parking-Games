import fs from 'fs';

let content = fs.readFileSync('./src/App.tsx', 'utf-8');

const targetStart = "{screen === 'LEVEL_SELECT' && (";
const targetEnd = "{screen === 'GAME' && (";

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find start or end marker!');
  process.exit(1);
}

// Find the last ")}" before targetEnd
const closingIndex = content.lastIndexOf(')}', endIndex);
if (closingIndex === -1 || closingIndex < startIndex) {
  console.error('Could not find closing )} before GAME screen!');
  process.exit(1);
}

const replacement = `{screen === 'LEVEL_SELECT' && (
          <World3DAdventureMap
            currentLevelId={gameState.levelId}
            unlockedLevelId={progress.unlockedLevel}
            progressStars={progress.stars}
            coins={gameState.coins}
            selectedDifficulty={selectedDifficulty}
            selectedGameMode={selectedGameMode}
            onSelectLevel={(levelId, diffOverride, modeOverride) => {
              handleLevelSelect(levelId, diffOverride, modeOverride);
            }}
            onBackToHome={() => {
              sounds.playClick();
              setScreen('HOME');
            }}
            initialWorldId={selectedWorldTab}
          />
        )}`;

content = content.slice(0, startIndex) + replacement + content.slice(closingIndex + 2);
fs.writeFileSync('./src/App.tsx', content, 'utf-8');
console.log('Successfully replaced LEVEL_SELECT with World3DAdventureMap in src/App.tsx!');
