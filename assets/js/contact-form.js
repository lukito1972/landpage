(function () {
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;

  var status = form.querySelector('[data-form-status]');
  var submit = form.querySelector('button[type="submit"]');

  function setStatus(message, type) {
    status.textContent = message;
    status.className = 'form-status' + (type ? ' is-' + type : '');
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var values = Object.fromEntries(new FormData(form).entries());
    submit.disabled = true;
    setStatus('Enviando tu solicitud…', 'loading');

    try {
      var response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(values)
      });
      var result = await response.json().catch(function () { return {}; });

      if (!response.ok) {
        throw new Error(result.message || 'No fue posible enviar tu solicitud. Inténtalo de nuevo.');
      }

      form.reset();
      setStatus('Gracias. Recibimos tu solicitud y te contactaremos pronto.', 'success');
    } catch (error) {
      setStatus(error.message || 'No fue posible enviar tu solicitud. Inténtalo de nuevo.', 'error');
    } finally {
      submit.disabled = false;
    }
  });
})();
