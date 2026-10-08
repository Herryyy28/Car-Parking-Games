import * as THREE from 'three';

export type CameraMode =
  | 'EXPLORATION'
  | 'VEHICLE_FOLLOW'
  | 'TURN_CAM'
  | 'PARKING_CAM'
  | 'COMPLETION'
  | 'CINEMATIC_INTRO';

export interface CameraModeInfo {
  mode: CameraMode;
  label: string;
  icon: string;
  description: string;
}

export const CAMERA_MODE_METADATA: Record<CameraMode, CameraModeInfo> = {
  CINEMATIC_INTRO: {
    mode: 'CINEMATIC_INTRO',
    label: 'Intro Sweep',
    icon: '🎬',
    description: 'High-altitude dramatic flyover surveying the puzzle',
  },
  EXPLORATION: {
    mode: 'EXPLORATION',
    label: 'Exploration',
    icon: '🧭',
    description: 'Free isometric overview with smooth pan & orbit',
  },
  VEHICLE_FOLLOW: {
    mode: 'VEHICLE_FOLLOW',
    label: 'Chase Follow',
    icon: '🏎️',
    description: 'Dynamic 3rd-person chase camera leading moving vehicle',
  },
  TURN_CAM: {
    mode: 'TURN_CAM',
    label: 'Curved Turn',
    icon: '🔄',
    description: 'Angled sweep highlighting wheel steering & body roll',
  },
  PARKING_CAM: {
    mode: 'PARKING_CAM',
    label: 'Docking Cam',
    icon: '🅿️',
    description: 'Close top-angled focus on passenger bay arrival',
  },
  COMPLETION: {
    mode: 'COMPLETION',
    label: 'Victory Vista',
    icon: '🏆',
    description: 'Slow celebratory orbit around the cleared arena',
  },
};

/**
 * Dynamic 3D Camera Controller
 * Smoothly interpolates between exploration, follow, turn, parking, and cinematic angles.
 * Features:
 * - Speed-independent exponential damping (no snapping)
 * - Spherical orbital coordinates for organic exploration with momentum
 * - Dynamic leading & turn-banking during vehicle motion
 * - Contextual auto-director with manual exploration override
 * - Screen shake impulses for physical collisions and departures
 * - Dynamic FOV blending
 */
export class DynamicCameraController {
  private camera: THREE.PerspectiveCamera;

  // Active state
  private mode: CameraMode = 'CINEMATIC_INTRO';
  private autoDirectorEnabled = true;
  private onModeChangeCallback?: (mode: CameraMode) => void;

  // Position and look-at interpolation targets
  private currentPosition: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private currentLookAt: THREE.Vector3;
  private targetLookAt: THREE.Vector3;

  // Dynamic FOV
  private defaultFOV = 52;
  private currentFOV = 52;
  private targetFOV = 52;

  // Camera Roll / Banking
  private currentRoll = 0;
  private targetRoll = 0;

  // Exploration Spherical Orbit
  private orbitRadius = 31.0;
  private targetOrbitRadius = 31.0;
  private orbitTheta = 0; // horizontal angle in radians
  private targetOrbitTheta = 0;
  private orbitPhi = Math.PI / 4.4; // elevation angle in radians
  private targetOrbitPhi = Math.PI / 4.4;

  private orbitPanTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 1.2);
  private targetOrbitPanTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 1.2);

  // Cinematic Intro animation
  private introProgress = 0;
  private introDuration = 1.9; // seconds
  private introStartPos = new THREE.Vector3(0, 46, 38);
  private introStartLookAt = new THREE.Vector3(0, 0, 6.0);

  // Completion Orbit animation
  private completionTime = 0;

  // Screen shake / rumble
  private shakeIntensity = 0;
  private shakeDecay = 6.0;
  private shakeOffset = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.defaultFOV = camera.fov || 52;
    this.currentFOV = this.defaultFOV;
    this.targetFOV = this.defaultFOV;

    this.currentPosition = new THREE.Vector3().copy(this.introStartPos);
    this.targetPosition = new THREE.Vector3(0, 24, 21);
    this.currentLookAt = new THREE.Vector3().copy(this.introStartLookAt);
    this.targetLookAt = new THREE.Vector3(0, 0, 1.2);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  public setOnModeChange(callback: (mode: CameraMode) => void): void {
    this.onModeChangeCallback = callback;
  }

  public getMode(): CameraMode {
    return this.mode;
  }

  public isAutoDirector(): boolean {
    return this.autoDirectorEnabled;
  }

  public setAutoDirector(enabled: boolean): void {
    this.autoDirectorEnabled = enabled;
    if (!enabled && this.mode !== 'EXPLORATION') {
      this.setMode('EXPLORATION');
    }
  }

  /**
   * Set camera mode with smooth transition
   */
  public setMode(newMode: CameraMode, force = false): void {
    if (this.mode === newMode && !force) return;

    const prevMode = this.mode;
    this.mode = newMode;

    if (this.onModeChangeCallback) {
      this.onModeChangeCallback(newMode);
    }

    if (newMode === 'EXPLORATION') {
      this.targetFOV = this.defaultFOV;
      this.targetRoll = 0;
      this.computeExplorationTarget();
    } else if (newMode === 'PARKING_CAM') {
      this.targetFOV = 46; // slight zoom-in for intimate boarding view
      this.targetRoll = 0;
    } else if (newMode === 'VEHICLE_FOLLOW') {
      this.targetFOV = 50;
    } else if (newMode === 'TURN_CAM') {
      this.targetFOV = 54; // wider view during high G turn
    } else if (newMode === 'COMPLETION') {
      this.targetFOV = 50;
      this.completionTime = 0;
    } else if (newMode === 'CINEMATIC_INTRO') {
      this.introProgress = 0;
      this.targetFOV = 55;
    }
  }

  /**
   * Resets cinematic entrance approach when a new level begins
   */
  public triggerLevelEntrance(): void {
    this.introProgress = 0;
    this.introStartPos.set(0, 48, 38);
    this.introStartLookAt.set(0, 0, 6.0);
    this.currentPosition.copy(this.introStartPos);
    this.currentLookAt.copy(this.introStartLookAt);
    this.setMode('CINEMATIC_INTRO', true);
  }

  /**
   * Add physical vibration / impulse (e.g. engine burst, obstacle collision)
   */
  public addShake(intensity = 0.4): void {
    this.shakeIntensity = Math.min(1.5, this.shakeIntensity + intensity);
  }

  /**
   * Interactive drag rotation for Exploration mode
   */
  public onPointerDrag(deltaX: number, deltaY: number): void {
    if (this.mode === 'CINEMATIC_INTRO') {
      // User interaction skips intro
      this.setMode('EXPLORATION');
    }

    // Horizontal rotation with soft clamping
    this.targetOrbitTheta = Math.max(-0.55, Math.min(0.55, this.targetOrbitTheta - deltaX * 0.0035));
    // Vertical elevation angle: clamp between 24 deg and 75 deg
    this.targetOrbitPhi = Math.max(0.42, Math.min(Math.PI / 2.35, this.targetOrbitPhi - deltaY * 0.0035));

    if (this.mode !== 'EXPLORATION' && !this.autoDirectorEnabled) {
      this.setMode('EXPLORATION');
    }
    this.computeExplorationTarget();
  }

  /**
   * Interactive panning across lot
   */
  public onPointerPan(deltaX: number, deltaY: number): void {
    const panFactor = 0.025;
    // Calculate lateral and forward pan relative to current theta
    const cosT = Math.cos(this.targetOrbitTheta);
    const sinT = Math.sin(this.targetOrbitTheta);

    const worldDx = (-deltaX * cosT) * panFactor;
    const worldDz = (-deltaY * 1.0 + deltaX * sinT) * panFactor;

    this.targetOrbitPanTarget.x = Math.max(-8, Math.min(8, this.targetOrbitPanTarget.x + worldDx));
    this.targetOrbitPanTarget.z = Math.max(-10, Math.min(12, this.targetOrbitPanTarget.z + worldDz));

    this.computeExplorationTarget();
  }

  /**
   * Smooth zoom (wheel or pinch)
   */
  public onZoom(deltaZoom: number): void {
    this.targetOrbitRadius = Math.max(18.0, Math.min(46.0, this.targetOrbitRadius + deltaZoom));
    this.computeExplorationTarget();
  }

  /**
   * Reset exploration camera to default sweet-spot isometric framing
   */
  public resetView(): void {
    this.targetOrbitRadius = 31.0;
    this.targetOrbitTheta = 0;
    this.targetOrbitPhi = Math.PI / 4.4;
    this.targetOrbitPanTarget.set(0, 0, 1.2);
    this.targetRoll = 0;
    this.targetFOV = this.defaultFOV;
    this.setMode('EXPLORATION');
    this.computeExplorationTarget();
  }

  private computeExplorationTarget(): void {
    const rx = this.targetOrbitRadius * Math.sin(this.targetOrbitPhi) * Math.sin(this.targetOrbitTheta);
    const ry = this.targetOrbitRadius * Math.cos(this.targetOrbitPhi);
    const rz = this.targetOrbitRadius * Math.sin(this.targetOrbitPhi) * Math.cos(this.targetOrbitTheta);

    this.targetPosition.set(
      this.targetOrbitPanTarget.x + rx,
      ry,
      this.targetOrbitPanTarget.z + rz
    );
    this.targetLookAt.copy(this.targetOrbitPanTarget);
  }

  /**
   * Follow an active moving vehicle with physics lead, steering anticipation, and turning cam
   */
  public followMovingVehicle(
    vehiclePos: THREE.Vector3,
    velocity: number,
    heading: number,
    steeringAngle = 0,
    progressAlongCurve = 0
  ): void {
    if (!this.autoDirectorEnabled && this.mode === 'EXPLORATION') {
      return; // Respect user manual exploration lock
    }

    // Determine appropriate sub-behavior:
    // If steering angle is sharp (> 0.16 rad), transition to TURN_CAM
    const isSharpTurn = Math.abs(steeringAngle) > 0.16;
    // If progress is high (> 0.85) and nearing arrival dock (z < -8)
    const isDocking = progressAlongCurve > 0.85 || vehiclePos.z < -8.5;

    if (isDocking) {
      if (this.mode !== 'PARKING_CAM') {
        this.setMode('PARKING_CAM');
      }
      this.applyParkingCamFraming(vehiclePos);
      return;
    }

    if (isSharpTurn) {
      if (this.mode !== 'TURN_CAM') {
        this.setMode('TURN_CAM');
      }
      this.applyTurnCamFraming(vehiclePos, velocity, heading, steeringAngle);
      return;
    }

    // Otherwise standard VEHICLE_FOLLOW
    if (this.mode !== 'VEHICLE_FOLLOW') {
      this.setMode('VEHICLE_FOLLOW');
    }
    this.applyFollowCamFraming(vehiclePos, velocity, heading);
  }

  /**
   * Standard 3rd-person chase camera with dynamic speed lead
   */
  private applyFollowCamFraming(vehiclePos: THREE.Vector3, velocity: number, heading: number): void {
    // Dynamic lead forward
    const speedRatio = Math.min(1.0, velocity / 9.0);
    const leadDist = 1.2 + speedRatio * 2.8;
    const forwardX = Math.sin(heading) * leadDist;
    const forwardZ = -Math.cos(heading) * leadDist;

    // Look-at leads slightly ahead of vehicle
    this.targetLookAt.set(
      vehiclePos.x + forwardX * 0.45,
      0.8,
      vehiclePos.z + forwardZ * 0.45
    );

    // Camera offset behind vehicle with elevated angle
    const chaseDistance = 14.5 + speedRatio * 3.5;
    const chaseElevation = 18.0 + speedRatio * 2.0;

    // Lateral offset based on world position to maintain arena visibility
    const lateralShift = (vehiclePos.x / 14.0) * 4.0;

    this.targetPosition.set(
      vehiclePos.x * 0.5 + lateralShift,
      chaseElevation,
      vehiclePos.z * 0.4 + chaseDistance
    );

    // Subtle banking into motion
    this.targetRoll = (vehiclePos.x / 14.0) * -0.04;
  }

  /**
   * Angled sweeping Turn Cam showcasing turning arc & body roll
   */
  private applyTurnCamFraming(
    vehiclePos: THREE.Vector3,
    velocity: number,
    heading: number,
    steeringAngle: number
  ): void {
    const turnDir = Math.sign(steeringAngle); // +1 right, -1 left

    // Outside camera placement gives the best vantage of tire articulation
    const outsideOffset = -turnDir * 5.5;

    this.targetLookAt.set(
      vehiclePos.x + Math.sin(heading) * 2.0,
      0.9,
      vehiclePos.z - Math.cos(heading) * 2.0
    );

    this.targetPosition.set(
      vehiclePos.x + outsideOffset,
      17.5,
      vehiclePos.z + 13.5
    );

    // Dynamic banking roll in direction of turn
    this.targetRoll = turnDir * 0.05;
  }

  /**
   * Intimate docking camera focusing on passenger boarding and parking precision
   */
  private applyParkingCamFraming(vehiclePos: THREE.Vector3): void {
    this.targetLookAt.set(
      vehiclePos.x,
      0.7,
      vehiclePos.z - 0.5
    );

    // Tighter 45-degree angle framing the passenger dock stall
    this.targetPosition.set(
      vehiclePos.x * 0.35,
      15.0,
      vehiclePos.z + 12.0
    );

    this.targetRoll = 0;
  }

  /**
   * Return target framing to center parking lot (Exploration / Neutral)
   */
  public returnToNeutralView(): void {
    if (this.mode === 'CINEMATIC_INTRO' || this.mode === 'COMPLETION') return;

    if (this.mode !== 'EXPLORATION') {
      this.setMode('EXPLORATION');
    }
    this.computeExplorationTarget();
  }

  /**
   * Smooth ease on victory/completion with sweeping celebration orbit
   */
  public focusCelebrationView(): void {
    if (this.mode !== 'COMPLETION') {
      this.setMode('COMPLETION');
    }
  }

  /**
   * Main per-frame update loop
   */
  public update(delta: number, isDraggingManual: boolean): void {
    // Decay shake
    if (this.shakeIntensity > 0.001) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * this.shakeDecay);
      const s = this.shakeIntensity * 0.25;
      this.shakeOffset.set(
        (Math.random() - 0.5) * s,
        (Math.random() - 0.5) * s,
        (Math.random() - 0.5) * s
      );
    } else {
      this.shakeOffset.set(0, 0, 0);
    }

    // 1. Cinematic Intro Progression
    if (this.mode === 'CINEMATIC_INTRO') {
      this.introProgress += delta / this.introDuration;
      const t = Math.min(1.0, this.introProgress);

      // Smooth ease-out cubic
      const easeT = 1 - Math.pow(1 - t, 3);

      const targetPos = new THREE.Vector3(0, 24, 21);
      const targetLook = new THREE.Vector3(0, 0, 1.2);

      this.currentPosition.lerpVectors(this.introStartPos, targetPos, easeT);
      this.currentLookAt.lerpVectors(this.introStartLookAt, targetLook, easeT);

      if (t >= 1.0) {
        this.setMode('EXPLORATION');
      }
    }

    // 2. Victory Celebration Orbit
    else if (this.mode === 'COMPLETION') {
      this.completionTime += delta * 0.35; // gentle slow orbit
      const orbitRad = 26.0;
      const celebrationElevation = 18.0 + Math.sin(this.completionTime * 1.5) * 2.0;

      this.targetPosition.set(
        Math.sin(this.completionTime) * orbitRad,
        celebrationElevation,
        Math.cos(this.completionTime) * orbitRad + 1.2
      );
      this.targetLookAt.set(0, 0, -1.0);
    }

    // 3. Smooth Damping to Target
    // Exponential smoothing: 1 - exp(-speed * delta) ensures framerate independence
    const posBlend = 1 - Math.exp(-delta * 4.2);
    const lookBlend = 1 - Math.exp(-delta * 5.6);
    const fovBlend = 1 - Math.exp(-delta * 3.5);
    const rollBlend = 1 - Math.exp(-delta * 4.0);

    if (this.mode !== 'CINEMATIC_INTRO') {
      this.currentPosition.lerp(this.targetPosition, posBlend);
      this.currentLookAt.lerp(this.targetLookAt, lookBlend);
    }

    // Blend FOV
    this.currentFOV += (this.targetFOV - this.currentFOV) * fovBlend;
    if (Math.abs(this.camera.fov - this.currentFOV) > 0.05) {
      this.camera.fov = this.currentFOV;
      this.camera.updateProjectionMatrix();
    }

    // Blend Roll
    this.currentRoll += (this.targetRoll - this.currentRoll) * rollBlend;

    // Apply Position with Screen Shake
    this.camera.position.copy(this.currentPosition).add(this.shakeOffset);

    // Look at target with shake
    const finalLookAt = new THREE.Vector3().copy(this.currentLookAt).add(this.shakeOffset);
    this.camera.lookAt(finalLookAt);

    // Apply Camera Roll / Banking
    if (Math.abs(this.currentRoll) > 0.001) {
      this.camera.rotation.z += this.currentRoll;
    }
  }
}
