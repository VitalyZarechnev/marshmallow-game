import * as THREE from "three";

function createPixelTexture(
  baseColor: string,
  variants: string[],
  threshold = 0.5,
  size = 16
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.random() > threshold) {
        ctx.fillStyle = variants[Math.floor(Math.random() * variants.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createGrassTexture(): THREE.CanvasTexture {
  return createPixelTexture(
    "#4a8c2a",
    ["#3d7a22", "#5a9e34", "#62a63a", "#448226", "#3a7020"],
    0.5
  );
}

export function createDirtTexture(): THREE.CanvasTexture {
  return createPixelTexture(
    "#8B6914",
    ["#7a5c10", "#9c7618", "#6b4e0e", "#a07a1c", "#785812"],
    0.5
  );
}

export function createSandTexture(): THREE.CanvasTexture {
  return createPixelTexture(
    "#dbc67b",
    ["#d4be72", "#e3ce84", "#c9b568", "#dbca80", "#cdb96a", "#e0c878"],
    0.4
  );
}

export function createSandSideTexture(): THREE.CanvasTexture {
  return createPixelTexture(
    "#c4a84e",
    ["#b89c44", "#d0b258", "#baa048", "#c8ac52", "#ae943e"],
    0.45
  );
}


export function createMountainTexture(): THREE.CanvasTexture {
  const w = 4096;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Sky gradient background (transparent at top, hazy at horizon)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, "rgba(135, 180, 220, 0)");
  skyGrad.addColorStop(0.5, "rgba(170, 200, 230, 0.05)");
  skyGrad.addColorStop(0.85, "rgba(190, 210, 235, 0.3)");
  skyGrad.addColorStop(1, "rgba(200, 215, 230, 0.5)");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  function seededRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function generateRidge(
    points: number, baseY: number, amplitude: number,
    roughness: number, seed: number
  ): number[] {
    const heights: number[] = [];
    for (let i = 0; i <= points; i++) heights.push(baseY);
    // 8 octaves for more detail
    for (let oct = 0; oct < 8; oct++) {
      const freq = Math.pow(2, oct);
      const amp = amplitude * Math.pow(roughness, oct);
      const phase = seededRandom(seed + oct * 13) * Math.PI * 2;
      for (let i = 0; i <= points; i++) {
        const t = (i / points) * Math.PI * 2;
        heights[i] -= amp * (
          Math.sin(t * freq + phase) * 0.5 +
          Math.sin(t * freq * 1.7 + phase * 2.3) * 0.3 +
          Math.sin(t * freq * 2.9 + phase * 0.7) * 0.2
        );
      }
    }
    // Jagged peaks
    for (let i = 0; i <= points; i++) {
      const t = (i / points) * Math.PI * 2;
      const peakNoise = Math.abs(Math.sin(t * 3 + seed) * Math.sin(t * 7 + seed * 2));
      heights[i] -= peakNoise * amplitude * 0.35;
      // Extra sharp ridges
      const sharp = Math.abs(Math.sin(t * 11 + seed * 5)) * Math.abs(Math.sin(t * 5 + seed * 3));
      heights[i] -= sharp * amplitude * 0.12;
    }
    return heights;
  }

  // 7 layers: far hazy → near vivid, with atmospheric perspective
  const layers = [
    { baseY: h * 0.42, amplitude: 60, roughness: 0.5, seed: 42, colorTop: "#8eaac5", colorBottom: "#a0bcd0", hasSnow: false, hazeAlpha: 0.35 },
    { baseY: h * 0.46, amplitude: 70, roughness: 0.5, seed: 1,  colorTop: "#6e92b0", colorBottom: "#80a4be", hasSnow: true, hazeAlpha: 0.25 },
    { baseY: h * 0.52, amplitude: 80, roughness: 0.5, seed: 7,  colorTop: "#4a7896", colorBottom: "#5c8aa8", hasSnow: true, hazeAlpha: 0.15 },
    { baseY: h * 0.58, amplitude: 95, roughness: 0.48, seed: 13, colorTop: "#2e6848", colorBottom: "#3e8058", hasSnow: true, hazeAlpha: 0.08 },
    { baseY: h * 0.65, amplitude: 105, roughness: 0.46, seed: 21, colorTop: "#1e5530", colorBottom: "#2e7040", hasSnow: true, hazeAlpha: 0.03 },
    { baseY: h * 0.74, amplitude: 55, roughness: 0.5, seed: 31, colorTop: "#1a4820", colorBottom: "#286030", hasSnow: false, hazeAlpha: 0 },
    { baseY: h * 0.84, amplitude: 30, roughness: 0.55, seed: 51, colorTop: "#103818", colorBottom: "#1e4e22", hasSnow: false, hazeAlpha: 0 },
  ];

  const points = w;
  for (const layer of layers) {
    const ridge = generateRidge(points, layer.baseY, layer.amplitude, layer.roughness, layer.seed);
    let minY = h;
    for (const y of ridge) { if (y < minY) minY = y; }
    const ridgeHeight = layer.baseY - minY;

    // Fill mountain shape
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= points; i++) ctx.lineTo((i / points) * w, ridge[i]);
    ctx.lineTo(w, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, minY, 0, h);
    grad.addColorStop(0, layer.colorTop);
    grad.addColorStop(1, layer.colorBottom);
    ctx.fillStyle = grad;
    ctx.fill();

    // Snow caps
    if (layer.hasSnow && ridgeHeight > 20) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i <= points; i++) ctx.lineTo((i / points) * w, ridge[i]);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.clip();
      for (let x = 0; x < w; x += 1) {
        const ridgeY = ridge[x];
        const localHeight = layer.baseY - ridgeY;
        if (localHeight > ridgeHeight * 0.45) {
          const snowAlpha = 0.55 + seededRandom(x * 0.1 + layer.seed) * 0.4;
          const snowHeight = 8 + seededRandom(x * 0.3 + layer.seed) * 14;
          const grad2 = ctx.createLinearGradient(0, ridgeY, 0, ridgeY + snowHeight);
          grad2.addColorStop(0, `rgba(240, 245, 250, ${snowAlpha})`);
          grad2.addColorStop(0.6, `rgba(230, 238, 245, ${snowAlpha * 0.4})`);
          grad2.addColorStop(1, `rgba(220, 230, 240, 0)`);
          ctx.fillStyle = grad2;
          ctx.fillRect(x, ridgeY, 1, snowHeight);
        }
      }
      ctx.restore();
    }

    // Ridge outline
    ctx.beginPath();
    ctx.strokeStyle = `rgba(0,0,0,0.06)`;
    ctx.lineWidth = 1;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * w;
      if (i === 0) ctx.moveTo(x, ridge[i]);
      else ctx.lineTo(x, ridge[i]);
    }
    ctx.stroke();

    // Atmospheric haze overlay on distant layers
    if (layer.hazeAlpha > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i <= points; i++) ctx.lineTo((i / points) * w, ridge[i]);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = `rgba(180, 200, 220, ${layer.hazeAlpha})`;
      ctx.fill();
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
