// La mezcla de sonido como función del instante: qué capas suenan y qué golpes caen.
// Todo aquí es puro, igual que el tiempo: mismo plano y mismo avance, misma mezcla.

import type { Arte, Plano } from '../datos/pelicula.ts';

/** Nivel de cada capa, de 0 a 1. */
export interface Mezcla {
  /** Tono de sala: el fondo casi inaudible que hay siempre. */
  sala: number;
  /** Lápiz y papel, secos y cercanos. */
  papel: number;
  /** La pista de tensión: oscura y casi vacía, para poder leer. */
  tension: number;
  /** La pista de descarga: batería y bajo pesados. */
  descarga: number;
  /** La pista de resolución: el final cálido. */
  resolucion: number;
  /** La subida de ruido que precede a la ruptura. */
  subida: number;
  /** Cuánta reverberación: en papel todo suena seco; en sala se abre el espacio. */
  reverb: number;
}

export type TipoGolpe =
  | 'claqueta'
  | 'rasgado'
  | 'golpe-grave'
  | 'golpe-suave'
  | 'barrido'
  | 'sello'
  | 'tacha'
  // Los sonidos de las transiciones y de los saltos de dimensión.
  | 'tajo'
  | 'trama'
  | 'glitch'
  | 'papel'
  | 'impacto'
  | 'iris'
  | 'zoom'
  | 'rebobinado'
  | 'tic';

/** Un sonido suelto que cae cuando el plano cruza un punto de su avance. */
export interface Golpe {
  /** Avance del plano (0 a 1) en el que suena. */
  en: number;
  sonido: TipoGolpe;
  /** Segundos de espera, para casar con una animación que va por tiempo. */
  retraso?: number;
}

const SILENCIO: Mezcla = { sala: 0.6, papel: 0, tension: 0, descarga: 0, resolucion: 0, subida: 0, reverb: 1 };

/** Cuándo cae la pared en la ruptura: ahí entra la primera descarga. */
export const CAIDA_DE_LA_PARED = 0.64;
/** Cuándo cae la descarga en el showreel: cuando su entrada ya terminó. */
export const CAIDA_DEL_REEL = 0.16;
/** En el primer plano de «Quién» la descarga se apaga antes de que haya que leer. */
const APAGADO_EN_QUIEN = 0.4;

const limitar = (n: number) => Math.min(1, Math.max(0, n));

/** La mezcla de un plano en un punto de su avance. */
export function mezclaDe(plano: Plano, p: number): Mezcla {
  const avance = limitar(p);
  const base: Mezcla = { ...SILENCIO, reverb: plano.mundo === 'papel' ? 0 : 1 };

  switch (plano.arte) {
    case 'claqueta':
      // Casi silencio: lápiz y papel.
      return { ...base, papel: 1 };
    case 'convencional':
      // El tema empieza a oírse, lejos, como a través de una pared.
      return { ...base, papel: 1, tension: 0.4 };
    case 'ruptura':
      // Subida de ruido, rasgado, golpe grave y entra la primera descarga.
      return avance < CAIDA_DE_LA_PARED
        ? { ...base, papel: 1 - avance / CAIDA_DE_LA_PARED, subida: avance / CAIDA_DE_LA_PARED, reverb: avance }
        : { ...base, tension: 0.6, descarga: 1 };
    case 'avatar-boceto':
      // La descarga se apaga hasta quedar el fondo de tensión.
      return { ...base, tension: 1, descarga: limitar(1 - avance / APAGADO_EN_QUIEN) };
    case 'avatar-tinta':
    case 'avatar-final':
      return { ...base, tension: 1 };
    case 'reto':
      return { ...base, tension: 0.5, descarga: 1 };
    case 'pared':
    case 'proyecto':
    case 'diptico':
    case 'inspeccion':
      // Sin batería, para poder leer.
      return { ...base, tension: 0.85 };
    case 'truco':
    case 'pixel':
      // Segunda descarga.
      return { ...base, tension: 0.5, descarga: 1 };
    case 'herramientas':
      // Vuelve el suspenso, para preparar la caída del showreel.
      return { ...base, tension: 1 };
    case 'reel':
      // Suspenso que sube mientras llega el showreel; cae la descarga cuando arranca.
      return avance < CAIDA_DEL_REEL
        ? { ...base, tension: 1, subida: avance / CAIDA_DEL_REEL }
        : { ...base, tension: 0.4, descarga: 1 };
    case 'creditos':
    case 'contacto':
      // Resolución: el tema vuelve lento y lejano, como unos créditos, con el suspenso debajo.
      return { ...base, tension: 0.7, resolucion: 1 };
    default:
      return { ...base, tension: 0.6 };
  }
}

const GOLPES: Partial<Record<Arte, Golpe[]>> = {
  // El dibujo se rebobina y cae la toma real, como un salto entre dimensiones.
  contacto: [
    { en: 0.15, sonido: 'rebobinado' },
    { en: 0.3, sonido: 'impacto' },
  ],
  claqueta: [{ en: 0.7, sonido: 'claqueta' }],
  ruptura: [
    { en: 0.42, sonido: 'rasgado' },
    { en: CAIDA_DE_LA_PARED, sonido: 'golpe-grave' },
  ],
  'avatar-tinta': [{ en: 0.05, sonido: 'golpe-suave' }],
  'avatar-final': [{ en: 0.05, sonido: 'golpe-suave' }],
  // El sello de la claqueta de proyecto cae 667 ms después de entrar el plano.
  proyecto: [{ en: 0, sonido: 'sello', retraso: 0.67 }],
  diptico: [{ en: 0.46, sonido: 'tacha' }],
  reel: [{ en: CAIDA_DEL_REEL, sonido: 'golpe-grave' }],
};

/** Los golpes de un plano, en orden. */
export function golpesDe(plano: Plano): Golpe[] {
  return (plano.arte && GOLPES[plano.arte]) || [];
}

/**
 * Los golpes que caen al avanzar de `desde` a `hasta` dentro de un plano.
 * El audio no se rebobina: hacia atrás no suena nada. Para un plano que acaba de entrar, `desde` es -1.
 */
export function golpesEntre(plano: Plano, desde: number, hasta: number): Golpe[] {
  if (hasta <= desde) return [];
  return golpesDe(plano).filter((golpe) => golpe.en > desde && golpe.en <= hasta);
}
