/** Every text shown to the player lives here. */
export const TEXTS = {
  start: {
    goal: 'Estás a oscuras. Encuentra las llaves y sal antes de que algo te alcance.',
    light: 'Apunta la luz hacia él: lo detiene un rato, pero gasta batería. Busca pilas.',
    /** Labels of the controls list; the keys come from the current bindings. */
    controlLabels: {
      move: 'Moverse',
      light: 'Linterna',
      interact: 'Interactuar',
      pause: 'Pausa',
      mute: 'Sonido',
      aim: 'Apuntar la luz',
    },
    /** Shown for the arrow keys when they are the alternative of the four directions. */
    arrows: 'Flechas',
    mouse: 'Ratón',
    /** Word between main and alternative keys. */
    or: 'o',
    controlsTitle: 'Controles',
    shiftHint: 'Si Shift abre un aviso del sistema, cambia la tecla en Opciones, Controles.',
    /** Short safety notice next to the reduce-flicker option (photosensitivity). */
    lightNotice: 'Contiene oscuridad y cambios suaves de luz. Puedes reducir el parpadeo.',
    continueGame: (level: number): string => `Continuar (nivel ${String(level)})`,
    newGame: 'Nueva partida',
    options: 'Opciones',
    help: 'Cómo jugar',
    leave: 'Tab: salir del juego',
  },
  help: {
    title: 'Cómo jugar',
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
  options: {
    title: 'Opciones',
    back: 'Volver',
    tabsLabel: 'Secciones de opciones',
    tabs: {
      access: 'Accesibilidad',
      sound: 'Sonido',
      controls: 'Controles',
      display: 'Pantalla',
    },
    accessNote: 'La linterna clásica ilumina en círculo y el enemigo va algo más lento.',
    music: 'Música',
    effects: 'Efectos',
    enemy: 'Enemigo',
    percent: (value: number): string => `${String(value)} %`,
    soundNote: 'Todo lo importante que suena también se ve en pantalla.',
    sensitivity: 'Giro de la luz',
    sensitivityNote: 'Lo rápido que gira el haz con el teclado, el ratón o el joystick.',
    keysTitle: 'Teclas',
    keysHint: 'Elige una tecla y pulsa la nueva. Esc cancela. Esc también pausa siempre.',
    keyMain: 'principal',
    keyAlt: 'alternativa',
    addKey: 'Añadir',
    waiting: 'Pulsa…',
    keyButton: (action: string, slot: string, key: string): string =>
      `${action}, tecla ${slot}: ${key}. Cambiar`,
    listening: (action: string): string => `Pulsa la nueva tecla para ${action}. Esc cancela.`,
    assigned: (key: string, action: string): string => `${key}: ${action}.`,
    swapped: (key: string, action: string, other: string, old: string): string =>
      `${key}: ${action}. ${other} usa ahora ${old}.`,
    moved: (key: string, action: string, other: string): string =>
      `${key}: ${action}. Ya no sirve para ${other}.`,
    wouldEmpty: (key: string, other: string): string =>
      `${key} es la única tecla de ${other}. Dale otra antes.`,
    notBindable: 'Esa tecla no se puede usar. Prueba otra.',
    cancelled: 'Sin cambios.',
    restore: 'Restaurar teclas',
    restored: 'Teclas restauradas.',
    quality: 'Calidad gráfica',
    qualities: { low: 'Baja', medium: 'Media', high: 'Alta' },
    qualityNote: 'Baja dibuja menos píxeles: va más fluido en equipos lentos.',
    brightness: 'Brillo',
    brightnessValue: (steps: number): string => (steps === 0 ? 'Normal' : `+${String(steps)}`),
    brightnessNote: 'Ayuda en pantallas oscuras. Lo que la luz no alcanza sigue a oscuras.',
    stats: 'Mostrar rendimiento',
    statsKey: ' (F3)',
  },
  /** Names of the actions in the controls window. */
  actions: {
    up: 'Arriba',
    down: 'Abajo',
    left: 'Izquierda',
    right: 'Derecha',
    toggleFlashlight: 'Linterna',
    interact: 'Interactuar',
    pause: 'Pausa',
    mute: 'Sonido',
  },
  /** Names of keys that are not a single character. */
  keys: {
    Space: 'Espacio',
    ShiftLeft: 'Shift',
    Enter: 'Enter',
    NumpadEnter: 'Enter num.',
    Escape: 'Esc',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    numpad: (digit: string): string => `Num ${digit}`,
  },
  stats: {
    fps: 'FPS',
    frame: 'Frame',
    worst: 'Peor',
    long: 'Frames largos',
    canvas: 'Lienzo',
    every: (divisor: number): string =>
      divisor === 1 ? 'Dibuja cada refresco' : `Dibuja 1 de cada ${String(divisor)} refrescos`,
  },
  settings: {
    reduceFlicker: 'Reducir parpadeo',
    mute: 'Silenciar sonido',
    /** Only next to the keyboard controls. */
    muteKey: ' (M)',
    classicLight: 'Linterna clásica (más fácil)',
    mouseAim: 'Apuntar con el ratón',
    leftHanded: 'Controles a la izquierda (zurdos)',
    touchControls: 'Controles táctiles',
    touchModes: { auto: 'Automático', always: 'Siempre', never: 'Nunca' },
    touchNever: 'Con "Nunca" necesitas un teclado para jugar.',
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
  touch: {
    /** Same format as the key caps: where to touch, and what it does. */
    controls: [
      { keys: ['Lado libre'], alt: [], label: 'Arrastra para moverte' },
      { keys: ['Lado de los botones'], alt: [], label: 'Arrastra para apuntar la luz' },
      { keys: ['Botones'], alt: [], label: 'Linterna, interactuar y pausa' },
    ],
    landscape: 'Se juega mejor en horizontal.',
    light: 'Linterna',
    lightOn: 'Encendida',
    lightOff: 'Apagada',
    interact: 'Interactuar',
    pause: 'Pausa',
    prompts: {
      pickKey: 'Recoger llave',
      pickBattery: 'Recoger pila',
      openDoor: 'Abrir la puerta',
      openGate: 'Abrir la verja',
    },
  },
  hud: {
    battery: 'Batería ',
    batteryLow: 'Batería baja',
    batteryEmpty: 'Sin batería',
    keys: 'Llaves ',
    enemyNear: 'Algo se acerca',
    soundOn: 'Sonido: sí',
    soundOff: 'Sonido: no',
    /** The key that mutes, next to the sound state; left out when its name is long. */
    soundKey: (key: string): string => ` (${key})`,
    /** What the interact key does now: the key name goes first. */
    pickKey: (key: string): string => `${key}: recoger llave`,
    pickBattery: (key: string): string => `${key}: recoger pila`,
    openDoor: (key: string): string => `${key}: abrir la puerta`,
    openGate: (key: string): string => `${key}: abrir la verja`,
    missingKeys: (count: number): string =>
      count === 1 ? 'Falta 1 llave' : `Faltan ${String(count)} llaves`,
  },
} as const;
