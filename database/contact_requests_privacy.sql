-- Ejecutar una sola vez en el proyecto Supabase de Arnauda Arquitectos.
-- Permite conservar evidencia técnica de la aceptación del aviso.

alter table if exists public.contact_requests
  add column if not exists privacy_consent_accepted_at timestamptz,
  add column if not exists privacy_notice_version text;

comment on column public.contact_requests.privacy_consent_accepted_at is
  'Fecha y hora UTC registrada por el servidor al aceptar el aviso de privacidad.';

comment on column public.contact_requests.privacy_notice_version is
  'Identificador de la versión del aviso aceptada por la persona.';
