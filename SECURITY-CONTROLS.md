# Controles de seguridad proporcionales

Este sitio es un sitio informativo de bajo tráfico con un formulario de contacto. Estos controles priorizan una superficie pequeña, bajo costo y facilidad de mantenimiento.

## Controles activos

- La API acepta únicamente `POST` con `application/json`.
- Las solicitudes del navegador deben incluir un origen válido coincidente con el dominio servido.
- El cuerpo está limitado a 32 KB y los campos tienen límites de longitud y formato.
- El formulario exige consentimiento de privacidad, honeypot y un tiempo mínimo de interacción.
- El límite actual es de 5 solicitudes por IP en 15 minutos por instancia de la función.
- Los mensajes enviados por correo se escapan antes de insertarse en HTML.
- Las claves permanecen en variables protegidas de Vercel y no se guardan en el repositorio.
- Se publican encabezados de seguridad y una política CSP en modo `Report-Only` para detectar incompatibilidades sin romper el sitio.

## Límites aceptados para el tamaño actual

El rate limiting en memoria es suficiente como control básico para tráfico pequeño, pero no es global entre instancias serverless. Si el tráfico o el abuso aumentan, el siguiente paso será activar Vercel Firewall/Rate Limiting o Turnstile, sin exponer secretos en el cliente.

## Datos de contacto

Las solicitudes contienen datos personales y deben conservarse únicamente durante el tiempo necesario para dar seguimiento comercial. La eliminación periódica y cualquier solicitud de acceso o supresión deben gestionarse en Supabase antes de ampliar el volumen de captación.
