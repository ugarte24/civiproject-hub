-- Obra multi-tenant: empresa_id, RLS por empresa, Storage buckets

create or replace function public.current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.profiles where id = auth.uid();
$$;

-- Proyectos: empresa_id
alter table public.proyectos
  add column if not exists empresa_id uuid references public.empresas (id) on delete cascade;

update public.proyectos p
set empresa_id = (
  select e.id from public.empresas e
  where coalesce(e.es_plataforma, false) = false
  order by e.created_at nulls last
  limit 1
)
where p.empresa_id is null;

delete from public.proyectos where empresa_id is null;

alter table public.proyectos
  alter column empresa_id set not null;

alter table public.proyectos drop constraint if exists proyectos_codigo_key;
drop index if exists proyectos_codigo_key;
create unique index if not exists proyectos_empresa_codigo_uidx
  on public.proyectos (empresa_id, codigo);
create index if not exists proyectos_empresa_id_idx on public.proyectos (empresa_id);

-- Ahora sí: helper que usa empresa_id
create or replace function public.proyecto_de_mi_empresa(p_proyecto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.proyectos pr
    where pr.id = p_proyecto_id
      and pr.empresa_id = public.current_empresa_id()
  );
$$;

-- APU: empresa_id
alter table public.apus
  add column if not exists empresa_id uuid references public.empresas (id) on delete cascade;

update public.apus a
set empresa_id = (
  select pr.empresa_id from public.proyectos pr where pr.id = a.proyecto_id
)
where a.empresa_id is null and a.proyecto_id is not null;

update public.apus a
set empresa_id = (
  select e.id from public.empresas e
  where coalesce(e.es_plataforma, false) = false
  order by e.created_at nulls last
  limit 1
)
where a.empresa_id is null;

delete from public.apus where empresa_id is null;

alter table public.apus
  alter column empresa_id set not null;

create index if not exists apus_empresa_id_idx on public.apus (empresa_id);

-- Configuración por empresa
create table if not exists public.configuracion_empresa (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  nombre_empresa text,
  nit text,
  direccion text,
  telefono text,
  moneda text not null default 'BOB',
  updated_at timestamptz not null default now()
);

insert into public.configuracion_empresa (empresa_id, nombre_empresa, nit)
select e.id, e.nombre, e.nit
from public.empresas e
where coalesce(e.es_plataforma, false) = false
on conflict (empresa_id) do nothing;

alter table public.configuracion_empresa enable row level security;

-- RLS obras
drop policy if exists proyectos_select on public.proyectos;
drop policy if exists proyectos_write on public.proyectos;
drop policy if exists proyectos_insert on public.proyectos;
drop policy if exists proyectos_update on public.proyectos;
drop policy if exists proyectos_delete on public.proyectos;

create policy proyectos_select on public.proyectos
  for select to authenticated
  using (empresa_id = public.current_empresa_id());

create policy proyectos_insert on public.proyectos
  for insert to authenticated
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

create policy proyectos_update on public.proyectos
  for update to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  )
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

create policy proyectos_delete on public.proyectos
  for delete to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

drop policy if exists partidas_select on public.partidas;
drop policy if exists partidas_write on public.partidas;
drop policy if exists partidas_insert on public.partidas;
drop policy if exists partidas_update on public.partidas;
drop policy if exists partidas_delete on public.partidas;

create policy partidas_select on public.partidas
  for select to authenticated
  using (public.proyecto_de_mi_empresa(proyecto_id));

create policy partidas_insert on public.partidas
  for insert to authenticated
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

create policy partidas_update on public.partidas
  for update to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  )
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

create policy partidas_delete on public.partidas
  for delete to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

drop policy if exists movimientos_select on public.movimientos;
drop policy if exists movimientos_write on public.movimientos;
drop policy if exists movimientos_insert on public.movimientos;
drop policy if exists movimientos_update on public.movimientos;
drop policy if exists movimientos_delete on public.movimientos;

create policy movimientos_select on public.movimientos
  for select to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Contabilidad')
  );

create policy movimientos_insert on public.movimientos
  for insert to authenticated
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Contabilidad')
  );

create policy movimientos_update on public.movimientos
  for update to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Contabilidad')
  )
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Contabilidad')
  );

create policy movimientos_delete on public.movimientos
  for delete to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Contabilidad')
  );

drop policy if exists documentos_select on public.documentos;
drop policy if exists documentos_write on public.documentos;
drop policy if exists documentos_insert on public.documentos;
drop policy if exists documentos_update on public.documentos;
drop policy if exists documentos_delete on public.documentos;

create policy documentos_select on public.documentos
  for select to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() <> 'Contabilidad'
  );

create policy documentos_insert on public.documentos
  for insert to authenticated
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

create policy documentos_update on public.documentos
  for update to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  )
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

create policy documentos_delete on public.documentos
  for delete to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

drop policy if exists fotografias_select on public.fotografias;
drop policy if exists fotografias_write on public.fotografias;
drop policy if exists fotografias_insert on public.fotografias;
drop policy if exists fotografias_update on public.fotografias;
drop policy if exists fotografias_delete on public.fotografias;

create policy fotografias_select on public.fotografias
  for select to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() <> 'Contabilidad'
  );

create policy fotografias_insert on public.fotografias
  for insert to authenticated
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

create policy fotografias_update on public.fotografias
  for update to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  )
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

create policy fotografias_delete on public.fotografias
  for delete to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

drop policy if exists apus_select on public.apus;
drop policy if exists apus_write on public.apus;
drop policy if exists apus_insert on public.apus;
drop policy if exists apus_update on public.apus;
drop policy if exists apus_delete on public.apus;

create policy apus_select on public.apus
  for select to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor', 'Consulta')
  );

create policy apus_insert on public.apus
  for insert to authenticated
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

create policy apus_update on public.apus
  for update to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  )
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

create policy apus_delete on public.apus
  for delete to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

drop policy if exists actividades_select on public.actividades;
drop policy if exists actividades_write on public.actividades;
drop policy if exists actividades_insert on public.actividades;
drop policy if exists actividades_update on public.actividades;
drop policy if exists actividades_delete on public.actividades;

create policy actividades_select on public.actividades
  for select to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() <> 'Contabilidad'
  );

create policy actividades_insert on public.actividades
  for insert to authenticated
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

create policy actividades_update on public.actividades
  for update to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  )
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

create policy actividades_delete on public.actividades
  for delete to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() in ('Administrador', 'Ingeniero Residente')
  );

drop policy if exists proyecto_miembros_select on public.proyecto_miembros;
drop policy if exists proyecto_miembros_write on public.proyecto_miembros;

create policy proyecto_miembros_select on public.proyecto_miembros
  for select to authenticated
  using (public.proyecto_de_mi_empresa(proyecto_id));

create policy proyecto_miembros_write on public.proyecto_miembros
  for all to authenticated
  using (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() = 'Administrador'
  )
  with check (
    public.proyecto_de_mi_empresa(proyecto_id)
    and public.current_role() = 'Administrador'
  );

drop policy if exists configuracion_empresa_select on public.configuracion_empresa;
drop policy if exists configuracion_empresa_write on public.configuracion_empresa;

create policy configuracion_empresa_select on public.configuracion_empresa
  for select to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_role() = 'Administrador'
  );

create policy configuracion_empresa_write on public.configuracion_empresa
  for all to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_role() = 'Administrador'
  )
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_role() = 'Administrador'
  );

grant select, insert, update, delete on public.configuracion_empresa to authenticated;
grant select, insert, update, delete on public.proyectos to authenticated;
grant select, insert, update, delete on public.partidas to authenticated;
grant select, insert, update, delete on public.movimientos to authenticated;
grant select, insert, update, delete on public.documentos to authenticated;
grant select, insert, update, delete on public.fotografias to authenticated;
grant select, insert, update, delete on public.apus to authenticated;
grant select, insert, update, delete on public.actividades to authenticated;

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'documentos',
    'documentos',
    false,
    52428800,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/octet-stream',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  ),
  (
    'fotografias',
    'fotografias',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_documentos_select on storage.objects;
drop policy if exists storage_documentos_insert on storage.objects;
drop policy if exists storage_documentos_update on storage.objects;
drop policy if exists storage_documentos_delete on storage.objects;
drop policy if exists storage_fotografias_select on storage.objects;
drop policy if exists storage_fotografias_insert on storage.objects;
drop policy if exists storage_fotografias_update on storage.objects;
drop policy if exists storage_fotografias_delete on storage.objects;

create policy storage_documentos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.current_role() <> 'Contabilidad'
  );

create policy storage_documentos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

create policy storage_documentos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

create policy storage_documentos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

create policy storage_fotografias_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fotografias'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.current_role() <> 'Contabilidad'
  );

create policy storage_fotografias_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotografias'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

create policy storage_fotografias_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'fotografias'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );

create policy storage_fotografias_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotografias'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.current_role() in ('Administrador', 'Ingeniero Residente', 'Supervisor')
  );
