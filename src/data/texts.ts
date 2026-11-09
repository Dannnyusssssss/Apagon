/** Every text shown to the player lives here. */
export const TEXTS = {
  start: {
    goal: 'Estás a oscuras. Encuentra las llaves y sal antes de que algo te alcance.',
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
    continueGame: (level: number): string => `Continuar (nivel ${String(level)})`,
    newGame: 'Nueva partida',
    leave: 'Tab: salir del juego',
  },
  /** Names and the line shown just before each level, by level id. */
  levels: {
    house: {
      name: 'La casa',
      intro: 'Tres habitaciones, tres llaves y una puerta.',
    },
    deep: {
      name: 'El sótano profundo',
      intro: 'Los pasillos se estrechan y hay menos pilas. Y esta vez corre más.',
    },
    forest: {
      name: 'El bosque',
      intro: 'Por fin fuera. Busca las llaves de la verja. Ahora son dos.',
    },
  },
  levelLabel: (number: number, name: string): string => `Nivel ${String(number)}: ${name}`,
  levelDone: {
    title: 'Nivel superado',
    time: 'Tiempo del nivel: ',
    best: 'Mejor marca: ',
    newBest: '¡Nueva mejor marca!',
    next: 'Siguiente nivel',
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
    lastLevel: 'Tiempo del último nivel: ',
    total: 'Tiempo total: ',
    bestTotal: 'Mejor partida completa: ',
    newBest: '¡Nueva mejor partida completa!',
    fullRunHint: 'La partida completa solo cuenta si empiezas con "Nueva partida".',
    again: 'Nueva partida',
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
    openGate: 'E: abrir la verja',
    missingKeys: (count: number): string =>
      count === 1 ? 'Falta 1 llave' : `Faltan ${String(count)} llaves`,
  },
} as const;
