/**
 * Filter Engines
 */

export type EngineName = 'swirl' | 'twirl' | 'pixelate' | 'fisheye' | 'wave' | 'hearts' | 'love_face';

export interface EngineParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface Engine {
  name: EngineName;
  label: string;
  description: string;
  params: EngineParam[];
  apply: (canvas: HTMLCanvasElement, params: Record<string, number>) => HTMLCanvasElement | Promise<HTMLCanvasElement>;
}

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (ctx) ctx.drawImage(src, 0, 0);
  return out;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function applySwirl(src, params) {
  const strength = params.strength ?? 1.5;
  const radius = params.radius ?? 0.9;
  const w = src.width, h = src.height;
  const srcCtx = src.getContext('2d');
  if (!srcCtx) return src;
  const srcData = srcCtx.getImageData(0, 0, w, h);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const outCtx = out.getContext('2d');
  if (!outCtx) return src;
  const outData = outCtx.createImageData(w, h);
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(cx, cy) * radius;
  const s = srcData.data, o = outData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let srcX = x, srcY = y;
      if (dist < maxR) {
        const percent = (maxR - dist) / maxR;
        const theta = strength * Math.PI * percent * percent;
        const cos = Math.cos(theta), sin = Math.sin(theta);
        srcX = clamp(Math.round(cx + dx * cos - dy * sin), 0, w - 1);
        srcY = clamp(Math.round(cy + dx * sin + dy * cos), 0, h - 1);
      }
      const si = (srcY * w + srcX) * 4;
      const oi = (y * w + x) * 4;
      o[oi] = s[si]; o[oi+1] = s[si+1]; o[oi+2] = s[si+2]; o[oi+3] = s[si+3];
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return out;
}

function applyTwirl(src, params) {
  const strength = params.strength ?? 1.0;
  const radius = params.radius ?? 1.0;
  const w = src.width, h = src.height;
  const srcCtx = src.getContext('2d');
  if (!srcCtx) return src;
  const srcData = srcCtx.getImageData(0, 0, w, h);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const outCtx = out.getContext('2d');
  if (!outCtx) return src;
  const outData = outCtx.createImageData(w, h);
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(cx, cy) * radius;
  const s = srcData.data, o = outData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let srcX = x, srcY = y;
      if (dist < maxR) {
        const percent = (maxR - dist) / maxR;
        const theta = strength * Math.PI * percent;
        const cos = Math.cos(theta), sin = Math.sin(theta);
        srcX = clamp(Math.round(cx + dx * cos - dy * sin), 0, w - 1);
        srcY = clamp(Math.round(cy + dx * sin + dy * cos), 0, h - 1);
      }
      const si = (srcY * w + srcX) * 4;
      const oi = (y * w + x) * 4;
      o[oi] = s[si]; o[oi+1] = s[si+1]; o[oi+2] = s[si+2]; o[oi+3] = s[si+3];
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return out;
}

function applyPixelate(src, params) {
  const size = Math.max(2, Math.round(params.size ?? 12));
  const w = src.width, h = src.height;
  const srcCtx = src.getContext('2d');
  if (!srcCtx) return src;
  const srcData = srcCtx.getImageData(0, 0, w, h);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const outCtx = out.getContext('2d');
  if (!outCtx) return src;
  const outData = outCtx.createImageData(w, h);
  const s = srcData.data, o = outData.data;
  for (let by = 0; by < h; by += size) {
    for (let bx = 0; bx < w; bx += size) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const maxY = Math.min(by + size, h), maxX = Math.min(bx + size, w);
      for (let y = by; y < maxY; y++) for (let x = bx; x < maxX; x++) {
        const i = (y * w + x) * 4;
        r += s[i]; g += s[i+1]; b += s[i+2]; a += s[i+3]; count++;
      }
      r = Math.round(r/count); g = Math.round(g/count); b = Math.round(b/count); a = Math.round(a/count);
      for (let y = by; y < maxY; y++) for (let x = bx; x < maxX; x++) {
        const i = (y * w + x) * 4;
        o[i] = r; o[i+1] = g; o[i+2] = b; o[i+3] = a;
      }
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return out;
}

function applyFisheye(src, params) {
  const strength = params.strength ?? 0.5;
  const w = src.width, h = src.height;
  const srcCtx = src.getContext('2d');
  if (!srcCtx) return src;
  const srcData = srcCtx.getImageData(0, 0, w, h);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const outCtx = out.getContext('2d');
  if (!outCtx) return src;
  const outData = outCtx.createImageData(w, h);
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(cx, cy);
  const s = srcData.data, o = outData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const norm = dist / maxR;
      const factor = 1 + strength * norm * norm;
      const srcX = clamp(Math.round(cx + dx / factor), 0, w - 1);
      const srcY = clamp(Math.round(cy + dy / factor), 0, h - 1);
      const si = (srcY * w + srcX) * 4;
      const oi = (y * w + x) * 4;
      o[oi] = s[si]; o[oi+1] = s[si+1]; o[oi+2] = s[si+2]; o[oi+3] = s[si+3];
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return out;
}

function applyWave(src, params) {
  const amplitude = params.amplitude ?? 12;
  const frequency = params.frequency ?? 0.05;
  const w = src.width, h = src.height;
  const srcCtx = src.getContext('2d');
  if (!srcCtx) return src;
  const srcData = srcCtx.getImageData(0, 0, w, h);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const outCtx = out.getContext('2d');
  if (!outCtx) return src;
  const outData = outCtx.createImageData(w, h);
  const s = srcData.data, o = outData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = clamp(Math.round(x + amplitude * Math.sin(y * frequency)), 0, w - 1);
      const srcY = clamp(Math.round(y + amplitude * Math.sin(x * frequency)), 0, h - 1);
      const si = (srcY * w + srcX) * 4;
      const oi = (y * w + x) * 4;
      o[oi] = s[si]; o[oi+1] = s[si+1]; o[oi+2] = s[si+2]; o[oi+3] = s[si+3];
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return out;
}

function applyHearts(src, params) {
  const count = Math.max(1, Math.round(params.count ?? 15));
  const size = Math.max(8, Math.round(params.size ?? 40));
  const opacity = params.opacity ?? 0.85;
  const tint = params.tint ?? 0.15;
  const w = src.width, h = src.height;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(src, 0, 0);
  if (tint > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(255, 105, 180, ${tint})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const hearts = ['❤️', '💕', '💖', '💗', '💘', '💝', '🩷', '❤️', '💕'];
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const scale = Math.min(w, h) / 500;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const fontSize = size * scale * (0.5 + Math.random() * 0.8);
    const rotation = (Math.random() - 0.5) * 0.6;
    const heart = hearts[Math.floor(Math.random() * hearts.length)];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.fillText(heart, 0, 0);
    ctx.restore();
  }
  ctx.restore();
  return out;
}

// ---------- LOVE FACE (dengan deteksi wajah) ----------
// Menggunakan global `detectFaceInElement` yang di-set dari photobooth.html.
// Kalau tidak tersedia, fallback ke posisi tengah-atas frame.

async function applyLoveFace(src, params) {
  const count = Math.max(1, Math.round(params.count ?? 8));
  const size = Math.max(15, Math.round(params.size ?? 50));
  const opacity = params.opacity ?? 0.9;
  const tint = params.tint ?? 0.1;

  const w = src.width, h = src.height;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return src;

  ctx.drawImage(src, 0, 0);

  // Pink tint
  if (tint > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(255, 105, 180, ${tint})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Face detection (opsional — kalau function tersedia)
  let faceRect: { x: number; y: number; w: number; h: number } | null = null;
  const detectFn = (window as any).__tahoeDetectFace;
  if (typeof detectFn === 'function') {
    try {
      faceRect = await detectFn(src);
    } catch {
      faceRect = null;
    }
  }

  let fx, fy, fw, fh;
  if (faceRect) {
    fx = faceRect.x;
    fy = faceRect.y;
    fw = faceRect.w;
    fh = faceRect.h;
  } else {
    fx = w * 0.25;
    fy = h * 0.15;
    fw = w * 0.5;
    fh = h * 0.5;
  }

  const headTopY = fy - fh * 0.15;
  const headCenterX = fx + fw / 2;

  const hearts = ['❤️', '💕', '💖', '💗', '💘', '💝', '🩷'];
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const scale = Math.min(w, h) / 500;
  const arcRadius = fw * 0.75;

  for (let i = 0; i < count; i++) {
    const angle = Math.PI + ((i + 0.5) / count) * Math.PI;
    const ringR = arcRadius * (0.7 + Math.random() * 0.5);
    const hx = headCenterX + Math.cos(angle) * ringR;
    const hy = headTopY + Math.sin(angle) * ringR * 0.45 - fh * 0.05;

    const fontSize = size * scale * (0.6 + Math.random() * 0.5);
    const rotation = (Math.random() - 0.5) * 0.8;
    const heart = hearts[Math.floor(Math.random() * hearts.length)];

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(rotation);
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.fillText(heart, 0, 0);
    ctx.restore();
  }
  ctx.restore();

  return out;
}

// ---------- Registry ----------
export const ENGINES: Record<EngineName, Engine> = {
  swirl: { name: 'swirl', label: 'Swirl', description: 'Putaran pixel seperti pusaran', params: [
    { key: 'strength', label: 'Strength', min: 0.1, max: 3, step: 0.1, default: 1.5 },
    { key: 'radius', label: 'Radius', min: 0.2, max: 1.5, step: 0.05, default: 0.9 },
  ], apply: applySwirl },
  twirl: { name: 'twirl', label: 'Twirl', description: 'Putaran pixel dengan kurva linear', params: [
    { key: 'strength', label: 'Strength', min: 0.1, max: 2, step: 0.1, default: 1.0 },
    { key: 'radius', label: 'Radius', min: 0.2, max: 1.5, step: 0.05, default: 1.0 },
  ], apply: applyTwirl },
  pixelate: { name: 'pixelate', label: 'Pixelate', description: 'Efek mosaic kotak-kotak', params: [
    { key: 'size', label: 'Block Size', min: 2, max: 40, step: 1, default: 12 },
  ], apply: applyPixelate },
  fisheye: { name: 'fisheye', label: 'Fisheye', description: 'Distorsi radial dari tengah', params: [
    { key: 'strength', label: 'Strength', min: 0.1, max: 2, step: 0.05, default: 0.5 },
  ], apply: applyFisheye },
  wave: { name: 'wave', label: 'Wave', description: 'Distorsi gelombang sinus', params: [
    { key: 'amplitude', label: 'Amplitude', min: 0, max: 40, step: 1, default: 12 },
    { key: 'frequency', label: 'Frequency', min: 0.005, max: 0.2, step: 0.005, default: 0.05 },
  ], apply: applyWave },
  hearts: { name: 'hearts', label: 'Hearts (Love)', description: 'Overlay emoji hati + tint pink romantis', params: [
    { key: 'count', label: 'Jumlah Hati', min: 3, max: 50, step: 1, default: 15 },
    { key: 'size', label: 'Ukuran', min: 10, max: 100, step: 5, default: 40 },
    { key: 'opacity', label: 'Opacity', min: 0.2, max: 1, step: 0.05, default: 0.85 },
    { key: 'tint', label: 'Pink Tint', min: 0, max: 0.6, step: 0.05, default: 0.15 },
  ], apply: applyHearts },
  love_face: { name: 'love_face', label: 'Love Face (Tracking)', description: 'Hati muncul di atas kepala (deteksi wajah)', params: [
    { key: 'count', label: 'Jumlah Hati', min: 3, max: 20, step: 1, default: 8 },
    { key: 'size', label: 'Ukuran', min: 15, max: 100, step: 5, default: 50 },
    { key: 'opacity', label: 'Opacity', min: 0.3, max: 1, step: 0.05, default: 0.9 },
    { key: 'tint', label: 'Pink Tint', min: 0, max: 0.5, step: 0.05, default: 0.1 },
  ], apply: applyLoveFace },
};

export const ENGINE_LIST: Engine[] = Object.values(ENGINES);

export function getEngine(name: string): Engine | null {
  return ENGINES[name as EngineName] ?? null;
}

export function getDefaultParams(engineName: EngineName): Record<string, number> {
  const engine = ENGINES[engineName];
  if (!engine) return {};
  const out: Record<string, number> = {};
  for (const p of engine.params) out[p.key] = p.default;
  return out;
}

export async function applyEngine(
  canvas: HTMLCanvasElement,
  engineName: string,
  params: Record<string, number> = {}
): Promise<HTMLCanvasElement> {
  const engine = getEngine(engineName);
  if (!engine) return cloneCanvas(canvas);
  const merged = { ...getDefaultParams(engine.name), ...params };
  return await engine.apply(canvas, merged);
}