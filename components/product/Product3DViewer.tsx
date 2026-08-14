"use client";

import { Component, Suspense, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { AlertTriangle, Loader2 } from "lucide-react";

function ModelView({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Auto-frame the camera to the model's bounding box — models from other
  // teams can have very different scales, so never hardcode camera values.
  // Mutations go through the OrbitControls ref (imperative three.js object).
  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return;
    const center = new THREE.Vector3();
    box.getCenter(center);
    const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.001);
    const dist = radius * 2.6;

    const controls = controlsRef.current;
    if (!controls) return;
    const cam = controls.object as THREE.PerspectiveCamera;
    cam.near = radius / 100;
    cam.far = radius * 100;
    cam.updateProjectionMatrix();
    cam.position.set(center.x + dist, center.y + dist * 0.7, center.z + dist);
    cam.lookAt(center);
    controls.target.copy(center);
    controls.minDistance = radius * 0.5;
    controls.maxDistance = radius * 6;
    controls.update();
  }, [scene]);

  return (
    <>
      <primitive object={scene} />
      <OrbitControls ref={controlsRef} enableDamping makeDefault enablePan={false} />
    </>
  );
}

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a1628]/90">
      <Loader2 size={26} className="animate-spin text-[#0EA5A0]" />
      <p className="text-xs text-white/60">Memuat model 3D… {Math.round(progress)}%</p>
    </div>
  );
}

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
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
            Model 3D gagal dimuat. File mungkin rusak atau format tidak didukung.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Product3DViewer({ url }: { url: string }) {
  return (
    <ViewerErrorBoundary>
      <div className="relative w-full h-full">
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
            <ModelView url={url} />
          </Suspense>
        </Canvas>
        <LoadingOverlay />
      </div>
    </ViewerErrorBoundary>
  );
}