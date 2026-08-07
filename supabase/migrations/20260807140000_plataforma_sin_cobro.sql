-- Cuenta propia del SuperAdmin no es cliente de cobro
alter table public.empresas
  add column if not exists es_plataforma boolean not null default false;

comment on column public.empresas.es_plataforma is
  'true = empresa interna SIGOC / SuperAdmin; no aparece en cobros ni requiere pago';

update public.empresas
set es_plataforma = true
where nombre ilike '%cuenta propia%'
   or nombre ilike 'SIGOC (cuenta propia)'
   or nombre ilike 'SIGEPROC (cuenta propia)';

update public.empresas
set nombre = 'SIGOC (cuenta propia)'
where nombre ilike 'SIGEPROC (cuenta propia)';

-- Quitar suscripciones de cobro de empresas plataforma
delete from public.suscripciones s
using public.empresas e
where s.empresa_id = e.id
  and e.es_plataforma = true;

-- SuperAdmin no pertenece a una empresa cliente (bypass de suscripción)
update public.profiles
set empresa_id = null
where es_superadmin = true;
