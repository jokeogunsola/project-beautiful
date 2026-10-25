/* Ajoke Tella site behaviour. Plain JavaScript, no dependencies. */
(function () {
  'use strict';

  // ---- Settings to fill in at launch ---------------------------------------------------
  var CONFIG = {
    // Leave empty to use Netlify Forms (the default). Only set this to send to a different form service.
    formEndpoint: '',
    // Fallback address shown if sending fails. Fill in when the address is live.
    contactEmail: '',
    // Privacy-friendly analytics (Plausible: no cookies, no personal data, no banner needed).
    // Loads only on the live domain, so testing does not count as visits.
    analytics: { provider: 'plausible', domain: 'ajoketella.com', liveHosts: ['ajoketella.com', 'www.ajoketella.com'] }
  };
  // ---------------------------------------------------------------------------------------

  var doc = document.documentElement;
  doc.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Form delivery: Netlify Forms on the deployed site (submissions are emailed from the Netlify dashboard),
     a custom endpoint if CONFIG.formEndpoint is set, and a pretend send on a local preview */
  function sendForm(data) {
    var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
    if (CONFIG.formEndpoint) {
      return fetch(CONFIG.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('Send failed'); });
    }
    if (isLocal) return new Promise(function (res) { setTimeout(res, 600); });
    return fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() })
      .then(function (r) { if (!r.ok) throw new Error('Send failed'); });
  }

  /* Analytics: load the script on the live site only, and record a few meaningful actions */
  function track(name, props) {
    if (typeof window.plausible === 'function') window.plausible(name, props ? { props: props } : undefined);
  }
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
  document.querySelectorAll('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () { track(el.getAttribute('data-track')); });
  });

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* Header: hairline once scrolled */
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile menu: opens below the header, closes on Escape, link click or outside click */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('mobile-menu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;
    if (open) { var first = menu.querySelector('a'); if (first) first.focus(); }
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (toggle.getAttribute('aria-expanded') === 'true' && !header.contains(e.target)) setMenu(false);
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1080 && !menu.hidden) setMenu(false); });

  /* Highlight the nav link for the section in view */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.primary-nav a'));
  if ('IntersectionObserver' in window) {
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['approach', 'offers', 'about', 'contact'].forEach(function (id) { var s = document.getElementById(id); if (s) sectionObs.observe(s); });
  }

  /* Doors: all three situations sit in the page; the guide on the left lights up whichever one is in view */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.door-step'));
  var doorCards = Array.prototype.slice.call(document.querySelectorAll('.door-card'));
  var offers = Array.prototype.slice.call(document.querySelectorAll('.offer'));

  function markDoor(key) {
    steps.forEach(function (s) {
      if (s.getAttribute('data-door') === key) s.setAttribute('aria-current', 'step');
      else s.removeAttribute('aria-current');
    });
    doorCards.forEach(function (c) { c.classList.toggle('current', c.getAttribute('data-door') === key); });
  }
  function chooseDoor(key, label) {
    offers.forEach(function (o) { o.classList.toggle('match', o.getAttribute('data-doors').split(' ').indexOf(key) > -1); });
    track('Door selected', { door: label });
  }
  steps.forEach(function (step) {
    step.addEventListener('click', function () {
      markDoor(step.getAttribute('data-door'));
      chooseDoor(step.getAttribute('data-door'), step.querySelector('.door-num').textContent.replace(/^\d+\s*\W\s*/, ''));
    });
  });
  if (doorCards.length) {
    markDoor(doorCards[0].getAttribute('data-door'));
    if ('IntersectionObserver' in window) {
      // A thin band across the middle of the screen: whichever situation crosses it is the current one
      var doorObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) markDoor(en.target.getAttribute('data-door')); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      doorCards.forEach(function (c) { doorObs.observe(c); });
    }
  }

  /* Pre-fill the enquiry form from "This is us" and "Ask about this" */
  var form = document.getElementById('enquiry');
  if (form) {
  var note = document.getElementById('prefill-note');
  var offerField = document.getElementById('f-offer');
  document.querySelectorAll('[data-intake]').forEach(function (link) {
    link.addEventListener('click', function () {
      var value = link.getAttribute('data-intake');
      var intakeSelect = document.getElementById('f-intake');
      if ([].some.call(intakeSelect.options, function (o) { return o.value === value; })) { intakeSelect.value = value; clearError('intake'); }
      var offer = link.getAttribute('data-offer') || '';
      var door = link.getAttribute('data-door-cta') || '';
      offerField.value = offer || (door ? 'Door: ' + door : '');
      note.textContent = offer ? 'You are asking about: ' + offer + '. I have chosen "' + value + '" below; change it if you like.'
                               : 'Thanks. I have chosen "' + value + '" below; change it if you like.';
      track(door ? 'This is us' : 'Ask about offer', door ? { door: door } : { offer: offer });
      // After the scroll, put the cursor in the first empty required field
      setTimeout(function () {
        var firstEmpty = ['f-name', 'f-email', 'f-company'].map(function (id) { return document.getElementById(id); })
          .filter(function (el) { return !el.value; })[0];
        if (firstEmpty) firstEmpty.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 650);
    });
  });

  /* Form validation and sending */
  var messages = {
    name: 'Please add your name.',
    email: 'Please add a work email I can reply to, for example name@company.com.',
    company: 'Please add your company name.',
    intake: 'Please choose what you are looking for, or pick "Something else".'
  };
  function setError(key, msg) {
    var err = document.getElementById('e-' + key);
    err.textContent = msg;
    var target = document.getElementById('f-' + key);
    target.setAttribute('aria-invalid', 'true');
  }
  function clearError(key) {
    var err = document.getElementById('e-' + key);
    if (err) err.textContent = '';
    var target = document.getElementById('f-' + key);
    if (target) target.removeAttribute('aria-invalid');
  }
  ['name', 'email', 'company'].forEach(function (k) {
    document.getElementById('f-' + k).addEventListener('input', function () { clearError(k); });
  });
  document.getElementById('f-intake').addEventListener('change', function () { clearError('intake'); });

  function validate() {
    var ok = true, firstBad = null;
    ['name', 'email', 'company', 'intake'].forEach(clearError); // autofill does not fire input events
    var name = document.getElementById('f-name'), email = document.getElementById('f-email'), company = document.getElementById('f-company');
    if (!name.value.trim()) { setError('name', messages.name); ok = false; firstBad = firstBad || name; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { setError('email', messages.email); ok = false; firstBad = firstBad || email; }
    if (!company.value.trim()) { setError('company', messages.company); ok = false; firstBad = firstBad || company; }
    var intake = document.getElementById('f-intake');
    if (!intake.value) { setError('intake', messages.intake); ok = false; firstBad = firstBad || intake; }
    if (firstBad) firstBad.focus();
    return ok;
  }

  var status = document.getElementById('form-status');
  var submit = form.querySelector('.btn-submit');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.className = 'form-status'; status.textContent = '';
    if (!validate()) return;
    if (document.getElementById('f-website').value) return; // spam trap filled: drop silently

    submit.disabled = true; submit.textContent = 'Sending';
    var data = new FormData(form);
    data.delete('website');

    var send = sendForm(data);

    send.then(function () {
      form.reset(); note.textContent = ''; offerField.value = '';
      status.className = 'form-status ok';
      status.textContent = 'Thank you. Your message is with me, and I will be in touch.';
      track('Enquiry sent');
    }).catch(function () {
      status.className = 'form-status fail';
      status.textContent = 'Your message did not send. Please try again' +
        (CONFIG.contactEmail ? ', or email ' + CONFIG.contactEmail + '.' : ' shortly.');
    }).then(function () {
      submit.disabled = false; submit.textContent = 'Send enquiry';
      status.focus && status.setAttribute('tabindex', '-1');
    });
  });

  }

  /* Speaking and hosting invitations (Speak page) */
  var invite = document.getElementById('invite');
  if (invite) {
    var inviteMsgs = {
      'i-name': 'Please add your name.',
      'i-email': 'Please add an email address I can reply to, for example name@organisation.com.',
      'i-org': 'Please add your organisation.',
      'i-event': 'Please add the name or theme of the event.'
    };
    var inviteStatus = document.getElementById('invite-status');
    var inviteBtn = invite.querySelector('.btn-submit');
    function iErr(id, msg) {
      var f = document.getElementById(id), e = document.getElementById(id + '-e');
      e.textContent = msg || '';
      if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
    }
    Object.keys(inviteMsgs).forEach(function (id) { document.getElementById(id).addEventListener('input', function () { iErr(id); }); });
    invite.addEventListener('submit', function (e) {
      e.preventDefault();
      inviteStatus.className = 'form-status'; inviteStatus.textContent = '';
      var first = null;
      Object.keys(inviteMsgs).forEach(function (id) {
        var f = document.getElementById(id), v = f.value.trim();
        var bad = !v || (id === 'i-email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v));
        iErr(id, bad ? inviteMsgs[id] : '');
        if (bad && !first) first = f;
      });
      if (first) { first.focus(); return; }
      if (document.getElementById('i-website').value) return;
      inviteBtn.disabled = true; inviteBtn.textContent = 'Sending';
      var data = new FormData(invite); data.delete('website');
      var send = sendForm(data);
      send.then(function () {
        invite.reset();
        inviteStatus.className = 'form-status ok';
        inviteStatus.textContent = 'Thank you. Ajoke reviews every invitation personally and will be in touch.';
        track('Invitation sent');
      }).catch(function () {
        inviteStatus.className = 'form-status fail';
        inviteStatus.textContent = 'Your invitation did not send. Please try again' + (CONFIG.contactEmail ? ', or email ' + CONFIG.contactEmail + '.' : ' shortly.');
      }).then(function () { inviteBtn.disabled = false; inviteBtn.textContent = 'Send invitation'; });
    });
  }

  /* Insights subscribe: email and an unticked consent box are required */
  Array.prototype.slice.call(document.querySelectorAll('form.subscribe')).forEach(function (sub) {
    var email = sub.querySelector('input[type="email"]'), consent = sub.querySelector('input[type="checkbox"]');
    var st = sub.querySelector('.form-status'), btn = sub.querySelector('button[type="submit"]');
    function mark(f, msg) {
      var e = document.getElementById(f.id + '-e'); e.textContent = msg || '';
      if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
    }
    email.addEventListener('input', function () { mark(email); });
    consent.addEventListener('change', function () { mark(consent); });
    sub.addEventListener('submit', function (e) {
      e.preventDefault();
      st.className = 'form-status'; st.textContent = '';
      var badEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
      mark(email, badEmail ? 'Please add an email address, for example name@company.com.' : '');
      mark(consent, consent.checked ? '' : 'Please tick the box to confirm you would like to receive new insights.');
      if (badEmail) { email.focus(); return; }
      if (!consent.checked) { consent.focus(); return; }
      if (sub.querySelector('input[name="website"]').value) return;
      btn.disabled = true; btn.textContent = 'Subscribing';
      var data = new FormData(sub); data.delete('website');
      sendForm(data).then(function () {
        sub.reset();
        st.className = 'form-status ok';
        st.textContent = 'Thank you. You are on the list for new insights. To unsubscribe at any time, email ajoke@ajoketella.com with the subject "Unsubscribe".';
        track('Subscribed');
      }).catch(function () {
        st.className = 'form-status fail';
        st.textContent = 'That did not go through. Please try again shortly.';
      }).then(function () { btn.disabled = false; btn.textContent = 'Subscribe'; });
    });
  });

  /* Reveal sections and breakout bars as they arrive */
  if ('IntersectionObserver' in window && !reduceMotion) {
    var targets = document.querySelectorAll('.section-head, .door-card, .diag-grid, .offer, .steps li, .ledger-row, .about-grid > *, .notes-grid > *, .contact-grid > *, .diag-bar, .contact-bar, .proof-grid li, .card, .topics li, .note-list li, .faq, .invited > *, .timeline li, .speak-band-grid > *, .cities > *');
    targets.forEach(function (t) { t.classList.add('reveal'); });
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t) { revealObs.observe(t); });
  }
})();
