/* =========================================================================
   Scènes isométriques 3D pour la galerie.
   v2 : cadrage automatique sur la boîte englobante des objets,
        sol en dégradé doux (plus de socle vide), contrastes renforcés.
   Sortie : assets/img/g-1.svg … g-9.svg  (1200 x 900, ratio 4/3)
   ========================================================================= */
const fs = require("fs");
const path = require("path");

const OUT = path.join("C:", "Users", "afef", "Desktop", "newTest", "assets", "img");
const W = 1200, H = 900;

/* ---------- projection + boîte englobante ---------- */
const K = 0.8660254, J = 0.5;
let BB = null;
function mark(x, y) {
  if (!BB) BB = { x0: x, y0: y, x1: x, y1: y };
  else { if (x < BB.x0) BB.x0 = x; if (y < BB.y0) BB.y0 = y; if (x > BB.x1) BB.x1 = x; if (y > BB.y1) BB.y1 = y; }
}
const P = (x, y, z) => {
  const p = [(x - z) * K, (x + z) * J - y];
  mark(p[0], p[1]);
  return p;
};
const poly = a => a.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" ");

/* ---------- couleurs ---------- */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f >= 1) { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
  else { r *= f; g *= f; b *= f; }
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}
const TOP = 1.15, LEFT = 0.93, RIGHT = 0.68;

/* ---------- primitives ---------- */
function box(x, y, z, w, h, d, c, o = {}) {
  const r = o.round === undefined ? 1.1 : o.round;
  const faces = [
    [poly([P(x, y, z + d), P(x, y + h, z + d), P(x + w, y + h, z + d), P(x + w, y, z + d)]), shade(c, o.fl || LEFT)],
    [poly([P(x + w, y, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x + w, y, z + d)]), shade(c, o.fr || RIGHT)],
    [poly([P(x, y + h, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x, y + h, z + d)]), shade(c, o.ft || TOP)]
  ];
  return faces.map(([pts, col]) =>
    `<polygon points="${pts}" fill="${col}" stroke="${col}" stroke-width="${r}" stroke-linejoin="round"/>`).join("");
}

let gid = 0;
function cyl(cx, y, cz, r, h, c, o = {}) {
  const id = "cy" + (gid++);
  const rx = r * K * Math.SQRT2, ry = r * J * Math.SQRT2;
  const [tx, ty] = P(cx, y + h, cz);
  const [bx, by] = P(cx, y, cz);
  mark(tx - rx, ty - ry); mark(tx + rx, ty + ry); mark(bx - rx, by - ry); mark(bx + rx, by + ry);
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${shade(c, (o.fl || LEFT) * 1.02)}"/>
      <stop offset=".46" stop-color="${shade(c, 1.02)}"/>
      <stop offset="1" stop-color="${shade(c, o.fr || RIGHT)}"/>
    </linearGradient></defs>` +
    `<path d="M${(tx - rx).toFixed(2)},${ty.toFixed(2)} L${(bx - rx).toFixed(2)},${by.toFixed(2)} ` +
    `A${rx.toFixed(2)},${ry.toFixed(2)} 0 0 0 ${(bx + rx).toFixed(2)},${by.toFixed(2)} ` +
    `L${(tx + rx).toFixed(2)},${ty.toFixed(2)} Z" fill="url(#${id})"/>` +
    `<ellipse cx="${tx.toFixed(2)}" cy="${ty.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="${shade(c, o.ft || TOP)}"/>`;
}

function disc(cx, y, cz, r, c) {
  const rx = r * K * Math.SQRT2, ry = r * J * Math.SQRT2;
  const [x, yy] = P(cx, y, cz);
  mark(x - rx, yy - ry); mark(x + rx, yy + ry);
  return `<ellipse cx="${x.toFixed(2)}" cy="${yy.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="${c}"/>`;
}

function sphere(cx, y, cz, r, c) {
  const id = "sp" + (gid++);
  const [x, yy] = P(cx, y + r, cz);
  const rr = r * 1.12;
  mark(x - rr, yy - rr); mark(x + rr, yy + rr);
  return `<defs><radialGradient id="${id}" cx=".36" cy=".30" r=".78">
      <stop offset="0" stop-color="${shade(c, 1.32)}"/>
      <stop offset=".58" stop-color="${c}"/>
      <stop offset="1" stop-color="${shade(c, 0.64)}"/>
    </radialGradient></defs>
    <circle cx="${x.toFixed(2)}" cy="${yy.toFixed(2)}" r="${rr.toFixed(2)}" fill="url(#${id})"/>`;
}

function shadow(cx, cz, r, op = 0.22) {
  const [x, y] = P(cx, 0, cz);
  return `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${(r * 1.5).toFixed(2)}" ry="${(r * 0.86).toFixed(2)}" fill="#0a3357" opacity="${op}" filter="url(#soft)"/>`;
}

/* capsule : cylindre à bouts arrondis entre deux points 3D.
   Rendue par un trait épais à extrémités rondes, avec dégradé perpendiculaire
   à l'axe : c'est ce qui donne le volume des membres. */
function capsule(a, b, r, c) {
  const id = "cp" + (gid++);
  const pa = P(a[0], a[1], a[2]), pb = P(b[0], b[1], b[2]);
  const w = r * 1.95;
  [pa, pb].forEach(p => { mark(p[0] - w / 2, p[1] - w / 2); mark(p[0] + w / 2, p[1] + w / 2); });
  const dx = pb[0] - pa[0], dy = pb[1] - pa[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse"
      x1="${(pa[0] - nx * r).toFixed(2)}" y1="${(pa[1] - ny * r).toFixed(2)}"
      x2="${(pa[0] + nx * r).toFixed(2)}" y2="${(pa[1] + ny * r).toFixed(2)}">
      <stop offset="0" stop-color="${shade(c, 1.24)}"/>
      <stop offset=".52" stop-color="${c}"/>
      <stop offset="1" stop-color="${shade(c, .72)}"/>
    </linearGradient></defs>
    <path d="M${pa[0].toFixed(2)},${pa[1].toFixed(2)} L${pb[0].toFixed(2)},${pb[1].toFixed(2)}" fill="none" stroke="url(#${id})" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`;
}

/* tube défini par des points 3D (câble, robinet, fibre) */
function tube3(pts, c, w = 1.7) {
  const pp = pts.map(p => P(p[0], p[1], p[2]));
  let d = `M${pp[0][0].toFixed(2)},${pp[0][1].toFixed(2)}`;
  for (let i = 1; i < pp.length - 1; i += 2) {
    const a = pp[i], b = pp[i + 1] || pp[i];
    d += ` Q${a[0].toFixed(2)},${a[1].toFixed(2)} ${b[0].toFixed(2)},${b[1].toFixed(2)}`;
  }
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
}

/* ---------- éléments composés ---------- */
const FRAME = "#7c93ab", METAL = "#a7bbcf", WHITE = "#fbfdff", PANEL = "#e4eef8";

function chair(x, z, c = "#e6d3b8") {
  return shadow(x + 4, z + 4, 4.4, .18) +
    box(x + .6, 0, z + .6, .9, 4.6, .9, FRAME) + box(x + 6.5, 0, z + .6, .9, 4.6, .9, FRAME) +
    box(x + .6, 0, z + 6.5, .9, 4.6, .9, FRAME) + box(x + 6.5, 0, z + 6.5, .9, 4.6, .9, FRAME) +
    box(x, 4.6, z, 8, 1.6, 8, c) +
    box(x, 6.2, z, 8, 6.6, 1.3, c, { fl: 1.02 });
}

function officeChair(x, z, c = "#2f5478") {
  return shadow(x, z, 5.2, .2) +
    box(x - 4.6, .5, z - .5, 9.2, .7, 1, METAL) +
    box(x - .5, .5, z - 4.6, 1, .7, 9.2, METAL) +
    cyl(x, 1.2, z, 1, 5.4, METAL) +
    box(x - 4, 6.6, z - 4, 8, 1.4, 8, c) +
    box(x - 4, 8, z + 2.6, 8, 7.8, 1.4, c, { fl: 1.02 });
}

/* Écran : la dalle est un polygone posé sur la face avant (plan z+d) du boîtier,
   construit à partir des vrais sommets 3D — pas d'un rectangle « skewé ». */
function monitor(x, y, z, w, h, body = WHITE, screen = "#0d5590", wave = true) {
  const D = 1.2;                    // épaisseur du boîtier
  const zs = z + D + .03;           // plan de la dalle, très légèrement devant
  const mx = .8, my = .9;           // marges de la dalle
  const x1 = x + mx, x2 = x + w - mx, y1 = y + my, y2 = y + h - my;
  const slab = poly([P(x1, y1, zs), P(x1, y2, zs), P(x2, y2, zs), P(x2, y1, zs)]);

  /* tracé ECG dans le plan de la dalle */
  const yc = (y1 + y2) / 2, amp = (y2 - y1) * .3, xw = x2 - x1;
  const wp = [
    [x1 + xw * .07, yc], [x1 + xw * .27, yc], [x1 + xw * .33, yc + amp],
    [x1 + xw * .41, yc - amp * .92], [x1 + xw * .48, yc + amp * .34],
    [x1 + xw * .56, yc], [x2 - xw * .07, yc]
  ].map(p => P(p[0], p[1], zs + .02));

  return box(x + w * .38, y - 2.4, z + .3, w * .24, 2.4, D, "#b9cde0") +
    box(x + w * .16, y - 2.9, z - .3, w * .68, .5, 2.4, "#a7bbcf") +
    box(x, y, z, w, h, D, body) +
    `<polygon points="${slab}" fill="${screen}" stroke="${screen}" stroke-width=".5" stroke-linejoin="round"/>` +
    (wave
      ? `<path d="M${wp.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" L")}" fill="none" stroke="#7fd0ff" stroke-width=".95" stroke-linejoin="round" stroke-linecap="round"/>`
      : "");
}

function bed(x, z) {
  return shadow(x + 11, z + 7, 10.5, .19) +
    box(x + 1, 0, z + 1, 1.4, 7.4, 1.4, FRAME) + box(x + 19.6, 0, z + 1, 1.4, 7.4, 1.4, FRAME) +
    box(x + 1, 0, z + 11.6, 1.4, 7.4, 1.4, FRAME) + box(x + 19.6, 0, z + 11.6, 1.4, 7.4, 1.4, FRAME) +
    box(x, 7.4, z, 22, 1.2, 14, "#c9dbec") +
    box(x, 8.6, z, 22, 2.5, 14, "#f2f8fd") +
    box(x + .6, 11.1, z + .6, 7, 1.6, 12.8, WHITE, { fl: 1.04 });
}

/* jambe allongée : cuisse, mollet et pied en capsules, section décroissante */
function legOnBed(x, y, z) {
  const skin = "#f0cdaa";
  const cz = z + 3.6;
  return capsule([x, y + 2.5, cz], [x + 8.2, y + 2.5, cz], 2.5, skin) +
    capsule([x + 8.2, y + 2.3, cz], [x + 15.8, y + 2.1, cz], 2.05, skin) +
    capsule([x + 15.8, y + 2, cz], [x + 18.4, y + 1.3, cz], 1.6, "#e6b78d");
}

function trolley(x, z, c = "#edf4fa") {
  return shadow(x + 4.5, z + 3.5, 4.8, .18) +
    cyl(x + 1, 0, z + 1, .7, .8, FRAME) + cyl(x + 8, 0, z + 1, .7, .8, FRAME) +
    cyl(x + 1, 0, z + 6, .7, .8, FRAME) + cyl(x + 8, 0, z + 6, .7, .8, FRAME) +
    box(x + .6, .8, z + .6, .9, 9, .9, METAL) + box(x + 7.6, .8, z + .6, .9, 9, .9, METAL) +
    box(x + .6, .8, z + 5.6, .9, 9, .9, METAL) + box(x + 7.6, .8, z + 5.6, .9, 9, .9, METAL) +
    box(x, 4.4, z, 9.5, .9, 7.5, c) +
    box(x, 9.8, z, 9.5, 1, 7.5, c);
}

function plant(x, z, s = 1) {
  return shadow(x, z, 2.6 * s, .18) +
    cyl(x, 0, z, 2.2 * s, 3.4 * s, "#cf9b7d") +
    disc(x, 3.4 * s, z, 2.1 * s, "#63432f") +
    sphere(x - .5 * s, 3.2 * s, z + .3 * s, 2.5 * s, "#357a52") +
    sphere(x + 1.6 * s, 4.6 * s, z - .8 * s, 1.9 * s, "#458f61") +
    sphere(x - .2 * s, 6.4 * s, z - 1.2 * s, 1.6 * s, "#549e70");
}

/* ---------- assemblage + cadrage automatique ---------- */
function stage(inner, opt = {}) {
  const pad = opt.pad || 0.90;
  const bw = BB.x1 - BB.x0, bh = BB.y1 - BB.y0;
  const S = Math.min((W * pad) / bw, (H * pad) / bh);
  const ox = W / 2 - (BB.x0 + bw / 2) * S;
  const oy = H / 2 - (BB.y0 + bh / 2) * S + (opt.dy || 0);

  /* sol : ellipse douce sous les objets, en espace écran */
  const gx = W / 2, gy = oy + BB.y1 * S - bh * S * 0.06;
  const grx = bw * S * 0.62, gry = bw * S * 0.20;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="presentation">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2=".65" y2="1">
      <stop offset="0" stop-color="${opt.bg1 || "#f0f6fc"}"/>
      <stop offset="1" stop-color="${opt.bg2 || "#bed5ea"}"/>
    </linearGradient>
    <radialGradient id="halo" cx=".5" cy=".4" r=".6">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".9"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ground" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#9dbcd8" stop-opacity=".55"/>
      <stop offset=".62" stop-color="#a8c4dd" stop-opacity=".26"/>
      <stop offset="1" stop-color="#b6cfe4" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <ellipse cx="${(W * .5).toFixed(0)}" cy="${(H * .42).toFixed(0)}" rx="${(W * .45).toFixed(0)}" ry="${(H * .4).toFixed(0)}" fill="url(#halo)"/>
  <ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${grx.toFixed(1)}" ry="${gry.toFixed(1)}" fill="url(#ground)"/>

  <g transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${S.toFixed(4)})">
    ${inner}
  </g>
  <path d="M0 ${H - 8}h${W}" stroke="#e0384a" stroke-width="8"/>
</svg>
`;
}

/* =========================================================================
   LES 9 SCÈNES  (coordonnées libres : le cadrage s'ajuste tout seul)
   ========================================================================= */
const SCENES = {};

/* 1 — Salle d'attente : rangée de sièges + guéridon + plante */
SCENES["g-1"] = () => stage(
  chair(-14, -4) + chair(-4.2, -4) + chair(5.6, -4) +
  shadow(17.5, 1, 3.6, .18) +
  box(14.5, 0, -2, 6, 5, 6, "#e7f0f8") +
  box(14.5, 5, -2, 6, .8, 6, WHITE) +
  cyl(17.5, 5.8, 1, 1.1, 1.6, "#0d5590") +
  plant(-18, 4, 1.05),
  { dy: 10 }
);

/* 2 — Bureau de consultation : bureau, écran, fauteuil */
SCENES["g-2"] = () => stage(
  shadow(0, 1, 13, .18) +
  box(-13, 0, -6, 1.6, 9.4, 12, "#bfd2e4") + box(11.4, 0, -6, 1.6, 9.4, 12, "#bfd2e4") +
  box(-14, 9.4, -7, 28, 1.5, 14, "#f5fafd") +
  monitor(-6.5, 10.9, -5, 12.5, 8.6) +
  box(1.6, 10.9, 1.4, 8, .4, 5, WHITE) +
  box(2.2, 11.3, 2, 6.8, .22, 3.8, "#dde8f3") +
  cyl(-8.8, 10.9, 2.6, .78, 2.8, "#e0384a") +
  box(-12.4, 10.9, -1.2, 4.2, 1.8, 4.2, "#d6e3f0") +
  officeChair(0, 12.5) +
  plant(18, -3, 1.1),
  { dy: 6 }
);

/* 3 — Échographe Doppler */
SCENES["g-3"] = () => stage(
  shadow(0, 0, 11, .2) +
  cyl(-5.4, 0, -5.4, 1, 1.4, FRAME) + cyl(5.4, 0, -5.4, 1, 1.4, FRAME) +
  cyl(-5.4, 0, 5.4, 1, 1.4, FRAME) + cyl(5.4, 0, 5.4, 1, 1.4, FRAME) +
  box(-7, 1.4, -7, 14, 12.8, 14, "#f2f8fd") +
  box(-6.4, 5.4, -7.5, 12.8, 3.6, .6, "#d3e2f0", { fl: .88 }) +
  box(-6.4, 9.6, -7.5, 12.8, 3.6, .6, "#d3e2f0", { fl: .88 }) +
  box(-7, 14.2, -7, 14, 1.3, 14, "#e2edf7") +
  box(-6, 15.5, -3.4, 12, .9, 8.4, "#ecf3fa") +
  box(-5.2, 16.4, -1.8, 10.4, .55, 6, "#c7d9ea") +
  cyl(4.4, 16.4, -2.8, .72, .55, "#e0384a") +
  monitor(-6, 16.4, -6.8, 12, 9.4) +
  box(7.4, 11.6, -1.2, 1.3, 5.4, 3.2, "#dbe7f3") +
  tube3([[8.1, 11.6, .2], [13, 6, 6], [11.6, 0, 8]], "#5a7791", 1.9) +
  box(10.6, 0, 6.8, 1.7, 4.6, 1.7, "#2f5478", { round: 1.7 }),
  { dy: 4 }
);

/* 4 — Écho-Doppler des membres inférieurs */
SCENES["g-4"] = () => stage(
  bed(-14, -4) +
  legOnBed(-11, 11.1, 0) +
  cyl(10, 0, -8, .85, 1.1, FRAME) + cyl(15.6, 0, -8, .85, 1.1, FRAME) +
  cyl(10, 0, -3, .85, 1.1, FRAME) + cyl(15.6, 0, -3, .85, 1.1, FRAME) +
  box(9, 1.1, -9, 7.6, 10.4, 7.6, "#f2f8fd") +
  box(9, 11.5, -9, 7.6, 1.1, 7.6, "#e2edf7") +
  monitor(9.3, 12.6, -8.6, 7, 6.6) +
  /* sonde posée sur le mollet, câble qui remonte vers la machine */
  box(-2.6, 15.2, 2.9, 1.3, 2.6, 1.5, "#2f5478", { round: 1.5 }) +
  tube3([[-2, 17.6, 3.6], [4, 22, 1], [10.4, 13.4, -1.4]], "#5a7791", 1.6) +
  plant(-19, 9, .95),
  { dy: 4 }
);

/* 5 — Sclérothérapie échoguidée */
SCENES["g-5"] = () => {
  const syringe = (x, z) =>
    cyl(x, 5.4, z, .66, 3.6, WHITE) +
    cyl(x, 5.7, z, .54, 1.8, "#e0384a") +
    cyl(x, 9, z, .36, .55, "#c7d9ea") +
    tube3([[x, 9.6, z], [x, 10.6, z], [x, 11.4, z]], METAL, 1.1);
  return stage(
    bed(-16, -5) +
    legOnBed(-13, 11.1, -1) +
    trolley(9.5, 0) +
    box(9.8, 10.8, .3, 8.9, .6, 6.9, WHITE) +
    box(10.2, 11.4, .8, 8.1, .28, 5.9, "#f2cfd4") +
    syringe(11.9, 2.6) + syringe(13.7, 3.5) + syringe(15.5, 4.4) +
    box(10.4, 5.3, 5.4, 2.6, 2, 2.6, "#d6e3f0") +
    plant(-20, 8, .92),
    { dy: 4 }
  );
};

/* 6 — Laser endoveineux */
SCENES["g-6"] = () => stage(
  bed(-16, -4) +
  legOnBed(-13, 11.1, 0) +
  shadow(13, -2.5, 5.6, .19) +
  cyl(10.2, 0, -6, .9, 1.1, FRAME) + cyl(15.8, 0, -6, .9, 1.1, FRAME) +
  box(9.2, 1.1, -7, 7.6, 12.4, 7, "#f0f6fc") +
  box(9.2, 13.5, -7, 7.6, 1.2, 7, "#e0ebf6") +
  monitor(9.5, 14.7, -6.6, 7, 5.8, WHITE, "#0a3357", false) +
  cyl(13, 14.7, -1.6, 1.2, .8, "#e0384a") +
  `<circle cx="${P(13, 15.6, -1.6)[0].toFixed(2)}" cy="${P(13, 15.6, -1.6)[1].toFixed(2)}" r="3.4" fill="#e0384a" opacity=".3" filter="url(#soft)"/>` +
  tube3([[9.6, 9.4, -3], [4, 16, 6], [-2.6, 12.2, 2.6]], "#e0384a", 1.6) +
  `<circle cx="${P(-3.2, 12.2, 2.6)[0].toFixed(2)}" cy="${P(-3.2, 12.2, 2.6)[1].toFixed(2)}" r="4.6" fill="#e0384a" opacity=".34" filter="url(#soft)"/>` +
  plant(-21, 9, .92),
  { dy: 4 }
);

/* 7 — Bas & bandes de compression */
SCENES["g-7"] = () => {
  const roll = (x, z, c) => cyl(x, 5.6, z, 1.55, 2.7, c) + disc(x, 8.3, z, .55, shade(c, .78));
  return stage(
    shadow(-5, -2.5, 10.5, .19) +
    box(-15, 0, -8, 1.6, 16.4, 10, "#cfdeeb") + box(6.4, 0, -8, 1.6, 16.4, 10, "#cfdeeb") +
    box(-15, 4.4, -8, 23, 1.2, 10, "#f2f8fd") +
    box(-15, 10.4, -8, 23, 1.2, 10, "#f2f8fd") +
    box(-15, 16.4, -8, 23, 1.4, 10, "#e7f0f8") +
    roll(-11.6, -4.6, WHITE) + roll(-7.6, -4.6, "#e9f1f8") + roll(-3.6, -4.6, WHITE) +
    roll(-11.6, -.2, "#e0ebf6") + roll(-7.6, -.2, WHITE) +
    box(-2.2, 11.6, -6.4, 7.6, 3.4, 7, "#0d5590", { fl: 1.12 }) +
    box(-1.6, 15, -5.8, 6.4, .5, 5.8, "#1573b8") +
    shadow(14, 4, 4.4, .18) +
    disc(14, .2, 4, 3.5, "#b9cde0") +
    cyl(14, .2, 4, 3, 1, "#cfdeeb") +
    cyl(14, 1.2, 4, 2.6, 5.8, "#2f5478") +
    cyl(14, 7, 4, 2.15, 6.6, "#3d6a92") +
    cyl(14, 13.6, 4, 1.8, 3.4, "#4b7ba4") +
    disc(14, 17, 4, 1.8, "#6a97ba"),
    { dy: 4 }
  );
};

/* 8 — Salle de soins : plan-vasque + chariot + poubelle */
SCENES["g-8"] = () => stage(
  shadow(-7, -4, 10.5, .18) +
  box(-17, 0, -9, 20, 9.6, 9, "#eaf2fa") +
  box(-16.4, 1, -9.4, 8.6, 7.6, .5, "#d6e3f0", { fl: .9 }) +
  box(-7.2, 1, -9.4, 9.2, 7.6, .5, "#d6e3f0", { fl: .9 }) +
  box(-17, 9.6, -9.5, 20, 1.4, 9.5, "#f7fbfe") +
  disc(-11, 11, -4.6, 3.2, "#c1d5e7") +
  disc(-11, 10.8, -4.6, 2.6, "#a2bdd6") +
  tube3([[-11, 11, -8.4], [-11, 18.6, -8.4], [-8.4, 18, -6.6]], METAL, 2) +
  box(-4.6, 11, -8.8, 3.6, 1.2, 1.5, "#c7d9ea") +
  trolley(7.5, -6) +
  box(7.9, 10.8, -5.6, 3.8, 1.6, 3.4, WHITE) +
  cyl(10.3, 10.8, -1.4, 1, 2.8, "#e0384a") +
  shadow(15.5, 8, 3.2, .18) +
  cyl(15.5, 0, 8, 2.7, 6.6, "#cfdeeb") +
  disc(15.5, 6.6, 8, 2.7, "#aec6dc") +
  disc(15.5, 6.8, 8, 1.8, "#8aa9c4"),
  { dy: 4 }
);

/* 9 — Pansement d'ulcère de jambe */
SCENES["g-9"] = () => stage(
  shadow(-12.5, 4, 4.2, .19) +
  cyl(-12.5, 0, 4, .58, .9, FRAME) +
  cyl(-12.5, .9, 4, .95, 5.2, METAL) +
  cyl(-12.5, 6.1, 4, 3.4, 1.2, "#2f5478") +
  shadow(2, 6, 7.6, .18) +
  box(-4.4, 0, 2, 3.2, 6.8, 3.2, "#bfd2e4") + box(6.2, 0, 2, 3.2, 6.8, 3.2, "#bfd2e4") +
  box(-5.4, 6.8, .8, 15.6, 1.3, 5.6, "#ecf3fa") +
  cyl(-1.6, 8.1, 3.6, 2.5, 5, "#f0cdaa") +
  cyl(-1.6, 9.7, 3.6, 2.66, 1.25, WHITE) +
  cyl(-1.6, 10.95, 3.6, 2.72, 1.25, "#f4f9fd") +
  cyl(-1.6, 12.2, 3.6, 2.6, 1.25, WHITE) +
  sphere(-1.6, 13.45, 3.6, 2.4, "#f0cdaa") +
  box(1.5, 12.4, 1.9, 7, 3.9, 3.5, "#f0cdaa", { round: 2.2 }) +
  trolley(11, -6) +
  box(11.4, 10.8, -5.6, 3.5, 1.5, 3.3, WHITE) +
  box(15.4, 10.8, -5.2, 2.5, 2.3, 2.5, WHITE) +
  cyl(13.4, 10.8, -1.6, 1, 3, "#e0384a") +
  cyl(-11, 7.3, 3.2, 1.35, 2.3, WHITE) +
  disc(-11, 9.6, 3.2, .5, "#d6e3f0"),
  { dy: 4 }
);

/* ---------- écriture ---------- */
let n = 0;
for (const [name, fn] of Object.entries(SCENES)) {
  gid = 0; BB = null;
  const svg = fn();
  fs.writeFileSync(path.join(OUT, name + ".svg"), svg, "utf8");
  n++;
  console.log(name.padEnd(6) + (svg.length / 1024).toFixed(1).padStart(6) + " Ko");
}
console.log("\n" + n + " scenes 3D ecrites dans " + OUT);
