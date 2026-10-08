# 🚌 Bus Game 3D: Chaotic Bus Jam & Traffic Puzzle

> **Play the most addictive 3D Bus Games! Clear the chaotic Bus Jam, sort passengers, and master this brain-burning traffic puzzle.**

Welcome to the challenging **Bus Game 3D**! Your mission is simple but tricky: Tap the colorful vehicles to move them, sort passengers to their matching seats, and navigate a packed parking lot. It's not just a sorting game; it's a test of your IQ and Bus Jam strategy.

Each level challenges you to load color stickmen onto the correct buses! But with tight spaces and blocked paths, it's a true Traffic Jam experience. Can you sort the crowd, clear the mess, and solve the Bus Jam 3D puzzle?

---

## 🚗 How to Play This Bus Game

- **Tap to move each vehicle** — Organize the bus traffic carefully. Vehicles drive straight in the direction their headlights point.
- **Space is tight!** — Every move in this bus jam matters. Think 2 to 3 steps ahead to avoid terminal gridlock.
- **Escape the maze** — Clear paths and guide the buses out of the parking maze and onto the highway.
- **Match passengers with the correct color** — Waiting passengers in queue only board buses matching their color. Efficient seat sorting is the key!
- **Strategize your moves** — Solve the parking jam using precision, order of operations, and spatial logic.

---

## 🧠 Why You'll Love This Logic Game

### 🧩 Smart Bus Game Mechanics
A perfect mix of **Color Jam**, **Bus Escape**, and classic **Traffic Jam** gameplay. Easy to learn, but hard to master. If you enjoy traffic puzzle games, this is your gym.

### 🧱 Endless Traffic Challenges
From simple queues to complex bus traffic jams across 8 vibrant 3D world themes (Neon Metropolis, Sakura Valley, Desert Oasis, Cyber Harbor, Alpine Peak, Sunset Coast, Lava Cavern, and Starlight Orbit). Whether you're planning a quick traffic escape or solving a tricky bus queue, each puzzle keeps you coming back for more.

### 🔧 Helpful Boosters
Stuck in a jam? Use boosters to swap passengers, unlock space, or shuffle the grid:
- **💡 Hint:** Highlights the next best tactical vehicle move.
- **🔀 Shuffle:** Rotates and rearranges stuck vehicles to open escape corridors.
- **🧲 Passenger Magnet:** Instantly fills docked buses with matching queue passengers.
- **↩️ Undo:** Reverses mistaken moves to preserve par score.
- **➕ Extra Bay:** Unlocks a 6th parking bay for maximum sorting headroom.

### 🎵 ASMR & Relaxing Vibe
Every move feels satisfying. It's a stress-relief game with smooth 60 FPS 3D animations, tactile button thuds, satisfying passenger boarding pops, and soothing in-cab synth radio. Perfect for fans of match puzzles and sorting games.

### ⚡ Play Offline Anytime
No Wi-Fi needed! Jump into your next logic puzzle anywhere. No timers, no pressure — just pure bus jam fun.

### 🥰 Senior-Friendly Design
With large tap areas, bold colors, and a clean, high-contrast interface, it is perfect for all ages. From kids to grandparents, this brain training game is accessible to everyone.

---

## ❓ Frequently Asked Questions (FAQ)

### Q: Is this a difficult sorting game?
**A:** It starts easy but gets tricky! As you progress, the Bus Jam levels become challenging brain teasers. It acts as a fun IQ test that trains your logic and strategy skills.

### Q: Can I play this Bus Game offline?
**A:** Yes! This is one of the best offline bus games. You can solve traffic puzzles and sort passengers without Wi-Fi or an internet connection. Perfect for travel and daily commutes!

### Q: Is this puzzle game suitable for seniors?
**A:** Absolutely! With big, bold colors, high-contrast UI, and simple controls, it is a great brain training game for seniors. It helps improve memory and logical thinking in a relaxing, stress-free environment.

---

## 🛠️ Technology Stack & Architecture

- **Frontend & 3D Engine:** [React 19](https://react.dev/), [Three.js r186](https://threejs.org/) (custom low-poly procedural shaders, shadows, dynamic weather & lighting), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/).
- **Native Android Shell:** Kotlin Android Activity hosting hardware-accelerated WebView with full offline bundle fallback and live USB HMR streaming.
- **Audio & Haptics:** Custom Web Audio API synthesizer for engine hums, horn reverbs, ASMR pops, and haptic feedback.

---

## 🚀 Running the Game

### 1. Web Development (PC Browser)
```bash
# Install dependencies
npm install

# Start Vite dev server on http://localhost:3000
npm run dev

# Build production bundle
npm run build
```

### 2. Live Android Device (60 FPS with USB Reverse Tunnel)
Connect your Android phone via USB with **USB Debugging** enabled:
```powershell
# Automatically checks port 3000, builds APK, installs and launches on device:
.\run-live-device.ps1
```
The script will auto-detect your device, reverse forward port 3000, build the APK with Gradle, install it, and stream live 60 FPS logs directly to your console!
