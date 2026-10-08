import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Phase1SceneProps {
  onSelectObject: (selected: boolean, pos: { x: number; y: number; z: number }) => void;
  showGrid?: boolean;
}

export const Phase1Scene: React.FC<Phase1SceneProps> = ({ onSelectObject, showGrid = true }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(false);
  const [touchFeedback, setTouchFeedback] = useState<{ x: number; y: number; text: string } | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const testMeshRef = useRef<THREE.Group | null>(null);
  const isSelectedRef = useRef(false);
  const bounceTimeRef = useRef(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xe2e8f0);
    scene.fog = new THREE.FogExp2(0xe2e8f0, 0.025);

    // 2. Perspective Camera (matching LibGDX: FOV 55, pos [8, 12, 10], looking at [0, 0.5, 0])
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 100);
    camera.position.set(8, 12, 10);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer with soft shadows and antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lighting setup (Ambient + Directional Sunlight)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.3);
    dirLight.position.set(10, 18, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // Soft secondary fill light
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
    fillLight.position.set(-8, 6, -6);
    scene.add(fillLight);

    // 5. Ground Plane & Asphalt Parking Lot Pad
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(26, 26, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = 0.005;
    scene.add(gridHelper);

    // 5b. Static 3D Parking Lot Asphalt Pad (12 x 0.15 x 12)
    const lotPadGeo = new THREE.BoxGeometry(12, 0.15, 12);
    const lotPadMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate asphalt
      roughness: 0.8,
      metalness: 0.1,
    });
    const lotPad = new THREE.Mesh(lotPadGeo, lotPadMat);
    lotPad.position.set(0, 0.075, 0);
    lotPad.receiveShadow = true;
    lotPad.castShadow = true;
    scene.add(lotPad);

    // Concrete curb border around parking lot
    const curbGeoH = new THREE.BoxGeometry(12.3, 0.22, 0.25);
    const curbGeoV = new THREE.BoxGeometry(0.25, 0.22, 12.3);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const backCurb = new THREE.Mesh(curbGeoH, curbMat);
    backCurb.position.set(0, 0.11, -6.05);
    const leftCurb = new THREE.Mesh(curbGeoV, curbMat);
    leftCurb.position.set(-6.05, 0.11, 0);
    const rightCurb = new THREE.Mesh(curbGeoV, curbMat);
    rightCurb.position.set(6.05, 0.11, 0);
    scene.add(backCurb, leftCurb, rightCurb);

    // 5c. Static 3D Parking Grid Floor Markings (Dividers, slot boundaries, exit arrows)
    const dividerGeo = new THREE.BoxGeometry(0.12, 0.02, 3.8);
    const whiteMarkingMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
    });
    const yellowMarkingMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Golden yellow
      roughness: 0.4,
    });

    // 4 Parking Bay Dividers (X: -4.4, -2.2, 0.0, 2.2, 4.4)
    const slotDividersX = [-4.4, -2.2, 0.0, 2.2, 4.4];
    slotDividersX.forEach((x) => {
      const divider = new THREE.Mesh(dividerGeo, whiteMarkingMat);
      divider.position.set(x, 0.16, 0);
      divider.receiveShadow = true;
      scene.add(divider);

      // Small perpendicular end caps for clean parking slot look
      const capGeo = new THREE.BoxGeometry(0.4, 0.02, 0.12);
      const capFront = new THREE.Mesh(capGeo, whiteMarkingMat);
      capFront.position.set(x, 0.16, 1.9);
      const capBack = new THREE.Mesh(capGeo, whiteMarkingMat);
      capBack.position.set(x, 0.16, -1.9);
      scene.add(capFront, capBack);
    });

    // Back yellow wheel-stop boundary line
    const backLineGeo = new THREE.BoxGeometry(9.0, 0.02, 0.14);
    const backLine = new THREE.Mesh(backLineGeo, yellowMarkingMat);
    backLine.position.set(0, 0.16, -1.9);
    backLine.receiveShadow = true;
    scene.add(backLine);

    // Front yellow exit threshold line
    const frontLineGeo = new THREE.BoxGeometry(9.0, 0.02, 0.14);
    const frontLine = new THREE.Mesh(frontLineGeo, yellowMarkingMat);
    frontLine.position.set(0, 0.16, 1.9);
    frontLine.receiveShadow = true;
    scene.add(frontLine);

    // Exit Direction Arrow on tarmac in front of parking bays
    const arrowShaftGeo = new THREE.BoxGeometry(0.24, 0.02, 1.2);
    const arrowShaft = new THREE.Mesh(arrowShaftGeo, yellowMarkingMat);
    arrowShaft.position.set(0, 0.16, 3.4);
    scene.add(arrowShaft);

    const arrowHeadGeo = new THREE.ConeGeometry(0.45, 0.7, 3);
    const arrowHead = new THREE.Mesh(arrowHeadGeo, yellowMarkingMat);
    arrowHead.rotation.x = -Math.PI / 2;
    arrowHead.position.set(0, 0.16, 4.2);
    scene.add(arrowHead);

    // 6. Test 3D Object (Positioned in marked Parking Bay #2 at x = -1.1)
    const testGroup = new THREE.Group();
    testGroup.position.set(-1.1, 0.76, 0);

    // Main body box (1.8 wide, 1.2 tall, 3.2 long)
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.0, 3.0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Royal Blue
      roughness: 0.3,
      metalness: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    testGroup.add(bodyMesh);

    // Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.6, 1.6);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Deep Navy Blue
      roughness: 0.2,
      metalness: 0.3,
    });
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.set(0, 0.65, -0.2);
    cabinMesh.castShadow = true;
    testGroup.add(cabinMesh);

    // Front Headlights
    const lightGeo = new THREE.BoxGeometry(0.35, 0.2, 0.1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const leftLight = new THREE.Mesh(lightGeo, lightMat);
    leftLight.position.set(0.6, 0, 1.51);
    const rightLight = new THREE.Mesh(lightGeo, lightMat);
    rightLight.position.set(-0.6, 0, 1.51);
    testGroup.add(leftLight, rightLight);

    // Rear taillights
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const leftTail = new THREE.Mesh(lightGeo, tailMat);
    leftTail.position.set(0.6, 0, -1.51);
    const rightTail = new THREE.Mesh(lightGeo, tailMat);
    rightTail.position.set(-0.6, 0, -1.51);
    testGroup.add(leftTail, rightTail);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const wheelPositions = [
      [1.0, -0.35, 0.9],
      [-1.0, -0.35, 0.9],
      [1.0, -0.35, -0.9],
      [-1.0, -0.35, -0.9],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      testGroup.add(wheel);
    });

    // Selection ring indicator
    const ringGeo = new THREE.RingGeometry(1.6, 1.85, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = -0.58;
    selectionRing.name = 'selectionRing';
    testGroup.add(selectionRing);

    scene.add(testGroup);
    testMeshRef.current = testGroup;

    // Raycaster for Touch / Click handling
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(testGroup.children, true);

      if (intersects.length > 0) {
        // Toggle selection state
        const nextSelected = !isSelectedRef.current;
        isSelectedRef.current = nextSelected;
        setSelected(nextSelected);
        bounceTimeRef.current = 0;

        // Change color to highlight
        bodyMat.color.set(nextSelected ? 0xf97316 : 0x2563eb);
        ringMat.opacity = nextSelected ? 0.85 : 0;

        const hitPoint = intersects[0].point;
        onSelectObject(nextSelected, {
          x: parseFloat(hitPoint.x.toFixed(2)),
          y: parseFloat(hitPoint.y.toFixed(2)),
          z: parseFloat(hitPoint.z.toFixed(2)),
        });

        // Touch ripple feedback
        setTouchFeedback({
          x: clientX - rect.left,
          y: clientY - rect.top,
          text: nextSelected ? 'Selected (Hit!)' : 'Deselected',
        });
        setTimeout(() => setTouchFeedback(null), 1200);
      }
    };

    container.addEventListener('mousedown', handlePointerDown);
    container.addEventListener('touchstart', handlePointerDown, { passive: true });

    // Subtle idle camera drag/orbit
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let spherical = { radius: 17.5, theta: Math.PI / 4, phi: Math.PI / 3.8 };

    const onMouseDownDrag = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMoveDrag = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = (e.clientX - prevMousePos.x) * 0.005;
      const deltaY = (e.clientY - prevMousePos.y) * 0.005;
      prevMousePos = { x: e.clientX, y: e.clientY };

      spherical.theta -= deltaX;
      spherical.phi = Math.max(0.2, Math.min(Math.PI / 2.2, spherical.phi - deltaY));

      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0.5, 0);
    };

    const onMouseUpDrag = () => {
      isDragging = false;
    };

    container.addEventListener('mousemove', onMouseMoveDrag);
    window.addEventListener('mouseup', onMouseUpDrag);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Bounce animation if selected
      if (isSelectedRef.current && testMeshRef.current) {
        bounceTimeRef.current += delta * 6;
        const bounceOffset = Math.sin(bounceTimeRef.current) * 0.18;
        testMeshRef.current.position.y = 0.76 + Math.max(0, bounceOffset);

        const ring = testMeshRef.current.getObjectByName('selectionRing') as THREE.Mesh;
        if (ring) {
          ring.rotation.z += delta * 2;
        }
      } else if (testMeshRef.current) {
        testMeshRef.current.position.y = 0.76;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handlePointerDown);
      container.removeEventListener('touchstart', handlePointerDown);
      container.removeEventListener('mousemove', onMouseMoveDrag);
      window.removeEventListener('mouseup', onMouseUpDrag);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      groundGeo.dispose();
      bodyGeo.dispose();
      cabinGeo.dispose();
      wheelGeo.dispose();
    };
  }, [onSelectObject]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50/50 to-indigo-50/30">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Touch ripple indicator */}
      {touchFeedback && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all animate-bounce"
          style={{ left: touchFeedback.x, top: touchFeedback.y }}
        >
          <div className="px-3 py-1 rounded-full bg-slate-900/80 text-white font-semibold text-xs shadow-lg backdrop-blur-sm border border-white/20">
            {touchFeedback.text}
          </div>
        </div>
      )}

      {/* Floating 3D Scene Controls & Status Pill */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200/80 text-xs font-medium text-slate-700 pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Phase 1: 3D Scene Active</span>
        </div>

        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200/80 text-xs text-slate-600 pointer-events-auto">
          <span>Target:</span>
          <span className={selected ? 'font-bold text-orange-600' : 'font-semibold text-blue-600'}>
            {selected ? 'Vehicle #1 (Selected)' : 'Tap Vehicle to Select'}
          </span>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/85 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-slate-200/60 text-xs text-slate-500 pointer-events-none text-center">
        👆 Tap vehicle to test raycast selection • 🖱️ Drag to orbit camera
      </div>
    </div>
  );
};
