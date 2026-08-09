-- Retención dejó de usarse en Contabilidad (no afectaba totales).
-- Conservamos el valor del enum por compatibilidad; migrar filas existentes a Egreso.
update public.movimientos
set tipo = 'Egreso'
where tipo = 'Retencion';
