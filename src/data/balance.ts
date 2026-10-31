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
    radius: 200,
    /** Faint halo around the player while the flashlight is off. */
    offHaloRadius: 44,
    offHaloStrength: 0.35,
    /** Opacity of the warm glow added over the lit area. */
    warmGlowAlpha: 0.12,
  },
  battery: {
    /** Seconds of light from a full charge. */
    drainSeconds: 35,
    /** Light radius at an almost empty battery, as a fraction of the full radius. */
    minRadiusFraction: 0.45,
    /** Charge added by one battery pickup (1 = full). */
    rechargeAmount: 0.3,
    /** At or below this charge the HUD warns about low battery. */
    lowThreshold: 0.25,
  },
  interact: {
    /** Max distance from the player center to an item center (or the door edge). */
    distance: 40,
  },
  warning: {
    /** The "enemy near" signal starts at this distance and grows as it gets closer. */
    enemyNearDistance: 240,
  },
  enemy: {
    /** Half-size of the collision box; also the drawn radius. */
    radius: 15,
    /** A bit slower than the player while the flashlight is on. */
    speed: 165,
    /** Speed multiplier while the flashlight is off: turning it off to save battery is risky. */
    darkSpeedMultiplier: 1.2,
    /** Seconds the enemy waits before moving at the start of a run. */
    startDelaySeconds: 2,
    /** Seconds the enemy stays still after leaving the light. */
    freezeAfterLightSeconds: 0.35,
    /** After this many seconds in the light, the enemy gets used to it and creeps on. */
    lightAdaptSeconds: 3,
    /**
     * Seconds of light forgotten per second out of it. Gradual, so brief exits
     * (a shrinking light, a step back) do not reset the habit.
     */
    lightForgetRate: 1,
    /** Fraction of its speed the enemy keeps while creeping through the light. */
    creepFraction: 0.25,
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
  audio: {
    /** Overall volume (0..1). Kept moderate; a limiter also stops peaks. */
    masterVolume: 0.35,
    /** Low background drone. */
    ambientVolume: 0.05,
    stepVolume: 0.12,
    /** Seconds between footsteps while moving. */
    stepInterval: 0.36,
    /** The heartbeat starts when the "enemy near" level passes this value. */
    heartbeatThreshold: 0.15,
    /** Beats per minute from the threshold to touching distance (never above 2 per second). */
    heartbeatMinBpm: 60,
    heartbeatMaxBpm: 120,
    heartbeatMinVolume: 0.08,
    heartbeatMaxVolume: 0.3,
    flickerVolume: 0.08,
    /** Min seconds between two flicker sounds. */
    flickerMinGap: 0.6,
    pickupVolume: 0.22,
    lockedVolume: 0.18,
    endVolume: 0.22,
    /** Dissonant drone while the battery is low; grows as the charge runs out. */
    lowBatteryMaxVolume: 0.12,
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
