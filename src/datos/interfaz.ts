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
  campoEscena: string;
  campoToma: string;
  campoDireccion: string;
  campoIdioma: string;
  campoSonido: string;
  sonido: string;
  sonidoNo: string;
  sonidoSi: string;
  proyecto: string;
  pasada: string;
  altAvatar: { boceto: string; tinta: string; final: string };
  capaBoceto: string;
  capaTinta: string;
  capaFinal: string;
  altFoto: string;
  tomaReal: string;
  capaBocetoNota: string;
  capaArquitectura: string;
  capaDatos: string;
  capasAyuda: string;
  repositorios: string;
  reelAlt: string;
  reelPausa: string;
  herramientas: { motion: string; flow: string };
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
    campoEscena: 'Escena',
    campoToma: 'Toma',
    campoDireccion: 'Dirección',
    campoIdioma: 'Idioma',
    campoSonido: 'Sonido',
    sonido: 'Sonido',
    sonidoNo: 'no',
    sonidoSi: 'sí',
    proyecto: 'Proyecto',
    pasada: 'Pasada',
    altAvatar: {
      boceto: 'Boceto a lápiz azul de Daniel con los brazos cruzados',
      tinta: 'El mismo dibujo de Daniel pasado a tinta',
      final: 'Ilustración final de Daniel con los brazos cruzados, sobre fondo oscuro',
    },
    capaBoceto: 'Boceto',
    capaTinta: 'Tinta',
    capaFinal: 'Final',
    altFoto: 'Foto de Daniel Mayorga sonriendo, con saco gris y polo blanco',
    tomaReal: 'toma real',
    capaBocetoNota: 'la idea, antes del código',
    capaArquitectura: 'Arquitectura',
    capaDatos: 'Datos',
    capasAyuda: 'Capas del plano',
    repositorios: 'Repositorios',
    reelAlt: 'Showreel «Siete mundos»: video con IA, collage, 2D por código, Blender, Three.js, low-poly y UI en movimiento',
    reelPausa: 'Pausar o seguir el showreel',
    herramientas: {
      motion: 'Skill para crear videos con HTML y JavaScript',
      flow: 'Skill de producción audiovisual para Google Flow',
    },
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
    campoEscena: 'Scene',
    campoToma: 'Take',
    campoDireccion: 'Director',
    campoIdioma: 'Language',
    campoSonido: 'Sound',
    sonido: 'Sound',
    sonidoNo: 'off',
    sonidoSi: 'on',
    proyecto: 'Project',
    pasada: 'Pass',
    altAvatar: {
      boceto: 'Blue pencil sketch of Daniel with his arms crossed',
      tinta: 'The same drawing of Daniel in ink',
      final: 'Final illustration of Daniel with his arms crossed, on a dark background',
    },
    capaBoceto: 'Sketch',
    capaTinta: 'Ink',
    capaFinal: 'Final',
    altFoto: 'Photo of Daniel Mayorga smiling, in a grey blazer and white polo',
    tomaReal: 'the real take',
    capaBocetoNota: 'the idea, before the code',
    capaArquitectura: 'Architecture',
    capaDatos: 'Facts',
    capasAyuda: 'Layers of this shot',
    repositorios: 'Repositories',
    reelAlt: 'Showreel «Seven worlds»: AI video, collage, 2D in code, Blender, Three.js, low-poly and UI in motion',
    reelPausa: 'Pause or resume the showreel',
    herramientas: {
      motion: 'A skill for making videos with HTML and JavaScript',
      flow: 'A video production skill for Google Flow',
    },
  },
};
