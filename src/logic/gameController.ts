import { BoosterState, GameState, GameStatus, PassengerState, VehicleColor, VehicleState, VehicleStateType } from './types.ts';
import { LogicalGrid } from './logicalGrid.ts';
import { PathFinder } from './pathFinder.ts';
import { PuzzleSolver } from './puzzleSolver.ts';
import { LevelRepository } from './levelRepository.ts';

type StateListener = (state: GameState) => void;

export class GameController {
  private state: GameState;
  private historyStack: GameState[] = [];
  private listeners: Set<StateListener> = new Set();
  private grid: LogicalGrid;

  constructor(initialLevelId = 1) {
    this.state = LevelRepository.createInitialGameState(initialLevelId);
    this.grid = new LogicalGrid(this.state.gridRows, this.state.gridCols);
    this.grid.rebuild(this.state.vehicles);
    this.updateHint();
  }

  public getState(): GameState {
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.grid.rebuild(this.state.vehicles);
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private pushHistory(): void {
    // Clone state snapshot
    const snapshot: GameState = JSON.parse(JSON.stringify(this.state));
    this.historyStack.push(snapshot);
    if (this.historyStack.length > 20) {
      this.historyStack.shift();
    }
  }

  /**
   * Load a new level into the controller.
   */
  public loadLevel(levelId: number): void {
    this.historyStack = [];
    this.state = LevelRepository.createInitialGameState(levelId, this.state.coins);
    this.state.status = GameStatus.READY;
    this.grid = new LogicalGrid(this.state.gridRows, this.state.gridCols);
    this.grid.rebuild(this.state.vehicles);
    this.updateHint();
    this.notify();
  }

  /**
   * Player taps a vehicle. Validates via LogicalGrid + PathFinder.
   */
  public requestVehicleMove(vehicleId: string): {
    success: boolean;
    blockerId: string | null;
    dockIndex?: number;
    reason?: string;
  } {
    if (
      this.state.status === GameStatus.COMPLETED ||
      this.state.status === GameStatus.FAILED ||
      this.state.status === GameStatus.VEHICLE_MOVING
    ) {
      return { success: false, blockerId: null, reason: 'Game busy' };
    }

    const vehicle = this.state.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle || vehicle.state !== VehicleStateType.PARKED) {
      return { success: false, blockerId: null, reason: 'Vehicle not parked' };
    }

    // 1. Check if there is an open parking bay
    const availableSlotIdx = this.state.parkingSlots.findIndex(
      (s, idx) => s.vehicleId === null && idx < this.state.unlockedDocksCount
    );

    if (availableSlotIdx === -1) {
      return { success: false, blockerId: null, reason: 'ALL_BAYS_FULL' };
    }

    // 2. Validate grid path
    this.grid.rebuild(this.state.vehicles);
    const pathResult = PathFinder.isPathClear(vehicle, this.grid);

    if (!pathResult.clear) {
      // Vehicle is blocked!
      return {
        success: false,
        blockerId: pathResult.blockerId,
        reason: 'Path obstructed',
      };
    }

    // 3. Move is valid!
    this.pushHistory();

    this.state.moves = Math.max(0, this.state.moves - 1);
    this.state.status = GameStatus.VEHICLE_MOVING;

    // Update vehicle state
    this.state.vehicles = this.state.vehicles.map((v) =>
      v.id === vehicleId
        ? { ...v, state: VehicleStateType.MOVING, dockIndex: availableSlotIdx }
        : v
    );

    // Reserve dock slot
    this.state.parkingSlots = this.state.parkingSlots.map((s, idx) =>
      idx === availableSlotIdx ? { ...s, vehicleId } : s
    );

    this.notify();

    return {
      success: true,
      blockerId: null,
      dockIndex: availableSlotIdx,
    };
  }

  /**
   * Called when 3D movement animation finishes reaching the dock bay.
   */
  public onVehicleArrivedAtDock(vehicleId: string, dockIndex: number): void {
    this.state.vehicles = this.state.vehicles.map((v) =>
      v.id === vehicleId
        ? { ...v, state: VehicleStateType.DOCKED, dockIndex }
        : v
    );

    this.state.status = GameStatus.PLAYING;
    this.updateHint();
    this.notify();
  }

  /**
   * Passenger boarding tick: handles passenger boarding and bus departures.
   */
  public stepPassengerBoarding(): {
    type: 'NONE' | 'BOARDED' | 'DEPARTED' | 'COMPLETED' | 'OUT_OF_MOVES' | 'GRIDLOCKED';
    vehicleId?: string;
    passengerId?: string;
  } {
    // 1. Check if any docked bus is fully loaded -> Depart!
    for (let i = 0; i < this.state.unlockedDocksCount; i++) {
      const slot = this.state.parkingSlots[i];
      if (slot && slot.vehicleId) {
        const bus = this.state.vehicles.find((v) => v.id === slot.vehicleId);
        if (bus && bus.loadedPassengers >= bus.capacity) {
          // Bus departs!
          this.state.vehicles = this.state.vehicles.map((v) =>
            v.id === bus.id ? { ...v, state: VehicleStateType.EXITED } : v
          );

          this.state.parkingSlots = this.state.parkingSlots.map((s, idx) =>
            idx === i ? { ...s, vehicleId: null } : s
          );

          this.state.coins += 45;
          this.state.score += 100;
          this.state.comboCount += 1;

          // Check if all vehicles and passengers are complete!
          if (this.isLevelComplete()) {
            this.state.status = GameStatus.COMPLETED;
            this.state.coins += 250;
            this.notify();
            return { type: 'COMPLETED', vehicleId: bus.id };
          }

          this.updateHint();
          this.notify();
          return { type: 'DEPARTED', vehicleId: bus.id };
        }
      }
    }

    // 2. Check if front passenger matches any docked bus that has space
    const waitingPassengers = this.state.passengers.filter((p) => p.state === 'WAITING');
    if (waitingPassengers.length > 0) {
      const front = waitingPassengers[0];

      // Find matching docked bus
      for (let i = 0; i < this.state.unlockedDocksCount; i++) {
        const slot = this.state.parkingSlots[i];
        if (slot && slot.vehicleId) {
          const bus = this.state.vehicles.find((v) => v.id === slot.vehicleId);
          if (
            bus &&
            bus.state === VehicleStateType.DOCKED &&
            bus.color === front.color &&
            bus.loadedPassengers < bus.capacity
          ) {
            // Board front passenger!
            this.state.passengers = this.state.passengers.map((p) =>
              p.id === front.id ? { ...p, state: 'LOADED' } : p
            );

            this.state.vehicles = this.state.vehicles.map((v) =>
              v.id === bus.id ? { ...v, loadedPassengers: v.loadedPassengers + 1 } : v
            );

            this.notify();
            return { type: 'BOARDED', passengerId: front.id, vehicleId: bus.id };
          }
        }
      }
    }

    // 3. Out of Moves Check
    if (this.state.moves <= 0 && !this.isLevelComplete()) {
      this.state.status = GameStatus.FAILED;
      this.notify();
      return { type: 'OUT_OF_MOVES' };
    }

    // 4. Gridlock Check
    if (PuzzleSolver.isGridlocked(this.state)) {
      this.notify();
      return { type: 'GRIDLOCKED' };
    }

    return { type: 'NONE' };
  }

  public isLevelComplete(): boolean {
    const allVehiclesExited = this.state.vehicles.every(
      (v) => v.state === VehicleStateType.EXITED
    );
    const allPassengersLoaded = this.state.passengers.every(
      (p) => p.state === 'LOADED'
    );
    return allVehiclesExited || allPassengersLoaded;
  }

  /**
   * Computes authoritative hint via PuzzleSolver.
   */
  public updateHint(): void {
    const bestMove = PuzzleSolver.findBestMove(this.state);
    if (bestMove) {
      this.state.activeHintVehicleId = bestMove.vehicleId;
      this.state.hintMessage = `💡 ${bestMove.reason}`;
    } else {
      this.state.activeHintVehicleId = null;
      this.state.hintMessage = '💡 Use a booster to unblock paths!';
    }
  }

  /**
   * Booster actions.
   */
  public useBooster(type: 'undo' | 'hint' | 'shuffle' | 'extraSpace' | 'passengerSwap'): boolean {
    switch (type) {
      case 'undo': {
        if (this.historyStack.length === 0) return false;
        if (this.state.availableBoosters.undo <= 0 && this.state.coins < 50) return false;

        if (this.state.availableBoosters.undo > 0) {
          this.state.availableBoosters.undo--;
        } else {
          this.state.coins -= 50;
        }

        const prev = this.historyStack.pop()!;
        this.state = prev;
        this.updateHint();
        this.notify();
        return true;
      }

      case 'hint': {
        this.updateHint();
        this.notify();
        return true;
      }

      case 'shuffle': {
        if (this.state.availableBoosters.shuffle <= 0 && this.state.coins < 80) return false;

        if (this.state.availableBoosters.shuffle > 0) {
          this.state.availableBoosters.shuffle--;
        } else {
          this.state.coins -= 80;
        }

        // Rotate trapped vehicles by 90 degrees to open new lanes
        this.state.vehicles = this.state.vehicles.map((v) => {
          if (v.state !== VehicleStateType.PARKED) return v;
          const dirs = [v.direction];
          // Cycle direction: UP -> RIGHT -> DOWN -> LEFT -> UP
          let nextDir = v.direction;
          if (v.direction === 'UP') nextDir = 'RIGHT' as any;
          else if (v.direction === 'RIGHT') nextDir = 'DOWN' as any;
          else if (v.direction === 'DOWN') nextDir = 'LEFT' as any;
          else if (v.direction === 'LEFT') nextDir = 'UP' as any;

          return { ...v, direction: nextDir };
        });

        this.updateHint();
        this.notify();
        return true;
      }

      case 'extraSpace': {
        if (this.state.unlockedDocksCount >= 6) return false;
        if (this.state.availableBoosters.extraSpace <= 0 && this.state.coins < 150) return false;

        if (this.state.availableBoosters.extraSpace > 0) {
          this.state.availableBoosters.extraSpace--;
        } else {
          this.state.coins -= 150;
        }

        this.state.unlockedDocksCount++;
        this.state.parkingSlots = this.state.parkingSlots.map((s, idx) =>
          idx < this.state.unlockedDocksCount ? { ...s, isUnlocked: true } : s
        );

        this.notify();
        return true;
      }

      case 'passengerSwap': {
        if (this.state.availableBoosters.passengerSwap <= 0 && this.state.coins < 90) return false;

        if (this.state.availableBoosters.passengerSwap > 0) {
          this.state.availableBoosters.passengerSwap--;
        } else {
          this.state.coins -= 90;
        }

        // Bring passengers matching any docked bus right to front
        const dockedColors = this.state.vehicles
          .filter((v) => v.state === VehicleStateType.DOCKED)
          .map((v) => v.color);

        const matching: PassengerState[] = [];
        const nonMatching: PassengerState[] = [];

        for (const p of this.state.passengers) {
          if (p.state !== 'WAITING') {
            matching.push(p);
            continue;
          }
          if (dockedColors.includes(p.color)) {
            matching.push(p);
          } else {
            nonMatching.push(p);
          }
        }

        this.state.passengers = [...matching, ...nonMatching];
        this.notify();
        return true;
      }
    }
  }

  public addCoins(amount: number): void {
    this.state.coins += amount;
    this.notify();
  }

  public addMoves(amount: number): void {
    this.state.moves += amount;
    if (this.state.status === GameStatus.FAILED) {
      this.state.status = GameStatus.PLAYING;
    }
    this.notify();
  }
}
