# PRD — SIGOC (Civil Project Hub)

| Campo | Valor |
|-------|--------|
| **Producto** | SIGOC — Sistema de Gestión de Proyectos Civiles |
| **Repositorio** | civiproject-hub |
| **Versión PRD** | 2.0 |
| **Fecha** | Agosto 2026 |
| **Estado del producto** | Prototipo UI funcional (datos en memoria) |
| **Mercado** | Bolivia (moneda BOB, entidades GAM / ABC / EPSAS) |

---

## 1. Resumen ejecutivo

SIGOC es una aplicación web para administrar proyectos de construcción de forma centralizada: información técnica, económica y administrativa, documentos, presupuestos, avance físico/financiero y usuarios con permisos por rol.

**Estado actual:** existe un MVP visual completo (11 módulos) sobre TanStack Start + React 19 + shadcn/ui, con datos mock en `src/lib/store.tsx`. No hay backend, autenticación real ni persistencia.

**Siguiente hito crítico:** conectar Supabase (Auth + PostgreSQL + Storage + RLS) para convertir el prototipo en un sistema usable en producción.

---

## 2. Problema

Hoy la información de obra vive dispersa en Excel, carpetas y papel. Falta:

- Un solo lugar para proyecto, presupuesto, avance y documentos.
- Control de quién ve y quién edita (ingeniería vs contabilidad vs consulta).
- Historial y reportes confiables en tiempo real.
- Almacenamiento seguro de planos, facturas y fotos de avance.

---

## 3. Objetivos

### 3.1 Objetivo general

Digitalizar y centralizar la gestión de proyectos civiles con control financiero, avance de obra, repositorio documental y reportes, con acceso según rol.

### 3.2 Objetivos específicos

1. Centralizar datos del proyecto (técnicos, económicos, administrativos).
2. Controlar presupuesto por partidas y ejecución financiera.
3. Digitalizar documentos técnicos (PDF, DWG, Office, ZIP).
4. Almacenar fotografías de avance con metadatos.
5. Gestionar usuarios y permisos por rol (y, a futuro, por proyecto).
6. Generar reportes exportables (PDF / Excel).
7. Reducir dependencia de documentos físicos.

### 3.3 Métricas de éxito (MVP backend)

| Métrica | Meta |
|---------|------|
| Persistencia tras refresh | 100% de CRUD críticos |
| Login / sesión real | Auth Supabase operativa |
| Archivos en Storage | Documentos y fotos subibles y descargables |
| Seguridad | RLS activa; sin acceso cruzado indebido |
| Roles | Matriz de permisos enforceada en DB + UI |

---

## 4. Usuarios y roles

| Rol | Descripción | Lectura | Escritura |
|-----|-------------|---------|-----------|
| **Administrador** | Control total del sistema | Todos los módulos | Proyectos, presupuesto, contabilidad, docs, fotos, APU, usuarios, config |
| **Ingeniero Residente** | Operación de obra | Dashboard, proyectos, presupuesto, docs, fotos, cronograma, APU, reportes | Proyectos, presupuesto, docs, fotos, APU |
| **Supervisor** | Seguimiento y evidencias | Similar a ingeniero (sin contabilidad/usuarios/config) | Solo documentos y fotografías |
| **Contabilidad** | Economía del proyecto | Dashboard, presupuesto, contabilidad, reportes | Solo contabilidad |
| **Consulta** | Solo lectura | Dashboard, proyectos, presupuesto, docs, fotos, cronograma, reportes | Ninguna |

> Implementación actual: selector de rol demo en el header (sin login). En producción el rol vendrá del perfil en Supabase.

---

## 5. Alcance funcional

### 5.1 Módulos (menú)

| Módulo | Ruta | Estado UI | Persistencia |
|--------|------|-----------|--------------|
| Dashboard | `/` | Listo (KPIs + gráficos) | Solo lectura agregada |
| Proyectos | `/proyectos` | CRUD modal completo | Memoria |
| Presupuesto | `/presupuesto` | Partidas alta/baja | Memoria |
| Contabilidad | `/contabilidad` | Movimientos por tipo | Memoria; adjuntos UI only |
| Documentos | `/documentos` | Alta/listado por categoría | Sin Storage real |
| Fotografías | `/fotografias` | Galería + preview local | Data URL en memoria |
| Cronograma | `/cronograma` | Gantt lectura | Mock fijo; sin CRUD |
| APU | `/apu` | Alta/baja + cálculo PU | Memoria |
| Reportes | `/reportes` | Filtros + tabla | Export PDF/Excel simulado |
| Usuarios | `/usuarios` | CRUD UI | Password no se guarda |
| Configuración | `/configuracion` | Formulario | Solo toast |

### 5.2 Dashboard — requisitos

- KPIs: total proyectos, activos, presupuesto, ejecutado, saldo, avance físico/financiero.
- Gráficos: presupuesto vs ejecutado; avance en el tiempo.
- Próximos vencimientos, actividad reciente, calendario.

### 5.3 Proyectos

Campos: código, nombre, entidad, empresa contratista, ingeniero responsable, presupuesto, fechas inicio/fin, estado (Activo / Suspendido / Finalizado).

UX: lista con búsqueda/filtros; **Nuevo/Editar en modal** (no navegación a otra página); acciones Ver, Documentos, Fotografías, Eliminar.

### 5.4 Presupuesto

Partidas por proyecto: nombre, monto, ejecutado. Totales y barra de avance presupuestario.

### 5.5 Contabilidad

Tipos: Ingreso, Egreso, Factura, Pago, Retención, Planilla. Factura con proveedor, NIT, número, monto, fecha, adjuntos, observación.

### 5.6 Documentos

Categorías: Planos, Contratos, Memorias, Licitaciones, Informes, APU, Actas. Formatos: PDF, Word, Excel, DWG, ZIP.

### 5.7 Fotografías

Metadatos: fecha, descripción, ubicación, autor, imagen vinculada al proyecto.

### 5.8 Cronograma

Actividades con inicio/fin, responsable, estado, avance; vista Gantt. (Hoy solo lectura.)

### 5.9 APU

Insumos: materiales, equipos, mano de obra; % indirectos y utilidad; precio unitario calculado.

### 5.10 Reportes

Filtros por proyecto/estado/empresa/responsable/fecha; exportación real a PDF y Excel (pendiente).

### 5.11 Usuarios y configuración

Alta de usuarios con rol y estado; parámetros de empresa, marca, respaldos y notificaciones (persistencia pendiente).

---

## 6. Modelo de datos (dominio actual)

Definido en `src/lib/store.tsx`:

```
Project          → Partida, Movimiento, Documento, Fotografia, Actividad
Apu              → ApuInsumo[] (materiales | equipos | manoObra)
Usuario          → Role, estado
```

| Entidad | Campos clave |
|---------|----------------|
| Project | id, codigo, nombre, entidad, empresa, responsable, presupuesto, ejecutado, avanceFisico, fechas, estado |
| Partida | id, proyectoId, nombre, monto, ejecutado, descripcion |
| Movimiento | id, tipo, proyectoId, proveedor, nit, numero, monto, fecha, observacion |
| Documento | id, nombre, categoria, proyectoId, archivo, peso, descripcion, fecha |
| Fotografia | id, proyectoId, fecha, descripcion, ubicacion, autor, imagen |
| Apu | id, codigo, descripcion, unidad, cantidad, insumos, indirectos, utilidad |
| Actividad | id, proyectoId, nombre, inicio, fin, responsable, estado, avance |
| Usuario | id, nombre, correo, telefono, rol, estado |

---

## 7. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | TanStack Start + TanStack Router (file-based) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Recharts, Sonner |
| Estado cliente | React Context (`StoreProvider`) |
| Server state | TanStack Query (montado; sin API aún) |
| Build | Vite 8, Nitro, deploy orientado a Cloudflare |
| Plataforma | Lovable (sync git) |
| Backend objetivo | **Supabase** (Auth, Postgres, Storage, RLS) |

---

## 8. Requisitos no funcionales

| Área | Requisito |
|------|-----------|
| Responsive | Desktop, tablet y móvil |
| Idioma / locale | Español; formato moneda `es-BO` / BOB |
| Seguridad | Auth + RLS; sin secretos en el cliente (solo anon key) |
| Disponibilidad | Hosting estático/SSR + Supabase managed |
| Auditoría (fase 2) | Historial de cambios críticos |
| Performance | Listados paginados; Storage con URLs firmadas |

---

## 9. Fuera de alcance (v1 backend)

- App nativa móvil (PWA opcional después).
- BIM / integración AutoCAD avanzada.
- Contabilidad tributaria formal (SIAT) más allá de registro de facturas.
- Multi-empresa / SaaS multi-tenant completo (se puede diseñar schema preparado).
- Aprobaciones workflow complejas (fase 2: informes/planillas).

---

## 10. Roadmap

| Fase | Entrega | Criterio de done |
|------|---------|------------------|
| **0** | Prototipo UI (actual) | 11 módulos con mock |
| **1** | Supabase base | Proyecto, schema, Auth, cliente JS |
| **2** | CRUD persistente | Proyectos, partidas, movimientos, usuarios |
| **3** | Storage | Documentos + fotografías |
| **4** | RLS y roles | Matriz enforceada; login real; quitar selector demo |
| **5** | Cronograma + reportes | CRUD actividades; export PDF/Excel |
| **6** | Producción | Env, backups, monitoreo, seed demo opcional |

Guía detallada de la fase 1–4: ver [`SUPABASE-INTEGRACION.md`](./SUPABASE-INTEGRACION.md).

---

## 11. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Solo UI sin backend | Priorizar Supabase antes de más pantallas |
| Permisos solo en cliente | RLS obligatorio en Postgres |
| Archivos en data URL | Migrar a Storage + paths en DB |
| Lovable + force push | No reescribir historial git publicado |
| MCP Supabase de otro producto | Usar proyecto Supabase dedicado a SIGOC |

---

## 12. Criterios de aceptación del MVP con Supabase

1. Un usuario inicia sesión con email/password y ve solo módulos de su rol.
2. Crear/editar/eliminar un proyecto; sobrevive a F5.
3. Subir un PDF a Documentos y una foto a Fotografías; se pueden abrir después.
4. Contabilidad registra una factura; aparece en listado y en totales.
5. Un usuario Consulta no puede mutar datos (UI + RLS).
6. Variables de entorno documentadas; build de producción sin secretos de service role en el cliente.

---

## 13. Referencias en el código

| Archivo | Rol |
|---------|-----|
| `src/lib/store.tsx` | Tipos, mocks, permisos, CRUD memoria |
| `src/components/AppShell.tsx` | Layout, nav, rol demo |
| `src/routes/*.tsx` | Pantallas por módulo |
| `README.md` | PRD v1.0 original (visión de producto) |
| `docs/SUPABASE-INTEGRACION.md` | Paso a paso integración Supabase |
