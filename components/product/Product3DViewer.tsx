"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Billboard, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface Hotspot {
  id?: string;
  position_x: number;
  position_y: number;
  position_z: number;
  title: string;
  description: string | null;
}

const DRAG_THRESHOLD = 5;

/**
 * Individual hotspot marker with per-frame occlusion check.
 * Uses raycasting to hide the marker when it's behind the model.
 */
function HotspotMarker({
  hotspot,
  scene,
  modelRadius,
  isActive,
  editable,
  onMarkerClick,
}: {
  hotspot: Hotspot;
  scene: THREE.Object3D;
  modelRadius: number;
  isActive: boolean;
  editable: boolean;
  onMarkerClick: (h: Hotspot) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const frameCount = useRef(0);

  const base = modelRadius * 0.035;
  const visualRadius = isActive ? base * 1.6 : base;
  // Invisible hit-area radius — much bigger for easy mobile tapping
  const hitRadius = Math.max(visualRadius * 5, modelRadius * 0.08);

  // Every few frames, raycast from camera → hotspot to check if model occludes it
  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    frameCount.current += 1;
    // Throttle to every 3 frames for performance
    if (frameCount.current % 3 !== 0) return;

    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);

    const dir = worldPos.clone().sub(camera.position).normalize();
    raycaster.set(camera.position, dir);

    const distToHotspot = camera.position.distanceTo(worldPos);
    const intersects = raycaster.intersectObject(scene, true);

    // If model surface is hit before reaching the hotspot, it's occluded.
    // Use a small margin (5% of model radius) to avoid hiding markers
    // that sit exactly on the surface.
    const margin = modelRadius * 0.05;
    const occluded =
      intersects.length > 0 &&
      intersects[0].distance < distToHotspot - margin;

    groupRef.current.visible = !occluded;
  });

  return (
    <group
      ref={groupRef}
      position={[hotspot.position_x, hotspot.position_y, hotspot.position_z]}
      renderOrder={999}
    >
      <Billboard>
        {/* Invisible larger hit-area for easier mobile tap */}
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onMarkerClick(hotspot);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onPointerOver={() => {
            if (!editable) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <circleGeometry args={[hitRadius, 16]} />
          <meshBasicMaterial transparent opacity={0} depthTest={false} />
        </mesh>
        {/* Visible marker dot — rendered on top of model surface */}
        <mesh renderOrder={999}>
          <circleGeometry args={[visualRadius, 24]} />
          <meshBasicMaterial
            color={isActive ? "orange" : "red"}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

function ModelView({
  url,
  hotspots,
  editable,
  onHotspotPlace,
  activeKey,
  onActiveHotspotChange,
}: {
  url: string;
  hotspots: Hotspot[];
  editable?: boolean;
  onHotspotPlace?: (local: { x: number; y: number; z: number }) => void;
  activeKey: string | null;
  onActiveHotspotChange?: (key: string | null) => void;
}) {
  const { scene } = useGLTF(url);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    };
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!pointerDownRef.current) return;
    const dx = e.nativeEvent.clientX - pointerDownRef.current.x;
    const dy = e.nativeEvent.clientY - pointerDownRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    pointerDownRef.current = null;

    if (distance > DRAG_THRESHOLD) return;

    e.stopPropagation();
    const local = scene.worldToLocal(e.point.clone());

    onActiveHotspotChange?.(null);

    if (editable && onHotspotPlace) {
      onHotspotPlace({ x: local.x, y: local.y, z: local.z });
    }
  };

  const handleMarkerClick = (h: Hotspot) => {
    if (editable) return;
    const key = h.id ?? `${h.position_x},${h.position_y},${h.position_z}`;
    const next = activeKey === key ? null : key;
    onActiveHotspotChange?.(next);
  };

  // Auto-frame the camera to the model's bounding box — models from other
  // teams can have very different scales, so never hardcode camera values.
  // Camera Y matches 3/4 elevated view (TILT_ANGLE).
  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return;
    const center = new THREE.Vector3();
    box.getCenter(center);
    const radius = Math.max(
      box.getBoundingSphere(new THREE.Sphere()).radius,
      0.001
    );
    const dist = radius * 2.6;

    const controls = controlsRef.current;
    if (!controls) return;
    const cam = controls.object as THREE.PerspectiveCamera;
    cam.near = radius / 100;
    cam.far = radius * 100;
    cam.updateProjectionMatrix();
    cam.position.set(
      center.x + dist,
      center.y + dist * 0.7,
      center.z + dist
    );
    cam.lookAt(center);
    controls.target.copy(center);
    controls.minDistance = radius * 0.5;
    controls.maxDistance = radius * 6;
    controls.update();
  }, [scene]);

  const modelRadius = useMemo(() => {
    if (!scene) return 0.001;
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return 0.001;
    return Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.001);
  }, [scene]);

  return (
    <>
      <primitive
        object={scene}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
      />
      {hotspots.map((h) => {
        const key = h.id ?? `${h.position_x},${h.position_y},${h.position_z}`;
        const isActive = key === activeKey;
        return (
          <HotspotMarker
            key={key}
            hotspot={h}
            scene={scene}
            modelRadius={modelRadius}
            isActive={isActive}
            editable={!!editable}
            onMarkerClick={handleMarkerClick}
          />
        );
      })}
      {/* Catatan: rotasi vertikal dibiarkan bebas penuh (tanpa
          minPolarAngle/maxPolarAngle) sesuai keputusan produk.
          Marker yang terhalang model otomatis disembunyikan via raycasting
          di komponen HotspotMarker. */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        makeDefault
        enablePan={false}
        enableZoom={false}
      />
    </>
  );
}

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-50/95 dark:bg-[#0a1628]/90">
      <Loader2 size={26} className="animate-spin text-[#0EA5A0]" />
      <p className="text-sm text-body">
        Memuat model 3D... {Math.round(progress)}%
      </p>
    </div>
  );
}

class ViewerErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-page-alt p-6 text-center">
          <AlertTriangle size={26} className="text-amber-400" />
          <p className="text-sm text-body">
            Model 3D gagal dimuat. File mungkin rusak atau format tidak
            didukung.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Product3DViewer({
  url,
  hotspots = [],
  editable = false,
  onHotspotPlace,
}: {
  url: string;
  hotspots?: Hotspot[];
  editable?: boolean;
  onHotspotPlace?: (local: { x: number; y: number; z: number }) => void;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const displayedHotspot = activeKey
    ? hotspots.find(
        (h) =>
          (h.id ?? `${h.position_x},${h.position_y},${h.position_z}`) ===
          activeKey
      )       ?? null
    : null;

  return (
    <ViewerErrorBoundary>
      <div
        className="relative w-full h-full"
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ fov: 45, near: 0.1, far: 1000 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          style={{ background: "var(--public-hero-end)" }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[6, 10, 6]} intensity={1.3} />
            <directionalLight position={[-6, -4, -6]} intensity={0.4} />
            <ModelView
              url={url}
              hotspots={hotspots}
              editable={editable}
              onHotspotPlace={onHotspotPlace}
              activeKey={activeKey}
              onActiveHotspotChange={setActiveKey}
            />
          </Suspense>
        </Canvas>
        <LoadingOverlay />
      </div>
      <div className="mt-3 rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 min-h-[72px]">
        {displayedHotspot ? (
          <div>
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">
                {displayedHotspot.title}
              </h4>
              <button
                type="button"
                onClick={() => setActiveKey(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 leading-none text-lg"
              >
                &times;
              </button>
            </div>
            {displayedHotspot.description && (
              <p className="text-sm mt-1 leading-relaxed text-slate-600 dark:text-slate-300 break-words">
                {displayedHotspot.description}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-center text-slate-600 dark:text-slate-300">
            {hotspots.length > 0
              ? "Klik titik merah pada model untuk melihat detail bagian"
              : ""}
          </p>
        )}
      </div>
    </ViewerErrorBoundary>
  );
}
