import { Suspense, useEffect } from "react";
import { Physics } from "@react-three/rapier";
import { Sky } from "@react-three/drei";
import { Lighting } from "../atoms/Lighting";
import { LandingIndicator } from "../atoms/LandingIndicator";
import { Floor } from "../organisms/Floor";
import { Player } from "../organisms/Player";
import { GrassIslands } from "../organisms/GrassIslands";
import { Mountains } from "../organisms/Mountains";
import { FollowCamera } from "../organisms/FollowCamera";

interface GameSceneProps {
  readonly onReady?: () => void;
  readonly paused?: boolean;
}

function ReadyNotifier({ onReady }: { readonly onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

export function GameScene({ onReady, paused }: GameSceneProps) {
  return (
    <Suspense fallback={null}>
      <Sky
        distance={450000}
        sunPosition={[10, 15, 10]}
        turbidity={6}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <fog attach="fog" args={["#b0c8dc", 80, 220]} />
      <Lighting />
      <Physics gravity={[0, -20, 0]} paused={paused}>
        <Floor />
        <Player />
        <GrassIslands />
      </Physics>
      <Mountains />
      <LandingIndicator />
      <FollowCamera />
      <ReadyNotifier onReady={onReady} />
    </Suspense>
  );
}
