"use client";

import { Component, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
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

function ModelView({
  url,
  hotspots,
  editable,
  onHotspotPlace,
  onActiveHotspotChange,
}: {
  url: string;
  hotspots: Hotspot[];
  editable?: boolean;
  onHotspotPlace?: (local: { x: number; y: number; z: number }) => void;
  onActiveHotspotChange?: (key: string | null) => void;
}) {
  const { scene } = useGLTF(url);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

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

    setActiveKey(null);
    onActiveHotspotChange?.(null);

    if (editable && onHotspotPlace) {
      onHotspotPlace({ x: local.x, y: local.y, z: local.z });
    } else {
      console.log("[Hotspot] Local coords:", {
        x: local.x,
        y: local.y,
        z: local.z,
      });
    }
  };

  const handleMarkerClick = (h: Hotspot) => {
    if (editable) return;
    const key = h.id ?? `${h.position_x},${h.position_y},${h.position_z}`;
    const next = activeKey === key ? null : key;
    setActiveKey(next);
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
          <group key={key} position={[h.position_x, h.position_y, h.position_z]}>
            <Billboard>
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkerClick(h);
                }}
                onPointerOver={() => {
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                  document.body.style.cursor = "auto";
                }}
              >
                <circleGeometry args={[isActive ? 0.0045 : 0.003, 16]} />
                <meshBasicMaterial color={isActive ? "orange" : "red"} />
              </mesh>
            </Billboard>
          </group>
        );
      })}
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
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a1628]/90">
      <Loader2 size={26} className="animate-spin text-[#0EA5A0]" />
      <p className="text-xs text-white/60">
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
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#0a1628] p-6 text-center">
          <AlertTriangle size={26} className="text-amber-400" />
          <p className="text-sm text-white/70">
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
          style={{ background: "#0a1628" }}
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
              <p className="text-xs mt-1 leading-relaxed text-slate-500 dark:text-slate-400">
                {displayedHotspot.description}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-center text-slate-400 dark:text-slate-500">
            {hotspots.length > 0
              ? "Klik titik merah pada model untuk melihat detail bagian"
              : ""}
          </p>
        )}
      </div>
    </ViewerErrorBoundary>
  );
}
