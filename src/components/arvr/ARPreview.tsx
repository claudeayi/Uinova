// src/components/preview/ARPreview.tsx
import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { VRButton } from "three/examples/jsm/webxr/VRButton";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function SpinningCube() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.x += 0.01;
      ref.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={ref} position={[0, 1, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function ARPreview() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      const button = VRButton.createButton(
        (document.querySelector("canvas") as any)?._gl
      );
      if (button) {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(button);
      }
    } catch (e) {
      console.warn("❌ WebXR non disponible :", e);
    }
  }, []);

  return (
    <div className="w-full h-[500px] bg-black relative rounded-lg overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [2, 2, 4], fov: 60 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000");
          gl.xr.enabled = true;
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <SpinningCube />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <OrbitControls />
      </Canvas>

      {/* Zone du bouton VR */}
      <div
        ref={containerRef}
        className="absolute bottom-2 right-2 z-10"
        aria-label="Activer mode VR"
      />
    </div>
  );
}
