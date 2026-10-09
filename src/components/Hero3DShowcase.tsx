import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sounds } from '../utils/soundEffects.ts';
import { buildDioramaVehicleMesh } from '../logic/vehicleModelFactory.ts';
import { PlayerProgress } from '../logic/playerProgress.ts';
import { LIVERIES, UNDERGLOWS, RIMS } from '../logic/garageCustomization.ts';

function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Line) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}

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
    renderer.setSize(width, height, true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.style.imageRendering = '-webkit-optimize-contrast';
    container.appendChild(renderer.domElement);

    // Warm Studio Lighting with Hemisphere Bounce
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.6);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 2.4);
    sun.position.set(7, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 1.5;
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

    // Build 3D Diorama Transit Bus matching in-game aesthetics
    const prog = PlayerProgress.get();
    const activeLivery = LIVERIES.find((l) => l.id === prog.activeLivery) || LIVERIES[0];
    const activeUnderglow = UNDERGLOWS.find((u) => u.id === prog.activeUnderglow) || UNDERGLOWS[0];
    const activeRim = RIMS.find((r) => r.id === prog.activeRim) || RIMS[0];

    const busRig = buildDioramaVehicleMesh({
      vehicleId: 'hero_showcase_bus',
      type: 'BUS',
      colorHex: '#F59E0B',
      length: 3,
      loadedPassengers: 2,
      capacity: 4,
      liveryConfig: activeLivery,
      underglowConfig: activeUnderglow,
      rimConfig: activeRim,
    });
    const busGroup = busRig.group;
    busGroup.position.y = 0.52;
    turntable.add(busGroup);

    const wheels = busRig.wheelTires;

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
      disposeHierarchy(scene);
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
