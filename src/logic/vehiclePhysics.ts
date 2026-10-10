import * as THREE from 'three';
import { getVehiclePhysicsConfig, VehiclePhysicsConfig } from './vehiclePhysicsPresets.ts';

export enum VehicleMotionState {
  IDLE = 'IDLE',
  ACCELERATING = 'ACCELERATING',
  STEERING = 'STEERING',
  CRUISING = 'CRUISING',
  BRAKING = 'BRAKING',
  PARKING = 'PARKING',
  PARKED = 'PARKED',
  BUMPING = 'BUMPING',
}

export interface NaturalPhysicsState {
  position: THREE.Vector3;
  velocity: number;            // current linear speed
  targetSpeed: number;         // desired cruise speed
  acceleration: number;        // rate of speed increase
  brakingPower: number;        // deceleration rate
  headingAngle: number;        // yaw angle (radians)
  steeringAngle: number;       // front wheels turn angle
  bodyRollAngle: number;       // lateral chassis roll during turns
  bodyPitchAngle: number;      // forward/backward squat on accel/brake
  suspensionOffset: number;    // vertical natural bounce
  wheelRotation: number;       // spin angle of rolling tires
  motionState: VehicleMotionState;
  curve: THREE.CatmullRomCurve3 | null;
  pathT: number;               // parameter 0..1 along curve
  pathLength: number;
  config: VehiclePhysicsConfig;
  initialHeading?: number;
  timeInMotion?: number;
}

export class NaturalVehiclePhysics {
  /**
   * Initializes physics state for a newly moving vehicle along a spline curve.
   */
  public static initMotion(
    startPos: THREE.Vector3,
    curve: THREE.CatmullRomCurve3,
    vehicleType: string,
    initialHeading = 0
  ): NaturalPhysicsState {
    const config = getVehiclePhysicsConfig(vehicleType);
    const points = curve.getPoints(50);
    let totalLen = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalLen += points[i].distanceTo(points[i + 1]);
    }

    return {
      position: startPos.clone(),
      velocity: 0.1, // Smooth rolling start from standstill
      targetSpeed: config.targetSpeed,
      acceleration: config.acceleration,
      brakingPower: config.brakingPower,
      headingAngle: initialHeading,
      steeringAngle: 0,
      bodyRollAngle: 0,
      bodyPitchAngle: -0.05 * (config.mass / 2000), // initial gentle launch squat
      suspensionOffset: 0,
      wheelRotation: 0,
      motionState: VehicleMotionState.ACCELERATING,
      curve,
      pathT: 0,
      pathLength: Math.max(1, totalLen),
      config,
      initialHeading,
      timeInMotion: 0,
    };
  }

  /**
   * Updates natural physics & state transitions per delta frame time.
   */
  public static update(
    physics: NaturalPhysicsState,
    delta: number,
    elapsed: number
  ): boolean {
    if (!physics.curve) return true;

    physics.timeInMotion = (physics.timeInMotion ?? 0) + delta;
    const cfg = physics.config;

    // 1. Calculate remaining distance to destination
    const remainingDist = (1 - physics.pathT) * physics.pathLength;
    const stoppingDist = (physics.velocity * physics.velocity) / (2 * physics.brakingPower);

    // 2. State machine transitions
    if (physics.pathT >= 0.98 || remainingDist < 0.4) {
      physics.motionState = VehicleMotionState.PARKING;
      physics.targetSpeed = 2.0;
    } else if (remainingDist <= stoppingDist * 1.35) {
      physics.motionState = VehicleMotionState.BRAKING;
      physics.targetSpeed = 1.0;
    } else if (Math.abs(physics.steeringAngle) > 0.12) {
      physics.motionState = VehicleMotionState.STEERING;
      physics.targetSpeed = cfg.targetSpeed * 0.88;
    } else if (physics.velocity > 7.0) {
      physics.motionState = VehicleMotionState.CRUISING;
    }

    // 3. Smooth Acceleration Easing (Progressive Launch Profile out of Grid Slot)
    // When departing from the grid, vehicle smoothly ramps up torque rather than jumping abruptly
    const exitLaunchT = Math.min(1.0, physics.pathT / 0.18);
    // Cubic Hermite smoothstep curve: 0 at start, easing up to 1.0 as car leaves parking bay
    const launchRamp = exitLaunchT * exitLaunchT * (3.0 - 2.0 * exitLaunchT);
    const effectiveAcceleration = physics.acceleration * (0.2 + 0.8 * launchRamp);

    if (physics.velocity < physics.targetSpeed) {
      physics.velocity = Math.min(
        physics.targetSpeed,
        physics.velocity + effectiveAcceleration * delta
      );
      // Nose squat easing on launch: settles smoothly as vehicle reaches cruise speed
      const launchSquat = -0.12 * (1.0 - launchRamp) * (cfg.mass / 2000); // Increased squat for softer look
      const cruiseSquat = -0.02;
      const targetPitch = THREE.MathUtils.lerp(launchSquat, cruiseSquat, launchRamp);
      physics.bodyPitchAngle = THREE.MathUtils.lerp(physics.bodyPitchAngle, targetPitch, delta * 5.0); // Slower lerp for softer feel
    } else {
      physics.velocity = Math.max(
        0.5,
        physics.velocity - physics.brakingPower * delta
      );
      // Nose dives slightly during braking and parking
      physics.bodyPitchAngle = THREE.MathUtils.lerp(physics.bodyPitchAngle, 0.10, delta * 5.0); // More dive, softer lerp
    }

    // 4. Progress along spline
    const distanceStep = physics.velocity * delta;
    physics.pathT = Math.min(1.0, physics.pathT + distanceStep / physics.pathLength);

    // Sample current & next point on curve
    const currentPoint = physics.curve.getPointAt(physics.pathT);
    const lookAheadT = Math.min(1.0, physics.pathT + 0.05);
    const lookAheadPoint = physics.curve.getPointAt(lookAheadT);

    physics.position.copy(currentPoint);

    // 5. Smooth Rotation Easing & Natural Steering Calculation
    const moveDir = new THREE.Vector3().subVectors(lookAheadPoint, currentPoint);
    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
      // Correct coordinate mapping matching Three.js forward direction [0, 0, -1]
      const rawTargetHeading = Math.atan2(-moveDir.x, -moveDir.z);

      // Grid exit orientation blend:
      // While vehicle is physically rolling out of its parking stall (first 14% of path),
      // it smoothly eases from its initial grid angle into the arterial road spline
      const exitTurnT = Math.min(1.0, physics.pathT / 0.14);
      const rotationBlend = exitTurnT * exitTurnT * (3.0 - 2.0 * exitTurnT);
      const initialHeading = physics.initialHeading ?? physics.headingAngle;

      // Calculate minimal angular difference from initial heading to curve heading
      const splineHeadingDiff = THREE.MathUtils.euclideanModulo(rawTargetHeading - initialHeading + Math.PI, Math.PI * 2) - Math.PI;
      let targetHeading = initialHeading + splineHeadingDiff * rotationBlend;

      // Dock arrival alignment: smoothly ease heading straight towards North (0 rad) as it docks
      if (physics.pathT >= 0.88) {
        const dockAlignT = (physics.pathT - 0.88) / 0.12;
        const dockEase = dockAlignT * dockAlignT * (3.0 - 2.0 * dockAlignT);
        const dockDiff = THREE.MathUtils.euclideanModulo(0 - targetHeading + Math.PI, Math.PI * 2) - Math.PI;
        targetHeading += dockDiff * dockEase;
      }

      // Smooth rotational heading interpolation with exponential momentum damping
      const angleDiff = THREE.MathUtils.euclideanModulo(targetHeading - physics.headingAngle + Math.PI, Math.PI * 2) - Math.PI;
      const rotSteerSpeed = cfg.steeringSpeed * (0.65 + 0.35 * rotationBlend);
      const rotAlpha = 1.0 - Math.exp(-rotSteerSpeed * delta);
      physics.headingAngle += angleDiff * THREE.MathUtils.clamp(rotAlpha, 0.01, 0.95);

      // Front wheels turn smoothly into the curve clamped to maxSteerAngle
      const desiredSteer = THREE.MathUtils.clamp(
        angleDiff * 3.5 * rotationBlend,
        -cfg.maxSteerAngle,
        cfg.maxSteerAngle
      );
      physics.steeringAngle = THREE.MathUtils.lerp(physics.steeringAngle, desiredSteer, delta * 12.0);

      // Chassis roll (lean outward into the turn centrifugal force)
      const targetRoll = -desiredSteer * (physics.velocity / 12.0) * cfg.bodyRollFactor * 2.2; // Exaggerated roll
      physics.bodyRollAngle = THREE.MathUtils.lerp(physics.bodyRollAngle, targetRoll, delta * 5.0); // Softer transition
    } else {
      physics.steeringAngle = THREE.MathUtils.lerp(physics.steeringAngle, 0, delta * 8.0);
      physics.bodyRollAngle = THREE.MathUtils.lerp(physics.bodyRollAngle, 0, delta * 8.0);
    }

    // 6. Natural suspension bounce & tire rotation
    const suspensionFrequency = cfg.suspensionStiffness;
    // Softer, larger suspension bounce
    physics.suspensionOffset = Math.sin(elapsed * suspensionFrequency * 0.85 + physics.pathT * 15.0) * 0.045 * (physics.velocity / 6.0);

    const tireRadius = 0.35;
    physics.wheelRotation += distanceStep / tireRadius;

    // Check if journey reached destination dock
    return physics.pathT >= 0.999;
  }
}
