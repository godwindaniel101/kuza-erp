/**
 * Kuza — marketing site interactions.
 * ===========================================================================
 * Vanilla JS only. No external libraries or CDNs. Everything degrades
 * gracefully and respects prefers-reduced-motion.
 * ===========================================================================
 */
(function () {
  'use strict';

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Current year ---------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Theme toggle ---------------------------------------------------- */
  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var isDark = document.documentElement.classList.toggle('dark');
      try {
        localStorage.setItem('kuza-theme', isDark ? 'dark' : 'light');
      } catch (e) {}
    });
  }

  /* ---- Header shadow on scroll ---------------------------------------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Mobile nav ------------------------------------------------------ */
  var navToggle = document.getElementById('navToggle');
  var mobileNav = document.getElementById('mobileNav');
  if (navToggle && mobileNav) {
    var closeNav = function () {
      mobileNav.classList.remove('open');
      mobileNav.hidden = true;
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open menu');
    };
    navToggle.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      mobileNav.hidden = !open;
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
  }

  /* ---- Scroll-reveal (staggered) -------------------------------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('in-view');
    });
  } else {
    var revObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
          el.style.transitionDelay = delay + 'ms';
          el.classList.add('in-view');
          obs.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach(function (el) {
      revObserver.observe(el);
    });
  }

  /* ---- Number counters ------------------------------------------------- */
  function formatValue(value, el) {
    var format = el.getAttribute('data-format');
    var out;
    if (format === 'comma') {
      out = Math.round(value).toLocaleString('en-US');
    } else if (format === 'short') {
      // 10000 -> "10k"
      if (value >= 1000) {
        out = (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'k';
      } else {
        out = String(Math.round(value));
      }
    } else {
      out = String(Math.round(value));
    }
    return out;
  }

  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion) {
      el.textContent = formatValue(target, el) + suffix;
      return;
    }
    var duration = 1600;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      // easeOutCubic
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatValue(target * eased, el) + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatValue(target, el) + suffix;
      }
    }
    requestAnimationFrame(step);
  }

  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (!('IntersectionObserver' in window)) {
    counters.forEach(animateCount);
  } else {
    var countObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) {
      countObserver.observe(el);
    });
  }

  /* ---- Marquee: duplicate track for seamless loop --------------------- */
  var track = document.getElementById('marqueeTrack');
  if (track && !reduceMotion) {
    var clone = track.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    track.parentNode.appendChild(clone);
    // The keyframe translates -50%; the duplicate makes that seamless.
  }

  /* ---- FAQ: single-open accordion ------------------------------------- */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      faqItems.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---- Pricing currency switch (local-first: NGN/KSh primary) --------- */
  var SYMBOLS = { NGN: '₦', KES: 'KSh', USD: '$' };
  var ORDER = ['NGN', 'KES', 'USD'];

  // Preserve the trailing note (trial / billing) per card before wiring.
  document.querySelectorAll('[data-secondary]').forEach(function (el) {
    var parts = el.textContent.split('·');
    if (parts.length) {
      el.setAttribute('data-trial', parts[parts.length - 1].trim());
    }
  });

  function setCurrency(cur) {
    document.querySelectorAll('[data-price]').forEach(function (el) {
      var map;
      try {
        map = JSON.parse(el.getAttribute('data-price'));
      } catch (e) {
        return;
      }
      el.textContent = map[cur];
      var card = el.closest('.price-card');
      if (!card) return;
      var symEl = card.querySelector('[data-cur-symbol]');
      if (symEl) symEl.textContent = SYMBOLS[cur];
      var secEl = card.querySelector('[data-secondary]');
      if (secEl) {
        var others = ORDER.filter(function (c) {
          return c !== cur;
        })
          .map(function (c) {
            return SYMBOLS[c] + ' ' + map[c];
          })
          .join(' · ');
        var trial = secEl.getAttribute('data-trial') || '';
        secEl.textContent = '≈ ' + others + (trial ? ' · ' + trial : '');
      }
    });
    document.querySelectorAll('.currency-switch button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-cur') === cur);
    });
  }

  document.querySelectorAll('.currency-switch button').forEach(function (b) {
    b.addEventListener('click', function () {
      setCurrency(b.getAttribute('data-cur'));
    });
  });
})();
