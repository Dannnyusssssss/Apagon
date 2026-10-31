/** Every text shown to the player lives here. */
export const TEXTS = {
  start: {
    goal: 'Estás a oscuras. Encuentra las llaves y sal por la puerta antes de que algo te alcance.',
    light: 'La luz lo detiene, pero gasta batería. Busca pilas.',
    controls:
      'WASD o flechas: moverse · Shift o F: linterna · E: interactuar · Esc o P: pausa · M: sonido',
    shiftHint: 'Si Shift abre un aviso del sistema, usa F.',
    contentNote:
      'Aviso: oscuridad, tensión y cambios suaves de luz. Sin sangre ni imágenes explícitas.',
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
  },
  defeat: {
    title: 'Te ha alcanzado',
    hint: 'La luz lo detiene. Mantenlo dentro de tu linterna.',
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
