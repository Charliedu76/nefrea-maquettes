/* Néfréa — interactions communes aux maquettes
   (menu mobile, nuancier, filtres, onglets, fiche produit). */
(function () {
  "use strict";

  var euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  // Dossier des images, déduit du logo de l'en-tête (« ../img/ » dans les maquettes)
  var logo = $(".entete__logo img, [data-logo]");
  var IMG = logo ? logo.getAttribute("src").replace(/[^/]*$/, "") : "img/";
  // Modèle de nom des photos OREA par teinte (photo classique ou objet détouré)
  var principale = $("[data-image-principale]");
  var MOTIF = (principale && principale.dataset.motif) || "orea-{t}.jpg";
  var photoOrea = function (teinte) { return IMG + MOTIF.replace("{t}", teinte); };
  var reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var survol = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Objets flottants : parallaxe au défilement (maquette Moderne) ---------- */
  var flottants = $$("[data-profondeur]");
  if (flottants.length && !reduit) {
    var enAttente = false;
    var parallaxe = function () {
      var milieu = window.innerHeight / 2;
      flottants.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        var ecart = r.top + r.height / 2 - milieu;
        el.style.setProperty("--dy", (-ecart * parseFloat(el.dataset.profondeur)).toFixed(1) + "px");
      });
      enAttente = false;
    };
    window.addEventListener("scroll", function () {
      if (!enAttente) { enAttente = true; requestAnimationFrame(parallaxe); }
    }, { passive: true });
    window.addEventListener("resize", parallaxe);
    parallaxe();
  }

  /* ---------- Inclinaison suivant la souris (maquette Moderne) ---------- */
  if (survol && !reduit) {
    $$("[data-scene]").forEach(function (scene) {
      var incline = $$("[data-incline]", scene);
      var proches = $$("[data-profondeur]", scene);
      scene.addEventListener("pointermove", function (e) {
        var r = scene.getBoundingClientRect();
        var nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        var ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        incline.forEach(function (el) {
          el.style.setProperty("--ty", (nx * 12).toFixed(2) + "deg");
          el.style.setProperty("--tx", (6 - ny * 8).toFixed(2) + "deg");
        });
        proches.forEach(function (el) {
          el.style.setProperty("--dx", (-nx * 90 * parseFloat(el.dataset.profondeur)).toFixed(1) + "px");
        });
      });
      scene.addEventListener("pointerleave", function () {
        incline.forEach(function (el) { el.style.removeProperty("--ty"); el.style.removeProperty("--tx"); });
        proches.forEach(function (el) { el.style.removeProperty("--dx"); });
      });
    });
  }

  /* ---------- Carrousel 3D des teintes (maquette Moderne) ---------- */
  $$("[data-carrousel]").forEach(function (c) {
    var scene = $(".carrousel__scene", c);
    var items = $$(".carrousel__item", c);
    var radios = $$("input[name='carrousel']", c);
    var nom = $("[data-carrousel-nom]", c);
    var n = items.length;
    var actuel = 0, cible = 0, anim;

    function place(pos) {
      var w = scene.clientWidth;
      var rx = w * 0.4, ry = Math.min(80, w * 0.09);
      items.forEach(function (it, i) {
        var angle = ((i - pos) / n) * 2 * Math.PI;
        var prof = (Math.cos(angle) + 1) / 2; // 1 = devant, 0 = derrière
        it.style.setProperty("--x", (Math.sin(angle) * rx).toFixed(1) + "px");
        it.style.setProperty("--y", (-(1 - prof) * ry).toFixed(1) + "px");
        it.style.setProperty("--s", (0.34 + 0.66 * Math.pow(prof, 1.6)).toFixed(3));
        it.style.setProperty("--z", String(Math.round(prof * 100)));
        it.style.setProperty("--flou", ((1 - prof) * 3).toFixed(2) + "px");
        it.style.setProperty("--lum", (0.7 + 0.3 * prof).toFixed(3));
        it.style.setProperty("--op", (0.3 + 0.7 * prof).toFixed(3));
      });
    }
    function indexCourant() { return ((Math.round(cible) % n) + n) % n; }
    function va(index) {
      var vise = ((index % n) + n) % n;
      var d = vise - indexCourant();
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      cible = Math.round(cible) + d;
      radios[vise].checked = true;
      nom.textContent = radios[vise].dataset.nom;
      cancelAnimationFrame(anim);
      if (reduit) { actuel = cible; place(actuel); return; }
      (function pas() {
        actuel += (cible - actuel) * 0.12;
        if (Math.abs(cible - actuel) < 0.002) actuel = cible;
        place(actuel);
        if (actuel !== cible) anim = requestAnimationFrame(pas);
      })();
    }
    radios.forEach(function (r) { r.addEventListener("change", function () { va(parseInt(r.value, 10)); }); });
    $$("[data-carrousel-pas]", c).forEach(function (b) {
      b.addEventListener("click", function () { va(indexCourant() + parseInt(b.dataset.carrouselPas, 10)); });
    });
    items.forEach(function (it, i) { it.addEventListener("click", function () { va(i); }); });
    var x0 = null;
    scene.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    scene.addEventListener("pointerup", function (e) {
      if (x0 !== null && Math.abs(e.clientX - x0) > 40) va(indexCourant() + (e.clientX < x0 ? 1 : -1));
      x0 = null;
    });
    window.addEventListener("resize", function () { place(actuel); });
    place(0);
  });

  /* ---------- Menu mobile ---------- */
  var menu = $("[data-menu]");
  var ouvreMenu = $("[data-ouvre-menu]");
  function basculeMenu(ouvert) {
    menu.classList.toggle("est-ouvert", ouvert);
    ouvreMenu.setAttribute("aria-expanded", String(ouvert));
    document.body.style.overflow = ouvert ? "hidden" : "";
    if (ouvert) { var f = $("[data-ferme-menu].icone-bouton", menu); if (f) f.focus(); }
    else ouvreMenu.focus();
  }
  if (menu && ouvreMenu) {
    ouvreMenu.addEventListener("click", function () { basculeMenu(true); });
    $$("[data-ferme-menu]", menu).forEach(function (el) { el.addEventListener("click", function () { basculeMenu(false); }); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { basculeMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("est-ouvert")) basculeMenu(false); });
  }

  /* ---------- Panier simulé ---------- */
  var compteur = 0;
  var toast = $("[data-toast]");
  var minuteur;
  function ajoutePanier(qte, image, texte) {
    compteur += qte;
    $$("[data-compteur-panier]").forEach(function (c) { c.hidden = false; c.textContent = compteur; });
    if (!toast) return;
    $("[data-toast-image]", toast).src = image;
    $("[data-toast-texte]", toast).textContent = texte;
    toast.classList.add("est-visible");
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { toast.classList.remove("est-visible"); }, 3200);
  }

  /* ---------- Nuancier (maquette Bordeaux) ---------- */
  var nuancier = $("[data-nuancier]");
  if (nuancier) {
    var imgA = $("[data-nuancier-image]");
    var imgB = $("[data-nuancier-image-suivante]");
    var etiquette = $("[data-nuancier-etiquette]");
    var nom = $("[data-nuancier-nom]");
    $$("input", nuancier).forEach(function (input) { new Image().src = photoOrea(input.value); });

    nuancier.addEventListener("change", function (e) {
      var input = e.target;
      var libelle = input.dataset.nom;
      imgB.src = photoOrea(input.value);
      imgB.alt = "Bougie OREA, teinte " + libelle.toLowerCase();
      imgB.classList.remove("est-cache");
      imgA.classList.add("est-cache");
      imgA.removeAttribute("alt");
      imgA.setAttribute("aria-hidden", "true");
      imgB.removeAttribute("aria-hidden");
      var tmp = imgA; imgA = imgB; imgB = tmp;
      etiquette.textContent = "OREA · " + libelle;
      nom.textContent = libelle;
    });
  }

  /* ---------- Filtres de collection (maquette Galerie) ---------- */
  $$("[data-filtres]").forEach(function (groupe) {
    var cible = $(groupe.dataset.filtres);
    groupe.addEventListener("click", function (e) {
      var bouton = e.target.closest("[data-filtre]");
      if (!bouton) return;
      var filtre = bouton.dataset.filtre;
      $$("[data-filtre]", groupe).forEach(function (b) { b.setAttribute("aria-pressed", String(b === bouton)); });
      $$("[data-categorie]", cible).forEach(function (carte) {
        carte.hidden = filtre !== "tout" && carte.dataset.categorie.split(" ").indexOf(filtre) === -1;
      });
      cible.classList.toggle("est-filtre", filtre !== "tout");
    });
  });

  /* ---------- Onglets (maquette Poudré) ---------- */
  $$("[data-onglets]").forEach(function (groupe) {
    var onglets = $$("[role='tab']", groupe);
    function active(onglet, focus) {
      onglets.forEach(function (o) {
        var actif = o === onglet;
        o.setAttribute("aria-selected", String(actif));
        o.tabIndex = actif ? 0 : -1;
        $("#" + o.getAttribute("aria-controls")).hidden = !actif;
      });
      if (focus) onglet.focus();
    }
    onglets.forEach(function (o, i) {
      o.addEventListener("click", function () { active(o); });
      o.addEventListener("keydown", function (e) {
        var pas = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (pas) { e.preventDefault(); active(onglets[(i + pas + onglets.length) % onglets.length], true); }
      });
    });
  });

  /* ---------- Fiche produit ---------- */
  var produit = $("[data-produit]");
  if (produit) {
    var form = $("[data-formulaire-achat]");
    var imagePrincipale = $("[data-image-principale]");
    var vignettes = $$("[data-vignette]");
    var champQuantite = $("[data-champ-quantite]");

    function valeur(nomChamp) { return $("input[name='" + nomChamp + "']:checked", form); }
    function quantite() { return Math.max(1, Math.min(20, parseInt(champQuantite.value, 10) || 1)); }

    function afficheImage(src, alt) {
      imagePrincipale.src = src;
      imagePrincipale.alt = alt;
      if (imagePrincipale.dataset.motif && !reduit) {
        imagePrincipale.classList.remove("change");
        void imagePrincipale.offsetWidth; // relance l'animation d'apparition
        imagePrincipale.classList.add("change");
      }
      vignettes.forEach(function (v) { v.setAttribute("aria-current", String(v.dataset.vignette === src)); });
    }

    function maj() {
      var teinte = valeur("teinte");
      var taille = valeur("taille");
      var senteur = valeur("senteur");
      var prix = parseFloat(taille.dataset.prix);
      $$("[data-libelle-teinte]").forEach(function (el) { el.textContent = teinte.dataset.nom; });
      $$("[data-libelle-taille]").forEach(function (el) { el.textContent = taille.value; });
      $$("[data-libelle-senteur]").forEach(function (el) { el.textContent = senteur.value; });
      $$("[data-prix]").forEach(function (el) { el.textContent = euros.format(prix); });
      $$("[data-prix-total]").forEach(function (el) { el.textContent = euros.format(prix * quantite()); });
      $$("[data-resume-variante]").forEach(function (el) { el.textContent = teinte.dataset.nom + " · " + taille.value + " · " + euros.format(prix); });
    }

    form.addEventListener("change", function (e) {
      if (e.target.name === "teinte") {
        afficheImage(photoOrea(e.target.value), "Bougie OREA, teinte " + e.target.dataset.nom.toLowerCase());
      }
      maj();
    });

    vignettes.forEach(function (v) {
      v.addEventListener("click", function () {
        var t = v.dataset.teinte;
        if (t) { $("input[name='teinte'][value='" + t + "']", form).checked = true; maj(); }
        afficheImage(v.dataset.vignette, v.querySelector("img").alt);
      });
    });

    $$("[data-quantite]").forEach(function (b) {
      b.addEventListener("click", function () {
        champQuantite.value = Math.max(1, Math.min(20, quantite() + parseInt(b.dataset.quantite, 10)));
        maj();
      });
    });
    champQuantite.addEventListener("input", maj);

    function ajoute() {
      var qte = quantite();
      var teinte = valeur("teinte");
      ajoutePanier(qte, photoOrea(teinte.value),
        (qte > 1 ? qte + " × " : "") + "OREA · " + teinte.dataset.nom + " · " + valeur("taille").value + " · " + valeur("senteur").value);
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); ajoute(); });
    var rapide = $("[data-achat-rapide]");
    if (rapide) rapide.addEventListener("click", ajoute);

    maj();
  }
})();
