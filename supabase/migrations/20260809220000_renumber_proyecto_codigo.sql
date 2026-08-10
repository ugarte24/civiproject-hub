-- Renumerar códigos de proyecto a correlativo 001, 002, …
-- (por empresa, ordenados por código actual e id)

update public.proyectos
set codigo = 'tmp-' || id::text
where codigo is not null;

with ordered as (
  select
    id,
    row_number() over (
      partition by empresa_id
      order by id
    ) as rn
  from public.proyectos
)
update public.proyectos p
set codigo = lpad(o.rn::text, 3, '0')
from ordered o
where p.id = o.id;
