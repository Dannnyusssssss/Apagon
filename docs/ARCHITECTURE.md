# Arquitectura de Apagón

Apagón es un juego de terror en vista superior hecho con TypeScript, Canvas 2D y WebAudio, sin motores ni dependencias en tiempo de ejecución. Es un sitio estático: no tiene servidor y todo lo que necesita viaja dentro de `dist/`. Este documento explica cómo está organizado el código y por qué.

## Carpetas

```
src/
  main.ts     Arranque: une la lógica, el dibujo, el sonido, las pantallas y el guardado
  core/       Piezas sin relación con el juego: bucle, aleatoriedad con semilla, teclado, cámara, ángulos
  data/       Datos tipados: mapas, niveles, ajustes de dificultad, textos y título
  game/       Lógica pura: mundo, jugador, enemigos, objetos, visibilidad y sistemas
  render/     Dibujo en Canvas 2D: mapa, luz, figuras e indicadores en pantalla
  ui/         Pantallas en HTML: inicio, pausa, entre niveles, victoria y derrota
  audio/      Sonido con WebAudio y la lógica pura que decide qué suena
  save/       Guardado en localStorage y récords de la partida
tests/        Pruebas de la lógica pura
public/       Icono y portada
docs/         Documentación pública
```

## Capas

```
          teclado
             │
             ▼
 main.ts ──► game/ ──► eventos y estado
    │                      │
    │        ┌─────────────┼─────────────┐
    ▼        ▼             ▼             ▼
  save/    render/       audio/         ui/
```

- **`game/` no conoce el navegador.** No toca el canvas, el DOM ni el audio. Por eso puede probarse entero sin abrir una página, y una partida puede simularse en una prueba con los mismos sistemas que usa el juego.
- **`render/` solo lee.** Recibe el mundo y lo dibuja, sin modificarlo.
- **Los datos están separados de la lógica.** Un mapa, una dificultad o un texto se cambian en `data/`, sin tocar los sistemas.

## Flujo de una partida

1. `core/loop.ts` avanza la lógica en pasos fijos de 1/60 de segundo. El dibujo interpola entre pasos y `core/framePacer.ts` decide cada cuántos refrescos del monitor se dibuja.
2. `main.ts` lee el teclado y llama a `stepWorld` en `game/world.ts`, el único lugar donde se declara el orden de los sistemas: linterna, batería, movimiento, puntería, interacción, mapa de distancias, luz y persecución de cada enemigo, separación, parpadeo, avisos y captura.
3. Los sistemas anotan lo ocurrido en `game/events.ts`. El sonido lee esos contadores y `main.ts` los limpia.
4. Cuando la partida termina, `main.ts` actualiza los récords con `save/progress.ts`, guarda con `save/storage.ts` y abre la pantalla que corresponde.

## Decisiones de diseño

- **Mapas como texto.** Cada nivel es una cuadrícula de caracteres en `data/`. Es fácil de leer, de comparar en un control de versiones y de validar al cargar.
- **Aleatoriedad con semilla.** Las llaves, las pilas y los puntos de salida del enemigo se eligen con `core/rng.ts`, nunca con `Math.random`. La misma semilla repite la misma partida. La música usa su propio generador para no alterar esa secuencia.
- **Luz separada en dos.** Qué toca la luz se calcula en `game/visibility.ts`, con pruebas. Cómo se ve es un efecto de `render/lighting.ts`: un polígono recortado sobre una capa oscura, sin cálculo por píxel.
- **Dificultad por multiplicadores.** Un nivel multiplica la velocidad del enemigo y la duración de la batería sobre los valores de la linterna activa, así cada nivel funciona con el cono y con la linterna clásica.
- **Varios enemigos, un mapa de distancias.** El mapa se calcula desde el jugador y lo comparten todos. Cada enemigo guarda su propio estado de luz y su costumbre. Para que no terminen superpuestos, el más alejado del jugador se aparta suavemente; el de delante nunca recibe ese empuje, de modo que la separación no puede hacerlo más rápido. El sonido y los avisos siguen al más cercano.
- **El coste está en los píxeles.** La lógica gasta poco; lo caro es rellenar la pantalla. Por eso se limitan los FPS con un divisor entero del refresco del monitor (a 144 Hz se dibuja a 72 FPS, cada frame con el mismo tiempo en pantalla), `core/resolution.ts` limita la densidad del lienzo, la capa de oscuridad usa la mitad de resolución porque solo contiene formas suaves, y en menús y pausa el lienzo se dibuja una sola vez.
- **Sin objetos nuevos en cada paso.** Rutas, polígonos de luz y figuras reutilizan memoria o se dibujan una sola vez, para evitar pausas del recolector de basura.
- **Pensado para un marco.** El juego funciona dentro de un `iframe`: no navega fuera, no abre ventanas, no roba el foco al cargar y deja salir con Tab.
- **Seguridad del jugador.** El parpadeo es suave, no supera 3 cambios por segundo y se puede quitar. Todo lo importante que suena también se muestra en pantalla.

## Guardado

Se usa una sola clave de `localStorage`, `apagon:v1`, con los ajustes, el nivel desbloqueado y los mejores tiempos. Se valida campo por campo: un dato corrupto o fuera de rango se sustituye por su valor predeterminado sin perder los demás. Los guardados de versiones anteriores, que tenían un único mejor tiempo, se leen como el récord del primer nivel. La partida en curso no se guarda: al recargar, "Continuar" empieza desde el inicio del nivel desbloqueado.

## Pruebas

Las pruebas usan Vitest y cubren la lógica pura: visibilidad, persecución, batería, objetos, guardado, progreso, audio posicional y datos de cada nivel. `tests/levels.test.ts` también juega cada nivel con un jugador simulado sobre los sistemas reales, con los enemigos activos. Comprueba que se pueden ganar, aunque no sirve para medir si la dificultad resulta justa para una persona. El dibujo y el sonido real no tienen pruebas automáticas y se revisan a mano.

## Cómo agregar un nivel

1. Dibuja el mapa en `src/data/levels.ts` con estos caracteres: `#` pared, `T` árbol, `R` roca, `.` suelo, `P` inicio del jugador, `E` posible inicio de un enemigo, `K` posible llave, `B` posible pila y `D` salida.
2. Agrega la entrada a `LEVELS` con su paleta, su salida y, si hace falta, su dificultad. Lo que no indique sale de `src/data/balance.ts`.
3. Agrega su nombre y su frase de entrada en `src/data/texts.ts`.

Las pruebas de `tests/levels.test.ts` recorren `LEVELS`, así que el nivel nuevo se valida solo: que todo sea alcanzable, que la batería alcance y que se pueda ganar. Algunas comprobaciones sí fijan la lista actual de niveles y habría que ajustarlas.

## Límites conocidos

- Solo se juega con teclado.
- Árboles y rocas se dibujan con formas orgánicas, pero chocan como casillas cuadradas.
- En el bosque, la luz dibujada entra en árboles y rocas para que se distingan, mientras que la lógica se detiene en el borde de la casilla. Lo que se ve y lo que frena al enemigo no coinciden del todo en esas casillas.
- No hay selector de niveles: se avanza en orden.
