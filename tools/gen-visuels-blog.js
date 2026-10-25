/* =========================================================================
   Une illustration par article du blog, qui montre le sujet au lieu de le
   décorer. Même vocabulaire graphique que les schémas de services : fond
   clair, peau, vaisseau en coupe, valvules, flux, filet rouge en bas.

   Aucun texte dans les images : les mêmes fichiers servent en français, en
   anglais et en arabe.

   Format 16/9 (1200 x 675), celui de la fenêtre .post-media. Les anciens
   fichiers étaient en 4/3 : un quart de leur hauteur était rogné à l'écran.

   Contrainte de lisibilité : la carte du blog fait environ 370 px de large,
   soit 31 % de la toile. Tout détail sous 100 px y devient illisible — d'où
   peu d'éléments, mais grands.

   Sortie : assets/img/b-1.svg … b-4.svg
   ========================================================================= */
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "assets", "img");
const W = 1200, H = 675;

/* ---------- palette, identique aux schémas de services ---------- */
const SKIN_D = "#e8c3a2";
const WALL_D = "#6b84a4";
const VEIN = "#5b6ea8";
const BLOOD = "#d8566a", BLOOD_D = "#b03b50";
const CLOT = "#6d3a4e";
const METAL = "#c3d2e2", ACCENT = "#e0384a", BRAND = "#0b4a80";
const SUN = "#f0a93c";
const KNIT_D = "#5d7592";

/* ---------- décor commun ---------- */
function frame(inner, defs) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="presentation">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2=".4" y2="1">
      <stop offset="0" stop-color="#f6fafd"/><stop offset="1" stop-color="#dfeaf5"/>
    </linearGradient>
    <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f9e2c9"/><stop offset="1" stop-color="${SKIN_D}"/>
    </linearGradient>
    <linearGradient id="lumen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8829a"/>
      <stop offset=".5" stop-color="${BLOOD}"/>
      <stop offset="1" stop-color="${BLOOD_D}"/>
    </linearGradient>
    <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a9bdd6"/><stop offset="1" stop-color="${WALL_D}"/>
    </linearGradient>
    <linearGradient id="knitG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a4b8d0"/><stop offset="1" stop-color="${KNIT_D}"/>
    </linearGradient>
    <linearGradient id="presG" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${ACCENT}"/><stop offset="1" stop-color="#9cc0e0"/>
    </linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <filter id="soft2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    ${defs || ""}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="${W / 2}" cy="${H * .44}" rx="${W * .46}" ry="${H * .52}" fill="#ffffff" opacity=".55" filter="url(#soft)"/>
  ${inner}
  <path d="M0 ${H - 7}h${W}" stroke="${ACCENT}" stroke-width="7"/>
</svg>
`;
}

/* ---------- la jambe ----------
   Tracé du genou au pied, en coordonnées propres : x 235..640, y 40..760.
   Posée avec SC/TY ci-dessous elle occupe toute la hauteur utile de la toile
   sans toucher le bord — c'est ce qui manquait à la première version. */
const LEG = `M250 40 C 235 190 300 320 312 470 C 322 600 360 660 372 760 L 520 760
  C 528 640 566 580 578 460 C 590 320 640 190 622 40 Z`;
const SC = 0.845, TY = -6;          // hauteur finale : 34 → 636
const legX = (x) => x * SC;         // abscisse dans la toile, avant translation

function leg(extra, tx, id, sc = SC, ty = TY) {
  return `<g transform="translate(${tx} ${ty}) scale(${sc})">
    <clipPath id="${id}"><path d="${LEG}"/></clipPath>
    <path d="${LEG}" fill="#c9a184" opacity=".25" transform="translate(12 14)" filter="url(#soft)"/>
    <path d="${LEG}" fill="url(#skinG)"/>
    <path d="M320 60 C 312 220 346 420 340 760 L 400 760 C 402 420 372 220 384 60 Z" fill="#ffffff" opacity=".3"/>
    ${extra || ""}
  </g>`;
}

/* réseau variqueux, en coordonnées de la jambe */
const VARIX = `<g filter="url(#soft2)">
  <path d="M400 90 C 448 176 368 234 402 316 C 438 402 362 448 394 530 C 424 606 364 648 392 720"
        fill="none" stroke="${VEIN}" stroke-width="21" stroke-linecap="round" opacity=".94"/>
  <path d="M402 316 C 450 338 476 376 488 418" fill="none" stroke="${VEIN}" stroke-width="12" stroke-linecap="round" opacity=".85"/>
  <path d="M394 530 C 356 552 336 582 328 618" fill="none" stroke="${VEIN}" stroke-width="12" stroke-linecap="round" opacity=".85"/>
  <ellipse cx="402" cy="316" rx="24" ry="18" fill="${VEIN}"/>
  <ellipse cx="394" cy="530" rx="27" ry="21" fill="${VEIN}"/>
</g>`;

/* flèche droite */
function arrow(x1, y1, x2, y2, color, w = 10, L = 22) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (ang) => `${(x2 - L * Math.cos(a - ang)).toFixed(1)} ${(y2 - L * Math.sin(a - ang)).toFixed(1)}`;
  return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>
  <path d="M${p(0.5)} L${x2} ${y2} L${p(-0.5)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/* vaisseau vu en coupe transversale */
function section(cx, cy, rOut, rIn) {
  return `<circle cx="${cx}" cy="${cy}" r="${rOut + 10}" fill="#ffffff" opacity=".92"/>
  <circle cx="${cx}" cy="${cy}" r="${rOut}" fill="url(#wallG)"/>
  <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="url(#lumen)"/>`;
}

/* loupe : disque clair cerclé de métal, contenu détouré au cercle */
function loupe(cx, cy, r, id, contenu, angle = 48) {
  const a = angle * Math.PI / 180;
  const x1 = (cx + Math.cos(a) * r).toFixed(1), y1 = (cy + Math.sin(a) * r).toFixed(1);
  const x2 = (cx + Math.cos(a) * (r + 120)).toFixed(1), y2 = (cy + Math.sin(a) * (r + 120)).toFixed(1);
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${METAL}" stroke-width="30" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
  <g clip-path="url(#${id})">${contenu}</g>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${METAL}" stroke-width="15"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffffff" stroke-width="5"/>`;
}

/* segment de veine vertical, vu en coupe longitudinale */
function veinV(cx, y1, y2, half) {
  return `<rect x="${cx - half - 16}" y="${y1}" width="${(half + 16) * 2}" height="${y2 - y1}" rx="${half + 16}" fill="url(#wallG)"/>
  <rect x="${cx - half}" y="${y1 + 12}" width="${half * 2}" height="${y2 - y1 - 24}" rx="${half}" fill="url(#lumen)"/>`;
}

/* valvule : deux cuspides. Jointives = elle tient. Écartées = elle fuit. */
function valveV(cx, y, half, beante) {
  const tip = beante ? half * 0.58 : 5;
  const drop = beante ? 86 : 70;
  return `
    <path d="M${cx - half} ${y} Q${cx - half * .5} ${y + drop * .55} ${cx - tip} ${y + drop}
             L${cx - tip} ${y + drop - 16} Q${cx - half * .6} ${y + drop * .4} ${cx - half} ${y + 16} Z"
          fill="#ffffff" stroke="#8fa7c4" stroke-width="5" stroke-linejoin="round"/>
    <path d="M${cx + half} ${y} Q${cx + half * .5} ${y + drop * .55} ${cx + tip} ${y + drop}
             L${cx + tip} ${y + drop - 16} Q${cx + half * .6} ${y + drop * .4} ${cx + half} ${y + 16} Z"
          fill="#ffffff" stroke="#8fa7c4" stroke-width="5" stroke-linejoin="round"/>`;
}

/* capsule : segment épais aux bouts arrondis, pour la jambe assise */
function capsule(x1, y1, x2, y2, e, fill) {
  return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${fill}" stroke-width="${e}" stroke-linecap="round"/>`;
}

const B = {};

/* =========================================================================
   1. Jambes lourdes : à partir de quand consulter ?
   La jambe du soir : varices saillantes, cheville gonflée marquée par
   l'élastique de la chaussette. À la loupe, la cause — deux valvules qui ne
   ferment plus et le sang qui redescend.
   ========================================================================= */
B["b-1"] = frame(
  leg(VARIX +
    /* cheville gonflée : renflement, puis le sillon laissé par l'élastique */
    `<g clip-path="url(#clipJ1)">
       <ellipse cx="424" cy="664" rx="132" ry="86" fill="url(#skinG)"/>
       <ellipse cx="424" cy="676" rx="132" ry="80" fill="#e3ab80" opacity=".5"/>
     </g>
     <path d="M296 612 C 356 592 494 592 546 616" fill="none" stroke="#bd8259" stroke-width="14" stroke-linecap="round" opacity=".9"/>
     <path d="M298 644 C 356 624 496 624 548 648" fill="none" stroke="#bd8259" stroke-width="8" stroke-linecap="round" opacity=".55"/>
     <path d="M330 586 C 340 660 352 712 360 762 M520 586 C 512 660 502 712 496 762"
           fill="none" stroke="#0b4a80" stroke-width="7" stroke-dasharray="18 16" stroke-linecap="round" opacity=".55"/>`,
    -140, "clipJ1") +

  loupe(880, 306, 212, "clipL1",
    veinV(880, 40, 572, 82) +
    valveV(880, 172, 82, true) +
    valveV(880, 378, 82, true) +
    arrow(880, 262, 880, 348, "#ffffff", 16) +
    arrow(880, 90, 880, 152, "#ffffff", 16)) +

  arrow(470, 452, 638, 372, BRAND, 12)
);

/* =========================================================================
   2. Chaleur et jambes lourdes
   Le soleil, et ce qu'il fait à la veine : la même veine vue en coupe,
   à droite dilatée par la chaleur. C'est cette dilatation qui donne la
   jambe lourde du soir d'été.
   ========================================================================= */
B["b-2"] = frame(
  `<g transform="translate(168 150)">
     <circle cx="0" cy="0" r="104" fill="${SUN}" opacity=".18"/>
     <circle cx="0" cy="0" r="72" fill="${SUN}"/>
     ${Array.from({ length: 12 }, (_, i) => {
    const a = i * Math.PI / 6;
    return `<path d="M${(Math.cos(a) * 96).toFixed(1)} ${(Math.sin(a) * 96).toFixed(1)} L${(Math.cos(a) * 140).toFixed(1)} ${(Math.sin(a) * 140).toFixed(1)}"
             stroke="${SUN}" stroke-width="17" stroke-linecap="round"/>`;
  }).join("")}
   </g>

   <g stroke="${SUN}" stroke-width="14" stroke-linecap="round" fill="none" opacity=".55">
     <path d="M628 150 q40 -46 80 0 t80 0"/>
     <path d="M648 214 q40 -46 80 0 t80 0"/>
   </g>

   ${section(400, 402, 98, 54)}
   ${arrow(540, 402, 660, 402, SUN, 17)}
   ${section(892, 402, 158, 122)}
`
);

/* =========================================================================
   3. Bien porter ses bas de compression
   Le bas épouse la jambe — il est découpé sur la silhouette, pas posé
   dessus — et l'échelle de pression dit l'essentiel : serré à la cheville,
   de moins en moins en montant. C'est ce dégradé qui fait remonter le sang.
   ========================================================================= */
B["b-3"] = frame(
  leg(
    `<g clip-path="url(#clipJ3)">
       <rect x="200" y="286" width="480" height="480" fill="url(#knitG)"/>
       <g opacity=".5" stroke="#e2ecf6" stroke-width="5">
         ${Array.from({ length: 13 }, (_, i) => `<path d="M200 ${312 + i * 36} h480"/>`).join("")}
       </g>
       <g opacity=".22" stroke="#2c4a68" stroke-width="4">
         ${Array.from({ length: 8 }, (_, i) => `<path d="M${232 + i * 60} 286 l30 480"/>`).join("")}
       </g>
       <rect x="200" y="286" width="480" height="60" fill="#89a0bd"/>
       <rect x="200" y="286" width="480" height="12" fill="#6d86a5"/>
     </g>
     <path d="M292 300 C 360 268 548 268 604 300" fill="none" stroke="#dce8f4" stroke-width="9" stroke-linecap="round"/>`,
    -140, "clipJ3") +

  /* échelle de pression : bande dégradée, flèches décroissantes vers la jambe */
  `<rect x="742" y="118" width="58" height="486" rx="29" fill="url(#presG)"/>
   ${[
    { y: 556, l: 250, w: 19 },
    { y: 440, l: 198, w: 16 },
    { y: 322, l: 150, w: 13 },
    { y: 200, l: 104, w: 11 }
  ].map(a => arrow(716, a.y, 716 - a.l, a.y, ACCENT, a.w)).join("")}
   ${arrow(888, 588, 888, 142, BRAND, 14)}`
);

/* =========================================================================
   4. Voyage en avion : prévenir la thrombose
   L'immobilité assise — hublot, siège, jambe pliée — la veine du mollet où
   le caillot se forme, et le geste qui l'évite : fléchir la cheville.
   ========================================================================= */
B["b-4"] = frame(
  /* Le hublot, avec l'aile dehors : sans elle, un cercle bleu pourrait être
     n'importe quoi. Il porte à lui seul le « en avion » — j'ai renoncé au
     siège et à la jambe pliée, qui se lisaient comme une masse informe une
     fois réduits à la taille d'une carte. */
  `<g transform="translate(214 168)">
     <clipPath id="clipHub"><rect x="-104" y="-118" width="208" height="236" rx="98"/></clipPath>
     <rect x="-122" y="-136" width="244" height="272" rx="116" fill="#ffffff"/>
     <g clip-path="url(#clipHub)">
       <rect x="-104" y="-118" width="208" height="236" fill="#bcd9f2"/>
       <circle cx="-36" cy="-58" r="34" fill="#ffffff" opacity=".85"/>
       <circle cx="26" cy="-36" r="22" fill="#ffffff" opacity=".7"/>
       <path d="M-114 124 L124 28 L124 70 L-16 130 Z" fill="${METAL}"/>
       <path d="M-114 124 L124 28" fill="none" stroke="#ffffff" stroke-width="7"/>
       <path d="M-114 134 L124 66 L124 122 L-114 122 Z" fill="#e8f2fb" opacity=".9"/>
     </g>
     <rect x="-122" y="-136" width="244" height="272" rx="116" fill="none" stroke="${METAL}" stroke-width="15"/>
   </g>` +

  /* la jambe immobile, cadrée au mollet */
  leg(`<g filter="url(#soft2)">
      <path d="M398 300 C 436 380 366 430 396 520 C 424 604 372 650 396 730"
            fill="none" stroke="${VEIN}" stroke-width="20" stroke-linecap="round" opacity=".8"/>
    </g>`, -40, "clipJ4", 0.48, 292) +

  /* le geste qui l'évite : fléchir la cheville */
  `<g>
     <path d="M244 648 A 92 92 0 0 0 294 558" fill="none" stroke="${ACCENT}" stroke-width="15" stroke-linecap="round"/>
     <path d="M294 558 l-36 8 m36 -8 l10 34" fill="none" stroke="${ACCENT}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
   </g>

   ${arrow(300, 452, 580, 372, BRAND, 12)}

   ${loupe(838, 336, 198, "clipL4",
    veinV(838, 80, 592, 82) +
    valveV(838, 158, 82, false) +
    `<ellipse cx="838" cy="406" rx="76" ry="112" fill="${CLOT}"/>
     <ellipse cx="815" cy="372" rx="29" ry="42" fill="#8d5169" opacity=".75"/>` +
    arrow(838, 566, 838, 500, "#ffffff", 16), 122)}`
);

/* ---------- écriture ---------- */
for (const nom in B) {
  if (/\$\{/.test(B[nom])) { throw new Error("variable non interpolée dans " + nom); }
  const f = path.join(OUT, nom + ".svg");
  fs.writeFileSync(f, B[nom], "utf8");
  console.log("%s  %d octets", nom + ".svg", fs.statSync(f).size);
}
console.log("%d illustrations écrites en %dx%d (16/9)", Object.keys(B).length, W, H);
