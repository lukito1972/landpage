# Configuración del formulario de proyectos

El formulario propio envía `POST /api/contact`. La función guarda la solicitud en Supabase y notifica a `arquitectura@breeam.mx` mediante Resend.

## 1. Crear la tabla en Supabase

En el proyecto Supabase correcto, abrir **SQL Editor** y ejecutar el contenido de `database/contact_requests.sql`. Para habilitar la evidencia del consentimiento, ejecutar también `database/contact_requests_privacy.sql`.

La tabla tiene RLS activado y no concede acceso a visitantes. La función de Vercel la utiliza desde el servidor con una clave secreta, que nunca se publica en la página.

En proyectos creados recientemente, habilitar `contact_requests` en **Settings > API > Data API**. Supabase ya no expone automáticamente las tablas nuevas en la Data API.

## 2. Configurar variables en Vercel

En el proyecto Vercel correcto, agregar las variables indicadas en `.env.example` para los entornos Preview y Production:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (o, si el proyecto aún utiliza claves heredadas, `SUPABASE_SERVICE_ROLE_KEY`)
- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL`
- `CONTACT_RECIPIENT_EMAIL=arquitectura@breeam.mx`

`CONTACT_FROM_EMAIL` debe pertenecer a un dominio verificado en Resend. Para pruebas, usar el remitente de prueba permitido por la cuenta de Resend.

## 3. Probar en Preview

Hacer una solicitud desde la URL de Preview y comprobar tres resultados:

1. El visitante ve el mensaje de confirmación.
2. Se crea una fila en `contact_requests`.
3. La fila conserva la fecha UTC de aceptación y la versión del aviso.
4. Llega un correo a `arquitectura@breeam.mx` con el resumen de la aceptación y permite responder directamente al visitante.

No hay credenciales reales en estos archivos. El formulario muestra un mensaje de configuración hasta que las variables se agreguen en Vercel.
