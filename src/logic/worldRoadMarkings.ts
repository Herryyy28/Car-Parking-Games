import * as THREE from 'three';
import { WorldThemeConfig, getWorldConfig } from './worldThemes.ts';

export class WorldRoadMarkingsSystem {
  public markingsGroup: THREE.Group;
  private currentWorldId = -1;

  constructor() {
    this.markingsGroup = new THREE.Group();
    this.markingsGroup.name = 'WorldRoadMarkingsSystem';
  }

  public updateMarkings(worldId: number): void {
    if (this.currentWorldId === worldId) return;
    this.currentWorldId = worldId;

    // Clear old markings
    while (this.markingsGroup.children.length > 0) {
      const child = this.markingsGroup.children[0];
      this.markingsGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    const theme = getWorldConfig(worldId);
    this.buildThemedMarkings(theme);
  }

  private buildThemedMarkings(theme: WorldThemeConfig): void {
    const primaryColor = theme.gridLineColor1 || 0xffffff;
    const accentColor = theme.accentGlowColor || 0xfacc15;

    // 1. Terminal Bus Stop Zebra Crosswalks (Connecting passengers from sidewalk across boulevard)
    const crosswalkMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.35,
      metalness: 0.1,
    });

    const crosswalkGroup = new THREE.Group();
    // 8 zebra stripes across the northern pedestrian boulevard
    for (let i = -7; i <= 7; i += 2) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.02, 3.4),
        crosswalkMat
      );
      stripe.position.set(i * 1.05, 0.18, -4.8);
      crosswalkGroup.add(stripe);
    }
    this.markingsGroup.add(crosswalkGroup);

    // 2. Bus Stop / Waiting Bay Yellow/Cyan Zig-Zag & Chevron Lines
    const chevronMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.3,
    });

    [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach((dx) => {
      // "BUS STOP" Ground Decal Strip
      const stopStrip = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.025, 0.35),
        chevronMat
      );
      stopStrip.position.set(dx, 0.21, -5.2);
      this.markingsGroup.add(stopStrip);

      // Yellow chevron entrance arrows pointing North towards terminal
      const arrowShaft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.9), chevronMat);
      arrowShaft.position.set(dx, 0.21, -3.2);
      const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 3), chevronMat);
      arrowHead.rotation.x = Math.PI / 2;
      arrowHead.position.set(dx, 0.21, -3.8);
      this.markingsGroup.add(arrowShaft, arrowHead);
    });

    // 3. World-Themed Stencils (Speed limit circles, Yield triangles, Diamond diamond carpool markers)
    if (theme.propType === 'airport') {
      // Airport Runway Threshold Stripes & Yellow Taxiway Lines
      const runwayLineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
      const runwayStripe = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.025, 0.2), runwayLineMat);
      runwayStripe.position.set(0, 0.19, 0.5);
      this.markingsGroup.add(runwayStripe);
    } else if (theme.propType === 'downtown' || theme.propType === 'night' || theme.propType === 'sunset') {
      // Neon Cyber glowing lane dividers
      const glowMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      for (let z = 0; z <= 12; z += 3) {
        const dashL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 1.2), glowMat);
        dashL.position.set(-11.2, 0.19, z);
        const dashR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 1.2), glowMat);
        dashR.position.set(11.2, 0.19, z);
        this.markingsGroup.add(dashL, dashR);
      }
    } else if (theme.propType === 'beach') {
      // Coastal Blue Wave Markings
      const waveMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });
      for (let x = -8; x <= 8; x += 4) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 16), waveMat);
        ring.position.set(x, 0.19, 14.2);
        this.markingsGroup.add(ring);
      }
    }
  }

  public dispose(): void {
    while (this.markingsGroup.children.length > 0) {
      const child = this.markingsGroup.children[0];
      this.markingsGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }
}
