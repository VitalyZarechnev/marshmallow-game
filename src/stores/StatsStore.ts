import { makeAutoObservable } from "mobx";
import type { SkinId } from "./GameStore";
import type { DifficultyId } from "../config/difficulty";
import type { ModifierType } from "../utils/levelGenerator";

const STORAGE_KEY = "marshmallow-stats";

interface StatsData {
  jumps: number;
  deathsByExplosion: number;
  deathsByDrowning: number;
  sandIslandsSunk: number;
  mugTouches: number;
  skinGames: Record<string, number>;
  difficultyGames: Record<string, number>;
  modifiersCollected: Record<string, number>;
}

const DEFAULT_STATS: StatsData = {
  jumps: 0,
  deathsByExplosion: 0,
  deathsByDrowning: 0,
  sandIslandsSunk: 0,
  mugTouches: 0,
  skinGames: {},
  difficultyGames: {},
  modifiersCollected: {},
};

function loadStats(): StatsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_STATS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_STATS };
}

export class StatsStore {
  jumps: number;
  deathsByExplosion: number;
  deathsByDrowning: number;
  sandIslandsSunk: number;
  mugTouches: number;
  skinGames: Record<string, number>;
  difficultyGames: Record<string, number>;
  modifiersCollected: Record<string, number>;

  constructor() {
    const data = loadStats();
    this.jumps = data.jumps;
    this.deathsByExplosion = data.deathsByExplosion;
    this.deathsByDrowning = data.deathsByDrowning;
    this.sandIslandsSunk = data.sandIslandsSunk;
    this.mugTouches = data.mugTouches;
    this.skinGames = data.skinGames;
    this.difficultyGames = data.difficultyGames;
    this.modifiersCollected = data.modifiersCollected;
    makeAutoObservable(this);
  }

  private save() {
    const data: StatsData = {
      jumps: this.jumps,
      deathsByExplosion: this.deathsByExplosion,
      deathsByDrowning: this.deathsByDrowning,
      sandIslandsSunk: this.sandIslandsSunk,
      mugTouches: this.mugTouches,
      skinGames: this.skinGames,
      difficultyGames: this.difficultyGames,
      modifiersCollected: this.modifiersCollected,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore quota errors
    }
  }

  recordJump() {
    this.jumps++;
    this.save();
  }

  recordDeathByExplosion() {
    this.deathsByExplosion++;
    this.save();
  }

  recordDeathByDrowning() {
    this.deathsByDrowning++;
    this.save();
  }

  recordSandIslandSunk() {
    this.sandIslandsSunk++;
    this.save();
  }

  recordMugTouch() {
    this.mugTouches++;
    this.save();
  }

  recordSkinGame(skin: SkinId) {
    this.skinGames = {
      ...this.skinGames,
      [skin]: (this.skinGames[skin] ?? 0) + 1,
    };
    this.save();
  }

  recordDifficultyGame(difficulty: DifficultyId) {
    this.difficultyGames = {
      ...this.difficultyGames,
      [difficulty]: (this.difficultyGames[difficulty] ?? 0) + 1,
    };
    this.save();
  }

  recordModifierCollected(type: ModifierType) {
    this.modifiersCollected = {
      ...this.modifiersCollected,
      [type]: (this.modifiersCollected[type] ?? 0) + 1,
    };
    this.save();
  }
}

export const statsStore = new StatsStore();
