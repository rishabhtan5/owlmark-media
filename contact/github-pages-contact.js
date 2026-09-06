(() => {
  const form = document.querySelector('#owlmark-contact-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    if (!form.hasAttribute('data-static-contact')) return;
    event.preventDefault();
    const message = form.querySelector('.form-message');
    if (message) {
      message.className = 'form-message is-error';
      message.textContent = 'Direct form email is not available on GitHub Pages yet. Please email info@owlmarkmedia.in.';
    }
  });
})();
