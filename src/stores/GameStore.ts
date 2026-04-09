import { makeAutoObservable } from "mobx";
import { createContext, useContext } from "react";
import { DIFFICULTY_PRESETS, type DifficultyId, type DifficultyConfig } from "../config/difficulty";

const SPAWN_POINT = { x: 0, y: 3, z: 0 };

export type SkinId = "default" | "sunglasses" | "cowboy" | "angel";

export type ModifierType = "heart" | "jumpBoost" | "shield";

export class GameStore {
  isGrounded = true;
  skin: SkinId = "default";
  difficulty: DifficultyId = "medium";
  isJumping = false;
  position = { x: 0, y: 0.5, z: 0 };
  cameraYaw = 0;
  landingY = 0;
  lives = DIFFICULTY_PRESETS.medium.maxLives;
  isGameOver = false;
  isWin = false;
  winAnimating = false;
  showWinScreen = false;
  respawnRequested = false;
  resetEpoch = 0;
  goalX = 0;
  goalZ = 0;
  isBurning = false;
  paused = false;
  hasShield = false;
  hasJumpBoost = false;
  collectedModifierIds: Record<number, boolean> = {};

  constructor() {
    makeAutoObservable(this);
  }

  setGrounded(value: boolean) {
    this.isGrounded = value;
  }

  setJumping(value: boolean) {
    this.isJumping = value;
  }

  updatePosition(x: number, y: number, z: number) {
    this.position = { x, y, z };
  }

  setCameraYaw(value: number) {
    this.cameraYaw = value;
  }

  setLandingY(value: number) {
    this.landingY = value;
  }

  setGoalPosition(x: number, z: number) {
    this.goalX = x;
    this.goalZ = z;
  }

  win() {
    if (this.isWin || this.winAnimating || this.isGameOver) return;
    this.winAnimating = true;
    this.isWin = true;
  }

  showWin() {
    this.showWinScreen = true;
  }

  startBurning() {
    if (this.isGameOver || this.isWin || this.isBurning) return;
    this.isBurning = true;
  }

  finishBurning() {
    this.isBurning = false;
  }

  loseLife() {
    if (this.isGameOver || this.isWin) return;
    this.hasShield = false;
    this.hasJumpBoost = false;
    this.lives -= 1;
    if (this.lives <= 0) {
      this.lives = 0;
      this.isGameOver = true;
    } else {
      this.respawnRequested = true;
      this.resetEpoch++;
    }
  }

  consumeRespawn() {
    this.respawnRequested = false;
  }

  restart() {
    this.lives = this.difficultyConfig.maxLives;
    this.isGameOver = false;
    this.isWin = false;
    this.winAnimating = false;
    this.showWinScreen = false;
    this.isBurning = false;
    this.hasShield = false;
    this.hasJumpBoost = false;
    this.collectedModifierIds = {};
    this.respawnRequested = true;
    this.resetEpoch++;
  }

  setPaused(value: boolean) {
    this.paused = value;
  }

  collectModifier(modifierId: number, type: ModifierType) {
    if (type === "heart") {
      this.collectedModifierIds[modifierId] = true;
      this.lives = Math.min(this.lives + 1, 8);
    } else if (type === "jumpBoost") {
      this.hasJumpBoost = true;
    } else if (type === "shield") {
      this.hasShield = true;
    }
  }

  isModifierCollected(id: number): boolean {
    return !!this.collectedModifierIds[id];
  }

  breakShield() {
    this.hasShield = false;
  }

  setSkin(id: SkinId) {
    this.skin = id;
  }

  setDifficulty(id: DifficultyId) {
    this.difficulty = id;
    this.lives = this.difficultyConfig.maxLives;
  }

  get difficultyConfig(): DifficultyConfig {
    return DIFFICULTY_PRESETS[this.difficulty];
  }

  get spawnPoint() {
    return SPAWN_POINT;
  }
}

export const gameStore = new GameStore();

export const GameStoreContext = createContext<GameStore>(gameStore);

export const useGameStore = () => useContext(GameStoreContext);
