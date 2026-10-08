import * as THREE from 'three';

/**
 * Procedural spline-based curved road and asphalt environment generator.
 * Creates smooth curved asphalt lanes, rounded intersections, curbs, road striping,
 * manholes, drainage grates, and natural parking spaces.
 */
export class OrganicRoadSystem {
  public roadGroup: THREE.Group;
  public curbsGroup: THREE.Group;
  public roadMarkingsGroup: THREE.Group;
  public parkingSpacesGroup: THREE.Group;

  constructor() {
    this.roadGroup = new THREE.Group();
    this.curbsGroup = new THREE.Group();
    this.roadMarkingsGroup = new THREE.Group();
    this.parkingSpacesGroup = new THREE.Group();
  }

  /**
   * Generates a smooth curved ribbon geometry from a 3D CatmullRom spline path
   */
  public static createCurvedRoadMesh(
    curve: THREE.CatmullRomCurve3,
    roadWidth = 3.8,
    segments = 64,
    colorHex = 0x1e293b
  ): THREE.Mesh {
    const points = curve.getSpacedPoints(segments);
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfWidth = roadWidth / 2;
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let tangent: THREE.Vector3;
      if (i < points.length - 1) {
        tangent = new THREE.Vector3().subVectors(points[i + 1], p).normalize();
      } else {
        tangent = new THREE.Vector3().subVectors(p, points[i - 1]).normalize();
      }

      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const left = new THREE.Vector3().copy(p).addScaledVector(side, halfWidth);
      const right = new THREE.Vector3().copy(p).addScaledVector(side, -halfWidth);

      vertices.push(left.x, left.y, left.z);
      vertices.push(right.x, right.y, right.z);

      const v = i / segments;
      uvs.push(0, v);
      uvs.push(1, v);

      if (i < points.length - 1) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.88,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Generates dashed or solid center lines along a curved road path
   */
  public static createCurvedStripes(
    curve: THREE.CatmullRomCurve3,
    stripeWidth = 0.22,
    segments = 48,
    colorHex = 0xfacc15
  ): THREE.Group {
    const group = new THREE.Group();
    const points = curve.getSpacedPoints(segments);
    const up = new THREE.Vector3(0, 1, 0);
    const halfWidth = stripeWidth / 2;

    for (let i = 0; i < points.length - 1; i += 2) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const vertices = [
        p1.x + side.x * halfWidth, p1.y + 0.02, p1.z + side.z * halfWidth,
        p1.x - side.x * halfWidth, p1.y + 0.02, p1.z - side.z * halfWidth,
        p2.x + side.x * halfWidth, p2.y + 0.02, p2.z + side.z * halfWidth,

        p1.x - side.x * halfWidth, p1.y + 0.02, p1.z - side.z * halfWidth,
        p2.x - side.x * halfWidth, p2.y + 0.02, p2.z - side.z * halfWidth,
        p2.x + side.x * halfWidth, p2.y + 0.02, p2.z + side.z * halfWidth,
      ];

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.4,
      });

      const dashMesh = new THREE.Mesh(geo, mat);
      dashMesh.receiveShadow = true;
      group.add(dashMesh);
    }

    return group;
  }

  /**
   * Generates rounded raised concrete curbs alongside curved asphalt borders
   */
  public static createRaisedCurbMesh(
    curve: THREE.CatmullRomCurve3,
    curbOffset: number,
    curbWidth = 0.45,
    curbHeight = 0.22,
    segments = 64,
    colorHex = 0x94a3b8
  ): THREE.Mesh {
    const points = curve.getSpacedPoints(segments);
    const vertices: number[] = [];
    const indices: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let tangent: THREE.Vector3;
      if (i < points.length - 1) {
        tangent = new THREE.Vector3().subVectors(points[i + 1], p).normalize();
      } else {
        tangent = new THREE.Vector3().subVectors(p, points[i - 1]).normalize();
      }

      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const inner = new THREE.Vector3().copy(p).addScaledVector(side, curbOffset);
      const outer = new THREE.Vector3().copy(p).addScaledVector(side, curbOffset + (curbOffset >= 0 ? curbWidth : -curbWidth));

      // 4 points per profile: bottom-inner, top-inner, top-outer, bottom-outer
      vertices.push(inner.x, inner.y, inner.z);
      vertices.push(inner.x, inner.y + curbHeight, inner.z);
      vertices.push(outer.x, outer.y + curbHeight, outer.z);
      vertices.push(outer.x, outer.y, outer.z);

      if (i < points.length - 1) {
        const base = i * 4;
        const next = (i + 1) * 4;
        // top face
        indices.push(base + 1, next + 1, next + 2);
        indices.push(base + 1, next + 2, base + 2);
        // side facing road
        indices.push(base, next, next + 1);
        indices.push(base, next + 1, base + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.7,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
