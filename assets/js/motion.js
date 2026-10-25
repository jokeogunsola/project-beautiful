/* Ajoke Tella: the hook, London and Lagos clocks, reading bar, proof count-up and the live pipeline.
   Everything here is decoration on top of complete content: with JavaScript off or less motion requested, the page reads in full. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* London. Lagos. The real local time in each city */
  var clocks = Array.prototype.slice.call(document.querySelectorAll('time[data-tz]'));
  function tick() {
    var now = new Date();
    clocks.forEach(function (t) {
      try {
        t.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: t.getAttribute('data-tz') }).format(now);
      } catch (e) { t.textContent = ''; }
    });
  }
  if (clocks.length) { tick(); setInterval(tick, 30000); }

  /* The hook: once the headline has risen, the three dependencies are struck out and the bar breaks out */
  var hook = document.querySelector('.hook');
  if (hook && !reduce) {
    setTimeout(function () { hook.classList.add('go'); }, 900);
  } else if (hook) { hook.classList.add('go'); }

  /* Reading bar under the header */
  var bar = document.querySelector('.read-bar');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var max = root.scrollHeight - innerHeight;
    if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max) : 0);
    fillSteps();
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* Method: the four stages light up as you read past them */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.method .steps li'));
  var stepsBox = document.querySelector('.method .steps');
  function fillSteps() {
    if (!stepsBox || reduce) return;
    var r = stepsBox.getBoundingClientRect();
    var cols = getComputedStyle(stepsBox).gridTemplateColumns.split(' ').length;
    steps.forEach(function (li, i) {
      if (cols < 4) { li.classList.toggle('on', li.getBoundingClientRect().top < innerHeight * 0.75); return; }
      var p = (innerHeight * 0.9 - r.top) / (innerHeight * 0.45);
      li.classList.toggle('on', p > i / 4 + 0.05);
    });
  }
  window.addEventListener('resize', onScroll);
  onScroll();

  /* Proof: figures count up once, and always land on the real figure */
  var figs = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (!reduce && 'IntersectionObserver' in window) {
    var fobs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        fobs.unobserve(en.target);
        var el = en.target, final = el.textContent, m = final.match(/(\d+)/);
        if (!m || document.hidden) return;
        var target = +m[1], start = performance.now(), dur = 1300;
        el.setAttribute('aria-label', final);
        setTimeout(function () { el.textContent = final; }, dur + 400);
        (function step(now) {
          var p = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - p, 4);
          el.textContent = final.replace(m[1], String(Math.round(target * eased)));
          if (p < 1) requestAnimationFrame(step); else el.textContent = final;
        })(start);
      });
    }, { threshold: 0.6 });
    figs.forEach(function (f) { fobs.observe(f); });
  }

  /* The pipeline: opportunities move through her four stages; the ones that close leave as the breakout bar */
  var svg = document.getElementById('pipe');
  if (svg) {
    var NS = 'http://www.w3.org/2000/svg', S = 0.465;
    var GATES = [40, 190, 340, 490], NAMES = ['Listen', 'Diagnose', 'Build', 'Hand over'];
    var CY = 300, END = 760;
    var el = function (tag, attrs, parent) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n); return n;
    };
    var spread = function (x) { return x <= 490 ? 190 - (x / 490) * 160 : Math.max(0, 30 - (x - 490) * 0.6); };
    el('polygon', { 'class': 'funnel', points: '0,110 490,270 540,300 490,330 0,490' });
    GATES.forEach(function (x, i) {
      el('line', { 'class': 'gate', x1: x, y1: 84, x2: x, y2: 500 });
      el('text', { 'class': 'gate-num', x: x, y: 34 }).textContent = '0' + (i + 1);
      el('text', { 'class': 'gate-label', x: x, y: 62 }).textContent = NAMES[i];
    });
    var layer = el('g', {});
    var LANES = [-0.86, -0.58, -0.29, 0, 0.29, 0.58, 0.86];
    var deals = [], recent = [], clock = 0, nextSpawn = 0;
    var spawn = function () {
      var lane;
      do { lane = Math.floor(Math.random() * LANES.length); } while (recent.indexOf(lane) !== -1);
      recent.push(lane); if (recent.length > 3) recent.shift();
      deals.push({ x: 0, o: LANES[lane], out: 0, gate: 1, node: el('polygon', { 'class': 'deal' }, layer) });
    };
    var step = function (dt) {
      clock += dt;
      if (clock >= nextSpawn) { spawn(); nextSpawn = clock + 0.55 + Math.random() * 0.5; }
      for (var i = deals.length - 1; i >= 0; i--) {
        var d = deals[i];
        if (d.out) {
          d.out += dt; d.drop = (d.drop || 0) + dt * 40;
          if (d.out > 1.1) { d.node.remove(); deals.splice(i, 1); }
          continue;
        }
        d.x += dt * (d.x > 490 ? 150 : 72);
        if (d.gate < 3 && d.x >= GATES[d.gate]) {
          if (Math.random() < 0.24) { d.out = 0.001; d.node.classList.add('out'); }
          d.gate++;
        }
        if (d.x > END) { d.node.remove(); deals.splice(i, 1); }
      }
    };
    var draw = function () {
      deals.forEach(function (d) {
        var h = 12, w = 34 + Math.max(0, d.x - 470) * 1.1;
        var y = CY + d.o * spread(d.x) + (d.drop || 0) - h / 2, x0 = d.x - w;
        d.node.setAttribute('points', x0 + ',' + y + ' ' + d.x + ',' + y + ' ' + (d.x - h * S) + ',' + (y + h) + ' ' + x0 + ',' + (y + h));
        d.node.style.opacity = d.out ? Math.max(0, 1 - d.out) : '';
        if (!d.out && d.x > 470 && !d.won) { d.won = true; d.node.classList.add('won'); }
      });
    };
    for (var t = 0; t < 360; t++) step(1 / 30);   // start full, so the still frame reads too
    draw();

    var pauseBtn = document.querySelector('[data-pause]');
    var paused = false, visible = true, last = 0, raf = 0;
    var loop = function (now) {
      raf = 0;
      if (paused || !visible || document.hidden) { last = 0; return; }
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      step(dt); draw();
      raf = requestAnimationFrame(loop);
    };
    var kick = function () { if (!raf && !paused && visible && !reduce) raf = requestAnimationFrame(loop); };
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      paused = !paused;
      pauseBtn.setAttribute('aria-pressed', String(paused));
      pauseBtn.textContent = paused ? 'Play motion' : 'Pause motion';
      kick();
    });
    if (!reduce) {
      document.addEventListener('visibilitychange', kick);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(svg);
      kick();
    }
  }
})();
