// El tiempo de la película. Todo aquí es puro: mismo t, mismo resultado.
// La unidad de t es la pantalla de scroll; el código de tiempo la convierte a segundos.

import type { Escena, Plano } from '../datos/pelicula.ts';

/** Una pantalla equivale a tres compases a 90 BPM. */
export const SEGUNDOS_POR_PANTALLA = 8;
/** Lo dibujado se mueve a 12 fotogramas por segundo. */
export const FPS = 12;

export interface Entrada {
  plano: Plano;
  escena: Escena;
  /** Posición del plano en la película, desde 0. */
  indice: number;
  /** Instante de inicio, en pantallas. */
  inicio: number;
  /** Instante de fin, en pantallas. */
  fin: number;
}

export interface Indice {
  entradas: Entrada[];
  /** Duración total, en pantallas. */
  total: number;
}

export interface Posicion {
  entrada: Entrada;
  /** Avance dentro del plano, de 0 a 1. */
  progreso: number;
}

export function construirIndice(escenas: Escena[]): Indice {
  const entradas: Entrada[] = [];
  let inicio = 0;
  for (const escena of escenas) {
    for (const plano of escena.planos) {
      const fin = redondear(inicio + plano.pantallas);
      entradas.push({ plano, escena, indice: entradas.length, inicio, fin });
      inicio = fin;
    }
  }
  return { entradas, total: inicio };
}

export function limitar(indice: Indice, t: number): number {
  if (Number.isNaN(t)) return 0;
  return Math.min(indice.total, Math.max(0, t));
}

/** Qué plano está en pantalla en el instante t y cuánto ha avanzado. */
export function localizar(indice: Indice, t: number): Posicion {
  const instante = limitar(indice, t);
  const ultima = indice.entradas[indice.entradas.length - 1];
  if (!ultima) throw new Error('La película no tiene planos');
  if (instante >= indice.total) return { entrada: ultima, progreso: 1 };
  const entrada = indice.entradas.find((e) => instante < e.fin) ?? ultima;
  return { entrada, progreso: (instante - entrada.inicio) / entrada.plano.pantallas };
}

export function inicioDe(indice: Indice, id: string): number | undefined {
  return indice.entradas.find((e) => e.plano.id === id)?.inicio;
}

/** Código de tiempo mm:ss:ff a 12 fps. */
export function codigoDeTiempo(t: number): string {
  const fotogramas = Math.floor(Math.max(0, t) * SEGUNDOS_POR_PANTALLA * FPS + 1e-6);
  const dos = (n: number) => String(n).padStart(2, '0');
  const minutos = Math.floor(fotogramas / (FPS * 60));
  const segundos = Math.floor(fotogramas / FPS) % 60;
  return `${dos(minutos)}:${dos(segundos)}:${dos(fotogramas % FPS)}`;
}

function redondear(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
