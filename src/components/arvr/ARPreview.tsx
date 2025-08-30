import { Canvas } from "@react-three/fiber";
import { VRButton } from "three/examples/jsm/webxr/VRButton";

export default function ARPreview() {
  return (
    <div className="w-full h-[500px] bg-black">
      <Canvas>
        <ambientLight />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </Canvas>
      <div ref={(el) => el && el.appendChild(VRButton.createButton((el as any)._gl))} />
    </div>
  );
}
