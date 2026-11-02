/* Jalankan: node --test tests/  (dari folder raun-kalteng) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const CORE = require('../core.js');
const D = require('../data.js');
const IDS = new Set(D.DESTINASI.map(d => d.id));

test('setiap itinerary siap pakai berisi slot array dengan id destinasi yang dikenal, tanpa dobel', () => {
  for (const t of D.SIAP_PAKAI) {
    assert.equal(t.plan.length, t.hari * 4, t.id + ': jumlah slot = hari x 4');
    const seen = new Set();
    for (const slot of t.plan) {
      assert.ok(Array.isArray(slot), t.id + ': slot harus array, dapat ' + JSON.stringify(slot));
      for (const id of slot) {
        assert.ok(IDS.has(id), t.id + ': id tak dikenal ' + id);
        assert.ok(!seen.has(id), t.id + ': destinasi dobel ' + id);
        seen.add(id);
      }
    }
  }
});

test('esc menetralkan HTML', () => {
  assert.equal(CORE.esc('<img src=x onerror="a()">&\''), '&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;');
  assert.equal(CORE.esc(null), '');
  assert.equal(CORE.esc(12), '12');
});

test('parseShared membuang id asing dan nama berbahaya tetap berupa teks', () => {
  const out = CORE.parseShared({
    p: { days: 9, budget: 'x', prefs: ['alam', '<script>'], pax: 2 },
    v: 7,
    s: [{ n: '<img onerror=alert(1)>', c: 1000, plan: [{ i: [['tugu', 'evil<b>'], ['balanga'], [], ['riverfront']] }] }]
  }, IDS);
  assert.ok(out);
  assert.equal(out.variant, 0, 'indeks varian di luar rentang dikembalikan ke 0');
  assert.deepEqual(out.params.prefs, ['alam']);
  assert.equal(out.params.days, 1);
  assert.deepEqual(out.variants[0].days[0], [['tugu'], ['balanga'], [], ['riverfront']]);
  assert.equal(typeof out.variants[0].nama, 'string');
  assert.ok(out.variants[0].nama.length <= 40);
});

test('parseShared menolak payload rusak', () => {
  for (const bad of [null, 1, 'x', {}, { s: [] }, { s: [{ plan: 'x' }] }, { s: [{ plan: [{ i: [['hantu']] }] }] }]) {
    assert.equal(CORE.parseShared(bad, IDS), null, JSON.stringify(bad));
  }
});

test('pickHours mulai dari jam sekarang dan menyeberang ke esok hari', () => {
  const times = [], temps = [], pops = [];
  for (let d = 2; d <= 3; d++) for (let h = 0; h < 24; h++) {
    times.push('2026-11-0' + d + 'T' + String(h).padStart(2, '0') + ':00'); temps.push(20 + h); pops.push(h);
  }
  const hrs = CORE.pickHours({ time: times, temperature_2m: temps, precipitation_probability: pops }, '2026-11-02T21:37', 6);
  assert.deepEqual(hrs.map(x => x.h), [21, 22, 23, 0, 1, 2]);
  assert.equal(hrs[3].temp, 20);
  assert.deepEqual(CORE.pickHours(null, '2026-11-02T21:00', 6), []);
});

test('generate: hemat budget, tanpa dobel, dan menghormati minat', () => {
  const env = CORE.makeEnv([{ pm25: 30, rain: 0 }, { pm25: 30, rain: 0 }], 'live');
  const r = CORE.generate({ days: 2, budget: 200000, prefs: ['kuliner'], destinasi: D.DESTINASI, capMs: 800 }, env);
  assert.ok(r.variants.length >= 1);
  for (const v of r.variants) {
    assert.ok(v.cost <= 200000, v.key + ' melebihi budget');
    const ids = v.plan.flatMap(d => d.cells.flatMap(c => c.items.map(i => i.id)));
    assert.equal(new Set(ids).size, ids.length, v.key + ' ada dobel');
  }
});

test('generate saat banjir tidak memilih area rendah yang skornya jatuh', () => {
  const env = CORE.makeEnv([{ pm25: 18, rain: 86, flood: true }], 'flood');
  const r = CORE.generate({ days: 1, budget: 300000, prefs: ['alam'], destinasi: D.DESTINASI, capMs: 800 }, env);
  const lowland = new Set(D.DESTINASI.filter(d => d.lowland).map(d => d.id));
  for (const v of r.variants) {
    const bad = v.plan.flatMap(d => d.cells.flatMap(c => c.items)).filter(i => lowland.has(i.id) && i.env < 0.3);
    assert.equal(bad.length, 0, v.key + ': ' + bad.map(b => b.id));
  }
});
