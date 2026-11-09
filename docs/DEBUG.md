# Depuración

Opciones para desarrollo. Están **desactivadas por defecto** y solo se activan con parámetros en la URL. Sin ellos no se crea nada extra (el overlay ni siquiera existe), así que no consumen CPU.

Cualquier valor inválido se ignora. Un indicador se activa si aparece sin valor, con `1` o con `true`.

| Parámetro | Efecto |
|---|---|
| `?debug` | Muestra un panel arriba a la derecha con FPS, pasos lógicos por segundo, nivel y número de enemigos, estado de la partida, área y casilla del jugador, batería, modo de linterna (cono o clásica), ángulo del haz, velocidad y estado del enemigo más cercano, cercanía, llaves y ajustes. Se actualiza 4 veces por segundo. |
| `?god` | Los enemigos no pueden alcanzar al jugador. Todo lo demás funciona igual, pero la partida no guarda progreso ni récords. |
| `?seed=N` | Fija la semilla (entero de 0 a 4294967295). Decide las llaves, las pilas y en qué puntos `E` empiezan los enemigos, así una partida se puede repetir. |
| `?level=N` | Empieza en el nivel `N` (de 1 a 3) al pulsar "Nueva partida". La partida no guarda progreso ni récords, y no cuenta como partida completa. |

Se pueden combinar: `?debug&god&seed=7&level=3`.

No hay teclas de depuración.

## Áreas

El panel muestra el `id` del área en la que está el jugador. Las áreas se definen en `src/data/rooms.ts` y `src/data/levels.ts`:

| Nivel | Áreas |
|---|---|
| `house` | `entrance`, `living`, `basement` |
| `deep` | `west`, `center`, `east` |
| `forest` | `clearing`, `thicket`, `road` |
