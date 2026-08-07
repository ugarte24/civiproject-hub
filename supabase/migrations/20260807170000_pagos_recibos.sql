-- Historial de pagos SaaS + recibo al marcar pagado

create sequence if not exists public.pagos_numero_seq;

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  suscripcion_id uuid not null references public.suscripciones (id) on delete cascade,
  numero text not null unique,
  periodo text not null check (periodo in ('mensual', 'anual')),
  monto numeric(12, 2) not null,
  moneda text not null default 'BOB',
  fecha_pago date not null default current_date,
  vigencia_desde date not null,
  vigencia_hasta date not null,
  metodo text not null default 'transferencia_qr',
  notas text,
  registrado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pagos_empresa_id_idx on public.pagos (empresa_id);
create index if not exists pagos_fecha_pago_idx on public.pagos (fecha_pago desc);
create index if not exists pagos_suscripcion_id_idx on public.pagos (suscripcion_id);

alter table public.pagos enable row level security;

drop policy if exists pagos_select_super on public.pagos;
create policy pagos_select_super on public.pagos
  for select to authenticated
  using (
    public.is_superadmin()
    or empresa_id = (select empresa_id from public.profiles where id = auth.uid())
  );

drop policy if exists pagos_write_super on public.pagos;
create policy pagos_write_super on public.pagos
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Marcar pagado: extiende vigencia e inserta pago (recibo)
drop function if exists public.marcar_pagado_suscripcion(uuid);

create or replace function public.marcar_pagado_suscripcion(p_suscripcion_id uuid)
returns public.pagos
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.suscripciones;
  base date;
  dias int;
  v_desde date;
  v_hasta date;
  v_monto numeric(12, 2);
  v_numero text;
  v_pago public.pagos;
begin
  if not public.is_superadmin() then
    raise exception 'Solo SuperAdmin puede marcar pagos';
  end if;

  select * into row from public.suscripciones where id = p_suscripcion_id for update;
  if not found then
    raise exception 'Suscripción no encontrada';
  end if;

  if exists (
    select 1 from public.empresas e
    where e.id = row.empresa_id and coalesce(e.es_plataforma, false) = true
  ) then
    raise exception 'No se registra pago de empresa plataforma';
  end if;

  dias := case when row.periodo = 'anual' then 365 else 30 end;
  v_monto := case when row.periodo = 'anual' then row.precio_anual else row.precio_mensual end;
  base := greatest(row.fecha_fin, current_date);
  v_desde := case when row.fecha_fin < current_date then current_date else row.fecha_inicio end;
  v_hasta := base + dias;

  update public.suscripciones
  set
    fecha_inicio = v_desde,
    fecha_fin = v_hasta,
    estado = 'activa',
    updated_at = now()
  where id = p_suscripcion_id
  returning * into row;

  v_numero := 'REC-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.pagos_numero_seq')::text, 5, '0');

  insert into public.pagos (
    empresa_id,
    suscripcion_id,
    numero,
    periodo,
    monto,
    moneda,
    fecha_pago,
    vigencia_desde,
    vigencia_hasta,
    metodo,
    registrado_por
  )
  values (
    row.empresa_id,
    row.id,
    v_numero,
    row.periodo,
    v_monto,
    'BOB',
    current_date,
    v_desde,
    v_hasta,
    'transferencia_qr',
    auth.uid()
  )
  returning * into v_pago;

  return v_pago;
end;
$$;

grant execute on function public.marcar_pagado_suscripcion(uuid) to authenticated;

grant usage, select on sequence public.pagos_numero_seq to authenticated;
grant select on public.pagos to authenticated;
