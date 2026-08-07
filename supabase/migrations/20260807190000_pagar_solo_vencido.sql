-- Solo permitir marcar pagado si la suscripción ya venció
create or replace function public.marcar_pagado_suscripcion(p_suscripcion_id uuid)
returns public.pagos
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.suscripciones;
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

  if row.fecha_fin >= current_date then
    raise exception 'Solo se puede marcar pagado cuando el plan está vencido';
  end if;

  dias := case when row.periodo = 'anual' then 365 else 30 end;
  v_monto := case when row.periodo = 'anual' then row.precio_anual else row.precio_mensual end;
  v_desde := current_date;
  v_hasta := current_date + dias;

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
