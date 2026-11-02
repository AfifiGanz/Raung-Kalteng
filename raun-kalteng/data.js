/* RAUN KALTENG, Katalog data v0 (demo)
 * Sumber konten: laporan analisis ideathon + pengetahuan destinasi PKY.
 * Koordinat & tarif = estimasi demo; wajib diverifikasi sebelum rilis publik.
 */
(function (root) {
 'use strict';

 // Zones: 1 pusat kota, 2 danau/kahayan timur, 3 tangkiling sebangau (selatan), 4 hulu (jauh)
 const DESTINASI = [
 { id: 'tugu', nama: 'Tugu Soekarno', zone: 1, tags: ['sejarah', 'budaya', 'keluarga', 'foto'], indoor: false, lowland: false, cost: 0, jam: 'buka 24 jam', slot: 'any',
 x: -0.02, y: 0.10, lat: -2.2117, lng: 113.9148,
 desc: 'Tongkat raksasa penanda titik nol kota. Kata orang, belum sah ke Palangka Raya kalau belum berfoto di depannya.',
 tips: 'Datang pagi saat masih sepi, atau sore sebelum makan malam. Parkirnya penuh di akhir pekan.', etika: null },

 { id: 'bundaran', nama: 'Bundaran Besar', zone: 1, tags: ['keluarga', 'foto', 'kuliner'], indoor: false, lowland: false, cost: 0, jam: 'buka 24 jam', slot: 'any',
 x: 0.06, y: 0.16, lat: -2.2058, lng: 113.9122,
 desc: 'Dataran bulat yang jadi titik temu kota. Begitu senja, jajanan keluar dan lampu-lampunya nyala.',
 tips: 'Paling hidup setelah maghrib. Pas jadi penutup sebelum pulang.', etika: null },

 { id: 'balanga', nama: 'Museum Balanga', zone: 1, tags: ['budaya', 'sejarah', 'indoor', 'keluarga'], indoor: true, lowland: false, cost: 5000, jam: 'Selasa sampai Sabtu, 08.00 sampai 14.00', slot: 'day',
 x: 0.14, y: 0.30, lat: -2.1978, lng: 113.9267,
 desc: 'Rumah bagi sandung asli, keramik tua, dan cerita Dayak Ngaju. Dingin, tenang, dan jadi pelarian terbaik saat asap datang.',
 tips: 'Datang pagi, minta pendamping dari loket kalau ingin cerita lengkapnya.', etika: 'Minta izin sebelum memotret koleksi tertentu.' },

 { id: 'riverfront', nama: 'Riverfront Jembatan Kahayan', zone: 1, tags: ['sunset', 'foto', 'kuliner', 'keluarga'], indoor: false, lowland: true, cost: 0, jam: 'buka 24 jam', slot: 'sunset',
 x: 0.00, y: 0.22, lat: -2.2200, lng: 113.9160,
 desc: 'Beranda kota di tepi Kahayan. Kalau langitnya bersih, matahari turun tepat di sisi jembatan dan airnya ikut keemasan.',
 tips: 'Matahari turun sekitar setengah enam sampai seperempat tujuh. Saat hujan deras, bantaran rendah bisa tergenang.', etika: null },

 { id: 'tamanisen', nama: 'Taman Isen Mulang', zone: 1, tags: ['keluarga', 'foto'], indoor: false, lowland: false, cost: 0, jam: '06.00 sampai 21.00', slot: 'any',
 x: 0.04, y: 0.06, lat: -2.2088, lng: 113.9130,
 desc: 'Halaman besar kota tempat karnaval Isen Mulang lewat setiap Mei. Sore harinya milik anak muda yang lari dan jajan.',
 tips: 'Datang sore kalau mau lihat suasananya, pagi kalau mau yang tenang.', etika: null },

 { id: 'pasarmalam', nama: 'Pasar Malam Riverfront', zone: 1, tags: ['kuliner', 'keluarga'], indoor: false, lowland: true, cost: 25000, jam: 'Jumat sampai Minggu, 17.00 sampai 22.00', slot: 'sunset',
 x: -0.03, y: 0.26, lat: -2.2230, lng: 113.9150,
 desc: 'Tiga malam seminggu, tepian ini berubah jadi dapur kota. Uang jajannya langsung masuk ke kantong pedagang kecil.',
 tips: 'Datang dengan perut kosong, pulang dengan tangan penuh wadai.', etika: null },

 { id: 'kulinerpatin', nama: 'Warung Patin Tepi Kahayan', zone: 2, tags: ['kuliner'], indoor: true, lowland: true, cost: 35000, jam: '10.00 sampai 21.00', slot: 'noon',
 x: -0.10, y: 0.32, lat: -2.2276, lng: 113.9080,
 desc: 'Patin bakar di atas arang, gulai tempoyak, terubuk asap. Tanya warga makan enak di mana, jawabannya sering ke sini.',
 tips: 'Saat Kahayan luapan tinggi, jalur ke tepi bisa genangan. Cek dulu lampu Si Buru.', etika: null },

 { id: 'danautahai', nama: 'Danau Tahai', zone: 2, tags: ['alam', 'sunset', 'foto', 'keluarga', 'air'], indoor: false, lowland: true, cost: 15000, jam: '07.00 sampai 18.30', slot: 'sunset',
 x: -0.16, y: 0.36, lat: -2.2276, lng: 113.9108,
 desc: 'Danau warisan era Soekarno yang malah jadi bintangnya kota. Sewa bangku kecil di tepian, tunggu matahari turun, selesai.',
 tips: 'Sewa perahu kecil dari warga kalau mau keluar ke air. Bawa kantong plastik untuk sampahmu sendiri.', etika: 'Tepian danau ini cepat kotor kalau pengunjung lalai, bawa pulang sampahmu.' },

 { id: 'tumbangtahai', nama: 'Kampung Tumbang Tahai', zone: 2, tags: ['budaya', 'kuliner', 'keluarga'], indoor: false, lowland: true, cost: 0, jam: 'buka 24 jam', slot: 'any',
 x: -0.14, y: 0.42, lat: -2.2355, lng: 113.9095,
 desc: 'Kampung panggung tepi danau. Rumahnya kayu, orangnya ramah, dan jembatannya jadi tempat foto yang tak pernah gagal.',
 tips: 'Sambungkan dengan Danau Tahai dalam satu jalan, lokasinya bersebelahan.', etika: 'Rumah warga adalah ruang pribadi. Salam dulu, izin dulu.' },

 { id: 'tangkiling', nama: 'Bukit Tangkiling', zone: 3, tags: ['alam', 'hiking', 'foto'], indoor: false, lowland: false, cost: 20000, jam: '06.00 sampai 17.30', slot: 'day',
 x: -0.24, y: -0.46, lat: -2.3211, lng: 113.9339,
 desc: 'Bukit granit yang didaki pendek tapi pandangannya jauh. Danau dan kota kelihatan semua dari atas.',
 tips: 'Bawa air se liter, sepatu yang berpenggenggam. Jalannya licin setelah hujan, tunggu dulu kalau baru turun.', etika: 'Sebagian areanya dipakai ritual kampung. Ikuti papan dan arahan warga.' },

 { id: 'bukitbatu', nama: 'Bukit Batu', zone: 3, tags: ['alam', 'hiking'], indoor: false, lowland: false, cost: 20000, jam: '06.00 sampai 17.00', slot: 'day',
 x: -0.34, y: -0.52, lat: -2.3300, lng: 113.9500,
 desc: 'Deretan batu raksasa yang bisa dipanjang sebentar, tapi pandangannya memutar tiga ratus enam puluh derajat.',
 tips: 'Satukan dengan Bukit Tangkiling dalam satu hari, jaraknya dekat.', etika: null },

 { id: 'seigohong', nama: 'Sei Gohong, gerbang Sebangau', zone: 3, tags: ['alam', 'air', 'keluarga', 'kuliner'], indoor: false, lowland: true, cost: 25000, jam: '08.00 sampai 16.00', slot: 'any',
 x: -0.38, y: -0.34, lat: -2.3097, lng: 113.8433,
 desc: 'Desa terakhir sebelum hutan gambut Sebangau. Dari dermaganya, perahu kecil masuk ke jalur air di tengah pohon.',
 tips: 'Pesan perahu dari kios informasi desa. Paling tenang pagi hari.', etika: 'Ini kawasan konservasi. Jangan memberi makan satwa apa pun.' },

 { id: 'warungseigohong', nama: 'Warung Ikan Desa Sei Gohong', zone: 3, tags: ['kuliner', 'keluarga'], indoor: true, lowland: true, cost: 30000, jam: '09.00 sampai 17.00', slot: 'noon',
 x: -0.40, y: -0.31, lat: -2.3110, lng: 113.8460,
 desc: 'Ikan sungai dimasak gaya desa, segar karena tangkapan tetangga sendiri. Satu satunya tempat makan sebelum jalur Sebangau.',
 tips: 'Ikan gabus bakarnya yang dicari orang. Cek lampu Si Buru saat musim luapan.', etika: null },

 { id: 'kedaitangkiling', nama: 'Kedai Kopi Tangkiling', zone: 3, tags: ['kuliner', 'indoor', 'keluarga'], indoor: true, lowland: false, cost: 20000, jam: '08.00 sampai 21.00', slot: 'any',
 x: -0.22, y: -0.42, lat: -2.3180, lng: 113.9310,
 desc: 'Kopi tubruk hangat kaki bukit, cocok jadi hadiah untuk kaki sendiri setelah turun dari Bukit Tangkiling.',
 tips: 'Roti bakarnya ikutan enak. Listrik dan internet kadang ngambek.', etika: null },

 { id: 'pulaukaja', nama: 'Pulau Kaja, dermaga pandang', zone: 3, tags: ['alam', 'keluarga'], indoor: false, lowland: true, cost: 50000, jam: '08.00 sampai 15.00', slot: 'day',
 x: -0.42, y: -0.28, lat: -2.3150, lng: 113.8300,
 desc: 'Pulau tempat orangutan belajar hidup liar lagi. Semua dilihat dari atas perahu, di jarak yang wajib dijaga.',
 tips: 'Peluang terlihat paling besar sekitar jam sembilan sampai sebelas, saat buah dibagikan.', etika: 'Orangutan adalah satwa dilindungi. Melarang mendekat dan memberi makan itu aturan, bukan pilihan.' },

 { id: 'kereng', nama: 'Kereng Bangkirai', zone: 3, tags: ['alam', 'air', 'foto'], indoor: false, lowland: true, cost: 30000, jam: '08.00 sampai 16.30', slot: 'any',
 x: -0.30, y: -0.62, lat: -2.3939, lng: 113.8639,
 desc: 'Bakau, perahu kecil, dan gazebo yang mengapung di muara Kahayan. Warna airnya paling jujur saat surut sore.',
 tips: 'Tanya warga soal pasang surut sebelum berangkat.', etika: null },

 { id: 'bukitrawi', nama: 'Bukit Rawi', zone: 4, tags: ['budaya', 'sejarah', 'foto'], indoor: false, lowland: false, cost: 50000, jam: '09.00 sampai 16.00', slot: 'day',
 x: -0.70, y: 0.66, lat: -1.9811, lng: 114.0531,
 desc: 'Kampung tua di hulu Kahayan dengan sandung berumur ratusan tahun. Datang dengan sopan, pulang dengan cerita.',
 tips: 'Satu hari penuh untuk ini, perjalanannya sekitar sejam setengah sekali jalan. Sewa mobil atau perahu panjung.', etika: 'Situs sakral. Pakai pakaian sopan, jangan duduk atau bersandar di sandung, dan izin dulu ke warga. Ritual adat tidak dibahas dalam konteks rekreasi.' },

 { id: 'nyarumenteng', nama: 'Nyaru Menteng', zone: 3, tags: ['alam', 'budaya'], indoor: true, lowland: false, cost: 0, jam: 'sesuai jadwal, hubungi dulu', slot: 'day',
 x: -0.36, y: -0.20, lat: -2.2950, lng: 113.8650,
 desc: 'Pusat rehabilitasi orangutan. Kunjungannya terbatas dan lewat kesepakatan, dan justru itu yang membuat rencanamu harus rapi.',
 tips: 'Hubungi dulu sebelum masuk jadwal. Kalau gagal, Pulau Kaja tetap buka.', etika: 'Semua protokol kesehatan satwa wajib diikuti.' },

 { id: 'kopisore', nama: 'Kopi Sore Kota Lama', zone: 1, tags: ['kuliner'], indoor: true, lowland: false, cost: 20000, jam: '08.00 sampai 22.00', slot: 'any',
 x: 0.08, y: 0.12, lat: -2.2090, lng: 113.9180,
 desc: 'Kedai tua yang jadi ruang tamu kota. Kopi tubruk, roti bakar, dan obrolan yang bisa panjang.',
 tips: 'Tempat paling nyaman menunggu hujan atau asap reda sambil menyusun ulang rencana.', etika: null },

 { id: 'oleholeh', nama: 'Pusat Oleh Oleh', zone: 1, tags: ['kuliner', 'keluarga'], indoor: true, lowland: false, cost: 50000, jam: '08.00 sampai 20.00', slot: 'any',
 x: 0.10, y: 0.02, lat: -2.2060, lng: 113.9200,
 desc: 'Garam basah basi untuk yang mau memasak, kerajinan rotan untuk yang mau menghias rumah, batu akik untuk yang sekadar penasaran.',
 tips: 'Garam basah basi dibungkus rapat kalau naik pesawat. Beberapa lapak sudah terima QRIS.', etika: null },

 { id: 'wisataair', nama: 'Susur Kahayan', zone: 2, tags: ['air', 'alam', 'foto'], indoor: false, lowland: true, cost: 40000, jam: '07.00 sampai 17.00', slot: 'any',
 x: -0.06, y: 0.30, lat: -2.2250, lng: 113.9130,
 desc: 'Naik jukung pelan pelan menyusuri sungai. Kota terlihat lain dari sisi air, dan harganya seikhlasnya masuk akal.',
 tips: 'Tunda kalau hujan deras atau arah arus naik. Pelampung dipakai, bukan dibiarkan.', etika: null },

 { id: 'flamboyan', nama: 'Kampung Flamboyan', zone: 2, tags: ['budaya', 'keluarga', 'foto'], indoor: false, lowland: true, cost: 10000, jam: '09.00 sampai 17.00', slot: 'day',
 x: -0.20, y: 0.24, lat: -2.2180, lng: 113.8950,
 desc: 'Kampung tepian dengan rumah panjang betang. Pagi hari paling hidup: orang mandi di sungai, perahu lewat satu dua.',
 tips: 'Datang pagi, bawa kamera, dan jangan lupa menyapa.', etika: 'Minta izin sebelum naik atau memotret rumah warga.' }
 ];

 // Sepuluh itinerary siap pakai. Setiap slot berisi id destinasi.
 const SIAP_PAKAI = [
 { id: 'kilat1', nama: 'PKY Kilat, satu hari di pusat kota', hari: 1, tema: 'sejarah',
 plan: [['tugu', 'balanga'], ['kopisore'], ['bundaran', 'tamanisen'], ['riverfront']] },
 { id: 'kuliner1', nama: 'Kuliner riverfront, satu hari kenyang', hari: 1, tema: 'kuliner',
 plan: [['oleholeh'], ['kulinerpatin'], ['wisataair'], ['pasarmalam']] },
 { id: 'danau1', nama: 'Danau dan sunset, satu hari pelan', hari: 1, tema: 'alam',
 plan: ['tumbangtahai', ['kulinerpatin'], ['flamboyan'], ['danautahai']] },
 { id: 'tangkiling1', nama: 'Tangkiling hike, satu hari keringat', hari: 1, tema: 'alam',
 plan: [['tangkiling'], ['kulinerpatin'], ['bukitbatu'], ['riverfront']] },
 { id: 'sebangau1', nama: 'Gerbang Sebangau, satu hari hutan', hari: 1, tema: 'alam',
 plan: [['seigohong'], ['kulinerpatin'], ['pulaukaja'], ['riverfront']] },
 { id: 'budaya1', nama: 'Budaya dan museum, satu hari cerita', hari: 1, tema: 'budaya',
 plan: [['balanga', 'tamanisen'], ['kopisore'], ['flamboyan'], ['bundaran']] },
 { id: 'bukitrawi1', nama: 'Bukit Rawi, satu hari ke masa lalu', hari: 1, tema: 'sejarah',
 plan: [['bukitrawi'], ['kulinerpatin'], ['bukitrawi', 'tumbangtahai'], ['riverfront']] },
 { id: 'keluarga2', nama: 'Keluarga weekend, dua hari santai', hari: 2, tema: 'keluarga',
 plan: [['balanga', 'tamanisen'], ['kulinerpatin'], ['riverfront', 'bundaran'], ['danautahai'], ['tumbangtahai'], ['oleholeh', 'kopisore'], ['wisataair'], ['pasarmalam']] },
 { id: 'best2', nama: 'Terbaik PKY, dua hari lengkap', hari: 2, tema: 'campur',
 plan: [['tugu', 'balanga'], ['kulinerpatin'], ['tangkiling'], ['riverfront'], ['seigohong'], ['kulinerpatin'], ['pulaukaja'], ['danautahai']] },
 { id: 'indoor1', nama: 'Satu hari indoor, aman dari asap dan hujan', hari: 1, tema: 'indoor',
 plan: [['balanga', 'oleholeh'], ['kulinerpatin'], ['nyarumenteng'], ['kopisore']] }
 ];

 // Menginap dan ngopi. Kurasi demo awal, cocokkan rating terkini di Google Maps.
 const HOTEL = [
 { nama: 'Hotel Pusat Kota', area: 'Pusat, dekat tugu', rentang: 'sekitar Rp250 sampai 450 ribu semalam', lat: -2.2092, lng: 113.9155, catatan: 'Langkah ke kuliner malam dan riverfront. Praktis untuk perjalanan singkat.' },
 { nama: 'Penginapan Tepi Kahayan', area: 'Tepian sungai', rentang: 'sekitar Rp150 sampai 300 ribu semalam', lat: -2.2210, lng: 113.9168, catatan: 'Jendelanya menghadap jembatan, dermaga perahu dekat.' },
 { nama: 'Homestay Tumbang Tahai', area: 'Kampung tepi danau', rentang: 'sekitar Rp100 sampai 200 ribu semalam', lat: -2.2340, lng: 113.9090, catatan: 'Suasana kampung, Danau Tahai bisa ditempuh jalan kaki.' },
 { nama: 'Guesthouse Area Tangkiling', area: 'Kaki bukit', rentang: 'sekitar Rp120 sampai 250 ribu semalam', lat: -2.3170, lng: 113.9290, catatan: 'Untuk yang mau mendaki Bukit Tangkiling pagi pagi.' }
 ];
 const KAFE = [
 { nama: 'Kedai Kopi Riverfront', area: 'Tepian', rentang: 'sekitar Rp15 sampai 30 ribu', lat: -2.2205, lng: 113.9155, catatan: 'Kopi sambil menunggu matahari turun.' },
 { nama: 'Kopi Kota Lama', area: 'Pusat', rentang: 'sekitar Rp10 sampai 25 ribu', lat: -2.2095, lng: 113.9175, catatan: 'Ramai anak muda setelah gelap.' },
 { nama: 'Kafe Sei Gohong', area: 'Gerbang Sebangau', rentang: 'sekitar Rp15 sampai 30 ribu', lat: -2.3090, lng: 113.8440, catatan: 'Tempat rehat setelah dari dermaga.' }
 ];

 const META = {
 nama: 'Raun Kalteng',
 tagline: 'Kawan raun yang tahu kapan langit boleh dipercaya.',
 kota: 'Palangka Raya, Kalimantan Tengah',
 catatan: 'Prototipe v0 untuk Tambun Bungai Ideathon, Borneo DECAFEST 2026, KPw BI Kalteng. Data demo, tarif dan koordinat perlu verifikasi lapangan.',
 qrDemo: '',
 karhutlaReplay: { label: 'Replay 14 Oktober 2026, asap pekat', pm25: [188, 205, 232, 219], hujan: [0, 0, 0, 0] }
 };

 // Kalender event, demo. Selalu konfirmasi tanggal resmi penyelenggara.
 const EVENTS = [
 { nama: 'Festival Budaya Isen Mulang', kira: 'Mei, Stadion Tuah Pahoe', catatan: 'Karnaval, parade perahu, expo UMKM. Bagian Karisma Event Nusantara.' },
 { nama: 'HUT Provinsi Kalteng', kira: 'Mei', catatan: 'Rangkaian budaya di seputar FBIM.' },
 { nama: 'Festival Jukung Sungai Kahayan', kira: 'musim cerah, cek tiap tahun', catatan: 'Parade perahu dan susur sungai di riverfront.' },
 { nama: 'Pasar Malam Riverfront', kira: 'tiap Jumat sampai Minggu', catatan: 'Kuliner malam yang paling gampang dijangkau.' }
 ];

 const KULINER = [
 { nama: 'Ikan patin bakar', desc: 'Dibakar di atas arang, dimakan dengan sambal dan lalap. Kalau bicara kuliner Kahayan, ini yang pertama disebut.', tips: 'Cari di Tumbang Tahai dan tepian riverfront.' },
 { nama: 'Ikan terubuk asap', desc: 'DiAsap perlahan sampai gurihnya masuk ke tulang. Tahan lama, cocok jadi buah tangan.', tips: 'Banyak di kios oleh oleh dekat pasar.' },
 { nama: 'Garam basah basi', desc: 'Ikan fermentasi yang jadi bumbu identitas Kalteng. Gurihnya keras, aroma nya jujur.', tips: 'Bungkus rapat kalau dibawa naik pesawat.' },
 { nama: 'Wadi ikan', desc: 'Fermentasi tradisional Dayak, tajam dan asin. Dipadankan dengan patin tempoyak, rasanya lupa pulang.', tips: 'Mulai dari porsi kecil kalau lidah belum biasa.' },
 { nama: 'Iwak kalumang', desc: 'Ikan asin gurih dari pedalaman. Digoreng atau dibakar sama enaknya.', tips: 'Pasar tradisional pagi hari punya yang terbaik.' },
 { nama: 'Lempok durian', desc: 'Durian dimasak berjam jam sampai jadi kental dan legit. Manisnya tanpa campuran.', tips: 'Perhatikan tanggal buat sebelum dibawa jauh.' },
 { nama: 'Sambal tempoyak', desc: 'Durian fermentasi diulek dengan cabai. Pendamping patin bakar yang paling benar.', tips: 'Pedasnya tidak bercanda, minta porsi kecil dulu.' },
 { nama: 'Kue cucur dan wadai pasar', desc: 'Manis gula merah, lembut di tengah, wajib ada di meja tamu rumah Kalteng.', tips: 'Cari di pasar pagi, sorenya biasanya sudah habis.' }
 ];

 const REGIONAL = [
 { nama: 'Taman Nasional Tanjung Puting', wilayah: 'Kotawaringin Barat', desc: 'Rumah orangutan hasil rehabilitasi. Jalur klasiknya menyusur Sungai Sekonyer dengan klotok, bisa beberapa hari.', akses: 'Terbang ke Pangkalan Bun, lanjut darat ke Kumai.' },
 { nama: 'Sungai Sekonyer', wilayah: 'Kotawaringin Barat', desc: 'Koridor sungai tepi Tanjung Puting. Menginap di perahu, bangun pagi ditemani bekantan di tepian.', akses: 'Berangkat dari dermaga Kumai.' },
 { nama: 'Kumai', wilayah: 'Kotawaringin Barat', desc: 'Gerbang menuju Tanjung Puting. Penyedia klotok dan penginapan sederhana banyak di sini.', akses: 'Dari Bandara Iskandar, Pangkalan Bun.' },
 { nama: 'Danau Sembuluh', wilayah: 'Kotawaringin Timur', desc: 'Danau besar dengan kampung tepian dan ikan sungai. Jalurnya lewat jalan trans.', akses: 'Dari Pangkalan Bun arah timur.' },
 { nama: 'Kuala Pembuang', wilayah: 'Seruyan', desc: 'Muara kecil dengan hidangan laut dan tempo kota yang pelan.', akses: 'Jalan darat dari Pangkalan Bun.' },
 { nama: 'Bukit Sepat', wilayah: 'Pulang Pisau', desc: 'Tebing pendek untuk dipanjat, pandangannya membentang. Pas untuk trip pagi dari PKY.', akses: 'Kira kira satu jam dari PKY.' },
 { nama: 'Rumah Betang Tumbang Malahoi', wilayah: 'Gunung Mas', desc: 'Rumah panjang tradisional yang masih dihuni. Cara paling dekat memahami hidup Dayak pedalaman.', akses: 'Jauh dari PKY, sisihkan satu hari penuh.' },
 { nama: 'Susur Sungai Katingan', wilayah: 'Katingan', desc: 'Sungai tenang, kampung tepian, hutan gambut. Versi yang lebih sepi dari Kahayan.', akses: 'Dari PKY menuju Kasongan.' },
 { nama: 'Pos Tanjung Harapan', wilayah: 'Tanjung Puting', desc: 'Pos pertama kawasan, ada perkampungan kecil dan informasi klotok.', akses: 'Kira kira setengah jam klotok dari Kumai.' },
 { nama: 'Pondok Tanggui', wilayah: 'Tanjung Puting', desc: 'Stasiun pakan orangutan. Jam pakannya jadi momen terbaik melihat mereka dari dekat.', akses: 'Klotok dari Kumai, biasanya satu jalur dengan Camp Leakey.' }
 ];

 const DATA = { DESTINASI, SIAP_PAKAI, HOTEL, KAFE, KULINER, REGIONAL, EVENTS, META };
 root.RAUN_DATA = DATA;
 if (typeof module!== 'undefined' && module.exports) module.exports = DATA;
})(typeof window!== 'undefined'? window : globalThis);
