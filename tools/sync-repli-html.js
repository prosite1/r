/* =========================================================================
   Resynchronise le texte de repli d'index.html depuis le dictionnaire
   français d'assets/js/i18n.js.

   Pourquoi : le HTML contient le français en dur pour rester lisible sans
   JavaScript (et pour les moteurs de recherche). Si on ne touche qu'au
   dictionnaire, les deux divergent. Ce script rétablit l'accord.

   Usage :  node tools/sync-repli-html.js          (écrit)
            node tools/sync-repli-html.js --dry    (montre sans écrire)
   ========================================================================= */
const fs = require("fs");
const path = require("path");

const ROOT = path.join("C:", "Users", "afef", "Desktop", "newTest");
const HTML = path.join(ROOT, "index.html");
const DRY = process.argv.includes("--dry");

global.window = {};
require(path.join(ROOT, "assets", "js", "i18n.js"));
const FR = global.window.I18N.fr;

let html = fs.readFileSync(HTML, "utf8");
const changed = [], skipped = [], missing = [];

/* --- 1. éléments qui portent data-i18n-attr : on met à jour l'attribut visé --- */
html = html.replace(
  /<(\w+)([^>]*?)data-i18n="([^"]+)"([^>]*?)data-i18n-attr="([^"]+)"([^>]*)>/g,
  (whole, tag, a, key, b, attr, c) => {
    if (!(key in FR)) { missing.push(key); return whole; }
    const value = FR[key].replace(/<[^>]+>/g, "");        // l'attribut ne prend pas de balise
    const rest = a + b + c;
    const re = new RegExp('(\\s' + attr + '=")[^"]*(")');
    const updated = re.test(rest)
      ? rest.replace(re, '$1' + value.replace(/"/g, "&quot;") + '$2')
      : rest + ' ' + attr + '="' + value.replace(/"/g, "&quot;") + '"';
    changed.push(key + ' (@' + attr + ')');
    return '<' + tag + updated.replace(/\s+$/, "") +
      ' data-i18n="' + key + '" data-i18n-attr="' + attr + '">';
  }
);

/* --- 2. éléments texte : on remplace le contenu, sauf s'il contient des balises
         que la traduction ne prévoit pas (on ne veut pas effacer une icône) --- */
html = html.replace(
  /<(\w+)([^>]*\sdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
  (whole, tag, attrs, key, body) => {
    if (attrs.includes("data-i18n-attr")) { return whole; }
    if (!(key in FR)) { missing.push(key); return whole; }

    const bodyHasTags = /<\w/.test(body);
    const valueHasTags = /<\w/.test(FR[key]);
    if (bodyHasTags && !valueHasTags) { skipped.push(key + ' (contenu balisé)'); return whole; }

    if (body === FR[key]) { return whole; }
    changed.push(key);
    return '<' + tag + attrs + '>' + FR[key] + '</' + tag + '>';
  }
);

if (missing.length) { console.log("clés absentes du dictionnaire :", [...new Set(missing)].join(", ")); }
if (skipped.length) { console.log("ignorées :", [...new Set(skipped)].join(", ")); }

console.log((DRY ? "[essai] " : "") + "textes de repli mis à jour : " + changed.length);
changed.forEach(k => console.log("   " + k));

if (!DRY) { fs.writeFileSync(HTML, html, "utf8"); }
