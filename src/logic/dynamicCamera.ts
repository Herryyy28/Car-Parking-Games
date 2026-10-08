import * as THREE from 'three';

/**
 * Dynamic cinematic camera controller.
 * Replaces fixed boxes with smooth physical spring interpolation:
 * Level Start: Smooth cinematic entrance approach
 * Vehicle Selection: Subtly pans & tracks vehicle
 * Cornering: Dynamically angles camera around the turn
 * Parking/Victory: Eases into focused vista framing
 */
export class DynamicCameraController {
  private camera: THREE.PerspectiveCamera;
  private currentPosition: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private currentLookAt: THREE.Vector3;
  private targetLookAt: THREE.Vector3;

  private isLevelIntro = true;
  private introProgress = 0;
  private introStartPos: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.currentPosition = new THREE.Vector3(0, 36, 32);
    this.targetPosition = new THREE.Vector3(0, 24, 21);
    this.currentLookAt = new THREE.Vector3(0, 0, 1.2);
    this.targetLookAt = new THREE.Vector3(0, 0, 1.2);

    this.introStartPos = new THREE.Vector3(0, 38, 34);
    this.camera.position.copy(this.introStartPos);
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Resets cinematic entrance approach when a new level begins
   */
  public triggerLevelEntrance(): void {
    this.isLevelIntro = true;
    this.introProgress = 0;
    this.introStartPos.set(0, 38, 34);
    this.targetPosition.set(0, 24, 21);
    this.targetLookAt.set(0, 0, 1.2);
  }

  /**
   * Smoothly follow an active moving vehicle
   */
  public followMovingVehicle(vehiclePos: THREE.Vector3, velocity: number, heading: number): void {
    // Lead slightly in front of moving vehicle
    const leadDistance = Math.min(2.5, velocity * 0.15);
    const forwardX = Math.sin(heading) * leadDistance;
    const forwardZ = -Math.cos(heading) * leadDistance;

    this.targetLookAt.set(
      vehiclePos.x * 0.45 + forwardX * 0.5,
      0.6,
      vehiclePos.z * 0.45 + forwardZ * 0.5
    );

    // Dynamic camera angle shift on turns
    const lateralCamOffset = (vehiclePos.x / 14.0) * 3.5;
    this.targetPosition.set(
      lateralCamOffset,
      23.0 - Math.min(2.0, velocity * 0.08),
      20.5 + (vehiclePos.z / 18.0) * 2.0
    );
  }

  /**
   * Reset target framing to center parking hub
   */
  public returnToNeutralView(): void {
    this.targetPosition.set(0, 24, 21);
    this.targetLookAt.set(0, 0, 1.2);
  }

  /**
   * Smooth ease on victory/completion
   */
  public focusCelebrationView(): void {
    this.targetPosition.set(0, 20, 18);
    this.targetLookAt.set(0, 0, -1.0);
  }

  /**
   * Updates spring interpolation per frame
   */
  public update(delta: number, isDraggingManual: boolean): void {
    if (isDraggingManual) return;

    if (this.isLevelIntro) {
      this.introProgress += delta * 1.2;
      const t = Math.min(1.0, this.introProgress);
      // Smooth cubic ease out
      const easeT = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(this.introStartPos, this.targetPosition, easeT);
      this.camera.lookAt(this.targetLookAt);

      if (t >= 1.0) {
        this.isLevelIntro = false;
        this.currentPosition.copy(this.camera.position);
      }
      return;
    }

    // Natural smooth damping
    const posDamp = Math.min(1.0, delta * 3.8);
    const lookDamp = Math.min(1.0, delta * 5.2);

    this.camera.position.lerp(this.targetPosition, posDamp);
    this.currentLookAt.lerp(this.targetLookAt, lookDamp);
    this.camera.lookAt(this.currentLookAt);
  }
}
