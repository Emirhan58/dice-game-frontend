"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Die3D } from "./die-3d";
import type { GameStateResponse, RolledDieDto } from "@/types/api";

interface DiceSceneProps {
  game: GameStateResponse;
  selectedSlots: number[];
  canSelect: boolean;
  onToggleSlot: (slot: number) => void;
  rollTrigger: number;
  bustAnimation: boolean;
  opponentSlots?: number[];
  bustDice?: RolledDieDto[] | null;
  scoringSlots?: Set<number>;
}

// Position dice in two rows of 3
function getSlotPosition(slot: number): [number, number, number] {
  const col = slot % 3;
  const row = Math.floor(slot / 3);
  return [
    (col - 1) * 1.3,           // x: -1.3, 0, 1.3
    0,                          // y: ground level
    (row - 0.5) * 1.3 + 0.2,   // z: front/back row
  ];
}

export function DiceScene({
  game,
  selectedSlots,
  canSelect,
  onToggleSlot,
  rollTrigger,
  bustAnimation,
  opponentSlots = [],
  bustDice,
  scoringSlots,
}: DiceSceneProps) {
  // During bust animation, show bust dice instead of game.lastRoll
  const diceToShow = bustDice ?? game.lastRoll;
  const rolledMap = new Map<number, RolledDieDto>();
  if (diceToShow) {
    for (const die of diceToShow) {
      rolledMap.set(die.slot, die);
    }
  }

  const allSlots = [0, 1, 2, 3, 4, 5];

  // Colors
  const feltColor = bustAnimation ? "#4a1c1c" : "#2d5a1e";
  const woodColor = bustAnimation ? "#3a1515" : "#3d2b1a";
  const borderColor = bustAnimation ? "#2a0e0e" : "#2a1c0e";

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-amber-900/30"
      style={{ height: "min(420px, 55vh)", background: "#1a0f08" }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 4.5, 4], fov: 40 }}
        style={{ background: "transparent" }}
      >
        {/* Warm tavern lighting */}
        <ambientLight intensity={0.4} color="#ffe4c4" />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.0}
          color="#ffd89b"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 5, -3]} intensity={0.3} color="#ffecd2" />
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#ff9944" distance={10} />

        {/* Wooden table surface */}
        <mesh
          receiveShadow
          rotation-x={-Math.PI / 2}
          position={[0, -0.55, 0]}
          onClick={(e) => e.stopPropagation()}
        >
          <planeGeometry args={[8, 6]} />
          <meshStandardMaterial color={woodColor} roughness={0.85} metalness={0.05} />
        </mesh>

        {/* Green felt playing area */}
        <mesh
          receiveShadow
          rotation-x={-Math.PI / 2}
          position={[0, -0.5, 0]}
          onClick={(e) => e.stopPropagation()}
        >
          <planeGeometry args={[5.5, 4]} />
          <meshStandardMaterial color={feltColor} roughness={0.95} metalness={0} />
        </mesh>

        {/* Raised wooden border */}
        {/* Top */}
        <mesh position={[0, -0.35, -2.1]} castShadow>
          <boxGeometry args={[6, 0.3, 0.25]} />
          <meshStandardMaterial color={borderColor} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Bottom */}
        <mesh position={[0, -0.35, 2.1]} castShadow>
          <boxGeometry args={[6, 0.3, 0.25]} />
          <meshStandardMaterial color={borderColor} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Left */}
        <mesh position={[-2.9, -0.35, 0]} castShadow>
          <boxGeometry args={[0.25, 0.3, 4.45]} />
          <meshStandardMaterial color={borderColor} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Right */}
        <mesh position={[2.9, -0.35, 0]} castShadow>
          <boxGeometry args={[0.25, 0.3, 4.45]} />
          <meshStandardMaterial color={borderColor} roughness={0.7} metalness={0.05} />
        </mesh>

        {/* Dice */}
        <group position={[0, 0, 0]}>
          {allSlots.map((slot) => {
            const rolledDie = rolledMap.get(slot);
            const pos = getSlotPosition(slot);

            if (rolledDie) {
              const isSelected = selectedSlots.includes(slot);
              const isOpponentSelected = opponentSlots.includes(slot);
              const isScoring = !scoringSlots || scoringSlots.has(slot);
              let dieState: "rolled" | "selected" | "opponent-selected" | "non-scoring" = "rolled";
              if (isSelected) dieState = "selected";
              else if (isOpponentSelected) dieState = "opponent-selected";
              else if (canSelect && !isScoring) dieState = "non-scoring";

              return (
                <Die3D
                  key={slot}
                  slot={slot}
                  value={rolledDie.value}
                  state={dieState}
                  position={pos}
                  onClick={canSelect && isScoring ? () => onToggleSlot(slot) : undefined}
                  rollTrigger={rollTrigger}
                />
              );
            }

            return (
              <Die3D
                key={slot}
                slot={slot}
                value={1}
                state="empty"
                position={pos}
                rollTrigger={0}
              />
            );
          })}
        </group>

        {/* Camera controls — limited */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2.5}
          minPolarAngle={Math.PI / 6}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
