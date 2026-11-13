// El motor de sonido. La música son tres pistas grabadas que se cruzan según la mezcla;
// los efectos sueltos (golpes, barridos, papel) se sintetizan aquí mismo con Web Audio.
// Este módulo solo se descarga cuando el visitante activa el sonido.

import descargaUrl from '../assets/sonido/descarga.mp3?url';
import resolucionUrl from '../assets/sonido/resolucion.mp3?url';
import tensionUrl from '../assets/sonido/tension.mp3?url';
import type { Golpe, Mezcla } from './mezcla.ts';

/** Las capas de música. Una capa sin pista queda en silencio y lo demás sigue sonando. */
type NombrePista = 'tension' | 'descarga' | 'resolucion';
// Tensión: suspenso con silencios y golpes graves. Descarga: el tema completo.
// Resolución: el mismo tema, lento y lejano, para cerrar.
// Se importan como archivos con huella: si cambia una pista, cambia su nombre y nadie oye la vieja.
const PISTAS: Partial<Record<NombrePista, string>> = {
  tension: tensionUrl,
  descarga: descargaUrl,
  resolucion: resolucionUrl,
};

/** Segundos que se solapan el final y el principio de una pista al repetirse. */
const SOLAPE = 2.4;

/** Azar repetible: el mismo número da siempre el mismo resultado entre 0 y 1. */
const azar = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface Soplo {
  tipo?: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
  pico: number;
  ataque?: number;
  caida: number;
}

interface Tono {
  onda?: OscillatorType;
  f0: number;
  f1?: number;
  /** Cuánto tarda en llegar de f0 a f1. Por defecto, lo que dura la caída. */
  barrido?: number;
  pico: number;
  ataque?: number;
  caida: number;
}

export interface Motor {
  /** Lleva cada capa al nivel que pide la mezcla. `enSeguida` salta sin transición. */
  fijarMezcla(mezcla: Mezcla, enSeguida?: boolean): void;
  /** Hace sonar un golpe suelto. */
  golpe(golpe: Golpe): void;
  /** Mantiene la música sonando: programa lo que cae antes del instante `hasta`. */
  programarHasta(hasta: number): void;
  encender(): void;
  apagar(): void;
}

export function crearMotor(ctx: AudioContext): Motor {
  // ——— Materia prima: ruido blanco y una reverberación generada ———
  const ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const muestras = ruido.getChannelData(0);
  for (let i = 0; i < muestras.length; i++) muestras[i] = azar(i) * 2 - 1;

  const largoSala = Math.floor(ctx.sampleRate * 2.4);
  const impulso = ctx.createBuffer(2, largoSala, ctx.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const datos = impulso.getChannelData(canal);
    let suave = 0;
    for (let i = 0; i < largoSala; i++) {
      const cola = (1 - i / largoSala) ** 2.4;
      suave += 0.3 * (azar(i * (canal + 1.37) + 9) * 2 - 1 - suave);
      datos[i] = suave * cola;
    }
  }

  // ——— Cadena de salida ———
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.connect(ctx.destination);

  // Un limitador suave al final: por fuerte que caiga un golpe, la salida nunca llega a recortar.
  const limitador = ctx.createWaveShaper();
  const techo = new Float32Array(2048);
  for (let i = 0; i < techo.length; i++) {
    const x = (i / (techo.length - 1)) * 2 - 1;
    techo[i] = (Math.tanh(x * 1.5) / Math.tanh(1.5)) * 0.88;
  }
  limitador.curve = techo;
  limitador.connect(salida);

  const maestro = ctx.createGain();
  maestro.gain.value = 0.9;
  maestro.connect(limitador);

  const reverberacion = ctx.createConvolver();
  reverberacion.buffer = impulso;
  const retorno = ctx.createGain();
  retorno.gain.value = 0;
  reverberacion.connect(retorno);
  retorno.connect(maestro);

  const crearBus = (nivel: number, envio = 0) => {
    const bus = ctx.createGain();
    bus.gain.value = nivel;
    bus.connect(maestro);
    if (envio > 0) {
      const mandar = ctx.createGain();
      mandar.gain.value = envio;
      bus.connect(mandar);
      mandar.connect(reverberacion);
    }
    return bus;
  };

  const busSala = crearBus(0);
  const busPapel = crearBus(0);
  const busGolpes = crearBus(1, 0.35);
  const busMusica: Record<NombrePista, GainNode> = {
    tension: crearBus(0),
    descarga: crearBus(0),
    resolucion: crearBus(0),
  };

  // ——— La música: pistas grabadas que se repiten solapando su final con su principio ———
  const grabaciones: Partial<Record<NombrePista, AudioBuffer>> = {};
  const proximo: Record<NombrePista, number> = { tension: 0, descarga: 0, resolucion: 0 };
  const sonando: Record<NombrePista, AudioBufferSourceNode[]> = { tension: [], descarga: [], resolucion: [] };

  for (const [nombre, ruta] of Object.entries(PISTAS) as [NombrePista, string][]) {
    fetch(ruta)
      .then((respuesta) => (respuesta.ok ? respuesta.arrayBuffer() : Promise.reject(new Error(String(respuesta.status)))))
      .then((datos) => ctx.decodeAudioData(datos))
      .then((buffer) => {
        grabaciones[nombre] = buffer;
      })
      .catch(() => {
        // Sin esa pista no hay esa capa. El resto del sonido funciona igual.
      });
  }

  /** Programa una pasada de la pista, con su entrada y su salida fundidas. */
  const lanzar = (nombre: NombrePista, cuando: number, conEntrada: boolean) => {
    const buffer = grabaciones[nombre];
    if (!buffer) return;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const g = ctx.createGain();
    const fin = cuando + buffer.duration;
    g.gain.setValueAtTime(conEntrada ? 0 : 1, cuando);
    if (conEntrada) g.gain.linearRampToValueAtTime(1, cuando + SOLAPE);
    g.gain.setValueAtTime(1, fin - SOLAPE);
    g.gain.linearRampToValueAtTime(0, fin);
    fuente.connect(g);
    g.connect(busMusica[nombre]);
    fuente.start(cuando);
    fuente.stop(fin + 0.05);
    sonando[nombre].push(fuente);
    fuente.onended = () => {
      sonando[nombre] = sonando[nombre].filter((otra) => otra !== fuente);
    };
    proximo[nombre] = fin - SOLAPE;
  };

  /** Vuelve a empezar una pista desde su primer compás: así la descarga entra con su golpe. */
  const reiniciar = (nombre: NombrePista) => {
    for (const fuente of sonando[nombre]) {
      try {
        fuente.stop(ctx.currentTime + 0.06);
      } catch {
        // Ya había terminado.
      }
    }
    sonando[nombre] = [];
    lanzar(nombre, ctx.currentTime + 0.03, false);
  };

  // ——— Piezas con las que se arma cada efecto ———
  const envolvente = (ganancia: AudioParam, t: number, pico: number, ataque: number, caida: number) => {
    ganancia.setValueAtTime(0.0001, t);
    ganancia.exponentialRampToValueAtTime(Math.max(pico, 0.0002), t + ataque);
    ganancia.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
  };

  const tono = (t: number, destino: AudioNode, o: Tono) => {
    const ataque = o.ataque ?? 0.004;
    const osc = ctx.createOscillator();
    osc.type = o.onda ?? 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(o.f1, t + (o.barrido ?? o.caida));
    const g = ctx.createGain();
    envolvente(g.gain, t, o.pico, ataque, o.caida);
    osc.connect(g);
    g.connect(destino);
    osc.start(t);
    osc.stop(t + ataque + o.caida + 0.05);
  };

  const soplo = (t: number, destino: AudioNode, o: Soplo) => {
    const ataque = o.ataque ?? 0.002;
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruido;
    fuente.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = o.tipo ?? 'bandpass';
    filtro.Q.value = o.q ?? 1;
    filtro.frequency.setValueAtTime(o.f0, t);
    if (o.f1 !== undefined) filtro.frequency.exponentialRampToValueAtTime(o.f1, t + ataque + o.caida);
    const g = ctx.createGain();
    envolvente(g.gain, t, o.pico, ataque, o.caida);
    fuente.connect(filtro);
    filtro.connect(g);
    g.connect(destino);
    fuente.start(t, azar(t * 91) * 1.5);
    fuente.stop(t + ataque + o.caida + 0.05);
  };

  /** Un fondo continuo de ruido filtrado. */
  const fondo = (tipo: BiquadFilterType, frecuencia: number, q: number, nivel: number, destino: AudioNode) => {
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruido;
    fuente.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = tipo;
    filtro.frequency.value = frecuencia;
    filtro.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = nivel;
    fuente.connect(filtro);
    filtro.connect(g);
    g.connect(destino);
    fuente.start();
    return { filtro, ganancia: g };
  };

  // Tono de sala: un fondo casi inaudible para que el silencio no sea vacío.
  fondo('lowpass', 260, 0.5, 0.04, busSala);
  // La subida de la ruptura: ruido que trepa con el scroll.
  const subida = fondo('bandpass', 300, 1.3, 0, busGolpes);

  // ——— Los golpes sueltos ———
  const sonarGolpe = (golpe: Golpe) => {
    const t = ctx.currentTime + 0.02 + (golpe.retraso ?? 0);
    switch (golpe.sonido) {
      case 'claqueta':
        soplo(t, busGolpes, { f0: 1700, q: 1.5, pico: 2.4, caida: 0.06 });
        tono(t, busGolpes, { onda: 'triangle', f0: 520, f1: 300, pico: 1.1, caida: 0.05 });
        soplo(t + 0.05, busGolpes, { f0: 1500, q: 1.5, pico: 0.8, caida: 0.04 });
        break;
      case 'rasgado':
        soplo(t, busGolpes, { f0: 900, f1: 3600, q: 0.8, pico: 0.42, ataque: 0.02, caida: 0.42 });
        for (let i = 0; i < 6; i++) {
          soplo(t + 0.03 + azar(i + 5) * 0.36, busGolpes, { tipo: 'highpass', f0: 3000, pico: 0.3, caida: 0.03 });
        }
        break;
      case 'golpe-grave':
        tono(t, busGolpes, { f0: 96, f1: 31, barrido: 0.9, pico: 0.8, caida: 1.7 });
        tono(t, busGolpes, { f0: 190, f1: 60, barrido: 0.25, pico: 0.45, caida: 0.5 });
        soplo(t, busGolpes, { tipo: 'lowpass', f0: 900, f1: 90, pico: 0.55, caida: 0.6 });
        break;
      case 'golpe-suave':
        tono(t, busGolpes, { f0: 124, f1: 72, barrido: 0.12, pico: 0.4, caida: 0.42 });
        soplo(t, busGolpes, { f0: 600, pico: 0.07, caida: 0.05 });
        break;
      case 'barrido':
        // El paso de una sección a otra: un soplo de aire que sube y se va.
        soplo(t, busGolpes, { f0: 420, f1: 2800, q: 1.2, pico: 0.34, ataque: 0.14, caida: 0.24 });
        break;
      case 'sello':
        tono(t, busGolpes, { f0: 150, f1: 58, barrido: 0.08, pico: 0.7, caida: 0.2 });
        soplo(t, busGolpes, { f0: 950, q: 1.2, pico: 0.4, caida: 0.035 });
        break;
      case 'tacha':
        soplo(t, busGolpes, { f0: 2600, f1: 3900, q: 2.5, pico: 0.3, ataque: 0.02, caida: 0.16 });
        soplo(t + 0.21, busGolpes, { f0: 3700, f1: 2400, q: 2.5, pico: 0.3, ataque: 0.02, caida: 0.18 });
        break;
      case 'tajo':
        // Un corte de aire que cae de agudo a grave, con un filo metálico.
        soplo(t, busGolpes, { f0: 5200, f1: 650, q: 2, pico: 0.55, ataque: 0.01, caida: 0.2 });
        tono(t, busGolpes, { onda: 'triangle', f0: 2100, f1: 1300, pico: 0.12, caida: 0.22 });
        break;
      case 'trama':
        // Una prensa de imprenta: golpecitos secos que se aceleran y un asiento final.
        for (const [i, d] of [0, 0.07, 0.125, 0.17, 0.205, 0.235].entries()) {
          soplo(t + d, busGolpes, { f0: 1400 + i * 250, q: 3, pico: 0.35, caida: 0.018 });
        }
        tono(t + 0.26, busGolpes, { f0: 140, f1: 70, pico: 0.4, caida: 0.16 });
        break;
      case 'glitch': {
        // Una señal que se rompe: ráfagas cuadradas a alturas al azar, con huecos.
        let d = 0;
        for (let i = 0; i < 9; i++) {
          const f = 260 + azar(t * 13 + i) * 1800;
          tono(t + d, busGolpes, { onda: 'square', f0: f, f1: f * (0.6 + azar(i + t) * 0.8), pico: 0.09, ataque: 0.002, caida: 0.025 });
          if (i % 3 === 0) soplo(t + d, busGolpes, { tipo: 'highpass', f0: 5000, pico: 0.25, caida: 0.012 });
          d += 0.03 + azar(i * 7 + t) * 0.03;
        }
        break;
      }
      case 'papel':
        // Una viñeta que se desliza sobre otra.
        soplo(t, busGolpes, { f0: 700, f1: 2600, q: 0.9, pico: 0.3, ataque: 0.12, caida: 0.2 });
        soplo(t + 0.27, busGolpes, { f0: 1800, q: 2, pico: 0.25, caida: 0.03 });
        break;
      case 'impacto':
        // Un estallido de cómic: golpe grave, chasquido y cola.
        tono(t, busGolpes, { f0: 130, f1: 38, barrido: 0.25, pico: 0.9, caida: 0.7 });
        soplo(t, busGolpes, { tipo: 'highpass', f0: 2500, pico: 0.7, caida: 0.02 });
        soplo(t, busGolpes, { tipo: 'lowpass', f0: 1400, f1: 120, pico: 0.55, caida: 0.5 });
        break;
      case 'iris':
        // Una ola que se abre.
        soplo(t, busGolpes, { f0: 220, f1: 1500, q: 1.2, pico: 0.4, ataque: 0.3, caida: 0.18 });
        break;
      case 'zoom':
        // La cámara pasa de largo: el aire sube y vuelve a bajar.
        soplo(t, busGolpes, { f0: 400, f1: 3400, q: 1.4, pico: 0.38, ataque: 0.16, caida: 0.12 });
        soplo(t + 0.24, busGolpes, { f0: 3000, f1: 380, q: 1.4, pico: 0.3, ataque: 0.02, caida: 0.3 });
        break;
      case 'rebobinado':
        // Un disco que se rebobina a mano: la aguja va y viene, cada vez más rápido.
        for (const [i, [d, dur, sube]] of ([[0, 0.14, true], [0.15, 0.1, false], [0.26, 0.08, true], [0.35, 0.06, false], [0.42, 0.05, true]] as const).entries()) {
          const [a, b] = sube ? [500, 2600] : [2600, 420];
          soplo(t + d, busGolpes, { f0: a, f1: b, q: 5, pico: 0.42, ataque: 0.01, caida: dur });
          tono(t + d, busGolpes, { onda: 'sawtooth', f0: a / 4, f1: b / 4, pico: 0.08 + i * 0.01, ataque: 0.005, caida: dur });
        }
        break;
      case 'tic':
        // Cambiar de capa: un clic de mesa de luz.
        soplo(t, busGolpes, { tipo: 'highpass', f0: 3800, pico: 0.3, caida: 0.014 });
        tono(t, busGolpes, { onda: 'triangle', f0: 1500, f1: 1100, pico: 0.12, caida: 0.03 });
        break;
    }
  };

  let objetivo: Mezcla | undefined;
  let tic = 0;

  const llevar = (parametro: AudioParam, valor: number, tau: number, enSeguida: boolean) => {
    const ahora = ctx.currentTime;
    if (enSeguida) {
      parametro.cancelScheduledValues(ahora);
      parametro.setValueAtTime(valor, ahora);
    } else {
      parametro.setTargetAtTime(valor, ahora, tau);
    }
  };

  return {
    fijarMezcla(mezcla, enSeguida = false) {
      // Una capa que entra desde el silencio empieza por su primer compás.
      if (objetivo) {
        if (mezcla.descarga > 0.001 && objetivo.descarga <= 0.001) reiniciar('descarga');
        if (mezcla.resolucion > 0.001 && objetivo.resolucion <= 0.001) reiniciar('resolucion');
      }
      objetivo = mezcla;

      llevar(busSala.gain, mezcla.sala, 0.3, enSeguida);
      llevar(busPapel.gain, mezcla.papel, 0.2, enSeguida);
      // La tensión cede cuando entra la descarga, y ante la resolución si esa pista existe, para que no se pisen.
      const cedeResolucion = grabaciones.resolucion ? 1 - 0.85 * mezcla.resolucion : 1;
      llevar(busMusica.tension.gain, mezcla.tension * (1 - 0.85 * mezcla.descarga) * cedeResolucion, 0.6, enSeguida);
      llevar(busMusica.descarga.gain, mezcla.descarga, mezcla.descarga > 0.5 ? 0.05 : 0.5, enSeguida);
      llevar(busMusica.resolucion.gain, mezcla.resolucion * 0.85, 0.8, enSeguida);
      llevar(retorno.gain, mezcla.reverb * 0.5, 0.3, enSeguida);

      const sube = mezcla.subida;
      llevar(subida.ganancia.gain, sube * sube * 0.32, 0.04, enSeguida);
      llevar(subida.filtro.frequency, 300 * 2 ** (sube * 4), 0.04, enSeguida);
    },

    golpe: sonarGolpe,

    programarHasta(hasta) {
      if (!objetivo) return;
      // La tensión suena siempre de fondo; las otras dos solo mientras su capa está abierta.
      const activas: NombrePista[] = ['tension'];
      if (objetivo.descarga > 0.001) activas.push('descarga');
      if (objetivo.resolucion > 0.001) activas.push('resolucion');
      for (const nombre of activas) {
        if (!grabaciones[nombre]) continue;
        if (proximo[nombre] < ctx.currentTime - 0.5) proximo[nombre] = ctx.currentTime + 0.05;
        if (proximo[nombre] < hasta + 0.5) lanzar(nombre, proximo[nombre], true);
      }

      // Papel: de vez en cuando, un trazo de lápiz. Seco y cercano.
      tic += 1;
      if (objetivo.papel > 0.01 && tic % 7 === 0 && azar(tic) < 0.1) {
        const agudo = 2400 + azar(tic + 3) * 2400;
        soplo(ctx.currentTime + 0.02, busPapel, {
          f0: agudo,
          f1: agudo * (0.7 + azar(tic + 7) * 0.7),
          q: 2.2,
          pico: 0.12,
          ataque: 0.02,
          caida: 0.09 + azar(tic + 11) * 0.16,
        });
      }
    },

    encender() {
      salida.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
    },

    apagar() {
      salida.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    },
  };
}
