// Canvas helpers for the New Post layout templates.
// Each composer returns a JPEG File ready to push into pendingMedia.

export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl';
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
  // Optional: max width as fraction of canvas width (controls wrapping).
  width?: number;
}

// State snapshots persisted on a composed PendingMedia entry so the user
// can tap it again and resume editing exactly where they left off.
export interface SingleSlideState {
  id: string;
  file: File;
  overlays: TextOverlay[];
  posX: number;
  posY: number;
  scale: number;
}
export interface GridCellState {
  file: File;
  posX: number;
  posY: number;
  scale: number;
}
export type LayoutEditorState =
  | { kind: 'single'; slides: SingleSlideState[] }
  | { kind: 'grid'; cells: GridCellState[]; overlays: TextOverlay[] }
  | { kind: 'cost'; headerL: string; headerR: string; rows: CostRow[] };




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
  sm: 0.01785,
  md: 0.02465,
  lg: 0.03485,
  xl: 0.0493,
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

  const maxWidth = canvasW * Math.max(0.15, Math.min(0.95, o.width ?? 0.7));
  const lines = wrapText(ctx, o.text, maxWidth);
  const lineHeight = Math.round(fontPx * 1.25);
  const blockH = lineHeight * lines.length;
  // Editor renders the text box at full maxWidth (centered), so match it here
  // — otherwise centered/right-aligned shifts won't match the preview.
  const blockW = maxWidth;
  const lineWidths = lines.map((l) => ctx.measureText(l).width);

  // Anchor x,y is the CENTER of the block in % space (matches the editor's
  // translate(-50%, -50%)). Clamp the block so it stays fully on-canvas.
  let left = o.x * canvasW - blockW / 2;
  let top = o.y * canvasH - blockH / 2;
  left = Math.max(canvasW * 0.025, Math.min(canvasW - blockW - canvasW * 0.025, left));
  top = Math.max(canvasH * 0.025, Math.min(canvasH - blockH - canvasH * 0.025, top));

  if (o.bgEnabled) {
    const padX = fontPx * 0.5;
    const padY = fontPx * 0.35;
    const r = Math.round(fontPx * 0.35);
    const bgX = left - padX;
    const bgY = top - padY;
    const bgW = blockW + padX * 2;
    const bgH = blockH + padY * 2;
    ctx.fillStyle = (o.color === 'white' || o.color === 'cream' || o.color === 'yellow') ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)';
    roundRect(ctx, bgX, bgY, bgW, bgH, r);
    ctx.fill();
  }

  ctx.fillStyle = COLOR_MAP[o.color];
  lines.forEach((line, i) => {
    const lw = lineWidths[i];
    const lx = left + (blockW - lw) / 2; // center each line, matching editor
    ctx.fillText(line, lx, top + i * lineHeight);
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

// Draw an image covering the target rect (object-cover behavior) with
// optional zoom + pan. posX/posY are in [0,1] and control which part of the
// image stays visible after cropping (0.5 = center). scale >= 1 zooms in
// (1 = exact cover, 2 = 2x zoom).
const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
  posX = 0.5, posY = 0.5, scale = 1,
) => {
  const s = Math.max(1, scale);
  const ir = img.naturalWidth / img.naturalHeight;
  const tr = dw / dh;
  // Source rect that exactly covers the target at scale=1.
  let baseSW: number, baseSH: number;
  if (ir > tr) { baseSH = img.naturalHeight; baseSW = baseSH * tr; }
  else { baseSW = img.naturalWidth; baseSH = baseSW / tr; }
  // Zooming in shrinks the source rect.
  const sw = baseSW / s;
  const sh = baseSH / s;
  const maxSX = img.naturalWidth - sw;
  const maxSY = img.naturalHeight - sh;
  const sx = maxSX * Math.max(0, Math.min(1, posX));
  const sy = maxSY * Math.max(0, Math.min(1, posY));
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
export interface GridCellInput { file: File; posX?: number; posY?: number; scale?: number }
export const composeGrid = async (
  cells: [GridCellInput, GridCellInput, GridCellInput, GridCellInput],
  overlays: TextOverlay[],
): Promise<File> => {
  const W = 1200;
  const H = 1500; // 4:5 portrait to match cover card aspect
  const GUTTER = 2; // hairline divider between cells.
  const cellW = (W - GUTTER) / 2;
  const cellH = (H - GUTTER) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  const imgs = await Promise.all(cells.map((c) => loadImage(c.file)));
  const rects = [
    [0, 0],
    [cellW + GUTTER, 0],
    [0, cellH + GUTTER],
    [cellW + GUTTER, cellH + GUTTER],
  ] as const;
  imgs.forEach((img, i) => {
    drawCover(
      ctx, img, rects[i][0], rects[i][1], cellW, cellH,
      cells[i].posX ?? 0.5, cells[i].posY ?? 0.5, cells[i].scale ?? 1,
    );
  });
  overlays.forEach((o) => drawOverlay(ctx, o, W, H));

  return canvasToJpegFile(canvas, `grid-${Date.now()}.jpg`);
};

// LAYOUT 3: beige cost-breakdown receipt.
// Auto-scales typography so up to ~22 rows fit in a single 4:5 image.
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

  // Vertical area for the table.
  const topY = 200;
  const bottomReserve = 140;
  const available = H - topY - bottomReserve;

  // Candidate type-scale tiers (largest first). Padding/line-height shrink
  // together with the body size so receipts of any length stay legible.
  const tiers = [
    { body: 44, header: 42, bodyLine: 56, headerLine: 52, rowPad: 28, gap: 12 },
    { body: 40, header: 40, bodyLine: 50, headerLine: 48, rowPad: 24, gap: 10 },
    { body: 36, header: 36, bodyLine: 46, headerLine: 44, rowPad: 20, gap: 8 },
    { body: 32, header: 32, bodyLine: 40, headerLine: 40, rowPad: 16, gap: 6 },
    { body: 28, header: 30, bodyLine: 36, headerLine: 36, rowPad: 13, gap: 4 },
    { body: 24, header: 26, bodyLine: 30, headerLine: 32, rowPad: 10, gap: 3 },
    { body: 22, header: 24, bodyLine: 28, headerLine: 30, rowPad: 8,  gap: 2 },
  ];

  // Pick the largest tier whose actual wrapped content fits.
  const fonts = (size: number, weight: number) =>
    `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

  let chosen = tiers[tiers.length - 1];
  let chosenLayout: { hLeft: string[]; hRight: string[]; rowLines: { l: string[]; r: string[] }[] } | null = null;
  for (const t of tiers) {
    ctx.font = fonts(t.header, 700);
    const hLeft = wrapText(ctx, headers.left.toUpperCase(), leftColW - 24);
    const hRight = wrapText(ctx, headers.right.toUpperCase(), rightColW - 24);
    const headerH = Math.max(hLeft.length, hRight.length) * t.headerLine + 18;

    ctx.font = fonts(t.body, 500);
    const rowLines = rows.map(r => ({
      l: wrapText(ctx, r.left, leftColW - 24),
      r: wrapText(ctx, r.right, rightColW - 24),
    }));
    const rowsH = rowLines.reduce((sum, rl) => {
      const lines = Math.max(rl.l.length, rl.r.length);
      return sum + lines * t.bodyLine + t.rowPad * 2 + t.gap;
    }, 0);

    if (headerH + t.rowPad + rowsH <= available) {
      chosen = t;
      chosenLayout = { hLeft, hRight, rowLines };
      break;
    }
    chosen = t;
    chosenLayout = { hLeft, hRight, rowLines };
  }

  const t = chosen;
  const layout = chosenLayout!;

  ctx.fillStyle = INK;
  ctx.textBaseline = 'top';

  // Headers
  let y = topY;
  ctx.font = fonts(t.header, 700);
  layout.hLeft.forEach((l, i) => ctx.fillText(l, leftX, y + i * t.headerLine));
  layout.hRight.forEach((l, i) => {
    const w = ctx.measureText(l).width;
    ctx.fillText(l, rightX + rightColW - w, y + i * t.headerLine);
  });
  const headerH = Math.max(layout.hLeft.length, layout.hRight.length) * t.headerLine;
  y += headerH + 18;

  // Hairline under header
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(W - padX, y);
  ctx.stroke();
  y += t.rowPad;

  // Rows
  ctx.font = fonts(t.body, 500);
  for (let idx = 0; idx < rows.length; idx++) {
    const { l: leftLines, r: rightLines } = layout.rowLines[idx];
    const lines = Math.max(leftLines.length, rightLines.length);
    const rowH = lines * t.bodyLine;
    leftLines.forEach((l, i) => ctx.fillText(l, leftX, y + i * t.bodyLine));
    rightLines.forEach((l, i) => {
      const w = ctx.measureText(l).width;
      ctx.fillText(l, rightX + rightColW - w, y + i * t.bodyLine);
    });
    y += rowH + t.rowPad;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(W - padX, y);
    ctx.stroke();
    y += t.gap + t.rowPad;
    // Safety stop only if we somehow overflow the canvas entirely.
    if (y > H - 40 && idx < rows.length - 1) break;
  }

  return canvasToJpegFile(canvas, `cost-${Date.now()}.jpg`);
};

