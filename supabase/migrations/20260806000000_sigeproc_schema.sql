-- SIGOC schema inicial
-- Proyecto: civiproject-hub

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.app_role as enum (
    'Administrador',
    'Ingeniero Residente',
    'Supervisor',
    'Contabilidad',
    'Consulta'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.project_status as enum ('Activo', 'Suspendido', 'Finalizado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.movimiento_tipo as enum (
    'Ingreso', 'Egreso', 'Factura', 'Pago', 'Retencion', 'Planilla'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.doc_categoria as enum (
    'Planos', 'Contratos', 'Memorias', 'Licitaciones', 'Informes', 'APU', 'Actas'
  );
exception when duplicate_object then null;
end $$;

-- Profiles (ligado a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  correo text not null unique,
  telefono text,
  rol public.app_role not null default 'Consulta',
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, correo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'rol')::public.app_role, 'Consulta')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper de rol para RLS
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid();
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Proyectos
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  entidad text not null,
  empresa text not null,
  responsable text not null,
  presupuesto numeric(14,2) not null default 0,
  ejecutado numeric(14,2) not null default 0,
  avance_fisico numeric(5,2) not null default 0,
  fecha_inicio date not null,
  fecha_final date not null,
  estado public.project_status not null default 'Activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists proyectos_set_updated_at on public.proyectos;
create trigger proyectos_set_updated_at
  before update on public.proyectos
  for each row execute function public.set_updated_at();

-- Partidas
create table if not exists public.partidas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  nombre text not null,
  monto numeric(14,2) not null,
  ejecutado numeric(14,2) not null default 0,
  descripcion text default ''
);

create index if not exists partidas_proyecto_id_idx on public.partidas (proyecto_id);

-- Movimientos contables
create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo public.movimiento_tipo not null,
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  proveedor text not null,
  nit text,
  numero text,
  monto numeric(14,2) not null,
  fecha date not null,
  observacion text default '',
  adjunto_path text
);

create index if not exists movimientos_proyecto_id_idx on public.movimientos (proyecto_id);

-- Documentos
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria public.doc_categoria not null,
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  storage_path text not null,
  peso text,
  descripcion text default '',
  fecha date not null default current_date,
  created_by uuid references public.profiles (id)
);

create index if not exists documentos_proyecto_id_idx on public.documentos (proyecto_id);

-- Fotografías
create table if not exists public.fotografias (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  fecha date not null,
  descripcion text default '',
  ubicacion text default '',
  autor text,
  storage_path text not null,
  created_by uuid references public.profiles (id)
);

create index if not exists fotografias_proyecto_id_idx on public.fotografias (proyecto_id);

-- APU
create table if not exists public.apus (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  descripcion text not null,
  unidad text not null,
  cantidad numeric(14,4) not null default 1,
  materiales jsonb not null default '[]'::jsonb,
  equipos jsonb not null default '[]'::jsonb,
  mano_obra jsonb not null default '[]'::jsonb,
  indirectos numeric(8,4) not null default 0,
  utilidad numeric(8,4) not null default 0,
  proyecto_id uuid references public.proyectos (id) on delete set null
);

-- Cronograma / actividades
create table if not exists public.actividades (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  nombre text not null,
  inicio date not null,
  fin date not null,
  responsable text,
  estado text not null check (estado in ('Pendiente', 'En curso', 'Concluida')),
  avance numeric(5,2) not null default 0
);

create index if not exists actividades_proyecto_id_idx on public.actividades (proyecto_id);

-- Miembros de proyecto
create table if not exists public.proyecto_miembros (
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (proyecto_id, user_id)
);

-- Configuración de empresa (singleton simple)
create table if not exists public.configuracion (
  id int primary key default 1 check (id = 1),
  nombre_empresa text,
  nit text,
  direccion text,
  telefono text,
  moneda text not null default 'BOB',
  updated_at timestamptz not null default now()
);

insert into public.configuracion (id) values (1)
on conflict (id) do nothing;

-- =========================
-- RLS
-- =========================
alter table public.profiles enable row level security;
alter table public.proyectos enable row level security;
alter table public.partidas enable row level security;
alter table public.movimientos enable row level security;
alter table public.documentos enable row level security;
alter table public.fotografias enable row level security;
alter table public.apus enable row level security;
alter table public.actividades enable row level security;
alter table public.proyecto_miembros enable row level security;
alter table public.configuracion enable row level security;

-- Profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_role() = 'Administrador');

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.current_role() = 'Administrador')
  with check (id = auth.uid() or public.current_role() = 'Administrador');

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.current_role() = 'Administrador');

-- Proyectos
drop policy if exists proyectos_select on public.proyectos;
create policy proyectos_select on public.proyectos
  for select to authenticated
  using (true);

drop policy if exists proyectos_write on public.proyectos;
create policy proyectos_write on public.proyectos
  for all to authenticated
  using (public.current_role() in ('Administrador', 'Ingeniero Residente'))
  with check (public.current_role() in ('Administrador', 'Ingeniero Residente'));

-- Partidas
drop policy if exists partidas_select on public.partidas;
create policy partidas_select on public.partidas
  for select to authenticated
  using (true);

drop policy if exists partidas_write on public.partidas;
create policy partidas_write on public.partidas
  for all to authenticated
  using (public.current_role() in ('Administrador', 'Ingeniero Residente'))
  with check (public.current_role() in ('Administrador', 'Ingeniero Residente'));

-- Movimientos (lectura: Admin + Contabilidad; escritura: igual)
drop policy if exists movimientos_select on public.movimientos;
create policy movimientos_select on public.movimientos
  for select to authenticated
  using (public.current_role() in ('Administrador', 'Contabilidad'));

drop policy if exists movimientos_write on public.movimientos;
create policy movimientos_write on public.movimientos
  for all to authenticated
  using (public.current_role() in ('Administrador', 'Contabilidad'))
  with check (public.current_role() in ('Administrador', 'Contabilidad'));

-- Documentos
drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos
  for select to authenticated
  using (public.current_role() <> 'Contabilidad');

drop policy if exists documentos_write on public.documentos;
create policy documentos_write on public.documentos
  for all to authenticated
  using (public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor'))
  with check (public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor'));

-- Fotografías
drop policy if exists fotografias_select on public.fotografias;
create policy fotografias_select on public.fotografias
  for select to authenticated
  using (public.current_role() <> 'Contabilidad');

drop policy if exists fotografias_write on public.fotografias;
create policy fotografias_write on public.fotografias
  for all to authenticated
  using (public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor'))
  with check (public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor'));

-- APU
drop policy if exists apus_select on public.apus;
create policy apus_select on public.apus
  for select to authenticated
  using (public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor'));

drop policy if exists apus_write on public.apus;
create policy apus_write on public.apus
  for all to authenticated
  using (public.current_role() in ('Administrador', 'Ingeniero Residente'))
  with check (public.current_role() in ('Administrador', 'Ingeniero Residente'));

-- Actividades
drop policy if exists actividades_select on public.actividades;
create policy actividades_select on public.actividades
  for select to authenticated
  using (public.current_role() <> 'Contabilidad');

drop policy if exists actividades_write on public.actividades;
create policy actividades_write on public.actividades
  for all to authenticated
  using (public.current_role() in ('Administrador', 'Ingeniero Residente'))
  with check (public.current_role() in ('Administrador', 'Ingeniero Residente'));

-- Proyecto miembros
drop policy if exists proyecto_miembros_select on public.proyecto_miembros;
create policy proyecto_miembros_select on public.proyecto_miembros
  for select to authenticated
  using (true);

drop policy if exists proyecto_miembros_write on public.proyecto_miembros;
create policy proyecto_miembros_write on public.proyecto_miembros
  for all to authenticated
  using (public.current_role() = 'Administrador')
  with check (public.current_role() = 'Administrador');

-- Configuración
drop policy if exists configuracion_select on public.configuracion;
create policy configuracion_select on public.configuracion
  for select to authenticated
  using (public.current_role() = 'Administrador');

drop policy if exists configuracion_write on public.configuracion;
create policy configuracion_write on public.configuracion
  for all to authenticated
  using (public.current_role() = 'Administrador')
  with check (public.current_role() = 'Administrador');
