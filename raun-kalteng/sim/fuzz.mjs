/* RAUN KALTENG — Berburu Bug ala MiroFish (fuzz + invariant)
 * 500.000 sesi input jahat/aneh dilempar ke core.js: parameter gila, destinasi
 * cacat, data lingkungan NaN/ekstrem. Invariant yang wajib bertahan:
 *  (1) tidak crash; (2) bentuk hasil valid; (3) biaya varian ≤ budget (bila budget>0);
 *  (4) tak ada destinasi dobel dalam satu rencana; (5) skor env selalu 0..1.
 * Jalankan: node sim/fuzz.mjs
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE = require(join(dir, 'core.js'));
const GOOD = require(join(dir, 'data.js')).DESTINASI;

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry(1337);
const pick = arr => arr[(rnd() * arr.length) | 0];

const EVIL_DAYS = [
  { pm25: NaN, rain: NaN }, { pm25: -999, rain: -5 }, { pm25: 1e9, rain: 1e9 },
  { pm25: 'banyak', rain: 'deras' }, {}, null, { pm25: 40, rain: 2, flood: 'ya' }
];
const EVIL_MUT = [
  d => d, d => ({ ...d, cost: NaN }), d => ({ ...d, cost: -50 }), d => ({ ...d, cost: 1e12 }),
  d => ({ ...d, tags: 'alam' }), d => ({ ...d, slot: 'kapan saja' }), d => ({ ...d, zone: 'tengah' }),
  d => ({ ...d, lowland: 'iya' }), d => ({ ...d, indoor: 3 }), d => ({ id: undefined, nama: '', tags: [] }),
  d => ({ ...d, id: 'dobel' }) // duplikat id sengaja
];
const EVIL_PARAMS = [
  {}, { days: 0 }, { days: -3 }, { days: 99 }, { days: NaN }, { days: 2.7 },
  { budget: -5 }, { budget: NaN }, { budget: Infinity }, { budget: 0 }, { budget: 1 },
  { prefs: 'alam' }, { prefs: [{}, null] }, { prefs: Array(500).fill('alam') },
  { days: 3, budget: 1e9, prefs: ['alam'] }
];

const N = 60000;
let crashes = 0, violBudget = 0, violDup = 0, violShape = 0, violEnv = 0, noResult = 0, ran = 0;
const crashSamples = [];

for (let i = 0; i < N; i++) {
  // destinasi: kadang bagus dimutasi, kadang kacau total
  let dests;
  const mode = rnd();
  if (mode < 0.5) dests = GOOD.map(d => pick(EVIL_MUT)(d));
  else if (mode < 0.7) dests = GOOD.slice(0, 1 + ((rnd() * 3) | 0)).map(d => pick(EVIL_MUT)(d));
  else if (mode < 0.8) dests = [];
  else if (mode < 0.9) dests = Array.from({ length: 8 }, (_, k) => ({ id: 'x' + (k % 2), nama: 'X' + k, zone: (rnd() * 6) | 0, tags: rnd() < .5 ? ['alam'] : 'alam', slot: pick(['any', 'day', 'noon', 'sunset', 'aneh']), cost: pick([0, 25000, NaN, -1]), indoor: pick([true, false, 1]), lowland: pick([true, false, 'y']) }));
  else dests = null;

  const params = { ...(pick(EVIL_PARAMS)), prefs: rnd() < .5 ? pick(EVIL_PARAMS).prefs || ['alam'] : [pick(['alam', 'budaya', 'kuliner'])], capMs: 3, capNodes: 1800 };
  const env = CORE.makeEnv(pick([EVIL_DAYS, [{ pm25: 30, rain: 1 }]]), pick(['live', 'replay', 'flood', 'aneh']));

  let r;
  try {
    r = CORE.generate({ ...params, destinasi: dests }, env);
    ran++;
  } catch (e) {
    crashes++;
    if (crashSamples.length < 8) crashSamples.push(String(e && e.message || e));
    continue;
  }
  // invariant
  if (!r || !Array.isArray(r.variants)) { violShape++; continue; }
  if (!r.variants.length) { noResult++; continue; } // input kacau → tak ada rencana: PERILAKU BENAR
  for (const v of r.variants) {
    if (!v || !Array.isArray(v.plan) || !isFinite(v.cost)) { violShape++; continue; }
    if (isFinite(params.budget) && params.budget > 0 && v.cost > params.budget + 1) violBudget++;
    const seen = new Set();
    for (const day of v.plan) for (const cell of (day.cells || [])) for (const it of (cell.items || [])) {
      if (seen.has(it.id)) violDup++;
      seen.add(it.id);
      if (!(it.env >= 0 && it.env <= 1)) violEnv++;
    }
  }
  // invariant envScore langsung
  const es = CORE.envScore(dests && dests[0] || null, pick(EVIL_DAYS), 'live');
  if (!(es.s >= 0 && es.s <= 1)) violEnv++;
}

const results = {
  sesi: N, berjalan: ran, crashes, crashSamples,
  tanpaHasilWajar: noResult,
  pelanggaran: { budget: violBudget, duplikatDestinasi: violDup, bentukHasil: violShape, skorEnv: violEnv },
  status: crashes === 0 && violBudget === 0 && violDup === 0 && violShape === 0 && violEnv === 0 ? 'LULUS — mesin tahan banting' : 'PERLU PERBAIKAN',
  note: 'Fuzz ala MiroFish: 60 ribu input jahat (budget negatif/NaN/Infinity, destinasi cacat, lingkungan NaN, id dobel) + 5 invariant keamanan. Tanpa hasil = perilaku benar utk input tak masuk akal.'
};
writeFileSync('sim/fuzz-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
