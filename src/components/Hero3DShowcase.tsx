import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sounds } from '../utils/soundEffects.ts';

export const Hero3DShowcase: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isHonking, setIsHonking] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.5);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // Warm Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfffae0, 2.0);
    sun.position.set(6, 10, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 512;
    sun.shadow.mapSize.height = 512;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // Turntable Road Pedestal
    const turntable = new THREE.Group();
    scene.add(turntable);

    const padGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.25, 40);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.2,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = -0.125;
    pad.receiveShadow = true;
    turntable.add(pad);

    // Road Outer Ring Curbs
    const curbGeo = new THREE.TorusGeometry(3.2, 0.08, 12, 48);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.rotation.x = Math.PI / 2;
    curb.position.y = 0.01;
    turntable.add(curb);

    // The 3D Bus Group
    const busGroup = new THREE.Group();
    busGroup.position.y = 0.35;
    turntable.add(busGroup);

    // Main Bus Body (Vibrant Yellow / Amber hyper-casual gloss)
    const bodyGeo = new THREE.BoxGeometry(1.6, 1.1, 3.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.35,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    body.receiveShadow = true;
    busGroup.add(body);

    // Front Bumper & Grill
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const grill = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.1), grillMat);
    grill.position.set(0, 0.35, 1.71);
    busGroup.add(grill);

    // Headlights
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 1.5,
    });
    const headLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), lightMat);
    headLeft.rotation.x = Math.PI / 2;
    headLeft.position.set(-0.55, 0.45, 1.72);
    const headRight = headLeft.clone();
    headRight.position.x = 0.55;
    busGroup.add(headLeft, headRight);

    // Cabin Glass / Windows
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
    });
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.55, 0.1), glassMat);
    windshield.position.set(0, 0.82, 1.66);
    busGroup.add(windshield);

    // Side Windows
    const sideGlassMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.5,
    });
    const leftWindows = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 2.6), sideGlassMat);
    leftWindows.position.set(-0.81, 0.82, -0.15);
    const rightWindows = leftWindows.clone();
    rightWindows.position.x = 0.81;
    busGroup.add(leftWindows, rightWindows);

    // Roof Carrier / Aero Top
    const roofGeo = new THREE.BoxGeometry(1.4, 0.15, 2.6);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.15, -0.15);
    roof.castShadow = true;
    busGroup.add(roof);

    // Direction arrow on roof
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const arrowShaft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 1.2), arrowMat);
    arrowShaft.position.set(0, 1.24, -0.15);
    const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 3), arrowMat);
    arrowTip.rotation.x = -Math.PI / 2;
    arrowTip.position.set(0, 1.24, 0.6);
    busGroup.add(arrowShaft, arrowTip);

    // Bobbing Passenger inside
    const passengerGroup = new THREE.Group();
    passengerGroup.position.set(0, 0.65, 0.8);
    const passHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6 })
    );
    passHead.position.y = 0.35;
    passengerGroup.add(passHead);
    busGroup.add(passengerGroup);

    // 4 Wheels
    const wheels: THREE.Mesh[] = [];
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const rimGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.23, 16);

    const wheelPositions = [
      [-0.82, 0.28, 1.0],
      [0.82, 0.28, 1.0],
      [-0.82, 0.28, -1.0],
      [0.82, 0.28, -1.0],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(x, y, z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;

      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;

      wGroup.add(tire, rim);
      busGroup.add(wGroup);
      wheels.push(tire);
    });

    // Touch / Drag to rotate
    let isDragging = false;
    let prevX = 0;
    let userRotation = -Math.PI / 5;
    let autoRotate = true;
    let bounceFactor = 0;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      autoRotate = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      prevX = clientX;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = (clientX - prevX) * 0.015;
      prevX = clientX;
      userRotation += deltaX;
      turntable.rotation.y = userRotation;
    };

    const handlePointerUp = () => {
      isDragging = false;
      // Resume auto rotation after 2 seconds
      setTimeout(() => {
        autoRotate = true;
      }, 2000);
    };

    // Tap bus to Honk & Jump
    const handleTapBus = () => {
      sounds.playHonk();
      setIsHonking(true);
      bounceFactor = 1.0;
      setTimeout(() => setIsHonking(false), 500);
    };

    container.addEventListener('mousedown', handlePointerDown);
    container.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    container.addEventListener('touchstart', handlePointerDown, { passive: true });
    container.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    container.addEventListener('click', handleTapBus);

    // Animation Loop
    let animId: number;
    let lastTime = performance.now();
    const startTime = performance.now();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      const elapsed = (now - startTime) / 1000;
      lastTime = now;

      // Auto rotation
      if (autoRotate) {
        userRotation += delta * 0.45;
        turntable.rotation.y = userRotation;
      }

      // Idle bus suspension wobble
      const idleBob = Math.sin(elapsed * 4) * 0.02;
      busGroup.position.y = 0.35 + idleBob;
      busGroup.rotation.z = Math.sin(elapsed * 2.5) * 0.015;

      // Passenger bobbing
      passengerGroup.position.y = 0.65 + Math.sin(elapsed * 5) * 0.04;

      // Bounce jump if honking
      if (bounceFactor > 0) {
        bounceFactor = Math.max(0, bounceFactor - delta * 3.5);
        busGroup.position.y += Math.sin(bounceFactor * Math.PI) * 0.35;
        busGroup.rotation.x = Math.sin(bounceFactor * Math.PI * 2) * 0.08;
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    // Resize handler
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
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', handlePointerDown);
      container.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      container.removeEventListener('touchstart', handlePointerDown);
      container.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      container.removeEventListener('click', handleTapBus);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-52 sm:h-60 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing group">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Floating 3D Interaction Hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/70 border border-white/10 backdrop-blur-md text-[10px] font-bold text-amber-300 flex items-center gap-1.5 shadow-lg pointer-events-none transition-opacity group-hover:opacity-100">
        <span>🎮</span>
        <span>Drag to rotate 3D • Tap to Honk!</span>
      </div>

      {/* Honk Speech Bubble */}
      {isHonking && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-yellow-400 text-slate-950 font-black text-xs rounded-full shadow-xl animate-bounce border-2 border-white">
          HONK HONK! 🔊
        </div>
      )}
    </div>
  );
};
