/* =========================================================================
   Référencement (SEO) et versions anglaise / arabe du site.

   1. Régénère les pages de service (tools/gen-pages-services.js).
   2. Pour chaque page française (index.html + service-*.html, à la racine),
      écrit en/<page> et ar/<page> : textes traduits en dur depuis
      assets/js/i18n.js, <html lang/dir>, chemins ../assets.
   3. Ajoute dans le <head> de chaque page (FR, EN, AR) le bloc SEO :
      canonical, hreflang, Open Graph, Twitter, données structurées
      JSON-LD (cabinet + FAQ sur l'accueil, acte médical + fil d'Ariane
      sur les pages de service).
   4. Écrit sitemap.xml et robots.txt.

   Le domaine et les coordonnées sont dans tools/site.config.json.
   Ne jamais retoucher à la main en/ et ar/ : ils sont réécrits ici.

   Usage :  node tools/build-langs.js
   À relancer après toute modification d'index.html ou d'i18n.js.
   ========================================================================= */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "site.config.json"), "utf8"));
const DOMAIN = CFG.domain.replace(/\/+$/, "");
const LANGS = ["fr", "en", "ar"];
const LOCALE = { fr: "fr_TN", en: "en_US", ar: "ar_TN" };
const CRLF = String.fromCharCode(13, 10), LF = String.fromCharCode(10);

/* ---------- 1. pages de service ---------- */
execFileSync(process.execPath, [path.join(__dirname, "gen-pages-services.js")], { stdio: "inherit" });

global.window = {};
require(path.join(ROOT, "assets", "js", "i18n.js"));
const DICT = global.window.I18N;

const PAGES = ["index.html"].concat(
  fs.readdirSync(ROOT).filter((f) => /^service-[\w-]+\.html$/.test(f)).sort());

/* ---------- outils ---------- */
const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const strip = (s) => decode(String(s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const escText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const tr = (lang, key) => {
  const pack = DICT[lang] || {};
  return Object.prototype.hasOwnProperty.call(pack, key) ? pack[key] : (DICT.fr[key] || "");
};
const getAttr = (tag, name) => {
  const m = tag.match(new RegExp("\\s" + name + '="([^"]*)"'));
  return m ? m[1] : null;
};
const setAttr = (tag, name, value) => {
  const re = new RegExp("(\\s" + name + '=")[^"]*(")');
  return re.test(tag) ? tag.replace(re, "$1" + value + "$2")
    : tag.replace(/\s*(\/?)>$/, ` ${name}="${value}"$1>`);
};
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const folder = (lang) => (lang === "fr" ? "" : lang + "/");
const pageUrl = (lang, page) => DOMAIN + "/" + folder(lang) + (page === "index.html" ? "" : page);

/* Fin de l'élément ouvert en `from` (après la balise ouvrante), en tenant
   compte des balises de même nom imbriquées. */
function closeIndex(html, tag, from) {
  const re = new RegExp("<(/?)" + tag + "(?=[\\s>/])[^>]*>", "gi");
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) { return m.index; }
  }
  throw new Error("balise non fermée : <" + tag + ">");
}

/* Même résultat que applyLang() de main.js, mais écrit dans le HTML. */
function translate(html, lang) {
  const re = /<([a-zA-Z][\w-]*)(\s[^>]*)?>/g;
  let out = "", last = 0, m;
  while ((m = re.exec(html))) {
    const tag = m[0], name = m[1].toLowerCase(), key = getAttr(tag, "data-i18n");
    if (!key) { continue; }
    const value = tr(lang, key);
    if (!value) { continue; }
    const attr = getAttr(tag, "data-i18n-attr");
    if (attr) {
      out += html.slice(last, m.index) + setAttr(tag, attr, escAttr(strip(value)));
      last = re.lastIndex;
      continue;
    }
    const start = re.lastIndex, end = closeIndex(html, name, start);
    let inner;
    if (name === "title") {
      const suffix = getAttr(tag, "data-i18n-suffix");
      inner = escText(strip(value) + (suffix ? " — " + strip(tr(lang, suffix)) : ""));
    } else {
      inner = /[<&]/.test(value) ? value : escText(value);
    }
    out += html.slice(last, start) + inner;
    last = end;
    re.lastIndex = end;
  }
  return out + html.slice(last);
}

/* ---------- bloc SEO du <head> ---------- */
const SEO_START = "<!-- SEO:début (tools/build-langs.js) -->";
const SEO_END = "<!-- SEO:fin -->";
const ld = (obj) => '<script type="application/ld+json">' +
  JSON.stringify(obj, null, 1).replace(/<\//g, "<\\/") + "</script>";

const serviceNum = (page) => {
  const m = fs.readFileSync(path.join(ROOT, page), "utf8").match(/<title data-i18n="svc\.(\d+)\.t"/);
  return m ? +m[1] : 0;
};
const SVC = {};
PAGES.slice(1).forEach((p) => { SVC[p] = serviceNum(p); });

const FAQ_KEYS = (fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
  .match(/data-i18n="faq\.[\w-]+\.q"/g) || []).map((s) => s.slice(11, -3));

function physician(lang) {
  return {
    "@type": "Physician",
    "@id": DOMAIN + "/#cabinet",
    name: strip(tr(lang, "brand.name")),
    description: strip(tr(lang, "meta.desc")),
    url: pageUrl(lang, "index.html"),
    image: DOMAIN + "/" + CFG.image,
    logo: DOMAIN + "/assets/img/logo.png",
    telephone: CFG.phones[0],
    address: Object.assign({ "@type": "PostalAddress" }, CFG.address),
    openingHoursSpecification: CFG.hours.map((h) => ({
      "@type": "OpeningHoursSpecification", dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    areaServed: "Sfax",
    sameAs: [CFG.facebook, CFG.medtn],
    availableService: PAGES.slice(1).map((p) => ({
      "@type": "MedicalProcedure", name: strip(tr(lang, `svc.${SVC[p]}.t`)), url: pageUrl(lang, p) })),
  };
}

function seoBlock(lang, page) {
  const n = SVC[page];
  const title = n ? strip(tr(lang, `svc.${n}.t`)) + " — " + strip(tr(lang, "brand.name")) : strip(tr(lang, "meta.title"));
  const desc = strip(tr(lang, n ? `svc.${n}.d` : "meta.desc"));
  const url = pageUrl(lang, page);
  const img = DOMAIN + "/" + (n ? `assets/img/svc-${n}.svg` : CFG.image);
  const ogImg = DOMAIN + "/" + CFG.image; // les réseaux sociaux n'affichent pas les SVG

  const lines = [
    SEO_START,
    `<link rel="canonical" href="${url}">`,
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${pageUrl(l, page)}">`),
    `<link rel="alternate" hreflang="x-default" href="${pageUrl("fr", page)}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escAttr(strip(tr(lang, "brand.name")))}">`,
    `<meta property="og:title" content="${escAttr(title)}">`,
    `<meta property="og:description" content="${escAttr(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${ogImg}">`,
    `<meta property="og:locale" content="${LOCALE[lang]}">`,
    ...LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${LOCALE[l]}">`),
    `<meta name="twitter:card" content="summary_large_image">`,
  ];

  if (!n) {
    lines.push(ld({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", "@id": DOMAIN + "/#site", url: pageUrl(lang, page),
          name: strip(tr(lang, "brand.name")), inLanguage: lang },
        physician(lang),
        { "@type": "FAQPage", inLanguage: lang,
          mainEntity: FAQ_KEYS.map((k) => ({
            "@type": "Question", name: strip(tr(lang, k + ".q")),
            acceptedAnswer: { "@type": "Answer", text: strip(tr(lang, k + ".a")) } })) },
      ],
    }));
  } else {
    lines.push(ld({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "MedicalWebPage", url, name: title, description: desc, inLanguage: lang,
          about: { "@type": "MedicalProcedure", name: strip(tr(lang, `svc.${n}.t`)), description: desc, image: img },
          publisher: { "@id": DOMAIN + "/#cabinet" } },
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: strip(tr(lang, "nav.home")), item: pageUrl(lang, "index.html") },
          { "@type": "ListItem", position: 2, name: strip(tr(lang, "nav.services")), item: pageUrl(lang, "index.html") + "#services" },
          { "@type": "ListItem", position: 3, name: strip(tr(lang, `svc.${n}.t`)), item: url },
        ] },
        physician(lang),
      ],
    }));
  }
  lines.push(SEO_END);
  return lines.join(LF);
}

/* ---------- 2 + 3. pages ---------- */
const writePage = (file, html) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html.split(CRLF).join(LF).split(LF).join(CRLF));
};

let count = 0;
for (const page of PAGES) {
  const src = fs.readFileSync(path.join(ROOT, page), "utf8").split(CRLF).join(LF)
    .replace(new RegExp(LF + "?" + reEsc(SEO_START) + "[\\s\\S]*?" + reEsc(SEO_END), "g"), "");

  for (const lang of LANGS) {
    let html = lang === "fr" ? src : translate(src, lang);
    const up = lang === "fr" ? "" : "../";

    html = html.replace(/<html[^>]*>/,
      `<html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}" data-static-lang="${lang}" data-root="${up}">`);
    if (lang === "ar") {
      html = html.replace(/<body([^>]*)>/, (tag, attrs) => /class="/.test(attrs)
        ? tag.replace(/class="([^"]*)"/, (_, c) => `class="${c.split(" ").filter((x) => x !== "is-ar").concat("is-ar").join(" ")}"`)
        : `<body${attrs} class="is-ar">`);
    }
    if (up) { html = html.replace(/(\s(?:src|href|data-img)=")assets\//g, "$1../assets/"); }

    // les boutons de langue mènent à la page équivalente dans l'autre langue
    html = html.replace(/<button type="button" class="lang-btn[^"]*" data-lang="(\w+)"[^>]*>/g, (tag, l) =>
      setAttr(tag, "data-href", up + folder(l) + page));

    html = html.replace("</head>", seoBlock(lang, page) + LF + "</head>");
    writePage(path.join(ROOT, folder(lang), page), html);
    count++;
  }
}

/* ---------- 4. sitemap.xml + robots.txt ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = [];
for (const page of PAGES) {
  for (const lang of LANGS) {
    urls.push([
      "  <url>",
      `    <loc>${pageUrl(lang, page)}</loc>`,
      ...LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(l, page)}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl("fr", page)}"/>`,
      `    <lastmod>${today}</lastmod>`,
      `    <priority>${page === "index.html" ? "1.0" : "0.8"}</priority>`,
      "  </url>",
    ].join(LF));
  }
}
writePage(path.join(ROOT, "sitemap.xml"), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...urls,
  "</urlset>", ""].join(LF));
writePage(path.join(ROOT, "robots.txt"),
  ["User-agent: *", "Allow: /", "", `Sitemap: ${DOMAIN}/sitemap.xml`, ""].join(LF));

console.log(`${count} pages écrites (${PAGES.length} × ${LANGS.length} langues), sitemap.xml, robots.txt`);
if (CFG.domainIsPlaceholder) {
  console.warn(`ATTENTION : domaine provisoire (${DOMAIN}). Mettez le vrai domaine dans tools/site.config.json,` +
    ` passez domainIsPlaceholder à false, puis relancez ce script avant la mise en ligne.`);
}
