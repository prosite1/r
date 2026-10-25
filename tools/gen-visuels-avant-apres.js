/* =========================================================================
   Illustrations médicales « avant / après » pour la section comparative.
   Ce sont des schémas : aucun patient réel, aucune photo.
   Sortie : assets/img/ba-1a.svg … ba-3b.svg   (900 x 1000, ratio 9/10)
            suffixe « a » = avant, « b » = après
   ========================================================================= */
const fs = require("fs");
const path = require("path");

const OUT = path.join("C:", "Users", "afef", "Desktop", "newTest", "assets", "img");
const W = 900, H = 1000;

/* ---------- palette ---------- */
const SKIN_1 = "#f6dcc4", SKIN_2 = "#eec7a6", SKIN_3 = "#dcac89";
const VEIN = "#5b6ea8", VEIN_DARK = "#43548a", VEIN_FINE = "#7d6b9e";
const WOUND = "#c2665f", WOUND_RIM = "#dfa294", PIGMENT = "#b98a6e";

/* ---------- décor commun ---------- */
function frame(inner, defs) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="presentation">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2=".4" y2="1">
      <stop offset="0" stop-color="#f7fafd"/><stop offset="1" stop-color="#e3ecf5"/>
    </linearGradient>
    <linearGradient id="skin" x1=".18" y1="0" x2=".95" y2=".2">
      <stop offset="0" stop-color="${SKIN_1}"/>
      <stop offset=".45" stop-color="${SKIN_2}"/>
      <stop offset="1" stop-color="${SKIN_3}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset=".42" stop-color="#ffffff" stop-opacity=".42"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vign" cx=".5" cy=".42" r=".62">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".8"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="derm" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.9"/>
    </filter>
    <filter id="derm2" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.4"/>
    </filter>
    ${defs || ""}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="${W / 2}" cy="${H * .42}" rx="${W * .48}" ry="${H * .44}" fill="url(#vign)"/>
  ${inner}
  <path d="M0 ${H - 7}h${W}" stroke="#e0384a" stroke-width="7"/>
</svg>
`;
}

/* ---------- silhouette de jambe (paires 1 et 3) ---------- */
const LEG = `M300 14
  C 292 180 340 330 348 470
  C 356 560 326 600 330 650
  C 336 760 380 820 392 1014
  L 512 1014
  C 520 820 566 760 574 650
  C 578 600 552 560 563 470
  C 572 330 612 180 600 14 Z`;

function legBase() {
  return `<g>
    <path d="${LEG}" fill="#c9a184" opacity=".22" transform="translate(9 12)" filter="url(#derm2)"/>
    <path d="${LEG}" fill="url(#skin)"/>
    <path d="M372 40 C 366 250 392 470 386 700 C 382 850 400 930 402 1010 L 470 1010 C 470 900 452 800 456 640 C 460 420 440 220 452 40 Z" fill="url(#sheen)" opacity=".55"/>
    <ellipse cx="452" cy="474" rx="86" ry="34" fill="#d9a582" opacity=".28" filter="url(#derm2)"/>
    <ellipse cx="452" cy="672" rx="104" ry="66" fill="#ffffff" opacity=".14" filter="url(#derm2)"/>
  </g>`;
}

/* ---------- paire 1 : varices des membres inférieurs ---------- */
const TRUNK_1 = "M432 96 C 476 190 398 250 430 336 C 464 424 390 470 418 562 C 448 656 384 706 408 796 C 428 872 396 906 412 990";
const TRUNK_2 = "M546 250 C 570 340 520 386 540 470 C 558 548 512 596 528 676 C 542 748 506 786 520 862";
const BR_1 = "M430 336 C 470 356 494 396 508 438";
const BR_2 = "M418 562 C 386 586 362 616 350 654";
const BR_3 = "M408 796 C 438 812 458 838 468 868";

function knots(pts) {
  return pts.map(([x, y, r]) =>
    `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * .78).toFixed(1)}" fill="${VEIN}" opacity=".9"/>`).join("");
}

function fineCluster(cx, cy, n, spread, seed) {
  let s = seed, out = "";
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    const x = cx + (rnd() - .5) * spread, y = cy + (rnd() - .5) * spread * .8;
    const l = 16 + rnd() * 30, a = (rnd() - .5) * 2.2;
    out += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(l * .5).toFixed(0)} ${(a * 9).toFixed(0)} ${l.toFixed(0)} ${(a * 4).toFixed(0)}" fill="none" stroke="${VEIN_FINE}" stroke-width="${(1.8 + rnd() * 1.6).toFixed(1)}" stroke-linecap="round" opacity=".72"/>`;
  }
  return out;
}

const pair1 = after => frame(
  legBase() +
  (after
    /* après : réseau superficiel effacé, un tracé résiduel à peine visible */
    ? `<g filter="url(#derm)" opacity=".13">
         <path d="${TRUNK_1}" fill="none" stroke="${VEIN}" stroke-width="7" stroke-linecap="round"/>
       </g>`
    /* avant : troncs tortueux, branches, paquets variqueux, varicosités */
    : `<g filter="url(#derm)">
         <path d="${TRUNK_1}" fill="none" stroke="${VEIN}" stroke-width="17" stroke-linecap="round" opacity=".92"/>
         <path d="${TRUNK_1}" fill="none" stroke="${VEIN_DARK}" stroke-width="7" stroke-linecap="round" opacity=".55"/>
         <path d="${TRUNK_2}" fill="none" stroke="${VEIN}" stroke-width="11" stroke-linecap="round" opacity=".78"/>
         <path d="${BR_1}" fill="none" stroke="${VEIN}" stroke-width="8" stroke-linecap="round" opacity=".8"/>
         <path d="${BR_2}" fill="none" stroke="${VEIN}" stroke-width="8" stroke-linecap="round" opacity=".8"/>
         <path d="${BR_3}" fill="none" stroke="${VEIN}" stroke-width="7" stroke-linecap="round" opacity=".78"/>
         ${knots([[430, 336, 17], [418, 562, 19], [408, 796, 16], [540, 470, 13], [528, 676, 12], [462, 210, 13]])}
         ${fineCluster(520, 560, 14, 150, 7)}
         ${fineCluster(400, 880, 10, 120, 31)}
       </g>`)
);

/* ---------- paire 2 : varicosités (vue rapprochée de peau) ---------- */
function web(cx, cy, seed, scale) {
  let s = seed, out = "";
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  /* quelques veinules nourricières + un réseau en étoile */
  for (let i = 0; i < 5; i++) {
    const a0 = rnd() * 6.28, len = (70 + rnd() * 90) * scale;
    const x2 = cx + Math.cos(a0) * len, y2 = cy + Math.sin(a0) * len;
    out += `<path d="M${cx.toFixed(0)} ${cy.toFixed(0)} Q${(cx + Math.cos(a0 + .5) * len * .6).toFixed(0)} ${(cy + Math.sin(a0 + .5) * len * .6).toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}" fill="none" stroke="${VEIN_FINE}" stroke-width="${(3.4 * scale).toFixed(1)}" stroke-linecap="round" opacity=".8"/>`;
    for (let j = 0; j < 4; j++) {
      const t = .3 + rnd() * .6;
      const bx = cx + (x2 - cx) * t, by = cy + (y2 - cy) * t;
      const a1 = a0 + (rnd() - .5) * 2.4, l1 = (24 + rnd() * 40) * scale;
      out += `<path d="M${bx.toFixed(0)} ${by.toFixed(0)} q${(Math.cos(a1) * l1 * .5).toFixed(0)} ${(Math.sin(a1) * l1 * .5).toFixed(0)} ${(Math.cos(a1) * l1).toFixed(0)} ${(Math.sin(a1) * l1).toFixed(0)}" fill="none" stroke="#8a5f86" stroke-width="${(1.9 * scale).toFixed(1)}" stroke-linecap="round" opacity=".7"/>`;
    }
  }
  return out;
}

const pair2 = after => frame(
  `<g>
    <rect x="86" y="120" width="728" height="760" rx="60" fill="#c9a184" opacity=".2" transform="translate(8 12)" filter="url(#derm2)"/>
    <rect x="86" y="120" width="728" height="760" rx="60" fill="url(#skin)"/>
    <ellipse cx="330" cy="330" rx="230" ry="190" fill="#ffffff" opacity=".2" filter="url(#derm2)"/>
   </g>` +
  (after
    ? `<g filter="url(#derm)" opacity=".12">${web(430, 520, 5, 1)}</g>`
    : `<g filter="url(#derm)">
         ${web(400, 470, 5, 1.05)}
         ${web(560, 690, 91, .8)}
         ${web(280, 700, 43, .62)}
       </g>`)
);

/* ---------- paire 3 : ulcère veineux de la cheville ---------- */
const WOUND_SHAPE = "M402 742 C 386 716 400 690 428 682 C 458 674 492 684 504 706 C 518 730 512 762 490 776 C 464 792 420 782 402 742 Z";

const pair3 = after => frame(
  legBase() +
  (after
    /* après : plaie cicatrisée, pigmentation ocre résiduelle */
    ? `<ellipse cx="452" cy="730" rx="96" ry="76" fill="${PIGMENT}" opacity=".22" filter="url(#derm2)"/>
       <path d="${WOUND_SHAPE}" fill="#f2d9c6" opacity=".92"/>
       <path d="${WOUND_SHAPE}" fill="none" stroke="${PIGMENT}" stroke-width="4" opacity=".42"/>
       <path d="M418 716 C 442 706 470 712 488 728" fill="none" stroke="#e8c2ab" stroke-width="6" stroke-linecap="round" opacity=".8"/>`
    /* avant : plaie ouverte, halo inflammatoire, dermite ocre */
    : `<ellipse cx="452" cy="732" rx="122" ry="98" fill="${PIGMENT}" opacity=".34" filter="url(#derm2)"/>
       <ellipse cx="452" cy="730" rx="96" ry="78" fill="#cf7c72" opacity=".3" filter="url(#derm2)"/>
       <path d="${WOUND_SHAPE}" fill="${WOUND_RIM}"/>
       <path d="${WOUND_SHAPE}" fill="${WOUND}" transform="translate(6 6) scale(.9) translate(50 82)" opacity=".9"/>
       <path d="M414 706 C 440 694 476 700 498 722" fill="none" stroke="#a94f49" stroke-width="5" stroke-linecap="round" opacity=".55"/>
       <g filter="url(#derm)" opacity=".8">
         <path d="M540 640 C 566 690 528 720 546 770" fill="none" stroke="${VEIN}" stroke-width="9" stroke-linecap="round"/>
         <path d="M368 620 C 344 670 378 700 358 752" fill="none" stroke="${VEIN}" stroke-width="7" stroke-linecap="round" opacity=".8"/>
       </g>`)
);

/* ---------- écriture ---------- */
const FILES = {
  "ba-1a": pair1(false), "ba-1b": pair1(true),
  "ba-2a": pair2(false), "ba-2b": pair2(true),
  "ba-3a": pair3(false), "ba-3b": pair3(true)
};

let n = 0;
for (const [name, svg] of Object.entries(FILES)) {
  fs.writeFileSync(path.join(OUT, name + ".svg"), svg, "utf8");
  console.log(name.padEnd(7) + (svg.length / 1024).toFixed(1).padStart(6) + " Ko");
  n++;
}
console.log("\n" + n + " illustrations avant/apres ecrites dans " + OUT);
