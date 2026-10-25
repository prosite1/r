/* =========================================================================
   Vignettes des 3 vidéos (section Vidéos, fond bleu nuit).
   Même sujet — les varices — donc une jambe commune et un élément
   d'accent différent par vidéo : sonde Doppler, symptômes, veines traitées.
   Sortie : assets/img/video-1.svg … video-3.svg   (800 x 500, ratio 16/10)
   ========================================================================= */
const fs = require("fs");
const path = require("path");

const OUT = path.join("C:", "Users", "afef", "Desktop", "newTest", "assets", "img");
const W = 800, H = 500;

const SKIN = "#f0cdaa", SKIN_D = "#d9a87f";
const VEIN = "#6f7fc4", VEIN_D = "#4f5da0";
const ACCENT = "#e0384a";

/* jambe vue de face, cadrée du genou à la cheville */
const LEG = `M300 -40
  C 292 90 322 190 328 280
  C 334 372 360 430 366 560
  L 470 560
  C 476 430 500 372 506 280
  C 512 190 542 90 534 -40 Z`;

/* réseau variqueux : tronc tortueux + branches + paquets */
const TRUNK = "M404 10 C 438 74 386 112 408 168 C 432 226 380 258 400 316 C 420 374 378 404 396 462 C 410 508 386 528 398 566";
const BR_A = "M408 168 C 440 184 458 210 468 240";
const BR_B = "M400 316 C 372 332 354 356 346 384";

function knot(x, y, r) {
  return `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * .78).toFixed(1)}" fill="${VEIN}" opacity=".92"/>`;
}

function head(extraDefs) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="presentation">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2=".8" y2="1">
      <stop offset="0" stop-color="#072d4f"/><stop offset="1" stop-color="#0f5e9f"/>
    </linearGradient>
    <linearGradient id="skin" x1=".15" y1="0" x2=".9" y2=".1">
      <stop offset="0" stop-color="#f7ddc2"/>
      <stop offset=".5" stop-color="${SKIN}"/>
      <stop offset="1" stop-color="${SKIN_D}"/>
    </linearGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.6" fill="#ffffff" opacity=".14"/>
    </pattern>
    <filter id="derm" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.1"/>
    </filter>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
    ${extraDefs || ""}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  <circle cx="668" cy="86" r="150" fill="#ffffff" opacity=".06"/>
  <path d="M0 392c118-40 196 36 312-6s298-78 488-20v134H0z" fill="#ffffff" opacity=".06"/>`;
}

function leg(veins) {
  return `
  <g transform="translate(-24 -30)">
    <path d="${LEG}" fill="#08243d" opacity=".35" transform="translate(12 14)" filter="url(#soft)"/>
    <path d="${LEG}" fill="url(#skin)"/>
    <path d="M356 -30 C 350 120 372 300 366 560 L 410 560 C 410 300 392 120 400 -30 Z" fill="#ffffff" opacity=".22"/>
    ${veins}
  </g>`;
}

const VEINS_FULL = `
    <g filter="url(#derm)">
      <path d="${TRUNK}" fill="none" stroke="${VEIN}" stroke-width="15" stroke-linecap="round" opacity=".95"/>
      <path d="${TRUNK}" fill="none" stroke="${VEIN_D}" stroke-width="6" stroke-linecap="round" opacity=".6"/>
      <path d="${BR_A}" fill="none" stroke="${VEIN}" stroke-width="8" stroke-linecap="round" opacity=".85"/>
      <path d="${BR_B}" fill="none" stroke="${VEIN}" stroke-width="8" stroke-linecap="round" opacity=".85"/>
      ${knot(408, 168, 15)}${knot(400, 316, 17)}${knot(396, 462, 14)}
    </g>`;

const VEINS_FAINT = `
    <g filter="url(#derm)" opacity=".22">
      <path d="${TRUNK}" fill="none" stroke="${VEIN}" stroke-width="7" stroke-linecap="round"/>
    </g>`;

const TAIL = `
  <path d="M0 ${H - 6}h${W}" stroke="${ACCENT}" stroke-width="6"/>
</svg>
`;

/* --- 1 : entretien général, la sonde Doppler posée sur la jambe --- */
const v1 = head() + leg(VEINS_FULL) + `
  <g transform="translate(470 190) rotate(18)">
    <rect x="-30" y="-96" width="60" height="118" rx="22" fill="#e8eef6"/>
    <path d="M-30 22 h60 l24 44 h-108z" fill="#cbd8e8"/>
    <path d="M-70 96 h140" stroke="#8fb9e4" stroke-width="7" stroke-dasharray="7 15" stroke-linecap="round"/>
    <path d="M-52 132 h104" stroke="#8fb9e4" stroke-width="6" stroke-dasharray="7 15" stroke-linecap="round" opacity=".7"/>
  </g>
  <g transform="translate(596 356)">
    <rect x="-84" y="-42" width="168" height="84" rx="16" fill="#0a3a63" opacity=".85"/>
    <path d="M-64 0 h22 l10-24 14 50 12-26 h26" fill="none" stroke="#7fd0ff" stroke-width="6"
          stroke-linejoin="round" stroke-linecap="round"/>
  </g>` + TAIL;

/* --- 2 : symptômes, l'accent sur la gêne ressentie --- */
const v2 = head() + leg(VEINS_FULL) + `
  <g transform="translate(556 168)">
    <circle r="66" fill="${ACCENT}" opacity=".18" filter="url(#soft)"/>
    <circle r="52" fill="none" stroke="${ACCENT}" stroke-width="7"/>
    <path d="M-15-16 a16 16 0 1 1 16 17 c0 9-1 12-1 16" fill="none" stroke="${ACCENT}"
          stroke-width="8" stroke-linecap="round"/>
    <circle cx="0" cy="30" r="5.5" fill="${ACCENT}"/>
  </g>
  <g stroke="${ACCENT}" stroke-width="6" stroke-linecap="round" opacity=".75">
    <path d="M232 214 l-46-20"/><path d="M236 268 l-52 2"/><path d="M244 320 l-46 22"/>
  </g>` + TAIL;

/* --- 3 : entretien 2021, réseau largement effacé après traitement --- */
const v3 = head() + leg(VEINS_FAINT) + `
  <g transform="translate(540 200)">
    <circle r="60" fill="#7fd0ff" opacity=".16" filter="url(#soft)"/>
    <circle r="46" fill="none" stroke="#7fd0ff" stroke-width="7"/>
    <path d="M-20 2 l14 16 28-34" fill="none" stroke="#7fd0ff" stroke-width="9"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(586 358)">
    <rect x="-92" y="-30" width="184" height="60" rx="30" fill="#0a3a63" opacity=".8"/>
    <path d="M-64 0 h26 l10-18 14 38 12-20 h30" fill="none" stroke="#8fb9e4" stroke-width="6"
          stroke-linejoin="round" stroke-linecap="round"/>
  </g>` + TAIL;

const FILES = { "video-1": v1, "video-2": v2, "video-3": v3 };
for (const [name, svg] of Object.entries(FILES)) {
  fs.writeFileSync(path.join(OUT, name + ".svg"), svg, "utf8");
  console.log(name.padEnd(9) + (svg.length / 1024).toFixed(1).padStart(6) + " Ko");
}
console.log("\n3 vignettes video ecrites dans " + OUT);
