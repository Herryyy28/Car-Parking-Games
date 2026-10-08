import * as THREE from 'three';

export interface AmbientTrafficCar {
  id: string;
  type: 'SEDAN' | 'TAXI' | 'MINIBUS' | 'COUPE';
  mesh: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  progress: number;
  speed: number;
  colorHex: number;
  isStopped: boolean;
  stopTimer: number;
}

export class AmbientTrafficSystem {
  public trafficGroup: THREE.Group;
  private cars: AmbientTrafficCar[] = [];
  private loops: THREE.CatmullRomCurve3[] = [];

  constructor(scene: THREE.Scene) {
    this.trafficGroup = new THREE.Group();
    this.trafficGroup.name = 'AmbientTrafficSystem';
    scene.add(this.trafficGroup);

    this.createPerimeterLoops();
    this.spawnAmbientVehicles();
  }

  private createPerimeterLoops(): void {
    // Outer loop 1: Clockwise perimeter boulevard around terminal
    const loop1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-14.5, 0.28, 17.5),
      new THREE.Vector3(-15.2, 0.28, 6.0),
      new THREE.Vector3(-15.0, 0.28, -7.0),
      new THREE.Vector3(-8.0, 0.28, -8.2),
      new THREE.Vector3(0.0, 0.28, -8.4),
      new THREE.Vector3(8.0, 0.28, -8.2),
      new THREE.Vector3(15.0, 0.28, -7.0),
      new THREE.Vector3(15.2, 0.28, 6.0),
      new THREE.Vector3(14.5, 0.28, 17.5),
      new THREE.Vector3(0.0, 0.28, 18.0),
    ], true, 'centripetal');

    // Outer loop 2: Southern transit bypass route
    const loop2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(13.8, 0.28, 16.5),
      new THREE.Vector3(0.0, 0.28, 16.8),
      new THREE.Vector3(-13.8, 0.28, 16.5),
      new THREE.Vector3(-14.2, 0.28, 10.0),
      new THREE.Vector3(-14.0, 0.28, 2.0),
      new THREE.Vector3(-14.2, 0.28, 10.0),
    ], true, 'centripetal');

    this.loops = [loop1, loop2];
  }

  private spawnAmbientVehicles(): void {
    const carPalettes = [
      { hex: 0xfacc15, type: 'TAXI' as const },   // Yellow Taxi
      { hex: 0x38bdf8, type: 'SEDAN' as const },  // Sky Blue Sedan
      { hex: 0x4ade80, type: 'COUPE' as const },  // Lime Coupe
      { hex: 0xf43f5e, type: 'MINIBUS' as const },// Coral Minibus
    ];

    carPalettes.forEach((carCfg, idx) => {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: carCfg.hex,
        roughness: 0.3,
        metalness: 0.2,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 2.4), bodyMat);
      body.castShadow = true;
      group.add(body);

      const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.4), roofMat);
      roof.position.set(0, 0.5, -0.1);
      group.add(roof);

      // Headlights
      const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 1.5 });
      const hl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 8), hlMat);
      hl1.rotation.x = Math.PI / 2;
      hl1.position.set(-0.45, 0, -1.22);
      const hl2 = hl1.clone();
      hl2.position.x = 0.45;
      group.add(hl1, hl2);

      // Wheels
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const tireGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10);
      [
        [-0.72, -0.25, 0.7],
        [0.72, -0.25, 0.7],
        [-0.72, -0.25, -0.7],
        [0.72, -0.25, -0.7],
      ].forEach(([wx, wy, wz]) => {
        const t = new THREE.Mesh(tireGeo, tireMat);
        t.rotation.z = Math.PI / 2;
        t.position.set(wx, wy, wz);
        group.add(t);
      });

      this.trafficGroup.add(group);

      const curve = this.loops[idx % this.loops.length];
      this.cars.push({
        id: `ambient_${idx}`,
        type: carCfg.type,
        mesh: group,
        curve,
        progress: (idx * 0.25) % 1.0,
        speed: 0.035 + (idx % 2) * 0.015,
        colorHex: carCfg.hex,
        isStopped: false,
        stopTimer: 0,
      });
    });
  }

  public update(delta: number, elapsed: number): void {
    this.cars.forEach((car, i) => {
      // Occasional traffic stop simulation (e.g. crosswalk / traffic light yield)
      if (car.isStopped) {
        car.stopTimer -= delta;
        if (car.stopTimer <= 0) {
          car.isStopped = false;
        }
        return;
      }

      // 5% chance every 8 seconds to briefly slow down or yield at crosswalk
      if (Math.sin(elapsed * 0.5 + i * 2.3) > 0.96 && Math.random() < 0.02) {
        car.isStopped = true;
        car.stopTimer = 1.2 + Math.random() * 1.5;
        return;
      }

      car.progress = (car.progress + delta * car.speed) % 1.0;
      const pos = car.curve.getPointAt(car.progress);
      const nextT = (car.progress + 0.02) % 1.0;
      const nextPos = car.curve.getPointAt(nextT);

      car.mesh.position.set(pos.x, 0.55, pos.z);

      const dir = new THREE.Vector3().subVectors(nextPos, pos).normalize();
      if (dir.lengthSq() > 0.001) {
        const yaw = Math.atan2(dir.x, -dir.z);
        car.mesh.rotation.y = yaw;
      }
    });
  }

  public getVehiclesForCollision(): Array<{ pos: THREE.Vector3; speed: number; heading: number }> {
    return this.cars.map((c) => ({
      pos: c.mesh.position,
      speed: c.isStopped ? 0 : 8.0,
      heading: c.mesh.rotation.y,
    }));
  }

  public dispose(): void {
    this.cars.forEach((car) => {
      this.trafficGroup.remove(car.mesh);
    });
    this.cars = [];
  }
}
