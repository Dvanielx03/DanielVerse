// El storyboard como datos. Fuente: docs/storyboard.md
// De aquí salen la película, la hoja de contacto y las dos versiones de idioma.

export type Idioma = 'es' | 'en';
export type Mundo = 'papel' | 'sala';
export type Bilingue = Record<Idioma, string>;
export type Arte = 'claqueta' | 'convencional' | 'ruptura' | 'avatar-boceto' | 'avatar-tinta' | 'avatar-final';

export interface Enlace {
  etiqueta: Bilingue;
  url: string;
}

export interface Plano {
  id: string;
  nombre: Bilingue;
  /** Duración en pantallas de scroll. */
  pantallas: number;
  mundo: Mundo;
  titular?: Bilingue;
  lineas?: Record<Idioma, string[]>;
  nota?: Bilingue;
  sello?: Bilingue;
  enlaces?: Enlace[];
  /** Puesta en escena propia del plano. Sin ella, se usa la composición tipográfica. */
  arte?: Arte;
  /** El plano entra con un fundido de cuatro fotogramas en vez de corte seco. */
  fundido?: boolean;
}

export interface Escena {
  id: string;
  nombre: Bilingue;
  planos: Plano[];
}

const GITHUB = 'https://github.com/Dvanielx03';
const LINKEDIN = 'https://www.linkedin.com/in/daniel-santiago-mayorga-tellez-5bb0463a0/';
const CORREO = 'mailto:danielsantiagomayorga03@gmail.com';

const enlaceGithub: Enlace = { etiqueta: { es: 'GitHub', en: 'GitHub' }, url: GITHUB };
const enlaceLinkedin: Enlace = { etiqueta: { es: 'LinkedIn', en: 'LinkedIn' }, url: LINKEDIN };
const enlaceCorreo: Enlace = { etiqueta: { es: 'Correo', en: 'Email' }, url: CORREO };
const repositorio = (ruta: string): Enlace => ({
  etiqueta: { es: 'Ver el repositorio', en: 'See the repository' },
  url: `${GITHUB}/${ruta}`,
});

export const ESCENAS: Escena[] = [
  {
    id: 'E0',
    nombre: { es: 'Claqueta', en: 'Slate' },
    planos: [
      {
        id: 'E0-P1',
        nombre: { es: 'Claqueta', en: 'Slate' },
        pantallas: 1.25,
        mundo: 'papel',
        arte: 'claqueta',
        titular: { es: 'f(t)', en: 'f(t)' },
        lineas: {
          es: ['Escena 0 · Toma 1', 'Desliza para rodar'],
          en: ['Scene 0 · Take 1', 'Scroll to roll'],
        },
      },
    ],
  },
  {
    id: 'E1',
    nombre: { es: 'Lo convencional', en: 'The conventional' },
    planos: [
      {
        id: 'E1-P1',
        nombre: { es: 'El portafolio de siempre', en: 'The usual portfolio' },
        pantallas: 1,
        mundo: 'papel',
        arte: 'convencional',
        titular: { es: 'Daniel Mayorga', en: 'Daniel Mayorga' },
        lineas: {
          es: ['Desarrollador Backend Junior enfocado en IA', 'Java · Spring Boot · Python · FastAPI · PostgreSQL'],
          en: ['Junior Backend Developer focused on AI', 'Java · Spring Boot · Python · FastAPI · PostgreSQL'],
        },
        nota: { es: '¿y si vamos más allá?', en: 'what if we go further?' },
        enlaces: [enlaceGithub, enlaceLinkedin, enlaceCorreo],
      },
      {
        id: 'E1-P2',
        nombre: { es: 'La ruptura', en: 'The break' },
        pantallas: 1,
        mundo: 'sala',
        arte: 'ruptura',
        titular: { es: 'Más allá de lo convencional', en: 'Beyond the conventional' },
      },
    ],
  },
  {
    id: 'E2',
    nombre: { es: 'Quién', en: 'Who' },
    planos: [
      {
        id: 'E2-P1',
        nombre: { es: 'Boceto', en: 'Sketch' },
        pantallas: 1,
        mundo: 'sala',
        arte: 'avatar-boceto',
        fundido: true,
        lineas: {
          es: ['Soy Daniel, desarrollador Backend Junior enfocado en IA, apasionado por la tecnología y la creación de soluciones.'],
          en: ["I'm Daniel, a Junior Backend Developer focused on AI, passionate about technology and building solutions."],
        },
      },
      {
        id: 'E2-P2',
        nombre: { es: 'Tinta', en: 'Ink' },
        pantallas: 1,
        mundo: 'sala',
        arte: 'avatar-tinta',
        fundido: true,
        lineas: {
          es: ['Veo cada reto como una oportunidad para aprender, explorar nuevas ideas y hacer las cosas de manera diferente.'],
          en: ['I see every challenge as a chance to learn, explore new ideas and do things differently.'],
        },
      },
      {
        id: 'E2-P3',
        nombre: { es: 'Final', en: 'Final' },
        pantallas: 1,
        mundo: 'sala',
        arte: 'avatar-final',
        fundido: true,
        lineas: {
          es: ['Me caracterizo por mi iniciativa, mentalidad positiva y creatividad para aportar valor a cada proyecto en el que participo.'],
          en: ['I bring initiative, a positive mindset and creativity to add value to every project I take part in.'],
        },
        nota: { es: 'pausa aquí y mira las capas', en: 'pause here and look at the layers' },
      },
    ],
  },
  {
    id: 'E3',
    nombre: { es: 'Retos', en: 'Challenges' },
    planos: [
      {
        id: 'E3-P1',
        nombre: { es: 'Robótica', en: 'Robotics' },
        pantallas: 0.9,
        mundo: 'sala',
        titular: { es: 'Primer puesto', en: 'First place' },
        lineas: {
          es: ['Concurso de Ingeniería Electrónica', 'Semillero de Robótica, UDI · 2024–2025'],
          en: ['Electronic Engineering contest', 'Robotics research group, UDI · 2024–2025'],
        },
      },
      {
        id: 'E3-P2',
        nombre: { es: 'El campus bajo presión', en: 'El campus bajo presión' },
        pantallas: 0.9,
        mundo: 'sala',
        titular: { es: 'El campus bajo presión', en: 'El campus bajo presión' },
        lineas: {
          es: ['Hackatón de IA · Campuslands 2026', 'Persistencia, datos iniciales, inventario, importación y Docker Compose'],
          en: ['AI hackathon · Campuslands 2026', 'Persistence, seed data, inventory, data import and Docker Compose'],
        },
        enlaces: [
          {
            etiqueta: { es: 'Ver la prueba', en: 'See the proof' },
            url: `${GITHUB}/soluciones-rocket/pull/3`,
          },
        ],
      },
      {
        id: 'E3-P3',
        nombre: { es: 'Visual Agents', en: 'Visual Agents' },
        pantallas: 0.9,
        mundo: 'sala',
        titular: { es: 'Visual Agents · WildLens AI', en: 'Visual Agents · WildLens AI' },
        lineas: {
          es: ['Hackatón de IA · Campuslands 2026', 'YOLOv8, FiftyOne, LLaMA 3.3, FastAPI y React', 'Presentado ante jurado técnico'],
          en: ['AI hackathon · Campuslands 2026', 'YOLOv8, FiftyOne, LLaMA 3.3, FastAPI and React', 'Presented to a technical jury'],
        },
      },
      {
        id: 'E3-P4',
        nombre: { es: 'Access Hub', en: 'Access Hub' },
        pantallas: 1.05,
        mundo: 'sala',
        titular: { es: 'Campuslands Access Hub', en: 'Campuslands Access Hub' },
        lineas: {
          es: ['Mi primer software en producción', 'Usado en una hackatón real'],
          en: ['My first software in production', 'Used at a real hackathon'],
        },
        sello: { es: 'En producción', en: 'In production' },
      },
    ],
  },
  {
    id: 'E4',
    nombre: { es: 'Proyectos', en: 'Projects' },
    planos: [
      {
        id: 'E4-P0',
        nombre: { es: 'Tres proyectos', en: 'Three projects' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'Tres proyectos', en: 'Three projects' },
        lineas: {
          es: ['En cada uno, lo convencional y lo que hice yo.'],
          en: ['In each one, the conventional way and what I did instead.'],
        },
      },
      {
        id: 'E4-X1',
        nombre: { es: 'XEON · Claqueta', en: 'XEON · Slate' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'XEON', en: 'XEON' },
        lineas: {
          es: ['2026', 'Python · FastAPI · arquitectura hexagonal'],
          en: ['2026', 'Python · FastAPI · hexagonal architecture'],
        },
        sello: { es: 'Prototipo', en: 'Prototype' },
      },
      {
        id: 'E4-X2',
        nombre: { es: 'XEON · Díptico', en: 'XEON · Diptych' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'La IA interpreta. El backend decide.', en: 'AI interprets. The backend decides.' },
        lineas: {
          es: ['Lo convencional: que el chat responda el precio.'],
          en: ['The conventional way: let the chat answer the price.'],
        },
      },
      {
        id: 'E4-X3',
        nombre: { es: 'XEON · Inspección', en: 'XEON · Inspection' },
        pantallas: 1,
        mundo: 'sala',
        lineas: {
          es: ['Catálogo sintético de 2.000 productos', 'WhatsApp y terminal', 'Precios con Decimal', 'Límite: datos ficticios'],
          en: ['Synthetic catalog of 2,000 products', 'WhatsApp and terminal', 'Prices with Decimal', 'Limit: fictional data'],
        },
        enlaces: [repositorio('Xeon-agente-cotizaciones')],
      },
      {
        id: 'E4-T1',
        nombre: { es: 'Tool Rental · Claqueta', en: 'Tool Rental · Slate' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'Tool Rental', en: 'Tool Rental' },
        lineas: {
          es: ['Java 21 · Spring Boot · PostgreSQL'],
          en: ['Java 21 · Spring Boot · PostgreSQL'],
        },
        sello: { es: 'MVP local', en: 'Local MVP' },
      },
      {
        id: 'E4-T2',
        nombre: { es: 'Tool Rental · Díptico', en: 'Tool Rental · Diptych' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'Del catálogo a la devolución.', en: 'From catalog to return.' },
        lineas: {
          es: ['Lo convencional: un formulario suelto.'],
          en: ['The conventional way: a standalone form.'],
        },
      },
      {
        id: 'E4-T3',
        nombre: { es: 'Tool Rental · Inspección', en: 'Tool Rental · Inspection' },
        pantallas: 1,
        mundo: 'sala',
        lineas: {
          es: ['Arquitectura hexagonal y DDD', 'Seguridad por roles: proveedor, administrador y cliente'],
          en: ['Hexagonal architecture and DDD', 'Role-based security: provider, admin and customer'],
        },
        enlaces: [repositorio('Tool-rental-platform')],
      },
      {
        id: 'E4-R1',
        nombre: { es: 'ResumeLens · Claqueta', en: 'ResumeLens · Slate' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'ResumeLens', en: 'ResumeLens' },
        lineas: {
          es: ['Python · LangChain · Streamlit · Docker'],
          en: ['Python · LangChain · Streamlit · Docker'],
        },
      },
      {
        id: 'E4-R2',
        nombre: { es: 'ResumeLens · Díptico', en: 'ResumeLens · Diptych' },
        pantallas: 1,
        mundo: 'sala',
        titular: {
          es: 'El modelo valora la evidencia. Python calcula el porcentaje.',
          en: 'The model weighs the evidence. Python computes the score.',
        },
        lineas: {
          es: ['Lo convencional: pedirle una nota al modelo.'],
          en: ['The conventional way: ask the model for a grade.'],
        },
      },
      {
        id: 'E4-R3',
        nombre: { es: 'ResumeLens · Inspección', en: 'ResumeLens · Inspection' },
        pantallas: 1,
        mundo: 'sala',
        lineas: {
          es: ['25 pruebas aprobadas', '9 comprobaciones en navegador', 'Límite: evaluación con modelo real pendiente'],
          en: ['25 tests passing', '9 browser checks', 'Limit: evaluation with a real model still pending'],
        },
        enlaces: [repositorio('ResumeLens-cv')],
      },
    ],
  },
  {
    id: 'E5',
    nombre: { es: 'Detrás de cámaras', en: 'Behind the scenes' },
    planos: [
      {
        id: 'E5-P1',
        nombre: { es: 'El truco', en: 'The trick' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'Cada fotograma, una función.', en: 'Every frame, a function.' },
        lineas: { es: ['seek(t)'], en: ['seek(t)'] },
      },
      {
        id: 'E5-P2',
        nombre: { es: 'Las herramientas', en: 'The tools' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'Motion Studio · GoogleFlow Studio', en: 'Motion Studio · GoogleFlow Studio' },
        sello: { es: 'Licencia MIT', en: 'MIT license' },
        enlaces: [
          { etiqueta: { es: 'Motion Studio', en: 'Motion Studio' }, url: `${GITHUB}/motion-studio-design` },
          { etiqueta: { es: 'GoogleFlow Studio', en: 'GoogleFlow Studio' }, url: `${GITHUB}/googleflow-studio` },
        ],
      },
      {
        id: 'E5-P3',
        nombre: { es: 'Y Si Pixel', en: 'Y Si Pixel' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'Y Si Pixel', en: 'Y Si Pixel' },
        lineas: {
          es: ['Un niño, su perro y mucha ciencia en píxeles'],
          en: ['A kid, his dog and a lot of science in pixels'],
        },
        enlaces: [
          {
            etiqueta: { es: 'Ver el canal', en: 'Watch the channel' },
            url: 'https://www.youtube.com/@YSiPixelCiencia',
          },
        ],
      },
    ],
  },
  {
    id: 'E6',
    nombre: { es: 'Créditos y contacto', en: 'Credits and contact' },
    planos: [
      {
        id: 'E6-P1',
        nombre: { es: 'Créditos', en: 'Credits' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'Una película de Daniel Mayorga', en: 'A film by Daniel Mayorga' },
        lineas: {
          es: [
            'Reparto: Java, Spring Boot, Python, FastAPI, PostgreSQL, LangChain y Docker',
            'Avatar generado con IA a partir de una foto real',
            'Tipografías: Recursive y Shantell Sans',
          ],
          en: [
            'Cast: Java, Spring Boot, Python, FastAPI, PostgreSQL, LangChain and Docker',
            'Avatar generated with AI from a real photo',
            'Typefaces: Recursive and Shantell Sans',
          ],
        },
      },
      {
        id: 'E6-P2',
        nombre: { es: 'Contacto', en: 'Contact' },
        pantallas: 1,
        mundo: 'sala',
        titular: { es: 'Fin. ¿Rodamos la siguiente?', en: 'The end. Shall we shoot the next one?' },
        enlaces: [enlaceCorreo, enlaceLinkedin, enlaceGithub],
      },
    ],
  },
];
