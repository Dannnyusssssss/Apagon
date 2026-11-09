/**
 * Canvas pixels per CSS pixel, capped so a very dense screen does not cost far more than
 * it shows: the browser stretches the canvas to fill the window. It never goes above what
 * the screen has, and invalid values count as 1.
 */
export function renderScale(
  devicePixelRatio: number,
  cssWidth: number,
  cssHeight: number,
  maxScale: number,
  maxPixels: number,
): number {
  const screen = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const scale = Math.min(screen, maxScale);
  const area = cssWidth * cssHeight;
  if (!(area > 0) || area * scale * scale <= maxPixels) return scale;
  return Math.sqrt(maxPixels / area);
}
