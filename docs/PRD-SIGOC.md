# PRD — SIGOC (Civil Project Hub)

| Campo | Valor |
|-------|--------|
| **Producto** | SIGOC — Sistema de Gestión de Obras Civiles |
| **Repositorio** | [ugarte24/civiproject-hub](https://github.com/ugarte24/civiproject-hub) |
| **Versión PRD** | 3.0 |
| **Versión app** | 1.2.0 (`package.json`) |
| **Fecha** | Agosto 2026 |
| **Estado del producto** | SaaS + obra persistente en Supabase (Auth, suscripciones, proyectos y módulos de obra por empresa) |
| **Mercado** | Bolivia (moneda BOB, entidades GAM / ABC / EPSAS) |
| **Plataforma** | Lovable + GitHub (`main`); no reescribir historial publicado |

---

## 1. Resumen ejecutivo

SIGOC es una aplicación web para administrar proyectos de construcción de forma centralizada: información técnica, económica y administrativa, documentos, presupuestos, avance físico/financiero y usuarios con permisos por rol.

Además opera como **SaaS multi-empresa**: el dueño de la plataforma (SuperAdmin) da de alta clientes, cobra el plan Esencial y extiende vigencias; cada empresa cliente opera sus módulos de obra con su propio Administrador y equipo.

**Estado actual (v1.2):**

- Auth real con Supabase (email/password), perfiles y roles.
- Suscripciones por empresa, aviso de vencimiento y bloqueo al vencer.
- Panel SuperAdmin (`/admin`): clientes, marcar pagado, historial de pagos, recibos PDF.
- **Obra persistente** por `empresa_id`: proyectos, partidas, movimientos, documentos (Storage), fotografías (comprimidas + Storage), cronograma, APU, configuración.
- Marca unificada en UI (`SigocLogo`) + iconos PWA / favicon.
- Menú: Documentos y Fotografías siguen como ítems separados; deep-link desde proyecto.

---

## 2. Problema

Hoy la información de obra vive dispersa en Excel, carpetas y papel. Falta:

- Un solo lugar para proyecto, presupuesto, avance y documentos.
- Control de quién ve y quién edita (ingeniería vs contabilidad vs consulta).
- Historial y reportes confiables en tiempo real.
- Almacenamiento seguro de planos, facturas y fotos de avance.
- Cobro y control de acceso por empresa para un modelo SaaS.

---

## 3. Objetivos

### 3.1 Objetivo general

Digitalizar y centralizar la gestión de proyectos civiles con control financiero, avance de obra, repositorio documental y reportes, con acceso según rol, y operar el producto como SaaS con cobro por suscripción.

### 3.2 Objetivos específicos

1. Centralizar datos del proyecto (técnicos, económicos, administrativos).
2. Controlar presupuesto por partidas y ejecución financiera.
3. Digitalizar documentos técnicos (PDF, DWG, Office, ZIP).
4. Almacenar fotografías de avance con metadatos.
5. Gestionar usuarios y permisos por rol (y, a futuro, por proyecto).
6. Generar reportes exportables (PDF / Excel).
7. Reducir dependencia de documentos físicos.
8. Cobrar y renovar planes por empresa (mensual/anual) con recibo imprimible/descargable.

### 3.3 Métricas de éxito

| Métrica | Meta | Estado |
|---------|------|--------|
| Login / sesión real | Auth Supabase operativa | Hecho |
| Suscripción por empresa | Vigencia, aviso 3 días, bloqueo al vencer | Hecho |
| Cobro SuperAdmin | Marcar pagado + recibo + historial | Hecho |
| Persistencia obra (CRUD) | 100% de CRUD críticos tras F5 | Hecho |
| Archivos en Storage | Documentos y fotos subibles | Hecho (fotos con compresión cliente) |
| Seguridad | RLS activa; sin acceso cruzado indebido | Hecho (SaaS + obra por empresa) |
| Roles obra | Matriz enforceada en DB + UI | Hecho |

---

## 4. Usuarios y roles

Detalle operativo: [`ROLES-SAAS.md`](./ROLES-SAAS.md).

### 4.1 Plataforma (SaaS)

| Rol | Descripción |
|-----|-------------|
| **SuperAdmin** | Dueño SIGOC. Solo `/admin`: clientes, cobros, recibos, usuarios por empresa. No opera obra. No paga plan. No se bloquea por suscripción. |

### 4.2 Empresa cliente

| Rol | Descripción | Lectura | Escritura |
|-----|-------------|---------|-----------|
| **Administrador** | Control de su empresa | Todos los módulos de obra | Proyectos, presupuesto, contabilidad, docs, fotos, APU, usuarios de su empresa, config |
| **Ingeniero Residente** | Operación de obra | Dashboard, proyectos, presupuesto, docs, fotos, cronograma, APU, reportes | Proyectos, presupuesto, docs, fotos, APU |
| **Supervisor** | Seguimiento y evidencias | Similar a ingeniero (sin contabilidad/usuarios/config) | Solo documentos y fotografías |
| **Contabilidad** | Economía del proyecto | Dashboard, presupuesto, contabilidad, reportes | Solo contabilidad |
| **Consulta** | Solo lectura | Dashboard, proyectos, presupuesto, docs, fotos, cronograma, reportes | Ninguna |

> El rol viene del perfil en Supabase (`profiles`). El SuperAdmin se identifica con `es_superadmin = true`.

---

## 5. Alcance funcional

### 5.1 SaaS — cobros y clientes (hecho)

| Capacidad | Detalle |
|-----------|---------|
| Plan Esencial | Mensual **Bs 500** (+30 días) · Anual **Bs 5.500** (+365 días) · usuarios ilimitados |
| Nuevo cliente | Empresa + plan + primer Administrador |
| Empresa plataforma | Excluida de cobros (`es_plataforma`) |
| Marcar pagado | Solo si el plan está **vencido**; al confirmar se elige periodo (mensual por defecto) |
| Recibo | Número `REC-AAAA-#####`; vista previa; imprimir; **descargar PDF** (móvil abre en visor) |
| Historial | Listado de pagos en `/admin` con reimpresión |
| Aviso / bloqueo | Banner a ≤3 días; pantalla Plan vencido al expirar |
| Marca | `SigocLogo` en login, menú, carga, errores; favicon + PWA icons |

### 5.2 Módulos de obra (menú)

| Módulo | Ruta | Estado UI | Persistencia |
|--------|------|-----------|--------------|
| Panel SaaS | `/admin` | Listo (SuperAdmin) | Supabase |
| Login | `/login` | Listo | Supabase Auth |
| Dashboard | `/` | Listo (KPIs + gráficos) | Supabase (agregados) |
| Proyectos | `/proyectos` | CRUD modal completo | Supabase |
| Presupuesto | `/presupuesto` | Partidas alta/baja | Supabase |
| Contabilidad | `/contabilidad` | Movimientos por tipo | Supabase |
| Documentos | `/documentos` | Alta/listado + Storage | Supabase Storage |
| Fotografías | `/fotografias` | Galería + compresión + Storage | Supabase Storage |
| Cronograma | `/cronograma` | Gantt + alta actividad | Supabase |
| APU | `/apu` | Alta/baja + cálculo PU | Supabase |
| Reportes | `/reportes` | Filtros + tabla | Supabase (export PDF/Excel aún simulado) |
| Usuarios | `/usuarios` | CRUD UI (Admin empresa) | Supabase (perfiles) |
| Configuración | `/configuracion` | Datos empresa | Supabase (`configuracion_empresa`) |

### 5.3 Dashboard — requisitos

- KPIs: total proyectos, activos, presupuesto, ejecutado, saldo, avance físico/financiero.
- Gráficos: presupuesto vs ejecutado; avance en el tiempo.
- Próximos vencimientos, actividad reciente, calendario.

### 5.4 Proyectos

Campos: código, nombre, entidad, empresa contratista, ingeniero responsable, presupuesto, fechas inicio/fin, estado (Activo / Suspendido / Finalizado).

UX: lista con búsqueda/filtros; **Nuevo/Editar en modal**; acciones Ver, Documentos, Fotografías, Eliminar.

### 5.5–5.11 (obra)

Sin cambio de alcance respecto a v2: presupuesto, contabilidad, documentos, fotografías, cronograma, APU, reportes, usuarios/configuración de empresa. Persistencia y Storage siguen en roadmap.

---

## 6. Modelo de datos

### 6.1 Dominio obra (actualmente mock)

Definido en `src/lib/store.tsx`:

```
Project → Partida, Movimiento, Documento, Fotografia, Actividad
Apu → ApuInsumo[]
Usuario (demo) → Role, estado
```

### 6.2 Dominio SaaS (Supabase)

| Entidad | Campos clave |
|---------|----------------|
| `empresas` | id, nombre, nit, `es_plataforma` |
| `profiles` | id (auth), nombre, correo, telefono, rol, estado, empresa_id, `es_superadmin` |
| `suscripciones` | empresa_id, plan, periodo, precios, fechas, estado, max_usuarios |
| `pagos` | numero (`REC-…`), empresa_id, suscripcion_id, periodo, monto, vigencia, metodo |

RPC relevantes: `marcar_pagado_suscripcion(p_suscripcion_id, p_periodo)`, alta de cliente con primer pago, etc.

Migraciones: `supabase/migrations/`.

---

## 7. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | TanStack Start + TanStack Router (file-based) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Recharts, Sonner, Lucide |
| Auth / DB | Supabase (Auth, Postgres, RLS parcial) |
| PDF recibos | jsPDF |
| Estado obra (mock) | React Context (`StoreProvider`) |
| Server state | TanStack Query |
| Build | Vite 8, Nitro |
| Deploy | Lovable / Cloudflare-oriented |
| Marca / PWA | `SigocLogo`, `favicon.svg`, `apple-touch-icon.png`, `site.webmanifest` |

---

## 8. Requisitos no funcionales

| Área | Requisito |
|------|-----------|
| Responsive | Desktop, tablet y móvil |
| Idioma / locale | Español; moneda `es-BO` / BOB; fechas dd/mm/aaaa |
| Zona horaria UI | Fechas locales (no UTC en emisión de recibos) |
| Seguridad | Auth + RLS; service role solo servidor; sin secretos en cliente |
| Disponibilidad | Hosting + Supabase managed |
| Auditoría (fase 2) | Historial de cambios críticos |
| Performance | Listados paginados; Storage con URLs firmadas |

---

## 9. Fuera de alcance (próxima fase de obra)

- App nativa móvil (PWA básica ya iniciada con manifest/iconos).
- BIM / integración AutoCAD avanzada.
- Contabilidad tributaria formal (SIAT).
- Pasarela de pago automática (hoy registro manual por SuperAdmin).
- Aprobaciones workflow complejas (fase 2).
- Cambio de plan en caliente sin pago (el periodo se elige al marcar pagado).

---

## 10. Roadmap

| Fase | Entrega | Criterio de done | Estado |
|------|---------|------------------|--------|
| **0** | Prototipo UI | 11 módulos con mock | Hecho |
| **1** | Supabase Auth + perfiles | Login real, roles | Hecho |
| **2** | SaaS suscripciones | Cobro, recibos, bloqueo | Hecho |
| **3** | CRUD obra persistente | Proyectos, partidas, movimientos | Hecho |
| **4** | Storage | Documentos + fotografías (compresión) | Hecho |
| **5** | RLS obra multi-tenant | Sin fuga entre empresas | Hecho |
| **6** | Cronograma + reportes reales | CRUD + export PDF/Excel | Parcial (CRUD sí; export simulado) |
| **7** | Producción endurecida | Backups, monitoreo, seed demo | Parcial |

Guía técnica base: [`SUPABASE-INTEGRACION.md`](./SUPABASE-INTEGRACION.md).  
Roles y precios: [`ROLES-SAAS.md`](./ROLES-SAAS.md).

---

## 11. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Obra aún en memoria | Priorizar persistencia de proyectos/partidas |
| Permisos obra solo en cliente | RLS obligatorio por `empresa_id` |
| Archivos en data URL | Migrar a Storage + paths en DB |
| Lovable + force push | No reescribir historial git publicado |
| Popups / PDF en móvil | Vista previa + descarga/apertura en visor (ya mitigado) |

---

## 12. Criterios de aceptación

### 12.1 SaaS (vigentes)

1. SuperAdmin inicia sesión y solo ve `/admin` (sin menú de obra).
2. Alta de cliente crea empresa, suscripción y Administrador; genera recibo.
3. Con plan vencido, SuperAdmin marca pagado eligiendo mensual/anual; se descarga/abre PDF del recibo.
4. Cliente con plan vencido ve bloqueo; con plan vigente opera su empresa.
5. Administrador crea usuarios de su empresa; no ve otras empresas ni `/admin`.

### 12.2 Obra + Supabase (pendientes)

1. Crear/editar/eliminar un proyecto; sobrevive a F5.
2. Subir PDF y foto; se pueden abrir después.
3. Contabilidad registra factura persistente.
4. Consulta no puede mutar (UI + RLS).
5. Build de producción sin service role en el cliente.

---

## 13. Referencias en el código

| Archivo / carpeta | Rol |
|-------------------|-----|
| `src/lib/auth.tsx` | Sesión, perfil, SuperAdmin |
| `src/lib/subscription.ts` | Estado de suscripción, fechas BO |
| `src/lib/recibo.ts` | HTML recibo + PDF (jsPDF) |
| `src/lib/app-version.ts` | Versión desde `package.json` |
| `src/components/SigocLogo.tsx` | Marca UI + pantalla de carga |
| `src/components/AppShell.tsx` | Layout, nav por rol |
| `src/components/RequireAuth.tsx` | Guard de sesión / plan |
| `src/routes/admin.tsx` | Panel SaaS |
| `src/routes/login.tsx` | Login |
| `src/lib/obra/hooks.ts` | CRUD obra vía Supabase + React Query |
| `src/lib/compress-image.ts` | Compresión de fotos en cliente |
| `src/lib/store.tsx` | Tipos, permisos, helpers (sin mock CRUD) |
| `supabase/migrations/` | Schema SaaS (empresas, suscripciones, pagos) |
| `public/` | Favicon, apple-touch, PWA manifest |
| `docs/ROLES-SAAS.md` | Matriz de roles y precios |
| `docs/SUPABASE-INTEGRACION.md` | Integración Supabase |
