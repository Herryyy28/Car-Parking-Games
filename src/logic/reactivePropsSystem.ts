import * as THREE from 'three';
import { sounds } from '../utils/soundEffects.ts';

export interface ReactiveCone {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  initialPos: THREE.Vector3;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  isTipped: boolean;
  restTimer: number;
}

export interface BarrierGate {
  group: THREE.Group;
  boomArm: THREE.Group;
  ledLight: THREE.Mesh;
  triggerPos: THREE.Vector3;
  targetAngle: number;
  currentAngle: number;
  isOpen: boolean;
}

export interface SpringBollard {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  tiltAngleX: number;
  tiltAngleZ: number;
  tiltVelX: number;
  tiltVelZ: number;
}

/**
 * Destructible and Reactive Environment Props System.
 * - Dynamic Traffic Cones: Tumble, slide, and bounce when struck by moving vehicles.
 * - Automated Barrier Gates: Lift smoothly as vehicles approach and close after they pass.
 * - Spring Bollards: Wobble with damped harmonic oscillation when brushed.
 */
export class ReactivePropsSystem {
  private scene: THREE.Scene;
  private cones: ReactiveCone[] = [];
  private gates: BarrierGate[] = [];
  private bollards: SpringBollard[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initCones();
    this.initBarrierGates();
    this.initSpringBollards();
  }

  /**
   * Initializes interactive traffic cones with high-visibility reflective bands.
   */
  private initCones(): void {
    const conePositions: [number, number, number][] = [
      // Along perimeter curbs and road junctions
      [-9.8, 0.25, -2.5],
      [9.8, 0.25, -2.5],
      [-10.2, 0.25, 6.0],
      [10.2, 0.25, 6.0],
      [-9.5, 0.25, 14.2],
      [9.5, 0.25, 14.2],
      [-3.2, 0.25, -5.0],
      [3.2, 0.25, -5.0],
    ];

    conePositions.forEach(([x, y, z]) => {
      const coneGroup = new THREE.Group();
      coneGroup.position.set(x, y, z);

      // Base square pad
      const baseGeo = new THREE.BoxGeometry(0.7, 0.06, 0.7);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.8,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.03;
      baseMesh.castShadow = true;
      coneGroup.add(baseMesh);

      // Orange Cone Body
      const bodyGeo = new THREE.ConeGeometry(0.28, 0.75, 14);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        roughness: 0.35,
        metalness: 0.1,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = 0.4;
      bodyMesh.castShadow = true;
      coneGroup.add(bodyMesh);

      // White Reflective Band
      const bandGeo = new THREE.CylinderGeometry(0.19, 0.23, 0.16, 14);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        emissive: 0xffffff,
        emissiveIntensity: 0.2,
      });
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.position.y = 0.38;
      coneGroup.add(bandMesh);

      this.scene.add(coneGroup);

      this.cones.push({
        mesh: coneGroup,
        pos: new THREE.Vector3(x, y, z),
        initialPos: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, 0, 0),
        rotVelocity: new THREE.Vector3(0, 0, 0),
        isTipped: false,
        restTimer: 0,
      });
    });
  }

  /**
   * Initializes motorized boom barrier gates at docking terminal exits.
   */
  private initBarrierGates(): void {
    const gateLocations = [
      { x: -9.5, z: -5.8, side: 'LEFT' },
      { x: 9.5, z: -5.8, side: 'RIGHT' },
    ];

    gateLocations.forEach((loc) => {
      const gateGroup = new THREE.Group();
      gateGroup.position.set(loc.x, 0, loc.z);

      // Motor Cabinet Box
      const cabinetGeo = new THREE.BoxGeometry(0.65, 1.3, 0.65);
      const cabinetMat = new THREE.MeshStandardMaterial({
        color: 0xe11d48, // Vibrant safety red
        roughness: 0.4,
        metalness: 0.3,
      });
      const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
      cabinet.position.y = 0.65;
      cabinet.castShadow = true;
      gateGroup.add(cabinet);

      // Warning LED Beacon on top of cabinet
      const ledGeo = new THREE.SphereGeometry(0.12, 10, 10);
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xfacc15,
        emissiveIntensity: 1.5,
      });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.y = 1.38;
      gateGroup.add(led);

      // Pivot Group for the rotating boom arm
      const boomArmGroup = new THREE.Group();
      boomArmGroup.position.set(0, 1.1, 0);

      // Boom Arm with alternating Red & White reflective stripes
      const armLength = 4.2;
      const armGeo = new THREE.BoxGeometry(armLength, 0.12, 0.1);
      const armMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
      });
      const arm = new THREE.Mesh(armGeo, armMat);
      const armOffset = loc.side === 'LEFT' ? armLength / 2 : -armLength / 2;
      arm.position.x = armOffset;
      arm.castShadow = true;
      boomArmGroup.add(arm);

      // Red hazard stripes on boom
      for (let s = 0; s < 4; s++) {
        const stripeGeo = new THREE.BoxGeometry(0.4, 0.13, 0.11);
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        const sign = loc.side === 'LEFT' ? 1 : -1;
        stripe.position.x = sign * (0.6 + s * 0.9);
        boomArmGroup.add(stripe);
      }

      gateGroup.add(boomArmGroup);
      this.scene.add(gateGroup);

      this.gates.push({
        group: gateGroup,
        boomArm: boomArmGroup,
        ledLight: led,
        triggerPos: new THREE.Vector3(loc.x, 0, loc.z),
        targetAngle: 0,
        currentAngle: 0,
        isOpen: false,
      });
    });
  }

  /**
   * Initializes spring-mounted safety bollards that oscillate upon contact.
   */
  private initSpringBollards(): void {
    const bollardPositions: [number, number, number][] = [
      [-11.2, 0, 1.0],
      [11.2, 0, 1.0],
      [-11.2, 0, 9.5],
      [11.2, 0, 9.5],
    ];

    bollardPositions.forEach(([x, y, z]) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, y, z);

      // Steel base mount
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 0.15, 12),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 })
      );
      base.position.y = 0.075;
      bGroup.add(base);

      // Flexible bollard post
      const postGroup = new THREE.Group();
      postGroup.position.y = 0.15;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 1.1, 12),
        new THREE.MeshStandardMaterial({
          color: 0xfacc15, // Bright caution yellow
          roughness: 0.4,
          metalness: 0.2,
        })
      );
      post.position.y = 0.55;
      post.castShadow = true;
      postGroup.add(post);

      // Reflective black rings
      for (let r = 0; r < 2; r++) {
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(0.145, 0.145, 0.1, 12),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
        );
        ring.position.y = 0.7 + r * 0.25;
        postGroup.add(ring);
      }

      bGroup.add(postGroup);
      this.scene.add(bGroup);

      this.bollards.push({
        mesh: postGroup,
        pos: new THREE.Vector3(x, y, z),
        tiltAngleX: 0,
        tiltAngleZ: 0,
        tiltVelX: 0,
        tiltVelZ: 0,
      });
    });
  }

  /**
   * Main per-frame update loop for physics responses and gate automation.
   */
  public update(
    delta: number,
    elapsed: number,
    movingVehicles: Array<{ pos: THREE.Vector3; speed: number; heading: number }>
  ): void {
    const clampedDelta = Math.min(delta, 0.1);

    // ==========================================
    // 1. UPDATE TRAFFIC CONES PHYSICS & IMPACTS
    // ==========================================
    this.cones.forEach((cone) => {
      // Check collision with any moving vehicle
      movingVehicles.forEach((veh) => {
        if (veh.speed > 0.5) {
          const dist = cone.pos.distanceTo(veh.pos);
          if (dist < 1.45) {
            // Collision impulse!
            const impactDir = cone.pos.clone().sub(veh.pos).normalize();
            impactDir.y = 0.45; // pop into the air

            const impulseMag = Math.min(veh.speed * 0.75, 12.0);
            cone.velocity.add(impactDir.multiplyScalar(impulseMag));
            cone.rotVelocity.set(
              (Math.random() - 0.5) * 16,
              (Math.random() - 0.5) * 16,
              (Math.random() - 0.5) * 16
            );
            cone.isTipped = true;
            cone.restTimer = 0;

            // Play collision sound
            sounds.bump();
          }
        }
      });

      // Apply physics integration if moving/tipped
      if (cone.isTipped || cone.velocity.lengthSq() > 0.01) {
        // Gravity
        cone.velocity.y -= 18.0 * clampedDelta;

        // Position update
        cone.pos.x += cone.velocity.x * clampedDelta;
        cone.pos.y += cone.velocity.y * clampedDelta;
        cone.pos.z += cone.velocity.z * clampedDelta;

        // Ground collision & bounce
        const floorY = 0.25;
        if (cone.pos.y <= floorY) {
          cone.pos.y = floorY;
          cone.velocity.y = -cone.velocity.y * 0.35; // bouncy restitution
          cone.velocity.x *= 0.82; // surface friction
          cone.velocity.z *= 0.82;
          cone.rotVelocity.multiplyScalar(0.85);

          if (Math.abs(cone.velocity.y) < 0.2) {
            cone.velocity.y = 0;
          }
        }

        // Rotation integration
        cone.mesh.rotation.x += cone.rotVelocity.x * clampedDelta;
        cone.mesh.rotation.y += cone.rotVelocity.y * clampedDelta;
        cone.mesh.rotation.z += cone.rotVelocity.z * clampedDelta;

        // Keep mesh position in sync
        cone.mesh.position.copy(cone.pos);

        // Gradually decay movement
        if (cone.velocity.lengthSq() < 0.02) {
          cone.restTimer += clampedDelta;
          // Auto-reset cone after 6 seconds of rest so the area stays tidy
          if (cone.restTimer > 6.0) {
            cone.pos.lerp(cone.initialPos, 0.1);
            cone.mesh.rotation.x *= 0.9;
            cone.mesh.rotation.y *= 0.9;
            cone.mesh.rotation.z *= 0.9;
            cone.mesh.position.copy(cone.pos);

            if (cone.pos.distanceTo(cone.initialPos) < 0.05) {
              cone.pos.copy(cone.initialPos);
              cone.mesh.position.copy(cone.initialPos);
              cone.mesh.rotation.set(0, 0, 0);
              cone.velocity.set(0, 0, 0);
              cone.rotVelocity.set(0, 0, 0);
              cone.isTipped = false;
              cone.restTimer = 0;
            }
          }
        }
      }
    });

    // ==========================================
    // 2. UPDATE AUTOMATED BOOM BARRIER GATES
    // ==========================================
    this.gates.forEach((gate) => {
      // Detect if any vehicle is approaching the barrier gate
      let shouldOpen = false;
      movingVehicles.forEach((veh) => {
        const d = gate.triggerPos.distanceTo(veh.pos);
        if (d < 7.2) {
          shouldOpen = true;
        }
      });

      // Target angle: -Math.PI / 2 (open up 90 deg) or 0 (closed)
      gate.targetAngle = shouldOpen ? -Math.PI / 2.1 : 0;

      // Smooth hydraulic motor interpolation
      const motorSpeed = 3.8;
      gate.currentAngle = THREE.MathUtils.lerp(
        gate.currentAngle,
        gate.targetAngle,
        motorSpeed * clampedDelta
      );
      gate.boomArm.rotation.z = gate.currentAngle;

      // LED Warning Flasher
      const isMovingOrOpen = Math.abs(gate.currentAngle) > 0.05;
      const flash = isMovingOrOpen ? (Math.sin(elapsed * 10) > 0 ? 3.0 : 0.3) : 0.4;
      (gate.ledLight.material as THREE.MeshStandardMaterial).emissiveIntensity = flash;
    });

    // ==========================================
    // 3. UPDATE SPRING BOLLARDS (Harmonic Damping)
    // ==========================================
    this.bollards.forEach((bollard) => {
      // Check collision
      movingVehicles.forEach((veh) => {
        if (veh.speed > 0.5) {
          const dist = bollard.pos.distanceTo(veh.pos);
          if (dist < 1.35) {
            const pushX = (bollard.pos.x - veh.pos.x) * 0.45;
            const pushZ = (bollard.pos.z - veh.pos.z) * 0.45;
            bollard.tiltVelX += pushZ * 8;
            bollard.tiltVelZ -= pushX * 8;
          }
        }
      });

      // Spring physics (F = -kx - cv)
      const springStiffness = 32.0;
      const damping = 4.2;

      const accelX = -springStiffness * bollard.tiltAngleX - damping * bollard.tiltVelX;
      const accelZ = -springStiffness * bollard.tiltAngleZ - damping * bollard.tiltVelZ;

      bollard.tiltVelX += accelX * clampedDelta;
      bollard.tiltVelZ += accelZ * clampedDelta;

      bollard.tiltAngleX += bollard.tiltVelX * clampedDelta;
      bollard.tiltAngleZ += bollard.tiltVelZ * clampedDelta;

      // Apply rotation to mesh
      bollard.mesh.rotation.x = THREE.MathUtils.clamp(bollard.tiltAngleX, -0.6, 0.6);
      bollard.mesh.rotation.z = THREE.MathUtils.clamp(bollard.tiltAngleZ, -0.6, 0.6);
    });
  }

  /**
   * Cleans up geometries and removes meshes from the scene.
   */
  public dispose(): void {
    this.cones.forEach((c) => this.scene.remove(c.mesh));
    this.gates.forEach((g) => this.scene.remove(g.group));
    this.bollards.forEach((b) => this.scene.remove(b.mesh));
    this.cones = [];
    this.gates = [];
    this.bollards = [];
  }
}
