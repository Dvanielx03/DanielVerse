// El motor de síntesis de «Tensión y descarga». Todo el sonido se genera en el navegador con
// Web Audio: no hay archivos de audio. Este módulo solo se descarga cuando el visitante activa el sonido.
// Sirve igual para sonar en directo (AudioContext) que para medir un tramo (OfflineAudioContext).

import type { Golpe, Mezcla, Timbre } from './mezcla.ts';

export const BPM = 90;
/** Una semicorchea: 167 ms, dos fotogramas de la película. */
export const PASO = 60 / BPM / 4;
/** El patrón de la descarga dura dos compases. */
const PASOS = 32;

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/** Azar repetible: el mismo paso da siempre el mismo número entre 0 y 1. */
const azar = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// La descarga, en fa menor. x = fuerte, o = suave, r = redoble, . = silencio.
const BOMBO = 'x.....o...x.....x..o......x.....';
const CAJA = '....x.......x.......x.......x..o';
const PLATO = 'x.xxo.xxx.xxo.xrx.xxo.xxx.xxoxrr';
/** Bajo: paso → [nota MIDI, duración en pasos]. Sigue al bombo. */
const BAJO: Record<number, [number, number]> = {
  0: [29, 5],
  6: [29, 3],
  10: [32, 5],
  16: [29, 3],
  19: [36, 5],
  26: [34, 3],
  30: [32, 2],
};
/** Un ostinato en corcheas, corto y apagado, que mantiene la amenaza entre golpe y golpe. */
const OSTINATO = [53, 53, 56, 53, 60, 53, 56, 51, 53, 53, 56, 53, 61, 60, 56, 51];
/** Golpes de acorde, oscuros y cortos. */
const ACORDES: Record<number, number[]> = {
  0: [41, 48, 56],
  19: [37, 49, 56],
  26: [39, 46, 55],
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
  /** Programa los pasos del reloj musical que caen antes del instante `hasta`. */
  programarHasta(hasta: number): void;
  encender(): void;
  apagar(): void;
}

export function crearMotor(ctx: BaseAudioContext): Motor {
  // ——— Materia prima: ruido blanco y una reverberación generada ———
  const ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const muestras = ruido.getChannelData(0);
  for (let i = 0; i < muestras.length; i++) muestras[i] = azar(i) * 2 - 1;

  const largoSala = Math.floor(ctx.sampleRate * 2.8);
  const impulso = ctx.createBuffer(2, largoSala, ctx.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const datos = impulso.getChannelData(canal);
    let suave = 0;
    for (let i = 0; i < largoSala; i++) {
      const cola = (1 - i / largoSala) ** 2.4;
      // Un filtro de un polo oscurece la cola: una sala grande y apagada, no una iglesia.
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
    techo[i] = (Math.tanh(x * 1.6) / Math.tanh(1.6)) * 0.86;
  }
  limitador.curve = techo;
  limitador.connect(salida);

  const compresor = ctx.createDynamicsCompressor();
  compresor.threshold.value = -18;
  compresor.knee.value = 8;
  compresor.ratio.value = 5;
  compresor.attack.value = 0.003;
  compresor.release.value = 0.2;
  compresor.connect(limitador);

  const maestro = ctx.createGain();
  maestro.gain.value = 0.8;
  maestro.connect(compresor);

  const reverberacion = ctx.createConvolver();
  reverberacion.buffer = impulso;
  const retorno = ctx.createGain();
  retorno.gain.value = 0;
  reverberacion.connect(retorno);
  retorno.connect(maestro);

  /** Una capa: su nivel lo decide la mezcla; `envio` es cuánto manda a la reverberación. */
  const capa = (envio: number) => {
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(maestro);
    if (envio > 0) {
      const mandar = ctx.createGain();
      mandar.gain.value = envio;
      bus.connect(mandar);
      mandar.connect(reverberacion);
    }
    return bus;
  };

  const busSala = capa(0);
  const busPapel = capa(0);
  const busTension = capa(0.55);
  const busDescarga = capa(0.06);
  const busResolucion = capa(0.7);
  const busGolpes = capa(0.4);
  busGolpes.gain.value = 1;
  /** Envío extra para lo que debe sonar en la sala: la caja y los acordes. */
  const aLaSala = ctx.createGain();
  aLaSala.gain.value = 0.3;
  aLaSala.connect(reverberacion);

  // El bajo pasa por una saturación: gana armónicos y se oye también en altavoces pequeños.
  const saturador = ctx.createWaveShaper();
  const curva = new Float32Array(1024);
  for (let i = 0; i < curva.length; i++) curva[i] = Math.tanh(((i / (curva.length - 1)) * 2 - 1) * 2.8);
  saturador.curve = curva;
  const filtroBajo = ctx.createBiquadFilter();
  filtroBajo.type = 'lowpass';
  filtroBajo.frequency.value = 720;
  // Tras saturar, el bajo se baja: debe pesar, no tapar la percusión.
  const nivelBajo = ctx.createGain();
  nivelBajo.gain.value = 0.24;
  saturador.connect(filtroBajo);
  filtroBajo.connect(nivelBajo);
  nivelBajo.connect(busDescarga);

  const filtroOstinato = ctx.createBiquadFilter();
  filtroOstinato.type = 'lowpass';
  filtroOstinato.frequency.value = 900;
  filtroOstinato.Q.value = 1.5;
  filtroOstinato.connect(busDescarga);
  filtroOstinato.connect(aLaSala);

  // ——— Piezas con las que se arma cada sonido ———
  const envolvente = (ganancia: AudioParam, t: number, pico: number, ataque: number, caida: number) => {
    ganancia.setValueAtTime(0.0001, t);
    ganancia.exponentialRampToValueAtTime(Math.max(pico, 0.0002), t + ataque);
    ganancia.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
  };

  /** Un oscilador con su envolvente y, si se pide, una caída de tono. */
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

  /** Una ráfaga de ruido filtrado: la base de platos, cajas, lápices y papel. */
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

  /** Una fuente continua de ruido filtrado, para los fondos. */
  const fondoDeRuido = (tipo: BiquadFilterType, frecuencia: number, q: number, nivel: number, destino: AudioNode) => {
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

  const oscilador = (onda: OscillatorType, frecuencia: number, nivel: number, destino: AudioNode, desafino = 0) => {
    const osc = ctx.createOscillator();
    osc.type = onda;
    osc.frequency.value = frecuencia;
    osc.detune.value = desafino;
    const g = ctx.createGain();
    g.gain.value = nivel;
    osc.connect(g);
    g.connect(destino);
    osc.start();
    return { osc, ganancia: g };
  };

  /** Un vaivén lento que mueve un parámetro: lo que hace respirar a los fondos. */
  const vaiven = (frecuencia: number, amplitud: number, parametro: AudioParam) => {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = frecuencia;
    const g = ctx.createGain();
    g.gain.value = amplitud;
    lfo.connect(g);
    g.connect(parametro);
    lfo.start();
  };

  // ——— Fondos que suenan siempre; la mezcla decide cuánto de cada uno ———
  // Tono de sala.
  fondoDeRuido('lowpass', 260, 0.5, 0.05, busSala);

  // Tensión: casi vacía. Un zumbido oscuro en los medios graves, aire y dos notas agudas que rozan.
  // El grave de verdad se guarda para la descarga: el contraste hace el trabajo.
  const filtroZumbido = ctx.createBiquadFilter();
  filtroZumbido.type = 'lowpass';
  filtroZumbido.frequency.value = 380;
  filtroZumbido.Q.value = 2;
  filtroZumbido.connect(busTension);
  oscilador('sawtooth', hz(53), 0.022, filtroZumbido, -9);
  oscilador('sawtooth', hz(53), 0.022, filtroZumbido, 10);
  vaiven(0.06, 120, filtroZumbido.frequency);
  oscilador('sine', hz(41), 0.006, busTension);
  // Fa menor apenas insinuado, que respira despacio.
  const tercera = oscilador('triangle', hz(56), 0.012, busTension, 4);
  vaiven(0.09, 0.008, tercera.ganancia.gain);
  oscilador('triangle', hz(60), 0.008, busTension, -6);
  const aire = fondoDeRuido('bandpass', 520, 0.7, 0.028, busTension);
  vaiven(0.11, 0.016, aire.ganancia.gain);
  const roce = oscilador('sine', hz(87), 0.005, busTension);
  vaiven(0.19, 0.004, roce.ganancia.gain);
  oscilador('sine', hz(88), 0.004, busTension);

  // Resolución: un acorde cálido de re bemol con séptima mayor.
  const filtroAcorde = ctx.createBiquadFilter();
  filtroAcorde.type = 'lowpass';
  filtroAcorde.frequency.value = 1300;
  filtroAcorde.connect(busResolucion);
  for (const nota of [49, 53, 56, 60]) {
    oscilador('triangle', hz(nota), 0.026, filtroAcorde, -5);
    oscilador('triangle', hz(nota), 0.026, filtroAcorde, 6);
  }
  oscilador('sine', hz(37), 0.035, busResolucion);
  vaiven(0.13, 260, filtroAcorde.frequency);

  // La subida de la ruptura: ruido y una sierra que trepan con el scroll.
  const gananciaSubida = ctx.createGain();
  gananciaSubida.gain.value = 0;
  gananciaSubida.connect(busGolpes);
  const ruidoSubida = fondoDeRuido('bandpass', 300, 1.3, 1, gananciaSubida);
  const sierraSubida = oscilador('sawtooth', 60, 0.2, gananciaSubida);

  // ——— La llamada: dos notas que caen, con el timbre de un lápiz rascando ———
  const notaDeLlamada = (t: number, dura: number, f0: number, f1: number, nivel: number, destino: AudioNode) => {
    // El ruido pasa por un filtro muy resonante que cae de tono; una sierra fina le da afinación.
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruido;
    fuente.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 24;
    filtro.frequency.setValueAtTime(f0, t);
    filtro.frequency.exponentialRampToValueAtTime(f1, t + dura * 0.85);
    const rascado = ctx.createGain();
    rascado.gain.value = 7;
    const sierra = ctx.createOscillator();
    sierra.type = 'sawtooth';
    sierra.frequency.setValueAtTime(f0, t);
    sierra.frequency.exponentialRampToValueAtTime(f1, t + dura * 0.85);
    const fina = ctx.createGain();
    fina.gain.value = 0.16;
    // La aspereza: el volumen tiembla 53 veces por segundo, como la mina saltando sobre el papel.
    const aspereza = ctx.createGain();
    aspereza.gain.value = 0.62;
    const temblor = ctx.createOscillator();
    temblor.type = 'square';
    temblor.frequency.value = 53;
    const hondo = ctx.createGain();
    hondo.gain.value = 0.38;
    temblor.connect(hondo);
    hondo.connect(aspereza.gain);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(nivel, t + 0.04);
    g.gain.setValueAtTime(nivel, t + dura * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dura);
    fuente.connect(filtro);
    filtro.connect(rascado);
    rascado.connect(aspereza);
    sierra.connect(fina);
    fina.connect(aspereza);
    aspereza.connect(g);
    g.connect(destino);
    for (const nodo of [fuente, sierra, temblor]) {
      nodo.start(t);
      nodo.stop(t + dura + 0.05);
    }
  };

  const llamada = (t: number, destino: AudioNode, o: { lejos?: boolean; semitonos?: number; resuelta?: boolean } = {}) => {
    const k = 2 ** ((o.semitonos ?? 0) / 12);
    let llegada = destino;
    let nivel = 0.3;
    if (o.lejos) {
      // De lejos: más oscura y más baja.
      const lejania = ctx.createBiquadFilter();
      lejania.type = 'lowpass';
      lejania.frequency.value = 1500;
      lejania.connect(destino);
      llegada = lejania;
      nivel = 0.11;
    }
    notaDeLlamada(t, 0.42, hz(82) * k, hz(81) * k, nivel, llegada);
    // En los créditos la segunda nota no cae: se queda.
    notaDeLlamada(t + 0.46, o.resuelta ? 1.3 : 1, hz(77) * k, hz(o.resuelta ? 77 : 70) * k, nivel, llegada);
  };

  // ——— Los golpes sueltos ———
  const sonarGolpe = (golpe: Golpe) => {
    const t = ctx.currentTime + 0.02 + (golpe.retraso ?? 0);
    switch (golpe.sonido) {
      case 'claqueta':
        // Madera contra madera, con su rebote.
        soplo(t, busGolpes, { f0: 1700, q: 1.5, pico: 3, caida: 0.06 });
        tono(t, busGolpes, { onda: 'triangle', f0: 520, f1: 300, pico: 1.4, caida: 0.05 });
        soplo(t + 0.05, busGolpes, { f0: 1500, q: 1.5, pico: 1, caida: 0.04 });
        break;
      case 'rasgado':
        soplo(t, busGolpes, { f0: 900, f1: 3600, q: 0.8, pico: 0.42, ataque: 0.02, caida: 0.42 });
        for (let i = 0; i < 6; i++) {
          soplo(t + 0.03 + azar(i + 5) * 0.36, busGolpes, { tipo: 'highpass', f0: 3000, pico: 0.3, caida: 0.03 });
        }
        break;
      case 'golpe-grave':
        tono(t, saturador, { f0: 96, f1: 31, barrido: 0.9, pico: 0.9, caida: 1.9 });
        tono(t, busGolpes, { f0: 190, f1: 60, barrido: 0.25, pico: 0.5, caida: 0.5 });
        soplo(t, busGolpes, { tipo: 'lowpass', f0: 900, f1: 90, pico: 0.6, caida: 0.6 });
        break;
      case 'golpe-suave':
        tono(t, busGolpes, { f0: 124, f1: 72, barrido: 0.12, pico: 0.42, caida: 0.42 });
        soplo(t, busGolpes, { f0: 600, pico: 0.07, caida: 0.05 });
        break;
      case 'barrido':
        soplo(t, busGolpes, { f0: 480, f1: 2600, q: 1.4, pico: 0.55, ataque: 0.12, caida: 0.2 });
        break;
      case 'sello':
        tono(t, busGolpes, { f0: 150, f1: 58, barrido: 0.08, pico: 0.7, caida: 0.2 });
        soplo(t, busGolpes, { f0: 950, q: 1.2, pico: 0.4, caida: 0.035 });
        break;
      case 'tacha':
        // Dos trazos de lápiz, uno por cada raya de la tacha.
        soplo(t, busGolpes, { f0: 2600, f1: 3900, q: 2.5, pico: 0.3, ataque: 0.02, caida: 0.16 });
        soplo(t + 0.21, busGolpes, { f0: 3700, f1: 2400, q: 2.5, pico: 0.3, ataque: 0.02, caida: 0.18 });
        break;
      case 'llamada':
        llamada(t, busGolpes, { semitonos: golpe.semitonos });
        break;
      case 'llamada-lejos':
        llamada(t, busGolpes, { lejos: true, semitonos: golpe.semitonos });
        break;
      case 'llamada-resuelta':
        llamada(t, busGolpes, { resuelta: true, semitonos: golpe.semitonos });
        break;
    }
  };

  // ——— El reloj musical: semicorcheas a 90 BPM ———
  let objetivo: Mezcla | undefined;
  let paso = 0;
  let tiempoPaso = 0;

  const percusionMenuda = (t: number, fuerza: number, timbre: Timbre, n: number, abierto: boolean) => {
    if (timbre === 'lapiz') {
      // El lápiz golpeando la mesa hace de plato.
      soplo(t, busDescarga, { f0: 2400, q: 4, pico: 1.6 * fuerza, caida: 0.032 });
      tono(t, busDescarga, { f0: 1100, f1: 700, pico: 0.4 * fuerza, caida: 0.024 });
    } else if (timbre === 'proyector') {
      // El arrastre de un proyector: dos clics secos que se alternan.
      soplo(t, busDescarga, { f0: n % 2 === 0 ? 1300 : 950, q: 9, pico: 3.4 * fuerza, caida: 0.018 });
    } else {
      soplo(t, busDescarga, { tipo: 'highpass', f0: 6000, pico: 0.62 * fuerza, caida: abierto ? 0.2 : 0.045 });
    }
  };

  const programarPaso = (n: number, t: number) => {
    if (!objetivo) return;
    const s = n % PASOS;

    // Papel: de vez en cuando, un trazo de lápiz. Seco y cercano.
    if (objetivo.papel > 0.01 && azar(n) < 0.1) {
      const agudo = 2400 + azar(n + 3) * 2400;
      soplo(t, busPapel, { f0: agudo, f1: agudo * (0.7 + azar(n + 7) * 0.7), q: 2.2, pico: 0.14, ataque: 0.02, caida: 0.09 + azar(n + 11) * 0.16 });
    }

    // Tensión: un latido cada dos compases y, muy de tarde en tarde, la llamada a lo lejos.
    if (objetivo.tension > 0.01) {
      if (s === 0) tono(t, busTension, { f0: 110, f1: 62, barrido: 0.1, pico: 0.13, caida: 0.3 });
      if (s === 3) tono(t, busTension, { f0: 104, f1: 62, barrido: 0.1, pico: 0.07, caida: 0.26 });
      if (objetivo.descarga < 0.01 && n % (PASOS * 4) === PASOS * 3) llamada(t, busTension, { lejos: true });
    }

    // Descarga: bombo, bajo, caja, percusión menuda y acordes.
    if (objetivo.descarga > 0.001) {
      const bombo = BOMBO[s];
      if (bombo === 'x' || bombo === 'o') {
        const fuerza = bombo === 'x' ? 1 : 0.6;
        tono(t, busDescarga, { f0: 165, f1: 46, barrido: 0.07, pico: 0.7 * fuerza, caida: 0.3 });
        soplo(t, busDescarga, { tipo: 'highpass', f0: 2000, pico: 0.3 * fuerza, caida: 0.012 });
      }

      const nota = BAJO[s];
      if (nota) {
        const [midi, largo] = nota;
        tono(t, saturador, { f0: hz(midi) * 2.2, f1: hz(midi), barrido: 0.035, pico: 0.62, ataque: 0.006, caida: largo * PASO + 0.1 });
      }

      const caja = CAJA[s];
      if (caja === 'x' || caja === 'o') {
        const fuerza = caja === 'x' ? 1 : 0.45;
        for (const [retraso, caida] of [
          [0, 0.03],
          [0.011, 0.03],
          [0.023, 0.17],
        ] as const) {
          soplo(t + retraso, busDescarga, { f0: 1900, q: 0.9, pico: 1.1 * fuerza, caida: caida * 1.2 });
          soplo(t + retraso, aLaSala, { f0: 1900, q: 0.9, pico: 0.3 * fuerza, caida });
        }
        tono(t, busDescarga, { onda: 'triangle', f0: 230, f1: 170, pico: 0.6 * fuerza, caida: 0.13 });
      }

      const plato = PLATO[s];
      if (plato && plato !== '.') {
        const fuerza = plato === 'o' ? 0.55 : 1;
        percusionMenuda(t, fuerza, objetivo.timbre, n, s % 16 === 14);
        // El redoble parte la semicorchea en dos.
        if (plato === 'r') percusionMenuda(t + PASO / 2, 0.7, objetivo.timbre, n + 1, false);
      }

      const acorde = ACORDES[s];
      if (acorde) {
        const filtro = ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.value = 1100;
        filtro.connect(busDescarga);
        filtro.connect(aLaSala);
        for (const midi of acorde) tono(t, filtro, { onda: 'sawtooth', f0: hz(midi), pico: 0.2, ataque: 0.005, caida: 0.42 });
      }

      // El ostinato va en corcheas: una nota cada dos pasos.
      if (s % 2 === 0) {
        const midi = OSTINATO[s / 2] ?? 53;
        tono(t, filtroOstinato, { onda: 'sawtooth', f0: hz(midi), pico: 0.2, ataque: 0.004, caida: 0.13 });
      }
    }
  };

  /** Constante de tiempo con la que cada capa llega a su nivel. */
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
      // Cuando la descarga entra desde el silencio, el compás empieza de nuevo: el primer bombo cae ya.
      if (mezcla.descarga > 0.001 && (!objetivo || objetivo.descarga <= 0.001)) {
        paso = Math.ceil(paso / PASOS) * PASOS;
        tiempoPaso = ctx.currentTime + 0.03;
      }
      objetivo = mezcla;

      llevar(busSala.gain, mezcla.sala, 0.3, enSeguida);
      llevar(busPapel.gain, mezcla.papel, 0.2, enSeguida);
      // La tensión y la resolución van muy por debajo de la descarga: el contraste hace el trabajo.
      llevar(busTension.gain, mezcla.tension * 0.7, 0.5, enSeguida);
      llevar(busDescarga.gain, mezcla.descarga, 0.06, enSeguida);
      llevar(busResolucion.gain, mezcla.resolucion * 0.5, 0.7, enSeguida);
      llevar(retorno.gain, mezcla.reverb * 0.55, 0.3, enSeguida);

      const subida = mezcla.subida;
      llevar(gananciaSubida.gain, subida * subida * 0.3, 0.04, enSeguida);
      llevar(ruidoSubida.filtro.frequency, 300 * 2 ** (subida * 4), 0.04, enSeguida);
      llevar(sierraSubida.osc.frequency, 60 * 2 ** (subida * 3), 0.04, enSeguida);
    },

    golpe: sonarGolpe,

    programarHasta(hasta) {
      // Si el reloj se quedó atrás (pestaña dormida), no intenta recuperar lo perdido.
      if (tiempoPaso < ctx.currentTime - PASO) tiempoPaso = ctx.currentTime + 0.02;
      while (tiempoPaso < hasta) {
        programarPaso(paso, tiempoPaso);
        paso += 1;
        tiempoPaso += PASO;
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
