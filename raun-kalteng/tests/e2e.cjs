/* Uji end-to-end di browser sungguhan (Playwright + Chromium).
 * 1) Sajikan folder ini:   python3 -m http.server 8765
 * 2) Jalankan:             node tests/e2e.cjs
 * Opsional: BASE=http://host:port  OUT=folder-screenshot  AXE=path/ke/axe.min.js
 */
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8765/';
const OUT = process.env.OUT || '';
const AXE = process.env.AXE || '';
let pass = 0, fail = 0;
const check = (name, ok, info) => { if (ok) { pass++; console.log('ok   ' + name); } else { fail++; console.log('FAIL ' + name + (info ? '  -> ' + info : '')); } };
const shot = (p, name) => OUT ? p.screenshot({ path: path.join(OUT, name + '.png') }) : null;

async function page(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ bypassCSP: !!AXE }, opts));
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message));
  p.on('dialog', d => d.accept());
  return p;
}
async function axe(p, label) {
  if (!AXE) return;
  await p.addScriptTag({ path: AXE });
  const r = await p.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }));
  const v = r.violations.map(x => x.id + '(' + x.nodes.length + ')');
  check('axe WCAG AA tanpa pelanggaran: ' + label, v.length === 0, v.join(', ') + ' ' + JSON.stringify(r.violations.map(x => x.nodes.slice(0, 2).map(n => n.target.join(' ')))));
}

(async () => {
  const browser = await chromium.launch();

  /* ---- Desktop, terang ---- */
  const p = await page(browser, { viewport: { width: 1280, height: 900 } });
  await p.goto(BASE + '#beranda');
  await p.waitForFunction(() => typeof ENV !== 'undefined' && ENV.updated, null, { timeout: 15000 });
  const top = await p.evaluate(() => { const el = document.querySelector('#langit-state'); const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.left + 10, r.top + r.height / 2)) && el.textContent.trim(); });
  check('status langit terlihat dan tidak tertutup ilustrasi', !!top, top);
  await shot(p, 'desk-beranda');
  await axe(p, 'beranda');

  await p.click('.seg-btn[data-mode="replay"]');
  await p.waitForFunction(() => document.querySelector('.hero').dataset.env === 'bad');
  check('mode asap: hero jadi "Tidak sehat"', (await p.textContent('#langit-state')) === 'Tidak sehat');
  await shot(p, 'desk-asap');
  await p.click('.seg-btn[data-mode="flood"]');
  await p.waitForFunction(() => document.querySelector('.hero').dataset.env === 'flood');
  check('mode banjir: hero jadi "Waspada banjir"', (await p.textContent('#langit-state')) === 'Waspada banjir');
  await shot(p, 'desk-banjir');
  await p.click('.seg-btn[data-mode="live"]');

  // Wizard: minat kuliner saja harus benar-benar terkirim (dulu selalu jatuh ke "alam")
  await p.click('.hero-cta [data-act="openwizard"]');
  check('dialog susun rencana terbuka', await p.evaluate(() => document.querySelector('#dlg-wizard').open));
  await shot(p, 'desk-wizard');
  await p.keyboard.press('Escape');
  check('Escape menutup dialog', !(await p.evaluate(() => document.querySelector('#dlg-wizard').open)));
  await p.click('.hero-cta [data-act="openwizard"]');
  await p.uncheck('#wz-prefs input[value="alam"]');
  await p.check('#wz-prefs input[value="kuliner"]');
  await p.fill('#wz-budget', '300000');
  await p.click('#wz-go');
  await p.waitForFunction(() => location.hash === '#rencana' && document.querySelectorAll('#timeline .slot').length > 0, null, { timeout: 10000 });
  check('minat terpilih terkirim ke mesin', JSON.stringify(await p.evaluate(() => state.params.prefs)) === '["kuliner"]');
  check('rencana tampil dengan 3 versi', (await p.$$eval('#variant-tabs .variant', b => b.length)) === 3);
  check('peta (atau peta skematik) dirender', await p.evaluate(() => !!document.querySelector('#map .leaflet-pane, #map-fallback svg')));
  await shot(p, 'desk-rencana');
  await p.click('#variant-tabs .variant:nth-child(3)');
  check('ganti versi ke Hemat', (await p.getAttribute('#variant-tabs .variant:nth-child(3)', 'aria-pressed')) === 'true');
  const before = await p.textContent('#timeline .slot h4');
  await p.click('#timeline [data-act="swap"]');
  const after = await p.textContent('#timeline .slot h4');
  check('Ganti tempat mengganti titik pertama', before !== after, before + ' -> ' + after);
  await axe(p, 'rencana');

  // Jelajah: filter, favorit, URL ikut berubah
  await p.click('.toplinks a[href="#jelajah"]');
  await p.click('#dest-filters [data-tag="kuliner"]');
  const allKuliner = await p.$$eval('#dest-grid .card', cs => cs.length > 0 && cs.every(c => [...c.querySelectorAll('.badge')].some(b => b.textContent === 'Kuliner')));
  check('filter Kuliner bekerja', allKuliner);
  check('URL mencerminkan filter', (await p.evaluate(() => location.hash)) === '#jelajah/kuliner');
  await p.click('#dest-grid .fav-btn');
  check('favorit: aria-pressed true dan ikon tetap ada', await p.evaluate(() => { const b = document.querySelector('#dest-grid .fav-btn'); return b.getAttribute('aria-pressed') === 'true' && !!b.querySelector('svg'); }));
  await p.click('#dest-filters [data-tag="favorit"]');
  check('filter Favoritku menampilkan 1 tempat', (await p.$$eval('#dest-grid .card', c => c.length)) === 1);
  await axe(p, 'jelajah');

  // Back browser kembali ke halaman sebelumnya
  await p.click('.toplinks a[href="#budaya"]');
  check('agenda budaya terisi', (await p.$$eval('#events li', l => l.length)) > 0);
  await p.goBack();
  check('tombol Back kembali ke Jelajah', await p.isVisible('#view-jelajah'));

  // Rencana jadi yang dulu crash (data danau1)
  await p.goto(BASE + '#beranda');
  await p.click('#siap-grid [data-id="danau1"]');
  const danau = await p.waitForFunction(() => location.hash === '#rencana' && document.querySelector('#variant-tabs .variant b').textContent === 'Kurasi Raun' && document.querySelectorAll('#timeline .slot').length === 4, null, { timeout: 5000 }).then(() => true, () => false);
  check('rencana jadi "Danau dan sunset" terbuka tanpa error', danau && p.errors.length === 0, p.errors.join(' | '));

  // QRIS + stempel
  await p.click('#timeline [data-act="detail"]');
  await p.click('#detail-body [data-act="qris"]');
  await p.waitForSelector('#detail-body .qr svg', { timeout: 5000 }).catch(() => {});
  check('QR dibuat dari pustaka lokal', !!(await p.$('#detail-body .qr svg')));
  await shot(p, 'desk-qris');
  await p.click('#detail-body [data-act="stamp"]');
  check('stempel bertambah', (await p.textContent('#stamp-count')) === '1/5');

  // XSS lewat link bagikan
  const evil = { p: { prefs: ['alam'] }, v: 0, s: [{ n: '<img src=x onerror="window.__xss=1">', plan: [{ i: [['tugu', '"><img src=x onerror=window.__xss=2>'], [], [], []] }] }] };
  const b64 = Buffer.from(JSON.stringify(evil)).toString('base64');
  await p.goto(BASE + '#plan=' + b64);
  await p.waitForTimeout(400);
  check('link bagikan berbahaya tidak mengeksekusi script', await p.evaluate(() => window.__xss === undefined));
  check('nama berbahaya tampil sebagai teks biasa', (await p.textContent('#variant-tabs .variant b')).startsWith('<img'));
  await p.goto(BASE + '#plan=bukan-base64!!');
  await p.waitForTimeout(300);
  check('link rusak tidak membuat crash', (await p.evaluate(() => location.hash)) === '#beranda');
  await p.goto(BASE + '#%E0%A4%A');
  await p.waitForTimeout(200);
  check('hash dengan escape rusak tetap membuka beranda', await p.isVisible('#view-beranda'));
  // Pindah ke mode asap sebelum data live selesai: data live yang datang terlambat tidak boleh menimpa.
  const r = await page(browser, { viewport: { width: 1280, height: 900 } });
  await r.route(/open-meteo\.com/, async route => { await new Promise(res => setTimeout(res, 1500)); route.abort(); });
  await r.goto(BASE + '#beranda');
  await r.click('.seg-btn[data-mode="replay"]');
  await r.waitForTimeout(2200);
  check('data live terlambat tidak menimpa mode asap', (await r.textContent('#langit-state')) === 'Tidak sehat');

  // XSS lewat chat
  await p.click('#chat-fab');
  await p.fill('#chat-input', '<img src=x onerror="window.__xss3=1">');
  await p.press('#chat-input', 'Enter');
  await p.waitForTimeout(200);
  check('chat tidak mengeksekusi HTML dari pengguna', await p.evaluate(() => window.__xss3 === undefined && !document.querySelector('#chat-log img')));
  await p.fill('#chat-input', 'asap hari ini');
  await p.press('#chat-input', 'Enter');
  check('asisten menjawab soal asap', (await p.textContent('#chat-log .msg.bot:last-child')).includes('PM2.5'));

  const reg = await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!r));
  check('service worker terdaftar (dulu tidak pernah)', reg);
  check('desktop tanpa error JavaScript', p.errors.length === 0, p.errors.join(' | '));

  /* ---- HP, gelap ---- */
  const m = await page(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'dark', isMobile: true, hasTouch: true });
  await m.goto(BASE + '#beranda');
  await m.waitForFunction(() => typeof ENV !== 'undefined' && ENV.updated);
  check('HP: nav bawah tampil', await m.isVisible('.bottomnav'));
  await shot(m, 'mob-dark-beranda');
  await m.evaluate(() => document.querySelector('.langit').scrollIntoView());
  await shot(m, 'mob-dark-langit');
  await axe(m, 'HP gelap beranda');
  await m.click('.bn-item[href="#jelajah"]');
  const cur = await m.waitForFunction(() => document.querySelector('.bn-item[href="#jelajah"]').getAttribute('aria-current') === 'page', null, { timeout: 3000 }).then(() => true, () => false);
  check('HP: nav bawah menandai halaman aktif', cur);
  await shot(m, 'mob-dark-jelajah');
  await m.click('.bn-raun');
  await m.waitForTimeout(300);
  await shot(m, 'mob-dark-wizard');
  const sheetBottom = await m.evaluate(() => { const r = document.querySelector('#dlg-wizard').getBoundingClientRect(); return Math.round(window.innerHeight - r.bottom); });
  check('HP: dialog tampil sebagai lembar bawah', sheetBottom <= 1, 'jarak ' + sheetBottom);
  await m.click('#wz-go');
  await m.waitForFunction(() => location.hash === '#rencana');
  await shot(m, 'mob-dark-rencana');
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('HP: tidak ada scroll horizontal', overflow <= 0, overflow + 'px');
  check('HP tanpa error JavaScript', m.errors.length === 0, m.errors.join(' | '));

  /* ---- Versi 1 file (file://) ---- */
  const f = await page(browser, { viewport: { width: 390, height: 844 } });
  await f.goto('file://' + path.resolve(__dirname, '..', 'dist', 'raun-kalteng-offline.html'));
  await f.waitForFunction(() => typeof ENV !== 'undefined' && ENV.updated);
  await f.click('#siap-grid [data-act="runsiap"]');
  await f.click('#timeline [data-act="detail"]');
  await f.click('#detail-body [data-act="qris"]');
  await f.waitForTimeout(300);
  check('dist 1 file: QR jalan tanpa folder vendor', !!(await f.$('#detail-body .qr svg')));
  check('dist 1 file tanpa error JavaScript', f.errors.length === 0, f.errors.join(' | '));

  await browser.close();
  console.log('\n' + pass + ' lulus, ' + fail + ' gagal');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
