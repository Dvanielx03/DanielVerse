// El motor en el navegador: convierte el scroll en un instante t y pinta ese instante.
// seek(t) deja la experiencia en el estado exacto de t, venga de donde venga.
// El scroll no se pinta tal cual: el instante pintado persigue al del scroll con inercia,
// y de esa persecución sale la velocidad con la que reacciona todo lo demás.

import { ESCENAS } from '../datos/pelicula.ts';
import { DURACION_TRANSICION } from '../datos/transiciones.ts';
import { alInstante, alternarSonido } from './sonido.ts';
import { construirIndice, inicioDe, limitar, localizar, reposoDe, type Entrada } from './tiempo.ts';

declare global {
  interface Window {
    seek: (t: number) => void;
    pelicula: { total: number; planos: string[]; t: () => number };
  }
}

/** Cuánto tarda el instante pintado en alcanzar al del scroll, en segundos. */
const INERCIA = 0.13;
/** Pantallas por segundo que cuentan como ir a toda velocidad. */
const VELOCIDAD_MAXIMA = 2.6;

const indice = construirIndice(ESCENAS);
const raiz = document.documentElement;
const secciones = new Map<string, HTMLElement>();
for (const el of document.querySelectorAll<HTMLElement>('[data-plano]')) {
  if (el.dataset.plano) secciones.set(el.dataset.plano, el);
}

const enlacesIdioma = [...document.querySelectorAll<HTMLAnchorElement>('a[data-idioma]')];
const baseIdioma = enlacesIdioma[0]?.getAttribute('href') ?? '';
// La barra de escenas nace con la ruptura: aparece al entrar en la escena 2.
const nacimiento = inicioDe(indice, 'E2-P1') ?? 0;
const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');

let activo: Entrada | undefined;
let saliente: Entrada | undefined;
/** El instante que pide el scroll y el que está pintado. */
let tObjetivo = 0;
let tPintado = 0;
let velocidad = 0;
let cuadro: number | undefined;
let ultimoCuadro = 0;
// El scroll se redondea a píxeles enteros. Tras un seek(t) se recuerda el instante exacto
// para que el evento de scroll que provoca no lo sustituya por uno aproximado.
let ancla: { t: number; y: number } | undefined;

function seccionDe(entrada: Entrada): HTMLElement {
  const el = secciones.get(entrada.plano.id);
  if (!el) throw new Error(`Falta en la página el plano ${entrada.plano.id}`);
  return el;
}

/** El instante que corresponde a la posición actual del scroll. */
function tDelScroll(): number {
  const y = window.scrollY;
  let entrada = indice.entradas[0]!;
  for (const candidata of indice.entradas) {
    if (seccionDe(candidata).offsetTop <= y + 1) entrada = candidata;
    else break;
  }
  const el = seccionDe(entrada);
  const avance = Math.min(1, Math.max(0, (y - el.offsetTop) / el.offsetHeight));
  return entrada.inicio + avance * entrada.plano.pantallas;
}

function soltarSaliente(): void {
  if (!saliente) return;
  const el = seccionDe(saliente);
  el.classList.remove('es-saliente');
  delete el.dataset.sale;
  saliente = undefined;
}

/** Pinta el estado de la experiencia en el instante t. No mueve el scroll. */
function pintar(t: number): void {
  const instante = limitar(indice, t);
  const { entrada, progreso } = localizar(indice, instante);
  const seccion = seccionDe(entrada);

  if (entrada !== activo) {
    if (activo) seccionDe(activo).classList.remove('es-activo', 'en-transicion');
    seccion.classList.add('es-activo');
    activo = entrada;
    raiz.dataset.planoActivo = entrada.plano.id;
    raiz.dataset.escenaActiva = entrada.escena.id;
    raiz.dataset.mundo = entrada.plano.mundo;
    for (const marcador of document.querySelectorAll<HTMLElement>('[data-escena-marcador]')) {
      if (marcador.dataset.escenaMarcador === entrada.escena.id) marcador.setAttribute('aria-current', 'true');
      else marcador.removeAttribute('aria-current');
    }
    for (const enlace of enlacesIdioma) enlace.href = `${baseIdioma}#${entrada.plano.id}`;
    history.replaceState(null, '', `#${entrada.plano.id}`);
  }

  seccion.style.setProperty('--p', progreso.toFixed(4));

  // La entrada: durante el primer tramo de su scroll, la sección llega por encima de la anterior,
  // que sigue a la vista, quieta en su último instante.
  const tipo = seccion.dataset.transicion ?? 'corte';
  const previa = indice.entradas[entrada.indice - 1];
  const entra = tipo === 'corte' || !previa ? 1 : Math.min(1, (progreso * entrada.plano.pantallas) / DURACION_TRANSICION);

  if (entra < 1 && previa) {
    if (saliente !== previa) {
      soltarSaliente();
      saliente = previa;
    }
    const anterior = seccionDe(previa);
    anterior.classList.add('es-saliente');
    anterior.dataset.sale = tipo;
    anterior.style.setProperty('--p', '1');
    anterior.style.setProperty('--sale', entra.toFixed(4));
    anterior.style.setProperty('--hacia', seccion.dataset.lado ?? '1');
    seccion.classList.add('en-transicion');
    seccion.style.setProperty('--entra', entra.toFixed(4));
  } else {
    soltarSaliente();
    seccion.classList.remove('en-transicion');
    seccion.style.setProperty('--entra', '1');
  }

  raiz.style.setProperty('--t', (instante / indice.total).toFixed(5));
  raiz.dataset.linea = instante >= nacimiento ? 'viva' : 'oculta';
  tPintado = instante;
  alInstante(entrada, progreso);
}

function fijarVelocidad(v: number): void {
  velocidad = v;
  raiz.style.setProperty('--v', v.toFixed(3));
  raiz.style.setProperty('--va', Math.abs(v).toFixed(3));
}

/** Un fotograma de la persecución: el instante pintado se acerca al del scroll. */
function perseguir(ahora: number): void {
  const dt = Math.min(0.05, Math.max(0.001, (ahora - ultimoCuadro) / 1000));
  ultimoCuadro = ahora;

  const antes = tPintado;
  let siguiente = tPintado + (tObjetivo - tPintado) * (1 - Math.exp(-dt / INERCIA));
  if (Math.abs(tObjetivo - siguiente) < 0.0004) siguiente = tObjetivo;
  pintar(siguiente);

  const bruta = Math.max(-1, Math.min(1, (tPintado - antes) / dt / VELOCIDAD_MAXIMA));
  fijarVelocidad(velocidad + (bruta - velocidad) * 0.22);

  if (tPintado !== tObjetivo || Math.abs(velocidad) > 0.004) {
    cuadro = requestAnimationFrame(perseguir);
  } else {
    cuadro = undefined;
    fijarVelocidad(0);
  }
}

function arrancar(): void {
  if (cuadro !== undefined) return;
  ultimoCuadro = performance.now();
  cuadro = requestAnimationFrame(perseguir);
}

/** Salta a un instante sin inercia: el scroll y lo pintado quedan en t. */
function seek(t: number): void {
  const instante = limitar(indice, t);
  const { entrada, progreso } = localizar(indice, instante);
  const el = seccionDe(entrada);
  window.scrollTo({ top: el.offsetTop + progreso * el.offsetHeight, behavior: 'instant' });
  ancla = { t: instante, y: window.scrollY };
  tObjetivo = instante;
  if (cuadro !== undefined) cancelAnimationFrame(cuadro);
  cuadro = undefined;
  fijarVelocidad(0);
  pintar(instante);
}

function alDesplazar(): void {
  if (ancla && Math.abs(window.scrollY - ancla.y) < 1) {
    tObjetivo = ancla.t;
  } else {
    ancla = undefined;
    tObjetivo = tDelScroll();
  }
  // Con movimiento reducido no hay inercia: se pinta lo que diga el scroll.
  if (movimientoReducido.matches) pintar(tObjetivo);
  else arrancar();
}

/** Salta a un plano y cae donde su composición ya está formada, no en su primer fotograma. */
function irAPlano(id: string): void {
  const reposo = reposoDe(indice, id);
  if (reposo !== undefined) seek(reposo);
}

const botonesDeSonido = [...document.querySelectorAll<HTMLButtonElement>('button[data-sonido]')];

/** Enciende o apaga el sonido y deja los botones diciendo la verdad. */
async function cambiarSonido(): Promise<void> {
  const encendido = await alternarSonido();
  raiz.dataset.sonido = encendido ? 'si' : 'no';
  for (const boton of botonesDeSonido) boton.setAttribute('aria-pressed', String(encendido));
}

function alPulsarTecla(evento: KeyboardEvent): void {
  if (evento.altKey || evento.ctrlKey || evento.metaKey) return;
  const destino = evento.target;
  if (destino instanceof HTMLElement && destino.closest('input, textarea, select, [contenteditable]')) return;
  if (evento.key === 's' || evento.key === 'S') {
    evento.preventDefault();
    void cambiarSonido();
    return;
  }
  if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
  const actual = activo?.indice ?? 0;
  const siguiente = indice.entradas[actual + (evento.key === 'ArrowRight' ? 1 : -1)];
  if (!siguiente) return;
  evento.preventDefault();
  irAPlano(siguiente.plano.id);
}

raiz.classList.add('con-motor');
raiz.dataset.sonido = 'no';

for (const enlace of document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')) {
  enlace.target = '_blank';
  enlace.rel = 'noopener noreferrer';
}

for (const boton of botonesDeSonido) boton.addEventListener('click', () => void cambiarSonido());

for (const enlace of document.querySelectorAll<HTMLAnchorElement>('a[data-ir]')) {
  enlace.addEventListener('click', (evento) => {
    const id = enlace.dataset.ir;
    if (!id) return;
    evento.preventDefault();
    irAPlano(id);
  });
}

// Los planos inactivos siguen en la página para lectores de pantalla y teclado:
// si el foco entra en uno, la experiencia salta a él.
document.addEventListener('focusin', (evento) => {
  if (!(evento.target instanceof HTMLElement)) return;
  const id = evento.target.closest<HTMLElement>('[data-plano]')?.dataset.plano;
  if (id && id !== activo?.plano.id) irAPlano(id);
});

// El cursor es una linterna: el fondo y las piezas flotantes reaccionan a dónde está.
let punteroPendiente = false;
window.addEventListener(
  'pointermove',
  (evento) => {
    if (evento.pointerType === 'touch' || punteroPendiente) return;
    punteroPendiente = true;
    const x = evento.clientX / window.innerWidth;
    const y = evento.clientY / window.innerHeight;
    requestAnimationFrame(() => {
      punteroPendiente = false;
      raiz.style.setProperty('--mx', x.toFixed(4));
      raiz.style.setProperty('--my', y.toFixed(4));
    });
  },
  { passive: true },
);

window.addEventListener('scroll', alDesplazar, { passive: true });
// Al cambiar el tamaño de la ventana cambian las alturas: la experiencia conserva su instante.
window.addEventListener('resize', () => seek(tObjetivo));
window.addEventListener('keydown', alPulsarTecla);

window.seek = seek;
window.pelicula = {
  total: indice.total,
  planos: indice.entradas.map((e) => e.plano.id),
  t: () => tPintado,
};

const inicial = reposoDe(indice, decodeURIComponent(location.hash.slice(1)));
// El navegador no debe recolocar el scroll por su cuenta: la posición la decide la experiencia.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (inicial !== undefined) {
  seek(inicial);
  // Al terminar de cargar, el navegador salta al ancla del enlace; se vuelve al punto de reposo.
  window.addEventListener('load', () => seek(inicial), { once: true });
} else {
  tObjetivo = tDelScroll();
  pintar(tObjetivo);
}
