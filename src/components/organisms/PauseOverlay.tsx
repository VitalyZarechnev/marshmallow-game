import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useGameStore } from "../../stores/GameStore";
import { statsStore } from "../../stores/StatsStore";
import { Button } from "../atoms/Button";
import { Headline } from "../atoms/typography/Headline";
import { Paragraph } from "../atoms/typography/Paragraph";
import "./PauseOverlay.scss";

const SKIN_LABELS: Record<string, string> = {
  default: "Базовый",
  sunglasses: "Очки",
  cowboy: "Ковбой",
  angel: "Ангел",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Лёгкий",
  medium: "Средний",
  hard: "Сложный",
};

const MODIFIER_LABELS: Record<string, string> = {
  heart: "Сердца",
  jumpBoost: "Ускорение прыжка",
  shield: "Щиты",
};

interface PauseOverlayProps {
  readonly onMainMenu: () => void;
}

export const PauseOverlay = observer(function PauseOverlay({ onMainMenu }: PauseOverlayProps) {
  const store = useGameStore();
  const [showStats, setShowStats] = useState(false);

  if (!store.paused) return null;

  const handleMainMenu = () => {
    store.setPaused(false);
    onMainMenu();
  };

  return (
    <div className="pause-overlay">
      {!showStats ? (
        <>
          <Headline level={2} className="pause-overlay__title">Пауза</Headline>
          <div className="pause-overlay__buttons">
            <Button variant="primary" onClick={() => store.setPaused(false)}>Продолжить</Button>
            <Button variant="secondary" onClick={() => setShowStats(true)}>Статистика</Button>
            <Button variant="secondary" onClick={handleMainMenu}>Главное меню</Button>
          </div>
        </>
      ) : (
        <div className="modal-overlay__card">
          <Headline level={2} className="modal-overlay__title">Статистика</Headline>
          <ul className="stat-list">
            <StatRow label="Прыжки" value={statsStore.jumps} />
            <StatRow label="Смерти от взрыва" value={statsStore.deathsByExplosion} />
            <StatRow label="Смерти от утопления" value={statsStore.deathsByDrowning} />
            <StatRow label="Затоплено песчаных островов" value={statsStore.sandIslandsSunk} />
            <StatRow label="Касания кружки" value={statsStore.mugTouches} />
          </ul>
          {Object.keys(statsStore.skinGames).length > 0 && (
            <>
              <Headline level={3} className="stat-list__section-title">Игры по скинам</Headline>
              <ul className="stat-list">
                {Object.entries(statsStore.skinGames).map(([skin, count]) => (
                  <StatRow key={skin} label={SKIN_LABELS[skin] ?? skin} value={count} />
                ))}
              </ul>
            </>
          )}
          {Object.keys(statsStore.difficultyGames).length > 0 && (
            <>
              <Headline level={3} className="stat-list__section-title">Игры по сложности</Headline>
              <ul className="stat-list">
                {Object.entries(statsStore.difficultyGames).map(([diff, count]) => (
                  <StatRow key={diff} label={DIFFICULTY_LABELS[diff] ?? diff} value={count} />
                ))}
              </ul>
            </>
          )}
          {Object.keys(statsStore.modifiersCollected).length > 0 && (
            <>
              <Headline level={3} className="stat-list__section-title">Собрано модификаторов</Headline>
              <ul className="stat-list">
                {Object.entries(statsStore.modifiersCollected).map(([mod, count]) => (
                  <StatRow key={mod} label={MODIFIER_LABELS[mod] ?? mod} value={count} />
                ))}
              </ul>
            </>
          )}
          <Button variant="ghost" onClick={() => setShowStats(false)}>Назад</Button>
        </div>
      )}
    </div>
  );
});

function StatRow({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <li className="stat-list__row">
      <Paragraph as="span" className="stat-list__label">{label}</Paragraph>
      <Paragraph as="span" className="stat-list__value">{value}</Paragraph>
    </li>
  );
}
