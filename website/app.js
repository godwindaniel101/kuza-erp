/* ==========================================================================
   Kuza marketing site — shared behaviour.
   Nav dropdown, mobile drawer, scroll-reveal, count-up, pricing toggle, FAQ.
   All motion respects prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Products dropdown (desktop) ---------- */
  var drop = document.querySelector(".nav-item--drop");
  if (drop) {
    var trigger = drop.querySelector(".nav-trigger");
    var close = function () { drop.classList.remove("open"); if (trigger) trigger.setAttribute("aria-expanded", "false"); };
    var open = function () { drop.classList.add("open"); if (trigger) trigger.setAttribute("aria-expanded", "true"); };
    if (trigger) {
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        drop.classList.contains("open") ? close() : open();
      });
    }
    drop.addEventListener("mouseenter", open);
    drop.addEventListener("mouseleave", close);
    document.addEventListener("click", function (e) { if (!drop.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ---------- Mobile drawer ---------- */
  var drawer = document.getElementById("drawer");
  var openBtn = document.querySelector(".nav-toggle");
  var closeBtn = drawer ? drawer.querySelector(".drawer-close") : null;
  var scrim = drawer ? drawer.querySelector(".drawer-scrim") : null;
  var openDrawer = function () { if (!drawer) return; drawer.classList.add("open"); document.body.style.overflow = "hidden"; };
  var closeDrawer = function () { if (!drawer) return; drawer.classList.remove("open"); document.body.style.overflow = ""; };
  if (openBtn) openBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (scrim) scrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); obs.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- Count-up ---------- */
  function formatNum(val, decimals) {
    return Number(val).toLocaleString("en-US", {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    });
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    var runCount = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduceMotion) { el.textContent = prefix + formatNum(target, decimals) + suffix; return; }
      var dur = 1600, start = null;
      var tick = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + formatNum(target * eased, decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + formatNum(target, decimals) + suffix;
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) {
      counters.forEach(runCount);
    } else {
      var cio = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { runCount(en.target); obs.unobserve(en.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- Marquee duplication (seamless loop) ---------- */
  var track = document.querySelector(".marquee-track");
  if (track && !track.dataset.cloned) {
    track.innerHTML += track.innerHTML;
    track.dataset.cloned = "true";
  }

  /* ---------- Pricing currency toggle ---------- */
  var toggle = document.querySelector(".price-toggle");
  if (toggle) {
    toggle.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-cur]");
      if (!btn) return;
      var cur = btn.getAttribute("data-cur");
      toggle.querySelectorAll("button").forEach(function (b) { b.classList.toggle("active", b === btn); });
      document.querySelectorAll("[data-ngn]").forEach(function (el) {
        var v = el.getAttribute("data-" + cur.toLowerCase());
        if (v !== null) el.textContent = v;
      });
      document.querySelectorAll("[data-cur-sym]").forEach(function (el) {
        el.textContent = cur === "USD" ? "$" : "₦";
      });
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-q").forEach(function (q) {
    q.addEventListener("click", function () {
      var item = q.closest(".faq-item");
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function (i) { if (i !== item) i.classList.remove("open"); });
      item.classList.toggle("open", !isOpen);
    });
  });

  /* ---------- Footer year ---------- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Newsletter (no backend — friendly acknowledgement) ---------- */
  document.querySelectorAll(".news-row").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input");
      if (input && input.value) { input.value = ""; input.placeholder = "Thanks — you're on the list ✓"; }
    });
  });
})();
