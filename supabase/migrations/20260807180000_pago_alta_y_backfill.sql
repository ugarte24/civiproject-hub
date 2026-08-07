-- Alta de cliente también genera recibo inicial; backfill Empresa Administrador

drop function if exists public.onboard_empresa(text, text, text);

create or replace function public.onboard_empresa(
  p_nombre_empresa text,
  p_periodo text default 'mensual',
  p_nit text default null
)
returns table (
  empresa_id uuid,
  suscripcion_id uuid,
  fecha_fin date,
  pago_id uuid,
  pago_numero text
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
  v_monto numeric(12, 2);
  v_numero text;
  v_pago uuid;
begin
  if not public.is_superadmin() then
    raise exception 'Solo SuperAdmin puede dar de alta empresas';
  end if;

  if p_nombre_empresa is null or length(trim(p_nombre_empresa)) < 2 then
    raise exception 'Nombre de empresa inválido';
  end if;

  v_periodo := case when p_periodo = 'anual' then 'anual' else 'mensual' end;
  v_fin := current_date + case when v_periodo = 'anual' then 365 else 30 end;
  v_monto := case when v_periodo = 'anual' then 5500 else 500 end;

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

  v_numero := 'REC-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.pagos_numero_seq')::text, 5, '0');

  insert into public.pagos (
    empresa_id, suscripcion_id, numero, periodo, monto, moneda,
    fecha_pago, vigencia_desde, vigencia_hasta, metodo, registrado_por
  )
  values (
    v_empresa, v_sub, v_numero, v_periodo, v_monto, 'BOB',
    current_date, current_date, v_fin, 'transferencia_qr', auth.uid()
  )
  returning id into v_pago;

  return query select v_empresa, v_sub, v_fin, v_pago, v_numero;
end;
$$;

grant execute on function public.onboard_empresa(text, text, text) to authenticated;

-- Backfill: Empresa Administrador (suscripción activa sin pagos)
do $$
declare
  v_sub public.suscripciones%rowtype;
  v_nombre text;
  v_mid date;
begin
  select s.* into v_sub
  from public.suscripciones s
  join public.empresas e on e.id = s.empresa_id
  where e.nombre = 'Empresa Administrador'
  limit 1;

  if not found then
    return;
  end if;

  if exists (select 1 from public.pagos p where p.suscripcion_id = v_sub.id) then
    return;
  end if;

  select nombre into v_nombre from public.empresas where id = v_sub.empresa_id;

  -- Periodo inicial (30 días desde fecha_inicio)
  v_mid := v_sub.fecha_inicio + 30;

  insert into public.pagos (
    empresa_id, suscripcion_id, numero, periodo, monto, moneda,
    fecha_pago, vigencia_desde, vigencia_hasta, metodo, notas
  ) values (
    v_sub.empresa_id,
    v_sub.id,
    'REC-' || to_char(v_sub.fecha_inicio, 'YYYY') || '-' ||
      lpad(nextval('public.pagos_numero_seq')::text, 5, '0'),
    coalesce(v_sub.periodo, 'mensual'),
    coalesce(v_sub.precio_mensual, 500),
    'BOB',
    v_sub.fecha_inicio,
    v_sub.fecha_inicio,
    least(v_mid, v_sub.fecha_fin),
    'transferencia_qr',
    'Alta inicial — ' || coalesce(v_nombre, 'cliente')
  );

  -- Si la vigencia se extendió más allá del primer mes, registrar renovación
  if v_sub.fecha_fin > v_mid then
    insert into public.pagos (
      empresa_id, suscripcion_id, numero, periodo, monto, moneda,
      fecha_pago, vigencia_desde, vigencia_hasta, metodo, notas
    ) values (
      v_sub.empresa_id,
      v_sub.id,
      'REC-' || to_char(coalesce(v_sub.updated_at::date, current_date), 'YYYY') || '-' ||
        lpad(nextval('public.pagos_numero_seq')::text, 5, '0'),
      coalesce(v_sub.periodo, 'mensual'),
      coalesce(v_sub.precio_mensual, 500),
      'BOB',
      least(coalesce(v_sub.updated_at::date, current_date), v_sub.fecha_fin),
      v_mid,
      v_sub.fecha_fin,
      'transferencia_qr',
      'Renovación registrada (backfill)'
    );
  end if;
end $$;
