// Cómo entra cada sección. Ya no hay cortes secos: cada tipo de plano tiene su manera de llegar.

import type { Arte } from './pelicula.ts';

export type Transicion =
  /** Sin transición: la sección aparece tal cual. */
  | 'corte'
  /** Un tajo en diagonal que barre la pantalla. */
  | 'tajo'
  /** Puntos de semitono que crecen hasta cubrirlo todo. */
  | 'semitono'
  /** Franjas horizontales desplazadas, como una señal que se descompone. */
  | 'glitch'
  /** Una viñeta que entra de lado y empuja a la anterior. */
  | 'vineta'
  /** Un estallido de cómic que se abre desde el centro. */
  | 'estallido'
  /** Un círculo que se abre. */
  | 'iris'
  /** La cámara atraviesa la sección anterior. */
  | 'zoom';

export const TRANSICION_POR_ARTE: Record<Arte, Transicion> = {
  claqueta: 'corte',
  convencional: 'semitono',
  ruptura: 'zoom',
  'avatar-boceto': 'tajo',
  'avatar-tinta': 'glitch',
  'avatar-final': 'glitch',
  reto: 'vineta',
  pared: 'estallido',
  proyecto: 'tajo',
  diptico: 'semitono',
  inspeccion: 'zoom',
  truco: 'glitch',
  herramientas: 'vineta',
  pixel: 'semitono',
  creditos: 'iris',
  contacto: 'zoom',
};

/** El color que tiñe el aire de cada escena. */
export const TONO_POR_ESCENA: Record<string, string> = {
  E0: '#3f7fd9',
  E1: '#3f7fd9',
  E2: '#7b3dff',
  E3: '#ff2d6f',
  E4: '#2de2ff',
  E5: '#ffd23f',
  E6: '#ff8a3d',
};

/** Cuánto scroll dura una transición, en pantallas. */
export const DURACION_TRANSICION = 0.3;
