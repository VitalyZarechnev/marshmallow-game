import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { RigidBody, CuboidCollider, useRapier } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useGameStore } from "../../stores/GameStore";
import { touchInput } from "../molecules/Joystick";
import { WATER_Y } from "../../config/constants";
import { MarshmallowBody } from "../atoms/MarshmallowBody";
import { MarshmallowFace } from "../atoms/MarshmallowFace";
import { SkinAccessories } from "../atoms/SkinAccessories";
import { ShieldOrbit } from "../atoms/ShieldOrbit";
import { statsStore } from "../../stores/StatsStore";

const MOVE_SPEED = 7;
const JUMP_FORCE = 80;
const MIN_RISING_TIME = 0.1; // seconds - minimum time in rising phase
const DROWN_DURATION = 1.2; // seconds for drowning animation
const DROWN_SINK_SPEED = 1.5; // how fast marshmallow sinks
// BURN_DURATION is now dynamic via store.difficultyConfig.burnDuration

type JumpPhase = "grounded" | "rising" | "falling";

export function Player() {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();
  const store = useGameStore();
  const { rapier, world } = useRapier();

  const moveDir = useMemo(() => new THREE.Vector3(), []);
  const frontVec = useMemo(() => new THREE.Vector3(), []);
  const sideVec = useMemo(() => new THREE.Vector3(), []);
  const prevJumpRef = useRef(false);
  const jumpPhaseRef = useRef<JumpPhase>("grounded");
  const risingTimerRef = useRef(0);
  const deathCooldownRef = useRef(0);
  const smileRef = useRef<THREE.Mesh>(null);
  const surpriseRef = useRef<THREE.Mesh>(null);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const topCapMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const bottomCapMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // Drowning animation
  const isDrowning = useRef(false);
  const drownTimer = useRef(0);

  // Burning animation (creeper explosion)
  const isBurning = useRef(false);
  const burnTimer = useRef(0);
  const burnColor = useMemo(() => new THREE.Color(), []);
  const bodyOriginalColor = useMemo(() => new THREE.Color("#fff8f0"), []);
  const bodyBurnedColor = useMemo(() => new THREE.Color("#000000"), []);
  // GPU shader fire
  const fireGroupRef = useRef<THREE.Mesh>(null);
  const fireMatRef = useRef<THREE.ShaderMaterial>(null);

  // Splash particles
  const SPLASH_COUNT = 12;
  const splashRef = useRef<THREE.InstancedMesh>(null);
  const splashMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const splashTimer = useRef(-1); // -1 means inactive
  const splashParticles = useRef(
    Array.from({ length: 12 }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
    }))
  );
  const splashDummy = useMemo(() => new THREE.Object3D(), []);
  const wasGrounded = useRef(true);
  const squashTimer = useRef(-1); // -1 = inactive, 0+ = animating

  useFrame((_, delta) => {
    const rb = rigidBodyRef.current;
    if (!rb) return;
    if (store.paused) return;

    // Handle respawn
    if (store.respawnRequested) {
      const sp = store.spawnPoint;
      rb.setTranslation({ x: sp.x, y: sp.y, z: sp.z }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      jumpPhaseRef.current = "grounded";
      deathCooldownRef.current = 1.0;
      // Reset drowning & burning visuals
      isDrowning.current = false;
      drownTimer.current = 0;
      isBurning.current = false;
      burnTimer.current = 0;
      if (meshRef.current) {
        meshRef.current.visible = true;
        meshRef.current.scale.set(1, 1, 1);
      }
      for (const mat of [bodyMatRef.current, topCapMatRef.current, bottomCapMatRef.current]) {
        if (mat) {
          mat.opacity = 1;
          mat.transparent = false;
          mat.color.copy(bodyOriginalColor);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
      if (fireGroupRef.current) fireGroupRef.current.visible = false;
      if (fireMatRef.current) fireMatRef.current.uniforms.uIntensity.value = 0;
      store.consumeRespawn();
      return;
    }

    // Game over or win — freeze
    if (store.isGameOver || store.isWin) {
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (store.isWin && meshRef.current) {
        meshRef.current.visible = false;
      }
      return;
    }

    // Drowning animation in progress
    if (isDrowning.current) {
      drownTimer.current += delta;
      const t = Math.min(drownTimer.current / DROWN_DURATION, 1);

      // Freeze horizontal, sink slowly
      rb.setLinvel({ x: 0, y: -DROWN_SINK_SPEED, z: 0 }, true);

      // Shrink and fade
      if (meshRef.current) {
        const scale = 1 - t * 0.8;
        meshRef.current.scale.set(scale, scale, scale);
      }
      if (bodyMatRef.current) {
        bodyMatRef.current.transparent = true;
        bodyMatRef.current.opacity = 1 - t;
      }

      // Show surprised face while drowning
      if (smileRef.current && surpriseRef.current) {
        smileRef.current.visible = false;
        surpriseRef.current.visible = true;
      }

      // Rotate mesh to face camera
      if (meshRef.current) {
        meshRef.current.rotation.y = store.cameraYaw;
      }

      // Update position for camera tracking
      const pos = rb.translation();
      store.updatePosition(pos.x, pos.y, pos.z);

      // Animation complete → lose life
      if (t >= 1) {
        isDrowning.current = false;
        statsStore.recordDeathByDrowning();
        store.loseLife();
      }
      return;
    }

    // Detect store.isBurning → start burn animation OR break shield
    if (store.isBurning && !isBurning.current && !isDrowning.current) {
      if (store.hasShield) {
        store.breakShield();
        store.finishBurning();
      } else {
        isBurning.current = true;
        burnTimer.current = 0;
      }
    }

    // Burning animation in progress (creeper explosion) — player can still move!
    if (isBurning.current) {
      burnTimer.current += delta;
      const t = Math.min(burnTimer.current / store.difficultyConfig.burnDuration, 1);

      // Darken ALL body parts: white → pure black
      const allBodyMats = [bodyMatRef.current, topCapMatRef.current, bottomCapMatRef.current];
      for (const mat of allBodyMats) {
        if (mat) {
          burnColor.copy(bodyOriginalColor).lerp(bodyBurnedColor, t);
          mat.color.copy(burnColor);
          // Orange emissive glow that fades as it chars
          const glowT = t < 0.5 ? t * 2 : (1 - t) * 2; // peak at 50%
          mat.emissive.setRGB(glowT * 0.4, glowT * 0.1, 0);
          mat.emissiveIntensity = 1;
        }
      }

      // Surprised face
      if (smileRef.current && surpriseRef.current) {
        smileRef.current.visible = false;
        surpriseRef.current.visible = true;
      }

      // Update GPU fire shader uniforms
      if (fireMatRef.current) {
        fireMatRef.current.uniforms.uTime.value += delta;
        fireMatRef.current.uniforms.uIntensity.value = 1.0;
      }
      if (fireGroupRef.current) {
        fireGroupRef.current.visible = true;
      }

      // Burn complete → lose life
      if (t >= 1) {
        isBurning.current = false;
        burnTimer.current = 0;
        store.finishBurning();
        for (const mat of allBodyMats) {
          if (mat) {
            mat.color.copy(bodyOriginalColor);
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
        if (fireGroupRef.current) fireGroupRef.current.visible = false;
        if (fireMatRef.current) fireMatRef.current.uniforms.uIntensity.value = 0;
        statsStore.recordDeathByExplosion();
        store.loseLife();
      }
      // No return — player can still move while burning!
    }

    // Death cooldown
    if (deathCooldownRef.current > 0) {
      deathCooldownRef.current -= delta;
    }

    const vel = rb.linvel();
    const keys = getKeys();

    // Merge keyboard + touch input
    const forward = keys.forward || touchInput.forward > 0.1;
    const backward = keys.backward || touchInput.forward < -0.1;
    const left = keys.left || touchInput.right < -0.1;
    const right = keys.right || touchInput.right > 0.1;
    const jump = keys.jump || touchInput.jump;

    // Jump phase state machine:
    //   grounded → rising (on jump, min time before transition)
    //   rising → falling (vel.y < 0 AND min time elapsed)
    //   falling → grounded (vel.y near 0, actually landed)
    if (jumpPhaseRef.current === "rising") {
      risingTimerRef.current += delta;
      if (vel.y < 0 && risingTimerRef.current > MIN_RISING_TIME) {
        jumpPhaseRef.current = "falling";
      }
    } else if (jumpPhaseRef.current === "falling") {
      // Only land when vel.y is very small AND positive or zero (stopped by ground)
      if (vel.y >= 0 && vel.y < 0.1) {
        jumpPhaseRef.current = "grounded";
      }
    }
    const grounded = jumpPhaseRef.current === "grounded";
    if (store.isGrounded !== grounded) {
      store.setGrounded(grounded);
    }

    // Movement direction relative to camera's horizontal rotation
    // Use analog touch values when available, otherwise digital keyboard
    const hasTouchMove =
      Math.abs(touchInput.forward) > 0.1 || Math.abs(touchInput.right) > 0.1;
    if (hasTouchMove) {
      frontVec.set(0, 0, touchInput.forward);
      sideVec.set(touchInput.right, 0, 0);
      moveDir
        .subVectors(frontVec, sideVec)
        .clampLength(0, 1)
        .multiplyScalar(MOVE_SPEED);
    } else {
      frontVec.set(0, 0, Number(forward) - Number(backward));
      sideVec.set(Number(right) - Number(left), 0, 0);
      moveDir
        .subVectors(frontVec, sideVec)
        .normalize()
        .multiplyScalar(MOVE_SPEED);
    }

    // Apply camera's Y-axis rotation only (ignore pitch)
    const cameraYaw = Math.atan2(
      -(camera.matrix.elements[8]),
      -(camera.matrix.elements[10])
    );
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

    // Set velocity, preserving vertical component
    rb.setLinvel({ x: moveDir.x, y: vel.y, z: moveDir.z }, true);

    // Jump only on key-down edge while grounded
    const jumpPressed = jump && !prevJumpRef.current;
    prevJumpRef.current = jump;

    if (jumpPressed && grounded) {
      const jumpForce = store.hasJumpBoost ? JUMP_FORCE * 1.5 : JUMP_FORCE;
      rb.applyImpulse({ x: 0, y: jumpForce, z: 0 }, true);
      jumpPhaseRef.current = "rising";
      risingTimerRef.current = 0;
      statsStore.recordJump();
      if (!store.isJumping) {
        store.setJumping(true);
      }
    }
    if (grounded && store.isJumping) {
      store.setJumping(false);
    }

    // Toggle face: smile when grounded, surprised "O" when jumping (skip during burn/drown)
    if (smileRef.current && surpriseRef.current && !isBurning.current && !isDrowning.current) {
      smileRef.current.visible = grounded;
      surpriseRef.current.visible = !grounded;
    }

    // Detect landing moment → trigger splash
    if (grounded && !wasGrounded.current) {
      const sp = rb.translation();
      const landY = store.landingY > 0 ? store.landingY : sp.y - 1;
      splashTimer.current = 0;
      for (let i = 0; i < SPLASH_COUNT; i++) {
        const angle = (i / SPLASH_COUNT) * Math.PI * 2;
        const speed = 3 + Math.random() * 3;
        splashParticles.current[i].pos.set(sp.x, landY + 0.1, sp.z);
        splashParticles.current[i].vel.set(
          Math.cos(angle) * speed,
          2 + Math.random() * 3,
          Math.sin(angle) * speed
        );
      }
    }
    wasGrounded.current = grounded;

    // Update splash particles
    if (splashRef.current && splashMatRef.current && splashTimer.current >= 0) {
      splashTimer.current += delta;
      const t = splashTimer.current;
      const duration = 0.6;
      if (t >= duration) {
        splashTimer.current = -1;
        splashRef.current.visible = false;
      } else {
        splashRef.current.visible = true;
        splashMatRef.current.opacity = 1 - t / duration;
        for (let i = 0; i < SPLASH_COUNT; i++) {
          const p = splashParticles.current[i];
          p.vel.y -= 14 * delta;
          p.pos.addScaledVector(p.vel, delta);
          const scale = (1 - t / duration) * 0.15;
          splashDummy.position.copy(p.pos);
          splashDummy.scale.setScalar(scale);
          splashDummy.updateMatrix();
          splashRef.current!.setMatrixAt(i, splashDummy.matrix);
        }
        splashRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // Rotate mesh + squash & stretch based on jump phase
    if (meshRef.current) {
      meshRef.current.rotation.y = store.cameraYaw;

      // Trigger landing squash (splashTimer starts at 0 on landing)
      if (splashTimer.current >= 0 && splashTimer.current < 0.05) {
        squashTimer.current = 0;
      }

      // Squash & stretch
      let targetScaleY = 1;
      let targetScaleXZ = 1;

      if (squashTimer.current >= 0) {
        // Landing squash animation (~0.5s): fast squash → slow bounce-back
        squashTimer.current += delta;
        const t = squashTimer.current;
        const SQUASH_PHASE = 0.1;  // quick squash down
        const RECOVER_PHASE = 0.4; // slow elastic recovery
        const TOTAL = SQUASH_PHASE + RECOVER_PHASE;
        if (t < TOTAL) {
          if (t < SQUASH_PHASE) {
            // Phase 1: rapid squash
            const p = t / SQUASH_PHASE;
            const squash = p * 0.35;
            targetScaleY = 1 - squash;
            targetScaleXZ = 1 + squash * 0.8;
          } else {
            // Phase 2: elastic bounce-back with slight overshoot
            const p = (t - SQUASH_PHASE) / RECOVER_PHASE;
            // Damped sine for elastic feel: starts at max squash, recovers past 1, settles
            const ease = 1 - Math.pow(1 - p, 3); // cubic ease-out
            const overshoot = Math.sin(p * Math.PI * 1.5) * 0.08 * (1 - p);
            const squash = 0.35 * (1 - ease);
            targetScaleY = 1 - squash + overshoot;
            targetScaleXZ = 1 + squash * 0.8 - overshoot * 0.5;
          }
        } else {
          squashTimer.current = -1;
        }
      } else if (jumpPhaseRef.current === "rising") {
        targetScaleY = 1.25;
        targetScaleXZ = 0.82;
      } else if (jumpPhaseRef.current === "falling") {
        targetScaleY = 1.15;
        targetScaleXZ = 0.88;
      }

      // Smooth lerp toward target
      const lerpSpeed = 10 * delta;
      const curY = meshRef.current.scale.y;
      const curXZ = meshRef.current.scale.x;
      meshRef.current.scale.y = curY + (targetScaleY - curY) * lerpSpeed;
      meshRef.current.scale.x = curXZ + (targetScaleXZ - curXZ) * lerpSpeed;
      meshRef.current.scale.z = meshRef.current.scale.x;
    }

    // Update store position
    const pos = rb.translation();
    store.updatePosition(pos.x, pos.y, pos.z);

    // Check if reached goal (coffee mug)
    if (!store.isWin) {
      const dx = pos.x - store.goalX;
      const dz = pos.z - store.goalZ;
      if (dx * dx + dz * dz < 4) { // within ~2 units
        statsStore.recordMugTouch();
        store.win();
      }
    }

    // Raycast down for landing indicator, excluding own collider
    const ray = new rapier.Ray({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: -1, z: 0 });
    const hit = world.castRay(
      ray,
      200,
      true,
      undefined,
      undefined,
      undefined,
      rb,
    );
    if (hit && hit.timeOfImpact > 0) {
      store.setLandingY(pos.y - hit.timeOfImpact);
    } else {
      store.setLandingY(0);
    }

    // Check water contact: drown if below water AND no island nearby below
    // (landing surface is far below or no hit at all)
    const groundY = hit && hit.timeOfImpact > 0 ? pos.y - hit.timeOfImpact : -100;
    const overWater = groundY < WATER_Y;
    if (pos.y <= WATER_Y + 1.0 && overWater && deathCooldownRef.current <= 0 && !isDrowning.current) {
      // Cancel burning if active
      if (isBurning.current) {
        isBurning.current = false;
        burnTimer.current = 0;
        store.finishBurning();
        if (fireGroupRef.current) fireGroupRef.current.visible = false;
        for (const mat of allBodyMats) {
          if (mat) {
            mat.color.copy(bodyOriginalColor);
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }
      isDrowning.current = true;
      drownTimer.current = 0;
    }
  });

  return (<>
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      mass={1}
      friction={0}
      restitution={0}
      enabledRotations={[false, false, false]}
      colliders={false}
      position={[0, 5, 0]}
    >
      <CuboidCollider args={[0.8, 1, 0.8]} position={[0, 0.05, 0]} />
      <group ref={meshRef}>
        <MarshmallowBody
          bodyMatRef={bodyMatRef}
          topCapMatRef={topCapMatRef}
          bottomCapMatRef={bottomCapMatRef}
          fireGroupRef={fireGroupRef}
          fireMatRef={fireMatRef}
        />
        <MarshmallowFace
          smileRef={smileRef}
          surpriseRef={surpriseRef}
        />
        <SkinAccessories skin={store.skin} />
        <ShieldOrbit />
      </group>
    </RigidBody>
    {/* Landing splash particles (world-space) */}
    <instancedMesh
      ref={splashRef}
      args={[undefined, undefined, SPLASH_COUNT]}
      visible={false}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        ref={splashMatRef}
        color="#fff8f0"
        transparent
        opacity={1}
      />
    </instancedMesh>
  </>
  );
}
