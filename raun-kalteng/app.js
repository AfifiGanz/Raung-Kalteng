/* RAUN KALTENG v0, aplikasi (tanpa framework)
 * Modul: ENV (Si Buru), ENGINE (enumerasi minimal 99.999 kombinasi), UI, CHAT, DASHBOARD, PWA
 */
'use strict';
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const D = window.RAUN_DATA;
const CORE = window.RAUN_CORE; // mesin & skor (core.js), satu sumber kebenaran
const fmtRp = n => 'Rp' + n.toLocaleString('id-ID');
const byId = id => D.DESTINASI.find(d => d.id === id);
const destByName = n => D.DESTINASI.find(d => d.nama.toLowerCase().includes(String(n).toLowerCase()));

/* ---------- STATS (anonim, localStorage) ---------- */
const STATS = (() => {
 const KEY = 'raun_stats_v0';
 const def = { gen: 0, queries: {}, destViews: {}, qr: 0, swap: 0, envHist: [] };
 let s;
 try { s = Object.assign({}, def, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { s = {...def }; }
 const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
 return { get: () => s, save,
 bumpGen() { s.gen++; save(); }, bumpQr() { s.qr++; save(); }, bumpSwap() { s.swap++; save(); },
 bumpQuery(cat) { s.queries[cat] = (s.queries[cat] || 0) + 1; save(); },
 bumpDest(id) { s.destViews[id] = (s.destViews[id] || 0) + 1; save(); },
 pushEnv(v) { s.envHist = (s.envHist || []).slice(-30).concat([{ t: Date.now(), v }]); save(); } };
})();

/* ---------- ENV (SI BURU) ---------- */
const ENV = {
 mode: 'live', // live | replay | flood
 updated: null,
 days: [], // {pm25, cat, rain, flood, label}
 catLabel: CORE.catLabel,
 catOf(pm) { return CORE.catOf(pm); },
 scoreFor(dest, dayIdx) {
 const day = this.days[Math.max(0, Math.min(dayIdx | 0, this.days.length - 1))] || { pm25: 40, cat: 'ok', rain: 0, flood: false };
 return CORE.envScore(dest, day, this.mode);
 },
 async refresh() {
 if (this.mode === 'replay') {
 const r = D.META.karhutlaReplay;
 this.days = r.pm25.map((v, i) => ({ pm25: v, cat: this.catOf(v), rain: r.hujan[i] || 0, flood: false, label: 'Replay ' + r.label }));
 this.updated = new Date();
 } else if (this.mode === 'flood') {
 const rains = [86, 64, 41];
 this.days = rains.map((mm, i) => ({ pm25: 18, cat: 'ok', rain: mm, flood: true, label: 'Simulasi banjir, hujan ' + mm + ' mm' }));
 this.updated = new Date();
 } else {
 const AQ = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-2.2088&longitude=113.9213&hourly=pm2_5&timezone=Asia%2FJakarta&forecast_days=3';
 const WF = 'https://api.open-meteo.com/v1/forecast?latitude=-2.2088&longitude=113.9213&hourly=temperature_2m,precipitation_probability&daily=precipitation_sum,precipitation_probability_max&timezone=Asia%2FJakarta&forecast_days=3';
 try {
 const [a, w] = await Promise.all([fetch(AQ).then(r => r.json()), fetch(WF).then(r => r.json())]);
 const pmHourly = a.hourly.pm2_5, n = 24;
 this.days = [0, 1, 2].map(i => {
 const slice = (pmHourly || []).slice(i * n, (i + 1) * n).filter(x => x!= null);
 const pm25 = slice.length? Math.round(slice.reduce((p, c) => p + c, 0) / slice.length) : 40;
 const rain = Math.round((w.daily.precipitation_sum[i] || 0) * 10) / 10;
 return { pm25, cat: this.catOf(pm25), rain, flood: rain >= 60, label: 'Live, Open-Meteo' };
 });
 // cuaca per jam (mulai jam lokal sekarang, 8 jam ke depan)
 try {
 const hIdx = new Date(Date.now() + 7 * 3600000).getUTCHours();
 const temps = w.hourly.temperature_2m || [], pops = w.hourly.precipitation_probability || [];
 this.hours = Array.from({ length: 8 }, (_, k) => {
 const i = (hIdx + k) % 24;
 return { h: i, temp: Math.round(temps[i]!= null? temps[i] : 30), pop: pops[i]!= null? pops[i] : 0 };
 });
 } catch (e) { this.hours = null; }
 } catch (e) {
 this.days = [{ pm25: 40, cat: 'ok', rain: 0, flood: false, label: 'Offline fallback (data contoh)' }, { pm25: 40, cat: 'ok', rain: 2, flood: false, label: 'Offline fallback' }, { pm25: 40, cat: 'ok', rain: 4, flood: false, label: 'Offline fallback' }];
 this.hours = null;
 }
 this.updated = new Date();
 }
 STATS.pushEnv(Math.round(this.days[0] && this.days[0].pm25 || 0));
 this.paint();
 },
 worst() { return this.days.reduce((w, d) => (d.cat === 'bad'? 'bad' : (d.cat === 'warn' && w!== 'bad')? 'warn' : w), 'ok'); },
 paint() {
 const w = this.worst();
 const dot = $('#siburu-dot'); if (dot) dot.dataset.c = w;
 const t = $('#siburu-text');
 if (t) {
 if (this.mode === 'live' &&!this.updated) { t.textContent = 'Si Buru lagi membaca langit.'; }
 else {
 const d0 = this.days[0] || {};
 const floodTxt = this.days.some(x => x.flood)? 'Waspada luapan tinggi. ' : '';
 t.innerHTML = 'Langit PKY <b>' + (this.catLabel[d0.cat] || 'sedang dibaca') + '</b>, PM2.5 sekitar ' + d0.pm25 + ', hujan ' + (d0.rain || 0) + ' mm. ' + floodTxt +
 '<span class="muted small">' + (d0.label || '') + '</span>';
 }
 }
 const hero = $('.hero'); if (hero) hero.dataset.env = w === 'bad'? 'bad' : '';
 renderHours(); renderEvents();
 if (typeof renderPlan === 'function' && state.plan) renderPlan();
 }
};

function renderHours() {
 const box = $('#hours-chips'); if (!box) return;
 if (ENV.mode!== 'live' ||!ENV.hours ||!ENV.hours.length) { box.innerHTML = ''; return; }
 box.innerHTML = '<span class="muted small" style="margin-right:.3rem">Per jam:</span>' + ENV.hours.map(x => {
 return '<span class="chip" style="cursor:default">' + String(x.h).padStart(2, '0') + ', ' + x.temp + '°C, hujan ' + x.pop + '%</span>';
 }).join('');
}
function renderEvents() {
 const box = $('#events-home'); if (!box) return;
 box.innerHTML = D.EVENTS.map(ev =>
 '<span class="chip" style="cursor:default" title="' + ev.catatan + '">' + ev.nama + ' <span class="muted">' + ev.kira + '</span></span>').join('');
}

/* ---------- ENGINE (delegasi ke core.js) ---------- */
const SLOTS = CORE.SLOTS;
const GROUPS = CORE.GROUPS;
const ENGINE = {
 generate(p) { return CORE.generate({...p, destinasi: D.DESTINASI }, CORE.makeEnv(ENV.days, ENV.mode)); }
};

/* ---------- STATE + RENDER PLAN ---------- */
const state = { params: null, plan: null, variant: 0 };

function potong(s, n) { if (!s || s.length <= n) return s; const p = s.slice(0, n); return p.slice(0, p.lastIndexOf(' ')) + '...'; }
function envColor(s) { return s >= 0.66? ['ok', ''] : s >= 0.4? ['warn', ''] : ['bad', '']; }

function renderPlan() {
 if (!state.plan ||!Array.isArray(state.plan.variants) ||!state.plan.variants.length) return;
 const P = state.plan, v = P.variants[state.variant] || P.variants[0];
 const tabs = $('#variant-tabs'); tabs.innerHTML = '';
 P.variants.forEach((vv, i) => {
 const b = document.createElement('button');
 b.className = 'chip vtab'; b.setAttribute('role', 'tab');
 b.setAttribute('aria-selected', String(i === state.variant));
 b.textContent = vv.nama + ', ' + fmtRp(vv.cost);
 b.onclick = () => { state.variant = i; renderPlan(); };
 tabs.appendChild(b);
 });
 $('#plan-meta').innerHTML =
 'Dari ' + P.visited.toLocaleString('id-ID') + ' kemungkinan yang sudah dipertimbangkan, ini varian <b>' + v.nama + '</b>, ' + v.desk +
 '. Perkiraan pengeluaran <b>' + fmtRp(v.cost) + '</b> per orang' + (state.params? ', masih dalam budget ' + fmtRp(state.params.budget) : '') + '.';
 const tl = $('#timeline'); tl.innerHTML = '';
 v.plan.forEach((day, di) => {
 const envd = ENV.days[Math.min(di, ENV.days.length - 1)] || { pm25: 79, cat: 'ok' };
 const el = document.createElement('div'); el.className = 'day';
 const head = document.createElement('div'); head.className = 'day-head';
 head.innerHTML = '<b>Hari ' + (di + 1) + '</b><span>' +
 '<span class="badge tem-campur">PM2.5 ' + envd.pm25 + ', ' + (ENV.catLabel[envd.cat] || '') + '</span> ' +
 (envd.flood? '<span class="badge" style="background:#f6d5d5;color:#a11"> luapan</span>' : '') + '</span>';
 el.appendChild(head);
 const allItems = [];
 day.cells.forEach(cell => {
 cell.items.forEach(it => {
 allItems.push(it);
 // skor langit dihitung ulang saat render, pergantian mode (live/replay/banjir) langsung terlihat
 const eFresh = ENV.scoreFor(byId(it.id), di);
 it.env = eFresh.s; it.reasons = eFresh.reasons;
 const [c] = envColor(it.env);
 const d = byId(it.id);
 const row = document.createElement('div'); row.className = 'slot';
 row.innerHTML = '<div class="time">' + cell.slot.label + '</div>';
 const item = document.createElement('div'); item.className = 'item' + (it.swapped? ' swapped' : '');
 item.innerHTML =
 '<span class="dot" data-c="' + c + '" title="Kelayakan langit ' + Math.round(it.env * 100) + ' dari 100"></span>' +
 '<div style="flex:1"><h4>' + it.nama + '</h4>' +
 '<div class="tags">' + d.tags.map(t => '<span class="badge">' + t + '</span>').join('') + '</div>' +
 '<div class="muted small">' + fmtRp(d.cost) + ', ' + d.jam + (it.reasons.length? '. Perhatian: ' + it.reasons[0] : '') + '</div>' +
 '<div class="acts">' +
 '<button class="chip" data-act="detail" data-id="' + d.id + '">Detail</button>' +
 '<button class="chip" data-act="qris" data-id="' + d.id + '">QRIS demo</button>' +
 '<a class="chip" target="_blank" rel="noopener" href="' + mapsDir(d) + '">Rute</a>' +
 '<button class="chip" data-act="gojek" data-id="' + d.id + '"> Gojek</button>' +
 '<button class="chip" data-act="otsok" data-id="' + d.id + '"> Otsok WA</button>' +
 '<button class="chip" data-act="swap" data-day="' + di + '" data-slot="' + allItems.length + '">Ganti (langit)</button>' +
 '</div></div>';
 row.appendChild(item); el.appendChild(row);
 });
 });
 const foot = document.createElement('div'); foot.className = 'day-foot';
 foot.innerHTML = '<span>' + allItems.length + ' titik, kuliner ' + (allItems.some(i => i.food)? 'sudah ada' : 'belum ada') + '</span>' +
 '<span>Subtotal ' + fmtRp(allItems.reduce((a, b) => a + b.cost, 0)) + '</span>';
 el.appendChild(foot);
 tl.appendChild(el);
 });
 drawMap(v);
}

// Ganti item slot dengan alternatif bernilai langit terbaik
function swapItem(di, si) {
 const v = state.plan.variants[state.variant];
 const day = v.plan[di];
 // kumpulkan semua item berurutan utk menemukan cell ke-si
 let idx = 0, targetCell = null;
 for (const cell of day.cells) {
 for (let k = 0; k < cell.items.length; k++) {
 if (idx === si) { targetCell = { cell, k }; break; }
 idx++;
 }
 if (targetCell) break;
 }
 if (!targetCell) return;
 const cur = targetCell.cell.items[targetCell.k];
 const g = ['kota', 'tangkiling', 'hulu'].find(gg => GROUPS[gg].includes(byId(cur.id).zone)) || 'kota';
 const used = new Set(v.plan.flatMap(dd => dd.cells.flatMap(cc => cc.items.map(i => i.id))));
 const slot = targetCell.cell.slot;
 const pool = D.DESTINASI.filter(d => GROUPS[g].includes(d.zone) && slot.ok.includes(d.slot) &&!used.has(d.id) && d.id!== cur.id
 &&!(ENV.mode === 'flood' && d.lowland));
 if (!pool.length) { toast('Tidak ada alternatif aman di kelompok area ini.'); return; }
 const best = pool.map(d => ({ d, e: ENV.scoreFor(d, di) })).sort((a, b) => (b.e.s + (b.d.tags.some(t => state.params && state.params.prefs.includes(t))? 0.2 : 0)) - (a.e.s + (a.d.tags.some(t => state.params && state.params.prefs.includes(t))? 0.2 : 0)))[0];
 const delta = best.d.cost - byId(cur.id).cost;
 targetCell.cell.items[targetCell.k] = { id: best.d.id, nama: best.d.nama, cost: best.d.cost, sc: best.e.s, pf: 0.5, env: best.e.s, reasons: best.e.reasons, food: best.d.tags.includes('kuliner'), swapped: true };
 v.cost = Math.max(0, v.cost + delta);
 STATS.bumpSwap();
 renderPlan(); toast('Diganti: ' + best.d.nama + ' (skor langit ' + Math.round(best.e.s * 100) + '/100)');
}

/* ---------- PETA (Leaflet + OpenStreetMap; fallback skematik bila CDN mati) ---------- */
let leafletMap = null, pinLayer = null;
function drawMap(v) {
 if (window.L) return realMap(v);
 return schematicMap(v);
}
function realMap(v) {
 const el = $('#map'); if (!el) return;
 $('#map-fallback').hidden = true; el.hidden = false;
 if (!leafletMap) {
 leafletMap = L.map(el, { scrollWheelZoom: false }).setView([-2.2088, 113.9213], 12);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(leafletMap);
 pinLayer = L.layerGroup().addTo(leafletMap);
 }
 setTimeout(() => { leafletMap.invalidateSize(); }, 150);
 pinLayer.clearLayers();
 const planned = new Set(v.plan.flatMap(d => d.cells.flatMap(c => c.items.map(i => i.id))));
 const bounds = [];
 D.DESTINASI.forEach(d => {
 const on = planned.has(d.id);
 const color = on? '#8B1E1E' : '#B9AE97';
 const icon = L.divIcon({
 className: '', iconSize: [26, 30], iconAnchor: [13, 27],
 html: '<div class="pin" style="background:' + color + ';width:24px;height:24px"><span>' + (on? '<svg class="ic" style="width:11px;height:11px;stroke:#FFF7E8"><use href="#i-star"/></svg>' : '') + '</span></div>'
 });
 const m = L.marker([d.lat, d.lng], { icon, title: d.nama }).addTo(pinLayer);
 m.bindPopup('<b>' + d.nama + '</b><br><span class="muted small">' + fmtRp(d.cost) + ', ' + d.jam + '</span><br>' +
 '<a href="#" data-act="detail" data-id="' + d.id + '" style="font-weight:800">Detail dan rute</a>, ' +
 '<a href="' + mapsDir(d) + '" target="_blank" rel="noopener">Rute</a>');
 if (on) bounds.push([d.lat, d.lng]);
 });
 if (bounds.length) leafletMap.fitBounds(bounds, { padding: [34, 34], maxZoom: 14 });
}
function schematicMap(v) { // fallback tanpa internet
 const el = $('#map'); if (!el) return;
 el.hidden = true;
 const fb = $('#map-fallback'); fb.hidden = false;
 const river = 'M 208 -10 C 200 90, 176 180, 168 260 C 160 340, 176 420, 186 500';
 let out = '<svg viewBox="0 0 400 480" style="width:100%;border-radius:14px;background:linear-gradient(180deg,#EEF3EA,#F6F2E6)">';
 out += '<path d="' + river + '" fill="none" stroke="#9EC3D8" stroke-width="16" stroke-linecap="round" opacity=".8"/>';
 out += '<text x="228" y="30" font-size="11" fill="#5B7D90" transform="rotate(78 228 30)">Sungai Kahayan</text>';
 const planned = new Set(v.plan.flatMap(d => d.cells.flatMap(c => c.items.map(i => i.id))));
 D.DESTINASI.forEach(d => {
 const X = 200 + d.x * 170, Y = 240 - d.y * 215;
 out += '<circle cx="' + X + '" cy="' + Y + '" r="' + (planned.has(d.id)? 7 : 4) + '" fill="' + (planned.has(d.id)? '#8B1E1E' : '#C9BFA8') + '" stroke="#fffdf8" stroke-width="2"><title>' + d.nama + '</title></circle>';
 });
 out += '<text x="12" y="466" font-size="9" fill="#8A8171">Mode skematik (peta online tak tersedia)</text></svg>';
 fb.innerHTML = out;
}

/* ---------- ILUSTRASI SVG: kartu pos bergaya berlapis, deterministik per seed ---------- */
function hashSeed(str) { let h = 7; for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) | 0; return Math.abs(h); }
function sceneSVG(tema, seed, tinggi) {
 const P = {
 alam: ['#DFF3E4', '#8FD4A8', '#3E8E63', '#FFF8E1'], budaya: ['#FFE3C2', '#F2A65A', '#B4532A', '#FFF6E8'],
 kuliner: ['#FFE9C9', '#F6B352', '#C97B2D', '#FFF9EE'], keluarga: ['#DDF0FA', '#8FC3E0', '#2C5D8F', '#F4FAFD'],
 air: ['#D6F0F5', '#7EC3D8', '#1F6E8C', '#F2FBFD'], sunset: ['#FFE1BE', '#F2A65A', '#C4552D', '#FFF3DC'],
 hiking: ['#E8F0D8', '#A8C77E', '#4A6741', '#FBF9EF'], indoor: ['#E9E4F8', '#B0A5DC', '#4B3D86', '#F7F5FC'],
 sejarah: ['#F2E4CC', '#D2B183', '#6B4E2E', '#FBF5EA'], foto: ['#EFE1F6', '#C4A0D2', '#6B4A7A', '#FAF4FC'],
 campur: ['#F5E8C8', '#E0BE72', '#7A5C2E', '#FDFAF0']
 }[tema] || ['#DDF0FA', '#8FC3E0', '#2C5D8F', '#F4FAFD'];
 const r = CORE.mulberry(hashSeed(String(seed || tema)));
 const W = 400, H = tinggi || 200, horizon = H * 0.62, waterY = H * 0.72;
 const sunX = 70 + r() * 260, sunY = 24 + r() * (horizon - 60), sunR = 15 + r() * 10;
 const kid = 'sk' + hashSeed(String(seed || tema));
 const mtn = (y, amp, color) => {
 let d = 'M0 ' + H + ' L0 ' + y;
 for (let x = 0; x <= W; x += 50) d += ' Q' + (x + 25) + ' ' + (y - amp * (0.5 + r())) + ' ' + (x + 50) + ' ' + (y - amp * r() * 0.6);
 return '<path d="' + d + ' L' + W + ' ' + H + ' Z" fill="' + color + '"/>';
 };
 const hutan = (y, color) => {
 let d = 'M0 ' + H + ' L0 ' + y;
 for (let x = 0; x <= W; x += 18) { const bump = 8 + r() * 12; d += ' q9 -' + bump.toFixed(1) + ' 18 0'; }
 return '<path d="' + d + ' L' + W + ' ' + H + ' Z" fill="' + color + '"/>';
 };
 let air = '<rect x="0" y="' + waterY + '" width="' + W + '" height="' + (H - waterY) + '" fill="' + P[0] + '" opacity=".85"/>';
 for (let i = 0; i < 6; i++) {
 const ly = waterY + 6 + i * (H - waterY) / 7, lw = 30 + r() * 80, lx = sunX - lw / 2 + (r() - 0.5) * 40;
 air += '<rect x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" width="' + lw.toFixed(1) + '" height="2.4" rx="1.2" fill="' + P[2] + '" opacity="' + Math.max(0.08, 0.5 - i * 0.07).toFixed(2) + '"/>';
 }
 const aksen = (tema === 'air' || tema === 'sunset') ?
 '<path d="M' + (W * 0.55).toFixed(0) + ' ' + (waterY + 6) + ' q10 -9 24 -9 q14 0 22 9 z" fill="#1A0E08" opacity=".9"/><rect x="' + (W * 0.55 + 22).toFixed(0) + '" y="' + (waterY - 14) + '" width="1.6" height="16" fill="#1A0E08" opacity=".9"/>' : '';
 return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
 '<defs><linearGradient id="' + kid + '" x1="0" y1="0" x2="0" y2="1">' +
 '<stop offset="0" stop-color="' + P[0] + '"/><stop offset=".55" stop-color="' + P[1] + '"/><stop offset="1" stop-color="' + P[2] + '"/></linearGradient></defs>' +
 '<rect width="' + W + '" height="' + H + '" fill="url(#' + kid + ')"/>' +
 '<circle cx="' + sunX.toFixed(1) + '" cy="' + sunY.toFixed(1) + '" r="' + (sunR * 2.2).toFixed(1) + '" fill="#F6C453" opacity=".25"/>' +
 '<circle cx="' + sunX.toFixed(1) + '" cy="' + sunY.toFixed(1) + '" r="' + sunR.toFixed(1) + '" fill="' + P[3] + '"/>' +
 mtn(horizon - 6, 26, P[1]) + hutan(horizon + 4, P[0]) + air + aksen + '</svg>';
}

/* ---------- FAVORIT ---------- */
const FAV = (() => {
 const KEY = 'raun_fav_v1';
 let s;
 try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { s = {}; }
 if (!Array.isArray(s.ids)) s.ids = [];
 const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
 return {
 has: id => s.ids.includes(id),
 toggle(id) { s.ids = s.ids.includes(id)? s.ids.filter(x => x!== id) : s.ids.concat(id); save(); },
 list: () => s.ids.slice()
 };
})();

/* ---------- VIEW: katalog, siap pakai, UMKM ---------- */
function cardDest(d) {
 const el = document.createElement('div'); el.className = 'card trip';
 const tema = d.tags[0] || 'campur';
 const icon = { alam: 'i-leaf', budaya: 'i-star', kuliner: 'i-food', keluarga: 'i-home', sejarah: 'i-star', indoor: 'i-home', air: 'i-drop', sunset: 'i-sun', hiking: 'i-mountain', foto: 'i-pin', campur: 'i-compass', kuliner2: 'i-food' }[tema] || 'i-pin';
 const fav = FAV.has(d.id);
 el.innerHTML =
 '<div class="cover">' + sceneSVG(tema, d.id, 120) + '</div>' +
 '<button class="fav-btn' + (fav? ' on' : '') + '" data-fav="' + d.id + '" aria-label="Tandai favorit">' + (fav? '<svg class="ic" style="fill:#C62828;stroke:#C62828"><use href="#i-heart"/></svg>' : '<svg class="ic"><use href="#i-heart"/></svg>') + '</button>' +
 '<div class="body"><h3>' + d.nama + '</h3>' +
 '<div class="badges">' + d.tags.slice(0, 3).map(t => '<span class="badge tem-' + t + '">' + t + '</span>').join('') + '</div>' +
 '<p class="muted small" style="margin:0">' + potong(d.desc, 96) + '</p>' +
 '<div class="muted small">' + fmtRp(d.cost) + ', ' + d.jam + (d.indoor? ', ruang tertutup' : '') + '</div>' +
 '<div class="acts"><button class="chip" data-act="detail" data-id="' + d.id + '">Detail</button>' +
 '<a class="chip" target="_blank" rel="noopener" href="' + mapsDir(d) + '">Rute</a></div></div>';
 return el;
}
function renderCatalog(filter) {
 const g = $('#dest-grid'); g.innerHTML = '';
 let list = D.DESTINASI;
 if (filter === 'favorit') list = list.filter(d => FAV.has(d.id));
 else if (filter!== 'semua') list = list.filter(d => d.tags.includes(filter) || (filter === 'indoor' && d.indoor));
 if (!list.length) { g.innerHTML = '<p class="muted">Masih kosong di sini. Coba kategori lain, atau simpan favorit lewat ikon hati di tiap kartu.</p>'; return; }
 list.forEach(d => g.appendChild(cardDest(d)));
}
function renderSiap(filter) {
 const g = $('#siap-grid'); g.innerHTML = '';
 D.SIAP_PAKAI.filter(t => filter === 'semua' || t.tema === filter).forEach(t => {
 const el = document.createElement('div'); el.className = 'card trip';
 const dests = t.plan.flat().map(byId);
 const cost = dests.reduce((a, d) => a + d.cost, 0);
 el.innerHTML = '<div class="cover">' + sceneSVG(t.tema, t.id, 110) + '</div>' +
 '<div class="body"><h3>' + t.nama + '</h3><div class="badges"><span class="badge tem-' + t.tema + '">' + t.tema + '</span><span class="badge">' + t.hari + ' hari</span><span class="badge">' + dests.length + ' titik</span></div>' +
 '<p class="muted small">' + dests.slice(0, 4).map(d => d.nama.split(' ')[0]).join(', lalu ') + '...</p>' +
 '<div class="muted small">' + fmtRp(cost) + ' per orang, belum termasuk transport</div>' +
 '<div class="acts"><button class="chip" data-act="runsiap" data-id="' + t.id + '">Pakai ini</button></div></div>';
 g.appendChild(el);
 });
}
function renderUmkm() {
 const g = $('#umkm-grid'); g.innerHTML = '';
 ['kulinerpatin', 'oleholeh', 'pasarmalam', 'danautahai', 'kopisore'].map(byId).forEach(d => {
 const el = document.createElement('div'); el.className = 'card trip';
 el.innerHTML = '<h3>' + d.nama + '</h3><div class="badges"><span class="badge tem-kuliner">QRIS pilot</span></div>' +
 '<p class="muted small">Warung mitra demo, tiap transaksi kasih satu stempel Pas Raun.</p>' +
 '<div class="acts"><button class="chip" data-act="qris" data-id="' + d.id + '">QRIS demo</button></div>';
 g.appendChild(el);
 });
}
function renderKuliner() {
 const g = $('#kuliner-grid'); if (!g) return;
 D.KULINER.forEach(x => {
 const el = document.createElement('div'); el.className = 'card trip';
 el.innerHTML = '<div class="cover">' + sceneSVG('kuliner', x.nama, 110) + '</div>' +
 '<div class="body"><h3>' + x.nama + '</h3><p class="muted small" style="margin:0">' + x.desc + '</p>' +
 '<div class="muted small">' + x.tips + '</div>' +
 '<div class="acts"><a class="chip" target="_blank" rel="noopener" href="https://www.google.com/maps/search/' + encodeURIComponent(x.nama + ' Kalimantan Tengah') + '">Cari penjual di Maps</a></div></div>';
 g.appendChild(el);
 });
}
function renderRegional() {
 const g = $('#regional-grid'); if (!g) return;
 D.REGIONAL.forEach(x => {
 const el = document.createElement('div'); el.className = 'card trip';
 el.innerHTML = '<div class="cover">' + sceneSVG(x.wilayah.includes('Tanjung') ? 'air' : 'alam', x.nama, 110) + '</div>' +
 '<div class="body"><h3>' + x.nama + '</h3><div class="badges"><span class="badge">' + x.wilayah + '</span></div>' +
 '<p class="muted small" style="margin:0">' + x.desc + '</p>' +
 '<div class="muted small">' + x.akses + '</div>' +
 '<div class="acts"><a class="chip" target="_blank" rel="noopener" href="https://www.google.com/maps/search/' + encodeURIComponent(x.nama + ' Kalimantan Tengah') + '">Lihat di Maps</a></div></div>';
 g.appendChild(el);
 });
}
function renderTidurNgopi() {
 const cardStay = (x, tipe) => {
 const el = document.createElement('div'); el.className = 'card trip';
 el.innerHTML = '<div class="cover">' + sceneSVG(tipe === 'ngopi'? 'indoor' : 'keluarga', x.nama, 100) + '</div>' +
 '<div class="body"><h3>' + x.nama + '</h3><div class="badges"><span class="badge tem-campur">' + tipe + '</span></div>' +
 '<p class="muted small">' + x.catatan + '</p>' +
 '<div class="muted small">' + x.area + ', ' + x.rentang + '</div>' +
 '<div class="acts"><a class="chip" target="_blank" rel="noopener" href="https://www.google.com/maps/search/' + encodeURIComponent(x.nama + ' Palangka Raya') + '/@' + x.lat + ',' + x.lng + ',15z">Cari di Maps</a></div></div>';
 return el;
 };
 const gh = $('#hotel-grid'), gk = $('#kafe-grid');
 if (gh) D.HOTEL.forEach(x => gh.appendChild(cardStay(x, 'menginap')));
 if (gk) D.KAFE.forEach(x => gk.appendChild(cardStay(x, 'ngopi')));
}

/* ---------- GOOGLE MAPS (link membuka web Maps; di HP otomatis masuk aplikasi Maps) ---------- */
const mapsSearch = d => 'https://www.google.com/maps/search/' + encodeURIComponent(d.nama) + '/@' + d.lat + ',' + d.lng + ',15z';
const mapsDir = d => 'https://www.google.com/maps/dir/?api=1&destination=' + d.lat + ',' + d.lng + '&travelmode=driving';
const mapsNear = (d, what) => 'https://www.google.com/maps/search/' + what + '/@' + d.lat + ',' + d.lng + ',14z';

/* ---------- PAS RAUN (stempel persisten di perangkat ini) ---------- */
const PASRAUN = (() => {
 const KEY = 'raun_pasraun_v1';
 let s;
 try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { s = {}; }
 if (!Array.isArray(s.stamps)) s.stamps = [];
 const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
 function render() {
 const box = $('#pasraun-stamps'); if (!box) return;
 const have = s.stamps.length;
 let html = '';
 for (let i = 0; i < 5; i++) {
 html += '<span class="stamp-slot">' + (i < have? '<svg class="ic"><use href="#i-ticket"/></svg>' : '') + '</span>';
 }
 html += '<b style="margin-left:.4rem">' + have + '/5</b>' + (have >= 5? ', <span style="color:var(--ok)">siap ditukar!</span>' : ', terus kumpul!');
 box.innerHTML = html;
 const badge = document.getElementById('stamp-badge');
 if (badge) badge.textContent = have + '/5';
 }
 return {
 get: () => s, render,
 add(mid) {
 if (!mid) return;
 if (!s.stamps.includes(mid)) s.stamps.push(mid);
 save(); render();
 if (s.stamps.length >= 5) toast('Paspornya penuh. Tukar souvenir di kios oleh oleh mitra, ini masih demo.');
 else toast('Stempel ke-' + s.stamps.length + ' masuk. Kumpulkan lima untuk tukar souvenir.');
 },
 reset() { s.stamps = []; save(); render(); toast('Paspor baru siap. Selamat raun!'); }
 };
})();

/* ---------- MODAL: detail & QRIS ---------- */
function openDetail(id) {
 const d = byId(id); STATS.bumpDest(id);
 const body = $('#modal-detail-body');
 body.innerHTML = '<button class="modal-x" data-close aria-label="Tutup">Tutup</button>' +
 '<h2>' + d.nama + '</h2><p>' + d.desc + '</p>' +
 (d.etika? '<p class="small" style="background:#f6e7d3;border-radius:10px;padding:.6rem"><b>Adab:</b> ' + d.etika + '</p>' : '') +
 '<dl class="kv"><dt>Biaya</dt><dd>' + fmtRp(d.cost) + '</dd><dt>Jam</dt><dd>' + d.jam + '</dd>' +
 '<dt>Tipe</dt><dd>' + (d.indoor? 'Indoor (aman asap/hujan)' : 'Outdoor') + (d.lowland? ', area rendah, perlu cek luapan' : '') + '</dd>' +
 '<dt>Tag</dt><dd>' + d.tags.join(', ') + '</dd></dl>' +
 '<p class="muted small">' + (d.tips || '') + '</p>' +
 '<div class="acts" style="display:flex;gap:.45rem;flex-wrap:wrap;margin:.5rem 0">' +
 '<a class="chip" target="_blank" rel="noopener" href="' + mapsDir(d) + '"> Rute ke sini</a>' +
 '<a class="chip" target="_blank" rel="noopener" href="' + mapsSearch(d) + '"> Cek di Maps</a>' +
 '<a class="chip" target="_blank" rel="noopener" href="' + mapsNear(d, 'hotel') + '"> Hotel sekitar</a>' +
 '<a class="chip" target="_blank" rel="noopener" href="' + mapsNear(d, 'restoran') + '"> Makan sekitar</a>' +
 '<a class="chip" target="_blank" rel="noopener" href="' + mapsNear(d, 'kafe') + '"> Ngopi sekitar</a>' +
 '</div>' +
 '<div class="acts" style="display:flex;gap:.5rem;flex-wrap:wrap">' +
 '<button class="btn btn-primary" data-act="qris" data-id="' + d.id + '">QRIS demo</button>' +
 '</div>' +
 pasfotoHtml(d.id);
 showModal('modal-detail');
 pasfotoBind(id);
}
let qrLibPromise = null;
function loadQrLib() {
 if (window.qrcode) return Promise.resolve();
 if (!qrLibPromise) qrLibPromise = new Promise((res, rej) => {
 const s = document.createElement('script');
 s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
 s.onload = () => res(); s.onerror = () => rej(new Error('offline'));
 document.head.appendChild(s);
 });
 return qrLibPromise;
}
async function openQris(id) {
 const d = byId(id); STATS.bumpQr();
 state.lastQrisId = id;
 const body = $('#modal-detail-body');
 let qrHtml = '<div class="center small muted" style="padding:2rem;border:1px dashed var(--line);border-radius:10px">Mode offline, QR tampil saat online</div>';
 try {
 await loadQrLib();
 const q = window.qrcode(0, 'M');
 q.addData('DEMO QRIS, Raun Kalteng v0, merchant: ' + d.nama + ', payload uji tanpa dana');
 q.make();
 qrHtml = q.createSvgTag({ cellSize: 3, margin: 8, scalable: true });
 } catch (e) {}
 body.innerHTML = '<button class="modal-x" data-close aria-label="Tutup">Tutup</button>' +
 '<h2>QRIS demo, ' + d.nama + '</h2>' +
 '<div class="center">' + qrHtml + '</div>' +
 '<p class="muted small center"> Demo: QR berisi teks uji, bukan QRIS asli, tanpa dana. Rilis v1 memakai QRIS dinamis via PSP mitra.</p>' +
 '<p class="center"><button class="btn btn-primary" data-act="stamp">Tandai stempel Pas Raun</button></p>';
 showModal('modal-detail');
}
function stamp() { PASRAUN.add(state.lastQrisId); closeModals(); }

/* ---------- TRANSPORT HUB ---------- */
function gojekOrder(d) {
 // Coba deep-link aplikasi Gojek; bila tak terpasang ke Play Store (fallback demo)
 const t0 = Date.now();
 const iframe = document.createElement('iframe'); iframe.style.display = 'none'; document.body.appendChild(iframe);
 iframe.src = 'gojek://';
 setTimeout(() => {
 iframe.remove();
 if (!document.hidden && Date.now() - t0 < 1800) {
 toast('Aplikasi Gojek tak terdeteksi, dibuka Play Store (demo). v2: kemitraan resmi GoTo/Midtrans.');
 window.open('https://play.google.com/store/apps/details?id=com.gojek.app', '_blank', 'noopener');
 } else {
 toast('Gojek dibuka, tujuan tersalin: ' + d.nama + ' (lat,lng: ' + d.lat + ',' + d.lng + ')');
 try { navigator.clipboard && navigator.clipboard.writeText(d.nama + ', ' + d.lat + ',' + d.lng); } catch (e) {}
 }
 }, 1500);
}
function otsokOrder(d) {
 const start = (state.params && state.params.start) || 'Tugu Soekarno';
 const msg = 'Halo Otsok! Saya dari Raun Kalteng (demo).\nJemput: ' + start + '\nTujuan: ' + d.nama +
 '\nEstimasi tarif demo sekitar Rp40.000\nMohon konfirmasi ketersediaan perahu atau ojek.';
 toast('WhatsApp dibuka dengan pesan otomatis (nomor demo v0).');
 window.open('https://wa.me/620811000000?text=' + encodeURIComponent(msg), '_blank', 'noopener');
}

/* ---------- WIZARD ---------- */
function openWizard() {
 const m = $('#modal-wizard'); m.hidden = false;
 const inp = $('#wz-date'); if (!inp.value) { const t = new Date(); inp.value = t.toISOString().slice(0, 10); }
}
function runWizard(e) {
 e.preventDefault();
 const params = {
 date: $('#wz-date').value, days: +$('#wz-days').value, pax: +$('#wz-pax').value,
 budget: +$('#wz-budget').value, prefs: $$('#wz-prefs.chip.active').map(c => c.dataset.pref), start: $('#wz-start').value
 };
 const go = $('#wz-go'), st = $('#wz-status');
 go.disabled = true; go.textContent = 'Dipikirkan dulu';
 setTimeout(() => {
 const r = ENGINE.generate(params);
 state.params = params; state.plan = r; state.variant = 0;
 STATS.bumpGen(); renderDashboard();
 go.disabled = false; go.textContent = 'Susun ulang';
 closeModals();
 showView('view-plan');
 renderPlan();
 st.textContent = 'Barusan dipertimbangkan ' + r.visited.toLocaleString('id-ID') + ' kemungkinan dalam ' + r.ms + ' milidetik.';
 toast('Beres. Dari ' + r.visited.toLocaleString('id-ID') + ' kemungkinan, tiga ini paling masuk akal.');
 }, 30);
}

/* ---------- SIAP PAKAI ke PLAN ---------- */
function runSiap(id) {
 const t = D.SIAP_PAKAI.find(x => x.id === id);
 const days = [];
 for (let i = 0; i < t.hari; i++) {
 const base = t.plan.slice(i * 4, i * 4 + 4);
 const cells = [];
 SLOTS.forEach((slot, si) => {
 const ids = base[si] || [];
 const items = ids.map(id0 => { const d = byId(id0); const e = ENV.scoreFor(d, i); return { id: d.id, nama: d.nama, cost: d.cost, sc: e.s, pf: 0.6, env: e.s, reasons: e.reasons, food: d.tags.includes('kuliner') }; });
 if (items.length) cells.push({ slot, items });
 });
 days.push({ cells });
 }
 const cost = days.flatMap(d0 => d0.cells).flatMap(c => c.items).reduce((a, b) => a + b.cost, 0);
 state.params = { days: t.hari, budget: cost, prefs: [t.tema === 'campur'? 'alam' : t.tema], pax: 2 };
 state.plan = { variants: [{ key: 'santai', nama: 'Kurasi Raun', desk: 'itinerary siap-pakai terpilih', plan: days, cost, score: 0 }], visited: 0, space: 0, ms: 0 };
 state.variant = 0; STATS.bumpGen();
 showView('view-plan'); renderPlan();
 toast('"' + t.nama + '" siap. Cek lampu langitnya dulu sebelum berangkat.');
}

/* ---------- CHAT ---------- */
function chatAdd(who, html) {
 const log = $('#chat-log');
 const m = document.createElement('div'); m.className = 'msg ' + who;
 m.innerHTML = html;
 log.appendChild(m); log.scrollTop = log.scrollHeight;
 $$('.mact', m).forEach(b => b.onclick = () => doAction(b.dataset.act, b.dataset.id));
}
function botReply(q) {
 const t = q.toLowerCase(); let cat = 'lain';
 const has = (...ws) => ws.some(w => t.includes(w));
 if (has('asap', 'udara', 'pm', 'ispu', 'karhutla', 'kabut')) {
 cat = 'udara'; const d0 = ENV.days[0] || {};
 chatAdd('bot', 'Langit PKY <b>' + (ENV.catLabel[d0.cat] || '') + '</b>, PM2.5 sekitar ' + d0.pm25 + ', hujan ' + (d0.rain || 0) + ' milimeter. ' +
 (d0.cat === 'bad'? 'Utamakan indoor, coba tombol <span class="mact" data-act="openwizard">susun itinerary anti-asap</span>.' : d0.cat === 'warn'? 'Masih bisa outdoor singkat; bawa masker.' : 'Aman untuk outdoor '));
 } else if (has('banjir', 'luapan', 'hujan')) {
 cat = 'banjir';
 chatAdd('bot', 'Risiko luapan Kahayan menaik saat hujan >60 mm (bukti: luapan Des 2023 & 2024 kawasan Jl. Anoi). Mode Banjir Raun menghindari area rendah, aktifkan via tombol <span class="mact" data-act="flood"> Mode Banjir</span>.');
 } else if (has('qris', 'bayar', 'pas raun', 'stempel')) {
 cat = 'qris';
 chatAdd('bot', 'Pembayaran lokal lewat <b>QRIS demo</b> di tiap kartu; tiap transaksi = 1 stempel <b>Pas Raun</b> (5 stempel = souvenir UMKM). Selaras target BI Kalteng 22.000 pengguna QRIS baru.');
 } else if (has('menginap', 'hotel', 'penginapan', 'ngopi', 'kafe')) {
 cat = 'menginap';
 chatAdd('bot', 'Pilih menginap dan tempat ngopi ada di halaman Jelajah, bagian bawah. Mau cek sekitar titik tertentu? Buka detail destinasi lalu tekan Hotel sekitar atau Ngopi sekitar, langsung ke Google Maps.');
 } else if (has('tanjung puting', 'orangutan luar', 'kalteng luas', 'luar pky', 'luar pkY', 'kumai', 'sekonyer')) {
 cat = 'regional';
 chatAdd('bot', 'Untuk Kalteng di luar PKY ada Tanjung Puting dan Sungai Sekonyer di Kotawaringin Barat, Danau Sembuluh, Bukit Sepat, sampai Betang Tumbang Malahoi. Buka halaman Jelajah, bagian Kalteng lebih luas dari PKY. Rencana jauh masuk mesin di v1.');
 } else if (has('halo', 'hai', 'pagi', 'siang', 'malam', 'assalamu', 'salam')) {
 cat = 'sapaan';
 chatAdd('bot', 'Halo juga. Mau mulai dari mana? Bilang saja tanggal dan budgetnya, atau tanya kondisi langit hari ini.');
 } else if (has('kuliner', 'makan', 'patin', 'garam basah')) {
 cat = 'kuliner';
 chatAdd('bot', 'Wajib coba: <span class="mact" data-act="detail" data-id="kulinerpatin">Patin & terubuk</span>, <span class="mact" data-act="detail" data-id="oleholeh">garam basah basi</span>, malam di <span class="mact" data-act="detail" data-id="pasarmalam">pasar malam riverfront</span>.');
 } else if (has('sebangau', 'orangutan', 'sei gohong')) {
 cat = 'sebangau';
 chatAdd('bot', 'Gerbang Sebangau ada di <span class="mact" data-act="detail" data-id="seigohong">Sei Gohong</span>; orangutan bisa dilihat aman dari <span class="mact" data-act="detail" data-id="pulaukaja">dermaga Pulau Kaja</span> (08.00–15.00, jarak wajib).');
 } else if (has('sandung', 'bukit rawi', 'budaya', 'museum')) {
 cat = 'budaya';
 chatAdd('bot', 'Untuk budaya: <span class="mact" data-act="detail" data-id="balanga">Museum Balanga</span> (indoor) atau <span class="mact" data-act="detail" data-id="bukitrawi">Bukit Rawi</span> (full-day, situs sakral, ikuti etika).');
 } else if (has('itinerary', 'rencana', 'raun', 'wisata ke mana', 'ajukan')) {
 cat = 'itinerary';
 chatAdd('bot', 'Siap! <span class="mact" data-act="openwizard">Susun itinerary saya</span>, mesin mengeksplorasi >=99.999 kombinasi dan memilih 3 varian terbaik sesuai budget & langit.');
 } else if (destByName(q)) {
 cat = 'destinasi'; const d = destByName(q);
 chatAdd('bot', '<b>' + d.nama + '</b>: ' + d.desc + ' <span class="mact" data-act="detail" data-id="' + d.id + '">Detail</span> <span class="mact" data-act="qris" data-id="' + d.id + '">QRIS</span>');
 } else {
 chatAdd('bot', 'Hmm, yang tanya soal itu belum saya hafal (aku cuma pegang data lokal, sengaja biar hemat kuota). Coba: <i>asap, banjir, kuliner, Sebangau, Bukit Rawi, QRIS</i>, atau sebut nama tempat. Mau langsung jalan? <span class="mact" data-act="openwizard">susun itinerary</span>.');
 }
 STATS.bumpQuery(cat); renderDashboard();
}
function doAction(act, id, ds) {
 ds = ds || {};
 if (act === 'detail') openDetail(id);
 else if (act === 'qris') openQris(id);
 else if (act === 'openwizard') openWizard();
 else if (act === 'flood') toggleFlood(true);
 else if (act === 'stamp') stamp();
 else if (act === 'runsiap') runSiap(id);
 else if (act === 'gojek') gojekOrder(byId(id) || byId('tugu'));
 else if (act === 'otsok') otsokOrder(byId(id) || byId('danautahai'));
 else if (act === 'fotodel') { try { localStorage.removeItem(fotoKey(id)); } catch (e) {} toast('Foto dihapus.'); openDetail(id); }
 else if (act === 'swap') swapItem(+ds.day, +ds.slot);
}

/* ---------- DASHBOARD ---------- */
function renderDashboard() {
 const s = STATS.get();
 const el = id => $(id);
 if (!el('#d-gen')) return;
 el('#d-gen').textContent = s.gen;
 el('#d-q').textContent = Object.values(s.queries).reduce((a, b) => a + b, 0);
 el('#d-qr').textContent = s.qr;
 el('#d-swap').textContent = s.swap;
 let stampN = 0; try { stampN = (JSON.parse(localStorage.getItem('raun_pasraun_v1') || '{}').stamps || []).length; } catch (e) {}
 let favN = 0; try { favN = (JSON.parse(localStorage.getItem('raun_fav_v1') || '{}').ids || []).length; } catch (e) {}
 el('#d-stamp').textContent = stampN;
 el('#d-fav').textContent = favN;
 // top dest
 const tops = Object.entries(s.destViews).sort((a, b) => b[1] - a[1]).slice(0, 6);
 const cd = el('#chart-dest'); cd.innerHTML = tops.length? '' : '<p class="muted small">Belum ada klik.</p>';
 const max = tops.length? tops[0][1] : 1;
 tops.forEach(([id, n]) => {
 const d = byId(id);
 const row = document.createElement('div');
 row.style.cssText = 'display:flex;align-items:center;gap:.5rem;margin:.3rem 0';
 row.innerHTML = '<span style="width:150px;font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (d? d.nama : id) + '</span>' +
 '<span style="flex:1;background:#f1e9d8;border-radius:99px;overflow:hidden"><span style="display:block;height:10px;width:' + (n / max * 100) + '%;background:var(--maroon)"></span></span>' +
 '<b style="font-size:.8rem">' + n + '</b>';
 cd.appendChild(row);
 });
 drawAqi();
}
function drawAqi() {
 const cv = $('#chart-aqi'); if (!cv) return;
 const ctx = cv.getContext('2d');
 const h = STATS.get().envHist || [];
 ctx.clearRect(0, 0, cv.width, cv.height);
 ctx.fillStyle = '#f7f2e4'; ctx.fillRect(0, 0, cv.width, cv.height);
 ctx.strokeStyle = '#e6ddca'; ctx.strokeRect(0.5, 0.5, cv.width - 1, cv.height - 1);
 if (h.length < 2) { ctx.fillStyle = '#8a8171'; ctx.font = '12px sans-serif'; ctx.fillText('Riwayat terkumpul saat mode live aktif...', 14, 90); return; }
 const vs = h.map(x => x.v), max = Math.max(120,...vs);
 ctx.beginPath();
 vs.forEach((v, i) => { const x = 10 + i / (vs.length - 1) * (cv.width - 30), y = cv.height - 16 - (v / max) * (cv.height - 34); i? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
 ctx.strokeStyle = '#c62828'; ctx.lineWidth = 2; ctx.stroke();
 ctx.fillStyle = '#8a8171'; ctx.font = '10px sans-serif';
 ctx.fillText('PM2.5, maks ' + max, 10, 12);
}
function renderSimReport() {
 const box = $('#sim-report'); if (!box) return;
 const ambil = f => fetch(f).then(r => r.ok? r.json() : Promise.reject()).catch(() => null);
 Promise.all([ambil('sim/results.json'), ambil('sim/feature-results.json'), ambil('sim/fuzz-results.json')]).then(([a, ft, fz]) => {
 let h = '<h3>Laboratorium MiroFish, hasil lengkap</h3>';
 if (a) h += '<p><b>' + a.agents.toLocaleString('id-ID') + '</b> wisatawan virtual diuji dalam ' + a.scenarios + ' skenario langit. Mesin menimbang <b>' + a.totalNodes.toLocaleString('id-ID') + '</b> kemungkinan. Waktu proses ' + a.ms.toLocaleString('id-ID') + ' milidetik.</p>' +
 '<ul>' + a.findings.map(f => '<li>' + f.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') + '</li>').join('') + '</ul>';
 if (ft) h += '<p><b>Penyapuan fitur:</b> ' + ft.ruangTeoretis + '. ' + ft.metode.split('ke')[0].trim() + '. Prioritas lanjutan: ' + ft.rekomendasiV1.slice(0, 5).join(', ') + '.</p>';
 if (fz) h += '<p><b>Berburu bug:</b> ' + fz.sesi.toLocaleString('id-ID') + ' input jahat, status ' + fz.status + '. Crash: ' + fz.crashes + ', pelanggaran budget: ' + fz.pelanggaran.budget + ', duplikat: ' + fz.pelanggaran.duplikatDestinasi + '.</p>';
 if (!a && !ft && !fz) h += '<p class="muted">File hasil simulasi belum ada. Jalankan node sim/agents.mjs, sim/features.mjs, dan sim/fuzz.mjs lalu muat ulang.</p>';
 h += '<p class="muted small">Angka di panel ini dari simulasi deterministik, bisa diulang siapa saja.</p>';
 box.innerHTML = h;
 });
}

/* ---------- FOTO KONDISI (pasfoto) + WAALERT + TRIPSHARE ---------- */
function fotoKey(id) { return 'raun_foto_' + id; }
function pasfotoHtml(id) {
 let saved = null;
 try { saved = localStorage.getItem(fotoKey(id)); } catch (e) {}
 return '<div style="margin:.7rem 0">' +
 '<b class="small">Kondisi terkini dari pengunjung</b>' +
 (saved? '<div style="margin:.4rem 0"><img src="' + saved + '" alt="Foto kondisi" style="max-width:100%;border-radius:12px;border:1px solid var(--line)"></div>' :
 '<p class="muted small" style="margin:.3rem 0">Belum ada foto. Jadi orang pertama yang dokumentasi!</p>') +
 '<input type="file" accept="image/*" id="pasfoto-input" style="font-size:.8rem">' +
 (saved? '<button class="chip" data-act="fotodel" data-id="' + id + '" style="margin-left:.4rem">Hapus foto</button>' : '') +
 '</div>';
}
function pasfotoBind(id) {
 const inp = document.getElementById('pasfoto-input');
 if (!inp) return;
 inp.onchange = () => {
 const f = inp.files && inp.files[0];
 if (!f) return;
 if (f.size > 400000) { toast('Fotonya kegedean (>400 KB). Ambil yang lebih kecil ya.'); return; }
 const rd = new FileReader();
 rd.onload = () => {
 try { localStorage.setItem(fotoKey(id), String(rd.result)); } catch (e) { toast('Penyimpanan penuh, hapus foto lain dulu.'); return; }
 toast('Makasih. Foto kondisinya tersimpan di perangkat ini, masih demo komunitas.');
 openDetail(id);
 };
 rd.readAsDataURL(f);
 };
}
let waAlertTimer = null, lastWorst = null;
function waAlertToggle() {
 if (waAlertTimer) { clearInterval(waAlertTimer); waAlertTimer = null; toast('Pantauan langit dimatikan.'); return; }
 const start = () => {
 lastWorst = ENV.worst();
 waAlertTimer = setInterval(() => {
 const w = ENV.worst();
 if (w!== lastWorst) {
 const d0 = ENV.days[0] || {};
 const msg = 'Langit berubah: ' + (ENV.catLabel[w] || w) + ', PM2.5 sekitar ' + d0.pm25;
 if (window.Notification && Notification.permission === 'granted') try { new Notification('Si Buru Raun', { body: msg }); } catch (e) {}
 toast('' + msg + ', cek itinerary-mu!');
 lastWorst = w;
 }
 }, 60000);
 toast('Siap! Aku ingatkan kalau langitnya berubah (cek tiap 1 menit).');
 };
 if (window.Notification && Notification.permission!== 'granted') {
 Notification.requestPermission().then(p => { if (p === 'granted') start(); else { toast('Notifikasi ditolak, pantauan tetap jalan lewat toast.'); start(); } });
 } else start();
}
function waStatus() {
 const d0 = ENV.days[0] || {};
 const msg = '[Si Buru Raun] Langit PKY: ' + (ENV.catLabel[d0.cat] || '') + ' , PM2.5 sekitar ' + d0.pm25 + ', hujan ' + (d0.rain || 0) + ' mm. Cek itinerary-mu di Raun Kalteng.';
 window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
}
function loadSharedPlan() {
 if (!location.hash.startsWith('#plan=')) return false;
 try {
 const payload = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(6)))));
 if (!payload ||!Array.isArray(payload.s) ||!payload.s.length) return false;
 state.params = payload.p || { days: 2, budget: 250000, prefs: ['alam'] };
 state.variant = payload.v || 0;
 const slots = CORE.SLOTS;
 state.plan = {
 variants: payload.s.map(x => ({
 key: 'santai', nama: x.n || 'Trip', desk: 'itinerary hasil bagikan', cost: x.c || 0, score: 0,
 plan: (x.plan || []).map(d => ({
 cells: (d.i || []).map((ids, si) => ({
 slot: slots[si] || slots[0],
 items: ids.map(id => { const dd = byId(id); return { id, nama: dd? dd.nama : id, cost: dd? dd.cost : 0, sc: 1, pf: 1, env: 1, reasons: [], food: dd? dd.tags.includes('kuliner') : false }; })
 })).filter(c => c.items.length)
 }))
 })),
 visited: 0, space: 0, ms: 0
 };
 showView('view-plan'); renderPlan();
 toast('Ini itinerary titipan temanmu. Cek dulu langitnya, baru berangkat.');
 return true;
 } catch (e) { return false; }
}

/* ---------- SHARE / PRINT / NAV ---------- */
function sharePlan() {
 if (!state.plan) return;
 const payload = { p: state.params, v: state.variant, s: state.plan.variants.map(x => ({ n: x.nama, c: x.cost, plan: x.plan.map(d => ({ i: d.cells.map(c => c.items.map(i => i.id)) })) })) };
 const hash = '#plan=' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
 history.replaceState(null, '', hash);
 const url = location.href;
 (navigator.clipboard? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Linknya sudah tersalin, tinggal kirim ke teman atau keluarga.')).catch(() => toast('Link itinerary ada di address bar, tinggal copy.'));
}
function showView(id) {
 $$('.view').forEach(v => v.hidden = v.id!== id);
 $$('.bottomnav.bn-item').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id.replace('view-', '').replace('destinasi', 'destinasi').replace('umkm', 'umkm').replace('data', 'data').replace('home', 'home')));
 window.scrollTo({ top: 0 });
 if (id === 'view-plan' && leafletMap) setTimeout(() => leafletMap.invalidateSize(), 200);
}

/* ---------- UTIL UI ---------- */
function toast(msg) {
 const t = $('#toast'); t.textContent = msg; t.hidden = false;
 clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 3200);
}
function showModal(id) { $('#' + id).hidden = false; }
function closeModals() { $$('.modal').forEach(m => m.hidden = true); }

/* ---------- MODE TOGGLES ---------- */
function setMode(mode) {
 ENV.mode = mode; $('#btn-live').hidden = mode === 'live';
 $('#btn-replay').classList.toggle('active', mode === 'replay');
 $('#btn-flood').classList.toggle('active', mode === 'flood');
 ENV.refresh();
 toast(mode === 'replay'? ' Replay 14 Okt 2026: langit merah, itinerary luar akan terdeteksi ' :
 mode === 'flood'? ' Mode Banjir: area rendah dihindari mesin' : ' Mode live (Open-Meteo)');
}
function toggleFlood(on) { setMode(on || ENV.mode!== 'flood'? (ENV.mode === 'flood' &&!on? 'live' : 'flood') : 'live'); }

/* ---------- INIT ---------- */
document.addEventListener('click', e => {
 const act = e.target.closest('[data-act]');
 if (act) { doAction(act.dataset.act, act.dataset.id || '', act.dataset); return; }
 const fv = e.target.closest('[data-fav]');
 if (fv) { FAV.toggle(fv.dataset.fav); fv.classList.toggle('on'); fv.textContent = fv.classList.contains('on')? '' : ''; toast(FAV.has(fv.dataset.fav)? ' Masuk daftar favoritmu.' : 'Dihapus dari favorit.'); return; }
 if (e.target.closest('[data-close]')) closeModals();
 if (e.target.classList && e.target.classList.contains('modal')) closeModals();
});
$('#btn-wizard').onclick = openWizard;
$('#form-wizard').onsubmit = runWizard;
$('#btn-share').onclick = sharePlan;
$('#btn-print').onclick = () => window.print();
$('#btn-edit').onclick = openWizard;
$('#btn-replay').onclick = () => setMode('replay');
$('#btn-flood').onclick = () => setMode(ENV.mode === 'flood'? 'live' : 'flood');
$('#btn-live').onclick = () => setMode('live');
$('#btn-waalert').onclick = waAlertToggle;
$('#btn-wastatus').onclick = waStatus;
$('#bn-raun').onclick = e => { e.preventDefault(); openWizard(); };
$('#pasraun-reset').onclick = () => PASRAUN.reset();
$('#btn-darurat').onclick = () => showModal('modal-darurat');
// slider budget tersinkron dengan angka
const br = $('#wz-budget-range'), bn = $('#wz-budget'), bl = $('#wz-budget-label');
br.oninput = () => { bn.value = br.value; bl.textContent = fmtRp(+br.value); };
bn.oninput = () => { br.value = Math.min(1000000, Math.max(50000, +bn.value || 250000)); bl.textContent = fmtRp(+bn.value || 0); };
$('#chat-fab').onclick = () => { const p = $('#chat-panel'); p.hidden =!p.hidden; if (!p.hidden &&!$('#chat-log').children.length) chatAdd('bot', 'Hai! Saya Raun Mau tanya langit hari ini, kuliner enak, urusan Sebangau, atau langsung <span class="mact" data-act="openwizard">susun itinerary</span>?'); };
$('#chat-close').onclick = () => $('#chat-panel').hidden = true;
$('#chat-form').onsubmit = e => { e.preventDefault(); const i = $('#chat-input'); const q = i.value.trim(); if (!q) return; chatAdd('user', q); i.value = ''; botReply(q); };
$('#wz-prefs').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) c.classList.toggle('active'); });
$$('#siap-filters.chip').forEach(c => c.onclick = () => { $$('#siap-filters.chip').forEach(x => x.classList.remove('active')); c.classList.add('active'); renderSiap(c.dataset.tema); });
$$('#dest-filters.chip').forEach(c => c.onclick = () => { $$('#dest-filters.chip').forEach(x => x.classList.remove('active')); c.classList.add('active'); renderCatalog(c.dataset.tag); });
$$('#kat-rail.chip').forEach(c => c.onclick = () => { showView('view-destinasi'); renderCatalog(c.dataset.kat); $$('#dest-filters.chip').forEach(x => x.classList.toggle('active', x.dataset.tag === c.dataset.kat)); });
$$('[data-nav]').forEach(a => a.onclick = e => {
 e.preventDefault();
 const map = { '#home': 'view-home', '#siappakai': 'view-home', '#destinasi': 'view-destinasi', '#budaya': 'view-budaya', '#umkm': 'view-umkm', '#data': 'view-data' };
 const target = map[a.getAttribute('href')] || 'view-home';
 showView(target);
 const anchor = document.querySelector(a.getAttribute('href'));
 if (a.getAttribute('href') === '#siappakai' && anchor) anchor.scrollIntoView({ behavior: 'smooth' });
});

(() => {
 const nb = document.getElementById('net-banner'); if (!nb) return;
 const cek = () => { nb.hidden = navigator.onLine; };
 window.addEventListener('online', cek); window.addEventListener('offline', cek); cek();
})();

renderSiap('semua'); renderCatalog('semua'); renderUmkm(); renderKuliner(); renderRegional(); renderTidurNgopi(); renderDashboard(); renderSimReport();
PASRAUN.render();
(() => { // badge stempel kecil di navbar
 const b = document.querySelector('.nav-badge');
 if (b) { const s = document.createElement('span'); s.id = 'stamp-badge'; s.style.marginLeft = '.5rem'; s.textContent = '0/5'; b.parentNode.appendChild(s); }
})();
if (!loadSharedPlan()) { /* buka biasa */ }
ENV.refresh();
if ('serviceWorker' in navigator && location.protocol === 'http') {
 navigator.serviceWorker.register('sw.js').catch(() => {});
}
