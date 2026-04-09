import { useState } from "react";
import type { SkinId } from "../../stores/GameStore";
import { gameStore } from "../../stores/GameStore";
import { statsStore } from "../../stores/StatsStore";
import type { DifficultyId } from "../../config/difficulty";
import { Button } from "../atoms/Button";
import { Headline } from "../atoms/typography/Headline";
import { Paragraph } from "../atoms/typography/Paragraph";
import "./MainMenu.scss";

const DIFFICULTIES: { id: DifficultyId; label: string; emoji: string }[] = [
  { id: "easy", label: "Лёгкий", emoji: "😊" },
  { id: "medium", label: "Средний", emoji: "😐" },
  { id: "hard", label: "Сложный", emoji: "💀" },
];

interface MainMenuProps {
  readonly onPlay: () => void;
}

const SKINS: { id: SkinId; label: string; emoji: string }[] = [
  { id: "default", label: "Базовый", emoji: "🤍" },
  { id: "sunglasses", label: "Очки", emoji: "🕶️" },
  { id: "cowboy", label: "Ковбой", emoji: "🤠" },
  { id: "angel", label: "Ангел", emoji: "😇" },
];

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

export function MainMenu({ onPlay }: MainMenuProps) {
  const [showAuthors, setShowAuthors] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<SkinId>("default");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>("medium");

  const handleSkinSelect = (id: SkinId) => {
    setSelectedSkin(id);
    gameStore.setSkin(id);
  };

  const handleDifficultySelect = (id: DifficultyId) => {
    setSelectedDifficulty(id);
    gameStore.setDifficulty(id);
  };

  return (
    <div className="main-menu">
      <Headline level={1} className="main-menu__title">Зефирка</Headline>
      <Paragraph className="main-menu__subtitle">Помоги зефирке найти кофе ☕</Paragraph>

      <div className="main-menu__skins">
        {SKINS.map((skin) => (
          <button
            key={skin.id}
            className={`main-menu__skin-btn${selectedSkin === skin.id ? " main-menu__skin-btn--active" : ""}`}
            onClick={() => handleSkinSelect(skin.id)}
          >
            <Paragraph as="span" className="main-menu__skin-emoji">{skin.emoji}</Paragraph>
            <Paragraph as="span" className="main-menu__skin-label">{skin.label}</Paragraph>
          </button>
        ))}
      </div>

      <div className="main-menu__difficulties">
        {DIFFICULTIES.map((diff) => (
          <button
            key={diff.id}
            className={`main-menu__diff-btn${selectedDifficulty === diff.id ? " main-menu__diff-btn--active" : ""}`}
            onClick={() => handleDifficultySelect(diff.id)}
          >
            <Paragraph as="span" className="main-menu__diff-emoji">{diff.emoji}</Paragraph>
            <Paragraph as="span" className="main-menu__diff-label">{diff.label}</Paragraph>
          </button>
        ))}
      </div>

      <div className="main-menu__buttons">
        <Button variant="primary" onClick={onPlay}>Играть</Button>
        <Button variant="secondary" onClick={() => setShowStats(true)}>Статистика</Button>
        <Button variant="secondary" onClick={() => setShowAuthors(true)}>Авторы</Button>
      </div>

      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal-overlay__card" onClick={(e) => e.stopPropagation()}>
            <Headline level={2} className="modal-overlay__title">Статистика</Headline>
            <ul className="stat-list">
              <StatRow label="Прыжки" value={statsStore.jumps} />
              <StatRow label="Зефирок подгорело" value={statsStore.deathsByExplosion} />
              <StatRow label="Зефирок растаяло в воде" value={statsStore.deathsByDrowning} />
              <StatRow label="Затоплено песчаных островов" value={statsStore.sandIslandsSunk} />
              <StatRow label="Зефирок в кружке" value={statsStore.mugTouches} />
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
            <Button variant="ghost" onClick={() => setShowStats(false)}>Закрыть</Button>
          </div>
        </div>
      )}

      {showAuthors && (
        <div className="modal-overlay" onClick={() => setShowAuthors(false)}>
          <div className="modal-overlay__card" onClick={(e) => e.stopPropagation()}>
            <Headline level={2} className="modal-overlay__title">Авторы</Headline>
            <Paragraph className="modal-overlay__author">Zarechnev Vitaly</Paragraph>
            <Paragraph className="modal-overlay__tech-sub">
              <a href="https://github.com/VitalyZarechnev" target="_blank" rel="noopener noreferrer" style={{ color: "#f0c040" }}>github.com/VitalyZarechnev</a>
            </Paragraph>
            <Paragraph className="modal-overlay__tech">Marshmallow Platformer 3D</Paragraph>
            <Paragraph className="modal-overlay__tech-sub">Built with React Three Fiber</Paragraph>
            <Button variant="ghost" onClick={() => setShowAuthors(false)}>Закрыть</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <li className="stat-list__row">
      <Paragraph as="span" className="stat-list__label">{label}</Paragraph>
      <Paragraph as="span" className="stat-list__value">{value}</Paragraph>
    </li>
  );
}
