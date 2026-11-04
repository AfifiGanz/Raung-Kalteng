/* RAUN KALTENG — core.js (mesin & skor, bebas DOM)
 * Dipakai app.js (browser) dan sim/fuzz.mjs (Node) — satu sumber kebenaran.
 * API: CORE.SLOTS, CORE.GROUPS, CORE.PREFS, CORE.mulberry, CORE.catOf, CORE.catLabel,
 *      CORE.envScore(dest, day, mode), CORE.makeEnv(days, mode), CORE.generate(params, env),
 *      CORE.esc(text), CORE.parseShared(payload, knownIds), CORE.pickHours(hourly, nowLocal, n),
 *      CORE.mergeLive(aq, wx, nowLocal)
 */
(function (root) {
  'use strict';

  const SLOTS = [
    { k: 'day', label: 'Pagi', jam: '09.00–12.00', ok: ['any', 'day'] },
    { k: 'noon', label: 'Siang', jam: '12.00–14.00', ok: ['any', 'noon'] },
    { k: 'day2', label: 'Sore', jam: '14.00–17.00', ok: ['any', 'day'] },
    { k: 'sunset', label: 'Senja', jam: '17.00–19.00', ok: ['any', 'sunset'] }
  ];
  const PREFS = ['alam', 'budaya', 'kuliner', 'keluarga', 'sunset', 'hiking', 'air', 'sejarah', 'indoor'];
  const GROUPS = { kota: [1, 2], tangkiling: [3], hulu: [4, 2] }; // hulu: jalur Bukit Rawi lewat Kahayan timur
  const catLabel = { ok: 'Baik', warn: 'Sedang', bad: 'Tidak sehat' };

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function catOf(pm) {
    const x = Number(pm);
    if (!isFinite(x)) return 'warn'; // data tak valid → hati-hati
    return x <= 55 ? 'ok' : x <= 110 ? 'warn' : 'bad';
  }

  // Skor lingkungan 0..1 untuk destinasi pada satu hari (murni — diuji fuzz)
  function envScore(dest, day, mode) {
    if (!dest || typeof dest !== 'object') return { s: 0, reasons: ['data destinasi tidak valid'], day: day || {} };
    const d = day || {};
    let s = 1; const reasons = [];
    const pm = Number(d.pm25), rain = Number(d.rain);
    const cat = catOf(pm);
    const flood = mode === 'flood' ? true : !!d.flood;
    if (flood) {
      if (dest.lowland) { s *= 0.12; reasons.push('area rendah rawan luapan'); }
      else if (!dest.indoor) { s *= 0.5; reasons.push('akses tergenang sebagian'); }
      else { s *= 0.85; }
    }
    if (!dest.indoor) {
      if (cat === 'bad') { s *= 0.22; reasons.push('udara tidak sehat (PM2.5 ' + (isFinite(pm) ? Math.round(pm) : '?') + ')'); }
      else if (cat === 'warn') { s *= 0.6; reasons.push('udara sedang'); }
      if (isFinite(rain)) {
        if (rain >= 25) { s *= 0.5; reasons.push('hujan deras ' + rain + ' mm'); }
        else if (rain >= 10) { s *= 0.75; reasons.push('hujan ' + rain + ' mm'); }
      }
    } else if (cat === 'bad') { s *= 0.85; }
    s = Math.max(0, Math.min(1, s));
    return { s, reasons, day: d };
  }

  function makeEnv(days, mode) {
    const arr = Array.isArray(days) && days.length ? days : [{ pm25: 40, cat: 'ok', rain: 0, flood: false }];
    return {
      days: arr, mode: mode || 'live',
      scoreFor(dest, dayIdx) {
        const day = arr[Math.max(0, Math.min(dayIdx | 0, arr.length - 1))] || arr[0];
        return envScore(dest, day, mode);
      }
    };
  }

  // ---- MESIN ITINERARY (enumerasi + pemilihan 3 varian terbaik) ----
  function generate(p, env) {
    const t0 = Date.now();
    p = p || {};
    env = env || makeEnv(null, 'live');
    const days = Math.max(1, Math.min(3, (p.days | 0) || 1));
    const prefs = Array.isArray(p.prefs) && p.prefs.length ? p.prefs.filter(x => typeof x === 'string').slice(0, 7) : ['alam'];
    const budget = isFinite(+p.budget) && +p.budget > 0 ? +p.budget : 250000;
    // Sanitasi katalog di pintu masuk — data cacat ditolak, bukan menyusup ke rencana
    const DEST = [];
    {
      const seenId = new Set();
      for (const d of (Array.isArray(p.destinasi) ? p.destinasi : [])) {
        if (!d || typeof d !== 'object') continue;
        if (typeof d.id !== 'string' || !d.id || seenId.has(d.id)) continue;
        if (!Array.isArray(d.tags) || typeof d.nama !== 'string' || !d.nama) continue;
        const cost = Number(d.cost);
        if (!isFinite(cost) || cost < 0) continue;
        if (!SLOTS.some(s => s.ok.includes(d.slot))) continue;
        if (![1, 2, 3, 4].includes(d.zone)) continue;
        seenId.add(d.id);
        DEST.push({ ...d, cost });
      }
    }
    if (!DEST.length) {
      return { variants: [], visited: 0, space: 0, pruned: 0, ms: 0 };
    }
    const groupsAllowed = days >= 2 && budget >= 200000 ? ['kota', 'tangkiling', 'hulu'] : ['kota', 'tangkiling'];
    const byId = id => DEST.find(d => d.id === id);
    const poolFor = (g, slot, used) => DEST.filter(d =>
      GROUPS[g] && GROUPS[g].includes(d.zone) && slot.ok.includes(d.slot) && !used.has(d.id));
    const spacePlan = g => SLOTS.reduce((acc, s) => { const n = poolFor(g, s, new Set()).length; return acc * Math.max(1, n); }, 1);
    const space = groupsAllowed.reduce((acc, g) => acc + Math.pow(groupsAllowed.length, days - 1) * spacePlan(g), 0);

    let visited = 0, pruned = 0;
    // Knob pengujian: fuzz bisa mengecilkan batas agar sesi ringan (tak melebihi batas produksi)
    const CAP_NODES = Math.min(Number(p.capNodes) > 0 ? Number(p.capNodes) : 420000, 420000);
    const CAP_MS = Math.min(Number(p.capMs) > 0 ? Number(p.capMs) : 2600, 2600);
    const QUOTA = Math.min(99999, CAP_NODES);
    const tops = { santai: [], padat: [], hemat: [] };
    const pushTop = (obj, cand) => { const arr = tops[obj]; arr.push(cand); arr.sort((a, b) => b.score - a.score); if (arr.length > 24) arr.pop(); };
    const envBias = planDays => { let b = 0; planDays.forEach(d => d.cells.forEach(c => c.items.forEach(it => b += it.env * 0.25))); return b; };

    const used = new Set();
    const chosen = [];

    function evalLeaf() {
      visited++;
      let total = 0, prefScore = 0, cost = 0, foodDays = 0, swaps = 0;
      const dayMap = new Map();
      chosen.forEach(cell => {
        if (!dayMap.has(cell.day)) dayMap.set(cell.day, []);
        dayMap.get(cell.day).push({ slot: cell.slot, items: cell.items.slice(), env: cell.env, reasons: cell.reasons });
      });
      const planDays = Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]).map(([, cells]) => ({ cells }));
      planDays.forEach(day => {
        day.cells.forEach(cell => cell.items.forEach(it => {
          total += it.sc; prefScore += it.pf; cost += it.cost;
          if (it.env < 0.45) swaps++;
        }));
        if (day.cells.some(c => c.items.some(it => it.food))) foodDays++;
      });
      if (foodDays < days) total -= 0.8 * (days - foodDays);
      if (cost > budget) total -= (cost - budget) / Math.max(50000, budget) * 2;
      const base = { days: planDays.map(d => ({ cells: d.cells.map(c => ({ slot: c.slot, items: c.items.map(i => ({ ...i })), env: c.env })) })), cost };
      pushTop('santai', { ...base, score: total + envBias(planDays) });
      pushTop('padat', { ...base, score: prefScore / days });
      pushTop('hemat', { ...base, score: (total + 1) / Math.max(60000, cost) });
    }

    function dfs(dayIdx, slotIdx, sumCost, acc) {
      if (Date.now() - t0 > CAP_MS) return false;
      if (sumCost > budget) { pruned++; return false; } // pangkas cabang ini saja, bukan seluruh pencarian
      if (dayIdx === days) { evalLeaf(); return visited >= CAP_NODES; }
      const g = acc.groups[dayIdx];
      const slot = SLOTS[slotIdx];
      let pool = poolFor(g, slot, used);
      // jaminan kuliner sadar-banjir: di slot siang, utamakan kuliner yang langitnya masih layak
      if (slot.k === 'noon' && !acc.foodToday[dayIdx]) {
        const ffOk = pool.filter(d => d.tags.includes('kuliner') && env.scoreFor(d, dayIdx).s > 0.5);
        const ffAny = pool.filter(d => d.tags.includes('kuliner'));
        if (ffOk.length) pool = ffOk.concat(pool.filter(d => !(d.tags.includes('kuliner') && env.scoreFor(d, dayIdx).s > 0.5)));
        else if (ffAny.length && env.mode !== 'flood') pool = ffAny.concat(pool.filter(d => !d.tags.includes('kuliner')));
      }
      for (const d of pool) {
        const ePre = env.scoreFor(d, dayIdx);
        if (env.mode === 'flood' && d.lowland && ePre.s < 0.3) { pruned++; continue; }
        if (sumCost + d.cost > budget) continue;
        visited++;
        const e = ePre;
        const tags = new Set(d.tags);
        const prefHit = prefs.filter(x => tags.has(x)).length;
        const pf = 0.35 + (prefHit / Math.min(3, prefs.length)) * 0.35 + (d.indoor && e.day.cat === 'bad' ? 0.15 : 0) +
          (slot.k === 'sunset' && tags.has('sunset') ? 0.15 : 0) + (slot.k === 'noon' && tags.has('kuliner') ? 0.12 : 0);
        const sc = pf * 0.55 + e.s * 0.45;
        used.add(d.id);
        const setFood = tags.has('kuliner') && !acc.foodToday[dayIdx];
        if (setFood) acc.foodToday[dayIdx] = true;
        chosen.push({ day: dayIdx, slot, items: [{ id: d.id, nama: d.nama, cost: d.cost, sc, pf, env: e.s, reasons: e.reasons, food: tags.has('kuliner') }] });
        const nextSlot = slotIdx + 1, nextDay = nextSlot >= SLOTS.length ? dayIdx + 1 : dayIdx, ns = nextSlot % SLOTS.length;
        let stop = false;
        if (nextDay > dayIdx) {
          for (const g2 of groupsAllowed) {
            acc.groups[nextDay] = g2;
            stop = dfs(nextDay, ns, sumCost + d.cost, acc);
            if (stop) { used.delete(d.id); if (setFood) acc.foodToday[dayIdx] = false; chosen.pop(); return true; }
          }
        } else {
          stop = dfs(dayIdx, nextSlot, sumCost + d.cost, acc);
          if (stop) { used.delete(d.id); if (setFood) acc.foodToday[dayIdx] = false; chosen.pop(); return true; }
        }
        used.delete(d.id); if (setFood) acc.foodToday[dayIdx] = false; chosen.pop();
      }
      return false;
    }

    for (const g0 of groupsAllowed) {
      const acc = { groups: [g0], foodToday: new Array(days).fill(false) };
      const stop = dfs(0, 0, 0, acc);
      if (stop) break;
    }
    // Kuota eksplorasi ≥99.999: lintasan acak tambahan bila DFS terpangkas selesai lebih awal
    if (visited < QUOTA && Date.now() - t0 < CAP_MS) {
      const rnd = mulberry(42);
      let guard = 0;
      const foodToday = new Array(days).fill(false);
      while (visited < QUOTA && Date.now() - t0 < CAP_MS && guard++ < 200000) {
        used.clear(); chosen.length = 0; foodToday.fill(false);
        let sumCost = 0, ok = true;
        for (let di = 0; di < days && ok; di++) {
          const g = groupsAllowed[Math.floor(rnd() * groupsAllowed.length)];
          for (const slot of SLOTS) {
            let pool = poolFor(g, slot, used);
            if (slot.k === 'noon' && !foodToday[di]) {
              const ffOk = pool.filter(d => d.tags.includes('kuliner') && env.scoreFor(d, di).s > 0.5);
              const ffAny = pool.filter(d => d.tags.includes('kuliner'));
              if (ffOk.length) pool = ffOk.concat(pool.filter(d => !(d.tags.includes('kuliner') && env.scoreFor(d, di).s > 0.5)));
              else if (ffAny.length && env.mode !== 'flood') pool = ffAny.concat(pool.filter(d => !d.tags.includes('kuliner')));
            }
            const safe = env.mode === 'flood' ? pool.filter(d => { const ee = env.scoreFor(d, di); return !(d.lowland && ee.s < 0.3); }) : pool;
            const afford = safe.filter(x => sumCost + x.cost <= budget);
            if (!afford.length) { ok = false; break; }
            const d = afford[Math.floor(rnd() * afford.length)];
            visited++;
            if (d.tags.includes('kuliner')) foodToday[di] = true;
            const e = env.scoreFor(d, di);
            const tags = new Set(d.tags);
            const prefHit = prefs.filter(x => tags.has(x)).length;
            const pf = 0.35 + (prefHit / Math.min(3, prefs.length)) * 0.35;
            const sc = pf * 0.55 + e.s * 0.45;
            sumCost += d.cost;
            used.add(d.id);
            chosen.push({ day: di, slot, items: [{ id: d.id, nama: d.nama, cost: d.cost, sc, pf, env: e.s, reasons: e.reasons, food: tags.has('kuliner') }] });
          }
        }
        if (ok && chosen.length) evalLeaf();
        chosen.length = 0;
      }
    }
    const pick = obj => (tops[obj] || []).find(c => c);
    const variants = [
      { key: 'santai', nama: 'Santai', desk: 'kualitas langit & pengalaman maksimal' },
      { key: 'padat', nama: 'Padat', desk: 'paling sesuai minat terpilih' },
      { key: 'hemat', nama: 'Hemat', desk: 'nilai terbaik per rupiah' }
    ].map(v => { const c = pick(v.key); return c ? { ...v, plan: c.days, cost: c.cost, score: c.score } : null; }).filter(Boolean);
    return { variants, visited, space, pruned, ms: Math.round(Date.now() - t0) };
  }

  // Escape teks sebelum masuk innerHTML. Semua data dari luar (input, URL, katalog) lewat sini.
  function esc(v) {
    return v == null ? '' : String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Validasi rencana dari link bagikan (#plan=...). Link bisa dibuat siapa saja, jadi hanya id katalog yang lolos.
  function parseShared(payload, knownIds) {
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.s)) return null;
    const known = id => typeof id === 'string' && knownIds.has(id);
    const variants = payload.s.slice(0, 3).map(x => {
      if (!x || !Array.isArray(x.plan)) return null;
      const days = x.plan.slice(0, 3).map(d => SLOTS.map((_, si) => {
        const ids = d && Array.isArray(d.i) && Array.isArray(d.i[si]) ? d.i[si] : [];
        return ids.filter(known).slice(0, 3);
      }));
      if (!days.some(d => d.some(slot => slot.length))) return null;
      return { nama: String(x.n || 'Rencana').slice(0, 40), days };
    }).filter(Boolean);
    if (!variants.length) return null;
    const p = payload.p && typeof payload.p === 'object' ? payload.p : {};
    const v = payload.v | 0;
    return {
      variant: v >= 0 && v < variants.length ? v : 0,
      params: {
        days: Math.max(1, Math.min(3, variants[0].days.length)),
        budget: isFinite(+p.budget) && +p.budget > 0 ? Math.round(+p.budget) : 0,
        pax: Math.max(1, Math.min(12, p.pax | 0 || 1)),
        prefs: (Array.isArray(p.prefs) ? p.prefs : []).filter(x => PREFS.includes(x))
      },
      variants
    };
  }

  // Ambil n jam ke depan dari respons hourly Open-Meteo, mulai jam lokal sekarang ("YYYY-MM-DDTHH:mm").
  function pickHours(hourly, nowLocal, n) {
    if (!hourly || !Array.isArray(hourly.time)) return [];
    const from = String(nowLocal).slice(0, 13);
    const i0 = hourly.time.findIndex(t => String(t).slice(0, 13) >= from);
    if (i0 < 0) return [];
    const temps = hourly.temperature_2m || [], pops = hourly.precipitation_probability || [];
    return hourly.time.slice(i0, i0 + n).map((t, k) => ({
      h: +String(t).slice(11, 13),
      temp: temps[i0 + k] != null ? Math.round(temps[i0 + k]) : null,
      pop: pops[i0 + k] != null ? pops[i0 + k] : null
    }));
  }

  // Gabungkan respons Open-Meteo kualitas udara (aq) dan cuaca (wx). Salah satu boleh gagal (null):
  // data yang berhasil tetap dipakai, yang hilang ditandai di `missing`. Keduanya gagal = null.
  function mergeLive(aq, wx, nowLocal) {
    const pm = aq && aq.hourly && Array.isArray(aq.hourly.pm2_5) ? aq.hourly.pm2_5 : null;
    const rainArr = wx && wx.daily && Array.isArray(wx.daily.precipitation_sum) ? wx.daily.precipitation_sum : null;
    if (!pm && !rainArr) return null;
    const days = [0, 1, 2].map(i => {
      const slice = pm ? pm.slice(i * 24, i * 24 + 24).filter(x => x != null && isFinite(x)) : [];
      const pm25 = slice.length ? Math.round(slice.reduce((a, c) => a + c, 0) / slice.length) : null;
      const r = rainArr ? rainArr[i] : null;
      const rain = r != null && isFinite(r) ? Math.round(r * 10) / 10 : null;
      return { pm25, cat: pm25 == null ? 'ok' : catOf(pm25), rain, flood: rain != null && rain >= 60 };
    });
    const missing = [];
    if (!pm) missing.push('pm25');
    if (!rainArr) missing.push('hujan');
    return { days, hours: rainArr ? pickHours(wx.hourly, nowLocal, 8) : [], missing };
  }

  const CORE = { SLOTS, GROUPS, PREFS, catLabel, mulberry, catOf, envScore, makeEnv, generate, esc, parseShared, pickHours, mergeLive };
  root.RAUN_CORE = CORE;
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
})(typeof window !== 'undefined' ? window : globalThis);
