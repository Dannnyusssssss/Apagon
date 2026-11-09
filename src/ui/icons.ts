/** Small decorative icons for the menus, drawn with Canvas 2D (no image files). */
export type IconKind =
  | 'flashlight'
  | 'aim'
  | 'key'
  | 'battery'
  | 'eyes'
  | 'door'
  | 'sound'
  | 'flicker'
  | 'retry'
  | 'resume'
  | 'pause';

/** Icons are drawn on a 24x24 grid and scaled for sharp edges on dense screens. */
const GRID = 24;

/**
 * Returns a canvas with the icon, `size` CSS pixels wide. Decorative only:
 * hidden from screen readers (the text next to it says the same).
 */
export function createIcon(kind: IconKind, size: number, color = '#ffd76a'): HTMLCanvasElement {
  const scale = Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1)));
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  canvas.style.width = `${String(size)}px`;
  canvas.style.height = `${String(size)}px`;
  canvas.className = 'icon';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.scale((size * scale) / GRID, (size * scale) / GRID);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  DRAW[kind](ctx);
  return canvas;
}

const DRAW: Record<IconKind, (ctx: CanvasRenderingContext2D) => void> = {
  flashlight(ctx) {
    ctx.strokeRect(3, 10, 10, 5);
    ctx.beginPath();
    ctx.moveTo(13, 9);
    ctx.lineTo(17, 7);
    ctx.lineTo(17, 18);
    ctx.lineTo(13, 16);
    ctx.closePath();
    ctx.stroke();
    // Beam.
    ctx.globalAlpha = 0.6;
    for (const [y1, y2] of [
      [8, 4],
      [12.5, 12.5],
      [17, 21],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(19, y1);
      ctx.lineTo(22, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  aim(ctx) {
    ctx.beginPath();
    ctx.arc(12, 12, 6, 0, Math.PI * 2);
    ctx.stroke();
    for (const [x1, y1, x2, y2] of [
      [12, 2, 12, 8],
      [12, 16, 12, 22],
      [2, 12, 8, 12],
      [16, 12, 22, 12],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  },
  key(ctx) {
    ctx.beginPath();
    ctx.arc(7, 12, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(11, 12);
    ctx.lineTo(21, 12);
    ctx.moveTo(17, 12);
    ctx.lineTo(17, 16);
    ctx.moveTo(20, 12);
    ctx.lineTo(20, 15);
    ctx.stroke();
  },
  battery(ctx) {
    ctx.strokeRect(3, 8, 16, 9);
    ctx.fillRect(19, 10.5, 2.5, 4);
    ctx.fillRect(5, 10, 6, 5);
  },
  eyes(ctx) {
    for (const x of [7.5, 16.5]) {
      ctx.beginPath();
      ctx.ellipse(x, 12, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, 12, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  door(ctx) {
    ctx.beginPath();
    ctx.moveTo(5, 21);
    ctx.lineTo(5, 3);
    ctx.lineTo(19, 3);
    ctx.lineTo(19, 21);
    ctx.stroke();
    // Open leaf, with light coming through.
    ctx.globalAlpha = 0.35;
    ctx.fillRect(6, 4, 12, 17);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(5, 3);
    ctx.lineTo(12, 6);
    ctx.lineTo(12, 23);
    ctx.lineTo(5, 21);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(10, 14, 0.9, 0, Math.PI * 2);
    ctx.fill();
  },
  sound(ctx) {
    ctx.beginPath();
    ctx.moveTo(3, 9);
    ctx.lineTo(7, 9);
    ctx.lineTo(12, 5);
    ctx.lineTo(12, 19);
    ctx.lineTo(7, 15);
    ctx.lineTo(3, 15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, 9);
    ctx.lineTo(21, 15);
    ctx.moveTo(21, 9);
    ctx.lineTo(16, 15);
    ctx.stroke();
  },
  flicker(ctx) {
    // A bulb with soft rays: light changes.
    ctx.beginPath();
    ctx.arc(12, 10, 5, Math.PI * 0.8, Math.PI * 2.2);
    ctx.lineTo(14, 17);
    ctx.lineTo(10, 17);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 20);
    ctx.lineTo(14, 20);
    ctx.stroke();
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(3, 10);
    ctx.lineTo(5, 10);
    ctx.moveTo(19, 10);
    ctx.lineTo(21, 10);
    ctx.moveTo(5.5, 3.5);
    ctx.lineTo(7, 5);
    ctx.moveTo(18.5, 3.5);
    ctx.lineTo(17, 5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
  retry(ctx) {
    ctx.beginPath();
    ctx.arc(12, 12, 7, Math.PI * 1.25, Math.PI * 2.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(6.5, 7.5);
    ctx.lineTo(10.5, 6);
    ctx.stroke();
  },
  resume(ctx) {
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.lineTo(19, 12);
    ctx.lineTo(8, 19);
    ctx.closePath();
    ctx.fill();
  },
  pause(ctx) {
    ctx.fillRect(6, 5, 4, 14);
    ctx.fillRect(14, 5, 4, 14);
  },
};
