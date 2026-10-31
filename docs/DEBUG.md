# Depuración

Opciones para desarrollo. Están **desactivadas por defecto** y solo se activan con parámetros en la URL. Sin ellos no se crea nada extra (el overlay ni siquiera existe), así que no consumen CPU.

Cualquier valor inválido se ignora. Un indicador se activa si aparece sin valor, con `1` o con `true`.

| Parámetro | Efecto |
|---|---|
| `?debug` | Muestra un panel arriba a la derecha con FPS, pasos lógicos por segundo, estado de la partida, habitación y casilla del jugador, batería, estado del enemigo, cercanía, llaves y ajustes. Se actualiza 4 veces por segundo. |
| `?god` | El enemigo no puede alcanzar al jugador. Todo lo demás funciona igual. |
| `?seed=N` | Fija la semilla (entero de 0 a 4294967295). Decide en qué punto `E` del mapa empieza el enemigo, así una partida se puede repetir. |

Se pueden combinar: `?debug&god&seed=7`.

No hay teclas de depuración.

## Habitaciones

El panel muestra el `id` del área en la que está el jugador: `entrance` (entrada), `living` (salón) o `basement` (sótano). Las áreas se definen en `src/data/rooms.ts`.
