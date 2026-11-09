/** Gameplay and presentation tuning values. Distances are in world units. */
export const BALANCE = {
  simulation: {
    /** Fixed logic step (60 Hz). */
    stepSeconds: 1 / 60,
    /** Max logic steps per rendered frame, so a slow frame cannot snowball. */
    maxStepsPerFrame: 5,
    /** Frame deltas above this (tab switch, breakpoint) are clamped. */
    maxFrameSeconds: 0.25,
    /** Frames drawn per second, at least: a faster monitor draws every second or third refresh. */
    targetFps: 60,
  },
  world: {
    tileSize: 48,
  },
  player: {
    /** Half-size of the collision box. */
    radius: 14,
    /** Drawn radius of the character, a little bigger so its face reads well. */
    drawRadius: 16,
    speed: 180,
  },
  mood: {
    worriedBattery: 0.5,
    scaredBattery: 0.25,
    worriedNear: 0.3,
    scaredNear: 0.65,
  },
  flashlight: {
    startsOn: true,
    radius: 200,
    /** Faint halo around the player while the flashlight is off. */
    offHaloRadius: 44,
    offHaloStrength: 0.35,
    /** Opacity of the warm glow added over the lit area. */
    warmGlowAlpha: 0.12,
    /**
     * Cone mode: half of the 70 degree beam. Only what is inside this angle
     * (and the radius, with no wall in between) stops the enemy.
     */
    coneHalfAngle: (35 * Math.PI) / 180,
    /** The drawn beam is full up to this half angle and fades out by the outer one. */
    coneSoftInner: (25 * Math.PI) / 180,
    coneSoftOuter: (45 * Math.PI) / 180,
    /** How fast the beam turns toward where the player walks, in radians per second (540 degrees). */
    turnRate: 3 * Math.PI,
    /** Cone mode: small, dim halo so the player sees itself and the tiles around. It does not stop the enemy. */
    haloRadius: 72,
    haloStrength: 0.4,
  },
  /**
   * Difficulty that changes with the light shape. The classic circle uses the base
   * values (`enemy.speed`, `battery.drainSeconds`, `enemy.lightAdaptSeconds`).
   */
  lightModes: {
    cone: {
      /** The cone stops the enemy less often, so it is a bit slower. */
      enemySpeed: 155,
      /** A narrower beam lasts longer. */
      drainSeconds: 42,
      lightAdaptSeconds: 3.5,
    },
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
    /** Extra darkening on the side the enemy comes from, at touching distance. */
    directionalMaxAlpha: 0.55,
    /** Max turn of the directional shade, in radians per second, so it never jumps sides. */
    directionTurnRate: 6,
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
    /** With several enemies, each one starts this many seconds after the previous one. */
    extraStartDelaySeconds: 4,
    /** Enemies closer than this (two tiles) drift apart, so they do not read as one. */
    separationDistance: 96,
    /** Strongest drift, when touching. Well under their speed: a nudge, not a wall. */
    separationSpeed: 70,
  },
  /** Values of a level that does not set its own (see `src/data/levels.ts`). */
  levels: {
    enemyCount: 1,
    enemySpeedFactor: 1,
    batterySecondsFactor: 1,
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
    /** Rays over the arc of the cone, and around the small halo. */
    coneRayCount: 80,
    haloRayCount: 96,
    /** Fraction of the flashlight radius that counts as lit (the soft edge does not). */
    litRadiusFraction: 0.85,
    /** How far the light enters wall tiles, so their faces are visible. */
    wallPenetration: 10,
  },
  audio: {
    /** Overall volume (0..1). Kept moderate; a limiter also stops peaks. */
    masterVolume: 0.35,
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
    /**
     * "Dying bulb" while the battery is low: an electric hum that sags in pitch,
     * with crackles. Starts at this charge and grows as it runs out.
     * Kept between 110 and 440 Hz so laptop speakers can play it.
     */
    lowBatteryThreshold: 0.3,
    lowBatteryMaxVolume: 0.22,
    /** How far the hum sags when empty, in cents. */
    lowBatterySagCents: 120,
    /** Seconds between crackles just below the threshold and when empty. */
    crackleSlow: 1.6,
    crackleFast: 0.35,
    crackleVolume: 0.12,
  },
  enemyAudio: {
    /** Beyond this distance (8 tiles) the enemy is not heard at all. */
    hearingDistance: 384,
    /** Exponent of the distance fade: above 1, it grows faster when close. */
    distanceCurve: 1.5,
    /** Strongest left/right pan, so the enemy never sounds in one ear only. */
    maxPan: 0.85,
    /** Below this distance the pan shrinks, so it does not swap ears when on top. */
    panMinDistance: 48,
    /** Low-pass cutoff with a clear line and behind a wall (muffled). */
    openCutoff: 5000,
    occludedCutoff: 600,
    /** Volume factor behind a wall. */
    occludedGain: 0.55,
    /** How fast the wall muffling fades in and out, in full amount per second. */
    occlusionRate: 4,
    /** Seconds between footsteps at its normal speed; slower speeds space them out. */
    stepInterval: 0.42,
    /** Footsteps are never further apart than this (creeping in the light). */
    stepMaxInterval: 1.1,
    /** Footstep volume when creeping and when running in the dark. */
    stepVolumeSlow: 0.04,
    stepVolumeFast: 0.11,
    /** Seconds between breaths while moving and while standing still. */
    breathIntervalMoving: 2.2,
    breathIntervalStill: 3.4,
    breathVolume: 0.09,
    /** Breath volume factor while it stands still: very low, but still there. */
    stillBreathFraction: 0.35,
    /** Below this speed fraction the enemy counts as standing still. */
    movingThreshold: 0.05,
    /** Time constant for pan, volume and muffling changes on the audio thread. */
    mixSmoothing: 0.12,
  },
  music: {
    /** Music bus volume (under the master volume). */
    volume: 0.55,
    chordSeconds: 8,
    noteGapCalm: [2, 5],
    noteGapTense: [0.8, 2],
    pulseThreshold: 0.35,
    /** Never faster than 2 pulses per second. */
    pulseSlow: 0.9,
    pulseFast: 0.5,
    padVolume: 0.07,
    noteVolume: 0.1,
    pulseVolume: 0.14,
    echoSeconds: 0.42,
    echoFeedback: 0.35,
    /** Music low-pass cutoff with a full battery and when empty: it gets darker. */
    brightCutoff: 2600,
    darkCutoff: 450,
    /** Detune of the whole piece when the battery is empty, in cents. */
    darkDetuneCents: -35,
    /** Seconds to fade the music in at the start and out at the end of a run. */
    fadeSeconds: 2,
  },
  lighting: {
    /** Opacity of the darkness layer (1 = pure black). */
    darknessAlpha: 0.97,
    /** Resolution of that layer against the screen: it is soft, so a lower one does not show. */
    layerScale: 0.5,
  },
  view: {
    /** Number of tiles that fit along the shorter side of the screen. */
    tilesOnShortSide: 11,
    /** Canvas pixels per CSS pixel, at most: denser screens cost far more than they show. */
    maxRenderScale: 1.5,
    /** Canvas pixels in total, at most, for large windows at any density. */
    maxRenderPixels: 3_200_000,
  },
  debug: {
    /** A frame longer than this counts as a stall in the debug panel. */
    longFrameMs: 50,
    /** The "worst frame" of the panel covers about this long. */
    worstFrameWindowMs: 5000,
  },
} as const;
