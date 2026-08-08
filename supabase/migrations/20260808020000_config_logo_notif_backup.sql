-- Logo, notificaciones y preferencia de respaldo en configuración por empresa
alter table public.configuracion_empresa
  add column if not exists logo_path text,
  add column if not exists notif_plazos boolean not null default true,
  add column if not exists notif_facturas boolean not null default true,
  add column if not exists notif_informes boolean not null default true,
  add column if not exists respaldo_auto boolean not null default true;
