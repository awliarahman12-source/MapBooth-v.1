/**
 * Swirl / Twirl filter untuk Photo Booth
 * Efeknya: memutar pixel di sekitar titik tengah gambar.
 * Makin dekat ke pusat, makin kuat putarannya.
 */

export interface SwirlOptions {
  /** Kekuatan putaran. 1.0 = sedang, 2.0 = kuat, 3.0 = ekstrem */
  strength?: number;
  /** Radius efek, 0-1 dari setengah sisi terpendek. 1.0 = seluruh gambar */
  radius?: number;
}

const DEFAULTS: Required<SwirlOptions> = {
  strength: 1.5,
  radius: 0.9,
};

/**
 * Terapkan efek swirl ke sebuah canvas.
 * @param source Canvas sumber (biasanya hasil drawImage dari <video>)
 * @param options Konfigurasi kekuatan & radius
 * @returns Canvas baru dengan efek swirl
 */
export function applySwirl(
  source: HTMLCanvasElement,
  options: SwirlOptions = {}
): HTMLCanvasElement {
  const { strength, radius } = { ...DEFAULTS, ...options };

  const width = source.width;
  const height = source.height;
  const srcCtx = source.getContext('2d');
  if (!srcCtx) return source;

  const srcData = srcCtx.getImageData(0, 0, width, height);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return source;

  const outData = outCtx.createImageData(width, height);

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(cx, cy) * radius;

  const src = srcData.data;
  const out = outData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let srcX = x;
      let srcY = y;

      if (dist < maxR) {
        // Persentase kedekatan ke pusat: 1 di pusat, 0 di tepi radius
        const percent = (maxR - dist) / maxR;
        // Kurva kuadratik biar putaran lebih halus di tepi
        const theta = strength * Math.PI * percent * percent;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        srcX = Math.round(cx + dx * cos - dy * sin);
        srcY = Math.round(cy + dx * sin + dy * cos);

        if (srcX < 0) srcX = 0;
        else if (srcX >= width) srcX = width - 1;
        if (srcY < 0) srcY = 0;
        else if (srcY >= height) srcY = height - 1;
      }

      const srcIdx = (srcY * width + srcX) * 4;
      const outIdx = (y * width + x) * 4;

      out[outIdx] = src[srcIdx];
      out[outIdx + 1] = src[srcIdx + 1];
      out[outIdx + 2] = src[srcIdx + 2];
      out[outIdx + 3] = src[srcIdx + 3];
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas;
}

/**
 * Helper: aplikasikan swirl langsung ke data URL.
 * Berguna kalau kamu punya foto dalam bentuk base64.
 */
export async function applySwirlToDataUrl(
  dataUrl: string,
  options: SwirlOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const result = applySwirl(canvas, options);
      resolve(result.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Helper: aplikasikan swirl ke elemen <video> yang sedang live.
 * Return canvas dengan hasil swirl, siap di-toDataURL() atau di-upload.
 */
export function applySwirlToVideo(
  video: HTMLVideoElement,
  options: SwirlOptions = {}
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || video.clientWidth;
  canvas.height = video.videoHeight || video.clientHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return applySwirl(canvas, options);
}