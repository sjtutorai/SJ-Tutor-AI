import { Html5Qrcode } from "html5-qrcode";

const OFFSCREEN_SCANNER_ID = "sjtutor-offscreen-qr-file-scanner";

function ensureOffscreenScannerContainer(): HTMLElement {
  let el = document.getElementById(OFFSCREEN_SCANNER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = OFFSCREEN_SCANNER_ID;
    // html5-qrcode requires a rendered box (not display:none) for canvas sizing
    el.style.position = "fixed";
    el.style.left = "-99999px";
    el.style.top = "0px";
    el.style.width = "320px";
    el.style.height = "320px";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

function loadFileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function createCroppedCanvas(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  maxDim = 1000
): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(sw, sh, 1));
  const outW = Math.max(64, Math.round(sw * scale));
  const outH = Math.max(64, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
  }
  return canvas;
}

function canvasToPngFile(canvas: HTMLCanvasElement, name: string): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(new File([blob], name, { type: "image/png" }));
      },
      "image/png",
      1
    );
  });
}

async function tryNativeBarcodeDetector(source: ImageBitmapSource): Promise<string | null> {
  try {
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
    if (!Detector) return null;
    const detector = new Detector({ formats: ["qr_code"] });
    const barcodes = await detector.detect(source);
    const found = barcodes.find((b) => b?.rawValue && b.rawValue.trim().length > 0);
    return found?.rawValue?.trim() || null;
  } catch {
    return null;
  }
}

async function tryHtml5ScanFile(file: File): Promise<string | null> {
  ensureOffscreenScannerContainer();
  const scanner = new Html5Qrcode(OFFSCREEN_SCANNER_ID, { verbose: false });
  try {
    const decoded = await scanner.scanFile(file, false);
    return decoded?.trim() || null;
  } catch {
    return null;
  } finally {
    try {
      scanner.clear();
    } catch {
      // ignore cleanup error
    }
  }
}

/**
 * Multi-pass QR decoder specifically hardened for full high-resolution SJ Tutor AI ID Card PNGs
 * as well as cropped QR screenshots and phone camera photos.
 */
export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  // Pass 1: Fast native BarcodeDetector on full image bitmap (when browser supports it)
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const nativeHit = await tryNativeBarcodeDetector(bitmap);
      bitmap.close?.();
      if (nativeHit) return nativeHit;
    } catch {
      // fall through
    }
  }

  // Pass 2: Direct html5-qrcode scan on original file
  const directHit = await tryHtml5ScanFile(file);
  if (directHit) return directHit;

  // Pass 3: Multi-region crop + scale (handles high-res ID cards where QR sits in bottom-right)
  try {
    const img = await loadFileToImage(file);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;

    const regions: Array<{ label: string; sx: number; sy: number; sw: number; sh: number; maxDim: number }> = [
      // Bottom-right quadrant (exact location of SJ ID Card QR code)
      { label: "bottom-right", sx: w * 0.5, sy: h * 0.42, sw: w * 0.5, sh: h * 0.58, maxDim: 900 },
      // Tighter bottom-right corner
      { label: "corner-br", sx: w * 0.62, sy: h * 0.52, sw: w * 0.38, sh: h * 0.48, maxDim: 900 },
      // Right half
      { label: "right-half", sx: w * 0.45, sy: 0, sw: w * 0.55, sh: h, maxDim: 1000 },
      // Downscaled full image (html5-qrcode often decodes 900px faster/better than 2400px)
      { label: "scaled-full", sx: 0, sy: 0, sw: w, sh: h, maxDim: 960 },
      // Center region (for screenshots or back-side centered QR)
      { label: "center", sx: w * 0.18, sy: h * 0.18, sw: w * 0.64, sh: h * 0.64, maxDim: 900 },
      // Bottom half
      { label: "bottom-half", sx: 0, sy: h * 0.45, sw: w, sh: h * 0.55, maxDim: 960 },
    ];

    for (const r of regions) {
      const canvas = createCroppedCanvas(img, r.sx, r.sy, r.sw, r.sh, r.maxDim);

      const nativeRegionHit = await tryNativeBarcodeDetector(canvas);
      if (nativeRegionHit) return nativeRegionHit;

      const regionFile = await canvasToPngFile(canvas, `qr-${r.label}.png`);
      if (regionFile) {
        const hit = await tryHtml5ScanFile(regionFile);
        if (hit) return hit;
      }
    }
  } catch (err) {
    console.warn("Multi-pass QR image decode warning:", err);
  }

  return null;
}
