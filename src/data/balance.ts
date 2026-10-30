/** Gameplay and presentation tuning values. Distances are in world units. */
export const BALANCE = {
  simulation: {
    /** Fixed logic step (60 Hz). */
    stepSeconds: 1 / 60,
    /** Max logic steps per rendered frame, so a slow frame cannot snowball. */
    maxStepsPerFrame: 5,
    /** Frame deltas above this (tab switch, breakpoint) are clamped. */
    maxFrameSeconds: 0.25,
  },
  world: {
    tileSize: 48,
  },
  player: {
    /** Half-size of the collision box; also the drawn radius. */
    radius: 14,
    speed: 180,
  },
  flashlight: {
    startsOn: true,
    radius: 230,
    /** Faint halo around the player while the flashlight is off. */
    offHaloRadius: 44,
    offHaloStrength: 0.35,
    /** Opacity of the warm glow added over the lit area. */
    warmGlowAlpha: 0.12,
  },
  lighting: {
    /** Opacity of the darkness layer (1 = pure black). */
    darknessAlpha: 0.97,
  },
  view: {
    /** Number of tiles that fit along the shorter side of the screen. */
    tilesOnShortSide: 11,
  },
} as const;
