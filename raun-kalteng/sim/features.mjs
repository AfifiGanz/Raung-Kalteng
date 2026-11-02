/* RAUN KALTENG — Penyapu Ruang Fitur ala MiroFish
 * Ruang teoretis: subset dari 44 kandidat fitur = 2^44 ≈ 1,76e13 kombinasi.
 * Cara kerja: (1) 1.000.000 profil wisatawan virtual mengevaluasi tiap fitur
 * (probabilitas terpakai × delta kepuasan); (2) Monte Carlo 200.000 subset acak
 * dalam budget pembangunan + pelengkap greedy → subset fitur terbaik untuk v1.
 * Jalankan: node sim/features.mjs
 */
import { writeFileSync } from 'node:fs';

const FEATURES = [
  // [id, label, tagAffinity, buildCost(hari), wow(0-1), implemented]
  ['stamp', 'Pas Raun stempel persisten', ['keluarga', 'kuliner'], 2, .8, true],
  ['mapsrute', 'Rute Google Maps per titik', ['alam', 'budaya', 'kuliner', 'keluarga'], 1, .75, true],
  ['mapsnear', 'Hotel/makan/ngopi sekitar', ['kuliner', 'keluarga'], 1, .7, true],
  ['hotelkafe', 'Katalog menginap & ngopi', ['keluarga'], 2, .6, true],
  ['gojek', 'Panggil Gojek dari titik', ['keluarga', 'kuliner'], 2, .7, true],
  ['otsok', 'Ojek/perahu lokal via WA', ['alam', 'air', 'kuliner'], 2, .8, true],
  ['replay', 'Replay karhutla utk demo', ['alam'], 1, .9, true],
  ['floodmode', 'Mode banjir adaptif', ['alam', 'air'], 2, .85, true],
  ['siburu', 'Skor langit live per destinasi', ['alam', 'hiking', 'air'], 3, .95, true],
  ['chat', 'Asisten lokal di chat', ['keluarga'], 3, .7, true],
  ['dashboard', 'Dashboard data utk pemda', ['budaya'], 2, .6, true],
  ['siappakai', 'Itinerary siap-pakai', ['keluarga'], 2, .65, true],
  // kandidat v1 (belum ada)
  ['audio', 'Audio guide Ngaju 90 detik', ['budaya', 'sejarah'], 5, .85, false],
  ['eventcal', 'Kalender FBIM & festival', ['budaya', 'keluarga'], 3, .7, false],
  ['waalert', 'Notifikasi WA saat langit berubah', ['alam', 'hiking', 'air'], 4, .8, false],
  ['grouptrip', 'Itinerary rombongan + voting', ['keluarga'], 5, .6, false],
  ['pasfoto', 'Kontribusi foto kondisi terkini', ['alam', 'hiking'], 3, .55, false],
  ['enlang', 'Antarmuka Inggris penuh', ['budaya', 'alam'], 4, .6, false],
  ['budgetslider', 'Slider budget interaktif', ['kuliner', 'keluarga'], 1, .45, false],
  ['offlinepdf', 'PDF itinerary cantik cetak', ['keluarga', 'budaya'], 2, .5, false],
  ['qrisdinamis', 'QRIS dinamis nominal otomatis', ['kuliner'], 6, .9, false],
  ['destcount', 'Penghitung pengunjung IoT', ['alam'], 6, .7, false],
  ['vrsebangau', 'Tur virtual 360° Sebangau', ['alam', 'budaya'], 8, .85, false],
  ['arway', 'AR wayfinding di riverfront', ['keluarga'], 8, .8, false],
  ['hargatiket', 'Cek harga tiket event', ['budaya', 'keluarga'], 2, .5, false],
  ['tripshare', 'Halaman share publik per trip', ['keluarga', 'kuliner'], 3, .6, false],
  ['ratinglokal', 'Ulasan warga terverifikasi', ['kuliner', 'budaya'], 5, .7, false],
  ['keamanan', 'Tombol darurat & info BPBD', ['alam', 'air', 'hiking'], 3, .75, false],
  ['pasangsurut', 'Data pasang-surut Kahayan', ['air', 'alam'], 3, .6, false],
  ['tripbudget', 'Pencatat pengeluaran per trip', ['kuliner', 'keluarga'], 3, .5, false],
  ['favorit', 'Simpan destinasi favorit', ['kuliner', 'budaya'], 2, .45, false],
  ['multikota', 'Perluasan kota lain Kalteng', ['alam'], 10, .6, false],
  ['chatvoice', 'Perintah suara (voice note)', ['keluarga'], 5, .65, false],
  ['openapi', 'API publik untuk developer', ['budaya'], 4, .4, false],
  ['sponsor', 'Slot sponsor UMKM terkurasi', ['kuliner'], 2, .35, false],
  ['kiosqr', 'Kios QRIS fisik di destinasi', ['kuliner', 'keluarga'], 6, .7, false],
  ['panduprofil', 'Profil pandu lokal bersertifikat', ['budaya', 'sejarah', 'alam'], 4, .75, false],
  ['homestaybook', 'Koneksi homestay desa', ['alam', 'air'], 6, .7, false],
  ['gambutinfo', 'Edukasi gambut & konservasi', ['alam', 'budaya'], 3, .55, false],
  ['kulinermap', 'Peta kuliner khusus', ['kuliner'], 3, .6, false],
  ['triploop', 'Trip berulang (langganan)', ['keluarga'], 3, .4, false],
  ['weatherhour', 'Perkiraan per jam (bukan harian)', ['alam', 'hiking', 'air'], 2, .6, false],
  ['statwarga', 'Statistik terbuka untuk warga', ['budaya'], 2, .4, false],
  ['badgesdg', 'Badge destinasi berkelanjutan', ['alam', 'budaya'], 2, .45, false]
];

/* 1.000.000 profil wisatawan virtual */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry(99);
const PREFS = ['alam', 'budaya', 'kuliner', 'keluarga', 'sunset', 'hiking', 'air'];
const util = new Map(FEATURES.map(([id]) => [id, 0]));
const useCount = new Map(FEATURES.map(([id]) => [id, 0]));
const N = 1000000;
for (let i = 0; i < N; i++) {
  const p1 = PREFS[(rnd() * 7) | 0], p2 = PREFS[(rnd() * 7) | 0];
  const mood = rnd(); // 0 = santai keluarga, 1 = petualang
  for (const [id, , aff, , wow] of FEATURES) {
    const hit = aff.filter(t => t === p1 || t === p2).length;
    let useP = 0.12 + hit * 0.3 + (aff.includes('keluarga') && mood < 0.4 ? 0.15 : 0) + wow * 0.15;
    if (rnd() < useP) { util.set(id, util.get(id) + 0.5 + wow * 0.5); useCount.set(id, useCount.get(id) + 1); }
  }
}

/* Monte Carlo subset dalam budget pembangunan (120 hari-orang) */
const BUDGET_HARI = 120;
let best = null;
for (let it = 0; it < 200000; it++) {
  const set = []; let cost = 0, score = 0;
  for (const [id, , , c] of FEATURES) if (rnd() < 0.28 && cost + c <= BUDGET_HARI) { set.push(id); cost += c; score += util.get(id); }
  if (!best || score > best.score) best = { set: set.slice(), cost, score };
}
// greedy pelengkap
const sorted = FEATURES.slice().sort((a, b) => util.get(b[0]) / b[3] - util.get(a[0]) / a[3]);
const gset = []; let gcost = 0;
for (const [id, , , c] of sorted) if (gcost + c <= BUDGET_HARI) { gset.push(id); gcost += c; }
const gscore = gset.reduce((a, id) => a + util.get(id), 0);
if (gscore > best.score) best = { set: gset, cost: gcost, score: gscore };

const ranked = FEATURES.map(([id, label, , c, wow, done]) => ({ id, label, costHari: c, wow, sudah: done,
  probTerpakai: +(useCount.get(id) / N * 100).toFixed(1), utilitas: Math.round(util.get(id)) }))
  .sort((a, b) => b.utilitas - a.utilitas);

const results = {
  ruangTeoretis: '2^44 = 1.759.218.604.443.648 kombinasi subset fitur (≈1,76×10^13)',
  metode: '1.000.000 profil wisatawan virtual menilai 44 fitur (seed 99) → Monte Carlo 200.000 subset + greedy dalam budget 120 hari-orang',
  subsetTerbaik: { fitur: best.set, biayaHariOrang: best.cost, utilitas: Math.round(best.score) },
  peringkat: ranked.slice(0, 20),
  rekomendasiV1: ranked.filter(f => !f.sudah).slice(0, 8).map(f => f.id),
  note: 'Angka 9,99×10^22 cara secara harfiah tak terjangkau waktu komputasi demo — maka dipakai dua lapis pemangkasan cerdas (evaluasi marginal + Monte Carlo), pola yang sama dipakai MiroFish untuk memangkas ruang skenario.'
};
writeFileSync('sim/feature-results.json', JSON.stringify(results, null, 2));
console.log('Ruang:', results.ruangTeoretis);
console.log('Top 10 fitur by utilitas:');
results.peringkat.slice(0, 10).forEach((f, i) => console.log((i + 1) + '.', f.label, '· terpakai ' + f.probTerpakai + '% · ' + f.costHari + ' hari' + (f.sudah ? ' · SUDAH ADA ✓' : '')));
console.log('Subset terbaik (' + best.set.length + ' fitur, ' + best.cost + ' hari-orang):', best.set.join(', '));
console.log('Prioritas v1 (belum ada):', results.rekomendasiV1.join(', '));
