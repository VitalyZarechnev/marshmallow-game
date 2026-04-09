import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useGameStore } from "../../stores/GameStore";
import { generateLevel } from "../../utils/levelGenerator";
import { createGrassTexture, createDirtTexture } from "../../utils/textures";
import { createIslandBoxGeometry, createIslandTopGeometry } from "../../utils/islandGeometry";
import { ISLAND_HEIGHT, WATER_BOTTOM } from "../../config/constants";
import { SandIsland } from "../molecules/SandIsland";
import { CoffeeMug } from "../atoms/CoffeeMug";
import { Mob } from "./Mob";
import { Modifier } from "../molecules/Modifier";
import type { IslandData } from "../../utils/levelGenerator";

// Cached textures (shared across all grass islands)
const grassTex = createGrassTexture();
const dirtTex = createDirtTexture();

function getIslandMetrics(data: IslandData) {
  const topY = data.y + ISLAND_HEIGHT;
  const pillarHeight = topY - WATER_BOTTOM;
  const centerY = WATER_BOTTOM + pillarHeight / 2;
  return { pillarHeight, centerY, topY };
}

export function GrassIslands() {
  const store = useGameStore();
  const level = useMemo(() => generateLevel(store.difficultyConfig), [store.difficultyConfig]);

  useEffect(() => {
    store.setGoalPosition(level.goalX, level.goalZ);
  }, [level.goalX, level.goalZ, store]);

  // Separate grass and sand islands
  const { grassIslands, sandIslands } = useMemo(() => {
    const grass: IslandData[] = [];
    const sand: IslandData[] = [];
    for (const island of level.islands) {
      if (level.sandIslandIds.has(island.id)) {
        sand.push(island);
      } else {
        grass.push(island);
      }
    }
    return { grassIslands: grass, sandIslands: sand };
  }, [level]);

  // Merge all grass islands into TWO geometries: boxes (dirt) + top planes (grass)
  const { mergedBoxes, mergedTops } = useMemo(() => {
    const boxes: THREE.BufferGeometry[] = [];
    const tops: THREE.BufferGeometry[] = [];

    for (const data of grassIslands) {
      const { pillarHeight, centerY, topY } = getIslandMetrics(data);

      const box = createIslandBoxGeometry(data.w, pillarHeight, data.d);
      box.translate(data.x, centerY, data.z);
      boxes.push(box);

      const top = createIslandTopGeometry(data.w, data.d);
      top.translate(data.x, topY + 0.01, data.z);
      tops.push(top);
    }

    const mBoxes = boxes.length > 0 ? mergeGeometries(boxes, false) : null;
    const mTops = tops.length > 0 ? mergeGeometries(tops, false) : null;

    for (const g of boxes) g.dispose();
    for (const g of tops) g.dispose();

    return { mergedBoxes: mBoxes, mergedTops: mTops };
  }, [grassIslands]);

  return (
    <>
      {/* Merged grass island sides — dirt texture, 1 draw call */}
      {mergedBoxes && (
        <mesh castShadow receiveShadow geometry={mergedBoxes}>
          <meshStandardMaterial map={dirtTex} />
        </mesh>
      )}

      {/* Merged grass island tops — grass texture, 1 draw call */}
      {mergedTops && (
        <mesh castShadow receiveShadow geometry={mergedTops}>
          <meshStandardMaterial map={grassTex} />
        </mesh>
      )}

      {/* Physics colliders for grass islands (no visuals) */}
      {grassIslands.map((data) => {
        const { pillarHeight, centerY } = getIslandMetrics(data);
        return (
          <RigidBody
            key={data.id}
            type="fixed"
            position={[data.x, centerY, data.z]}
            colliders={false}
          >
            <CuboidCollider args={[data.w / 2, pillarHeight / 2, data.d / 2]} />
          </RigidBody>
        );
      })}

      {/* Sand islands (individual — they animate) */}
      {sandIslands.map((island) => (
        <SandIsland key={island.id} data={island} />
      ))}

      {/* Mobs */}
      {level.islands
        .filter((island) => level.mobIslandIds.has(island.id))
        .map((island) => (
          <Mob
            key={`mob-${island.id}`}
            islandX={island.x}
            islandY={island.y}
            islandZ={island.z}
            islandW={island.w}
            islandD={island.d}
          />
        ))}

      {/* Modifiers */}
      {level.modifiers.map((mod) => (
        <Modifier key={`mod-${mod.id}`} data={mod} />
      ))}

      <CoffeeMug x={level.goalX} y={level.goalY} z={level.goalZ} />
    </>
  );
}
