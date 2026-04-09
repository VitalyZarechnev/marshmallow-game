import { observer } from "mobx-react-lite";
import { useGameStore } from "../../stores/GameStore";
import "./GearButton.scss";

export const GearButton = observer(function GearButton() {
  const store = useGameStore();

  if (store.isGameOver || store.showWinScreen || store.paused) return null;

  return (
    <button
      className="gear-button"
      onClick={() => store.setPaused(true)}
      aria-label="Settings"
    >
      ⚙
    </button>
  );
});
