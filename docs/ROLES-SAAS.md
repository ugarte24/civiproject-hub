# Roles SaaS — SIGOC

## Precios plan Esencial

| Periodo | Precio | Extensión al pagar | Usuarios |
|---------|--------|--------------------|----------|
| Mensual | Bs 500 | +30 días | Ilimitados |
| Anual | Bs 5.500 | +365 días | Ilimitados |

## SuperAdmin (dueño del SaaS)

- Panel `/admin`: clientes, vencimientos, marcar pagado, ver/editar usuarios por cliente, historial de recibos
- **Nuevo cliente**: empresa + plan (mensual/anual) + primer Administrador
- Ve empresas y perfiles desde el panel (botón Usuarios por cliente)
- No se bloquea por suscripción vencida
- **No paga** plan: su cuenta/empresa plataforma no aparece en cobros (`es_plataforma`)
- **No opera la obra** (sin menú de proyectos/presupuesto/etc.; rutas de obra redirigen a `/admin`)
- **Mi perfil** en el pie del sidebar (datos personales)
- Sin menú `/usuarios` de plataforma

## Administrador (cliente)

- Opera módulos de **su empresa** (proyectos, presupuesto, contabilidad, docs, etc.)
- **Crea usuarios** de su empresa (ilimitados): Ingeniero, Supervisor, Contabilidad, Consulta, Admin
- Edita roles/estado de su equipo
- Sujeto a suscripción: aviso a 3 días, bloqueo al vencer
- No ve `/admin` ni otras empresas
- No puede marcar `es_superadmin`

## Flujo de cobro

1. Cliente paga QR/transferencia (Bs 500 o Bs 5.500)
2. Envía comprobante
3. SuperAdmin → **Marcar pagado** solo si el plan está **vencido**
4. Al confirmar, elige **mensual (default)** o **anual** → genera recibo `REC-AAAA-#####` y reactiva vigencia
5. Recibo: vista previa, imprimir, **descargar PDF** (en móvil se abre en el visor para WhatsApp)
6. SuperAdmin puede **reimprimir / re-descargar** desde Historial de pagos

> El periodo del próximo cobro se define al marcar pagado (no hay botón aparte de “Cambiar plan”).
