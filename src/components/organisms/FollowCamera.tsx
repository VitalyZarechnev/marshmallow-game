import { useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../../stores/GameStore";
import { isTouchDevice, touchInput } from "../molecules/Joystick";

const CAMERA_DISTANCE = 20;
const CAMERA_HEIGHT_OFFSET = 4;
const LERP_FACTOR = 0.1;
const INTRO_START_DISTANCE = 200;
const INTRO_DURATION = 3.0;
const MOUSE_SENSITIVITY = 0.002;
const TOUCH_SENSITIVITY = 0.004;
const MIN_PITCH = 0.15;
const MAX_PITCH = 0.7;
const AUTO_YAW_SPEED = 0.8;

export function FollowCamera() {
  const { gl, camera } = useThree();
  const store = useGameStore();
  const [, getKeys] = useKeyboardControls();

  const yaw = useRef(0);
  const pitch = useRef(0.25);
  const targetPos = useRef(new THREE.Vector3());
  const smoothY = useRef(0);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const introTimer = useRef(0);
  const introDone = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    yaw.current -= e.movementX * MOUSE_SENSITIVITY;
    pitch.current -= e.movementY * MOUSE_SENSITIVITY;
    pitch.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch.current));
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;

    const canvas = gl.domElement;
    const rightDragging = { current: false };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) {
        rightDragging.current = true;
        e.preventDefault();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) {
        rightDragging.current = false;
      }
    };

    const handleMoveWrapper = (e: MouseEvent) => {
      if (rightDragging.current) handleMouseMove(e);
    };

    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMoveWrapper);
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMoveWrapper);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [gl, handleMouseMove]);

  useEffect(() => {
    if (!isTouchDevice) return;

    const canvas = gl.domElement;
    const halfWidth = () => window.innerWidth / 2;

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX > halfWidth()) {
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!lastTouchRef.current) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX > halfWidth() - 50) {
          const dx = touch.clientX - lastTouchRef.current.x;
          const dy = touch.clientY - lastTouchRef.current.y;
          yaw.current -= dx * TOUCH_SENSITIVITY;
          pitch.current -= dy * TOUCH_SENSITIVITY;
          pitch.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch.current));
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    };

    const handleTouchEnd = () => { lastTouchRef.current = null; };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const { x, y, z } = store.position;

    const yLerp = 1 - Math.pow(0.02, delta);
    smoothY.current += (y - smoothY.current) * yLerp;

    const keys = getKeys();
    const leftInput = keys.left || touchInput.right < -0.1;
    const rightInput = keys.right || touchInput.right > 0.1;
    if (leftInput && !rightInput) {
      yaw.current += AUTO_YAW_SPEED * delta;
    } else if (rightInput && !leftInput) {
      yaw.current -= AUTO_YAW_SPEED * delta;
    }

    const sy = smoothY.current;

    let dist = CAMERA_DISTANCE;
    let heightOff = CAMERA_HEIGHT_OFFSET;
    if (!introDone.current) {
      introTimer.current += delta;
      const t = Math.min(introTimer.current / INTRO_DURATION, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      dist = THREE.MathUtils.lerp(INTRO_START_DISTANCE, CAMERA_DISTANCE, ease);
      heightOff = THREE.MathUtils.lerp(CAMERA_HEIGHT_OFFSET * 8, CAMERA_HEIGHT_OFFSET, ease);
      if (t >= 1) introDone.current = true;
    }

    const camX = x + dist * Math.sin(yaw.current) * Math.cos(pitch.current);
    const camY = sy + heightOff + dist * Math.sin(pitch.current);
    const camZ = z + dist * Math.cos(yaw.current) * Math.cos(pitch.current);

    if (!introDone.current) {
      camera.position.set(camX, camY, camZ);
    } else {
      camera.position.lerp(targetPos.current.set(camX, camY, camZ), LERP_FACTOR);
    }
    camera.lookAt(x, sy + CAMERA_HEIGHT_OFFSET * 0.5, z);
    store.setCameraYaw(yaw.current);
  });

  return null;
}
