export type DifficultyId = "easy" | "medium" | "hard";

export interface DifficultyConfig {
  readonly cellSize: number;
  readonly mobSpawnChance: number;
  readonly sandIslandChance: number;
  readonly sandSinkSpeed: number;
  readonly burnDuration: number;
  readonly fuseTime: number;
  readonly maxLives: number;
  readonly islandJitter: number;
}

export const DIFFICULTY_PRESETS: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    cellSize: 5,
    mobSpawnChance: 0.15,
    sandIslandChance: 0.05,
    sandSinkSpeed: 0.7,
    burnDuration: 10.0,
    fuseTime: 2,
    maxLives: 5,
    islandJitter: 0.10,
  },
  medium: {
    cellSize: 10,
    mobSpawnChance: 0.25,
    sandIslandChance: 0.15,
    sandSinkSpeed: 1.2,
    burnDuration: 7.0,
    fuseTime: 1.3,
    maxLives: 3,
    islandJitter: 0.15,
  },
  hard: {
    cellSize: 12,
    mobSpawnChance: 0.35,
    sandIslandChance: 0.18,
    sandSinkSpeed: 2.0,
    burnDuration: 5.0,
    fuseTime: 0.9,
    maxLives: 1,
    islandJitter: 0.20,
  },
};
