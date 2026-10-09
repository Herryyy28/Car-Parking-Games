import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  X,
  Palette,
  Sparkles,
  Disc,
  Volume2,
  Wrench,
  Coins,
  Check,
  Lock,
  ChevronRight,
  RotateCw,
  Play,
  ShieldCheck,
  Zap,
  Gauge,
  Sliders,
} from 'lucide-react';
import {
  LIVERIES,
  UNDERGLOWS,
  RIMS,
  HORNS,
  TUNING_COSTS,
  LiveryConfig,
  UnderglowConfig,
  RimConfig,
  HornConfig,
} from '../logic/garageCustomization.ts';
import { PlayerProgress, PlayerProgressData } from '../logic/playerProgress.ts';
import { inCabRadio } from '../utils/radioSynthesizer.ts';
import { sounds } from '../utils/soundEffects.ts';

interface BusGarageModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onCustomizationChanged?: () => void;
}

type GarageTab = 'LIVERIES' | 'UNDERGLOW' | 'RIMS' | 'HORNS' | 'TUNING';

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

export function BusGarageModal({ isOpen = true, onClose, onCustomizationChanged }: BusGarageModalProps) {
  if (isOpen === false) return null;
  const [activeTab, setActiveTab] = useState<GarageTab>('LIVERIES');
  const [progress, setProgress] = useState<PlayerProgressData>(() => PlayerProgress.get());
  const [selectedLivery, setSelectedLivery] = useState<string>(progress.activeLivery);
  const [selectedUnderglow, setSelectedUnderglow] = useState<string>(progress.activeUnderglow);
  const [selectedRim, setSelectedRim] = useState<string>(progress.activeRim);
  const [selectedHorn, setSelectedHorn] = useState<string>(progress.activeHorn);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const busGroupRef = useRef<THREE.Group | null>(null);
  const underglowLightRef = useRef<THREE.PointLight | null>(null);
  const underglowMeshRef = useRef<THREE.Mesh | null>(null);

  // Turntable interaction
  const isDraggingRef = useRef(false);
  const previousMouseXRef = useRef(0);
  const busRotationYRef = useRef(0.4);

  // Refresh progress state
  const refreshProgress = () => {
    const p = PlayerProgress.get();
    setProgress({ ...p });
    setSelectedLivery(p.activeLivery);
    setSelectedUnderglow(p.activeUnderglow);
    setSelectedRim(p.activeRim);
    setSelectedHorn(p.activeHorn);
    onCustomizationChanged?.();
  };

  // Setup 3D Showroom Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || 400;
    const height = canvas.clientHeight || 280;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(4.8, 3.2, 6.2);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    // Showroom Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    keyLight.position.set(6, 9, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-6, 5, -5);
    scene.add(rimLight);

    // Circular Turntable Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.28, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.35,
      metalness: 0.6,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.14;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Pedestal Neon Edge Ring
    const ringGeo = new THREE.TorusGeometry(3.62, 0.04, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Bus Model Container
    const busGroup = new THREE.Group();
    busGroup.rotation.y = busRotationYRef.current;
    scene.add(busGroup);
    busGroupRef.current = busGroup;

    // Underglow Light & Plate
    const ugLight = new THREE.PointLight(0x00f0ff, 0, 4.5);
    ugLight.position.set(0, 0.1, 0);
    busGroup.add(ugLight);
    underglowLightRef.current = ugLight;

    const ugPlateGeo = new THREE.PlaneGeometry(1.6, 3.6);
    const ugPlateMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const ugPlate = new THREE.Mesh(ugPlateGeo, ugPlateMat);
    ugPlate.rotation.x = -Math.PI / 2;
    ugPlate.position.y = 0.04;
    busGroup.add(ugPlate);
    underglowMeshRef.current = ugPlate;

    // Render loop
    let animId: number;
    let autoRotate = true;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && !isDraggingRef.current && busGroupRef.current) {
        busRotationYRef.current += 0.006;
        busGroupRef.current.rotation.y = busRotationYRef.current;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Mouse & Touch Drag rotation
    const onDown = (clientX: number) => {
      isDraggingRef.current = true;
      autoRotate = false;
      previousMouseXRef.current = clientX;
    };

    const onMove = (clientX: number) => {
      if (!isDraggingRef.current || !busGroupRef.current) return;
      const deltaX = clientX - previousMouseXRef.current;
      previousMouseXRef.current = clientX;
      busRotationYRef.current += deltaX * 0.012;
      busGroupRef.current.rotation.y = busRotationYRef.current;
    };

    const onUp = () => {
      isDraggingRef.current = false;
      // Resume slow rotation after 3 seconds
      setTimeout(() => {
        if (!isDraggingRef.current) autoRotate = true;
      }, 3000);
    };

    const handleMouseDown = (e: MouseEvent) => onDown(e.clientX);
    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const handleMouseUp = () => onUp();

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) onDown(e.touches[0].clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) onMove(e.touches[0].clientX);
    };
    const handleTouchEnd = () => onUp();

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    // Resize handler
    const onResize = () => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', onResize);
      if (sceneRef.current) {
        disposeHierarchy(sceneRef.current);
      }
      renderer.dispose();
    };
  }, []);

  // Re-build 3D Bus based on selected livery & rims
  useEffect(() => {
    const busGroup = busGroupRef.current;
    if (!busGroup) return;

    // Clear prior bus parts except underglow
    const toRemove: THREE.Object3D[] = [];
    busGroup.children.forEach((c) => {
      if (c !== underglowLightRef.current && c !== underglowMeshRef.current) {
        toRemove.push(c);
      }
    });
    toRemove.forEach((c) => {
      busGroup.remove(c);
      disposeHierarchy(c);
    });

    const liveryCfg = LIVERIES.find((l) => l.id === selectedLivery) || LIVERIES[0];
    const rimCfg = RIMS.find((r) => r.id === selectedRim) || RIMS[0];

    const busColorHex = liveryCfg.id === 'SCHOOL_BUS' ? 0xf59e0b : 0x3b82f6; // Vibrant blue base or school bus amber

    // Main Bus Chassis
    const bodyGeo = new THREE.BoxGeometry(1.65, 1.25, 3.8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: busColorHex,
      roughness: liveryCfg.roughness,
      metalness: liveryCfg.metalness,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.88;
    body.castShadow = true;
    busGroup.add(body);

    // Tinted Glass Cabin
    const glassGeo = new THREE.BoxGeometry(1.48, 0.65, 3.2);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.8,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 1.35, -0.1);
    glass.castShadow = true;
    busGroup.add(glass);

    // Roof & Livery Decals
    const roofGeo = new THREE.BoxGeometry(1.5, 0.14, 3.4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: liveryCfg.roofColor,
      roughness: liveryCfg.roughness,
      metalness: liveryCfg.metalness,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.72, -0.1);
    busGroup.add(roof);

    // Livery Specific Decals
    if (liveryCfg.patternType === 'racing_stripes') {
      // Twin GT racing stripes
      [-0.28, 0.28].forEach((xOffset) => {
        const stripeGeo = new THREE.BoxGeometry(0.18, 0.02, 3.78);
        const stripeMat = new THREE.MeshBasicMaterial({ color: liveryCfg.stripeColor });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(xOffset, 1.8, -0.1);
        busGroup.add(stripe);
      });
    } else if (liveryCfg.patternType === 'cyber_circuit') {
      // Glowing cyber grid lines along sides
      [-0.84, 0.84].forEach((xSide) => {
        const lineGeo = new THREE.BoxGeometry(0.02, 0.06, 3.5);
        const lineMat = new THREE.MeshBasicMaterial({ color: liveryCfg.stripeColor });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(xSide, 0.95, 0);
        busGroup.add(line);
      });
    } else if (liveryCfg.patternType === 'school_bus') {
      // Heritage black rub rails
      [-0.84, 0.84].forEach((xSide) => {
        const railGeo = new THREE.BoxGeometry(0.04, 0.08, 3.6);
        const railMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(xSide, 0.72, 0);
        busGroup.add(rail);
      });
    } else if (liveryCfg.patternType === 'gold_chrome') {
      // Golden Crown Emblem
      const crownGeo = new THREE.BoxGeometry(0.3, 0.12, 0.6);
      const crownMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        metalness: 0.95,
        roughness: 0.05,
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(0, 1.82, -0.2);
      busGroup.add(crown);
    }

    // Headlights & Grille
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 2.0,
    });
    [-0.55, 0.55].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), hlMat);
      hl.rotation.x = Math.PI / 2;
      hl.position.set(x, 0.75, -1.91);
      busGroup.add(hl);
    });

    // Taillights
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xef4444,
      emissiveIntensity: 1.6,
    });
    [-0.55, 0.55].forEach((x) => {
      const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), tlMat);
      tl.rotation.x = Math.PI / 2;
      tl.position.set(x, 0.75, 1.91);
      busGroup.add(tl);
    });

    // Wheels with custom rims
    const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85 });
    const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.25, 14);
    const rimMat = new THREE.MeshStandardMaterial({
      color: rimCfg.colorHex,
      metalness: rimCfg.metalness,
      roughness: rimCfg.roughness,
    });

    const wheelPositions = [
      [-0.9, 0.38, -1.2],
      [0.9, 0.38, -1.2],
      [-0.9, 0.38, 1.2],
      [0.9, 0.38, 1.2],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(x, y, z);

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;

      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;

      wGroup.add(tire, rim);
      busGroup.add(wGroup);
    });
  }, [selectedLivery, selectedRim]);

  // Update Underglow Neon Lighting
  useEffect(() => {
    const ugCfg = UNDERGLOWS.find((u) => u.id === selectedUnderglow) || UNDERGLOWS[0];
    if (underglowLightRef.current && underglowMeshRef.current) {
      if (ugCfg.intensity > 0) {
        underglowLightRef.current.color.setHex(ugCfg.colorHex);
        underglowLightRef.current.intensity = ugCfg.intensity * 2.5;

        (underglowMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(ugCfg.colorHex);
        (underglowMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.75;
      } else {
        underglowLightRef.current.intensity = 0;
        (underglowMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  }, [selectedUnderglow]);

  // Handle Equipping & Unlocking items
  const handleEquipLivery = (item: LiveryConfig) => {
    sounds.playClick();
    setSelectedLivery(item.id);
    if (progress.unlockedLiveries.includes(item.id)) {
      PlayerProgress.setCustomization({ activeLivery: item.id });
      refreshProgress();
    }
  };

  const handleBuyLivery = (item: LiveryConfig) => {
    if (PlayerProgress.unlockItem('livery', item.id, item.price)) {
      sounds.playCoin();
      refreshProgress();
    } else {
      sounds.playBlocked();
    }
  };

  const handleEquipUnderglow = (item: UnderglowConfig) => {
    sounds.playClick();
    setSelectedUnderglow(item.id);
    if (progress.unlockedUnderglows.includes(item.id)) {
      PlayerProgress.setCustomization({ activeUnderglow: item.id });
      refreshProgress();
    }
  };

  const handleBuyUnderglow = (item: UnderglowConfig) => {
    if (PlayerProgress.unlockItem('underglow', item.id, item.price)) {
      sounds.playCoin();
      refreshProgress();
    } else {
      sounds.playBlocked();
    }
  };

  const handleEquipRim = (item: RimConfig) => {
    sounds.playClick();
    setSelectedRim(item.id);
    if (progress.unlockedRims.includes(item.id)) {
      PlayerProgress.setCustomization({ activeRim: item.id });
      refreshProgress();
    }
  };

  const handleBuyRim = (item: RimConfig) => {
    if (PlayerProgress.unlockItem('rim', item.id, item.price)) {
      sounds.playCoin();
      refreshProgress();
    } else {
      sounds.playBlocked();
    }
  };

  const handleEquipHorn = (item: HornConfig) => {
    setSelectedHorn(item.id);
    inCabRadio.playCustomHorn(item.id);
    if (progress.unlockedHorns.includes(item.id)) {
      PlayerProgress.setCustomization({ activeHorn: item.id });
      refreshProgress();
    }
  };

  const handleBuyHorn = (item: HornConfig) => {
    if (PlayerProgress.unlockItem('horn', item.id, item.price)) {
      sounds.playCoin();
      inCabRadio.playCustomHorn(item.id);
      refreshProgress();
    } else {
      sounds.playBlocked();
    }
  };

  const handleUpgradeTune = (tuneType: 'engine' | 'turning' | 'boarding') => {
    const currentLevel =
      tuneType === 'engine'
        ? progress.engineTuningLevel
        : tuneType === 'turning'
          ? progress.turningTuningLevel
          : progress.boardingTuningLevel;

    if (currentLevel >= 3) return;
    const cost = TUNING_COSTS[currentLevel];

    if (PlayerProgress.upgradeTune(tuneType, cost)) {
      sounds.playBooster();
      refreshProgress();
    } else {
      sounds.playBlocked();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wider uppercase text-white flex items-center gap-2 font-display">
                Custom Garage <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">3D TUNE SHOP</span>
              </h2>
              <p className="text-xs text-slate-400">Pimp your transit fleet with decals, neon, horns & performance tuning</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Coins Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold text-sm shadow-inner">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{progress.coins.toLocaleString()}</span>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Bus Interactive Showroom Turntable */}
        <div className="relative h-60 w-full bg-gradient-to-b from-slate-950 to-slate-900 shrink-0 border-b border-slate-800/80 overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Turntable hint overlay */}
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-[11px] text-slate-300 pointer-events-none">
            <RotateCw className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Drag to rotate 360°</span>
          </div>

          {/* Active Livery Badge */}
          <div className="absolute top-2.5 right-3 px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 text-right">
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider block font-semibold">Active Livery</span>
            <span className="text-xs font-bold text-white">
              {LIVERIES.find((l) => l.id === selectedLivery)?.name || 'Default'}
            </span>
          </div>
        </div>

        {/* Navigation Category Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 border-b border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'LIVERIES' as GarageTab, label: 'Paint & Wraps', icon: Palette },
            { id: 'UNDERGLOW' as GarageTab, label: 'Underglow Neon', icon: Sparkles },
            { id: 'RIMS' as GarageTab, label: 'Custom Rims', icon: Disc },
            { id: 'HORNS' as GarageTab, label: 'Horns & Chimes', icon: Volume2 },
            { id: 'TUNING' as GarageTab, label: 'Tuning Shop', icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Customization Options Grid (Scrollable) */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3.5">
          {/* TAB 1: LIVERIES */}
          {activeTab === 'LIVERIES' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LIVERIES.map((livery) => {
                const isUnlocked = progress.unlockedLiveries.includes(livery.id);
                const isEquipped = progress.activeLivery === livery.id;
                const isSelected = selectedLivery === livery.id;

                return (
                  <div
                    key={livery.id}
                    onClick={() => handleEquipLivery(livery)}
                    className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-semibold">
                          {livery.badge}
                        </span>
                        {isEquipped && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40">
                            <Check className="w-3 h-3" /> EQUIPPED
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white">{livery.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{livery.subtitle}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      {isUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipLivery(livery);
                          }}
                          className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isEquipped
                              ? 'bg-slate-800 text-slate-400 cursor-default'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                          }`}
                        >
                          {isEquipped ? 'In Use' : 'Equip Wrap'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyLivery(livery);
                          }}
                          disabled={progress.coins < livery.price}
                          className="w-full py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                        >
                          <Coins className="w-3.5 h-3.5 text-slate-950" />
                          <span>Unlock for {livery.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: UNDERGLOW NEON */}
          {activeTab === 'UNDERGLOW' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {UNDERGLOWS.map((ug) => {
                const isUnlocked = progress.unlockedUnderglows.includes(ug.id);
                const isEquipped = progress.activeUnderglow === ug.id;
                const isSelected = selectedUnderglow === ug.id;

                return (
                  <div
                    key={ug.id}
                    onClick={() => handleEquipUnderglow(ug)}
                    className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full border border-white/20 shrink-0 shadow-lg"
                        style={{
                          backgroundColor: ug.glowCss,
                          boxShadow: ug.intensity > 0 ? `0 0 16px ${ug.glowCss}` : 'none',
                        }}
                      />
                      <div>
                        <h3 className="text-sm font-bold text-white">{ug.name}</h3>
                        <p className="text-[11px] text-slate-400">
                          {ug.intensity > 0 ? 'Under-chassis LED glow' : 'Factory stock setup'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      {isUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipUnderglow(ug);
                          }}
                          className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isEquipped
                              ? 'bg-slate-800 text-slate-400 cursor-default'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Apply Neon'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyUnderglow(ug);
                          }}
                          disabled={progress.coins < ug.price}
                          className="w-full py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                        >
                          <Coins className="w-3.5 h-3.5 text-slate-950" />
                          <span>Unlock for {ug.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: CUSTOM RIMS */}
          {activeTab === 'RIMS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {RIMS.map((rim) => {
                const isUnlocked = progress.unlockedRims.includes(rim.id);
                const isEquipped = progress.activeRim === rim.id;
                const isSelected = selectedRim === rim.id;

                return (
                  <div
                    key={rim.id}
                    onClick={() => handleEquipRim(rim)}
                    className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                        <Disc className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{rim.name}</h3>
                        <p className="text-[11px] text-slate-400 capitalize">{rim.type} finish alloy</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      {isUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipRim(rim);
                          }}
                          className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isEquipped
                              ? 'bg-slate-800 text-slate-400 cursor-default'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip Rims'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyRim(rim);
                          }}
                          disabled={progress.coins < rim.price}
                          className="w-full py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                        >
                          <Coins className="w-3.5 h-3.5 text-slate-950" />
                          <span>Unlock for {rim.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: HORNS & CHIMES */}
          {activeTab === 'HORNS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {HORNS.map((horn) => {
                const isUnlocked = progress.unlockedHorns.includes(horn.id);
                const isEquipped = progress.activeHorn === horn.id;
                const isSelected = selectedHorn === horn.id;

                return (
                  <div
                    key={horn.id}
                    onClick={() => handleEquipHorn(horn)}
                    className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl">{horn.icon}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            inCabRadio.playCustomHorn(horn.id);
                          }}
                          className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" /> TEST AUDIO
                        </button>
                      </div>
                      <h3 className="text-sm font-bold text-white">{horn.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{horn.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      {isUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipHorn(horn);
                          }}
                          className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isEquipped
                              ? 'bg-slate-800 text-slate-400 cursor-default'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip Horn'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyHorn(horn);
                          }}
                          disabled={progress.coins < horn.price}
                          className="w-full py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                        >
                          <Coins className="w-3.5 h-3.5 text-slate-950" />
                          <span>Unlock for {horn.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 5: PERFORMANCE TUNING */}
          {activeTab === 'TUNING' && (
            <div className="space-y-3">
              {[
                {
                  id: 'engine' as const,
                  title: 'Turbocharged Trajectory Velocity',
                  desc: 'Reduces vehicle transit delay by speeding up departure along paths',
                  level: progress.engineTuningLevel,
                  icon: Zap,
                  color: 'text-amber-400',
                },
                {
                  id: 'turning' as const,
                  title: 'Agile Steering Rack & Suspension',
                  desc: 'Sharper turn roll compensation and reduced bump latency on grid turns',
                  level: progress.turningTuningLevel,
                  icon: Gauge,
                  color: 'text-cyan-400',
                },
                {
                  id: 'boarding' as const,
                  title: 'Hydraulic Kneeling Passenger System',
                  desc: 'Lowers bus chassis for faster boarding cycle time and rapid departure',
                  level: progress.boardingTuningLevel,
                  icon: Sliders,
                  color: 'text-emerald-400',
                },
              ].map((tune) => {
                const Icon = tune.icon;
                const isMax = tune.level >= 3;
                const nextCost = isMax ? 0 : TUNING_COSTS[tune.level];

                return (
                  <div
                    key={tune.id}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center ${tune.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{tune.title}</h3>
                          <span className="text-[10px] font-mono font-bold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">
                            LVL {tune.level}/3
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{tune.desc}</p>

                        {/* Level pip indicators */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {[1, 2, 3].map((lvl) => (
                            <div
                              key={lvl}
                              className={`h-1.5 w-7 rounded-full transition-all ${
                                lvl <= tune.level ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto shrink-0">
                      {isMax ? (
                        <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
                          MAX LEVEL
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUpgradeTune(tune.id)}
                          disabled={progress.coins < nextCost}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Upgrade ({nextCost})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
