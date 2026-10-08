/**
 * Unified Game Design System Tokens
 * Single source of truth for colors, typography, spacing, animation curves,
 * button styles, and interactive states across React UI and 3D scenes.
 */

export const DESIGN_SYSTEM = {
  // Brand & Identity Colors
  brand: {
    primary: '#0284c7',       // Sky Blue (Main action)
    primaryHover: '#0369a1',
    accent: '#f59e0b',        // Amber Gold (Coins / Rewards)
    accentHover: '#d97706',
    success: '#10b981',       // Emerald (Play / Confirm)
    successHover: '#059669',
    danger: '#f43f5e',        // Rose (Block / Warning / Out of moves)
    dangerHover: '#e11d48',
    darkSurface: '#0f172a',   // Graphite Slate 900
    darkCard: '#1e293b',      // Slate 800
    darkElevated: '#334155',  // Slate 700
    darkBackground: '#070b14',// Deep Navy Void
    textLight: '#f8fafc',
    textMuted: '#94a3b8',
    textDim: '#64748b',
  },

  // 100% Consistent Gameplay Palette (Buses, Passengers, UI Indicators)
  gameplayColors: {
    RED: {
      id: 'RED',
      name: 'Red',
      hex: '#EF4444',
      lightHex: '#FCA5A5',
      darkHex: '#991B1B',
      tailwindText: 'text-red-400',
      tailwindBg: 'bg-red-500',
      tailwindBorder: 'border-red-400',
    },
    BLUE: {
      id: 'BLUE',
      name: 'Blue',
      hex: '#2563EB',
      lightHex: '#93C5FD',
      darkHex: '#1E40AF',
      tailwindText: 'text-blue-400',
      tailwindBg: 'bg-blue-600',
      tailwindBorder: 'border-blue-400',
    },
    YELLOW: {
      id: 'YELLOW',
      name: 'Yellow',
      hex: '#EAB308',
      lightHex: '#FDE047',
      darkHex: '#854D0E',
      tailwindText: 'text-amber-300',
      tailwindBg: 'bg-amber-400',
      tailwindBorder: 'border-amber-300',
    },
    GREEN: {
      id: 'GREEN',
      name: 'Green',
      hex: '#10B981',
      lightHex: '#6EE7B7',
      darkHex: '#065F46',
      tailwindText: 'text-emerald-400',
      tailwindBg: 'bg-emerald-500',
      tailwindBorder: 'border-emerald-400',
    },
    PURPLE: {
      id: 'PURPLE',
      name: 'Purple',
      hex: '#8B5CF6',
      lightHex: '#C4B5FD',
      darkHex: '#5B21B6',
      tailwindText: 'text-purple-400',
      tailwindBg: 'bg-purple-500',
      tailwindBorder: 'border-purple-400',
    },
    ORANGE: {
      id: 'ORANGE',
      name: 'Orange',
      hex: '#F97316',
      lightHex: '#FDBA74',
      darkHex: '#9A3412',
      tailwindText: 'text-orange-400',
      tailwindBg: 'bg-orange-500',
      tailwindBorder: 'border-orange-400',
    },
    PINK: {
      id: 'PINK',
      name: 'Pink',
      hex: '#EC4899',
      lightHex: '#F9A8D4',
      darkHex: '#9D174D',
      tailwindText: 'text-pink-400',
      tailwindBg: 'bg-pink-500',
      tailwindBorder: 'border-pink-400',
    },
  },

  // 3D Environment Rendering Specs
  environment: {
    cellSize: 2.2,             // Standard grid square unit (meters)
    docksZ: -6.8,              // Fixed Z line for passenger boarding docks
    docksSpacing: 3.0,         // Distance between dock bays
    vehicleHeightCar: 1.05,
    vehicleHeightBus: 1.4,
    vehicleWidth: 1.55,
    carLength: 2.1,
    busLength: 3.15,
    passengerHeight: 1.0,
  },

  // Animation Timings & Physics Curves
  animation: {
    vehicleDriveSpeed: 14.0,   // Units per second
    vehicleTurnSpeed: 8.5,     // Radians per second
    passengerWalkSpeed: 6.0,
    uiPressDuration: 0.08,     // Seconds
    modalEnterDuration: 0.28,
  },

  // Tactile Sound Frequencies
  audioPitch: {
    click: 800,
    vehicleStart: 220,
    passengerBoard: 587,
    busDepart: 330,
    winStinger: 523,
    errorThud: 110,
  },
} as const;
