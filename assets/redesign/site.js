(() => {
  'use strict';

  document.querySelectorAll('[data-year]').forEach((year) => {
    year.textContent = new Date().getFullYear();
  });

  for (const trigger of document.querySelectorAll('[data-enquiry], [data-book]')) {
    trigger.addEventListener('click', () => {
      const target = document.getElementById(trigger.hash.slice(1));
      const disclosure = target?.closest('section')?.querySelector('details');
      if (!disclosure) return;
      disclosure.open = true;
      const choice = disclosure.querySelector('select[name="intake"]');
      if (choice && trigger.dataset.enquiry) {
        choice.value = trigger.dataset.enquiry;
        choice.dispatchEvent(new Event('change'));
      }
      disclosure.querySelector('summary')?.focus({ preventScroll: true });
    });
  }

  const summaryHelp = document.getElementById('aa-summary-help');
  const intake = document.querySelector('.aa-form select[name="intake"]');
  const defaultHelp = summaryHelp?.textContent;
  if (summaryHelp && intake) {
    const helpByOffer = {
      diagnostic: 'Tell Ajoke what is slowing your sales and include any important timing.',
      implementation: 'Share what you have already assessed and where you need implementation support.',
    };
    intake.addEventListener('change', () => {
      summaryHelp.textContent = helpByOffer[intake.value] || defaultHelp;
    });
  }

  // Netlify strips data-netlify when it processes forms at deploy, so match on the class
  for (const form of document.querySelectorAll('.aa-form')) {
    const submit = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[role="status"]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled || !form.reportValidity()) return;
      const data = new FormData(form);
      if (String(data.get('website') || '').trim()) return;
      submit.disabled = true;
      status.textContent = 'Sending your enquiry…';
      try {
        const result = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data),
        });
        if (!result.ok) throw new Error('Submission failed');
        form.reset();
        intake?.dispatchEvent(new Event('change'));
        status.textContent = 'Thank you. Your enquiry has been sent to Ajoke.';
      } catch {
        status.textContent = 'Your enquiry could not be sent. Please try again or email ajoke@ajoketella.com.';
      } finally {
        submit.disabled = false;
      }
    });
  }
})();
