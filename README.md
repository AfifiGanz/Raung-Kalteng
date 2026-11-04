# Raun Kalteng

Kawan raun di Palangka Raya. Raun menyusun rencana jalan-jalan sesuai tanggal, rombongan, dan budget, lalu membaca kondisi langit. Kalau asap karhutla turun atau Sungai Kahayan meluap, Raun menandai tempat yang perlu diganti dan menyarankan penggantinya.

Prototipe untuk Tambun Bungai Ideathon, Borneo DECAFEST 2026 (KPw BI Kalteng). Tarif, koordinat, dan nomor operator masih data demo.

## Fitur

- **Papan Langit**: status udara dan hujan 3 hari dari Open-Meteo, plus mode demo *Asap 14 Okt* dan *Banjir*.
- **Susun rencana**: menimbang paling sedikit 99.999 kombinasi, lalu memberi tiga versi (Santai, Padat, Hemat). Tempat outdoor diberi tanda saat langit buruk dan bisa diganti dengan satu ketukan.
- **Rencana jadi** untuk 1–2 hari, dan **link bagikan** untuk mengirim rencana ke teman.
- **Jelajah**: destinasi, kuliner, penginapan, kafe, dan tujuan di luar kota, dengan favorit tersimpan di perangkat.
- **Pas Raun**: QRIS demo per warung mitra, lima stempel bisa ditukar suvenir.
- **Transport**: Gojek (deep link) dan Otsok (WhatsApp dengan pesan terisi).
- **PWA**: bisa dipasang di HP dan tetap jalan offline. Ada juga versi satu file untuk dikirim lewat WhatsApp.
- Mode gelap otomatis. Aksesibilitas diuji dengan axe (WCAG 2.2 AA).

## Menjalankan

App ini tanpa framework dan tanpa build step. Cukup sajikan folder `raun-kalteng/`:

```bash
cd raun-kalteng
python3 -m http.server 8765
```

Di Windows, ganti `python3` dengan `py`. Lalu buka http://localhost:8765.

Membuka `index.html` langsung dari file explorer juga bisa, tapi service worker (mode offline) hanya aktif lewat `http://`.

## Versi satu file (offline)

```bash
cd raun-kalteng
node build.mjs
```

Hasilnya `raun-kalteng/dist/raun-kalteng-offline.html`. Kirim lewat WhatsApp atau Drive, lalu buka di browser HP mana pun. Peta dan data langit live tetap butuh internet. Selain itu, termasuk QRIS, semuanya jalan offline.

## Pengujian

```bash
cd raun-kalteng
npm install
npx playwright install chromium
```

| Perintah | Isi |
|---|---|
| `npm test` | Uji mesin dan data (`node --test`): integritas rencana jadi, escaping, validasi link bagikan, data langit parsial |
| `npm run test:e2e` | 40+ cek di browser sungguhan (sajikan folder di port 8765 dulu). Tambahkan `AXE=node_modules/axe-core/axe.min.js` untuk audit aksesibilitas |
| `npm run fuzz` | 60.000 input acak dan rusak ke mesin rencana (±90 detik) |

GitHub Actions (`.github/workflows/test.yml`) menjalankan semua uji di atas pada setiap push, termasuk cek bahwa `dist/` sudah dibangun ulang.

## Struktur

```
raun-kalteng/
  index.html      halaman dan semua tampilan
  styles.css      token desain (terang/gelap) dan komponen
  data.js         katalog destinasi, rencana jadi, kuliner, event
  core.js         mesin rencana dan skor langit (tanpa DOM, dipakai juga oleh tes dan simulasi)
  app.js          UI: langit, router, rencana, peta, dialog, asisten, dasbor
  sw.js           service worker
  vendor/         pustaka QR (MIT), disimpan lokal agar jalan offline
  sim/            simulasi multi-agen dan hasilnya (tampil di halaman Data)
  tests/          uji unit dan uji browser
  dist/           versi satu file hasil build.mjs
```

## Sumber data

- Kualitas udara dan cuaca: [Open-Meteo](https://open-meteo.com) (tanpa API key).
- Peta: © kontributor [OpenStreetMap](https://www.openstreetmap.org/copyright), lewat Leaflet.
- Banjir masih simulasi lokal. Rencananya disambungkan ke kanal resmi BMKG dan BNPB.

## Keamanan

- Semua teks dinamis di-escape sebelum masuk HTML, dan link bagikan divalidasi ke katalog.
- Content Security Policy membatasi skrip dan koneksi. Leaflet dimuat dengan Subresource Integrity.
- Statistik dasbor, favorit, stempel, dan foto hanya tersimpan di perangkat pengguna. Tidak ada yang dikirim ke server.
