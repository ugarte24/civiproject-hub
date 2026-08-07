-- Precios Esencial: Bs 500/mes, Bs 5500/año; usuarios ilimitados; marcar pagado por periodo

alter table public.suscripciones
  add column if not exists periodo text not null default 'mensual'
    check (periodo in ('mensual', 'anual'));

alter table public.suscripciones
  add column if not exists precio_anual numeric(12,2) not null default 5500;

-- Precio mensual por defecto 500; max_usuarios alto = sin límite práctico
update public.suscripciones
set
  precio_mensual = 500,
  precio_anual = 5500,
  max_usuarios = 999999
where true;

alter table public.suscripciones
  alter column precio_mensual set default 500;

alter table public.suscripciones
  alter column max_usuarios set default 999999;

create or replace function public.marcar_pagado_suscripcion(p_suscripcion_id uuid)
returns public.suscripciones
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.suscripciones;
  base date;
  dias int;
begin
  if not public.is_superadmin() then
    raise exception 'Solo SuperAdmin puede marcar pagos';
  end if;

  select * into row from public.suscripciones where id = p_suscripcion_id for update;
  if not found then
    raise exception 'Suscripción no encontrada';
  end if;

  dias := case when row.periodo = 'anual' then 365 else 30 end;
  base := greatest(row.fecha_fin, current_date);

  update public.suscripciones
  set
    fecha_inicio = case when row.fecha_fin < current_date then current_date else row.fecha_inicio end,
    fecha_fin = base + dias,
    estado = 'activa',
    updated_at = now()
  where id = p_suscripcion_id
  returning * into row;

  return row;
end;
$$;

grant execute on function public.marcar_pagado_suscripcion(uuid) to authenticated;

-- Onboard: crear empresa + suscripción (solo superadmin)
create or replace function public.onboard_empresa(
  p_nombre_empresa text,
  p_periodo text default 'mensual',
  p_nit text default null
)
returns table (
  empresa_id uuid,
  suscripcion_id uuid,
  fecha_fin date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_sub uuid;
  v_fin date;
  v_periodo text;
begin
  if not public.is_superadmin() then
    raise exception 'Solo SuperAdmin puede dar de alta empresas';
  end if;

  if p_nombre_empresa is null or length(trim(p_nombre_empresa)) < 2 then
    raise exception 'Nombre de empresa inválido';
  end if;

  v_periodo := case when p_periodo = 'anual' then 'anual' else 'mensual' end;
  v_fin := current_date + case when v_periodo = 'anual' then 365 else 30 end;

  insert into public.empresas (nombre, nit)
  values (trim(p_nombre_empresa), nullif(trim(coalesce(p_nit, '')), ''))
  returning id into v_empresa;

  insert into public.suscripciones (
    empresa_id, plan, periodo, precio_mensual, precio_anual,
    max_usuarios, fecha_inicio, fecha_fin, estado
  )
  values (
    v_empresa, 'esencial', v_periodo, 500, 5500,
    999999, current_date, v_fin, 'activa'
  )
  returning id into v_sub;

  return query select v_empresa, v_sub, v_fin;
end;
$$;

grant execute on function public.onboard_empresa(text, text, text) to authenticated;
