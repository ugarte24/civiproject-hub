-- SuperAdmin puede cambiar periodo de cobro (mensual ↔ anual)
create or replace function public.cambiar_periodo_suscripcion(
  p_suscripcion_id uuid,
  p_periodo text
)
returns public.suscripciones
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.suscripciones;
  v_periodo text;
begin
  if not public.is_superadmin() then
    raise exception 'Solo SuperAdmin puede cambiar el plan';
  end if;

  v_periodo := case when p_periodo = 'anual' then 'anual' else 'mensual' end;

  select * into row from public.suscripciones where id = p_suscripcion_id for update;
  if not found then
    raise exception 'Suscripción no encontrada';
  end if;

  if exists (
    select 1 from public.empresas e
    where e.id = row.empresa_id and e.es_plataforma = true
  ) then
    raise exception 'No se puede cambiar el plan de una empresa plataforma';
  end if;

  update public.suscripciones
  set
    periodo = v_periodo,
    precio_mensual = 500,
    precio_anual = 5500,
    updated_at = now()
  where id = p_suscripcion_id
  returning * into row;

  return row;
end;
$$;

grant execute on function public.cambiar_periodo_suscripcion(uuid, text) to authenticated;
