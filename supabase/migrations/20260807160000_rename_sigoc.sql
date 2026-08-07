-- Renombrar marca plataforma SIGEPROC → SIGOC
update public.empresas
set nombre = 'SIGOC (cuenta propia)'
where nombre ilike 'SIGEPROC (cuenta propia)'
   or nombre = 'SIGEPROC (cuenta propia)';
