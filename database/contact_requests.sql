-- Esquema exclusivo para el formulario de Arnauda Arquitectos.
-- Ejecutar en el proyecto Supabase nuevo antes de desplegar el sitio.

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text not null,
  message text not null,
  privacy_consent_accepted_at timestamptz,
  privacy_notice_version text,
  source text not null default 'sitio_web',
  notification_status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.contact_requests
  add column if not exists privacy_consent_accepted_at timestamptz,
  add column if not exists privacy_notice_version text,
  add column if not exists source text not null default 'sitio_web',
  add column if not exists notification_status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now();

alter table public.contact_requests enable row level security;

comment on table public.contact_requests is
  'Solicitudes de contacto del sitio web de Arnauda Arquitectos.';

comment on column public.contact_requests.privacy_consent_accepted_at is
  'Fecha y hora UTC registrada por el servidor al aceptar el aviso de privacidad.';

comment on column public.contact_requests.privacy_notice_version is
  'Identificador de la versión del aviso aceptada por la persona.';

