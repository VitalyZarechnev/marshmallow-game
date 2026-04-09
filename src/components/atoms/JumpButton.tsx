import { useCallback } from "react";
import { touchInput } from "../molecules/Joystick";
import "./JumpButton.scss";

export function JumpButton() {
  const handleJumpStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      touchInput.jump = true;
    },
    []
  );

  const handleJumpEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      touchInput.jump = false;
    },
    []
  );

  return (
    <button
      className="jump-button"
      onTouchStart={handleJumpStart}
      onTouchEnd={handleJumpEnd}
      onMouseDown={handleJumpStart}
      onMouseUp={handleJumpEnd}
    >
      JUMP
    </button>
  );
}
