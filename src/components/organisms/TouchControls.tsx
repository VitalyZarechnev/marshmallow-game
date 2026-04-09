import { Joystick } from "../molecules/Joystick";
import { JumpButton } from "../atoms/JumpButton";
import "./TouchControls.scss";

export { touchInput, isTouchDevice } from "../molecules/Joystick";

export function TouchControls() {
  return (
    <div className="touch-controls">
      <Joystick />
      <JumpButton />
    </div>
  );
}
