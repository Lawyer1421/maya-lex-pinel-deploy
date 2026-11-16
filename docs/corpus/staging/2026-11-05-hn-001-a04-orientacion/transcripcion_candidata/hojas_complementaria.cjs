// A04: hojas de firma de la tabla complementaria. Una fila por línea de la v5: arriba «L<n> antes → después», abajo el recorte nativo (200 ppi) de
// ese renglón de la página del PDF oficial fbd87f33…. Agrupadas por página, 14 filas por hoja.
// Uso (raíz del repo): node <este archivo> <dir con p-NN.png renderizadas a 200 ppi> <filas_hojas.json de recortes_complementaria.py>
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const [pags, filasJson] = process.argv.slice(2);
const filas = JSON.parse(fs.readFileSync(filasJson, 'utf8'));
const OUT = path.join(__dirname, 'recortes_complementaria');
const ANCHO = 1700, TXT_H = 62, POR = 14;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const corta = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const porPag = {};
  for (const f of filas) (porPag[f.pagina] ??= []).push(f);
  let total = 0;
  for (const [p, fs_] of Object.entries(porPag)) {
    const img = path.join(pags, `p-${String(p).padStart(2, '0')}.png`);
    for (let b = 0, k = 1; b < fs_.length; b += POR, k++) {
      const bloque = fs_.slice(b, b + POR);
      const comps = [];
      let top = 0;
      for (const f of bloque) {
        const svg = `<svg width="${ANCHO}" height="${TXT_H}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eef3ff"/>`
          + `<text x="8" y="24" font-family="Consolas, monospace" font-size="20" fill="#7a0000">L${f.linea} antes:   ${esc(corta(f.antes, 120))}</text>`
          + `<text x="8" y="52" font-family="Consolas, monospace" font-size="20" fill="#004d1a">L${f.linea} después: ${esc(corta(f.despues, 120))}</text></svg>`;
        comps.push({ input: Buffer.from(svg), top, left: 0 });
        top += TXT_H;
        const m = await sharp(img).metadata();
        const crop = await sharp(img).extract({ left: f.x, top: Math.min(f.y, m.height - f.h), width: Math.min(f.w, m.width - f.x, ANCHO), height: f.h }).png().toBuffer();
        comps.push({ input: crop, top, left: 0 });
        top += f.h + 6;
      }
      const nombre = `p${String(p).padStart(2, '0')}_${k}.png`;
      await sharp({ create: { width: ANCHO, height: top, channels: 3, background: '#fff' } }).composite(comps).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, nombre));
      total++;
    }
  }
  console.log(total, 'hojas en', OUT);
})();
