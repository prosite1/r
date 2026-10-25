/* =========================================================================
   Photo du bloc (galerie « Actes ») : efface la main et le téléphone de
   l'assistant en vert, dont le corps est déjà hors cadre après recadrage.

   Méthode : clonage dans le domaine du gradient (Poisson). Les pixels
   masqués reçoivent le champ opératoire bleu situé DY lignes plus haut, puis
   une correction lisse (équation de Laplace, conditions au bord = écart
   entre l'original et le patch) supprime toute couture de teinte.

   Entrée  : tools/cache/photo-bloc-source.png (1280 x 960, export de la photo)
   Sortie  : tools/cache/photo-bloc-nette.png  (même taille ; recadrage ensuite)
   ========================================================================= */
const path = require("path");
const { lire, ecrire } = require("./lib-png.js");

const SRC = path.join(__dirname, "cache", "photo-bloc-source.png");
const DST = path.join(__dirname, "cache", "photo-bloc-nette.png");

const img = lire(SRC);
const { w, h } = img;
const px = img.px;

/* Zone de travail : main et téléphone, rien d'autre. */
const X0 = 822, X1 = 960, Y0 = 405, Y1 = 528;
const DY = 118;                       // le champ bleu, juste au-dessus

/* 1. Masque : un polygone tracé sur la photo autour du téléphone et de la
   main. Un masque à la couleur ne suffit pas : l'écran du téléphone reflète
   le champ bleu et passait à travers, laissant un fantôme sombre. */
const W = X1 - X0, H = Y1 - Y0;
const POLY = [[826, 411], [854, 410], [884, 434], [960, 428], [960, 526], [890, 523], [872, 512]];
const dedans = (x, y) => {
  let c = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [xi, yi] = POLY[i], [xj, yj] = POLY[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const m = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dedans(X0 + x + .5, Y0 + y + .5)) m[y * W + x] = 1;
/* dilatation de 2 px : halo de contour du téléphone et de la main */
for (let k = 0; k < 2; k++) {
  const c = m.slice();
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (c[y * W + x]) continue;
    if (c[y * W + x - 1] || c[y * W + x + 1] || c[(y - 1) * W + x] || c[(y + 1) * W + x]) m[y * W + x] = 1;
  }
}
/* la bordure droite de l'image reste masquée (bord ouvert) : aucun bord à
   respecter, la correction y prend la valeur du voisin */
let n = 0; for (const v of m) n += v;
console.log("pixels masqués : %d", n);

/* 2. Correction de Laplace par canal, puis collage. */
const get = (x, y, c) => px[(y * w + x) * 4 + c];
for (let c = 0; c < 3; c++) {
  const d = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    d[y * W + x] = get(X0 + x, Y0 + y, c) - get(X0 + x, Y0 + y - DY, c);
  for (let it = 0; it < 4000; it++) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W; x++) {
      const p = y * W + x;
      if (!m[p]) continue;
      const droite = x + 1 < W ? d[p + 1] : d[p - 1];       // bord ouvert
      d[p] = (d[p - 1] + droite + d[p - W] + d[p + W]) / 4;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!m[p]) continue;
    const v = get(X0 + x, Y0 + y - DY, c) + d[p];
    px[((Y0 + y) * w + X0 + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
  }
}

ecrire(DST, w, h, px);
console.log("écrit : " + DST);
