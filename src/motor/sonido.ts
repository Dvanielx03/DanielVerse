// El sonido de la película, visto desde el motor: se enciende, se apaga y sigue al instante t.
// Está apagado por defecto y la síntesis no se descarga hasta que el visitante la activa.

import { golpesEntre, mezclaDe } from './mezcla.ts';
import type { Motor } from './sintesis.ts';
import type { Entrada } from './tiempo.ts';

/** Cada cuánto se programan las notas que vienen, y con cuánta antelación. */
const TIC_MS = 25;
const ANTELACION = 0.15;

let contexto: AudioContext | undefined;
let motor: Motor | undefined;
let activo = false;
let reloj: number | undefined;
let actual: { entrada: Entrada; progreso: number } | undefined;

export function sonidoActivo(): boolean {
  return activo;
}

/** El motor llama aquí cada vez que pinta un instante. */
export function alInstante(entrada: Entrada, progreso: number): void {
  const antes = actual;
  actual = { entrada, progreso };
  if (!activo || !motor) return;

  motor.fijarMezcla(mezclaDe(entrada.plano, progreso));
  if (!antes) return;

  // Los golpes solo caen al avanzar: dentro del mismo plano, o al entrar el plano siguiente.
  // Un salto a otra parte de la película no dispara nada, y el audio no se rebobina.
  let desde: number | undefined;
  if (entrada.indice === antes.entrada.indice) desde = antes.progreso;
  else if (entrada.indice === antes.entrada.indice + 1) desde = -1;
  if (desde === undefined) return;
  for (const golpe of golpesEntre(entrada.plano, desde, progreso)) motor.golpe(golpe);
}

/** Enciende o apaga el sonido. Debe llamarse desde un gesto del visitante. Devuelve el estado final. */
export async function alternarSonido(): Promise<boolean> {
  if (activo) {
    activo = false;
    window.clearInterval(reloj);
    motor?.apagar();
    const aSuspender = contexto;
    // Deja terminar el fundido antes de parar el reloj de audio.
    window.setTimeout(() => {
      if (!activo) void aSuspender?.suspend();
    }, 260);
    return false;
  }

  const { crearMotor } = await import('./sintesis.ts');
  contexto ??= new AudioContext({ latencyHint: 'interactive' });
  await contexto.resume();
  motor ??= crearMotor(contexto);
  activo = true;

  if (actual) motor.fijarMezcla(mezclaDe(actual.entrada.plano, actual.progreso), true);
  motor.encender();
  const ctx = contexto;
  const m = motor;
  reloj = window.setInterval(() => m.programarHasta(ctx.currentTime + ANTELACION), TIC_MS);
  return true;
}

// Con la pestaña oculta el audio se detiene; al volver, sigue.
document.addEventListener('visibilitychange', () => {
  if (!activo || !contexto) return;
  if (document.hidden) void contexto.suspend();
  else void contexto.resume();
});
