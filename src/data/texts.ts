/** Every text shown to the player lives here. */
export const TEXTS = {
  start: {
    goal: 'Estás a oscuras. Encuentra las llaves y sal por la puerta antes de que algo te alcance.',
    light: 'Apunta la luz hacia él: lo detiene un rato, pero gasta batería. Busca pilas.',
    /** Controls shown as key caps: main keys, optional alternative keys, and what they do. */
    controls: [
      { keys: ['W', 'A', 'S', 'D'], alt: ['Flechas'], label: 'Moverse' },
      { keys: ['Shift'], alt: ['F'], label: 'Linterna' },
      { keys: ['E'], alt: [], label: 'Interactuar' },
      { keys: ['Esc'], alt: ['P'], label: 'Pausa' },
      { keys: ['M'], alt: [], label: 'Sonido' },
    ],
    /** Word between main and alternative keys. */
    or: 'o',
    controlsTitle: 'Controles',
    shiftHint: 'Si Shift abre un aviso del sistema, usa F.',
    /** Short safety notice next to the reduce-flicker option (photosensitivity). */
    lightNotice: 'Contiene oscuridad y cambios suaves de luz. Puedes reducir el parpadeo.',
    play: 'Empezar',
    leave: 'Tab: salir del juego',
  },
  pause: {
    title: 'Pausa',
    resume: 'Continuar',
  },
  settings: {
    reduceFlicker: 'Reducir parpadeo',
    mute: 'Silenciar sonido (M)',
    classicLight: 'Linterna clásica (más fácil)',
  },
  defeat: {
    title: 'Te ha alcanzado',
    hint: 'La luz lo frena, pero no para siempre. Sigue moviéndote.',
    retry: 'Reintentar',
  },
  victory: {
    title: 'Has salido',
    time: 'Tiempo: ',
    best: 'Mejor tiempo: ',
    newBest: '¡Nuevo mejor tiempo!',
    retry: 'Reintentar',
  },
  hud: {
    battery: 'Batería ',
    batteryLow: 'Batería baja',
    batteryEmpty: 'Sin batería',
    keys: 'Llaves ',
    enemyNear: 'Algo se acerca',
    soundOn: 'Sonido: sí (M)',
    soundOff: 'Sonido: no (M)',
    pickKey: 'E: recoger llave',
    pickBattery: 'E: recoger pila',
    openDoor: 'E: abrir la puerta',
    missingKeys: (count: number): string =>
      count === 1 ? 'Falta 1 llave' : `Faltan ${String(count)} llaves`,
  },
} as const;
