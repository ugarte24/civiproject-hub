# Guía paso a paso — Unir SIGOC con Supabase

Documento complementario al [PRD](./PRD-SIGOC.md).  
Objetivo: pasar del store en memoria (`src/lib/store.tsx`) a **Auth + Postgres + Storage + RLS**.

---

## Visión de la arquitectura

```
┌─────────────────────────────┐
│  TanStack Start (React)     │
│  UI actual + React Query    │
└──────────────┬──────────────┘
               │ @supabase/supabase-js
               ▼
┌─────────────────────────────┐
│  Supabase                   │
│  • Auth (usuarios / sesión) │
│  • Postgres (datos)         │
│  • Storage (docs / fotos)   │
│  • RLS (seguridad por rol)  │
└─────────────────────────────┘
```

Hoy todo vive en el cliente. Tras la integración, el `StoreProvider` deja de ser la fuente de verdad y pasa a ser una capa fina sobre Supabase (o se reemplaza por hooks/queries).

---

## Paso 0 — Prerrequisitos

1. Cuenta en [supabase.com](https://supabase.com).
2. Node.js y el repo `civiproject-hub` corriendo (`npm install` / `npm run dev`).
3. Decidir si usas un **proyecto Supabase nuevo** (recomendado para SIGOC) o uno existente.
4. **Importante:** el MCP `supabaseVentaPlus` de Cursor parece de otro producto. No asumas que es la DB de este hub; crea o conecta un proyecto dedicado a SIGOC.

---

## Paso 1 — Crear el proyecto en Supabase

1. Dashboard Supabase → **New project**.
2. Nombre sugerido: `sigoc` o `civiproject-hub`.
3. Región cercana (p. ej. South America si está disponible).
4. Guarda la **database password** en un gestor de secretos.
5. En **Project Settings → API** copia:
   - `Project URL`
   - `anon` `public` key
   - `service_role` key (**solo servidor**; nunca en el frontend ni en Lovable client)

---

## Paso 2 — Variables de entorno en el frontend

Crea `.env.local` en la raíz del repo (y asegúrate de que `.env*` esté en `.gitignore`):

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

Para TanStack Start / Vite, el prefijo `VITE_` expone las vars al cliente.  
La `service_role` **no** va aquí.

Si despliegas en Lovable/Cloudflare, configura las mismas variables en el panel de hosting.

---

## Paso 3 — Instalar el cliente Supabase

En la raíz del proyecto:

```bash
npm install @supabase/supabase-js
```

Crear el cliente:

**`src/lib/supabase.ts`**

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types"; // generado en el paso 5

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient<Database>(url, anon);
```

---

## Paso 4 — Diseñar el schema (SQL)

En el SQL Editor de Supabase, ejecuta un schema alineado al dominio actual.

### 4.1 Enums y perfiles

```sql
-- Roles (mismo vocabulario que src/lib/store.tsx)
create type public.app_role as enum (
  'Administrador',
  'Ingeniero Residente',
  'Supervisor',
  'Contabilidad',
  'Consulta'
);

create type public.project_status as enum ('Activo', 'Suspendido', 'Finalizado');

create type public.movimiento_tipo as enum (
  'Ingreso', 'Egreso', 'Factura', 'Pago', 'Retencion', 'Planilla'
);

create type public.doc_categoria as enum (
  'Planos', 'Contratos', 'Memorias', 'Licitaciones', 'Informes', 'APU', 'Actas'
);

-- Perfil ligado a auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  correo text not null unique,
  telefono text,
  rol public.app_role not null default 'Consulta',
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  created_at timestamptz not null default now()
);

-- Al registrarse / crear usuario, crear perfil
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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 4.2 Tablas de negocio

```sql
create table public.proyectos (
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

create table public.partidas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  nombre text not null,
  monto numeric(14,2) not null,
  ejecutado numeric(14,2) not null default 0,
  descripcion text default ''
);

create table public.movimientos (
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

create table public.documentos (
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

create table public.fotografias (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  fecha date not null,
  descripcion text default '',
  ubicacion text default '',
  autor text,
  storage_path text not null,
  created_by uuid references public.profiles (id)
);

create table public.apus (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  descripcion text not null,
  unidad text not null,
  cantidad numeric(14,4) not null default 1,
  materiales jsonb not null default '[]',
  equipos jsonb not null default '[]',
  mano_obra jsonb not null default '[]',
  indirectos numeric(8,4) not null default 0,
  utilidad numeric(8,4) not null default 0,
  proyecto_id uuid references public.proyectos (id) on delete set null
);

create table public.actividades (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  nombre text not null,
  inicio date not null,
  fin date not null,
  responsable text,
  estado text not null check (estado in ('Pendiente', 'En curso', 'Concluida')),
  avance numeric(5,2) not null default 0
);

-- Asignación usuario ↔ proyecto (recomendado para fase 2)
create table public.proyecto_miembros (
  proyecto_id uuid references public.proyectos (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  primary key (proyecto_id, user_id)
);
```

### 4.3 Helper de rol (para RLS)

```sql
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid();
$$;
```

---

## Paso 5 — Generar tipos TypeScript

Con [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

Así `createClient<Database>` tipa tablas y columnas.

---

## Paso 6 — Auth (login real)

### 6.1 En el Dashboard

1. **Authentication → Providers:** Email habilitado.
2. (Opcional) desactivar “Confirm email” en desarrollo.
3. Crear el primer usuario Administrador (Authentication → Users → Add user) y actualizar `profiles.rol` a `Administrador` en Table Editor.

### 6.2 Ruta de login en la app

Crear `src/routes/login.tsx` con formulario email/password:

```ts
const { error } = await supabase.auth.signInWithPassword({ email, password });
```

Sesión:

```ts
const { data: { session } } = await supabase.auth.getSession();
supabase.auth.onAuthStateChange((_event, session) => { /* setSession */ });
```

### 6.3 Proteger el shell

En `__root.tsx` / `AppShell`:

- Si no hay sesión → redirect a `/login`.
- Cargar `profiles` del `auth.uid()` y usar ese `rol` en lugar del select demo.
- Quitar (o limitar a dev) el selector de rol del header.

Creación de usuarios desde `/usuarios`: en producción preferible **Edge Function** o Admin API con `service_role` (invitar usuario), no desde el anon key.

---

## Paso 7 — Row Level Security (RLS)

Activa RLS en todas las tablas públicas. Ejemplo mínimo:

```sql
alter table public.profiles enable row level security;
alter table public.proyectos enable row level security;
alter table public.partidas enable row level security;
alter table public.movimientos enable row level security;
alter table public.documentos enable row level security;
alter table public.fotografias enable row level security;
alter table public.apus enable row level security;
alter table public.actividades enable row level security;

-- Perfil: cada uno lee el suyo; admin lee todos
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.current_role() = 'Administrador');

-- Proyectos: autenticados leen (afinar luego por proyecto_miembros)
create policy "proyectos_select_auth"
on public.proyectos for select
to authenticated
using (true);

create policy "proyectos_write_roles"
on public.proyectos for all
to authenticated
using (public.current_role() in ('Administrador', 'Ingeniero Residente'))
with check (public.current_role() in ('Administrador', 'Ingeniero Residente'));

-- Contabilidad: solo Contabilidad / Admin escriben movimientos
create policy "movimientos_select"
on public.movimientos for select
to authenticated
using (
  public.current_role() in ('Administrador', 'Contabilidad')
  or public.current_role() in ('Ingeniero Residente', 'Supervisor', 'Consulta')
    and false -- Contabilidad es módulo restringido: ajusta a la matriz del PRD
);

-- Ajusta políticas de lectura/escritura módulo a módulo según `permisos` en store.tsx
```

Replica la matriz de `permisos` en SQL. La UI ya oculta botones; **RLS es la defensa real**.

Orden sugerido de políticas: primero lectura amplia para autenticados + escritura por rol; después restringir Contabilidad/APU/Usuarios como en el PRD.

---

## Paso 8 — Storage (documentos y fotos)

1. Storage → **New bucket**:
   - `documentos` (privado)
   - `fotografias` (privado)
2. Políticas de Storage: solo `authenticated`; path preferible `{proyecto_id}/{filename}`.

Ejemplo upload desde la UI:

```ts
const path = `${proyectoId}/${crypto.randomUUID()}-${file.name}`;
const { error } = await supabase.storage.from("documentos").upload(path, file);
if (!error) {
  await supabase.from("documentos").insert({
    nombre: file.name,
    categoria: "Planos",
    proyecto_id: proyectoId,
    storage_path: path,
    peso: `${(file.size / 1024).toFixed(1)} KB`,
    descripcion: "...",
  });
}
```

Para mostrar: `createSignedUrl(path, 3600)` en buckets privados.

Reemplaza en `fotografias.tsx` el `FileReader` / data URL por este flujo.

---

## Paso 9 — Sustituir el store mock por React Query + Supabase

Orden de migración (bajo riesgo):

| Orden | Módulo | Tablas |
|------:|--------|--------|
| 1 | Proyectos | `proyectos` |
| 2 | Presupuesto | `partidas` |
| 3 | Contabilidad | `movimientos` |
| 4 | Usuarios / Auth | `profiles` + Auth |
| 5 | Documentos / Fotos | tablas + Storage |
| 6 | APU / Cronograma | `apus`, `actividades` |
| 7 | Dashboard / Reportes | queries agregadas |

Patrón por entidad:

```ts
// ejemplo
export function useProyectos() {
  return useQuery({
    queryKey: ["proyectos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proyectos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewProyecto) => {
      const { data, error } = await supabase.from("proyectos").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proyectos"] }),
  });
}
```

Mantén mapeo de nombres (`fecha_inicio` ↔ `fechaInicio`) en una capa `mappers.ts` para no reescribir todas las pantallas de golpe.

Cuando un módulo ya lea/escriba Supabase, elimina sus arrays mock del `StoreProvider`.

---

## Paso 10 — Seed de datos demo (opcional)

Inserta en SQL los 4 proyectos demo del store (Pavimentación Costanera, Puente Río Seco, etc.) para no trabajar con DB vacía. Útil para demos y QA.

---

## Paso 11 — Checklist de verificación

- [ ] `.env.local` con URL + anon key; sin service role en el cliente
- [ ] Schema aplicado; RLS **enabled** en todas las tablas
- [ ] Login / logout / sesión persistente
- [ ] Rol leído desde `profiles` (no selector demo)
- [ ] CRUD proyectos persiste tras F5
- [ ] Upload documento + foto y visualización con signed URL
- [ ] Usuario Consulta no puede insertar/update (probar con 2 cuentas)
- [ ] Contabilidad no ve APU / Documentos técnicos según política
- [ ] `npm run build` OK con las env de producción

---

## Paso 12 — Orden de trabajo recomendado (sprints)

| Sprint | Días (aprox.) | Entrega |
|--------|---------------|---------|
| A | 1 | Proyecto Supabase + env + cliente + schema |
| B | 1–2 | Auth + profiles + quitar rol demo |
| C | 2 | Proyectos + partidas + movimientos |
| D | 1–2 | Storage docs/fotos |
| E | 1–2 | RLS fina + seed + hardering |
| F | 2+ | Cronograma CRUD, exports, config |

---

## Mapa rápido: código actual → Supabase

| Hoy | Mañana |
|-----|--------|
| `StoreProvider` arrays | Tablas Postgres |
| `setRole` en header | `profiles.rol` vía sesión |
| `addDocumento` con nombre de archivo | Storage + `storage_path` |
| Preview foto `FileReader` | Upload + signed URL |
| Export PDF toast | Edge Function o lib cliente (jsPDF / SheetJS) |
| Password en form usuarios | Auth Admin / invite |

---

## Errores frecuentes

1. **RLS sin políticas** → queries vacías o error; siempre crea policies al activar RLS.
2. **Usar service_role en el browser** → filtración de datos; solo Edge Functions / scripts server.
3. **CORS / URL mal configurada** → revisar Site URL y Redirect URLs en Auth.
4. **Buckets públicos por defecto** → preferir privados + signed URLs.
5. **Tipos desfasados** → regenerar `database.types.ts` tras cada migración.

---

## Siguiente acción concreta

1. Crear proyecto Supabase `sigoc`.
2. Pegar URL + anon en `.env.local`.
3. Ejecutar el SQL del Paso 4.
4. `npm install @supabase/supabase-js` y crear `src/lib/supabase.ts`.
5. Implementar `/login` y cargar el perfil.

Cuando quieras, el siguiente paso en el repo puede ser **implementar el cliente + login + tabla proyectos** sobre este plan.

---

## Actualización Agosto 2026 — Obra multi-tenant

Ya aplicado en migraciones y frontend:

- `proyectos.empresa_id` + unique `(empresa_id, codigo)`
- RLS por `current_empresa_id()` / `proyecto_de_mi_empresa()`
- `configuracion_empresa` (una fila por empresa)
- Buckets Storage `documentos` y `fotografias` (path `{empresa_id}/{proyecto_id}/…`)
- Fotos: compresión en cliente (`src/lib/compress-image.ts`) antes de subir
- Hooks React Query: `src/lib/obra/hooks.ts`
- `store.tsx` solo tipos + permisos + rol (sin CRUD mock)
