"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Dot positions for each face value (in local UV space -0.35 to 0.35) ──
const DOT_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.2, -0.2], [0.2, 0.2]],
  3: [[-0.2, -0.2], [0, 0], [0.2, 0.2]],
  4: [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]],
  5: [[-0.2, -0.2], [0.2, -0.2], [0, 0], [-0.2, 0.2], [0.2, 0.2]],
  6: [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0], [0.2, 0], [-0.2, 0.2], [0.2, 0.2]],
};

// Standard die: opposite faces sum to 7
// Face order for box geometry: +x, -x, +y, -y, +z, -z
// We map: +z=front(1), -z=back(6), +y=top(2), -y=bottom(5), +x=right(3), -x=left(4)
// Standard: 1 opposite 6, 2 opposite 5, 3 opposite 4
const FACE_VALUES: Record<number, { value: number; axis: "x" | "y" | "z"; sign: 1 | -1 }> = {
  0: { value: 3, axis: "x", sign: 1 },   // +x
  1: { value: 4, axis: "x", sign: -1 },   // -x
  2: { value: 2, axis: "y", sign: 1 },    // +y
  3: { value: 5, axis: "y", sign: -1 },   // -y
  4: { value: 1, axis: "z", sign: 1 },    // +z
  5: { value: 6, axis: "z", sign: -1 },   // -z
};

// Rotation to show a specific value on top (+y)
function getTargetRotation(value: number): [number, number, number] {
  switch (value) {
    case 1: return [-Math.PI / 2, 0, 0];  // +z face → rotate to top
    case 2: return [0, 0, 0];              // +y already on top
    case 3: return [0, 0, Math.PI / 2];   // +x face → rotate to top
    case 4: return [0, 0, -Math.PI / 2];  // -x face → rotate to top
    case 5: return [Math.PI, 0, 0];       // -y face → rotate to top
    case 6: return [Math.PI / 2, 0, 0];   // -z face → rotate to top
    default: return [0, 0, 0];
  }
}

// Deterministic pseudo-random spin for a given slot+trigger
function computeSpinRotation(slot: number, trigger: number): THREE.Euler {
  const seed = (slot * 7 + trigger * 13) % 97 / 97;
  const seed2 = ((slot + 3) * 11 + trigger * 17) % 89 / 89;
  const seed3 = ((slot + 7) * 5 + trigger * 23) % 83 / 83;
  return new THREE.Euler(
    seed * Math.PI * 6 - Math.PI * 3,
    seed2 * Math.PI * 6 - Math.PI * 3,
    seed3 * Math.PI * 4 - Math.PI * 2
  );
}

interface Die3DProps {
  slot: number;
  value: number;
  state: "rolling" | "rolled" | "selected" | "kept" | "empty" | "opponent-selected" | "non-scoring";
  position: [number, number, number];
  onClick?: () => void;
  rollTrigger: number; // increment to trigger new roll animation
}

export function Die3D({ slot, value, state, position, onClick, rollTrigger }: Die3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [animPhase, setAnimPhase] = useState<"idle" | "spinning" | "settling">("idle");
  const animProgress = useRef(0);
  const spinRotation = useRef(new THREE.Euler());
  const prevTrigger = useRef(rollTrigger);
  const bounceY = useRef(0);

  const targetRotation = useMemo(() => {
    const [rx, ry, rz] = getTargetRotation(value);
    return new THREE.Euler(rx, ry, rz);
  }, [value]);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return;

    // Detect new roll trigger inside useFrame (refs are safe here)
    if (rollTrigger !== prevTrigger.current) {
      prevTrigger.current = rollTrigger;
      if (state === "rolling" || state === "rolled" || state === "selected" || state === "opponent-selected" || state === "non-scoring") {
        setAnimPhase("spinning");
        animProgress.current = 0;
        spinRotation.current = computeSpinRotation(slot, rollTrigger);
      }
    }

    if (animPhase === "spinning") {
      animProgress.current += delta * 2.5;
      const t = Math.min(animProgress.current, 1);

      // Tumble through random rotation
      const spinT = easeOutCubic(t);
      meshRef.current.rotation.x = spinRotation.current.x * (1 - spinT) + targetRotation.x * spinT;
      meshRef.current.rotation.y = spinRotation.current.y * (1 - spinT) + targetRotation.y * spinT;
      meshRef.current.rotation.z = spinRotation.current.z * (1 - spinT) + targetRotation.z * spinT;

      // Bounce arc
      bounceY.current = Math.sin(t * Math.PI) * 1.2 * (1 - t);

      if (t >= 1) {
        setAnimPhase("settling");
        animProgress.current = 0;
      }
    } else if (animPhase === "settling") {
      animProgress.current += delta * 6;
      const t = Math.min(animProgress.current, 1);
      // Small bounce settle
      bounceY.current = Math.sin(t * Math.PI * 2) * 0.1 * (1 - t);

      if (t >= 1) {
        bounceY.current = 0;
        setAnimPhase("idle");
      }
    } else {
      // Idle — gently slerp to target rotation
      meshRef.current.rotation.x += (targetRotation.x - meshRef.current.rotation.x) * 0.1;
      meshRef.current.rotation.y += (targetRotation.y - meshRef.current.rotation.y) * 0.1;
      meshRef.current.rotation.z += (targetRotation.z - meshRef.current.rotation.z) * 0.1;
      bounceY.current *= 0.9;
    }

    // Selected dice float up slightly and pulse
    const baseY = position[1] + bounceY.current;
    const elapsed = clock.getElapsedTime();
    if (state === "selected") {
      meshRef.current.position.y = baseY + Math.sin(elapsed * 5) * 0.08 + 0.3;
    } else if (state === "opponent-selected") {
      // Subtle hover for opponent's consideration
      meshRef.current.position.y = baseY + Math.sin(elapsed * 3) * 0.05 + 0.15;
    } else {
      meshRef.current.position.y = baseY;
    }

    meshRef.current.position.x = position[0];
    meshRef.current.position.z = position[2];
  });

  if (state === "empty") {
    return (
      <group position={position}>
        <mesh>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshStandardMaterial
            color="#3d2b1a"
            transparent
            opacity={0.1}
            wireframe
          />
        </mesh>
      </group>
    );
  }

  const isKept = state === "kept";
  const isSelected = state === "selected";
  const isOpponentSelected = state === "opponent-selected";
  const isNonScoring = state === "non-scoring";

  // Bone/ivory dice colors — medieval style
  // Non-scoring dice are dimmed/grayed out
  const bodyColor = isNonScoring ? "#7a7568" : isKept ? "#8a7040" : isSelected ? "#e8dcc8" : isOpponentSelected ? "#e8dcc8" : "#ddd4be";
  const emissiveColor = isSelected ? "#4488cc" : isOpponentSelected ? "#cc5522" : isKept ? "#665510" : "#000000";
  const emissiveIntensity = isSelected ? 0.25 : isOpponentSelected ? 0.2 : isKept ? 0.1 : 0;

  return (
    <group ref={meshRef} position={position}>
      {/* Selection / kept / opponent glow */}
      {(isSelected || isKept || isOpponentSelected) && (
        <pointLight
          color={isSelected ? "#60a5fa" : isOpponentSelected ? "#f97316" : "#f59e0b"}
          intensity={isSelected ? 2 : isOpponentSelected ? 1.5 : 1}
          distance={3}
        />
      )}

      {/* Invisible click hitbox — only this mesh receives pointer events */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        <meshStandardMaterial visible={false} />
      </mesh>

      {/* Die body — visual only, no pointer events */}
      <mesh castShadow receiveShadow raycast={() => null}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={isKept ? 0.6 : 0.3}
          metalness={isKept ? 0.1 : 0.05}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Rounded edges — visual only */}
      <mesh castShadow raycast={() => null}>
        <boxGeometry args={[0.92, 0.86, 0.86]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh castShadow raycast={() => null}>
        <boxGeometry args={[0.86, 0.92, 0.86]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh castShadow raycast={() => null}>
        <boxGeometry args={[0.86, 0.86, 0.92]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.05} />
      </mesh>

      {/* Dots on all 6 faces — visual only */}
      {Object.entries(FACE_VALUES).map(([, face]) => {
        const dots = DOT_LAYOUTS[face.value] ?? [];
        return dots.map(([u, v], dotIdx) => {
          let px = 0, py = 0, pz = 0;
          if (face.axis === "x") {
            px = face.sign * 0.46;
            py = v;
            pz = -u * face.sign;
          } else if (face.axis === "y") {
            px = u;
            py = face.sign * 0.46;
            pz = -v * face.sign;
          } else {
            px = u * face.sign;
            py = v;
            pz = face.sign * 0.46;
          }
          return (
            <mesh
              key={`${face.value}-${dotIdx}`}
              position={[px, py, pz]}
              raycast={() => null}
            >
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshStandardMaterial
                color={isKept ? "#1a1206" : "#1a1a1a"}
                roughness={0.8}
              />
            </mesh>
          );
        });
      })}
    </group>
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
