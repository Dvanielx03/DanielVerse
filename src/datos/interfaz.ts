// Textos de la interfaz, fuera de la película.

import type { Idioma } from './pelicula.ts';

export interface TextosInterfaz {
  titulo: string;
  descripcion: string;
  saltarAHoja: string;
  cambiarIdioma: string;
  hoja: string;
  lineaDeTiempo: string;
  codigoDeTiempo: string;
  hojaTitulo: string;
  hojaIntro: string;
}

export const INTERFAZ: Record<Idioma, TextosInterfaz> = {
  es: {
    titulo: 'Daniel Mayorga · f(t)',
    descripcion: 'Más allá de lo convencional. Portafolio de Daniel Mayorga, desarrollador Backend Junior enfocado en IA.',
    saltarAHoja: 'Saltar a la hoja de contacto',
    cambiarIdioma: 'English',
    hoja: 'Hoja de contacto',
    lineaDeTiempo: 'Línea de tiempo de la película',
    codigoDeTiempo: 'Código de tiempo',
    hojaTitulo: 'Hoja de contacto',
    hojaIntro: 'Todos los planos de la película, a la vista.',
  },
  en: {
    titulo: 'Daniel Mayorga · f(t)',
    descripcion: 'Beyond the conventional. Portfolio of Daniel Mayorga, a Junior Backend Developer focused on AI.',
    saltarAHoja: 'Skip to the contact sheet',
    cambiarIdioma: 'Español',
    hoja: 'Contact sheet',
    lineaDeTiempo: 'Film timeline',
    codigoDeTiempo: 'Timecode',
    hojaTitulo: 'Contact sheet',
    hojaIntro: 'Every shot in the film, at a glance.',
  },
};
