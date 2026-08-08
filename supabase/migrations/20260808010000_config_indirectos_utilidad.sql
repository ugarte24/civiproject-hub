-- Porcentajes por defecto para APU (indirectos y utilidad)
alter table public.configuracion_empresa
  add column if not exists costo_indirecto_pct numeric(8,4) not null default 12,
  add column if not exists utilidad_pct numeric(8,4) not null default 10;

comment on column public.configuracion_empresa.costo_indirecto_pct is
  'Porcentaje de costo indirecto por defecto al crear un APU';
comment on column public.configuracion_empresa.utilidad_pct is
  'Porcentaje de utilidad por defecto al crear un APU';
