// El motor en el navegador: convierte el scroll en un instante t y pinta ese instante.
// seek(t) deja la película en el estado exacto de t, venga de donde venga.

import { ESCENAS } from '../datos/pelicula.ts';
import { codigoDeTiempo, construirIndice, inicioDe, limitar, localizar, reposoDe, type Entrada } from './tiempo.ts';

declare global {
  interface Window {
    seek: (t: number) => void;
    pelicula: { total: number; planos: string[]; t: () => number };
  }
}

const indice = construirIndice(ESCENAS);
const raiz = document.documentElement;
const secciones = new Map<string, HTMLElement>();
for (const el of document.querySelectorAll<HTMLElement>('[data-plano]')) {
  if (el.dataset.plano) secciones.set(el.dataset.plano, el);
}

const codigo = document.querySelector<HTMLElement>('[data-codigo]');
const enlacesIdioma = [...document.querySelectorAll<HTMLAnchorElement>('a[data-idioma]')];
const baseIdioma = enlacesIdioma[0]?.getAttribute('href') ?? '';
// La línea de tiempo nace con la ruptura: aparece al entrar en la escena 2.
const nacimiento = inicioDe(indice, 'E2-P1') ?? 0;

let activo: Entrada | undefined;
let pendiente = false;
let tPintado = 0;
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

/** Pinta el estado de la película en el instante t. No mueve el scroll. */
function pintar(t: number): void {
  const instante = limitar(indice, t);
  const { entrada, progreso } = localizar(indice, instante);

  if (entrada !== activo) {
    if (activo) seccionDe(activo).classList.remove('es-activo');
    seccionDe(entrada).classList.add('es-activo');
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

  seccionDe(entrada).style.setProperty('--p', progreso.toFixed(4));
  raiz.style.setProperty('--t', (instante / indice.total).toFixed(5));
  raiz.dataset.linea = instante >= nacimiento ? 'viva' : 'oculta';
  if (codigo) codigo.textContent = codigoDeTiempo(instante);
  tPintado = instante;
}

function seek(t: number): void {
  const instante = limitar(indice, t);
  const { entrada, progreso } = localizar(indice, instante);
  const el = seccionDe(entrada);
  window.scrollTo({ top: el.offsetTop + progreso * el.offsetHeight, behavior: 'instant' });
  ancla = { t: instante, y: window.scrollY };
  pintar(instante);
}

function alDesplazar(): void {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => {
    pendiente = false;
    if (ancla && Math.abs(window.scrollY - ancla.y) < 1) {
      pintar(ancla.t);
      return;
    }
    ancla = undefined;
    pintar(tDelScroll());
  });
}

/** Salta a un plano y cae donde su composición ya está formada, no en su primer fotograma. */
function irAPlano(id: string): void {
  const reposo = reposoDe(indice, id);
  if (reposo !== undefined) seek(reposo);
}

function alPulsarTecla(evento: KeyboardEvent): void {
  if (evento.altKey || evento.ctrlKey || evento.metaKey) return;
  const destino = evento.target;
  if (destino instanceof HTMLElement && destino.closest('input, textarea, select, [contenteditable]')) return;
  if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
  const actual = activo?.indice ?? 0;
  const siguiente = indice.entradas[actual + (evento.key === 'ArrowRight' ? 1 : -1)];
  if (!siguiente) return;
  evento.preventDefault();
  irAPlano(siguiente.plano.id);
}

raiz.classList.add('con-motor');

for (const enlace of document.querySelectorAll<HTMLAnchorElement>('a[data-ir]')) {
  enlace.addEventListener('click', (evento) => {
    const id = enlace.dataset.ir;
    if (!id) return;
    evento.preventDefault();
    irAPlano(id);
  });
}

// Los planos inactivos siguen en la página para lectores de pantalla y teclado:
// si el foco entra en uno, la película salta a él.
document.addEventListener('focusin', (evento) => {
  if (!(evento.target instanceof HTMLElement)) return;
  const id = evento.target.closest<HTMLElement>('[data-plano]')?.dataset.plano;
  if (id && id !== activo?.plano.id) irAPlano(id);
});

window.addEventListener('scroll', alDesplazar, { passive: true });
// Al cambiar el tamaño de la ventana cambian las alturas: la película conserva su instante.
window.addEventListener('resize', () => seek(tPintado));
window.addEventListener('keydown', alPulsarTecla);

window.seek = seek;
window.pelicula = {
  total: indice.total,
  planos: indice.entradas.map((e) => e.plano.id),
  t: () => tPintado,
};

const inicial = reposoDe(indice, decodeURIComponent(location.hash.slice(1)));

if (inicial !== undefined) seek(inicial);
else pintar(tDelScroll());
