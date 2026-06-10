// Canvas helpers for the New Post layout templates.
// Each composer returns a JPEG File ready to push into pendingMedia.

export type OverlaySize = 'sm' | 'md' | 'lg';
export type OverlayColor = 'white' | 'black' | 'cream' | 'charcoal' | 'red' | 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export interface TextOverlay {
  id: string;
  text: string;
  // Position in % of canvas (0..1) — top/left of the overlay box.
  x: number;
  y: number;
  size: OverlaySize;
  color: OverlayColor;
  bgEnabled: boolean;
}

export const COLOR_MAP: Record<OverlayColor, string> = {
  white: '#FFFFFF',
  black: '#0A0A0A',
  cream: '#F5F0E8',
  charcoal: '#2B2B2B',
  red: '#EF4444',
  yellow: '#FACC15',
  pink: '#EC4899',
  blue: '#3B82F6',
  green: '#22C55E',
  purple: '#A855F7',
};

// Font size as a fraction of canvas width.
const SIZE_RATIO: Record<OverlaySize, number> = {
  sm: 0.030,
  md: 0.042,
  lg: 0.058,
};


export const sizePx = (size: OverlaySize, canvasWidth: number) =>
  Math.round(SIZE_RATIO[size] * canvasWidth);

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

const canvasToJpegFile = (canvas: HTMLCanvasElement, name: string): Promise<File> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Canvas export failed')); return; }
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });

// Word-wrap a string into lines that fit within maxWidth at the current font.
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const p of paragraphs) {
    const words = p.split(/\s+/);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test;
      } else {
        lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    if (!words.length) lines.push('');
  }
  return lines;
};

// Draws an overlay onto a canvas at its proportional position.
const drawOverlay = (
  ctx: CanvasRenderingContext2D,
  o: TextOverlay,
  canvasW: number,
  canvasH: number,
) => {
  if (!o.text.trim()) return;
  const fontPx = sizePx(o.size, canvasW);
  ctx.font = `600 ${fontPx}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textBaseline = 'top';

  const maxWidth = canvasW * 0.86;
  const lines = wrapText(ctx, o.text, maxWidth);
  const lineHeight = Math.round(fontPx * 1.25);
  const blockH = lineHeight * lines.length;
  const blockW = Math.min(
    maxWidth,
    Math.max(...lines.map((l) => ctx.measureText(l).width)),
  );

  // Anchor x,y is the top-left of the block in % space; clamp inside canvas.
  let left = o.x * canvasW;
  let top = o.y * canvasH;
  left = Math.max(canvasW * 0.05, Math.min(canvasW - blockW - canvasW * 0.05, left));
  top = Math.max(canvasH * 0.04, Math.min(canvasH - blockH - canvasH * 0.04, top));

  if (o.bgEnabled) {
    const padX = fontPx * 0.5;
    const padY = fontPx * 0.35;
    const r = Math.round(fontPx * 0.35);
    const bgX = left - padX;
    const bgY = top - padY;
    const bgW = blockW + padX * 2;
    const bgH = blockH + padY * 2;
    ctx.fillStyle = o.color === 'white' || o.color === 'cream' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)';
    roundRect(ctx, bgX, bgY, bgW, bgH, r);
    ctx.fill();
  }

  ctx.fillStyle = COLOR_MAP[o.color];
  lines.forEach((line, i) => {
    ctx.fillText(line, left, top + i * lineHeight);
  });
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

// Draw an image covering the target rect (object-cover behavior).
const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
) => {
  const ir = img.naturalWidth / img.naturalHeight;
  const tr = dw / dh;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ir > tr) {
    // image wider -> crop sides
    sw = img.naturalHeight * tr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / tr;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
};

// LAYOUT 1: single image with one overlay. Preserves the image's natural aspect.
export const composeSingleSlide = async (
  file: File,
  overlay: TextOverlay,
  index: number,
): Promise<File> => {
  const img = await loadImage(file);
  const maxW = 1440;
  const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  drawOverlay(ctx, overlay, w, h);
  return canvasToJpegFile(canvas, `slide-${index}.jpg`);
};

// LAYOUT 2: square 2x2 grid with overlays.
export const composeGrid = async (
  files: [File, File, File, File],
  overlays: TextOverlay[],
): Promise<File> => {
  const SIZE = 1440;
  const GUTTER = 8; // ~2px feel on a phone, sharper than 2px when scaled down.
  const cell = (SIZE - GUTTER) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const imgs = await Promise.all(files.map(loadImage));
  const rects = [
    [0, 0],
    [cell + GUTTER, 0],
    [0, cell + GUTTER],
    [cell + GUTTER, cell + GUTTER],
  ] as const;
  imgs.forEach((img, i) => {
    drawCover(ctx, img, rects[i][0], rects[i][1], cell, cell);
  });
  overlays.forEach((o) => drawOverlay(ctx, o, SIZE, SIZE));
  return canvasToJpegFile(canvas, `grid-${Date.now()}.jpg`);
};

// LAYOUT 3: beige cost-breakdown receipt.
export interface CostRow { left: string; right: string }
export const composeCostBreakdown = async (
  headers: { left: string; right: string },
  rows: CostRow[],
): Promise<File> => {
  const W = 1200;
  const H = 1500; // 4:5 portrait
  const BG = '#F5F0E8';
  const INK = '#2B2B2B';
  const HAIRLINE = 'rgba(43,43,43,0.18)';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const padX = 120;
  const tableW = W - padX * 2;
  const rightColW = Math.round(tableW * 0.32);
  const leftColW = tableW - rightColW;
  const leftX = padX;
  const rightX = padX + leftColW;

  const bodyFont = '500 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const headerFont = '700 42px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const rowPadY = 28;
  const lineGap = 12;

  ctx.fillStyle = INK;
  ctx.textBaseline = 'top';

  // Headers
  let y = 220;
  ctx.font = headerFont;
  const hLeftLines = wrapText(ctx, headers.left.toUpperCase(), leftColW - 24);
  const hRightLines = wrapText(ctx, headers.right.toUpperCase(), rightColW - 24);
  const headerLineH = 52;
  hLeftLines.forEach((l, i) => ctx.fillText(l, leftX, y + i * headerLineH));
  hRightLines.forEach((l, i) => {
    const w = ctx.measureText(l).width;
    ctx.fillText(l, rightX + rightColW - w, y + i * headerLineH);
  });
  const headerH = Math.max(hLeftLines.length, hRightLines.length) * headerLineH;
  y += headerH + 18;

  // Hairline under header
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(W - padX, y);
  ctx.stroke();
  y += rowPadY;

  // Rows
  ctx.font = bodyFont;
  const bodyLineH = 56;
  for (const row of rows) {
    const leftLines = wrapText(ctx, row.left, leftColW - 24);
    const rightLines = wrapText(ctx, row.right, rightColW - 24);
    const rowH = Math.max(leftLines.length, rightLines.length) * bodyLineH;
    leftLines.forEach((l, i) => ctx.fillText(l, leftX, y + i * bodyLineH));
    rightLines.forEach((l, i) => {
      const w = ctx.measureText(l).width;
      ctx.fillText(l, rightX + rightColW - w, y + i * bodyLineH);
    });
    y += rowH + rowPadY;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(W - padX, y);
    ctx.stroke();
    y += lineGap + rowPadY;
    if (y > H - 200) break;
  }

  return canvasToJpegFile(canvas, `cost-${Date.now()}.jpg`);
};
