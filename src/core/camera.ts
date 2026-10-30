import { clamp } from './math';

/** Camera center in world units and world-to-CSS-pixel scale. */
export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export function createCamera(): Camera {
  return { x: 0, y: 0, scale: 1 };
}

/**
 * Centers the camera on the target, kept inside the world bounds.
 * If the world is smaller than the view on an axis, it is centered.
 */
export function followTarget(
  camera: Camera,
  targetX: number,
  targetY: number,
  worldWidth: number,
  worldHeight: number,
  viewWidth: number,
  viewHeight: number,
): void {
  camera.x = clampAxis(targetX, worldWidth, viewWidth / camera.scale);
  camera.y = clampAxis(targetY, worldHeight, viewHeight / camera.scale);
}

function clampAxis(target: number, worldSize: number, viewSize: number): number {
  if (worldSize <= viewSize) return worldSize / 2;
  const half = viewSize / 2;
  return clamp(target, half, worldSize - half);
}
