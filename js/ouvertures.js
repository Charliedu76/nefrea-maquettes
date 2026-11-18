/* Néfréa — interactions propres aux pistes d'ouverture C et D. */
(function () {
  "use strict";

  var reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var survol = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var borne = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  /* ---------- C · La bougie qui se compose au défilement ---------- */
  var c = document.querySelector("[data-compose]");
  if (c) {
    var scene = c.querySelector(".ouv-c__scene");
    var etapes = Array.prototype.slice.call(c.querySelectorAll(".etape-c"));
    var points = Array.prototype.slice.call(c.querySelectorAll(".ouv-c__points span"));
    var enAttente = false;
    var majC = function () {
      var r = c.getBoundingClientRect();
      var course = r.height - scene.offsetHeight;
      var p = reduit ? 1 : borne(-r.top / course, 0, 1);
      c.style.setProperty("--p", p.toFixed(3));
      etapes.forEach(function (e, i) {
        var actif = p >= parseFloat(e.dataset.de) && p < parseFloat(e.dataset.a);
        e.classList.toggle("est-active", actif);
        if (points[i]) points[i].classList.toggle("est-active", actif);
      });
      enAttente = false;
    };
    window.addEventListener("scroll", function () {
      if (!enAttente) { enAttente = true; requestAnimationFrame(majC); }
    }, { passive: true });
    window.addEventListener("resize", majC);
    majC();
  }

  /* ---------- D · La lumière qui suit la souris ---------- */
  var d = document.querySelector("[data-lumiere]");
  if (d) {
    var titre = d.querySelector(".titre-eclaire__lumiere");
    var cible = { x: 66, y: 60 };
    var pos = { x: 66, y: 60 };
    var anim = null;

    var applique = function () {
      d.style.setProperty("--lx", pos.x.toFixed(2) + "%");
      d.style.setProperty("--ly", pos.y.toFixed(2) + "%");
      // centre de la lumière, exprimé dans le repère du titre (en px)
      var rd = d.getBoundingClientRect();
      var rt = titre.getBoundingClientRect();
      var lx = rd.left + rd.width * pos.x / 100 - rt.left;
      var ly = rd.top + rd.height * pos.y / 100 - rd.height * 0.08 - rt.top;
      titre.style.setProperty("--tx", lx.toFixed(0) + "px");
      titre.style.setProperty("--ty", ly.toFixed(0) + "px");
    };

    var boucle = function () {
      pos.x += (cible.x - pos.x) * 0.08;
      pos.y += (cible.y - pos.y) * 0.08;
      applique();
      if (Math.abs(cible.x - pos.x) > 0.05 || Math.abs(cible.y - pos.y) > 0.05) anim = requestAnimationFrame(boucle);
      else anim = null;
    };

    if (reduit) {
      applique();
    } else if (survol && window.innerWidth > 960) {
      d.addEventListener("pointermove", function (e) {
        var r = d.getBoundingClientRect();
        cible.x = borne(((e.clientX - r.left) / r.width) * 100, 55, 88);
        cible.y = borne(((e.clientY - r.top) / r.height) * 100, 38, 72);
        if (!anim) anim = requestAnimationFrame(boucle);
      });
      d.addEventListener("pointerleave", function () {
        cible.x = 66; cible.y = 60;
        if (!anim) anim = requestAnimationFrame(boucle);
      });
      applique();
    } else {
      // téléphone : la bougie se balance doucement toute seule
      var base = window.innerWidth > 960 ? { x: 66, y: 60 } : { x: 50, y: 72 };
      var t0 = performance.now();
      (function balance(t) {
        var s = (t - t0) / 1000;
        pos.x = base.x + Math.sin(s * 0.7) * 6;
        pos.y = base.y + Math.sin(s * 1.1) * 2;
        applique();
        requestAnimationFrame(balance);
      })(t0);
    }
    window.addEventListener("resize", applique);
  }
})();
