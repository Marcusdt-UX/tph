// ========== Theme Toggle ==========
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Initialize theme before page renders
initTheme();

document.addEventListener('DOMContentLoaded', function () {
  // Theme toggle buttons
  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', toggleTheme);
  });

  // ========== Mobile Menu ==========
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileNav = document.querySelector('.mobile-nav');
  const menuIconOpen = document.querySelector('.menu-icon-open');
  const menuIconClose = document.querySelector('.menu-icon-close');

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      const isOpen = mobileNav.classList.toggle('open');
      if (menuIconOpen && menuIconClose) {
        menuIconOpen.style.display = isOpen ? 'none' : 'block';
        menuIconClose.style.display = isOpen ? 'block' : 'none';
      }
    });

    // Close menu on link click
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        if (menuIconOpen && menuIconClose) {
          menuIconOpen.style.display = 'block';
          menuIconClose.style.display = 'none';
        }
      });
    });
  }

  // ========== Custom Cursor ==========
  const cursorDot = document.querySelector('.custom-cursor-dot');
  const cursorRing = document.querySelector('.custom-cursor-ring');

  if (cursorDot && cursorRing && window.matchMedia('(hover: hover)').matches) {
    let mouseX = 0, mouseY = 0;
    let dotX = 0, dotY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animateCursor() {
      // Dot follows closely
      dotX += (mouseX - dotX) * 0.3;
      dotY += (mouseY - dotY) * 0.3;
      cursorDot.style.transform = 'translate(' + (dotX - 4) + 'px, ' + (dotY - 4) + 'px)';

      // Ring follows with lag
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      cursorRing.style.transform = 'translate(' + (ringX - 16) + 'px, ' + (ringY - 16) + 'px)';

      requestAnimationFrame(animateCursor);
    }

    animateCursor();

    // Hover detection
    document.addEventListener('mouseover', function (e) {
      var target = e.target;
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.classList.contains('cursor-highlight')
      ) {
        document.body.classList.add('cursor-hover');
      } else {
        document.body.classList.remove('cursor-hover');
      }
    });
  }

  // ========== Scroll Animations ==========
  var animatedElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger-children');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show everything
    animatedElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // ========== FAQ Accordion ==========
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');

      // Close all items
      document.querySelectorAll('.faq-item').forEach(function (faq) {
        faq.classList.remove('open');
      });

      // Toggle current
      if (!wasOpen) {
        item.classList.add('open');
      }
    });
  });

  // ========== FAQ Category Filter ==========
  document.querySelectorAll('.faq-filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      // Update active button
      document.querySelectorAll('.faq-filter-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      var category = btn.getAttribute('data-category');

      document.querySelectorAll('.faq-item').forEach(function (item) {
        if (category === 'All' || item.getAttribute('data-category') === category) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // ========== Contact Form ==========
  var contactForm = document.getElementById('contact-form');
  var formSuccess = document.querySelector('.form-success');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Show success message
      contactForm.style.display = 'none';
      if (formSuccess) {
        formSuccess.classList.add('show');
      }

      // Reset after 3 seconds
      setTimeout(function () {
        contactForm.reset();
        contactForm.style.display = '';
        if (formSuccess) {
          formSuccess.classList.remove('show');
        }
      }, 3000);
    });
  }

  // ========== Pricing Billing Toggle ==========
  var billingBtns = document.querySelectorAll('.billing-toggle button');
  var priceElements = document.querySelectorAll('[data-price-project]');

  billingBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      billingBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var cycle = btn.getAttribute('data-billing');

      priceElements.forEach(function (el) {
        if (cycle === 'monthly') {
          el.textContent = el.getAttribute('data-price-monthly');
          var note = el.nextElementSibling;
          if (note && note.classList.contains('pricing-price-note')) {
            note.style.display = 'none';
          }
        } else {
          el.textContent = el.getAttribute('data-price-project');
          var note = el.nextElementSibling;
          if (note && note.classList.contains('pricing-price-note')) {
            note.style.display = '';
          }
        }
      });
    });
  });

  // ========== Active Nav Link ==========
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .mobile-nav a:not(.mobile-nav-cta)').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPage || (currentPage === 'index.html' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ========== Animated Stat Counters ==========
  var statValues = document.querySelectorAll('.stat-value, .result-value');

  function animateCounter(el) {
    var text = el.textContent.trim();
    var prefix = '';
    var suffix = '';
    var num = parseFloat(text.replace(/[^0-9.]/g, ''));

    if (isNaN(num)) return;

    // Extract prefix/suffix (e.g., "+", "%", "+" and "%")
    var match = text.match(/^([^0-9]*)([\d.]+)(.*)$/);
    if (match) {
      prefix = match[1];
      num = parseFloat(match[2]);
      suffix = match[3];
    }

    var duration = 1500;
    var startTime = null;
    var startVal = 0;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(startVal + (num - startVal) * eased);
      el.textContent = prefix + current + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window && statValues.length > 0) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    statValues.forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  // ========== Hero Parallax on Scroll ==========
  var heroGridBgs = document.querySelectorAll('.hero-grid-bg');
  if (heroGridBgs.length > 0) {
    window.addEventListener('scroll', function () {
      var scrollY = window.scrollY;
      heroGridBgs.forEach(function (bg) {
        bg.style.transform = 'translate(' + (scrollY * 0.02) + 'px, ' + (scrollY * 0.05) + 'px)';
      });
    }, { passive: true });
  }

  // ========== Lucide Icons ==========
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // ========== Copyright Year ==========
  var yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});
