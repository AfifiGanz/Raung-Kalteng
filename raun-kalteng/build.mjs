/* RAUN KALTENG — build.mjs: gabungkan seluruh aplikasi jadi SATU file HTML.
 * Hasil: dist/raun-kalteng-offline.html — bisa dikirim via WhatsApp/Drive,
 * dibuka di komputer mana pun & HP Android/iOS tanpa server (tinggal tap → browser).
 * Jalankan: node build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = f => readFileSync(f, 'utf-8');
let html = read('index.html');

// Inline CSS
html = html.replace(/<link rel="stylesheet" href="styles\.css[^"]*">/, () => '<style>\n' + read('styles.css') + '\n</style>');
// Inline JS (data, core, app) — hindari pola </script> di konten
const inline = f => read(f).replace(/<\/script>/gi, '<\\/script>');
html = html.replace(/<script src="data\.js[^"]*"><\/script>/, () => '<script>\n' + inline('data.js') + '\n</script>');
html = html.replace(/<script src="core\.js[^"]*"><\/script>/, () => '<script>\n' + inline('core.js') + '\n</script>');
html = html.replace(/<script src="app\.js[^"]*"><\/script>/, () => '<script>\n' + inline('app.js') + '\n</script>');
// Ikon: sematkan SVG data-URI agar tidak 404 di mode file://
const icon = read('icon.svg').replace(/"/g, "'");
html = html.replace(/<link rel="icon" href="icon\.svg"[^>]*>/, () => '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(read('icon.svg')) + '">');
// Manifest & SW tidak berlaku di mode file:// — matikan supaya bersih
html = html.replace(/<link rel="manifest" href="manifest\.json">/, '');
html = html.replace(/<title>/, '<!-- Raun Kalteng — versi offline 1 file. Data demo; bukan layanan publik. -->\n<title>');

mkdirSync('dist', { recursive: true });
writeFileSync('dist/raun-kalteng-offline.html', html);
console.log('OK — dist/raun-kalteng-offline.html dibuat (' + Math.round(html.length / 1024) + ' KB). Kirim file ini via WA/Drive, buka di HP/komputer mana pun.');
