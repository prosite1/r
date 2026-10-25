/* =========================================================================
   Photo du praticien : détourage du fond + reconstitution du sommet du crâne.

   La seule photographie disponible (med.tn, 819x819) est cadrée trop haut :
   la chevelure est coupée net par le bord supérieur de l'image — 442 px de
   cheveux touchent la ligne y=0. Le sommet du crâne n'existe donc dans AUCUNE
   source (vignette 150 px, 819 px d'origine, avatar YouTube : tous vérifiés).

   L'outil fait donc deux choses :
     1. il retire le fond clair, pour que la silhouette se pose directement
        sur le fond de l'accueil ;
     2. il prolonge la calotte au-dessus du cadre. La forme vient de la courbe
        du crâne mesurée sur la photo (demi-largeur par ligne, ajustée au
        moindre carré), la matière vient des cheveux du sujet eux-mêmes,
        repliés au-dessus de la coupure. Rien n'est peint à la main.

   Source : téléchargée à la demande dans tools/cache/, depuis
     https://www.med.tn/uploads/offices/27547-dr-rached-hamza-1591868706_5349_3501.JPG
   convertie en PNG par le serveur d'images de med.tn (le JPEG n'est pas
   décodable ici, aucune bibliothèque image n'étant installée).

   Sortie : assets/img/doctor-cutout.png
   ========================================================================= */
const fs = require("fs");
const path = require("path");
const { lire, ecrire, reduire } = require("./lib-png.js");

const RACINE = path.join(__dirname, "..");
const SRC = path.join(__dirname, "cache", "photo-source.png");
const DST = path.join(RACINE, "assets", "img", "doctor-cutout.png");

const LARGEUR_FINALE = 480;   // affichée 300 px : de quoi rester net sur écran dense

if (!fs.existsSync(SRC)) {
  console.error("source absente : " + SRC);
  console.error('télécharger :\n  curl -L -o tools/cache/photo-source.png "https://image.medlink.tn/unsafe/0x0/filters:format(png):quality(100)/https://www.med.tn/uploads/offices/27547-dr-rached-hamza-1591868706_5349_3501.JPG"');
  process.exit(1);
}

const img = lire(SRC);
const { w, h } = img;
const px = img.px;                                  // RVBA
const at = (x, y) => { const i = (y * w + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };

/* ---------------------------------------------------------------------------
   1. Couleur du fond : MÉDIANE des pixels de bordure, jamais leur moyenne.
   L'épaule du sujet touche le bord bas : une moyenne y prendrait le bleu du
   vêtement et fausserait tout le détourage.
--------------------------------------------------------------------------- */
const bR = [], bG = [], bB = [];
for (let y = 0; y < h; y++) for (const x of [0, 1, w - 2, w - 1]) { const c = at(x, y); bR.push(c[0]); bG.push(c[1]); bB.push(c[2]); }
for (let x = 0; x < w; x++) for (const y of [0, 1, h - 2, h - 1]) { const c = at(x, y); bR.push(c[0]); bG.push(c[1]); bB.push(c[2]); }
const mediane = (a) => { a.sort((u, v) => u - v); return a[a.length >> 1]; };
const fr = mediane(bR), fg = mediane(bG), fb = mediane(bB);
console.log("fond détecté (médiane des bords) : rgb(%d, %d, %d)", fr, fg, fb);

const dist = (x, y) => { const c = at(x, y); return Math.hypot(c[0] - fr, c[1] - fg, c[2] - fb); };

/* ---------------------------------------------------------------------------
   2. Détourage. Trois seuils, et non deux : la propagation doit être PLUS
   stricte que le dégradé de bord, sinon le remplissage passe par un reflet
   clair de la joue et perce un trou dans le visage.
--------------------------------------------------------------------------- */
const PROPAGE = 34;   // le remplissage ne franchit pas cette distance
const DEDANS  = 26;   // en deçà : parfaitement transparent
const DEHORS  = 62;   // au-delà : parfaitement opaque ; entre : dégradé
const EROSION = 3;    // le masque mord dans le sujet : la frange JPEG est trop claire

const fond = new Uint8Array(w * h);
const depart = [];
for (let x = 0; x < w; x++) { depart.push(x, (h - 1) * w + x); }
for (let y = 0; y < h; y++) { depart.push(y * w, y * w + w - 1); }
const pile = [];
for (const p of depart) { if (!fond[p] && dist(p % w, (p / w) | 0) < PROPAGE) { fond[p] = 1; pile.push(p); } }
while (pile.length) {
  const p = pile.pop(), x = p % w, y = (p / w) | 0;
  for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    const q = ny * w + nx;
    if (!fond[q] && dist(nx, ny) < PROPAGE) { fond[q] = 1; pile.push(q); }
  }
}

const profondeur = new Uint8Array(w * h);
let bord = [];
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const p = y * w + x;
  if (fond[p]) continue;
  for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
    if (nx >= 0 && ny >= 0 && nx < w && ny < h && fond[ny * w + nx]) { bord.push(p); break; }
  }
}
for (let k = 1; k <= EROSION; k++) {
  const suivant = [];
  for (const p of bord) {
    if (profondeur[p]) continue;
    profondeur[p] = k;
    const x = p % w, y = (p / w) | 0;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = ny * w + nx;
      if (!fond[q] && !profondeur[q]) suivant.push(q);
    }
  }
  bord = suivant;
}

const alpha = new Uint8Array(w * h);
let transparents = 0, partiels = 0;
for (let p = 0; p < w * h; p++) {
  const x = p % w, y = (p / w) | 0, d = dist(x, y);
  let a = 255;
  if (fond[p]) {
    if (d <= DEDANS) { a = 0; transparents++; }
    else { a = Math.round(255 * (d - DEDANS) / (DEHORS - DEDANS)); partiels++; }
  } else if (profondeur[p]) {
    a = Math.round(255 * profondeur[p] / (EROSION + 1));
    partiels++;
  }
  alpha[p] = a;
}
console.log("détourage : %d px transparents (%s %%), %d px de frontière",
  transparents, (100 * transparents / (w * h)).toFixed(1), partiels);

/* ---------------------------------------------------------------------------
   3. Courbe du crâne. Pour chaque ligne du haut on relève les bords gauche et
   droit du sujet, donc le centre c(y) et la demi-largeur d(y). Sur une calotte
   elliptique d² est une parabole en y : on l'ajuste au moindre carré, et sa
   racine négative donne la hauteur à laquelle le sommet se referme.
--------------------------------------------------------------------------- */
const LIM = 200;   // au-delà on atteint les oreilles : le crâne n'est plus seul
const ys = [], ds = [], cs = [];
for (let y = 0; y < LIM; y++) {
  let g = -1, dr = -1;
  for (let x = 0; x < w; x++) if (alpha[y * w + x] > 128) { if (g < 0) g = x; dr = x; }
  if (g < 0) continue;
  ys.push(y); cs.push((g + dr) / 2); ds.push((dr - g) / 2);
}
console.log("contour : y=0 centre %s demi-largeur %s | y=%d centre %s demi-largeur %s",
  cs[0].toFixed(1), ds[0].toFixed(1), ys[ys.length - 1],
  cs[cs.length - 1].toFixed(1), ds[ds.length - 1].toFixed(1));

/* moindres carrés : d² = A + B y + C y² */
function quadratique(xs, vs) {
  const n = xs.length;
  let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i], v = vs[i], x2 = x * x;
    s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2;
    t0 += v; t1 += v * x; t2 += v * x2;
  }
  const M = [[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]], V = [t0, t1, t2];
  for (let i = 0; i < 3; i++) {                       // pivot de Gauss
    let piv = i;
    for (let j = i + 1; j < 3; j++) if (Math.abs(M[j][i]) > Math.abs(M[piv][i])) piv = j;
    const tm = M[i]; M[i] = M[piv]; M[piv] = tm;
    const tv = V[i]; V[i] = V[piv]; V[piv] = tv;
    for (let j = i + 1; j < 3; j++) {
      const f = M[j][i] / M[i][i];
      for (let k = i; k < 3; k++) M[j][k] -= f * M[i][k];
      V[j] -= f * V[i];
    }
  }
  const r = [0, 0, 0];
  for (let i = 2; i >= 0; i--) { let s = V[i]; for (let k = i + 1; k < 3; k++) s -= M[i][k] * r[k]; r[i] = s / M[i][i]; }
  return r;                                            // [A, B, C]
}
function lineaire(xs, vs) {
  const n = xs.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += vs[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * vs[i]; }
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return [(sy - b * sx) / n, b];
}

const [A, B, C] = quadratique(ys, ds.map(v => v * v));
const [c0, c1] = lineaire(ys, cs);
const disc = B * B - 4 * A * C;
if (!(disc > 0) || C >= 0) { throw new Error("ajustement du crâne invalide"); }
const sommet = Math.min((-B + Math.sqrt(disc)) / (2 * C), (-B - Math.sqrt(disc)) / (2 * C));
const HAUT = Math.ceil(-sommet);
console.log("calotte : sommet ajusté à y = %s → %d lignes à reconstituer", sommet.toFixed(1), HAUT);
if (HAUT < 30 || HAUT > 300) { throw new Error("hauteur de calotte invraisemblable : " + HAUT); }

/* la courbe ajustée doit rejoindre EXACTEMENT le contour mesuré en y=0,
   sinon la calotte se raccorde par une marche */
const demiFit = (y) => Math.sqrt(Math.max(0, A + B * y + C * y * y));
const kD = ds[0] / demiFit(0);
const kC = cs[0] - c0;
const dDe = (y) => demiFit(y) * kD;
const cDe = (y) => c0 + c1 * y + kC;

/* ---------------------------------------------------------------------------
   4. Construction : toile agrandie vers le haut, calotte remplie par les
   cheveux du sujet repliés au-dessus de la coupure et resserrés sur la courbe.
--------------------------------------------------------------------------- */
const H2 = h + HAUT;
const out = Buffer.alloc(w * H2 * 4);
for (let i = 0; i < w * H2; i++) { out[i * 4] = fr; out[i * 4 + 1] = fg; out[i * 4 + 2] = fb; }
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const a = alpha[y * w + x];
  if (a === 0) continue;                              // on laisse la couleur du fond : ça compresse
  const s = (y * w + x) * 4, d = ((y + HAUT) * w + x) * 4;
  out[d] = px[s]; out[d + 1] = px[s + 1]; out[d + 2] = px[s + 2]; out[d + 3] = a;
}

/* La matière : la lisière de cheveux, colonne par colonne. Attention, elle est
   MINCE — le front commence à 21 px du bord au milieu du crâne (mesuré). Un
   simple repli des lignes du dessous ramenait donc la peau du front au sommet
   de la tête : la calotte se retrouvait chauve. On ne se sert que des pixels
   réellement chevelus de chaque colonne. */
const lum = (x, y) => { const i = (y * w + x) * 4; return .299 * px[i] + .587 * px[i + 1] + .114 * px[i + 2]; };
const G0 = Math.round(cs[0] - ds[0]), D0 = Math.round(cs[0] + ds[0]);
const creux = new Int16Array(w);                    // profondeur de cheveux par colonne
for (let x = G0; x <= D0; x++) {
  let suite = 0, p = 0;
  for (let y = 0; y < 300; y++) {
    if (lum(x, y) > 125) { if (++suite >= 5) { p = y - 4; break; } } else suite = 0;
    p = y;
  }
  creux[x] = Math.max(3, Math.min(p, 40));          // 40 px suffisent : au-delà on longerait l'oreille
}

/* teinte de la lisière : moyenne des premières lignes pleinement opaques */
const rim = new Float64Array(w * 3);
for (let x = G0; x <= D0; x++) {
  const n = Math.max(2, Math.min(creux[x], 6));
  let r = 0, g = 0, b = 0, q = 0;
  for (let y = 0; y < n; y++) { const i = (y * w + x) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; q++; }
  rim[x * 3] = r / q; rim[x * 3 + 1] = g / q; rim[x * 3 + 2] = b / q;
}

let peints = 0;
for (let k = 1; k <= HAUT; k++) {
  const yc = -k;                                      // ligne visée, au-dessus du cadre d'origine
  const dt = dDe(yc), ct = cDe(yc);
  if (!(dt > 0.5)) continue;
  const yo = HAUT + yc;                               // ligne dans la toile de sortie
  const t = k / HAUT;                                 // 0 au raccord, 1 au sommet
  const xa = Math.max(0, Math.floor(ct - dt) - 2), xb = Math.min(w - 1, Math.ceil(ct + dt) + 2);
  for (let x = xa; x <= xb; x++) {
    const u = (x + .5 - ct) / dt;                     // -1 .. 1 en travers de la calotte
    if (Math.abs(u) >= 1.02) continue;
    let a = Math.max(0, Math.min(1, (1 - Math.abs(u)) * dt / 1.4));
    if (k > HAUT - 3) a *= (HAUT - k + 1) / 4;        // le sommet s'estompe au lieu de se terminer net
    if (a <= 0) continue;

    /* La colonne de lisière qui alimente ce pixel est celle qui se trouve à
       sa verticale — pas une position angulaire : en étalant la lisière
       entière sur chaque ligne, on obtenait un éventail de mèches claires
       convergeant vers le sommet. On rentre de 4 px pour ne pas reprendre le
       pixel de contour, mélangé au fond et donc trop clair. */
    const xr = Math.round(Math.max(G0 + 4, Math.min(D0 - 4, x)));
    /* Grain : l'écart de la chevelure à sa propre moyenne, replié pour ne pas
       se répéter à l'identique. Le décalage par colonne est indispensable :
       sans lui toutes les colonnes repliaient au même endroit et la calotte
       se rayait de bandes horizontales. */
    const prof = creux[xr];
    let yg = (Math.round(t * (HAUT - 1)) + ((xr * 11) % (2 * prof))) % (2 * prof);
    if (yg >= prof) yg = 2 * prof - 1 - yg;
    const ig = (yg * w + xr) * 4;
    const i0 = (0 * w + xr) * 4;                      // le pixel réel du raccord
    const fondu = Math.min(1, t * 5);                 // continuité avec la photo au raccord
    const ombre = 1 - .10 * Math.pow(t, 1.4);         // le crâne s'incline : il reçoit moins de lumière
    const o = (yo * w + x) * 4;
    if (a * 255 <= out[o + 3]) continue;
    for (let c = 0; c < 3; c++) {
      const base = px[i0 + c] * (1 - fondu) + rim[xr * 3 + c] * fondu;
      const grain = (px[ig + c] - rim[xr * 3 + c]) * .45 * fondu;
      out[o + c] = Math.max(0, Math.min(255, Math.round((base + grain) * ombre)));
    }
    out[o + 3] = Math.round(a * 255);
    peints++;
  }
}
console.log("calotte reconstituée : %d px, teinte et grain repris de la lisière (profondeur %d..%d px)",
  peints, Math.min(...Array.from(creux).filter((v, i) => i >= G0 && i <= D0)),
  Math.max(...Array.from(creux).slice(G0, D0 + 1)));

/* ---------------------------------------------------------------------------
   5. Réduction et écriture. Les pixels totalement transparents reçoivent la
   couleur du fond : constante, donc quasi gratuite à la compression, et
   invisible si le navigateur interpole au redimensionnement.
--------------------------------------------------------------------------- */
const nh = Math.round(H2 * LARGEUR_FINALE / w);
const petit = reduire(out, w, H2, LARGEUR_FINALE, nh);

/* Quantification des couleurs sur 6 bits par canal, avec diffusion d'erreur.
   Une photographie en PNG coûte environ un octet par pixel : sans cela le
   fichier pesait 274 Ko. Le tramage évite les cercles de moiré sur la peau,
   qui apparaissent dès qu'on quantifie sans lui. */
const PAS = 4;
const err = new Float64Array((LARGEUR_FINALE + 2) * 3 * 2);
for (let y = 0; y < nh; y++) {
  const cour = (y % 2) * (LARGEUR_FINALE + 2) * 3, suiv = ((y + 1) % 2) * (LARGEUR_FINALE + 2) * 3;
  for (let i = 0; i < (LARGEUR_FINALE + 2) * 3; i++) err[suiv + i] = 0;
  for (let x = 0; x < LARGEUR_FINALE; x++) {
    const o = (y * LARGEUR_FINALE + x) * 4;
    for (let c = 0; c < 3; c++) {
      const v = petit[o + c] + err[cour + (x + 1) * 3 + c];
      const q = Math.max(0, Math.min(255, Math.round(v / PAS) * PAS));
      petit[o + c] = q;
      const e = v - q;
      err[cour + (x + 2) * 3 + c] += e * 7 / 16;      // Floyd-Steinberg
      err[suiv + x * 3 + c]       += e * 3 / 16;
      err[suiv + (x + 1) * 3 + c] += e * 5 / 16;
      err[suiv + (x + 2) * 3 + c] += e * 1 / 16;
    }
  }
}
const plat = [fr, fg, fb].map(v => Math.round(v / PAS) * PAS);
for (let i = 0; i < LARGEUR_FINALE * nh; i++) {
  if (petit[i * 4 + 3] === 0) { petit[i * 4] = plat[0]; petit[i * 4 + 1] = plat[1]; petit[i * 4 + 2] = plat[2]; }
}
ecrire(DST, LARGEUR_FINALE, nh, petit);
console.log("écrit : %s  %dx%d  %d octets",
  path.relative(RACINE, DST), LARGEUR_FINALE, nh, fs.statSync(DST).size);
