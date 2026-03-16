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

  // ========== Easter Egg Terminal ==========
  (function () {
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
        addLine('  help      — Show this list');
        addLine('  about     — About Thomas Publishing House');
        addLine('  skills    — What we do');
        addLine('  hello     — Say hi');
        addLine('  time      — Current time');
        addLine('  coffee    — Brew some coffee');
        addLine('  matrix    — Take the red pill');
        addLine('  secret    — ???');
        addLine('  flip      — Flip a coin');
        addLine('  magic8    — Ask the magic 8-ball');
        addLine('  clear     — Clear terminal');
        addLine('  exit      — Close terminal');
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
        var skills = [
          ['Web Development', 95],
          ['Brand Storytelling', 90],
          ['Digital Strategy', 88],
          ['Content & SEO', 92],
          ['Social Media', 85]
        ];
        skills.forEach(function (s) {
          var bar = '';
          var filled = Math.round(s[1] / 5);
          for (var i = 0; i < 20; i++) bar += i < filled ? '█' : '░';
          addHTML('<span class="terminal-cyan">' + s[0].padEnd(20) + '</span> <span class="terminal-green">' + bar + '</span> <span class="terminal-yellow">' + s[1] + '%</span>');
        });
      },
      hello: function () {
        var greetings = [
          'Hey there! 👋 Welcome to the hidden terminal.',
          'Oh hello! You found the secret. Impressive.',
          'Greetings, curious human. You have good instincts.',
          'Hi! Fun fact: you\'re one of the few who found this.'
        ];
        addLine(greetings[Math.floor(Math.random() * greetings.length)], 'terminal-green');
      },
      hi: function () { commands.hello(); },
      time: function () {
        addLine('🕐 ' + new Date().toLocaleString(), 'terminal-yellow');
      },
      coffee: function () {
        addLine('');
        addLine('    ( (', 'terminal-yellow');
        addLine('     ) )', 'terminal-yellow');
        addLine('  ........', 'terminal-dim');
        addLine('  |      |]', 'terminal-white');
        addLine('  \\      /', 'terminal-white');
        addLine('   `----\'', 'terminal-white');
        addLine('');
        addLine('Brewing... ☕ Done! Fresh code fuel.', 'terminal-green');
      },
      matrix: function () {
        addLine('');
        var chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789Z';
        for (var r = 0; r < 5; r++) {
          var row = '';
          for (var c = 0; c < 40; c++) {
            row += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          addLine(row, 'terminal-green');
        }
        addLine('');
        addLine('Wake up, Neo...', 'terminal-green');
        addLine('The Matrix has you.', 'terminal-green');
      },
      secret: function () {
        addLine('');
        addLine('🔓 SECRET UNLOCKED', 'terminal-accent');
        addLine('');
        addLine('"Every great story begins with a blank page.');
        addLine(' Every great website begins with a blinking');
        addLine(' cursor. We just happen to love both."');
        addLine('');
        addLine('   — The Founders, Thomas Publishing House', 'terminal-purple');
      },
      flip: function () {
        var result = Math.random() < 0.5 ? 'Heads! 🪙' : 'Tails! 🪙';
        addLine(result, 'terminal-yellow');
      },
      magic8: function () {
        var answers = [
          'It is certain.', 'Without a doubt.', 'Yes, definitely.',
          'Reply hazy, try again.', 'Ask again later.',
          'Don\'t count on it.', 'My sources say no.',
          'Outlook good.', 'Signs point to yes.',
          'Better not tell you now.'
        ];
        addLine('🎱 ' + answers[Math.floor(Math.random() * answers.length)], 'terminal-purple');
      },
      clear: function () {
        output.innerHTML = '';
        addLine('TPH Terminal v1.0 — Type "help" for commands', 'terminal-green');
        addLine('----------------------------------------------', 'terminal-dim');
      },
      exit: function () {
        cardInner.classList.remove('terminal-active');
        greenDot.classList.remove('active');
        terminalOpen = false;
      }
    };

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var cmd = input.value.trim().toLowerCase();
        input.value = '';
        if (!cmd) return;

        history.push(cmd);
        historyIndex = history.length;
        addLine('tph@studio:~$ ' + cmd, 'terminal-dim');

        if (commands[cmd]) {
          commands[cmd]();
        } else {
          addLine('Command not found: ' + cmd + '. Try "help".', 'terminal-yellow');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          input.value = history[historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          historyIndex++;
          input.value = history[historyIndex];
        } else {
          historyIndex = history.length;
          input.value = '';
        }
      }
    });

    // Click anywhere on terminal to focus input
    overlay.addEventListener('click', function () {
      input.focus();
    });
  })();

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
