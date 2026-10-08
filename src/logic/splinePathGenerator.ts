import * as THREE from 'three';
import { Direction } from './types.ts';

/**
 * Procedural Bézier and Catmull-Rom spline path generator for natural vehicle routing.
 * Constructs smooth, physically plausible travel trajectories through parking alleys,
 * rounded turns, corner apexes, and onto dock bays without abrupt geometric corners.
 */
export class SplinePathGenerator {
  /**
   * Generates a CatmullRomCurve3 connecting a starting parking spot through curved
   * feeder roads and onto the bus dock terminal bay.
   */
  public static generatePathToDock(
    startPos: THREE.Vector3,
    direction: Direction,
    targetDockX: number,
    targetDockZ: number
  ): THREE.CatmullRomCurve3 {
    const points: THREE.Vector3[] = [];
    const y = startPos.y;

    // Point 1: Start position
    points.push(startPos.clone());

    if (direction === Direction.UP) {
      // Vehicle pointing North towards the bus terminal
      // 1. Initial acceleration rollout straight ahead
      const rolloutZ = startPos.z - 2.8;
      points.push(new THREE.Vector3(startPos.x, y, rolloutZ));

      // 2. Smooth S-curve / lateral lane merger toward dock X
      const midZ = (rolloutZ + -4.8) * 0.5;
      const midX = (startPos.x + targetDockX) * 0.5;
      points.push(new THREE.Vector3(midX, y, midZ));

      // 3. Pre-dock alignment straightener
      points.push(new THREE.Vector3(targetDockX, y, -5.2));

      // 4. Final docking approach
      points.push(new THREE.Vector3(targetDockX, y, targetDockZ));
    } else if (direction === Direction.RIGHT) {
      // Vehicle pointing East (+X)
      // 1. Roll out eastward along current row
      const rolloutX = Math.min(11.8, Math.max(startPos.x + 3.0, 9.5));
      points.push(new THREE.Vector3(rolloutX, y, startPos.z));

      // 2. Smooth sweeping round turn into north-bound perimeter arterial
      const apexZ = Math.max(-2.5, startPos.z - 3.5);
      points.push(new THREE.Vector3(12.4, y, apexZ));

      // 3. Round turn onto northern boulevard
      points.push(new THREE.Vector3(10.5, y, -4.6));

      // 4. Curve inbound toward dock bay
      const midDockX = (10.5 + targetDockX) * 0.5;
      points.push(new THREE.Vector3(midDockX, y, -5.0));
      points.push(new THREE.Vector3(targetDockX, y, -5.6));

      // 5. Final docking slot
      points.push(new THREE.Vector3(targetDockX, y, targetDockZ));
    } else if (direction === Direction.LEFT) {
      // Vehicle pointing West (-X)
      // 1. Roll out westward along current row
      const rolloutX = Math.max(-11.8, Math.min(startPos.x - 3.0, -9.5));
      points.push(new THREE.Vector3(rolloutX, y, startPos.z));

      // 2. Smooth sweeping round turn into north-bound west arterial
      const apexZ = Math.max(-2.5, startPos.z - 3.5);
      points.push(new THREE.Vector3(-12.4, y, apexZ));

      // 3. Round turn onto northern boulevard
      points.push(new THREE.Vector3(-10.5, y, -4.6));

      // 4. Curve inbound toward dock bay
      const midDockX = (-10.5 + targetDockX) * 0.5;
      points.push(new THREE.Vector3(midDockX, y, -5.0));
      points.push(new THREE.Vector3(targetDockX, y, -5.6));

      // 5. Final docking slot
      points.push(new THREE.Vector3(targetDockX, y, targetDockZ));
    } else {
      // Direction.DOWN (+Z)
      // Drives southward, loops through south roundabout/feeder curve, and enters docks
      const sideX = startPos.x >= 0 ? 12.2 : -12.2;
      const southTurnZ = Math.min(15.2, startPos.z + 3.5);

      // 1. Roll out south
      points.push(new THREE.Vector3(startPos.x, y, southTurnZ));

      // 2. Sweeping corner into side perimeter road
      points.push(new THREE.Vector3(sideX * 0.75, y, 14.8));
      points.push(new THREE.Vector3(sideX, y, 12.0));

      // 3. High-speed perimeter bypass cruising northbound
      points.push(new THREE.Vector3(sideX * 1.02, y, 4.5));
      points.push(new THREE.Vector3(sideX * 0.95, y, -2.0));

      // 4. Sweeping curve into north terminal boulevard
      points.push(new THREE.Vector3(sideX * 0.6, y, -4.8));
      points.push(new THREE.Vector3(targetDockX, y, -5.4));

      // 5. Dock target
      points.push(new THREE.Vector3(targetDockX, y, targetDockZ));
    }

    // Centripetal Catmull-Rom spline ensures no overshoot loops or pinching
    const spline = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    return spline;
  }
}
