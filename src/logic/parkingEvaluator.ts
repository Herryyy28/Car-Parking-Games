import * as THREE from 'three';

export interface ParkingGrade {
  grade: 'PERFECT' | 'GOOD' | 'POOR';
  score: number;
  bonusCoins: number;
  message: string;
  alignmentErrorDeg: number;
  offsetErrorMeters: number;
}

export class AdvancedParkingEvaluator {
  /**
   * Calculates entry angle, vehicle orientation, boundary clearance,
   * and wheel alignment when parking inside a target dock bay.
   */
  public static evaluateDocking(
    finalPosition: THREE.Vector3,
    targetDockX: number,
    targetDockZ: number,
    finalHeading: number,
    finalSteerAngle: number,
    targetAngle: number = 0
  ): ParkingGrade {
    // Offset distance from center of dock bay
    const dx = Math.abs(finalPosition.x - targetDockX);
    const dz = Math.abs(finalPosition.z - targetDockZ);
    const offsetDist = Math.sqrt(dx * dx + dz * dz);

    // Orientation difference relative to target dock slant alignment
    const normalizedAngle = Math.abs(THREE.MathUtils.euclideanModulo(finalHeading - targetAngle + Math.PI, Math.PI * 2) - Math.PI);
    const angleDeg = (normalizedAngle * 180) / Math.PI;

    // Steering straightness (wheels centered = 0)
    const steerDeg = (Math.abs(finalSteerAngle) * 180) / Math.PI;

    // Penalty metrics
    const totalPenalty = offsetDist * 18 + angleDeg * 0.8 + steerDeg * 0.5;

    if (totalPenalty < 8.0) {
      return {
        grade: 'PERFECT',
        score: 100,
        bonusCoins: 15,
        message: '⭐ PERFECT PARKING! (+15 🪙)',
        alignmentErrorDeg: Math.round(angleDeg * 10) / 10,
        offsetErrorMeters: Math.round(offsetDist * 100) / 100,
      };
    } else if (totalPenalty < 22.0) {
      return {
        grade: 'GOOD',
        score: 85,
        bonusCoins: 5,
        message: '👍 GOOD PARKING! (+5 🪙)',
        alignmentErrorDeg: Math.round(angleDeg * 10) / 10,
        offsetErrorMeters: Math.round(offsetDist * 100) / 100,
      };
    } else {
      return {
        grade: 'POOR',
        score: 60,
        bonusCoins: 0,
        message: '⚠️ PARKING ACCEPTED',
        alignmentErrorDeg: Math.round(angleDeg * 10) / 10,
        offsetErrorMeters: Math.round(offsetDist * 100) / 100,
      };
    }
  }
}
