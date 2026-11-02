/* RAUN KALTENG — Kritik multi-lensa ala MiroFish
 * Beberapa "pengkritik" dengan kacamata berbeda memeriksa aplikasi dan melaporkan
 * hal jelek secara sistematis: penyalin teks, pemeriksa tampilan, penjaga HP,
 * penghitung katalog. Semua aturan bisa diuji ulang. Jalankan: node sim/critique.mjs
 */
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf-8');
const appjs = readFileSync('app.js', 'utf-8');
const css = readFileSync('styles.css', 'utf-8');
const datajs = readFileSync('data.js', 'utf-8');

const findings = [];
const add = (lens, sev, msg) => findings.push({ lens, sev, msg });

/* Lensa 1: penyalin teks. Bahasa harus bebas tanda AI. */
const dashCount = (html + appjs + datajs).match(/—/g)?.length || 0;
if (dashCount) add('copy', 'tinggi', dashCount + ' tanda pisah panjang masih ada di teks.');
const emojiSet = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
const emojiHits = (html.match(emojiSet) || []).length + (appjs.match(emojiSet) || []).length;
if (emojiHits) add('copy', 'tinggi', emojiHits + ' emoji masih terpakai di antarmuka.');
const emojiCapable = /[\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2900}-\u{297F}]/gu;
const arrowHits = (html.match(emojiCapable) || []).length + (appjs.match(emojiCapable) || []).length;
if (arrowHits) add('copy', 'tinggi', arrowHits + ' panah atau simbol yang bisa tampil sebagai emoji di HP masih ada.');
const midot = (html.match(/·/g) || []).length + (appjs.match(/·/g) || []).length;
if (midot) add('copy', 'sedang', midot + ' titik tengah masih dipakai di teks.');
const plusmin = (html + appjs + datajs).match(/±/g)?.length || 0;
if (plusmin) add('copy', 'sedang', plusmin + ' tanda plus minus masih dipakai di teks.');
const aiPhrases = ['tak terlupakan', 'membuka dunia', 'glassmorphism', 'seamless', 'menghadirkan pengalaman'];
aiPhrases.forEach(w => { if ((html + appjs).toLowerCase().includes(w)) add('copy', 'sedang', 'frasa klise AI: ' + w); });

/* Lensa 2: pemeriksa tampilan. Ikon harus SVG, bukan emoji; simbol harus ada. */
const syms = [...html.matchAll(/<symbol id="(i-[a-z-]+)"/g)].map(m => m[1]);
const uses = [...(html + appjs).matchAll(/href="#(i-[a-z-]+)"/g)].map(m => m[1]);
const missing = [...new Set(uses)].filter(u => !syms.includes(u));
if (missing.length) add('tampilan', 'tinggi', 'simbol SVG dipakai tapi belum didefinisikan: ' + missing.join(', '));
const coverEmoji = /class="cover[^>]*>[\s\S]{0,80}emoji/.test(appjs);
if (coverEmoji) add('tampilan', 'tinggi', 'cover kartu masih memakai emoji.');

/* Lensa 3: penjaga HP. Cegah teks bertumpuk. */
if (!/max-width:720px/.test(css)) add('hp', 'tinggi', 'media query 720px hilang.');
['.grid.cards{grid-template-columns:1fr 1fr', '.siburu-actions{margin-left:0', '.fare{display:block;overflow-x:auto', '.kv{grid-template-columns:96px 1fr'].forEach(rule => {
  if (!css.includes(rule)) add('hp', 'sedang', 'aturan anti tumpuk belum ada: ' + rule.split('{')[0]);
});
const fixedWidths = [...appjs.matchAll(/style="[^"]*width:\s*(\d{3,})px/g)].map(m => m[1]).filter(w => +w > 360);
if (fixedWidths.length) add('hp', 'sedang', fixedWidths.length + ' lebar tetap di atas 360px di kode JS, rawan meluber di HP.');

/* Lensa 4: penghitung katalog. Variasi harus layak. */
const destCount = (datajs.match(/\{ id: '/g) || []).length;
const kulinerCount = (datajs.match(/nama: '[^']+', desc: '/g) || []).length;
const hotelCount = (datajs.match(/const HOTEL = \[([\s\S]*?)\];/)?.[1]?.match(/\{/g) || []).length;
const kafeCount = (datajs.match(/const KAFE = \[([\s\S]*?)\];/)?.[1]?.match(/\{/g) || []).length;
const regionalCount = (datajs.match(/const REGIONAL = \[([\s\S]*?)\];/)?.[1]?.match(/\{/g) || []).length;
const total = destCount + kulinerCount + hotelCount + kafeCount + regionalCount;
if (total < 40) add('katalog', 'tinggi', 'katalog baru ' + total + ' entri, minimal 40.');
else add('katalog', 'info', 'katalog ' + total + ' entri (destinasi ' + destCount + ', kuliner ' + kulinerCount + ', hotel ' + hotelCount + ', kafe ' + kafeCount + ', regional ' + regionalCount + ')');
if (destCount < 26) add('katalog', 'sedang', 'destinasi PKY baru ' + destCount + ', tambah lagi.');

/* Lensa 5: pemeriksa aksesibilitas dasar. */
const ariaCount = (html.match(/aria-label=/g) || []).length;
if (ariaCount < 10) add('akses', 'sedang', 'aria-label baru ' + ariaCount + ', perbanyak untuk elemen ikon.');
if (!/lang="id"/.test(html)) add('akses', 'tinggi', 'atribut lang="id" hilang.');

/* Ringkasan */
const tinggi = findings.filter(f => f.sev === 'tinggi');
console.log('=== KRITIK MULTI-LENSA ===');
findings.forEach(f => console.log('[' + f.sev.toUpperCase() + '][' + f.lens + '] ' + f.msg));
console.log('Total temuan:', findings.length, '| tinggi:', tinggi.length);
console.log(tinggi.length ? 'STATUS: PERLU PERBAIKAN' : 'STATUS: BERSIH');
import { writeFileSync } from 'node:fs';
writeFileSync('sim/critique-results.json', JSON.stringify({ findings, total: findings.length, tinggi: tinggi.length,
  status: tinggi.length ? 'PERLU PERBAIKAN' : 'BERSIH', katalog: { destCount, kulinerCount, hotelCount, kafeCount, regionalCount, total } }, null, 2));
