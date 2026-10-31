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
  enemy: {
    /** Half-size of the collision box; also the drawn radius. */
    radius: 15,
    /** Slower than the player, so running away is possible. */
    speed: 150,
    /** Seconds the enemy waits before moving at the start of a run. */
    startDelaySeconds: 2,
    /** Seconds the enemy stays still after leaving the light. */
    freezeAfterLightSeconds: 0.6,
    /** Center distance at which the enemy reaches the player. */
    catchDistance: 26,
  },
  flicker: {
    /**
     * Waves per second. Must stay at or below 3 (photosensitivity limit),
     * the change is a smooth dimming, never a full blackout.
     */
    frequencyHz: 2,
    /** Lowest light strength at the bottom of a wave (1 = no dimming). */
    minStrength: 0.65,
    /** How fast the flicker fades in and out, in full amplitude per second. */
    fadePerSecond: 4,
    /** Seconds the flicker keeps going after the enemy leaves the light. */
    holdSeconds: 0.8,
  },
  visibility: {
    /** Rays cast to build the light polygon. */
    rayCount: 240,
    /** Fraction of the flashlight radius that counts as lit (the soft edge does not). */
    litRadiusFraction: 0.85,
    /** How far the light enters wall tiles, so their faces are visible. */
    wallPenetration: 10,
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
