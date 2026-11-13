import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESCENAS } from '../datos/pelicula.ts';
import { codigoDeTiempo, construirIndice, inicioDe, limitar, localizar, reposoDe } from './tiempo.ts';

const indice = construirIndice(ESCENAS);

test('la película dura 25 pantallas y tiene 25 planos en 7 escenas', () => {
  assert.equal(indice.total, 25);
  assert.equal(indice.entradas.length, 25);
  assert.equal(ESCENAS.length, 7);
});

test('los planos son contiguos y sus identificadores, únicos', () => {
  const ids = new Set(indice.entradas.map((e) => e.plano.id));
  assert.equal(ids.size, indice.entradas.length);
  indice.entradas.forEach((e, i) => {
    assert.equal(e.indice, i);
    assert.equal(e.inicio, i === 0 ? 0 : indice.entradas[i - 1]!.fin);
    assert.ok(e.fin > e.inicio);
  });
});

test('localizar devuelve el plano y el avance correctos', () => {
  assert.deepEqual(pos(0), ['E0-P1', 0]);
  assert.deepEqual(pos(1.25), ['E1-P1', 0]);
  assert.deepEqual(pos(1.75), ['E1-P1', 0.5]);
  assert.deepEqual(pos(2.25), ['E1-P2', 0]);
  assert.deepEqual(pos(25), ['E6-P2', 1]);
});

test('los instantes fuera de rango se limitan', () => {
  assert.equal(limitar(indice, -3), 0);
  assert.equal(limitar(indice, 99), 25);
  assert.equal(limitar(indice, Number.NaN), 0);
  assert.deepEqual(pos(-3), ['E0-P1', 0]);
  assert.deepEqual(pos(99), ['E6-P2', 1]);
});

test('inicioDe encuentra el arranque de cada plano', () => {
  assert.equal(inicioDe(indice, 'E0-P1'), 0);
  assert.equal(inicioDe(indice, 'E2-P1'), 3.25);
  assert.equal(inicioDe(indice, 'E4-X1'), 11);
  assert.equal(inicioDe(indice, 'no-existe'), undefined);
});

test('el código de tiempo va a 12 fps y la película dura 3:20', () => {
  assert.equal(codigoDeTiempo(0), '00:00:00');
  assert.equal(codigoDeTiempo(1 / 96), '00:00:01');
  assert.equal(codigoDeTiempo(1), '00:08:00');
  assert.equal(codigoDeTiempo(25), '03:20:00');
});

test('cada plano tiene sus textos en los dos idiomas', () => {
  for (const { plano } of indice.entradas) {
    assert.ok(plano.nombre.es && plano.nombre.en, plano.id);
    if (plano.lineas) assert.equal(plano.lineas.es.length, plano.lineas.en.length, plano.id);
    for (const bilingue of [plano.titular, plano.nota, plano.sello]) {
      if (bilingue) assert.ok(bilingue.es && bilingue.en, plano.id);
    }
    for (const enlace of plano.enlaces ?? []) {
      assert.ok(enlace.etiqueta.es && enlace.etiqueta.en && enlace.url, plano.id);
    }
  }
});

function pos(t: number): [string, number] {
  const { entrada, progreso } = localizar(indice, t);
  return [entrada.plano.id, Math.round(progreso * 1000) / 1000];
}

test('los saltos caen en el reposo del plano, o en su inicio si no tiene', () => {
  assert.equal(reposoDe(indice, 'E0-P1'), 0);
  assert.equal(reposoDe(indice, 'E1-P2'), 2.25);
  assert.equal(reposoDe(indice, 'E3-P1'), 6.844);
  assert.equal(reposoDe(indice, 'no-existe'), undefined);
});
