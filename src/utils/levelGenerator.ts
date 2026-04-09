import {
  GRID_COLS, GRID_ROWS, ISLAND_W, ISLAND_D,
  SPAWN_COL, SPAWN_ROW, ISLAND_HEIGHT,
} from "../config/constants";
import type { DifficultyConfig } from "../config/difficulty";

export interface IslandData {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
}

export type ModifierType = "heart" | "jumpBoost" | "shield";

export interface ModifierData {
  readonly id: number;
  readonly type: ModifierType;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GeneratedLevel {
  readonly islands: readonly IslandData[];
  readonly mobIslandIds: ReadonlySet<number>;
  readonly sandIslandIds: ReadonlySet<number>;
  readonly modifiers: readonly ModifierData[];
  readonly goalX: number;
  readonly goalY: number;
  readonly goalZ: number;
}

type Cell = { row: number; col: number };

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateMaze(): { visited: boolean[][]; parent: (Cell | null)[][] } {
  const visited: boolean[][] = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(false)
  );
  const parent: (Cell | null)[][] = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(null)
  );
  const inMaze: boolean[][] = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(false)
  );

  const stack: Cell[] = [{ row: SPAWN_ROW, col: SPAWN_COL }];
  inMaze[SPAWN_ROW][SPAWN_COL] = true;

  const dirs: Cell[] = [
    { row: -1, col: 0 }, { row: 1, col: 0 },
    { row: 0, col: -1 }, { row: 0, col: 1 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = shuffleArray(dirs)
      .map((d) => ({ row: current.row + d.row, col: current.col + d.col }))
      .filter(
        (n) =>
          n.row >= 0 && n.row < GRID_ROWS &&
          n.col >= 0 && n.col < GRID_COLS &&
          !inMaze[n.row][n.col]
      );

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[0];
    inMaze[next.row][next.col] = true;
    visited[next.row][next.col] = true;
    parent[next.row][next.col] = { row: current.row, col: current.col };
    stack.push(next);
  }

  visited[SPAWN_ROW][SPAWN_COL] = true;
  return { visited, parent };
}

export function generateLevel(config: DifficultyConfig): GeneratedLevel {
  const { cellSize, mobSpawnChance, sandIslandChance } = config;
  const { visited } = generateMaze();

  const corners: Cell[] = [
    { row: 0, col: 0 }, { row: 0, col: GRID_COLS - 1 },
    { row: GRID_ROWS - 1, col: 0 }, { row: GRID_ROWS - 1, col: GRID_COLS - 1 },
  ];
  for (const corner of corners) {
    visited[corner.row][corner.col] = true;
  }

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (!visited[r][c] && Math.random() < 0.05) {
        visited[r][c] = true;
      }
    }
  }

  // Find farthest visited cell from spawn
  let goalRow = SPAWN_ROW;
  let goalCol = SPAWN_COL;
  let maxDist = 0;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (!visited[r][c]) continue;
      const dx = c - SPAWN_COL;
      const dz = r - SPAWN_ROW;
      const dist = dx * dx + dz * dz;
      if (dist > maxDist) { maxDist = dist; goalRow = r; goalCol = c; }
    }
  }

  // BFS shortest path from spawn to goal — protected cells
  const protectedCells = new Set<string>();
  {
    const bfsParent: (Cell | null)[][] = Array.from({ length: GRID_ROWS }, () =>
      Array(GRID_COLS).fill(null)
    );
    const bfsVisited: boolean[][] = Array.from({ length: GRID_ROWS }, () =>
      Array(GRID_COLS).fill(false)
    );
    const queue: Cell[] = [{ row: SPAWN_ROW, col: SPAWN_COL }];
    bfsVisited[SPAWN_ROW][SPAWN_COL] = true;
    const dirs: Cell[] = [
      { row: -1, col: 0 }, { row: 1, col: 0 },
      { row: 0, col: -1 }, { row: 0, col: 1 },
    ];
    while (queue.length > 0) {
      const c = queue.shift()!;
      if (c.row === goalRow && c.col === goalCol) break;
      for (const d of dirs) {
        const nr = c.row + d.row;
        const nc = c.col + d.col;
        if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS &&
            visited[nr][nc] && !bfsVisited[nr][nc]) {
          bfsVisited[nr][nc] = true;
          bfsParent[nr][nc] = { row: c.row, col: c.col };
          queue.push({ row: nr, col: nc });
        }
      }
    }
    protectedCells.add(`${SPAWN_ROW},${SPAWN_COL}`);
    let cur: Cell | null = { row: goalRow, col: goalCol };
    while (cur) {
      protectedCells.add(`${cur.row},${cur.col}`);
      cur = bfsParent[cur.row][cur.col];
    }
  }

  const islands: IslandData[] = [];
  const originX = -(GRID_COLS - 1) * cellSize * 0.5;
  const originZ = -(GRID_ROWS - 1) * cellSize * 0.5;

  const heightMap: number[][] = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => {
      const dx = c - SPAWN_COL;
      const dz = r - SPAWN_ROW;
      const dist = Math.sqrt(dx * dx + dz * dz);
      return Math.max(0, Math.min(16, dist * 1.0 + (Math.random() - 0.5) * 4));
    })
  );
  heightMap[SPAWN_ROW][SPAWN_COL] = 0;

  const spawnX = originX + SPAWN_COL * cellSize;
  const spawnZ = originZ + SPAWN_ROW * cellSize;
  islands.push({ id: 0, x: spawnX, y: 0, z: spawnZ, w: 5.5, d: 5.5 });

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (!visited[r][c]) continue;
      if (r === SPAWN_ROW && c === SPAWN_COL) continue;
      if (!protectedCells.has(`${r},${c}`) && Math.random() < 0.35) continue;
      const jitter = cellSize * config.islandJitter;
      const x = originX + c * cellSize + (Math.random() - 0.5) * jitter;
      const z = originZ + r * cellSize + (Math.random() - 0.5) * jitter;
      const y = heightMap[r][c];
      const w = ISLAND_W + (Math.random() - 0.5) * 1.0;
      const d = ISLAND_D + (Math.random() - 0.5) * 1.0;
      islands.push({ id: islands.length, x, y, z, w, d });
    }
  }

  const goalX2 = originX + goalCol * cellSize;
  const goalZ2 = originZ + goalRow * cellSize;
  const goalIsland = islands.find(
    (isl) => Math.abs(isl.x - goalX2) < 0.1 && Math.abs(isl.z - goalZ2) < 0.1
  ) ?? islands[islands.length - 1];

  const mobIslandIds = new Set<number>();
  for (let i = 1; i < islands.length; i++) {
    if (islands[i].id === goalIsland.id) continue;
    if (Math.random() < mobSpawnChance) {
      mobIslandIds.add(islands[i].id);
    }
  }

  const sandIslandIds = new Set<number>();
  for (let i = 1; i < islands.length; i++) {
    const id = islands[i].id;
    if (id === goalIsland.id) continue;
    if (mobIslandIds.has(id)) continue;
    if (Math.random() < sandIslandChance) {
      sandIslandIds.add(id);
    }
  }

  // Place modifiers on eligible islands (not spawn, not goal, not mob, not sand)
  const eligibleForModifiers = islands.filter(
    (isl) =>
      isl.id !== 0 &&
      isl.id !== goalIsland.id &&
      !mobIslandIds.has(isl.id) &&
      !sandIslandIds.has(isl.id)
  );
  const shuffledEligible = shuffleArray([...eligibleForModifiers]);

  const modifiers: ModifierData[] = [];
  let modId = 0;

  // 3 hearts, 2 jump boosts, 3 shields
  const counts: { type: ModifierType; count: number }[] = [
    { type: "heart", count: 3 },
    { type: "jumpBoost", count: 2 },
    { type: "shield", count: 3 },
  ];
  let idx = 0;
  for (const { type, count } of counts) {
    for (let i = 0; i < count && idx < shuffledEligible.length; i++, idx++) {
      const isl = shuffledEligible[idx];
      modifiers.push({
        id: modId++,
        type,
        x: isl.x,
        y: isl.y + ISLAND_HEIGHT + 1.5,
        z: isl.z,
      });
    }
  }

  return {
    islands,
    mobIslandIds,
    sandIslandIds,
    modifiers,
    goalX: goalIsland.x,
    goalY: goalIsland.y,
    goalZ: goalIsland.z,
  };
}
