const MAX_BODY_BYTES = 32 * 1024;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const FORM_MIN_AGE_MS = 1500;
const FORM_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PRIVACY_NOTICE_VERSION = '2026-09-30-revision-1';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\s-]{7,25}$/;
const rateBuckets = new Map();

function getBody(request) {
  if (typeof request.body === 'string') return JSON.parse(request.body || '{}');
  return request.body || {};
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, function (character) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character];
  });
}

function fail(response, status, message) {
  response.setHeader('Cache-Control', 'no-store');
  return response.status(status).json({ message: message });
}

function getClientKey(request) {
  const forwarded = request.headers['x-forwarded-for'];
  return (forwarded ? String(forwarded).split(',')[0] : request.headers['x-real-ip'] || 'unknown').trim();
}

function isRateLimited(request) {
  const now = Date.now();
  for (const [bucketKey, bucket] of rateBuckets) {
    if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(bucketKey);
  }
  const key = getClientKey(request);
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

module.exports = async function contact(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return fail(response, 405, 'Método no permitido.');
  }

  if (isRateLimited(request)) {
    response.setHeader('Retry-After', String(Math.ceil(RATE_WINDOW_MS / 1000)));
    return fail(response, 429, 'Has enviado demasiadas solicitudes. Inténtalo más tarde o escríbenos por WhatsApp.');
  }

  const contentType = String(request.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    return fail(response, 415, 'Formato de solicitud no permitido.');
  }

  if (Number(request.headers['content-length'] || 0) > MAX_BODY_BYTES) {
    return fail(response, 413, 'La solicitud es demasiado grande.');
  }

  const origin = request.headers.origin;
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  if (!origin || !host) {
    return fail(response, 403, 'Origen no permitido.');
  }
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return fail(response, 403, 'Origen no permitido.');
    } catch (_) {
      return fail(response, 403, 'Origen no permitido.');
    }
  }

  let body;
  try {
    body = getBody(request);
  } catch (_) {
    return fail(response, 400, 'No se pudo leer la solicitud.');
  }

  if (clean(body.website, 200)) return response.status(200).json({ ok: true });

  const formStartedAt = Number(body.formStartedAt);
  const formAge = Date.now() - formStartedAt;
  if (!Number.isFinite(formStartedAt) || formAge < FORM_MIN_AGE_MS || formAge > FORM_MAX_AGE_MS) {
    return fail(response, 400, 'No se pudo validar la solicitud. Recarga la página e inténtalo de nuevo.');
  }

  if (body.privacyConsent !== true && body.privacyConsent !== 'true' && body.privacyConsent !== 'on') {
    return fail(response, 400, 'Debes aceptar el Aviso de privacidad para enviar tu solicitud.');
  }

  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const phone = clean(body.phone, 25);
  const email = clean(body.email, 254).toLowerCase();
  const message = clean(body.message, 2000);

  const urlCount = (message.match(/https?:\/\/|www\./gi) || []).length;
  if (urlCount > 2 || /(.)\1{9,}/.test(message)) {
    return fail(response, 400, 'Describe brevemente tu proyecto sin enlaces ni contenido repetido.');
  }

  if (!firstName || !lastName || !PHONE_PATTERN.test(phone) || !EMAIL_PATTERN.test(email) || message.length < 10) {
    return fail(response, 400, 'Revisa tus datos y describe brevemente tu proyecto.');
  }

  const privacyConsentAcceptedAt = new Date().toISOString();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL || 'arquitectura@breeam.mx';

  if (!supabaseUrl || !supabaseKey || !resendKey || !from) {
    return fail(response, 503, 'El formulario está en configuración. Escríbenos por WhatsApp para recibir atención inmediata.');
  }

  const record = {
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    email: email,
    message: message,
    privacy_consent_accepted_at: privacyConsentAcceptedAt,
    privacy_notice_version: PRIVACY_NOTICE_VERSION,
    source: 'sitio_web',
    notification_status: 'pending'
  };

  let stage = 'guardar en Supabase';
  try {
    const databaseResponse = await fetch(supabaseUrl.replace(/\/$/, '') + '/rest/v1/contact_requests', {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(record)
    });

    const databaseBody = await databaseResponse.text();
    if (!databaseResponse.ok) {
      throw new Error('Supabase respondio HTTP ' + databaseResponse.status + ': ' + databaseBody.slice(0, 500));
    }

    const saved = databaseBody ? JSON.parse(databaseBody) : [];
    const requestId = saved[0] && saved[0].id;
    const safeName = escapeHtml(firstName + ' ' + lastName);
    const safePhone = escapeHtml(phone);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const safeConsentAcceptedAt = escapeHtml(privacyConsentAcceptedAt);
    const safePrivacyNoticeVersion = escapeHtml(PRIVACY_NOTICE_VERSION);

    stage = 'enviar notificación con Resend';
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
        'User-Agent': 'arnauda-arquitectos-contact-form/1.0'
      },
      body: JSON.stringify({
        from: from,
        to: [recipient],
        reply_to: email,
        subject: 'Nueva solicitud de proyecto: ' + firstName + ' ' + lastName,
        html: '<h2>Nueva solicitud desde el sitio web</h2>' +
          '<p><strong>Nombre:</strong> ' + safeName + '</p>' +
          '<p><strong>Teléfono:</strong> ' + safePhone + '</p>' +
          '<p><strong>Correo:</strong> ' + safeEmail + '</p>' +
          '<p><strong>Proyecto:</strong><br>' + safeMessage + '</p>' +
          '<hr><p><strong>Aviso de privacidad:</strong> aceptado</p>' +
          '<p><strong>Fecha de aceptación registrada por el servidor:</strong> ' + safeConsentAcceptedAt + '</p>' +
          '<p><strong>Versión del aviso:</strong> ' + safePrivacyNoticeVersion + '</p>'
      })
    });

    if (!emailResponse.ok) {
      const emailBody = await emailResponse.text();
      throw new Error('Resend respondio HTTP ' + emailResponse.status + ': ' + emailBody.slice(0, 500));
    }

    if (requestId) {
      await fetch(supabaseUrl.replace(/\/$/, '') + '/rest/v1/contact_requests?id=eq.' + encodeURIComponent(requestId), {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: 'Bearer ' + supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_status: 'sent' })
      });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Contact form error:', {
      stage: stage,
      message: error.message,
      cause: error.cause && error.cause.message ? error.cause.message : undefined,
      supabaseHost: supabaseUrl ? new URL(supabaseUrl).host : undefined
    });
    return fail(response, 503, 'No fue posible enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.');
  }
};
