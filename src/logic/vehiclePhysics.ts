import * as THREE from 'three';

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
}

export class NaturalVehiclePhysics {
  /**
   * Initializes physics state for a newly moving vehicle along a spline curve.
   */
  public static initMotion(
    startPos: THREE.Vector3,
    curve: THREE.CatmullRomCurve3,
    isBus: boolean,
    initialHeading = 0
  ): NaturalPhysicsState {
    const points = curve.getPoints(50);
    let totalLen = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalLen += points[i].distanceTo(points[i + 1]);
    }

    return {
      position: startPos.clone(),
      velocity: 0.2,
      targetSpeed: isBus ? 14.0 : 17.5,
      acceleration: isBus ? 18.0 : 25.0,
      brakingPower: isBus ? 22.0 : 30.0,
      headingAngle: initialHeading,
      steeringAngle: 0,
      bodyRollAngle: 0,
      bodyPitchAngle: -0.06, // initial acceleration squat
      suspensionOffset: 0,
      wheelRotation: 0,
      motionState: VehicleMotionState.ACCELERATING,
      curve,
      pathT: 0,
      pathLength: Math.max(1, totalLen),
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

    // 1. Calculate remaining distance to destination
    const remainingDist = (1 - physics.pathT) * physics.pathLength;
    const stoppingDist = (physics.velocity * physics.velocity) / (2 * physics.brakingPower);

    // 2. State machine transitions
    if (physics.pathT >= 0.98 || remainingDist < 0.4) {
      physics.motionState = VehicleMotionState.PARKING;
      physics.targetSpeed = 2.5;
    } else if (remainingDist <= stoppingDist * 1.35) {
      physics.motionState = VehicleMotionState.BRAKING;
      physics.targetSpeed = 1.0;
    } else if (Math.abs(physics.steeringAngle) > 0.15) {
      physics.motionState = VehicleMotionState.STEERING;
      physics.targetSpeed = physics.targetSpeed * 0.85;
    } else if (physics.velocity > 8.0) {
      physics.motionState = VehicleMotionState.CRUISING;
    }

    // 3. Acceleration / Deceleration physics
    if (physics.velocity < physics.targetSpeed) {
      physics.velocity = Math.min(
        physics.targetSpeed,
        physics.velocity + physics.acceleration * delta
      );
      // Nose lifts slightly on hard acceleration
      physics.bodyPitchAngle = THREE.MathUtils.lerp(physics.bodyPitchAngle, -0.05, delta * 6);
    } else {
      physics.velocity = Math.max(
        0.5,
        physics.velocity - physics.brakingPower * delta
      );
      // Nose dives slightly during braking
      physics.bodyPitchAngle = THREE.MathUtils.lerp(physics.bodyPitchAngle, 0.07, delta * 8);
    }

    // 4. Progress along spline
    const distanceStep = physics.velocity * delta;
    physics.pathT = Math.min(1.0, physics.pathT + distanceStep / physics.pathLength);

    // Sample current & next point on curve
    const currentPoint = physics.curve.getPointAt(physics.pathT);
    const lookAheadT = Math.min(1.0, physics.pathT + 0.05);
    const lookAheadPoint = physics.curve.getPointAt(lookAheadT);

    physics.position.copy(currentPoint);

    // 5. Natural Steering & Heading Calculation
    const moveDir = new THREE.Vector3().subVectors(lookAheadPoint, currentPoint);
    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
      const targetHeading = Math.atan2(moveDir.x, -moveDir.z);

      // Smooth heading interpolation
      const angleDiff = THREE.MathUtils.euclideanModulo(targetHeading - physics.headingAngle + Math.PI, Math.PI * 2) - Math.PI;
      physics.headingAngle += angleDiff * Math.min(1.0, delta * 14.0);

      // Front wheels turn in the direction of curvature
      const desiredSteer = Math.max(-0.48, Math.min(0.48, angleDiff * 3.5));
      physics.steeringAngle = THREE.MathUtils.lerp(physics.steeringAngle, desiredSteer, delta * 12.0);

      // Chassis roll (lean outward into the turn centrifugal force)
      const targetRoll = -desiredSteer * (physics.velocity / 18.0) * 0.16;
      physics.bodyRollAngle = THREE.MathUtils.lerp(physics.bodyRollAngle, targetRoll, delta * 8.0);
    } else {
      physics.steeringAngle = THREE.MathUtils.lerp(physics.steeringAngle, 0, delta * 8.0);
      physics.bodyRollAngle = THREE.MathUtils.lerp(physics.bodyRollAngle, 0, delta * 8.0);
    }

    // 6. Natural suspension bounce & tire rotation
    const suspensionFrequency = 16.0;
    physics.suspensionOffset = Math.sin(elapsed * suspensionFrequency + physics.pathT * 20.0) * 0.015 * (physics.velocity / 12.0);

    const tireRadius = 0.35;
    physics.wheelRotation += distanceStep / tireRadius;

    // Check if journey reached destination dock
    return physics.pathT >= 0.999;
  }
}
