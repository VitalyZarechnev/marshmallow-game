import { observer } from "mobx-react-lite";
import { useGameStore } from "../../stores/GameStore";
import { Headline } from "../atoms/typography/Headline";
import { Paragraph } from "../atoms/typography/Paragraph";
import { Button } from "../atoms/Button";
import "./GameOverScreen.scss";

interface GameOverScreenProps {
  readonly onMainMenu: () => void;
}

export const GameOverScreen = observer(function GameOverScreen({ onMainMenu }: GameOverScreenProps) {
  const store = useGameStore();

  const isWin = store.showWinScreen;
  const isLose = store.isGameOver;

  if (!isWin && !isLose) return null;

  const variant = isWin ? "win" : "lose";

  return (
    <div className={`game-over game-over--${variant}`}>
      <Headline level={1} className={`game-over__title game-over__title--${variant}`}>
        {isWin ? "YOU WIN!" : "Потрачено"}
      </Headline>
      {isWin && (
        <Paragraph className="game-over__subtitle">
          Зефирка нашла свой кофе!
        </Paragraph>
      )}
      <div className="game-over__actions">
        <Button variant={isWin ? "primary" : "secondary"} onClick={() => store.restart()}>
          Заново
        </Button>
        <Button variant="secondary" onClick={onMainMenu}>
          Главное меню
        </Button>
      </div>
    </div>
  );
});
