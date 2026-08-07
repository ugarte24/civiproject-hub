-- Suscripciones SaaS + SuperAdmin
-- Plan Esencial: Bs 800/mes, 8 usuarios, 1 empresa

alter table public.profiles
  add column if not exists es_superadmin boolean not null default false;

alter table public.profiles
  add column if not exists empresa_id uuid;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nit text,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.profiles
    add constraint profiles_empresa_id_fkey
    foreign key (empresa_id) references public.empresas (id) on delete set null;
exception when duplicate_object then null;
end $$;

create table if not exists public.suscripciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas (id) on delete cascade,
  plan text not null default 'esencial',
  precio_mensual numeric(12,2) not null default 800,
  max_usuarios int not null default 8,
  fecha_inicio date not null default current_date,
  fecha_fin date not null,
  estado text not null default 'activa'
    check (estado in ('activa', 'vencida', 'gracia', 'cancelada')),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suscripciones_fecha_fin_idx on public.suscripciones (fecha_fin);
create index if not exists profiles_empresa_id_idx on public.profiles (empresa_id);

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select es_superadmin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.touch_suscripcion_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists suscripciones_touch_updated_at on public.suscripciones;
create trigger suscripciones_touch_updated_at
  before update on public.suscripciones
  for each row execute function public.touch_suscripcion_updated_at();

-- Extender +30 días y marcar activa (solo superadmin vía RLS update)
create or replace function public.marcar_pagado_suscripcion(p_suscripcion_id uuid)
returns public.suscripciones
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.suscripciones;
  base date;
begin
  if not public.is_superadmin() then
    raise exception 'Solo SuperAdmin puede marcar pagos';
  end if;

  select * into row from public.suscripciones where id = p_suscripcion_id for update;
  if not found then
    raise exception 'Suscripción no encontrada';
  end if;

  base := greatest(row.fecha_fin, current_date);
  update public.suscripciones
  set
    fecha_inicio = case when row.fecha_fin < current_date then current_date else row.fecha_inicio end,
    fecha_fin = base + 30,
    estado = 'activa',
    updated_at = now()
  where id = p_suscripcion_id
  returning * into row;

  return row;
end;
$$;

-- RLS
alter table public.empresas enable row level security;
alter table public.suscripciones enable row level security;

drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas
  for select to authenticated
  using (
    public.is_superadmin()
    or id = (select empresa_id from public.profiles where id = auth.uid())
  );

drop policy if exists empresas_write_super on public.empresas;
create policy empresas_write_super on public.empresas
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists suscripciones_select on public.suscripciones;
create policy suscripciones_select on public.suscripciones
  for select to authenticated
  using (
    public.is_superadmin()
    or empresa_id = (select empresa_id from public.profiles where id = auth.uid())
  );

drop policy if exists suscripciones_write_super on public.suscripciones;
create policy suscripciones_write_super on public.suscripciones
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Profiles: superadmin puede ver/editar todos; usuario el suyo (ya existía select)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_superadmin()
    or public.current_role() = 'Administrador'
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());

-- Marcar superadmin Gustavo + empresa demo con 30 días
do $$
declare
  v_user uuid;
  v_empresa uuid;
begin
  select id into v_user from auth.users where email = 'ugarte.r1046.4@gmail.com' limit 1;
  if v_user is null then
    return;
  end if;

  update public.profiles
  set es_superadmin = true, nombre = 'Gustavo Enrique Ugarte Canaza', rol = 'Administrador'
  where id = v_user;

  select empresa_id into v_empresa from public.profiles where id = v_user;

  if v_empresa is null then
    insert into public.empresas (nombre, nit)
    values ('SIGOC (cuenta propia)', null)
    returning id into v_empresa;

    update public.profiles set empresa_id = v_empresa where id = v_user;
  end if;

  insert into public.suscripciones (empresa_id, plan, fecha_inicio, fecha_fin, estado, max_usuarios, precio_mensual)
  values (v_empresa, 'esencial', current_date, current_date + 30, 'activa', 8, 800)
  on conflict (empresa_id) do update set
    fecha_fin = greatest(public.suscripciones.fecha_fin, excluded.fecha_fin),
    estado = 'activa',
    max_usuarios = excluded.max_usuarios,
    precio_mensual = excluded.precio_mensual;
end $$;
