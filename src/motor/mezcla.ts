// La mezcla de sonido como función del instante: qué capas suenan y qué golpes caen.
// Todo aquí es puro, igual que el tiempo: mismo plano y mismo avance, misma mezcla.
// Fuente: «Tensión y descarga», docs/design-system.md y docs/storyboard.md

import { ESCENAS, type Arte, type Plano } from '../datos/pelicula.ts';

/** Con qué suena la percusión menuda de la descarga. */
export type Timbre = 'bateria' | 'lapiz' | 'proyector';

/** Nivel de cada capa, de 0 a 1. */
export interface Mezcla {
  /** Tono de sala: el fondo casi inaudible que hay siempre. */
  sala: number;
  /** Lápiz y papel, secos y cercanos. */
  papel: number;
  /** Fondo oscuro, casi vacío. */
  tension: number;
  /** Bajo pesado y percusión densa, a 90 BPM. */
  descarga: number;
  /** El acorde cálido de los créditos. */
  resolucion: number;
  /** La subida de ruido que precede a la ruptura. */
  subida: number;
  /** Cuánta reverberación: en papel todo suena seco; en sala se abre el espacio. */
  reverb: number;
  timbre: Timbre;
}

export type TipoGolpe =
  | 'claqueta'
  | 'llamada'
  | 'llamada-lejos'
  | 'llamada-resuelta'
  | 'rasgado'
  | 'golpe-grave'
  | 'golpe-suave'
  | 'barrido'
  | 'sello'
  | 'tacha';

/** Un sonido suelto que cae cuando el plano cruza un punto de su avance. */
export interface Golpe {
  /** Avance del plano (0 a 1) en el que suena. */
  en: number;
  sonido: TipoGolpe;
  /** Segundos de espera, para casar con una animación que va por tiempo. */
  retraso?: number;
  /** Transposición de la llamada, en semitonos. */
  semitonos?: number;
}

const SILENCIO: Mezcla = {
  sala: 0.6,
  papel: 0,
  tension: 0,
  descarga: 0,
  resolucion: 0,
  subida: 0,
  reverb: 1,
  timbre: 'bateria',
};

/** Cuándo cae la pared en la ruptura: ahí entra la primera descarga. */
export const CAIDA_DE_LA_PARED = 0.56;
/** En el primer plano de «Quién» la descarga se apaga antes de que haya que leer. */
const APAGADO_EN_QUIEN = 0.4;

const limitar = (n: number) => Math.min(1, Math.max(0, n));

/** La mezcla de un plano en un punto de su avance. */
export function mezclaDe(plano: Plano, p: number): Mezcla {
  const avance = limitar(p);
  const base: Mezcla = { ...SILENCIO, reverb: plano.mundo === 'papel' ? 0 : 1 };

  switch (plano.arte) {
    case 'claqueta':
    case 'convencional':
      // Casi silencio: lápiz, papel y la firma oída de lejos.
      return { ...base, papel: 1 };
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
      // Descarga; el lápiz golpeando hace de percusión.
      return { ...base, tension: 0.5, descarga: 1, timbre: 'lapiz' };
    case 'pared':
    case 'proyecto':
    case 'diptico':
    case 'inspeccion':
      // Atmósfera sin batería, para poder leer.
      return { ...base, tension: 0.8 };
    case 'truco':
    case 'herramientas':
    case 'pixel':
      // Segunda descarga; los clics suenan a cinta y proyector.
      return { ...base, tension: 0.5, descarga: 1, timbre: 'proyector' };
    case 'creditos':
    case 'contacto':
      // Resolución: sin batería, un acorde cálido.
      return { ...base, tension: 0.2, resolucion: 1 };
    default:
      return { ...base, tension: 0.6 };
  }
}

/** La llamada cambia de altura con cada proyecto. */
const VARIACIONES = [0, 3, -2];

const GOLPES: Partial<Record<Arte, Golpe[]>> = {
  claqueta: [{ en: 0.7, sonido: 'claqueta' }],
  convencional: [{ en: 0.8, sonido: 'llamada-lejos' }],
  ruptura: [
    { en: 0.3, sonido: 'rasgado' },
    { en: CAIDA_DE_LA_PARED, sonido: 'golpe-grave' },
  ],
  'avatar-tinta': [{ en: 0, sonido: 'golpe-suave' }],
  'avatar-final': [
    { en: 0, sonido: 'golpe-suave' },
    { en: 0.35, sonido: 'llamada' },
  ],
  reto: [{ en: 0, sonido: 'barrido' }],
  // El sello de la claqueta de proyecto cae 667 ms después de entrar el plano.
  proyecto: [{ en: 0, sonido: 'sello', retraso: 0.67 }],
  diptico: [
    { en: 0.3, sonido: 'tacha' },
    { en: 0.62, sonido: 'llamada' },
  ],
  herramientas: [{ en: 0.05, sonido: 'barrido' }],
  contacto: [{ en: 0.3, sonido: 'llamada-resuelta' }],
};

/** Los golpes de un plano, en orden. */
export function golpesDe(plano: Plano): Golpe[] {
  const golpes = (plano.arte && GOLPES[plano.arte]) || [];
  if (plano.arte !== 'diptico') return golpes;
  const dipticos = ESCENAS.flatMap((escena) => escena.planos).filter((p) => p.arte === 'diptico');
  const semitonos = VARIACIONES[dipticos.findIndex((p) => p.id === plano.id) % VARIACIONES.length] ?? 0;
  return golpes.map((golpe) => (golpe.sonido === 'llamada' ? { ...golpe, semitonos } : golpe));
}

/**
 * Los golpes que caen al avanzar de `desde` a `hasta` dentro de un plano.
 * El audio no se rebobina: hacia atrás no suena nada. Para un plano que acaba de entrar, `desde` es -1.
 */
export function golpesEntre(plano: Plano, desde: number, hasta: number): Golpe[] {
  if (hasta <= desde) return [];
  return golpesDe(plano).filter((golpe) => golpe.en > desde && golpe.en <= hasta);
}
