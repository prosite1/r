/* =========================================================================
   Génère une page par service (service-<slug>.html, à la racine du site)
   à partir d'index.html et du dictionnaire français d'assets/js/i18n.js.

   Ce qui est repris d'index.html : <head>, en-tête, pied de page, icône de
   chaque carte de service. Les liens « #section » deviennent
   « index.html#section ». Le texte de repli (sans JavaScript) est le
   français ; main.js traduit ensuite comme sur l'accueil.

   Le script met aussi index.html à jour : les pastilles de l'accueil
   pointent vers ces pages, et chaque carte de service reçoit data-page
   (lien « Voir la page du service » de la fenêtre d'illustration).

   Usage :  node tools/gen-pages-services.js
   À relancer après toute modification de l'en-tête, du pied de page ou
   des textes svc.N.* dans i18n.js.
   ========================================================================= */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const HTML = path.join(ROOT, "index.html");

global.window = {};
require(path.join(ROOT, "assets", "js", "i18n.js"));
const FR = global.window.I18N.fr;

/* ordre = numéro du service (svc.N.*, svc-N.svg) */
const SLUGS = [
  "consultation-angiologie",
  "echo-doppler",
  "sclerotherapie",
  "laser-radiofrequence",
  "insuffisance-veineuse",
  "maladie-thrombo-embolique",
  "arteriopathie-aomi",
  "pressotherapie-compression",
  "ulceres-plaies",
  "phlebologie-esthetique",
];
const pageOf = (n) => "service-" + SLUGS[n - 1] + ".html";

let index = fs.readFileSync(HTML, "utf8");

/* ---------- 1. index.html : pastilles et cartes ---------- */
index = index.replace(
  /<a href="[^"]*" data-svc="(\d+)"/g,
  (_, n) => `<a href="${pageOf(+n)}" data-svc="${n}"`
);
index = index.replace(
  /<article class="card reveal" data-img="assets\/img\/svc-(\d+)\.svg"(?: data-page="[^"]*")?>/g,
  (_, n) => `<article class="card reveal" data-img="assets/img/svc-${n}.svg" data-page="${pageOf(+n)}">`
);
fs.writeFileSync(HTML, index);

/* ---------- 2. morceaux communs ---------- */
const cut = (from, to) => {
  const a = index.indexOf(from), b = index.indexOf(to, a);
  if (a < 0 || b < 0) { throw new Error("introuvable : " + from + " … " + to); }
  return index.slice(a, b + to.length);
};
const toHome = (s) => s
  .replace(/href="#accueil"/g, 'href="index.html"')
  .replace(/href="#([a-z][\w-]*)"/g, 'href="index.html#$1"');

const head = cut("<!DOCTYPE html>", "</head>");
const header = toHome(cut('<header class="site-header"', "</header>"))
  .replace('href="index.html#services" class="nav-link"', 'href="index.html#services" class="nav-link is-active" aria-current="page"');
const footer = toHome(cut('<footer class="site-footer">', "</footer>"));
const fab = toHome(cut('<a class="fab"', "</a>"));
const callBtn = (index.match(/<a class="btn-call"[\s\S]*?<\/strong>\s*<\/span>\s*<\/a>/) || [""])[0];

const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
const attr = (s) => strip(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

function iconOf(n) {
  const m = index.match(new RegExp(
    `data-img="assets/img/svc-${n}\\.svg"[^>]*>\\s*<span class="card-icon" aria-hidden="true">([\\s\\S]*?)</span>`));
  return m ? m[1].trim() : "";
}

/* ---------- 3. une page par service ---------- */
for (let n = 1; n <= SLUGS.length; n++) {
  const T = FR[`svc.${n}.t`], D = FR[`svc.${n}.d`];

  const pageHead = head
    .replace(/<title[^>]*>[\s\S]*?<\/title>/,
      `<title data-i18n="svc.${n}.t" data-i18n-suffix="brand.name">${strip(T)} — ${strip(FR["brand.name"])}</title>`)
    .replace(/<meta name="description"[^>]*>/,
      `<meta name="description" content="${attr(D)}" data-i18n="svc.${n}.d" data-i18n-attr="content">`);

  const others = SLUGS.map((_, i) => i + 1).filter((k) => k !== n).map((k) =>
    `        <li><a href="${pageOf(k)}" data-i18n="svc.${k}.t">${FR[`svc.${k}.t`]}</a></li>`).join("\n");

  const html = `${pageHead}
<body class="page-service">

<a class="skip-link" href="#main" data-i18n="a11y.skip">${FR["a11y.skip"]}</a>

<!-- ============ HEADER (copié d'index.html par tools/gen-pages-services.js) ============ -->
${header}

<main id="main">

<section class="section svc-page">
  <div class="hero-bg" aria-hidden="true">
    <span class="orb orb-1"></span>
    <span class="orb orb-2"></span>
  </div>

  <div class="container">
    <a class="btn btn-ghost btn-sm btn-home reveal" href="index.html">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span data-i18n="svcpage.home">${FR["svcpage.home"]}</span>
    </a>

    <nav class="crumbs reveal" aria-label="Fil d'Ariane">
      <a href="index.html" data-i18n="nav.home">${FR["nav.home"]}</a>
      <span aria-hidden="true">›</span>
      <a href="index.html#services" data-i18n="nav.services">${FR["nav.services"]}</a>
      <span aria-hidden="true">›</span>
      <span aria-current="page" data-i18n="svc.${n}.t">${T}</span>
    </nav>

    <!-- titre sur toute la largeur, au-dessus des deux colonnes : il tient sur une ligne -->
    <div class="svc-title">
      <span class="card-icon svc-hero-icon reveal" aria-hidden="true">
        ${iconOf(n)}
      </span>
      <div>
        <h1 class="reveal"><span class="hl" data-i18n="svc.${n}.t">${T}</span></h1>
      </div>
    </div>

    <div class="svc-hero">
      <div class="svc-hero-text">
        <p class="lead reveal" data-i18n="svc.${n}.d">${D}</p>

        <div class="hero-actions reveal">
          <a class="btn btn-primary btn-lg" href="index.html#contact" data-i18n="cta.appointment">${FR["cta.appointment"]}</a>
          ${callBtn}
        </div>
        <p class="svc-ask reveal" data-i18n="svcpage.ask">${FR["svcpage.ask"]}</p>
      </div>

      <figure class="svc-figure reveal">
        <img src="assets/img/svc-${n}.svg" alt="" width="1200" height="750">
      </figure>
    </div>
  </div>
</section>

<section class="section section-alt svc-others">
  <div class="container">
    <header class="section-head reveal">
      <h2 data-i18n="svcpage.others">${FR["svcpage.others"]}</h2>
    </header>
    <ul class="hero-services svc-others-list reveal" aria-label="${attr(FR["svcpage.others"])}" data-i18n="svcpage.others" data-i18n-attr="aria-label">
${others}
    </ul>
    <p class="svc-back reveal">
      <a class="btn btn-primary btn-home" href="index.html">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span data-i18n="svcpage.home">${FR["svcpage.home"]}</span>
      </a>
      <a class="btn btn-ghost" href="index.html#services" data-i18n="svcpage.back">${FR["svcpage.back"]}</a>
    </p>
  </div>
</section>

</main>

${footer}

${fab}

<script src="assets/js/i18n.js"></script>
<script src="assets/js/main.js"></script>
</body>
</html>
`;
  // fins de ligne Windows, comme index.html
  const CRLF = String.fromCharCode(13, 10), LF = String.fromCharCode(10);
  fs.writeFileSync(path.join(ROOT, pageOf(n)), html.split(CRLF).join(LF).split(LF).join(CRLF));
  console.log("écrit :", pageOf(n));
}
