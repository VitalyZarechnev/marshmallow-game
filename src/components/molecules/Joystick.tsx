import { useEffect, useRef } from "react";
import "./Joystick.scss";

// Global touch input state readable from useFrame
export const touchInput = {
  forward: 0,
  right: 0,
  jump: false,
};

export const isTouchDevice =
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

export function Joystick() {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const touchId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const RADIUS = 50;

  useEffect(() => {
    const zone = joystickRef.current;
    const knob = knobRef.current;
    if (!zone || !knob) return;

    const getCenter = () => {
      const rect = zone.getBoundingClientRect();
      center.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!dragging.current) return;
      let dx = clientX - center.current.x;
      let dy = clientY - center.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > RADIUS) {
        dx = (dx / dist) * RADIUS;
        dy = (dy / dist) * RADIUS;
      }
      touchInput.right = dx / RADIUS;
      touchInput.forward = -dy / RADIUS;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const handleStart = (clientX: number, clientY: number) => {
      dragging.current = true;
      getCenter();
      handleMove(clientX, clientY);
    };

    const handleEnd = () => {
      dragging.current = false;
      touchId.current = null;
      touchInput.forward = 0;
      touchInput.right = 0;
      knob.style.transform = "translate(0px, 0px)";
    };

    const onMouseDown = (e: MouseEvent) => { e.preventDefault(); handleStart(e.clientX, e.clientY); };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      touchId.current = t.identifier;
      handleStart(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchId.current) {
          e.preventDefault();
          handleMove(t.clientX, t.clientY);
          return;
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          e.preventDefault();
          handleEnd();
          return;
        }
      }
    };

    zone.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    zone.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      zone.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      zone.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      touchInput.forward = 0;
      touchInput.right = 0;
    };
  }, []);

  return (
    <div ref={joystickRef} className="joystick">
      <div ref={knobRef} className="joystick__knob" />
    </div>
  );
}
