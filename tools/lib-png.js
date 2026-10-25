/* =========================================================================
   Lecture et écriture PNG, sans dépendance (Pillow et consorts ne sont pas
   installés sur ce poste). 8 bits par canal, RVB ou RVBA, non entrelacé.
   Partagé par detourer-photo.js et les autres outils image.
   ========================================================================= */
const fs = require("fs");
const zlib = require("zlib");

function lire(chemin) {
  const d = fs.readFileSync(chemin);
  if (d.slice(0, 8).toString("latin1") !== "\x89PNG\r\n\x1a\n") { throw new Error("PNG attendu : " + chemin); }
  let pos = 8, idat = [], w, h, ctype;
  while (pos < d.length) {
    const ln = d.readUInt32BE(pos);
    const typ = d.slice(pos + 4, pos + 8).toString("latin1");
    const data = d.slice(pos + 8, pos + 8 + ln);
    pos += 12 + ln;
    if (typ === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      if (data[8] !== 8) { throw new Error("8 bits par canal attendus"); }
      ctype = data[9];
      if (ctype !== 2 && ctype !== 6) { throw new Error("type de couleur non géré : " + ctype); }
      if (data[12] !== 0) { throw new Error("entrelacement non géré"); }
    } else if (typ === "IDAT") { idat.push(data); }
    else if (typ === "IEND") { break; }
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const nch = ctype === 2 ? 3 : 4;
  const stride = w * nch;
  const src = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride), p = 0;

  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const ligne = Buffer.from(raw.slice(p, p + stride)); p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= nch ? ligne[i - nch] : 0, b = prev[i], c = i >= nch ? prev[i - nch] : 0;
      if (f === 1) ligne[i] = (ligne[i] + a) & 255;
      else if (f === 2) ligne[i] = (ligne[i] + b) & 255;
      else if (f === 3) ligne[i] = (ligne[i] + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        ligne[i] = (ligne[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    ligne.copy(src, y * stride);
    prev = ligne;
  }

  /* on renvoie toujours du RVBA, les appelants n'ont pas à gérer les deux cas */
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    px[i * 4] = src[i * nch]; px[i * 4 + 1] = src[i * nch + 1]; px[i * 4 + 2] = src[i * nch + 2];
    px[i * 4 + 3] = nch === 4 ? src[i * nch + 3] : 255;
  }
  return { w, h, px };
}

function crc32(buf) {
  let c, crc = 0xFFFFFFFF;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xFF;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function ecrire(chemin, w, h, rgba) {
  const bloc = (typ, data) => {
    const t = Buffer.from(typ, "latin1");
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  /* Filtrage adaptatif : pour chaque ligne on essaie les cinq filtres PNG et
     on garde celui dont la somme des écarts est la plus faible. Sans cela le
     fichier pèse presque deux fois plus lourd. */
  const stride = w * 4, bpp = 4;
  const rows = Buffer.alloc((stride + 1) * h);
  const prev = Buffer.alloc(stride);
  const cand = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));

  for (let y = 0; y < h; y++) {
    const ligne = rgba.slice(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? ligne[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      cand[0][i] = ligne[i];
      cand[1][i] = (ligne[i] - a) & 255;
      cand[2][i] = (ligne[i] - b) & 255;
      cand[3][i] = (ligne[i] - ((a + b) >> 1)) & 255;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      cand[4][i] = (ligne[i] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
    }
    let meilleur = 0, minScore = Infinity;
    for (let f = 0; f < 5; f++) {
      let sc = 0;
      for (let i = 0; i < stride; i++) { const v = cand[f][i]; sc += v < 128 ? v : 256 - v; }
      if (sc < minScore) { minScore = sc; meilleur = f; }
    }
    rows[y * (stride + 1)] = meilleur;
    cand[meilleur].copy(rows, y * (stride + 1) + 1);
    ligne.copy(prev);
  }
  fs.writeFileSync(chemin, Buffer.concat([
    Buffer.from("\x89PNG\r\n\x1a\n", "latin1"),
    bloc("IHDR", ihdr),
    bloc("IDAT", zlib.deflateSync(rows, { level: 9 })),
    bloc("IEND", Buffer.alloc(0))
  ]));
}

/* Réduction par moyenne de surface. L'alpha est prémultiplié avant la
   moyenne : sans cela les pixels transparents (qui gardent une couleur de
   fond) déteindraient sur le contour et créeraient un liseré. */
function reduire(src, w, h, nw, nh) {
  const out = Buffer.alloc(nw * nh * 4);
  const sx = w / nw, sy = h / nh;
  for (let y = 0; y < nh; y++) {
    const y0 = y * sy, y1 = (y + 1) * sy;
    for (let x = 0; x < nw; x++) {
      const x0 = x * sx, x1 = (x + 1) * sx;
      let r = 0, g = 0, b = 0, a = 0, poids = 0;
      for (let j = Math.floor(y0); j < Math.ceil(y1); j++) {
        const fy = Math.min(y1, j + 1) - Math.max(y0, j);
        for (let i = Math.floor(x0); i < Math.ceil(x1); i++) {
          const fx = Math.min(x1, i + 1) - Math.max(x0, i);
          const p = (j * w + i) * 4, f = fx * fy, al = src[p + 3] / 255;
          r += src[p] * al * f; g += src[p + 1] * al * f; b += src[p + 2] * al * f;
          a += src[p + 3] * f; poids += f;
        }
      }
      const o = (y * nw + x) * 4;
      const am = a / poids;                     // alpha moyen, 0..255
      const k = am > 0 ? poids * (am / 255) : 1; // dé-prémultiplication
      out[o] = Math.round(r / k); out[o + 1] = Math.round(g / k); out[o + 2] = Math.round(b / k);
      out[o + 3] = Math.round(am);
    }
  }
  return out;
}

module.exports = { lire, ecrire, reduire };
