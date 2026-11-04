/* RAUN KALTENG v0.6, aplikasi (tanpa framework)
 * Modul: STORE, ENV (langit), ROUTER, RENCANA + PETA, KATALOG, DIALOG (detail, QRIS, wizard),
 *        TRANSPORT, ASISTEN, DASBOR, PWA. Mesin & skor ada di core.js.
 * Aturan: semua teks dinamis yang masuk innerHTML lewat esc().
 */
'use strict';
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const D = window.RAUN_DATA;
const CORE = window.RAUN_CORE;
const esc = CORE.esc;
const SLOTS = CORE.SLOTS;
const GROUPS = CORE.GROUPS;
const DEST = new Map(D.DESTINASI.map(d => [d.id, d]));
const byId = id => DEST.get(id);
const RP = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const fmtRp = n => RP.format(n || 0);
const fmtCost = n => (n ? fmtRp(n) : 'Gratis');
const fmtN = n => (n || 0).toLocaleString('id-ID');
const TZ = 'Asia/Jakarta';
const todayLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const nowLocal = () => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(' ', 'T');
const clockLocal = d => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d);
const TAG = { alam: 'Alam', budaya: 'Budaya', kuliner: 'Kuliner', keluarga: 'Keluarga', sunset: 'Senja', hiking: 'Mendaki', air: 'Wisata air', indoor: 'Indoor', sejarah: 'Sejarah', foto: 'Spot foto', campur: 'Campuran' };
const tagLabel = t => TAG[t] || t;
const extLink = (href, label) => '<a class="chip" target="_blank" rel="noopener" href="' + href + '">' + esc(label) + '</a>';

/* ---------- STORE (localStorage, aman saat diblokir) ---------- */
function store(key, def) {
  let s;
  try { s = Object.assign({}, def, JSON.parse(localStorage.getItem(key) || '{}')); } catch (e) { s = Object.assign({}, def); }
  return { s, save() { try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) { /* penyimpanan penuh/diblokir: lanjut tanpa simpan */ } } };
}
const STATS = store('raun_stats_v0', { gen: 0, queries: {}, destViews: {}, qr: 0, swap: 0, envHist: [] });
const bump = (k, sub) => { if (sub) STATS.s[k][sub] = (STATS.s[k][sub] || 0) + 1; else STATS.s[k]++; STATS.save(); };
const FAV = store('raun_fav_v1', { ids: [] });
const PAS = store('raun_pasraun_v1', { stamps: [] });
const LAST = store('raun_env_last_v1', { t: 0, days: null });
const val = (v, unit) => (v == null ? '–' : esc(v) + (unit || ''));
if (!Array.isArray(FAV.s.ids)) FAV.s.ids = [];
if (!Array.isArray(PAS.s.stamps)) PAS.s.stamps = [];

/* ---------- ENV: membaca langit ---------- */
const STATE_WORD = { ok: 'Baik', warn: 'Sedang', bad: 'Tidak sehat', flood: 'Waspada banjir', unknown: 'Udara belum terbaca' };
const ADVICE = {
  ok: 'Aman untuk kegiatan di luar. Tetap bawa air minum.',
  warn: 'Kegiatan luar ruang yang singkat masih oke. Bawa masker.',
  bad: 'Pilih tempat indoor dan pakai masker N95. Raun menandai titik outdoor di rencanamu.',
  flood: 'Hindari tepi danau dan bantaran rendah. Raun melewatkan area rawan luapan.',
  unknown: 'Data asap belum masuk. Bawa masker untuk berjaga-jaga dan cek lagi sebentar.'
};
const DAY_NAME = ['Hari ini', 'Besok', 'Lusa', 'Hari ke-4'];
const ENV = {
  mode: 'live', days: [], hours: [], updated: null, source: '',
  scoreFor(dest, dayIdx) { return CORE.makeEnv(this.days, this.mode).scoreFor(dest, dayIdx); },
  state(day) {
    const d = day || this.days[0] || {};
    if (d.flood || this.mode === 'flood') return 'flood';
    return d.pm25 == null ? 'unknown' : (d.cat || 'ok'); // PM2.5 tak terbaca bukan berarti udara bersih
  },
  async refresh() {
    const mode = this.mode;
    if (mode === 'replay') {
      const r = D.META.karhutlaReplay;
      this.days = r.pm25.map((v, i) => ({ pm25: v, cat: CORE.catOf(v), rain: r.hujan[i] || 0, flood: false }));
      this.hours = []; this.source = 'Putar ulang asap 14 Oktober 2026';
    } else if (mode === 'flood') {
      this.days = [86, 64, 41].map(mm => ({ pm25: 18, cat: 'ok', rain: mm, flood: true }));
      this.hours = []; this.source = 'Simulasi hujan ekstrem dan luapan Kahayan';
    } else {
      const q = 'latitude=-2.2088&longitude=113.9213&timezone=Asia%2FJakarta&forecast_days=3';
      const once = u => fetch(u, { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
      const get = u => once(u).catch(() => once(u)); // sinyal HP sering putus sesaat: coba sekali lagi
      const [a, w] = await Promise.allSettled([
        get('https://air-quality-api.open-meteo.com/v1/air-quality?hourly=pm2_5&' + q),
        get('https://api.open-meteo.com/v1/forecast?hourly=temperature_2m,precipitation_probability&daily=precipitation_sum&' + q)
      ]);
      if (this.mode !== mode) return; // pengguna sudah pindah mode saat data live masih dimuat
      const live = CORE.mergeLive(a.status === 'fulfilled' ? a.value : null, w.status === 'fulfilled' ? w.value : null, nowLocal());
      if (live) {
        this.days = live.days; this.hours = live.hours;
        this.source = 'Live dari Open-Meteo, ' + clockLocal(new Date()) +
          (live.missing.includes('pm25') ? '. PM2.5 belum terbaca' : '') + (live.missing.includes('hujan') ? '. Data hujan belum terbaca' : '');
        if (!live.missing.length || !LAST.s.t) { LAST.s.t = Date.now(); LAST.s.days = live.days; LAST.save(); } // simpan hanya bacaan lengkap
      } else if (LAST.s.t && Date.now() - LAST.s.t < 86400000 && Array.isArray(LAST.s.days)) {
        // Offline: pakai bacaan live terakhir (maks. 24 jam), jangan angka karangan.
        this.days = LAST.s.days; this.hours = [];
        this.source = 'Offline. Data terakhir pukul ' + clockLocal(new Date(LAST.s.t));
      } else {
        this.days = [0, 2, 4].map(rain => ({ pm25: 40, cat: 'ok', rain, flood: false }));
        this.hours = []; this.source = 'Data contoh. Open-Meteo tidak terjangkau.';
      }
    }
    this.updated = new Date();
    if (mode === 'live' && this.source.startsWith('Live') && this.days[0].pm25 != null) { STATS.s.envHist = (STATS.s.envHist || []).slice(-30).concat([{ t: Date.now(), v: this.days[0].pm25 }]); STATS.save(); }
    this.paint();
  },
  paint() {
    const st = this.state();
    $('.hero').dataset.env = st;
    $('#langit-state').textContent = STATE_WORD[st];
    $('#langit-src').textContent = this.source;
    $('#langit-advice').textContent = ADVICE[st];
    $('#langit-days').innerHTML = this.days.slice(0, 3).map((d, i) =>
      '<li><b><i class="dot" data-c="' + this.state(d) + '"></i>' + DAY_NAME[i] + '</b><span>PM2.5 ' + val(d.pm25) + '</span><span>Hujan ' + val(d.rain, ' mm') + '</span></li>').join('');
    $('#hours').innerHTML = this.hours.map(h =>
      '<div class="hour"><b>' + String(h.h).padStart(2, '0') + '.00</b>' + (h.temp != null ? esc(h.temp) + '°C' : '') + '<br>hujan ' + (h.pop != null ? esc(h.pop) + '%' : '?') + '</div>').join('');
    $$('.seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === this.mode)));
    if (state.plan && currentView === 'rencana') renderPlan();
    if (currentView === 'data') renderDashboard();
  }
};
function setMode(mode) {
  if (ENV.mode === mode) return;
  ENV.mode = mode;
  ENV.refresh().then(() => toast({ live: 'Kembali ke data live.', replay: 'Memutar ulang asap 14 Oktober 2026. Titik outdoor ditandai merah.', flood: 'Simulasi banjir aktif. Area rendah dilewati.' }[mode]));
}

/* ---------- ROUTER (hash, mendukung tombol Back) ---------- */
const VIEWS = ['beranda', 'jelajah', 'rencana', 'budaya', 'paspor', 'data'];
const ALIAS = { home: 'beranda', destinasi: 'jelajah', umkm: 'paspor', plan: 'rencana', siappakai: 'beranda/siap' };
const TITLE = { beranda: 'Raun Kalteng, kawan raun Palangka Raya', jelajah: 'Jelajah, Raun Kalteng', rencana: 'Rencanaku, Raun Kalteng', budaya: 'Budaya, Raun Kalteng', paspor: 'Pas Raun, Raun Kalteng', data: 'Dasbor, Raun Kalteng' };
let currentView = null;
function route() {
  let h = location.hash.slice(1);
  try { h = decodeURIComponent(h); } catch (e) { h = ''; }
  if (h.startsWith('plan=')) { if (loadShared(h.slice(5))) return; history.replaceState(null, '', '#beranda'); }
  let [view, arg] = (ALIAS[h] || h).split('/');
  view = ALIAS[view] || view;
  if (h === 'raun') { openWizard(); view = currentView || 'beranda'; }
  if (!VIEWS.includes(view)) view = 'beranda';
  const changed = view !== currentView;
  $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + view; });
  $$('.toplinks a, .bn-item').forEach(a => {
    if (a.getAttribute('href') === '#' + view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.title = TITLE[view];
  if (view === 'jelajah') setDestFilter(arg && (TAG[arg] || arg === 'favorit') ? arg : (changed ? 'semua' : destFilter));
  if (view === 'rencana') { renderPlan(); if (leafletMap) setTimeout(() => leafletMap.invalidateSize(), 120); }
  if (view === 'data') renderDashboard();
  if (arg === 'siap') $('#siap').scrollIntoView({ behavior: 'smooth' });
  else if (changed) {
    window.scrollTo(0, 0);
    if (currentView) { const hd = $('#view-' + view + ' h2'); if (hd) { hd.tabIndex = -1; hd.focus({ preventScroll: true }); } }
  }
  currentView = view;
}
const go = hash => { if (location.hash === hash) route(); else location.hash = hash; };

/* ---------- RENCANA ---------- */
const state = { params: null, plan: null, variant: 0, offset: 0 };
const envCls = s => (s >= 0.66 ? 'ok' : s >= 0.4 ? 'warn' : 'bad');
const mkItem = (d, di) => { const e = ENV.scoreFor(d, state.offset + di); return { id: d.id, nama: d.nama, cost: d.cost, sc: e.s, pf: 0.6, env: e.s, reasons: e.reasons, food: d.tags.includes('kuliner') }; };
const planCost = plan => plan.reduce((a, day) => a + day.cells.reduce((b, c) => b + c.items.reduce((x, i) => x + i.cost, 0), 0), 0);
const plannedIds = v => new Set(v.plan.flatMap(d => d.cells.flatMap(c => c.items.map(i => i.id))));
// Hari mulai relatif ke hari ini: rencana minggu depan tidak dinilai dengan langit hari ini.
function dayOffset(date) {
  if (!date) return 0;
  const ms = Date.parse(date + 'T00:00:00Z') - Date.parse(todayLocal() + 'T00:00:00Z');
  return Math.max(0, Math.round(ms / 86400000));
}

function renderPlan() {
  const P = state.plan;
  const has = P && P.variants && P.variants.length;
  $('#plan-empty').hidden = !!has;
  $('#plan-body').hidden = !has;
  if (!has) return;
  const v = P.variants[state.variant] || P.variants[0];
  $('#variant-tabs').innerHTML = P.variants.map((vv, i) =>
    '<button type="button" class="variant" data-variant="' + i + '" aria-pressed="' + (i === state.variant) + '"><b>' + esc(vv.nama) + '</b><span>' + fmtRp(vv.cost) + ' per orang</span></button>').join('');
  const beyond = state.offset > ENV.days.length - 1;
  $('#plan-meta').textContent =
    (P.visited ? 'Raun menimbang ' + fmtN(P.visited) + ' kombinasi. ' : '') +
    'Versi ' + v.nama + ': ' + v.desk + '. Perkiraan biaya ' + fmtRp(v.cost) + ' per orang' +
    (state.params && state.params.budget ? ', budget ' + fmtRp(state.params.budget) : '') + '.' +
    (beyond ? ' Perkiraan cuaca untuk tanggal itu belum ada, jadi Raun memakai kondisi terakhir. Cek lagi menjelang berangkat.' : '');
  $('#timeline').innerHTML = v.plan.map((day, di) => {
    const envd = ENV.days[Math.min(state.offset + di, ENV.days.length - 1)] || { pm25: '?', rain: 0 };
    let n = 0, sub = 0, food = false;
    const slots = day.cells.map((cell, ci) => cell.items.map((it, k) => {
      const d = byId(it.id); if (!d) return '';
      const e = ENV.scoreFor(d, state.offset + di);
      n++; sub += d.cost; food = food || d.tags.includes('kuliner');
      return '<div class="slot"><div class="slot-time"><b>' + esc(cell.slot.label) + '</b><span>' + esc(cell.slot.jam || '') + '</span></div>' +
        '<div class="item' + (it.swapped ? ' swapped' : '') + '">' +
        '<i class="dot" data-c="' + envCls(e.s) + '" title="Kelayakan langit ' + Math.round(e.s * 100) + ' dari 100"></i>' +
        '<div class="item-main"><h4>' + esc(d.nama) + '</h4>' +
        '<div class="muted small">' + fmtCost(d.cost) + ', ' + esc(d.jam) + (d.indoor ? ', indoor' : '') + '</div>' +
        (e.reasons.length ? '<div class="warnline">Perhatian: ' + esc(e.reasons.join(', ')) + '</div>' : '') +
        '<div class="acts">' +
        '<button type="button" class="chip" data-act="detail" data-id="' + esc(d.id) + '">Detail</button>' +
        extLink(mapsDir(d), 'Rute') +
        '<button type="button" class="chip" data-act="swap" data-day="' + di + '" data-cell="' + ci + '" data-k="' + k + '">Ganti tempat</button>' +
        '<details class="more"><summary class="chip">Lainnya</summary><div class="more-list">' +
        '<button type="button" class="chip" data-act="qris" data-id="' + esc(d.id) + '">QRIS</button>' +
        '<button type="button" class="chip" data-act="gojek" data-id="' + esc(d.id) + '">Gojek</button>' +
        '<button type="button" class="chip" data-act="otsok" data-id="' + esc(d.id) + '">Otsok</button>' +
        '</div></details></div></div></div></div>';
    }).join('')).join('');
    return '<article class="day"><div class="day-head"><h3>Hari ' + (di + 1) + '</h3>' +
      '<span class="day-env"><i class="dot" data-c="' + ENV.state(envd) + '"></i>PM2.5 ' + val(envd.pm25) + ', hujan ' + val(envd.rain, ' mm') + (envd.flood ? ', waspada luapan' : '') + '</span></div>' +
      slots + '<div class="day-foot"><span>' + n + ' tempat, ' + (food ? 'sudah termasuk makan' : 'belum ada tempat makan') + '</span><span>Subtotal ' + fmtRp(sub) + '</span></div></article>';
  }).join('');
  drawMap(v);
}

function swapItem(di, ci, k) {
  const v = state.plan.variants[state.variant];
  const cell = v.plan[di] && v.plan[di].cells[ci];
  const cur = cell && cell.items[k];
  const curD = cur && byId(cur.id);
  if (!curD) return;
  const g = Object.keys(GROUPS).find(gg => GROUPS[gg].includes(curD.zone)) || 'kota';
  const used = plannedIds(v);
  const prefs = (state.params && state.params.prefs) || [];
  const pool = D.DESTINASI.filter(d => GROUPS[g].includes(d.zone) && cell.slot.ok.includes(d.slot) && !used.has(d.id) &&
    !(ENV.state(ENV.days[state.offset + di]) === 'flood' && d.lowland));
  if (!pool.length) { toast('Belum ada pengganti yang aman di area ini. Coba ganti di slot lain.'); return; }
  // Skor langit + bonus minat, dihitung sekali per kandidat.
  const pick = pool.map(d => { const sky = ENV.scoreFor(d, state.offset + di).s; return { d, s: sky, rank: sky + (d.tags.some(t => prefs.includes(t)) ? 0.2 : 0) }; })
    .reduce((a, b) => (b.rank > a.rank ? b : a));
  const best = pick.d;
  cell.items[k] = Object.assign(mkItem(best, di), { swapped: true });
  v.cost = planCost(v.plan);
  bump('swap');
  renderPlan();
  toast('Diganti dengan ' + best.nama + '. Skor langit ' + Math.round(pick.s * 100) + ' dari 100.');
}

/* ---------- PETA (Leaflet + OSM; skematik bila offline) ---------- */
let leafletMap = null, pinLayer = null;
function drawMap(v) { return window.L ? realMap(v) : schematicMap(v); }
function realMap(v) {
  const el = $('#map');
  $('#map-fallback').hidden = true; el.hidden = false;
  if (!leafletMap) {
    leafletMap = L.map(el, { scrollWheelZoom: false }).setView([-2.2088, 113.9213], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(leafletMap);
    pinLayer = L.layerGroup().addTo(leafletMap);
  }
  setTimeout(() => leafletMap.invalidateSize(), 150);
  pinLayer.clearLayers();
  const planned = plannedIds(v), bounds = [];
  D.DESTINASI.forEach(d => {
    const on = planned.has(d.id);
    const icon = L.divIcon({ className: '', iconSize: [24, 28], iconAnchor: [12, 26], html: '<div class="pin' + (on ? ' on' : '') + '"></div>' });
    L.marker([d.lat, d.lng], { icon, title: d.nama, alt: d.nama, zIndexOffset: on ? 500 : 0 }).addTo(pinLayer)
      .bindPopup('<b>' + esc(d.nama) + '</b><br><span class="muted small">' + fmtCost(d.cost) + ', ' + esc(d.jam) + '</span><br>' +
        '<button type="button" class="chip" data-act="detail" data-id="' + esc(d.id) + '">Detail</button> ' +
        '<a href="' + mapsDir(d) + '" target="_blank" rel="noopener">Rute</a>');
    if (on) bounds.push([d.lat, d.lng]);
  });
  if (bounds.length) leafletMap.fitBounds(bounds, { padding: [34, 34], maxZoom: 14 });
}
function schematicMap(v) {
  $('#map').hidden = true;
  const fb = $('#map-fallback'); fb.hidden = false;
  const planned = plannedIds(v);
  let out = '<svg viewBox="0 0 400 480" role="img" aria-label="Peta skematik, peta online tidak tersedia" style="width:100%;border-radius:10px;background:#EEF3EA">' +
    '<path d="M 208 -10 C 200 90, 176 180, 168 260 C 160 340, 176 420, 186 500" fill="none" stroke="#9EC3D8" stroke-width="16" stroke-linecap="round"/>' +
    '<text x="228" y="30" font-size="11" fill="#33586B" transform="rotate(78 228 30)">Sungai Kahayan</text>';
  D.DESTINASI.forEach(d => {
    const on = planned.has(d.id);
    out += '<circle cx="' + (200 + d.x * 170) + '" cy="' + (240 - d.y * 215) + '" r="' + (on ? 7 : 4) + '" fill="' + (on ? '#8B1E1E' : '#B9AE97') + '" stroke="#fff" stroke-width="2"><title>' + esc(d.nama) + '</title></circle>';
  });
  fb.innerHTML = out + '<text x="12" y="466" font-size="10" fill="#4F4840">Peta skematik (offline)</text></svg>';
}

/* ---------- ILUSTRASI: kartu pos berlapis, deterministik per seed ---------- */
function hashSeed(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
const SCENE = {
  alam: ['#DFF3E4', '#8FD4A8', '#3E8E63', '#FFF8E1'], budaya: ['#FFE3C2', '#F2A65A', '#B4532A', '#FFF6E8'],
  kuliner: ['#FFE9C9', '#F6B352', '#C97B2D', '#FFF9EE'], keluarga: ['#DDF0FA', '#8FC3E0', '#2C5D8F', '#F4FAFD'],
  air: ['#D6F0F5', '#7EC3D8', '#1F6E8C', '#F2FBFD'], sunset: ['#FFE1BE', '#F2A65A', '#C4552D', '#FFF3DC'],
  hiking: ['#E8F0D8', '#A8C77E', '#4A6741', '#FBF9EF'], indoor: ['#E9E4F8', '#B0A5DC', '#4B3D86', '#F7F5FC'],
  sejarah: ['#F2E4CC', '#D2B183', '#6B4E2E', '#FBF5EA'], foto: ['#EFE1F6', '#C4A0D2', '#6B4A7A', '#FAF4FC'],
  campur: ['#F5E8C8', '#E0BE72', '#7A5C2E', '#FDFAF0']
};
function sceneSVG(tema, seed, H) {
  const P = SCENE[tema] || SCENE.keluarga;
  const key = hashSeed(String(seed || tema));
  const r = CORE.mulberry(key);
  const W = 400, horizon = H * 0.62, waterY = H * 0.72;
  const sunX = 70 + r() * 260, sunY = 24 + r() * (horizon - 60), sunR = 15 + r() * 10;
  const ridge = (y, amp, color) => { let d = 'M0 ' + H + ' L0 ' + y; for (let x = 0; x <= W; x += 50) d += ' Q' + (x + 25) + ' ' + (y - amp * (0.5 + r())).toFixed(1) + ' ' + (x + 50) + ' ' + (y - amp * r() * 0.6).toFixed(1); return '<path d="' + d + ' L' + W + ' ' + H + ' Z" fill="' + color + '"/>'; };
  const forest = (y, color) => { let d = 'M0 ' + H + ' L0 ' + y; for (let x = 0; x <= W; x += 18) d += ' q9 -' + (8 + r() * 12).toFixed(1) + ' 18 0'; return '<path d="' + d + ' L' + W + ' ' + H + ' Z" fill="' + color + '"/>'; };
  let water = '<rect x="0" y="' + waterY + '" width="' + W + '" height="' + (H - waterY) + '" fill="' + P[0] + '" opacity=".85"/>';
  for (let i = 0; i < 6; i++) {
    const ly = waterY + 6 + i * (H - waterY) / 7, lw = 30 + r() * 80, lx = sunX - lw / 2 + (r() - 0.5) * 40;
    water += '<rect x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" width="' + lw.toFixed(1) + '" height="2.4" rx="1.2" fill="' + P[2] + '" opacity="' + Math.max(0.08, 0.5 - i * 0.07).toFixed(2) + '"/>';
  }
  const boat = (tema === 'air' || tema === 'sunset') ? '<path d="M220 ' + (waterY + 6) + ' q10 -9 24 -9 q14 0 22 9 z" fill="#1A0E08" opacity=".9"/>' : '';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="sk' + key + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P[0] + '"/><stop offset=".55" stop-color="' + P[1] + '"/><stop offset="1" stop-color="' + P[2] + '"/></linearGradient></defs>' +
    '<rect width="' + W + '" height="' + H + '" fill="url(#sk' + key + ')"/>' +
    '<circle cx="' + sunX.toFixed(1) + '" cy="' + sunY.toFixed(1) + '" r="' + (sunR * 2.2).toFixed(1) + '" fill="#F6C453" opacity=".25"/>' +
    '<circle cx="' + sunX.toFixed(1) + '" cy="' + sunY.toFixed(1) + '" r="' + sunR.toFixed(1) + '" fill="' + P[3] + '"/>' +
    ridge(horizon - 6, 26, P[1]) + forest(horizon + 4, P[0]) + water + boat + '</svg>';
}

/* ---------- KATALOG ---------- */
const mapsDir = d => 'https://www.google.com/maps/dir/?api=1&destination=' + d.lat + ',' + d.lng + '&travelmode=driving';
const mapsSearch = (q, lat, lng) => 'https://www.google.com/maps/search/' + encodeURIComponent(q) + (lat ? '/@' + lat + ',' + lng + ',15z' : '');
const mapsNear = (d, what) => 'https://www.google.com/maps/search/' + encodeURIComponent(what) + '/@' + d.lat + ',' + d.lng + ',14z';
const badges = tags => '<div class="badges">' + tags.map(t => '<span class="badge">' + esc(tagLabel(t)) + '</span>').join('') + '</div>';
const potong = (s, n) => { if (!s || s.length <= n) return s; const cut = s.lastIndexOf(' ', n); return s.slice(0, cut > 0 ? cut : n) + '…'; };

function cardDest(d, focusTag) {
  // Tag yang sedang difilter tampil duluan, supaya alasan kartu ini muncul selalu terlihat.
  const tags = focusTag && d.tags.includes(focusTag) ? [focusTag].concat(d.tags.filter(t => t !== focusTag)) : d.tags;
  const fav = FAV.s.ids.includes(d.id);
  return '<article class="card">' +
    '<div class="cover">' + sceneSVG(d.tags[0] || 'campur', d.id, 120) + '</div>' +
    '<button type="button" class="fav-btn" data-fav="' + esc(d.id) + '" aria-pressed="' + fav + '" aria-label="Simpan ' + esc(d.nama) + ' ke favorit"><svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg></button>' +
    '<div class="body"><h3>' + esc(d.nama) + '</h3>' + badges(tags.slice(0, 3)) +
    '<p>' + esc(potong(d.desc, 110)) + '</p>' +
    '<div class="meta">' + fmtCost(d.cost) + ', ' + esc(d.jam) + (d.indoor ? ', indoor' : '') + '</div>' +
    '<div class="acts"><button type="button" class="chip" data-act="detail" data-id="' + esc(d.id) + '">Detail</button>' +
    extLink(mapsDir(d), 'Rute') + '</div></div></article>';
}
let destFilter = 'semua';
function setDestFilter(f) {
  destFilter = f;
  $$('#dest-filters [data-tag]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tag === f)));
  let list = D.DESTINASI;
  if (f === 'favorit') list = list.filter(d => FAV.s.ids.includes(d.id));
  else if (f !== 'semua') list = list.filter(d => d.tags.includes(f) || (f === 'indoor' && d.indoor));
  $('#dest-grid').innerHTML = list.length ? list.map(d => cardDest(d, f)).join('') :
    '<p class="empty">' + (f === 'favorit' ? 'Belum ada favorit. Ketuk ikon hati di kartu tempat untuk menyimpannya di sini.' : 'Belum ada tempat untuk kategori ini. Coba kategori lain.') + '</p>';
}
function setSiapFilter(f) {
  $$('#siap-filters [data-tema]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tema === f)));
  $('#siap-grid').innerHTML = D.SIAP_PAKAI.filter(t => f === 'semua' || t.tema === f).map(t => {
    const dests = t.plan.flat().map(byId).filter(Boolean);
    const cost = dests.reduce((a, d) => a + d.cost, 0);
    return '<article class="card"><div class="cover">' + sceneSVG(t.tema, t.id, 110) + '</div>' +
      '<div class="body"><h3>' + esc(t.nama) + '</h3>' +
      '<div class="badges"><span class="badge">' + esc(tagLabel(t.tema)) + '</span><span class="badge">' + t.hari + ' hari</span><span class="badge">' + dests.length + ' tempat</span></div>' +
      '<p>' + esc(dests.slice(0, 4).map(d => d.nama.split(',')[0]).join(', ')) + (dests.length > 4 ? ', dan lainnya' : '') + '</p>' +
      '<div class="meta">' + fmtRp(cost) + ' per orang, belum termasuk transport</div>' +
      '<div class="acts"><button type="button" class="btn btn-quiet btn-block" data-act="runsiap" data-id="' + esc(t.id) + '">Pakai rencana ini</button></div></div></article>';
  }).join('') || '<p class="empty">Belum ada rencana jadi untuk tema ini.</p>';
}
function textCard(title, body, meta, actHtml, extra) {
  return '<article class="card card-text"><h3>' + esc(title) + '</h3>' + (extra || '') + '<p>' + esc(body) + '</p>' +
    (meta ? '<div class="meta">' + esc(meta) + '</div>' : '') + '<div class="acts">' + actHtml + '</div></article>';
}
function renderStatic() {
  $('#kuliner-grid').innerHTML = D.KULINER.map(x => textCard(x.nama, x.desc, x.tips, extLink(mapsSearch(x.nama + ' Palangka Raya'), 'Cari penjual di Maps'))).join('');
  $('#hotel-grid').innerHTML = D.HOTEL.map(x => textCard(x.nama, x.catatan, x.area + ', ' + x.rentang, extLink(mapsSearch(x.nama + ' Palangka Raya', x.lat, x.lng), 'Cari di Maps'))).join('');
  $('#kafe-grid').innerHTML = D.KAFE.map(x => textCard(x.nama, x.catatan, x.area + ', ' + x.rentang, extLink(mapsSearch(x.nama + ' Palangka Raya', x.lat, x.lng), 'Cari di Maps'))).join('');
  $('#regional-grid').innerHTML = D.REGIONAL.map(x => textCard(x.nama, x.desc, x.akses, extLink(mapsSearch(x.nama + ' Kalimantan Tengah'), 'Lihat di Maps'), badges([x.wilayah]))).join('');
  $('#umkm-grid').innerHTML = ['kulinerpatin', 'oleholeh', 'pasarmalam', 'danautahai', 'kopisore'].map(byId).map(d =>
    textCard(d.nama, 'Warung mitra demo. Tiap transaksi memberi satu stempel Pas Raun.', '', '<button type="button" class="chip" data-act="qris" data-id="' + esc(d.id) + '">Buka QRIS</button>')).join('');
  const ev = $('#events');
  if (ev) ev.innerHTML = D.EVENTS.map(e => '<li><b>' + esc(e.nama) + '</b><span>' + esc(e.kira) + '</span><p class="muted small">' + esc(e.catatan) + '</p></li>').join('');
}

/* ---------- PAS RAUN ---------- */
function renderPas() {
  const have = PAS.s.stamps.length;
  let html = '';
  for (let i = 0; i < 5; i++) html += '<span class="stamp-slot' + (i < have ? ' on' : '') + '" aria-hidden="true">' + (i < have ? '<svg class="ic"><use href="#i-ticket"/></svg>' : '') + '</span>';
  $('#pasraun-stamps').innerHTML = html + '<b>' + have + ' dari 5</b>' + (have >= 5 ? '<span class="muted">, siap ditukar</span>' : '');
  $('#stamp-count').textContent = have + '/5';
}
function addStamp(id) {
  if (!byId(id)) return;
  if (!PAS.s.stamps.includes(id)) PAS.s.stamps.push(id);
  PAS.save(); renderPas(); closeDialogs();
  toast(PAS.s.stamps.length >= 5 ? 'Paspor penuh. Tukar suvenir di kios oleh-oleh mitra (demo).' : 'Stempel ke-' + PAS.s.stamps.length + ' masuk. Kumpulkan lima untuk suvenir.');
}

/* ---------- DIALOG ---------- */
function openDialog(id) { const dl = $('#' + id); if (!dl.open) dl.showModal(); return dl; }
function closeDialogs() { $$('dialog[open]').forEach(dl => dl.close()); }
const fotoKey = id => 'raun_foto_' + id;

function openDetail(id) {
  const d = byId(id); if (!d) return;
  bump('destViews', id);
  let saved = null;
  try { saved = localStorage.getItem(fotoKey(id)); } catch (e) { /* abaikan */ }
  if (saved && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(saved)) saved = null;
  $('#detail-title').textContent = d.nama;
  $('#detail-body').innerHTML =
    '<p class="detail-desc">' + esc(d.desc) + '</p>' +
    (d.etika ? '<p class="callout warn"><b>Adab:</b> ' + esc(d.etika) + '</p>' : '') +
    '<dl class="kv"><dt>Biaya</dt><dd>' + fmtCost(d.cost) + '</dd><dt>Jam buka</dt><dd>' + esc(d.jam) + '</dd>' +
    '<dt>Tipe</dt><dd>' + (d.indoor ? 'Indoor, aman saat asap atau hujan' : 'Outdoor') + (d.lowland ? '. Area rendah, cek luapan dulu' : '') + '</dd>' +
    '<dt>Cocok untuk</dt><dd>' + esc(d.tags.map(tagLabel).join(', ')) + '</dd></dl>' +
    (d.tips ? '<p class="muted">' + esc(d.tips) + '</p>' : '') +
    '<div class="acts">' + extLink(mapsDir(d), 'Rute ke sini') + extLink(mapsNear(d, 'hotel'), 'Hotel sekitar') +
    extLink(mapsNear(d, 'restoran'), 'Makan sekitar') + extLink(mapsNear(d, 'kafe'), 'Ngopi sekitar') + '</div>' +
    '<p style="margin-top:1rem"><button type="button" class="btn btn-maroon" data-act="qris" data-id="' + esc(d.id) + '">Buka QRIS</button></p>' +
    '<div class="photo"><h3>Kondisi terkini dari pengunjung</h3>' +
    (saved ? '<img src="' + saved + '" alt="Foto kondisi ' + esc(d.nama) + ' dari pengunjung" width="520" height="320" loading="lazy">' +
      '<button type="button" class="chip" data-act="fotodel" data-id="' + esc(d.id) + '">Hapus foto</button>'
      : '<p class="muted small">Belum ada foto. Bagikan kondisi tempat ini untuk pengunjung berikutnya.</p>') +
    '<label class="field" style="margin-top:.5rem">Unggah foto (maks. 400 KB)<input type="file" accept="image/png,image/jpeg,image/webp" id="foto-input"></label></div>';
  $('#foto-input').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { toast('Format foto belum didukung. Pakai JPG, PNG, atau WebP.'); return; }
    if (f.size > 400000) { toast('Foto lebih dari 400 KB. Kecilkan dulu lalu unggah lagi.'); return; }
    const rd = new FileReader();
    rd.onload = () => {
      try { localStorage.setItem(fotoKey(id), String(rd.result)); } catch (err) { toast('Penyimpanan perangkat penuh. Hapus foto lain dulu.'); return; }
      toast('Foto tersimpan di perangkat ini.'); openDetail(id);
    };
    rd.readAsDataURL(f);
  };
  openDialog('dlg-detail');
}

function loadQrLib() {
  if (window.qrcode) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/qrcode.js'; s.onload = res; s.onerror = () => rej(new Error('qr'));
    document.head.appendChild(s);
  });
}
async function openQris(id) {
  const d = byId(id); if (!d) return;
  bump('qr');
  let qr = '<p class="empty center">QR belum bisa dibuat di perangkat ini.</p>';
  try {
    await loadQrLib();
    const q = window.qrcode(0, 'M');
    q.addData('DEMO QRIS Raun Kalteng | merchant: ' + d.nama + ' | payload uji tanpa dana');
    q.make();
    qr = '<div class="qr">' + q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) + '</div>';
  } catch (e) { /* tampilkan pesan kosong */ }
  $('#detail-title').textContent = 'QRIS ' + d.nama;
  $('#detail-body').innerHTML = qr +
    '<p class="muted small center">Demo: QR berisi teks uji, bukan QRIS asli, tanpa uang. Versi rilis memakai QRIS dinamis dari mitra pembayaran.</p>' +
    '<button type="button" class="btn btn-maroon btn-block" data-act="stamp" data-id="' + esc(d.id) + '">Tandai stempel Pas Raun</button>';
  openDialog('dlg-detail');
}

/* ---------- WIZARD ---------- */
function openWizard() {
  const inp = $('#wz-date');
  inp.min = todayLocal();
  if (!inp.value || inp.value < inp.min) inp.value = inp.min;
  $('#wz-status').textContent = 'Raun menimbang paling sedikit 99.999 kombinasi, lalu memilih tiga yang paling masuk akal.';
  openDialog('dlg-wizard');
}
function runWizard(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const prefs = fd.getAll('pref');
  const st = $('#wz-status');
  if (!prefs.length) { st.textContent = 'Pilih minimal satu minat dulu.'; $('#wz-prefs input').focus(); return; }
  const params = { date: fd.get('date'), days: +fd.get('days') || 1, pax: Math.max(1, +fd.get('pax') || 1), budget: +fd.get('budget') || 250000, prefs, start: fd.get('start') };
  const btn = $('#wz-go'), label = $('span', btn);
  btn.disabled = true; label.textContent = 'Menyusun…';
  setTimeout(() => {
    const offset = dayOffset(params.date);
    const envDays = ENV.days.length ? ENV.days.slice(Math.min(offset, ENV.days.length - 1)) : null;
    const r = CORE.generate(Object.assign({}, params, { destinasi: D.DESTINASI }), CORE.makeEnv(envDays, ENV.mode));
    btn.disabled = false; label.textContent = 'Susun rencana';
    if (!r.variants.length) { st.textContent = 'Budget belum cukup untuk ' + params.days + ' hari. Naikkan budget atau kurangi lama jalan.'; return; }
    state.params = params; state.plan = r; state.variant = 0; state.offset = offset;
    bump('gen');
    closeDialogs();
    go('#rencana');
    toast('Rencana siap. Dari ' + fmtN(r.visited) + ' kombinasi, ini tiga yang paling masuk akal.');
  }, 30);
}

/* ---------- RENCANA JADI & LINK BAGIKAN ---------- */
function buildPlan(dayIds) {
  return dayIds.map((slots, di) => ({ cells: SLOTS.map((slot, si) => ({ slot, items: (slots[si] || []).map(byId).filter(Boolean).map(d => mkItem(d, di)) })).filter(c => c.items.length) }));
}
function runSiap(id) {
  const t = D.SIAP_PAKAI.find(x => x.id === id); if (!t) return;
  state.offset = 0;
  const days = [];
  for (let i = 0; i < t.hari; i++) days.push(t.plan.slice(i * 4, i * 4 + 4));
  const plan = buildPlan(days);
  const cost = planCost(plan);
  state.params = { days: t.hari, budget: 0, prefs: [t.tema === 'campur' ? 'alam' : t.tema], pax: 2 };
  state.plan = { variants: [{ key: 'kurasi', nama: 'Kurasi Raun', desk: t.nama, plan, cost }], visited: 0 };
  state.variant = 0; bump('gen');
  go('#rencana');
  toast('"' + t.nama + '" siap. Cek tanda langit sebelum berangkat.');
}
const b64encode = str => btoa(String.fromCharCode(...new TextEncoder().encode(str)));
const b64decode = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
function sharePlan() {
  if (!state.plan) return;
  const payload = { p: state.params, v: state.variant, s: state.plan.variants.map(x => ({ n: x.nama, plan: x.plan.map(d => ({ i: SLOTS.map(s => { const c = d.cells.find(cc => cc.slot.k === s.k); return c ? c.items.map(i => i.id) : []; }) })) })) };
  const url = location.origin + location.pathname + '#plan=' + b64encode(JSON.stringify(payload));
  if (navigator.share) { navigator.share({ title: 'Rencana raun di Palangka Raya', url }).catch(() => {}); return; }
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
    .then(() => toast('Link rencana tersalin. Tempel di chat untuk teman atau keluarga.'))
    .catch(() => { history.replaceState(null, '', '#plan=' + url.split('#plan=')[1]); toast('Salin link dari address bar untuk membagikan rencana.'); });
}
function loadShared(b64) {
  let parsed = null;
  try { parsed = CORE.parseShared(JSON.parse(b64decode(b64)), new Set(DEST.keys())); } catch (e) { parsed = null; }
  if (!parsed) { toast('Link rencana rusak atau tidak lengkap. Minta temanmu mengirim ulang.'); return false; }
  state.offset = 0;
  state.params = parsed.params;
  state.plan = { visited: 0, variants: parsed.variants.map(x => { const plan = buildPlan(x.days); return { key: 'bagikan', nama: x.nama, desk: 'rencana kiriman teman', plan, cost: planCost(plan) }; }) };
  state.variant = parsed.variant;
  history.replaceState(null, '', '#rencana');
  route();
  toast('Ini rencana kiriman temanmu. Cek langitnya dulu sebelum berangkat.');
  return true;
}

/* ---------- TRANSPORT ---------- */
function gojekOrder(d) {
  try { navigator.clipboard && navigator.clipboard.writeText(d.nama + ', ' + d.lat + ',' + d.lng); } catch (e) { /* abaikan */ }
  const t0 = Date.now();
  window.location.href = 'gojek://';
  setTimeout(() => {
    if (!document.hidden && Date.now() - t0 < 2200) {
      toast('Aplikasi Gojek tidak ditemukan. Membuka halaman unduhnya.');
      window.open('https://play.google.com/store/apps/details?id=com.gojek.app', '_blank', 'noopener');
    } else toast('Tujuan tersalin: ' + d.nama + '. Tempel di kolom tujuan Gojek.');
  }, 1500);
}
function otsokOrder(d) {
  const start = (state.params && state.params.start) || 'Tugu Soekarno';
  const msg = 'Halo, saya pakai Raun Kalteng (demo).\nJemput: ' + start + '\nTujuan: ' + d.nama + '\nPerkiraan tarif demo sekitar Rp40.000\nApakah perahu atau ojek tersedia?';
  window.open('https://wa.me/620811000000?text=' + encodeURIComponent(msg), '_blank', 'noopener');
}
function waStatus() {
  const d0 = ENV.days[0] || {};
  const msg = 'Langit Palangka Raya: ' + STATE_WORD[ENV.state()] + ', PM2.5 sekitar ' + (d0.pm25 == null ? 'belum terbaca' : d0.pm25) + ', hujan ' + (d0.rain == null ? 'belum terbaca' : d0.rain + ' mm') + '. ' + ADVICE[ENV.state()] + ' (Raun Kalteng)';
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
}
let watchTimer = null;
function toggleWatch() {
  const btn = $('#btn-watch');
  if (watchTimer) { clearInterval(watchTimer); watchTimer = null; btn.setAttribute('aria-pressed', 'false'); toast('Pantauan langit dimatikan.'); return; }
  const start = () => {
    let last = ENV.state();
    // Ambil data baru tiap 10 menit, lalu bandingkan status.
    watchTimer = setInterval(async () => {
      if (ENV.mode === 'live') await ENV.refresh();
      const now = ENV.state();
      if (now !== last) {
        const msg = 'Langit berubah jadi ' + STATE_WORD[now] + '. ' + ADVICE[now];
        if (window.Notification && Notification.permission === 'granted') { try { new Notification('Raun Kalteng', { body: msg, icon: 'icon.svg' }); } catch (e) { /* abaikan */ } }
        toast(msg);
        last = now;
      }
    }, 600000);
    btn.setAttribute('aria-pressed', 'true');
    toast('Raun akan mengabari kalau langit berubah. Dicek tiap 10 menit selama halaman terbuka.');
  };
  if (window.Notification && Notification.permission === 'default') Notification.requestPermission().finally(start);
  else start();
}

/* ---------- ASISTEN ---------- */
const actBtn = (act, label, id) => '<button type="button" class="chip" data-act="' + act + '"' + (id ? ' data-id="' + esc(id) + '"' : '') + '>' + esc(label) + '</button>';
function chatAdd(who, html, acts) {
  const m = document.createElement('div');
  m.className = 'msg ' + who;
  if (who === 'user') m.textContent = html; else m.innerHTML = html + (acts ? '<div class="acts">' + acts + '</div>' : '');
  const log = $('#chat-log'); log.appendChild(m); log.scrollTop = log.scrollHeight;
}
const destByName = q => { const t = q.toLowerCase(); return D.DESTINASI.find(d => t.includes(d.nama.toLowerCase().split(',')[0])) || D.DESTINASI.find(d => d.nama.toLowerCase().includes(t)); };
function botReply(q) {
  const t = q.toLowerCase();
  const has = (...ws) => ws.some(w => t.includes(w));
  let cat = 'lain';
  if (has('asap', 'udara', 'pm2', 'ispu', 'karhutla', 'kabut', 'langit')) {
    cat = 'udara'; const d0 = ENV.days[0] || {}; const st = ENV.state();
    chatAdd('bot', 'Langit Palangka Raya sekarang <b>' + esc(STATE_WORD[st]) + '</b>: PM2.5 sekitar ' + val(d0.pm25) + ', hujan ' + val(d0.rain, ' mm') + '. ' + esc(ADVICE[st]), st === 'ok' ? '' : actBtn('openwizard', 'Susun rencana aman'));
  } else if (has('banjir', 'luapan', 'hujan')) {
    cat = 'banjir';
    chatAdd('bot', 'Luapan Kahayan biasanya naik saat hujan di atas 60 mm sehari, seperti Desember 2023 dan 2024 di sekitar Jl. Anoi. Mode Banjir melewatkan area rendah.', actBtn('flood', 'Coba mode Banjir'));
  } else if (has('qris', 'bayar', 'pas raun', 'stempel', 'paspor')) {
    cat = 'qris';
    chatAdd('bot', 'Tiap tempat berbayar punya tombol QRIS. Satu transaksi memberi satu stempel Pas Raun, dan lima stempel bisa ditukar suvenir UMKM.', '<a class="chip" href="#paspor">Buka Pas Raun</a>');
  } else if (has('menginap', 'hotel', 'penginapan', 'ngopi', 'kafe', 'kopi')) {
    cat = 'menginap';
    chatAdd('bot', 'Pilihan menginap dan tempat ngopi ada di halaman Jelajah. Dari detail tempat, ketuk Hotel sekitar atau Ngopi sekitar untuk membuka Google Maps.', '<a class="chip" href="#jelajah">Buka Jelajah</a>');
  } else if (has('tanjung puting', 'kumai', 'sekonyer', 'luar kota', 'luar pky', 'pangkalan bun')) {
    cat = 'regional';
    chatAdd('bot', 'Di luar Palangka Raya ada Tanjung Puting dan Sungai Sekonyer, Danau Sembuluh, Bukit Sepat, sampai Betang Tumbang Malahoi. Semuanya ada di bagian bawah halaman Jelajah.', '<a class="chip" href="#jelajah">Buka Jelajah</a>');
  } else if (has('kuliner', 'makan', 'patin', 'garam', 'wadi')) {
    cat = 'kuliner';
    chatAdd('bot', 'Yang wajib dicoba: patin bakar dan terubuk, garam basah basi untuk oleh-oleh, dan malam di pasar riverfront.', actBtn('detail', 'Warung Patin', 'kulinerpatin') + actBtn('detail', 'Pusat Oleh-oleh', 'oleholeh') + actBtn('detail', 'Pasar Malam', 'pasarmalam'));
  } else if (has('sebangau', 'orangutan', 'gohong', 'kaja')) {
    cat = 'sebangau';
    chatAdd('bot', 'Gerbang Sebangau ada di Sei Gohong. Orangutan bisa dilihat dari perahu di Pulau Kaja, pukul 08.00 sampai 15.00, dengan jarak yang wajib dijaga.', actBtn('detail', 'Sei Gohong', 'seigohong') + actBtn('detail', 'Pulau Kaja', 'pulaukaja'));
  } else if (has('sandung', 'bukit rawi', 'budaya', 'museum', 'dayak')) {
    cat = 'budaya';
    chatAdd('bot', 'Untuk budaya, mulai dari Museum Balanga (indoor), atau sisihkan sehari penuh untuk Bukit Rawi. Bukit Rawi situs sakral, jadi ikuti adabnya.', actBtn('detail', 'Museum Balanga', 'balanga') + actBtn('detail', 'Bukit Rawi', 'bukitrawi'));
  } else if (has('itinerary', 'rencana', 'raun', 'ke mana', 'kemana', 'jalan')) {
    cat = 'itinerary';
    chatAdd('bot', 'Sebut tanggal, lama jalan, dan budget. Raun menimbang paling sedikit 99.999 kombinasi, lalu memberi tiga versi: Santai, Padat, dan Hemat.', actBtn('openwizard', 'Susun rencana'));
  } else if (destByName(q)) {
    cat = 'destinasi'; const d = destByName(q);
    chatAdd('bot', '<b>' + esc(d.nama) + '</b>. ' + esc(d.desc), actBtn('detail', 'Detail', d.id) + actBtn('qris', 'QRIS', d.id));
  } else if (has('halo', 'hai', 'pagi', 'siang', 'sore', 'malam', 'salam')) {
    cat = 'sapaan';
    chatAdd('bot', 'Halo juga. Mau tanya kondisi langit, cari makan, atau langsung susun rencana?', actBtn('openwizard', 'Susun rencana'));
  } else {
    chatAdd('bot', 'Raun belum punya jawaban untuk itu. Data lokal saja, biar hemat kuota. Coba tanya soal asap, banjir, kuliner, Sebangau, Bukit Rawi, QRIS, atau sebut nama tempat.', actBtn('openwizard', 'Susun rencana'));
  }
  bump('queries', cat);
}
function toggleChat(open) {
  const p = $('#chat-panel'), fab = $('#chat-fab');
  p.hidden = !open; fab.setAttribute('aria-expanded', String(open));
  if (open) {
    if (!$('#chat-log').children.length) chatAdd('bot', 'Halo, Raun di sini. Mau tanya langit hari ini, makanan enak, atau urusan Sebangau?', actBtn('openwizard', 'Susun rencana'));
    $('#chat-input').focus();
  } else fab.focus();
}

/* ---------- DASBOR ---------- */
function renderDashboard() {
  const s = STATS.s;
  $('#d-gen').textContent = fmtN(s.gen);
  $('#d-q').textContent = fmtN(Object.values(s.queries).reduce((a, b) => a + b, 0));
  $('#d-qr').textContent = fmtN(s.qr);
  $('#d-swap').textContent = fmtN(s.swap);
  $('#d-stamp').textContent = PAS.s.stamps.length;
  $('#d-fav').textContent = FAV.s.ids.length;
  const tops = Object.entries(s.destViews).filter(([id]) => byId(id)).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = tops.length ? tops[0][1] : 1;
  $('#chart-dest').innerHTML = tops.length ? tops.map(([id, n]) =>
    '<div class="bar-row"><span>' + esc(byId(id).nama) + '</span><span class="bar"><i style="width:' + Math.round(n / max * 100) + '%"></i></span><b>' + n + '</b></div>').join('')
    : '<p class="muted small">Belum ada tempat yang dibuka. Buka detail tempat di Jelajah, angkanya muncul di sini.</p>';
  drawAqi();
}
function drawAqi() {
  const cv = $('#chart-aqi'); const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return;
  const cs = getComputedStyle(document.documentElement);
  const ink2 = cs.getPropertyValue('--ink-2').trim() || '#4F4840', bad = cs.getPropertyValue('--bad').trim() || '#B3261E', line = cs.getPropertyValue('--line').trim() || '#D6D9D0';
  const h = STATS.s.envHist || [];
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = ink2;
  if (h.length < 2) { ctx.fillText('Riwayat terkumpul tiap kali data live dibaca.', 14, 92); cv.setAttribute('aria-label', 'Riwayat PM2.5 belum cukup untuk grafik'); return; }
  const vs = h.map(x => x.v), max = Math.max(120, ...vs);
  const y = v => cv.height - 18 - (v / max) * (cv.height - 40);
  ctx.strokeStyle = line; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(10, y(55)); ctx.lineTo(cv.width - 10, y(55)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillText('batas sehat 55', cv.width - 110, y(55) - 6);
  ctx.beginPath();
  vs.forEach((v, i) => { const x = 10 + i / (vs.length - 1) * (cv.width - 20); i ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); });
  ctx.strokeStyle = bad; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillText('PM2.5, tertinggi ' + Math.max(...vs), 10, 16);
  cv.setAttribute('aria-label', 'Riwayat PM2.5 dari ' + vs.length + ' pembacaan. Terakhir ' + vs[vs.length - 1] + ', tertinggi ' + Math.max(...vs) + '.');
}
function renderSimReport() {
  const get = f => fetch(f).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const bold = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  Promise.all([get('sim/results.json'), get('sim/feature-results.json'), get('sim/fuzz-results.json')]).then(([a, ft, fz]) => {
    let h = '<h3>Simulasi multi-agen</h3>';
    if (a) h += '<p><b>' + fmtN(a.agents) + '</b> wisatawan virtual diuji dalam ' + esc(a.scenarios) + ' skenario langit. Mesin menimbang <b>' + fmtN(a.totalNodes) + '</b> kombinasi dalam ' + fmtN(a.ms) + ' milidetik.</p>' +
      '<ul>' + (a.findings || []).map(f => '<li>' + bold(f) + '</li>').join('') + '</ul>';
    if (ft) h += '<p><b>Sapuan fitur:</b> ' + esc(ft.ruangTeoretis) + '. Prioritas berikutnya: ' + esc((ft.rekomendasiV1 || []).slice(0, 5).join(', ')) + '.</p>';
    if (fz) h += '<p><b>Uji input jahat:</b> ' + fmtN(fz.sesi) + ' sesi, status ' + esc(fz.status) + '. Crash ' + esc(fz.crashes) + ', pelanggaran budget ' + esc(fz.pelanggaran && fz.pelanggaran.budget) + ', destinasi dobel ' + esc(fz.pelanggaran && fz.pelanggaran.duplikatDestinasi) + '.</p>';
    if (!a && !ft && !fz) h += '<p class="muted">Hasil simulasi belum ada. Jalankan <code>node sim/agents.mjs</code>, <code>node sim/features.mjs</code>, dan <code>node sim/fuzz.mjs</code>, lalu muat ulang.</p>';
    $('#sim-report').innerHTML = h + '<p class="muted small">Simulasi deterministik, bisa diulang siapa saja.</p>';
  });
}

/* ---------- UTIL ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

/* ---------- EVENT ---------- */
function doAction(act, el) {
  const id = el.dataset.id;
  const d = id && byId(id);
  switch (act) {
    case 'detail': openDetail(id); break;
    case 'qris': openQris(id); break;
    case 'stamp': addStamp(id); break;
    case 'openwizard': openWizard(); break;
    case 'darurat': openDialog('dlg-darurat'); break;
    case 'flood': setMode('flood'); go('#beranda'); break;
    case 'runsiap': runSiap(id); break;
    case 'gojek': gojekOrder(d || byId('tugu')); break;
    case 'otsok': otsokOrder(d || byId('danautahai')); break;
    case 'swap': swapItem(+el.dataset.day, +el.dataset.cell, +el.dataset.k); break;
    case 'fotodel': try { localStorage.removeItem(fotoKey(id)); } catch (e) { /* abaikan */ } toast('Foto dihapus.'); openDetail(id); break;
  }
}
document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (act) { e.preventDefault(); doAction(act.dataset.act, act); return; }
  const fv = e.target.closest('[data-fav]');
  if (fv) {
    const id = fv.dataset.fav, on = !FAV.s.ids.includes(id);
    FAV.s.ids = on ? FAV.s.ids.concat(id) : FAV.s.ids.filter(x => x !== id); FAV.save();
    fv.setAttribute('aria-pressed', String(on));
    toast(on ? 'Disimpan ke favorit.' : 'Dihapus dari favorit.');
    if (destFilter === 'favorit') setDestFilter('favorit');
    return;
  }
  if (e.target.closest('[data-close]')) { e.target.closest('dialog').close(); return; }
  const v = e.target.closest('[data-variant]');
  if (v) { state.variant = +v.dataset.variant; renderPlan(); return; }
  const m = e.target.closest('[data-mode]');
  if (m) { setMode(m.dataset.mode); return; }
  const tema = e.target.closest('#siap-filters [data-tema]');
  if (tema) { setSiapFilter(tema.dataset.tema); return; }
  const tag = e.target.closest('#dest-filters [data-tag]');
  if (tag) { setDestFilter(tag.dataset.tag); history.replaceState(null, '', '#jelajah' + (tag.dataset.tag === 'semua' ? '' : '/' + tag.dataset.tag)); return; }
  // Klik di luar kotak dialog (backdrop) menutup dialog.
  if (e.target.tagName === 'DIALOG') {
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#chat-panel').hidden && $('#chat').contains(document.activeElement)) toggleChat(false); });
$('#form-wizard').addEventListener('submit', runWizard);
$('#wz-budget').addEventListener('input', e => { $('#wz-budget-label').textContent = fmtRp(+e.target.value); });
$('#btn-share').addEventListener('click', sharePlan);
$('#btn-print').addEventListener('click', () => window.print());
$('#btn-watch').addEventListener('click', toggleWatch);
$('#btn-wastatus').addEventListener('click', waStatus);
$('#pasraun-reset').addEventListener('click', () => {
  if (!PAS.s.stamps.length) { toast('Paspor masih kosong.'); return; }
  if (!confirm('Mulai paspor baru? ' + PAS.s.stamps.length + ' stempel akan dihapus dari perangkat ini.')) return;
  PAS.s.stamps = []; PAS.save(); renderPas(); toast('Paspor baru siap. Selamat raun.');
});
$('#chat-fab').addEventListener('click', () => toggleChat($('#chat-panel').hidden));
$('#chat-close').addEventListener('click', () => toggleChat(false));
$('#chat-form').addEventListener('submit', e => {
  e.preventDefault();
  const i = $('#chat-input'), q = i.value.trim().slice(0, 200);
  if (!q) return;
  chatAdd('user', q); i.value = ''; botReply(q);
});
window.addEventListener('hashchange', route);
(() => {
  const nb = $('#net-banner');
  const cek = () => { nb.hidden = navigator.onLine; };
  window.addEventListener('online', cek); window.addEventListener('offline', cek); cek();
})();

/* ---------- MULAI ---------- */
ENV.days = [{ pm25: 40, cat: 'ok', rain: 0, flood: false }];
setSiapFilter('semua'); setDestFilter('semua'); renderStatic(); renderPas(); renderSimReport();
route();
ENV.refresh();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
