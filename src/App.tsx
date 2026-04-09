import { useState, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { GameStoreContext, gameStore } from "./stores/GameStore";
import { Perf } from "r3f-perf";
import { GameScene } from "./components/templates/GameScene";
import { TouchControls } from "./components/organisms/TouchControls";
import { HUD } from "./components/molecules/HUD";
import { GameOverScreen } from "./components/organisms/GameOverScreen";
import { PauseOverlay } from "./components/organisms/PauseOverlay";
import { GearButton } from "./components/atoms/GearButton";
import { MainMenu } from "./components/templates/MainMenu";
import { LoadingScreen } from "./components/atoms/LoadingScreen";
import { statsStore } from "./stores/StatsStore";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
];

const App = observer(function App() {
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleCreated = useCallback(() => {
    setLoaded(true);
  }, []);

  const handlePlay = useCallback(() => {
    statsStore.recordSkinGame(gameStore.skin);
    statsStore.recordDifficultyGame(gameStore.difficulty);
    gameStore.restart();
    setPlaying(true);
    setLoaded(false);
  }, []);

  const handleMainMenu = useCallback(() => {
    gameStore.setPaused(false);
    gameStore.restart();
    setPlaying(false);
  }, []);

  if (!playing) {
    return <MainMenu onPlay={handlePlay} />;
  }

  return (
    <GameStoreContext.Provider value={gameStore}>
      <KeyboardControls map={keyboardMap}>
        {!loaded && <LoadingScreen />}
        <Canvas
          shadows
          gl={{ powerPreference: "high-performance" }}
          camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 10, -10] }}
          style={{ width: "100vw", height: "100vh" }}
        >
          {new URLSearchParams(window.location.search).has("perf") && (
            <Perf position="top-left" deepAnalyze />
          )}
          <GameScene onReady={handleCreated} paused={gameStore.paused} />
        </Canvas>
      </KeyboardControls>
      <TouchControls />
      <HUD />
      <GearButton />
      <PauseOverlay onMainMenu={handleMainMenu} />
      <GameOverScreen onMainMenu={handleMainMenu} />
    </GameStoreContext.Provider>
  );
});

export default App;
