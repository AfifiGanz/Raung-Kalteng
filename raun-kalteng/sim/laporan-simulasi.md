# Laporan Simulasi Multi-Agent — Raun Kalteng
*Pola diadaptasi dari [MiroFish (666ghj/MiroFish)](https://github.com/666ghj/MiroFish) — swarm intelligence untuk menguji & memilih konfigurasi terbaik.*

- **Agen virtual:** 2.000.000 (target ≥99.999 terpenuhi)
- **Skenario langit:** 5 (cerah → asap ringan → asap pekat → hujan → banjir)
- **Kandidat dinilai mesin:** 92.537.032 · durasi 37505 ms
- Seed: 20261101 (deterministik, dapat direproduksi)

## Headline
| Metrik | Cerah (normal) | Asap ringan (PM2.5 95) | Asap pekat 14 Okt 2026 | Hujan ringan | Hujan ekstrem + luapan |
|---|---------------|
| Skor median (0–1) | 0.68 | 0.57 | 0.43 | 0.60 | 0.27 |
| Fit budget | 100% | 100% | 87% | 100% | 98% |
| Pelanggaran area rawan | 0 | 0 | 0 | 0 | 0 |

**Adu strategi:** greedy menang (median 0.531 vs 0.497) → pertahankan greedy; greedy-improve cukup untuk varian "Hemat".

## Temuan terbaik ("ambil yang bagus")
- **Cerah (normal)** — 400.000 agen: skor median 0.68/1.0 · fit-budget 100% · rata-rata penyesuaian langit 0/sesi · pelanggaran area-rawan: 0 · struktur pemenang: kota (18%)
- **Asap ringan (PM2.5 95)** — 400.000 agen: skor median 0.57/1.0 · fit-budget 100% · rata-rata penyesuaian langit 0/sesi · pelanggaran area-rawan: 0 · struktur pemenang: kota (18%)
- **Asap pekat 14 Okt 2026** — 400.000 agen: skor median 0.43/1.0 · fit-budget 87% · rata-rata penyesuaian langit 2.8/sesi · pelanggaran area-rawan: 0 · struktur pemenang: kota (18%)
- **Hujan ringan** — 400.000 agen: skor median 0.60/1.0 · fit-budget 100% · rata-rata penyesuaian langit 0/sesi · pelanggaran area-rawan: 0 · struktur pemenang: kota (18%)
- **Hujan ekstrem + luapan** — 400.000 agen: skor median 0.27/1.0 · fit-budget 98% · rata-rata penyesuaian langit 2.1/sesi · pelanggaran area-rawan: 0 · struktur pemenang: kota (18%)
- **Resiliensi banjir:** 400.000 agen di skenario luapan menghasilkan 0 pelanggaran area rendah (0%) — mesin menghindari tepi danau/bantaran secara konsisten.
- **Kantong gagal:** budget ≤Rp150rb di asap pekat hanya 49% fit-budget → jadikan dasar paket "Hemat Indoor Rp100rb" (temuan langsung utk pitch).
- **Adu strategi:** greedy menang (median 0.531 vs 0.497) → pertahankan greedy; greedy-improve cukup untuk varian "Hemat".

## Rencana aksi dari temuan
1. Terapkan strategi pemenang adu di atas sebagai default mesin browser.
2. Buat paket **"Hemat Indoor Rp100rb"** — menutup kantong gagal budget rendah saat asap pekat.
3. Tampilkan angka simulasi ini di pitch: *"diuji terhadap 2.000.000 wisatawan virtual dalam 5 skenario iklim; 92.537.032 kandidat destinasi dinilai"*.
