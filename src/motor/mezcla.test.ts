import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESCENAS, type Arte, type Plano } from '../datos/pelicula.ts';
import { CAIDA_DE_LA_PARED, CAIDA_DEL_REEL, golpesEntre, mezclaDe } from './mezcla.ts';

const planos = ESCENAS.flatMap((escena) => escena.planos);
const plano = (id: string): Plano => {
  const encontrado = planos.find((p) => p.id === id);
  if (!encontrado) throw new Error(`no existe el plano ${id}`);
  return encontrado;
};
const avances = [0, 0.1, 0.25, 0.5, 0.75, 1];

test('todos los niveles de la mezcla están entre 0 y 1', () => {
  for (const p of planos) {
    for (const avance of avances) {
      for (const [capa, nivel] of Object.entries(mezclaDe(p, avance))) {
        assert.ok(nivel >= 0 && nivel <= 1, `${p.id} ${capa} = ${nivel}`);
      }
    }
  }
});

test('la descarga nunca suena mientras se lee', () => {
  const deLectura: Arte[] = ['avatar-tinta', 'avatar-final', 'pared', 'proyecto', 'diptico', 'inspeccion', 'creditos', 'contacto'];
  for (const p of planos.filter((candidato) => candidato.arte && deLectura.includes(candidato.arte))) {
    for (const avance of avances) assert.equal(mezclaDe(p, avance).descarga, 0, p.id);
  }
  // En el primer plano de «Quién» se apaga antes de la mitad.
  assert.equal(mezclaDe(plano('E2-P1'), 0.5).descarga, 0);
});

test('la primera descarga entra cuando cae la pared', () => {
  const ruptura = plano('E1-P2');
  assert.equal(mezclaDe(ruptura, CAIDA_DE_LA_PARED - 0.01).descarga, 0);
  assert.equal(mezclaDe(ruptura, CAIDA_DE_LA_PARED).descarga, 1);
  assert.ok(mezclaDe(ruptura, 0.5).subida > mezclaDe(ruptura, 0.2).subida);
});

test('en papel todo suena seco y en sala se abre la reverberación', () => {
  assert.equal(mezclaDe(plano('E0-P1'), 0.5).reverb, 0);
  assert.equal(mezclaDe(plano('E1-P1'), 0.5).reverb, 0);
  assert.equal(mezclaDe(plano('E3-P1'), 0.5).reverb, 1);
});

test('hay descarga en la ruptura, en Retos y en Detrás de cámaras, y resolución al final', () => {
  assert.equal(mezclaDe(plano('E3-P2'), 0.5).descarga, 1);
  assert.equal(mezclaDe(plano('E5-P1'), 0.5).descarga, 1);
  assert.equal(mezclaDe(plano('E6-P1'), 0.5).resolucion, 1);
  assert.equal(mezclaDe(plano('E6-P1'), 0.5).descarga, 0);
});

test('los golpes caen al cruzar su punto hacia delante y nunca al rebobinar', () => {
  const claqueta = plano('E0-P1');
  assert.deepEqual(
    golpesEntre(claqueta, 0.6, 0.75).map((g) => g.sonido),
    ['claqueta'],
  );
  assert.deepEqual(golpesEntre(claqueta, 0.75, 0.6), []);
  assert.deepEqual(golpesEntre(claqueta, 0.75, 0.9), []);
  // Un plano que acaba de entrar: suenan los golpes de su primer fotograma.
  assert.deepEqual(
    golpesEntre(plano('E4-X1'), -1, 0.01).map((g) => g.sonido),
    ['sello'],
  );
});

test('el showreel llega con suspenso y cae con la descarga, como el merodeador', () => {
  const reel = plano('E5-R1');
  assert.equal(mezclaDe(plano('E5-P2'), 0.5).descarga, 0);
  assert.equal(mezclaDe(reel, CAIDA_DEL_REEL / 2).descarga, 0);
  assert.ok(mezclaDe(reel, CAIDA_DEL_REEL / 2).subida > 0);
  assert.equal(mezclaDe(reel, CAIDA_DEL_REEL).descarga, 1);
  assert.deepEqual(
    golpesEntre(reel, 0.1, 0.2).map((g) => g.sonido),
    ['golpe-grave'],
  );
});

test('Quién y Proyectos suenan en los audífonos, sin suspenso; Y Si Pixel, en 8 bits', () => {
  for (const id of ['E2-P2', 'E2-P3', 'E4-P0', 'E4-X1', 'E4-X2', 'E4-X3']) {
    const mezcla = mezclaDe(plano(id), 0.5);
    assert.ok(mezcla.auriculares > 0, id);
    assert.equal(mezcla.tension, 0, id);
  }
  // Al presentarse, la descarga se va metiendo en los audífonos.
  assert.ok(mezclaDe(plano('E2-P1'), 0.1).descarga > mezclaDe(plano('E2-P1'), 0.3).descarga);
  assert.equal(mezclaDe(plano('E2-P1'), 0.5).auriculares, 1);
  // Las claquetas se oyen con todo su brillo; la inspección, cerrada para leer.
  assert.ok(mezclaDe(plano('E4-X1'), 0.5).brillo > mezclaDe(plano('E4-X3'), 0.5).brillo);
  const pixel = mezclaDe(plano('E5-P3'), 0.5);
  assert.equal(pixel.pixel, 1);
  assert.equal(pixel.descarga, 0);
});
