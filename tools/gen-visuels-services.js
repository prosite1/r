/* =========================================================================
   Une illustration explicative par service (fenêtre au clic sur la carte).
   Schémas anatomiques : peau, vaisseau en coupe longitudinale, valvules,
   flux — puis l'élément propre à chaque acte.
   Aucun texte : les mêmes fichiers servent en français, anglais et arabe.
   Sortie : assets/img/svc-1.svg … svc-10.svg   (1200 x 750, ratio 8/5)
   ========================================================================= */
const fs = require("fs");
const path = require("path");

const OUT = path.join("C:", "Users", "afef", "Desktop", "newTest", "assets", "img");
const W = 1200, H = 750;

/* ---------- palette ---------- */
const SKIN = "#f2d3b4", SKIN_D = "#e0b691", DERM = "#e8c3a2";
const WALL = "#8fa7c4", WALL_D = "#6b84a4";
const VEIN = "#5b6ea8", VEIN_L = "#8f9ed0";
const BLOOD = "#d8566a", BLOOD_D = "#b03b50";
const PLAQUE = "#e6c463", CLOT = "#7a4258";
const METAL = "#c3d2e2", ACCENT = "#e0384a", BRAND = "#0b4a80", GLOW = "#ff6b3d";

/* ---------- décor ---------- */
function frame(inner, defs) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="presentation">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2=".4" y2="1">
      <stop offset="0" stop-color="#f6fafd"/><stop offset="1" stop-color="#dfeaf5"/>
    </linearGradient>
    <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f9e2c9"/><stop offset="1" stop-color="${DERM}"/>
    </linearGradient>
    <linearGradient id="lumen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8829a"/>
      <stop offset=".5" stop-color="${BLOOD}"/>
      <stop offset="1" stop-color="${BLOOD_D}"/>
    </linearGradient>
    <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a9bdd6"/><stop offset="1" stop-color="${WALL_D}"/>
    </linearGradient>
    <radialGradient id="halo" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${GLOW}" stop-opacity=".9"/>
      <stop offset="1" stop-color="${GLOW}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <filter id="soft2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    ${defs || ""}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="${W / 2}" cy="${H * .44}" rx="${W * .46}" ry="${H * .46}" fill="#ffffff" opacity=".55" filter="url(#soft)"/>
  ${inner}
  <path d="M0 ${H - 8}h${W}" stroke="${ACCENT}" stroke-width="8"/>
</svg>
`;
}

/* bande de peau en haut, avec le derme dessous */
function skinBand(y, h) {
  return `<rect x="0" y="${y}" width="${W}" height="${h}" fill="url(#skinG)"/>
  <path d="M0 ${y + h}h${W}" stroke="#d3a982" stroke-width="3" opacity=".7"/>
  <g opacity=".35" stroke="#d3a982" stroke-width="2.5" stroke-linecap="round">
    ${Array.from({ length: 14 }, (_, i) => `<path d="M${60 + i * 82} ${y + 14} l16 ${h - 28}"/>`).join("")}
  </g>`;
}

/* vaisseau horizontal en coupe : parois + lumière ; r = demi-calibre */
function vessel(x1, x2, y, r, o = {}) {
  const wall = o.wall || 13;
  const lum = o.lumen || "url(#lumen)";
  return `<rect x="${x1}" y="${y - r - wall}" width="${x2 - x1}" height="${r * 2 + wall * 2}" rx="${r + wall}" fill="url(#wallG)"/>
  <rect x="${x1 + 3}" y="${y - r}" width="${x2 - x1 - 6}" height="${r * 2}" rx="${r}" fill="${lum}"/>`;
}

/* flèche de flux */
function flow(x, y, len, color, w = 9, back) {
  const d = back ? -1 : 1;
  return `<path d="M${x} ${y} h${len * d}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>
  <path d="M${x + len * d} ${y} l${-14 * d} ${-9} m${14 * d} 9 l${-14 * d} 9" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/* Valvule veineuse vue en coupe : deux cuspides pleines qui partent des parois.
   Jointives = la valvule tient. Écartées = elle fuit, le sang redescend. */
function valve(cx, y, half, beante) {
  const tip = beante ? half * 0.52 : 4;      // écart entre les deux pointes
  const drop = beante ? 92 : 74;             // longueur des cuspides
  const g = "#eaf3fb", gs = "#b9cde0";
  return `
    <path d="M${cx - half} ${y} Q${cx - half * .5} ${y + drop * .55} ${cx - tip} ${y + drop}
             L${cx - tip} ${y + drop - 16} Q${cx - half * .6} ${y + drop * .4} ${cx - half} ${y + 16} Z"
          fill="${g}" stroke="${gs}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M${cx + half} ${y} Q${cx + half * .5} ${y + drop * .55} ${cx + tip} ${y + drop}
             L${cx + tip} ${y + drop - 16} Q${cx + half * .6} ${y + drop * .4} ${cx + half} ${y + 16} Z"
          fill="${g}" stroke="${gs}" stroke-width="4" stroke-linejoin="round"/>`;
}

/* jambe simplifiée, de profil */
const LEG = `M250 40 C 235 190 300 320 312 470 C 322 600 360 660 372 760 L 520 760
  C 528 640 566 580 578 460 C 590 320 640 190 622 40 Z`;

function leg(extra, tx = 0, sc = 1) {
  return `<g transform="translate(${tx} 0) scale(${sc})">
    <path d="${LEG}" fill="#c9a184" opacity=".25" transform="translate(12 14)" filter="url(#soft)"/>
    <path d="${LEG}" fill="url(#skinG)"/>
    <path d="M320 60 C 312 220 346 420 340 760 L 400 760 C 402 420 372 220 384 60 Z" fill="#ffffff" opacity=".3"/>
    ${extra || ""}
  </g>`;
}

/* réseau variqueux sur la jambe */
const VARIX = `<g filter="url(#soft2)">
  <path d="M400 90 C 442 170 372 226 402 300 C 434 380 366 424 396 504 C 424 578 366 622 392 700"
        fill="none" stroke="${VEIN}" stroke-width="16" stroke-linecap="round" opacity=".92"/>
  <path d="M402 300 C 444 320 468 356 480 396" fill="none" stroke="${VEIN}" stroke-width="9" stroke-linecap="round" opacity=".85"/>
  <path d="M396 504 C 362 526 342 556 334 592" fill="none" stroke="${VEIN}" stroke-width="9" stroke-linecap="round" opacity=".85"/>
  <ellipse cx="402" cy="300" rx="17" ry="13" fill="${VEIN}"/>
  <ellipse cx="396" cy="504" rx="19" ry="15" fill="${VEIN}"/>
</g>`;

/* écran de mesure */
function screen(x, y, w, h, trace) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${BRAND}"/>
  <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" rx="12" fill="#08325a"/>
  ${trace}`;
}

/* ---------- les dix illustrations ---------- */
const S = {};

/* 1. Consultation : examen de la jambe, repérage des trajets veineux */
S["svc-1"] = frame(
  leg(VARIX, -60, 0.92) +
  `<circle cx="760" cy="330" r="150" fill="#ffffff" opacity=".55"/>
   <circle cx="760" cy="330" r="150" fill="none" stroke="${METAL}" stroke-width="14"/>
   <circle cx="760" cy="330" r="150" fill="none" stroke="#ffffff" stroke-width="5"/>
   <path d="M866 436 L980 550" stroke="${METAL}" stroke-width="30" stroke-linecap="round"/>
   <g clip-path="none" filter="url(#soft2)">
     <path d="M676 250 C 720 300 660 350 706 404" fill="none" stroke="${VEIN}" stroke-width="14" stroke-linecap="round"/>
     <path d="M760 224 C 800 290 742 336 786 410" fill="none" stroke="${VEIN}" stroke-width="10" stroke-linecap="round" opacity=".8"/>
   </g>
   <g transform="translate(1000 150)">
     <rect x="0" y="0" width="150" height="200" rx="14" fill="#ffffff" stroke="${METAL}" stroke-width="5"/>
     ${[0, 1, 2].map(i => `<g transform="translate(24 ${34 + i * 52})">
        <circle cx="0" cy="0" r="14" fill="none" stroke="${BRAND}" stroke-width="5"/>
        <path d="M-6 0 l4 5 8-10" fill="none" stroke="${ACCENT}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M30 0 h72" stroke="#c9d9e8" stroke-width="8" stroke-linecap="round"/>
     </g>`).join("")}
   </g>`
);

/* 2. Écho-Doppler : sonde sur la peau, coupe du vaisseau, tracé à l'écran */
S["svc-2"] = frame(
  skinBand(430, 130) +
  vessel(60, 700, 640, 46) +
  `<g opacity=".9">${flow(200, 640, 120, "#ffd9e1")}${flow(430, 640, 120, "#ffd9e1")}</g>
   <g transform="translate(300 300)">
     <rect x="-58" y="-190" width="116" height="200" rx="34" fill="#eef4fa" stroke="${METAL}" stroke-width="6"/>
     <path d="M-58 10 h116 l26 62 h-168z" fill="${METAL}"/>
     <path d="M-92 96 h184" stroke="#9fc4e8" stroke-width="9" stroke-dasharray="10 20" stroke-linecap="round"/>
     <path d="M-66 140 h132" stroke="#9fc4e8" stroke-width="8" stroke-dasharray="10 20" stroke-linecap="round" opacity=".7"/>
   </g>
   ${screen(760, 150, 380, 300,
    `<path d="M790 330 h60 l24-70 30 150 26-96 h64 l24-54 26 110 22-72 h44"
        fill="none" stroke="#6fd0ff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
     <path d="M790 386 h330" stroke="#2a6ea8" stroke-width="4" stroke-dasharray="8 12"/>`)}`
);

/* 3. Sclérothérapie : aiguille, mousse dans la lumière, veine qui se referme */
S["svc-3"] = frame(
  skinBand(120, 110) +
  vessel(60, 1140, 470, 52) +
  `<rect x="700" y="440" width="440" height="60" rx="30" fill="url(#wallG)"/>
   <rect x="703" y="452" width="434" height="36" rx="18" fill="#c7d3e2"/>
   <g>
     ${Array.from({ length: 12 }, (_, i) =>
      `<circle cx="${330 + i * 30}" cy="${455 + (i % 3) * 18}" r="${9 + (i % 4) * 3}" fill="#ffffff" opacity=".82"/>`).join("")}
   </g>
   <g transform="rotate(38 300 300)">
     <rect x="150" y="180" width="230" height="76" rx="16" fill="#f4f8fc" stroke="${METAL}" stroke-width="6"/>
     <rect x="168" y="196" width="120" height="44" rx="10" fill="${ACCENT}" opacity=".8"/>
     <rect x="366" y="200" width="70" height="36" rx="10" fill="${METAL}"/>
     <path d="M436 218 h96" stroke="${METAL}" stroke-width="10" stroke-linecap="round"/>
   </g>
   <circle cx="560" cy="470" r="70" fill="${GLOW}" opacity=".14" filter="url(#soft)"/>`
);

/* 4. Laser endoveineux : fibre dans la veine, chaleur, occlusion derrière */
S["svc-4"] = frame(
  skinBand(120, 110) +
  vessel(60, 1140, 470, 52) +
  `<rect x="60" y="440" width="420" height="60" rx="30" fill="url(#wallG)"/>
   <rect x="63" y="452" width="414" height="36" rx="18" fill="#c7d3e2"/>
   <path d="M1140 470 H620" stroke="${METAL}" stroke-width="16" stroke-linecap="round"/>
   <path d="M1140 470 H620" stroke="#eef4fa" stroke-width="7" stroke-linecap="round"/>
   <circle cx="600" cy="470" r="120" fill="url(#halo)"/>
   <circle cx="600" cy="470" r="30" fill="${GLOW}"/>
   <circle cx="600" cy="470" r="14" fill="#fff3c4"/>
   <g stroke="${GLOW}" stroke-width="7" stroke-linecap="round" opacity=".8">
     <path d="M600 330 v-56"/><path d="M508 378 l-40-40"/><path d="M692 378 l40-40"/>
     <path d="M600 610 v56"/><path d="M508 562 l-40 40"/><path d="M692 562 l40 40"/>
   </g>`
);

/* 5. Insuffisance veineuse : valvule qui tient en haut, valvule béante et
      reflux en bas, avec la dilatation qui en résulte */
S["svc-5"] = frame(
  `<path d="M470 60 h260 v300 q0 90 40 130 q-40 40 -40 130 v70 h-260 v-70 q0-90-40-130 q40-40 40-130 z"
         fill="url(#wallG)"/>
   <path d="M488 78 h224 v292 q0 84 38 122 q-38 38 -38 122 v56 h-224 v-56 q0-84-38-122 q38-38 38-122 z"
         fill="url(#lumen)"/>

   ${valve(600, 190, 106, false)}
   ${valve(600, 470, 106, true)}

   <g transform="rotate(-90 340 150)">${flow(280, 150, 130, "#bfe6ff", 14)}</g>
   <g transform="rotate(90 600 600)">${flow(540, 600, 120, "#ffd7de", 14)}</g>

   <path d="M600 372 v96" stroke="${ACCENT}" stroke-width="15" stroke-linecap="round" opacity=".95"/>
   <path d="M600 468 l-19-30 m19 30 l19-30" fill="none" stroke="${ACCENT}" stroke-width="15"
         stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>

   <ellipse cx="600" cy="640" rx="170" ry="70" fill="${VEIN}" opacity=".22" filter="url(#soft2)"/>
   <path d="M860 300 h150" stroke="#bfe6ff" stroke-width="0"/>`
);

/* 6. Thrombose : caillot qui obstrue, flux arrêté en amont */
S["svc-6"] = frame(
  skinBand(120, 110) +
  vessel(60, 1140, 470, 56) +
  `<g>
     <path d="M560 418 c60-16 130-10 176 16 40 22 44 62 8 84 -52 32-150 34-196 4 -34-22-30-88 12-104z"
           fill="${CLOT}"/>
     <path d="M600 436 c40-10 92-6 120 12" fill="none" stroke="#a2647c" stroke-width="9" stroke-linecap="round" opacity=".7"/>
     <path d="M596 508 c46 14 118 12 152-8" fill="none" stroke="#5d3144" stroke-width="9" stroke-linecap="round" opacity=".6"/>
   </g>
   ${flow(140, 470, 130, "#ffd9e1")}
   <path d="M400 470 h80" stroke="#ffd9e1" stroke-width="9" stroke-linecap="round" opacity=".5"/>
   <g stroke="${ACCENT}" stroke-width="12" stroke-linecap="round">
     <path d="M470 424 l52 92"/><path d="M522 424 l-52 92"/>
   </g>
   <ellipse cx="660" cy="470" rx="180" ry="120" fill="${ACCENT}" opacity=".10" filter="url(#soft)"/>`
);

/* 7. Artériopathie : plaques d'athérome, lumière rétrécie, débit réduit */
S["svc-7"] = frame(
  skinBand(120, 110) +
  vessel(60, 1140, 470, 58, { lumen: "#e4657c" }) +
  `<path d="M300 414 c70-6 120 18 180 30 -60 12-110 36-180 30z" fill="${PLAQUE}"/>
   <path d="M300 526 c70 6 120-18 180-30 -60-12-110-36-180-30z" fill="${PLAQUE}"/>
   <path d="M700 418 c60-4 104 16 156 26 -52 10-96 32-156 26z" fill="${PLAQUE}" opacity=".9"/>
   <path d="M700 522 c60 4 104-16 156-26 -52-10-96-32-156-26z" fill="${PLAQUE}" opacity=".9"/>
   ${flow(120, 470, 120, "#ffd9e1", 11)}
   ${flow(560, 470, 70, "#ffd9e1", 6)}
   ${flow(940, 470, 60, "#ffd9e1", 5)}
   <g opacity=".55">
     <circle cx="420" cy="470" r="10" fill="#8a6b1f"/>
     <circle cx="470" cy="452" r="7" fill="#8a6b1f"/>
     <circle cx="470" cy="490" r="7" fill="#8a6b1f"/>
   </g>`
);

/* 8. Pressothérapie et compression : bas dégressif, pressions vers l'intérieur */
S["svc-8"] = frame(
  leg(`<path d="M296 380 C 306 500 344 580 356 760 L 536 760 C 546 590 578 500 590 380
        C 560 356 330 356 296 380 z" fill="#3d6a96" opacity=".92"/>
     <g stroke="#ffffff" stroke-width="4" opacity=".35">
       ${Array.from({ length: 9 }, (_, i) => `<path d="M300 ${412 + i * 40} h286"/>`).join("")}
     </g>`, -40, 0.95) +
  `<g stroke="${BRAND}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
     <path d="M760 660 h-150"/><path d="M628 646 l-18 14 18 14"/>
     <path d="M790 540 h-190"/><path d="M618 526 l-18 14 18 14"/>
     <path d="M820 420 h-230"/><path d="M608 406 l-18 14 18 14"/>
   </g>
   <g fill="${BRAND}" opacity=".16">
     <rect x="800" y="618" width="290" height="84" rx="42"/>
     <rect x="830" y="498" width="260" height="84" rx="42"/>
     <rect x="860" y="378" width="230" height="84" rx="42"/>
   </g>`
);

/* 9. Ulcère : plaie de cheville, pansement en couches, bande de compression */
S["svc-9"] = frame(
  skinBand(150, 420) +
  `<ellipse cx="430" cy="360" rx="190" ry="130" fill="#b98a6e" opacity=".35" filter="url(#soft)"/>
   <path d="M330 300 c40-40 130-46 176-8 44 36 40 108-8 136 -54 32-150 26-186-16 -28-34-16-80 18-112z"
         fill="#dfa294"/>
   <path d="M356 316 c34-30 108-34 144-6 34 28 30 84-8 106 -44 26-120 20-148-14 -22-26-12-64 12-86z"
         fill="#c2665f"/>
   <g transform="translate(700 250)">
     <rect x="0" y="0" width="330" height="90" rx="18" fill="#ffffff" stroke="#d9e4ee" stroke-width="5"/>
     <rect x="26" y="118" width="330" height="90" rx="18" fill="#f4f8fc" stroke="#d9e4ee" stroke-width="5"/>
     <rect x="52" y="236" width="330" height="90" rx="18" fill="#ffffff" stroke="#d9e4ee" stroke-width="5"/>
     <path d="M-40 46 h30 M-40 164 h56 M-40 282 h82" stroke="${BRAND}" stroke-width="9" stroke-linecap="round"/>
   </g>
   <path d="M120 596 q140-46 280 0 t280 0 t280 0" fill="none" stroke="#e7eef6" stroke-width="54" stroke-linecap="round"/>
   <path d="M120 596 q140-46 280 0 t280 0 t280 0" fill="none" stroke="#cfdeeb" stroke-width="6" stroke-dasharray="4 26" stroke-linecap="round"/>`
);

/* 10. Phlébologie esthétique : varicosités sous la peau, faisceau laser, zone traitée */
S["svc-10"] = frame(
  skinBand(230, 380) +
  `<g filter="url(#soft2)">
     ${[[300, 380], [420, 470], [250, 500]].map(([cx, cy], k) => {
      let s = k * 977 + 13, out = "";
      const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 5; i++) {
        const a = rnd() * 6.28, L = 70 + rnd() * 70;
        out += `<path d="M${cx} ${cy} q${Math.cos(a + .4) * L * .6} ${Math.sin(a + .4) * L * .6} ${Math.cos(a) * L} ${Math.sin(a) * L}"
                 fill="none" stroke="${VEIN_L}" stroke-width="${4 + rnd() * 3}" stroke-linecap="round" opacity=".85"/>`;
      }
      return out;
    }).join("")}
   </g>
   <g transform="translate(820 120)">
     <rect x="-70" y="0" width="140" height="150" rx="24" fill="#eef4fa" stroke="${METAL}" stroke-width="6"/>
     <rect x="-46" y="30" width="92" height="40" rx="10" fill="${BRAND}"/>
     <path d="M0 150 l-46 90 h92z" fill="${ACCENT}" opacity=".28"/>
     <path d="M0 150 l-20 90 h40z" fill="${ACCENT}" opacity=".5"/>
   </g>
   <ellipse cx="820" cy="480" rx="120" ry="46" fill="${ACCENT}" opacity=".18" filter="url(#soft2)"/>
   <ellipse cx="820" cy="480" rx="70" ry="26" fill="#ffffff" opacity=".55"/>`
);

/* ---------- écriture ---------- */
let n = 0;
for (const [name, svg] of Object.entries(S)) {
  fs.writeFileSync(path.join(OUT, name + ".svg"), svg, "utf8");
  console.log(name.padEnd(8) + (svg.length / 1024).toFixed(1).padStart(6) + " Ko");
  n++;
}
console.log("\n" + n + " illustrations de services ecrites dans " + OUT);
