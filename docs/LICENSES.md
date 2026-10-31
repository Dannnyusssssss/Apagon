# Licencias

## El juego

Todos los derechos reservados. Titular: Danny Sivinta.

Todo el arte se dibuja con Canvas 2D y todo el sonido se sintetiza con WebAudio. No se usan imágenes, fuentes, música ni sonidos de terceros.

- **Música:** compuesta por el propio código del juego mientras se juega (`src/audio/music.ts`). No usa melodías ni grabaciones de terceros.
- **Portada** (`public/cover.png`) y **favicon** (`public/favicon.png`): dibujados con Canvas 2D a partir del estilo del juego, sin imágenes de terceros.
- **Tipografía:** solo fuentes instaladas en el sistema del jugador; no se incluyen ni se descargan fuentes.

## Dependencias de desarrollo

El juego no tiene dependencias de runtime. Estas herramientas solo se usan para desarrollar, probar y compilar; no se incluyen en `dist/`.

| Paquete | Versión | Licencia | Uso |
|---|---|---|---|
| vite | 8.3.5 | MIT | Servidor de desarrollo y build |
| typescript | 6.0.3 | Apache-2.0 | Tipado y comprobación |
| vitest | 5.0.5 | MIT | Tests |
| eslint | 10.14.0 | MIT | Lint |
| @eslint/js | 10.0.1 | MIT | Reglas base de lint |
| typescript-eslint | 8.72.1 | MIT | Lint para TypeScript |
| globals | 17.13.0 | MIT | Variables globales del navegador para lint |
| prettier | 3.9.10 | MIT | Formato |
| eslint-config-prettier | 10.1.8 | MIT | Compatibilidad entre lint y formato |
