/* =========================================================
   Interactions du site — vanilla JS, aucune dépendance
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     À RENSEIGNER : adresse de réception du formulaire de contact.
     Laissée vide car l'e-mail du cabinet n'est pas public — tant qu'elle
     l'est, le formulaire invite à téléphoner au lieu d'ouvrir un message
     vers une adresse qui n'existe pas.
     --------------------------------------------------------------------- */
  var CONTACT_EMAIL = "";
  var CONTACT_PHONE = "+216 74 404 242";

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =======================================================
     1. LANGUES (FR / EN / AR) + RTL
     ======================================================= */
  var DICT = window.I18N || {};
  var LANGS = Object.keys(DICT);
  var STORE_KEY = "cabinet-lang";
  var currentLang = "fr";

  // définis plus bas : la pilule du menu doit être replacée après chaque
  // traduction (§4), et les cartes de service renommées (§9 bis).
  var refreshPill = null;
  var relabel = null;

  function t(key) {
    var pack = DICT[currentLang] || {};
    return Object.prototype.hasOwnProperty.call(pack, key) ? pack[key] : (DICT.fr && DICT.fr[key]) || "";
  }

  function setText(el, value) {
    var attr = el.getAttribute("data-i18n-attr");
    if (attr) { el.setAttribute(attr, stripTags(value)); return; }
    if (/[<&]/.test(value)) { el.innerHTML = value; } else { el.textContent = value; }
  }

  function stripTags(s) {
    var d = document.createElement("div");
    d.innerHTML = s;
    return d.textContent || "";
  }

  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) { lang = "fr"; }
    currentLang = lang;

    var isAr = lang === "ar";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", isAr ? "rtl" : "ltr");
    document.body.classList.toggle("is-ar", isAr);

    $$("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var val = t(key);
      if (val) { setText(el, val); }
    });

    // <title> : textContent uniquement ; les pages de service ajoutent le nom du cabinet
    var titleEl = $("title[data-i18n]");
    if (titleEl) {
      var suffix = titleEl.getAttribute("data-i18n-suffix");
      document.title = stripTags(t(titleEl.getAttribute("data-i18n"))) + (suffix ? " — " + stripTags(t(suffix)) : "");
    }

    $$(".lang-btn").forEach(function (b) {
      var on = b.getAttribute("data-lang") === lang;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* mode privé */ }

    if (refreshPill) { refreshPill(); }
    if (relabel) { relabel(); }
  }

  function initialLang() {
    // pages générées par tools/build-langs.js : la langue est celle de l'URL
    var fixed = document.documentElement.getAttribute("data-static-lang");
    if (fixed && LANGS.indexOf(fixed) !== -1) { return fixed; }
    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) { /* noop */ }
    if (stored && LANGS.indexOf(stored) !== -1) { return stored; }
    var nav = (navigator.language || "fr").slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) !== -1 ? nav : "fr";
  }

  $$(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var lang = btn.getAttribute("data-lang");
      var href = btn.getAttribute("data-href");
      if (href && lang !== currentLang) {
        try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* mode privé */ }
        location.href = href;
        return;
      }
      applyLang(lang);
    });
  });

  applyLang(initialLang());

  /* =======================================================
     1 bis. LOGO
     Si assets/img/logo.svg (ou .png / .webp) existe, il remplace
     le pictogramme dessiné, dans l'en-tête comme dans le pied de
     page. Aucun fichier déposé = le pictogramme reste, et surtout
     jamais d'image cassée : on teste le chargement avant d'insérer.
     ======================================================= */
  (function () {
    var marks = $$(".brand-mark");
    if (!marks.length) { return; }

    var root = document.documentElement.getAttribute("data-root") || "";
    var candidates = [root + "assets/img/logo.svg", root + "assets/img/logo.png", root + "assets/img/logo.webp"];
    var i = 0;

    function tryNext() {
      if (i >= candidates.length) { return; }
      var src = candidates[i++];
      var probe = new Image();

      probe.onload = function () {
        marks.forEach(function (mark) {
          var img = document.createElement("img");
          img.className = "brand-logo";
          img.src = src;
          img.alt = "";
          mark.textContent = "";
          mark.appendChild(img);
        });
        document.body.classList.add("has-logo");
      };

      probe.onerror = tryNext;
      probe.src = src;
    }

    tryNext();
  })();

  /* =======================================================
     2. HEADER : ombre au défilement + barre de progression
     ======================================================= */
  var header = $("#header");
  var progress = $("#progress");

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (header) { header.classList.toggle("is-stuck", y > 8); }
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
    spy(y);
  }

  /* =======================================================
     3. MENU MOBILE
     ======================================================= */
  var burger = $("#burger");
  var nav = $("#nav");

  function closeMenu() {
    if (!nav || !burger) { return; }
    nav.classList.remove("is-open");
    burger.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
  }

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Fermeture au clic sur un lien + défilement fluide garanti
  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id === "#" || id.length < 2) { return; }
      var target = document.getElementById(id.slice(1));
      if (!target) { return; }
      e.preventDefault();
      closeMenu();
      var top = target.getBoundingClientRect().top + window.pageYOffset - (header ? header.offsetHeight - 1 : 0);
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    });
  });

  document.addEventListener("click", function (e) {
    if (!nav || !nav.classList.contains("is-open")) { return; }
    if (nav.contains(e.target) || (burger && burger.contains(e.target))) { return; }
    closeMenu();
  });

  /* =======================================================
     4. NAVIGATION ACTIVE (scroll-spy)
     ======================================================= */
  var navLinks = $$(".nav-link");
  var sections = navLinks
    .map(function (l) { return document.getElementById(l.getAttribute("href").slice(1)); })
    .filter(Boolean);

  function spy(y) {
    if (!sections.length) { return; }
    var offset = (header ? header.offsetHeight : 70) + 40;
    var index = 0;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop - offset <= y) { index = i; }
    }
    // dernière section quand on atteint le bas de page
    if (y + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      index = sections.length - 1;
    }

    var changed = false;
    navLinks.forEach(function (l, i) {
      var on = i === index;
      if (l.classList.contains("is-active") !== on) { changed = true; }
      l.classList.toggle("is-active", on);
    });
    if (changed && refreshPill) { refreshPill(); }
  }

  /* --- pilule glissante du menu (bureau) --- */
  var navCapsule = $(".nav-capsule");
  var pill = $(".nav-pill");

  if (navCapsule && pill && navLinks.length) {
    var pinned = null;   // entrée sous laquelle la pilule se repose (la section active)

    function placePill(link) {
      if (!link) { return; }
      // masquée dans le tiroir mobile : la pilule n'a pas de sens en colonne
      if (getComputedStyle(pill).display === "none") { return; }

      var lr = link.getBoundingClientRect();
      var nr = navCapsule.getBoundingClientRect();
      var start = document.documentElement.dir === "rtl"
        ? nr.right - lr.right
        : lr.left - nr.left;

      pill.style.width = lr.width + "px";
      pill.style.transform = "translateX(" + (document.documentElement.dir === "rtl" ? -start : start) + "px)";
      pill.classList.add("is-ready");

      navLinks.forEach(function (l) { l.classList.toggle("is-on", l === link); });
    }

    refreshPill = function () {
      pinned = navLinks.filter(function (l) { return l.classList.contains("is-active"); })[0] || navLinks[0];
      placePill(pinned);
    };

    navLinks.forEach(function (link) {
      link.addEventListener("mouseenter", function () { placePill(link); });
      link.addEventListener("focus", function () { placePill(link); });
    });
    navCapsule.addEventListener("mouseleave", function () { placePill(pinned); });
    navCapsule.addEventListener("focusout", function () { placePill(pinned); });

    // indices pour la cascade d'ouverture du tiroir
    navLinks.forEach(function (l, i) {
      var li = l.parentElement;
      if (li) { li.style.setProperty("--i", i); }
    });

    refreshPill();
    window.addEventListener("resize", refreshPill);
    // les polices Google arrivent après le premier rendu : les largeurs changent
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refreshPill);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* =======================================================
     5. APPARITION AU DÉFILEMENT
     ======================================================= */
  var revealables = $$(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    // délai en cascade entre voisins d'un même conteneur
    revealables.forEach(function (el) {
      var siblings = $$(".reveal", el.parentElement);
      var i = siblings.indexOf(el);
      if (i > 0 && siblings.length > 1) {
        el.style.transitionDelay = Math.min(i * 70, 350) + "ms";
      }
    });

    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealables.forEach(function (el) { revObs.observe(el); });
  }

  /* =======================================================
     6. COMPTEURS ANIMÉS
     ======================================================= */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduceMotion) { el.textContent = target.toLocaleString(currentLang); return; }
    var start = performance.now();
    var dur = 1400;
    function step(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString(currentLang);
      if (p < 1) { requestAnimationFrame(step); }
    }
    requestAnimationFrame(step);
  }

  var counters = $$(".count");
  if (counters.length && "IntersectionObserver" in window) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); cObs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cObs.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  /* =======================================================
     7. FAQ — un seul volet ouvert à la fois
     ======================================================= */
  var faqItems = $$(".faq-item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) { return; }
      faqItems.forEach(function (other) {
        if (other !== item) { other.open = false; }
      });
    });
  });

  /* =======================================================
     8. GALERIE : filtres + visionneuse
     ======================================================= */
  var galleryItems = $$(".g-item");
  var filters = $$(".filter");
  var baNote = $(".g-ba-note");

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filters.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var cat = btn.getAttribute("data-filter");
      // les avant / après n'ont leur place que dans leur propre onglet
      if (baNote) { baNote.hidden = cat !== "ba"; }

      galleryItems.forEach(function (item) {
        var itemCat = item.getAttribute("data-cat");
        var match = cat === "all" ? itemCat !== "ba" : itemCat === cat;
        item.classList.add("is-filtering");
        setTimeout(function () {
          item.classList.toggle("is-hidden", !match);
          item.classList.remove("is-filtering");
        }, 180);
      });
    });
  });

  var lightbox = $("#lightbox");
  var lbImg = $("#lbImg");
  var lbCap = $("#lbCap");
  var lbPair = $("#lbPair");
  var lbIndex = 0;

  function visibleItems() {
    return galleryItems.filter(function (i) { return !i.classList.contains("is-hidden"); });
  }

  function openLightbox(index) {
    var items = visibleItems();
    if (!items.length || !lightbox) { return; }
    lbIndex = (index + items.length) % items.length;
    var fig = items[lbIndex];
    var img = $("img", fig);
    var cap = $("figcaption", fig);
    // paire avant / après : les deux photos côte à côte, en grand
    var pair = $(".g-ba-pair", fig);
    lbImg.hidden = !!pair;
    if (lbPair) {
      lbPair.hidden = !pair;
      lbPair.innerHTML = pair ? pair.innerHTML : "";
      $$("img", lbPair).forEach(function (i) { i.removeAttribute("loading"); i.removeAttribute("style"); });
    }
    lbImg.setAttribute("src", img && !pair ? img.getAttribute("src") : "");
    lbCap.textContent = cap ? cap.textContent : "";
    lightbox.hidden = false;
    document.body.classList.add("no-scroll");
    var close = $("#lbClose");
    if (close) { close.focus(); }
  }

  function closeLightbox() {
    if (!lightbox) { return; }
    lightbox.hidden = true;
    document.body.classList.remove("no-scroll");
  }

  galleryItems.forEach(function (fig) {
    fig.addEventListener("click", function () {
      openLightbox(visibleItems().indexOf(fig));
    });
  });

  var lbClose = $("#lbClose");
  var lbPrev = $("#lbPrev");
  var lbNext = $("#lbNext");
  if (lbClose) { lbClose.addEventListener("click", closeLightbox); }
  if (lbPrev) { lbPrev.addEventListener("click", function () { openLightbox(lbIndex - 1); }); }
  if (lbNext) { lbNext.addEventListener("click", function () { openLightbox(lbIndex + 1); }); }
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.classList.contains("lb-figure")) { closeLightbox(); }
    });
  }

  /* =======================================================
     9. VIDÉOS — lecture dans une fenêtre modale
     ======================================================= */
  var videoModal = $("#videoModal");
  var vmFrame = $("#vmFrame");

  /* Accepte l'identifiant seul ou n'importe quelle forme de lien YouTube :
     watch?v=…, youtu.be/…, /shorts/…, /embed/…, /live/…
     Renvoie null si rien d'exploitable, pour afficher le message d'attente. */
  function youtubeId(raw) {
    if (!raw) { return null; }
    var v = String(raw).trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) { return v; }

    var m = v.match(/[?&]v=([A-Za-z0-9_-]{11})/)
         || v.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
         || v.match(/\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function openVideo(raw) {
    if (!videoModal || !vmFrame) { return; }
    var id = youtubeId(raw);
    if (id) {
      vmFrame.innerHTML =
        '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
        '?rel=0&autoplay=1" title="Video" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    } else {
      vmFrame.innerHTML = '<div class="vm-placeholder"><p>' + t("video.soon") + "</p></div>";
    }
    videoModal.hidden = false;
    document.body.classList.add("no-scroll");
    var c = $("#vmClose");
    if (c) { c.focus(); }
  }

  function closeVideo() {
    if (!videoModal || !vmFrame) { return; }
    videoModal.hidden = true;
    vmFrame.innerHTML = "";
    document.body.classList.remove("no-scroll");
  }

  $$(".video-card").forEach(function (card) {
    card.addEventListener("click", function () {
      openVideo(card.getAttribute("data-video"));
    });
  });

  var vmClose = $("#vmClose");
  if (vmClose) { vmClose.addEventListener("click", closeVideo); }
  if (videoModal) {
    videoModal.addEventListener("click", function (e) {
      if (e.target === videoModal) { closeVideo(); }
    });
  }

  /* =======================================================
     9 bis. FENÊTRE D'ILLUSTRATION D'UN SERVICE
     Un clic sur une carte ouvre son schéma, avec le titre et
     le texte repris de la carte : rien à maintenir en double.
     ======================================================= */
  var serviceModal = $("#serviceModal");
  var smImg = $("#smImg");
  var smTitle = $("#smTitle");
  var smText = $("#smText");
  var lastCard = null;

  function openService(card) {
    if (!serviceModal || !card) { return; }
    var h3 = $("h3", card), p = $("p", card);

    smImg.setAttribute("src", card.getAttribute("data-img") || "");
    smTitle.textContent = h3 ? h3.textContent.trim() : "";
    smText.textContent = p ? p.textContent.trim() : "";
    var smPage = $("#smPage");
    if (smPage) {
      var page = card.getAttribute("data-page");
      smPage.hidden = !page;
      if (page) { smPage.setAttribute("href", page); }
    }

    lastCard = $(".card-open", card);
    serviceModal.hidden = false;
    document.body.classList.add("no-scroll");
    var c = $("#smClose");
    if (c) { c.focus(); }
  }

  function closeService() {
    if (!serviceModal || serviceModal.hidden) { return; }
    serviceModal.hidden = true;
    document.body.classList.remove("no-scroll");
    if (lastCard) { lastCard.focus(); lastCard = null; }   // on rend le focus à la carte
  }

  $$(".card-open").forEach(function (btn) {
    btn.addEventListener("click", function () { openService(btn.closest(".card")); });
  });

  var smClose = $("#smClose");
  if (smClose) { smClose.addEventListener("click", closeService); }
  if (serviceModal) {
    serviceModal.addEventListener("click", function (e) {
      if (e.target === serviceModal) { closeService(); }
    });
  }
  var smCta = $("#smCta");
  if (smCta) { smCta.addEventListener("click", closeService); }

  /* le libellé du bouton nomme le service, et suit la langue */
  function labelCards() {
    $$(".card").forEach(function (card) {
      var btn = $(".card-open", card), h3 = $("h3", card);
      if (btn && h3) { btn.setAttribute("aria-label", stripTags(t("svc.open")) + " : " + h3.textContent.trim()); }
    });
  }
  labelCards();
  relabel = labelCards;

  /* =======================================================
     10. CLAVIER : Échap / flèches
     ======================================================= */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeLightbox();
      closeVideo();
      closeService();
      closeMenu();
      return;
    }
    if (lightbox && !lightbox.hidden) {
      if (e.key === "ArrowRight") { openLightbox(lbIndex + 1); }
      if (e.key === "ArrowLeft") { openLightbox(lbIndex - 1); }
    }
  });

  /* =======================================================
     11. FORMULAIRE DE CONTACT
     ======================================================= */
  var form = $("#contactForm");
  var status = $("#formStatus");

  function fieldOf(input) { return input.closest(".field") || input.closest(".consent"); }

  function markError(input, hasError) {
    var wrap = fieldOf(input);
    if (wrap) { wrap.classList.toggle("has-error", hasError); }
  }

  function validate() {
    var ok = true;
    var name = $("#f-name");
    var phone = $("#f-phone");
    var email = $("#f-email");
    var msg = $("#f-msg");
    var consent = $("#f-consent");

    var checks = [
      [name, name.value.trim().length >= 2],
      [phone, phone.value.replace(/[^0-9+]/g, "").length >= 8],
      [email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())],
      [msg, msg.value.trim().length >= 5],
      [consent, consent.checked]
    ];

    checks.forEach(function (pair) {
      var valid = pair[1];
      markError(pair[0], !valid);
      if (!valid) { ok = false; }
    });

    return ok;
  }

  if (form) {
    $$("input, textarea", form).forEach(function (input) {
      input.addEventListener("input", function () { markError(input, false); });
      input.addEventListener("change", function () { markError(input, false); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!validate()) {
        if (status) { status.textContent = stripTags(t("form.bad")); status.className = "form-status bad"; }
        var firstBad = $(".has-error input, .has-error textarea", form);
        if (firstBad) { firstBad.focus(); }
        return;
      }

      // Aucune adresse de réception configurée : on ne fait pas semblant
      // d'envoyer. Le visiteur est renvoyé vers le téléphone du cabinet.
      if (!CONTACT_EMAIL) {
        if (status) {
          status.textContent = stripTags(t("form.noMail")).replace("{tel}", CONTACT_PHONE);
          status.className = "form-status bad";
        }
        return;
      }

      // Pas de backend : on prépare un e-mail prérempli.
      // Pour un envoi serveur, remplacer ce bloc par un fetch() vers votre endpoint.
      var subjectSelect = $("#f-subject");
      var subjectLabel = subjectSelect.options[subjectSelect.selectedIndex].textContent;
      var body = [
        t("form.name") + " : " + $("#f-name").value.trim(),
        t("form.phone") + " : " + $("#f-phone").value.trim(),
        t("form.email") + " : " + $("#f-email").value.trim(),
        t("form.subject") + " : " + subjectLabel,
        "",
        $("#f-msg").value.trim()
      ].join("\n");

      var mailto = "mailto:" + CONTACT_EMAIL
        + "?subject=" + encodeURIComponent("[Site] " + stripTags(subjectLabel))
        + "&body=" + encodeURIComponent(stripTags(body));

      window.location.href = mailto;

      if (status) { status.textContent = stripTags(t("form.ok")); status.className = "form-status ok"; }
      form.reset();
    });
  }

  /* =======================================================
     12. COMPARATEUR AVANT / APRÈS
     Le <input type="range"> invisible fait tout le travail :
     glisser, cliquer, et les flèches du clavier.
     ======================================================= */
  $$(".ba-frame").forEach(function (frame) {
    var range = $(".ba-range", frame);
    if (!range) { return; }

    function apply() { frame.style.setProperty("--pos", range.value + "%"); }

    range.addEventListener("input", apply);

    // double-clic : retour au milieu
    frame.addEventListener("dblclick", function () {
      range.value = 50;
      apply();
    });

    apply();

    // À l'entrée dans l'écran, le volet s'ouvre de 88 % à 50 % :
    // le visiteur comprend qu'il peut le déplacer.
    if (reduceMotion || !("IntersectionObserver" in window)) { return; }

    var teased = false;
    var teaseObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || teased) { return; }
        teased = true;
        teaseObs.unobserve(frame);

        var from = 88, to = 50, dur = 1100, start = null;
        range.value = from;
        apply();

        function step(now) {
          if (start === null) { start = now; }
          var p = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          range.value = (from + (to - from) * eased).toFixed(1);
          apply();
          if (p < 1) { requestAnimationFrame(step); }
        }
        setTimeout(function () { requestAnimationFrame(step); }, 260);
      });
    }, { threshold: 0.45 });

    teaseObs.observe(frame);
  });

  /* =======================================================
     13. CARROUSEL DU VISUEL D'ACCUEIL
     Défilement automatique toutes les 5 s (sauf mouvement réduit),
     en pause au survol ou au focus. Flèches, points, glisser au
     doigt et flèches du clavier.
     ======================================================= */
  var carousel = $(".hero-carousel");
  if (carousel) {
    var slides = $$(".hc-slide", carousel);
    var dots = $$(".hc-dot", carousel);
    var current = 0;
    var timer = null;
    var paused = false;
    var justSwiped = false;

    function show(i) {
      current = (i + slides.length) % slides.length;
      var n = slides.length;
      slides.forEach(function (s, k) {
        var on = k === current;
        s.classList.toggle("is-active", on);
        // les voisines restent visibles de chaque côté (effet « coverflow »)
        s.classList.toggle("is-prev", k === (current - 1 + n) % n);
        s.classList.toggle("is-next", k === (current + 1) % n);
        if (on) { s.removeAttribute("aria-hidden"); } else { s.setAttribute("aria-hidden", "true"); }
      });
      dots.forEach(function (d, k) {
        d.classList.toggle("is-active", k === current);
        if (k === current) { d.setAttribute("aria-current", "true"); } else { d.removeAttribute("aria-current"); }
      });
    }

    function play() {
      if (reduceMotion) { return; }
      clearInterval(timer);
      timer = setInterval(function () { if (!paused && !document.hidden) { show(current + 1); } }, 5000);
    }

    // une action de l'utilisateur relance le compte à rebours
    function go(i) { show(i); play(); }

    var prev = $(".hc-prev", carousel), next = $(".hc-next", carousel);
    if (prev) { prev.addEventListener("click", function () { go(current - 1); }); }
    if (next) { next.addEventListener("click", function () { go(current + 1); }); }
    dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); }); });
    // un clic sur une photo voisine l'amène au centre
    slides.forEach(function (s, k) {
      s.addEventListener("click", function () {
        if (justSwiped) { return; }
        if (s.classList.contains("is-prev") || s.classList.contains("is-next")) { go(k); }
      });
    });

    carousel.addEventListener("mouseenter", function () { paused = true; });
    carousel.addEventListener("mouseleave", function () { paused = false; });
    carousel.addEventListener("focusin", function () { paused = true; });
    carousel.addEventListener("focusout", function () { paused = false; });

    // flèches du clavier : en arabe, « suivant » est à gauche
    carousel.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") { return; }
      var forward = (e.key === "ArrowRight") !== (document.documentElement.dir === "rtl");
      e.preventDefault();
      go(current + (forward ? 1 : -1));
    });

    // glisser au doigt
    var frame = $(".hc-frame", carousel), startX = null;
    if (frame) {
      frame.addEventListener("pointerdown", function (e) { startX = e.clientX; });
      frame.addEventListener("pointerup", function (e) {
        if (startX === null) { return; }
        var dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) < 40) { return; }
        var forward = (dx < 0) !== (document.documentElement.dir === "rtl");
        // le clic qui suit le glissé ne doit pas déplacer une seconde fois
        justSwiped = true;
        setTimeout(function () { justSwiped = false; }, 0);
        go(current + (forward ? 1 : -1));
      });
      frame.addEventListener("pointercancel", function () { startX = null; });
    }

    show(0);
    play();
  }

  /* =======================================================
     14. DIVERS
     ======================================================= */
  var year = $("#year");
  if (year) { year.textContent = new Date().getFullYear(); }
})();
