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

// Schedule an array of functions, yielding to the browser between each one
function runChunked(fns) {
  var i = 0;
  function next() {
    if (i < fns.length) {
      fns[i]();
      i++;
      setTimeout(next, 0);
    }
  }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(next);
  } else {
    setTimeout(next, 50);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // === CRITICAL PATH (above-fold interactivity) ===

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

  // ===== Schedule all remaining work in yielding chunks =====
  // Each function runs as a separate browser task, preventing long-task jank
  runChunked([

  // --- Chunk 1: (icons inlined at build time — no runtime work needed) ---
  function initIcons() {
    // Lucide icons are now inlined by 11ty build transform.
    // This chunk is kept as a no-op placeholder for chunk ordering.
  },

  // --- Chunk 2: Scroll animations + deferred CSS animations ---
  function initScrollAnimations() {
    var animatedElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger-children');
    // Elements with paused CSS animations that should play when visible
    var deferredAnims = document.querySelectorAll('.gradient-text, .gradient-text-primary, .code-card');
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
      animatedElements.forEach(function (el) { observer.observe(el); });

      // Separate observer for deferred animations — unpauses them on view
      var animObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('anim-play');
            animObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05 });
      deferredAnims.forEach(function (el) { animObserver.observe(el); });
    } else {
      animatedElements.forEach(function (el) { el.classList.add('visible'); });
      deferredAnims.forEach(function (el) { el.classList.add('anim-play'); });
    }
  },

  // --- Chunk 3: Active nav link + copyright year ---
  function initNavAndYear() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link, .mobile-nav a:not(.mobile-nav-cta)').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === currentPage || (currentPage === 'index.html' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
    var yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  },

  // --- Chunk 4: FAQ accordion ---
  function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq-item');
        var wasOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(function (faq) {
          faq.classList.remove('open');
          faq.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  },

  // --- Chunk 5: FAQ category filter ---
  function initFAQFilter() {
    document.querySelectorAll('.faq-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.faq-filter-btn').forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        var category = btn.getAttribute('data-category');
        document.querySelectorAll('.faq-item').forEach(function (item) {
          item.style.display = (category === 'All' || item.getAttribute('data-category') === category) ? '' : 'none';
        });
      });
    });
  },

  // --- Chunk 6: Contact form ---
  function initContactForm() {
    var contactForm = document.getElementById('contact-form');
    var formSuccess = document.querySelector('.form-success');
    if (!contactForm) return;

    function validateField(field) {
      var errorEl = document.getElementById(field.id + '-error');
      var isValid = field.validity.valid;
      if (!isValid) {
        field.classList.add('invalid');
        if (errorEl) errorEl.classList.add('visible');
      } else {
        field.classList.remove('invalid');
        if (errorEl) errorEl.classList.remove('visible');
      }
      return isValid;
    }

    contactForm.querySelectorAll('[required]').forEach(function (field) {
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () {
        if (field.classList.contains('invalid')) validateField(field);
      });
    });

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var allValid = true;
      contactForm.querySelectorAll('[required]').forEach(function (field) {
        if (!validateField(field)) allValid = false;
      });
      if (!allValid) return;

      var formData = new FormData(contactForm);
      var submitBtn = contactForm.querySelector('.btn-send');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('sending'); }

      fetch(contactForm.action, {
        method: 'POST', body: formData, headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        if (response.ok) {
          setTimeout(function () {
            contactForm.style.display = 'none';
            if (formSuccess) formSuccess.classList.add('show');
            contactForm.reset();
          }, 800);
        } else {
          alert('Something went wrong. Please try again or email us directly.');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('sending'); }
        }
      }).catch(function () {
        alert('Network error. Please try again or email us directly.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('sending'); }
      });
    });
  },

  // --- Chunk 7: Pricing billing toggle ---
  function initPricing() {
    var billingBtns = document.querySelectorAll('.billing-toggle button');
    var priceElements = document.querySelectorAll('[data-price-project]');
    billingBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        billingBtns.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        var cycle = btn.getAttribute('data-billing');
        priceElements.forEach(function (el) {
          if (cycle === 'monthly') {
            el.textContent = el.getAttribute('data-price-monthly');
            var note = el.nextElementSibling;
            if (note && note.classList.contains('pricing-price-note')) note.style.display = 'none';
          } else {
            el.textContent = el.getAttribute('data-price-project');
            var note = el.nextElementSibling;
            if (note && note.classList.contains('pricing-price-note')) note.style.display = '';
          }
        });
      });
    });
  },

  // --- Chunk 8: Animated stat counters ---
  function initCounters() {
    var statValues = document.querySelectorAll('.stat-value, .result-value');
    if (!('IntersectionObserver' in window) || statValues.length === 0) return;

    function animateCounter(el) {
      var text = el.textContent.trim();
      var match = text.match(/^([^0-9]*)([\d.]+)(.*)$/);
      if (!match) return;
      var prefix = match[1], num = parseFloat(match[2]), suffix = match[3];
      if (isNaN(num)) return;
      var duration = 1500, startTime = null;
      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + Math.round(num * eased) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    statValues.forEach(function (el) { counterObserver.observe(el); });
  },

  // --- Chunk 9: Hero parallax ---
  function initParallax() {
    var heroGridBgs = document.querySelectorAll('.hero-grid-bg');
    if (heroGridBgs.length === 0) return;
    window.addEventListener('scroll', function () {
      var scrollY = window.scrollY;
      heroGridBgs.forEach(function (bg) {
        bg.style.transform = 'translate(' + (scrollY * 0.02) + 'px, ' + (scrollY * 0.05) + 'px)';
      });
    }, { passive: true });
  },

  // --- Chunk 10: Easter egg terminal (lazy — only binds click handler) ---
  function initTerminal() {
    var greenDot = document.querySelector('.code-card .window-dot-green');
    var cardInner = document.querySelector('.code-card .code-card-inner');
    var overlay = document.getElementById('terminal-overlay');
    var output = document.getElementById('terminal-output');
    var input = document.getElementById('terminal-input');
    if (!greenDot || !cardInner || !overlay || !output || !input) return;

    var terminalOpen = false;
    var history = [];
    var historyIndex = -1;

    greenDot.addEventListener('click', function () {
      terminalOpen = !terminalOpen;
      if (terminalOpen) {
        cardInner.classList.add('terminal-active');
        greenDot.classList.add('active');
        input.focus();
      } else {
        cardInner.classList.remove('terminal-active');
        greenDot.classList.remove('active');
      }
    });

    function addLine(text, cls) {
      var line = document.createElement('div');
      line.className = 'terminal-line' + (cls ? ' ' + cls : '');
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }
    function addHTML(html) {
      var line = document.createElement('div');
      line.className = 'terminal-line';
      line.innerHTML = html;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    var commands = {
      help: function () {
        addLine('');
        addLine('Available commands:', 'terminal-cyan');
        addLine('  help      \u2014 Show this list');
        addLine('  about     \u2014 About Thomas Publishing House');
        addLine('  skills    \u2014 What we do');
        addLine('  hello     \u2014 Say hi');
        addLine('  time      \u2014 Current time');
        addLine('  coffee    \u2014 Brew some coffee');
        addLine('  matrix    \u2014 Take the red pill');
        addLine('  secret    \u2014 ???');
        addLine('  flip      \u2014 Flip a coin');
        addLine('  magic8    \u2014 Ask the magic 8-ball');
        addLine('  clear     \u2014 Clear terminal');
        addLine('  exit      \u2014 Close terminal');
      },
      about: function () {
        addLine('');
        addLine('Thomas Publishing House', 'terminal-cyan');
        addLine('Port Huron, Michigan');
        addLine('Mission: Digital Incunabula');
        addLine('Where traditional publishing precision');
        addLine('meets modern web innovation.');
      },
      skills: function () {
        addLine('');
        var skills = [['Web Development',95],['Brand Storytelling',90],['Digital Strategy',88],['Content & SEO',92],['Social Media',85]];
        skills.forEach(function (s) {
          var bar = '';
          var filled = Math.round(s[1] / 5);
          for (var i = 0; i < 20; i++) bar += i < filled ? '\u2588' : '\u2591';
          addHTML('<span class="terminal-cyan">' + s[0].padEnd(20) + '</span> <span class="terminal-green">' + bar + '</span> <span class="terminal-yellow">' + s[1] + '%</span>');
        });
      },
      hello: function () {
        var g = ['Hey there! \ud83d\udc4b Welcome to the hidden terminal.','Oh hello! You found the secret. Impressive.','Greetings, curious human. You have good instincts.','Hi! Fun fact: you\'re one of the few who found this.'];
        addLine(g[Math.floor(Math.random() * g.length)], 'terminal-green');
      },
      hi: function () { commands.hello(); },
      time: function () { addLine('\ud83d\udd50 ' + new Date().toLocaleString(), 'terminal-yellow'); },
      coffee: function () {
        addLine(''); addLine('    ( (', 'terminal-yellow'); addLine('     ) )', 'terminal-yellow');
        addLine('  ........', 'terminal-dim'); addLine('  |      |]', 'terminal-white');
        addLine('  \\      /', 'terminal-white'); addLine('   `----\'', 'terminal-white');
        addLine(''); addLine('Brewing... \u2615 Done! Fresh code fuel.', 'terminal-green');
      },
      matrix: function () {
        addLine('');
        var chars = '\uff8a\uff90\uff8b\uff70\uff73\uff7c\uff85\uff93\uff86\uff7b\uff9c\uff82\uff75\uff98\uff71\uff8e\uff83\uff8f\uff79\uff92\uff74\uff76\uff77\uff91\uff95\uff97\uff7e\uff88\uff7d\uff80\uff87\uff8d012345789Z';
        for (var r = 0; r < 5; r++) {
          var row = '';
          for (var c = 0; c < 40; c++) row += chars.charAt(Math.floor(Math.random() * chars.length));
          addLine(row, 'terminal-green');
        }
        addLine(''); addLine('Wake up, Neo...', 'terminal-green'); addLine('The Matrix has you.', 'terminal-green');
      },
      secret: function () {
        addLine(''); addLine('\ud83d\udd13 SECRET UNLOCKED', 'terminal-accent'); addLine('');
        addLine('"Every great story begins with a blank page.');
        addLine(' Every great website begins with a blinking');
        addLine(' cursor. We just happen to love both."');
        addLine(''); addLine('   \u2014 The Founders, Thomas Publishing House', 'terminal-purple');
      },
      flip: function () { addLine(Math.random() < 0.5 ? 'Heads! \ud83e\ude99' : 'Tails! \ud83e\ude99', 'terminal-yellow'); },
      magic8: function () {
        var a = ['It is certain.','Without a doubt.','Yes, definitely.','Reply hazy, try again.','Ask again later.','Don\'t count on it.','My sources say no.','Outlook good.','Signs point to yes.','Better not tell you now.'];
        addLine('\ud83c\udfb1 ' + a[Math.floor(Math.random() * a.length)], 'terminal-purple');
      },
      clear: function () { output.innerHTML = ''; addLine('TPH Terminal v1.0 \u2014 Type "help" for commands', 'terminal-green'); addLine('----------------------------------------------', 'terminal-dim'); },
      exit: function () { cardInner.classList.remove('terminal-active'); greenDot.classList.remove('active'); terminalOpen = false; }
    };

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var cmd = input.value.trim().toLowerCase(); input.value = '';
        if (!cmd) return;
        history.push(cmd); historyIndex = history.length;
        addLine('tph@studio:~$ ' + cmd, 'terminal-dim');
        if (commands[cmd]) { commands[cmd](); } else { addLine('Command not found: ' + cmd + '. Try "help".', 'terminal-yellow'); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); if (historyIndex > 0) { historyIndex--; input.value = history[historyIndex]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < history.length - 1) { historyIndex++; input.value = history[historyIndex]; }
        else { historyIndex = history.length; input.value = ''; }
      }
    });
    overlay.addEventListener('click', function () { input.focus(); });
  },

  // --- Chunk 11: Cookie consent + analytics ---
  function initCookieConsent() {
    function loadAnalytics() {
      var GA_ID = 'G-XXXXXXXXXX';
      if (GA_ID === 'G-XXXXXXXXXX') return;
      if (document.querySelector('script[src*="googletagmanager"]')) return;
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
      document.head.appendChild(script);
      script.onload = function () {
        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', GA_ID);
      };
    }

    if (!localStorage.getItem('cookieConsent')) {
      var banner = document.createElement('div');
      banner.className = 'cookie-consent';
      banner.innerHTML =
        '<p>We use cookies to enhance your experience and analyze site traffic. ' +
        '<a href="privacy.html">Privacy Policy</a></p>' +
        '<div class="cookie-consent-actions">' +
        '<button class="cookie-btn cookie-btn-accept">Accept</button>' +
        '<button class="cookie-btn cookie-btn-decline">Decline</button>' +
        '</div>';
      document.body.appendChild(banner);
      requestAnimationFrame(function () { requestAnimationFrame(function () { banner.classList.add('show'); }); });
      banner.querySelector('.cookie-btn-accept').addEventListener('click', function () {
        localStorage.setItem('cookieConsent', 'accepted');
        banner.classList.remove('show');
        setTimeout(function () { banner.remove(); }, 400);
        loadAnalytics();
      });
      banner.querySelector('.cookie-btn-decline').addEventListener('click', function () {
        localStorage.setItem('cookieConsent', 'declined');
        banner.classList.remove('show');
        setTimeout(function () { banner.remove(); }, 400);
      });
    } else if (localStorage.getItem('cookieConsent') === 'accepted') {
      loadAnalytics();
    }
  }

  ]); // end runChunked
}); // end DOMContentLoaded
