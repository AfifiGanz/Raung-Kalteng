/* Raun Kalteng v0.5 — service worker
 * Halaman: network-first (versi baru langsung terpakai), cadangan cache saat offline.
 * Aset lain: stale-while-revalidate. Hanya respons sukses dari origin sendiri yang disimpan.
 */
const CACHE = 'raun-v0-5';
const ASSETS = ['./', './index.html', './styles.css', './data.js', './core.js', './app.js', './vendor/qrcode.js', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const put = (req, res) => {
  if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
};
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => put(req, res)).catch(() => caches.match('./index.html')));
    return;
  }
  // Cocokkan URL persis (termasuk ?v=) agar aset versi baru tidak tertukar dengan cache lama.
  // ignoreSearch hanya dipakai sebagai cadangan saat offline.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => put(req, res)).catch(() => hit || caches.match(req, { ignoreSearch: true }));
    return hit || net;
  }));
});
