import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { WATER_Y, SEABED_Y } from "../../config/constants";

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;

  // Sum of 3 sine waves for natural-looking waves
  float waveHeight(vec2 pos) {
    float h = 0.0;
    h += sin(pos.x * 0.4 + uTime * 0.8) * 0.15;
    h += sin(pos.y * 0.3 + uTime * 0.6 + 1.5) * 0.2;
    h += sin((pos.x + pos.y) * 0.2 + uTime * 1.1) * 0.1;
    // Smaller ripples
    h += sin(pos.x * 1.2 - uTime * 1.5) * 0.04;
    h += sin(pos.y * 1.5 + uTime * 1.8) * 0.03;
    return h;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Displace Y by wave function
    pos.y += waveHeight(pos.xz);

    // Compute normal from wave derivatives (finite differences)
    float eps = 0.5;
    float hL = waveHeight(pos.xz + vec2(-eps, 0.0));
    float hR = waveHeight(pos.xz + vec2(eps, 0.0));
    float hD = waveHeight(pos.xz + vec2(0.0, -eps));
    float hU = waveHeight(pos.xz + vec2(0.0, eps));
    vec3 waveNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
    vNormal = normalMatrix * waveNormal;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // Fresnel — edges reflect more (sky color)
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    fresnel = clamp(fresnel, 0.0, 1.0);

    // Base color: mix deep and shallow based on view angle
    vec3 waterColor = mix(uDeepColor, uShallowColor, fresnel * 0.6);

    // Sky reflection tint
    vec3 skyColor = vec3(0.53, 0.81, 0.92);
    waterColor = mix(waterColor, skyColor, fresnel * 0.4);

    // Specular highlight (Blinn-Phong sun reflection)
    vec3 halfDir = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 256.0);
    vec3 specColor = vec3(1.0, 0.95, 0.8) * spec * 1.5;

    // Foam on wave crests
    float waveH = vWorldPos.y - ${WATER_Y.toFixed(1)};
    float foam = smoothstep(0.2, 0.35, waveH);
    vec3 foamColor = vec3(0.9, 0.95, 1.0);
    waterColor = mix(waterColor, foamColor, foam * 0.5);

    vec3 finalColor = waterColor + specColor;

    gl_FragColor = vec4(finalColor, 0.75);
  }
`;

// -- Seabed shaders --

const seabedVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vHeight;

  // Simple hash-based noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    v += noise(p * 1.0) * 0.5;
    v += noise(p * 2.0) * 0.25;
    v += noise(p * 4.0) * 0.125;
    v += noise(p * 8.0) * 0.0625;
    return v;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Terrain displacement
    float h = fbm(pos.xz * 0.15) * 2.0;
    h += fbm(pos.xz * 0.4) * 0.6;
    // Rocky bumps
    h += step(0.7, noise(pos.xz * 0.8)) * 0.8;
    pos.y += h;
    vHeight = h;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const seabedFragmentShader = /* glsl */ `
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vHeight;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Sand base color with variation
    vec3 sandLight = vec3(0.76, 0.70, 0.50);
    vec3 sandDark = vec3(0.45, 0.38, 0.25);
    float n = noise(vWorldPos.xz * 0.3);
    vec3 sandColor = mix(sandDark, sandLight, n);

    // Rocky patches — darker
    float rock = smoothstep(0.55, 0.7, noise(vWorldPos.xz * 0.15));
    vec3 rockColor = vec3(0.3, 0.28, 0.22);
    sandColor = mix(sandColor, rockColor, rock * 0.7);

    // Small pebble detail
    float pebble = smoothstep(0.6, 0.65, noise(vWorldPos.xz * 2.0));
    sandColor = mix(sandColor, vec3(0.5, 0.45, 0.35), pebble * 0.4);

    // Moving caustics (light patterns from water surface)
    float c1 = noise(vWorldPos.xz * 0.8 + uTime * 0.3);
    float c2 = noise(vWorldPos.xz * 1.2 - uTime * 0.2 + 3.0);
    float caustic = smoothstep(0.4, 0.7, c1 * c2 * 4.0);
    sandColor += vec3(0.15, 0.18, 0.12) * caustic;

    // Depth tint — darker blue tint further from camera
    float depth = clamp(vWorldPos.y / -4.0, 0.0, 1.0);
    vec3 depthTint = vec3(0.08, 0.15, 0.25);
    sandColor = mix(sandColor, depthTint, depth * 0.3);

    gl_FragColor = vec4(sandColor, 1.0);
  }
`;

export function Floor() {
  const waterMatRef = useRef<THREE.ShaderMaterial>(null);
  const seabedMatRef = useRef<THREE.ShaderMaterial>(null);

  const waterUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uDeepColor: { value: new THREE.Color("#0a3d5c") },
      uShallowColor: { value: new THREE.Color("#1a8fb5") },
    }),
    []
  );

  const seabedUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  useFrame((_, delta) => {
    if (waterMatRef.current) {
      waterMatRef.current.uniforms.uTime.value += delta;
    }
    if (seabedMatRef.current) {
      seabedMatRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <>
      {/* Water surface — no solid collider, drowning is handled by Player */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 0]}>
        <planeGeometry args={[500, 500, 64, 64]} />
        <shaderMaterial
          ref={waterMatRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={waterUniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Seabed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEABED_Y, 0]}>
        <planeGeometry args={[500, 500, 48, 48]} />
        <shaderMaterial
          ref={seabedMatRef}
          vertexShader={seabedVertexShader}
          fragmentShader={seabedFragmentShader}
          uniforms={seabedUniforms}
        />
      </mesh>
    </>
  );
}
