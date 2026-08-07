# Roles SaaS — SIGOC

## Precios plan Esencial

| Periodo | Precio | Extensión al pagar | Usuarios |
|---------|--------|--------------------|----------|
| Mensual | Bs 500 | +30 días | Ilimitados |
| Anual | Bs 5.500 | +365 días | Ilimitados |

## SuperAdmin (dueño del SaaS)

- Panel `/admin`: clientes, vencimientos, marcar pagado, ver usuarios y cambiar plan
- **Nuevo cliente**: empresa + plan (mensual/anual) + primer Administrador
- Ve todas las empresas y perfiles (desde el panel, botón Usuarios por cliente)
- No se bloquea por suscripción vencida
- **No paga** plan: su cuenta/empresa plataforma no aparece en cobros
- **No opera la obra** (sin menú de proyectos/presupuesto/etc.; cualquier ruta de obra redirige a `/admin`)
- Sin menú `/usuarios` de plataforma (usuarios de cliente se ven desde Panel SaaS)

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
3. SuperAdmin → **Marcar pagado** (+30 o +365 según periodo)
4. SuperAdmin puede **cambiar plan** (mensual ↔ anual) sin alterar la fecha fin actual; el próximo pago usa el nuevo periodo
