import { observer } from "mobx-react-lite";
import { useGameStore } from "../../stores/GameStore";
import { Paragraph } from "../atoms/typography/Paragraph";
import "./HUD.scss";

export const HUD = observer(function HUD() {
  const store = useGameStore();

  return (
    <div className="hud">
      <div className="hud__hearts">
        {Array.from({ length: Math.max(store.difficultyConfig.maxLives, store.lives) }, (_, i) => (
          <Paragraph
            key={i}
            as="span"
            className={`hud__heart${i >= store.lives ? " hud__heart--lost" : ""}`}
          >
            ❤️
          </Paragraph>
        ))}
      </div>
      {(store.hasShield || store.hasJumpBoost) && (
        <div className="hud__modifiers">
          {store.hasShield && (
            <Paragraph as="span" className="hud__modifier">🛡️</Paragraph>
          )}
          {store.hasJumpBoost && (
            <Paragraph as="span" className="hud__modifier">⬆️</Paragraph>
          )}
        </div>
      )}
    </div>
  );
});
