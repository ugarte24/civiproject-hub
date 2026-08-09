import type {
  Actividad,
  Apu,
  ApuInsumo,
  DocCategoria,
  Documento,
  Fotografia,
  Movimiento,
  MovimientoTipo,
  Partida,
  Project,
  ProjectStatus,
} from "@/lib/store";

export type ProyectoRow = {
  id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  entidad: string;
  empresa: string;
  responsable: string;
  presupuesto: number;
  ejecutado: number;
  avance_fisico: number;
  fecha_inicio: string;
  fecha_final: string;
  estado: ProjectStatus;
};

export function mapProyecto(r: ProyectoRow): Project & { empresaId: string } {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    codigo: r.codigo,
    nombre: r.nombre,
    entidad: r.entidad,
    empresa: r.empresa,
    responsable: r.responsable,
    presupuesto: Number(r.presupuesto),
    ejecutado: Number(r.ejecutado),
    avanceFisico: Number(r.avance_fisico),
    fechaInicio: r.fecha_inicio,
    fechaFinal: r.fecha_final,
    estado: r.estado,
  };
}

export function mapPartida(r: {
  id: string;
  proyecto_id: string;
  nombre: string;
  monto: number;
  ejecutado: number;
  descripcion: string | null;
}): Partida {
  return {
    id: r.id,
    proyectoId: r.proyecto_id,
    nombre: r.nombre,
    monto: Number(r.monto),
    ejecutado: Number(r.ejecutado),
    descripcion: r.descripcion ?? "",
  };
}

export function mapMovimiento(r: {
  id: string;
  tipo: MovimientoTipo;
  proyecto_id: string;
  proveedor: string;
  nit: string | null;
  numero: string | null;
  monto: number;
  fecha: string;
  observacion: string | null;
  adjunto_path?: string | null;
}): Movimiento {
  // Retencion quedó fuera del módulo; registros viejos se muestran como Egreso.
  const tipo = (r.tipo as string) === "Retencion" ? "Egreso" : r.tipo;
  return {
    id: r.id,
    tipo,
    proyectoId: r.proyecto_id,
    proveedor: r.proveedor,
    nit: r.nit ?? "",
    numero: r.numero ?? "",
    monto: Number(r.monto),
    fecha: r.fecha,
    observacion: r.observacion ?? "",
    ...(r.adjunto_path ? { adjuntoPath: r.adjunto_path } : {}),
  };
}

export function mapDocumento(r: {
  id: string;
  nombre: string;
  categoria: DocCategoria;
  proyecto_id: string;
  storage_path: string;
  peso: string | null;
  descripcion: string | null;
  fecha: string;
}): Documento {
  return {
    id: r.id,
    nombre: r.nombre,
    categoria: r.categoria,
    proyectoId: r.proyecto_id,
    archivo: r.storage_path,
    peso: r.peso ?? "—",
    descripcion: r.descripcion ?? "",
    fecha: r.fecha,
  };
}

export function mapFotografia(r: {
  id: string;
  proyecto_id: string;
  fecha: string;
  descripcion: string | null;
  ubicacion: string | null;
  autor: string | null;
  storage_path: string;
}): Fotografia {
  return {
    id: r.id,
    proyectoId: r.proyecto_id,
    fecha: r.fecha,
    descripcion: r.descripcion ?? "",
    ubicacion: r.ubicacion ?? "",
    autor: r.autor ?? "",
    imagen: r.storage_path,
  };
}

export function mapActividad(r: {
  id: string;
  proyecto_id: string;
  nombre: string;
  inicio: string;
  fin: string;
  responsable: string | null;
  estado: Actividad["estado"];
  avance: number;
}): Actividad {
  return {
    id: r.id,
    proyectoId: r.proyecto_id,
    nombre: r.nombre,
    inicio: r.inicio,
    fin: r.fin,
    responsable: r.responsable ?? "",
    estado: r.estado,
    avance: Number(r.avance),
  };
}

export function mapApu(r: {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  materiales: ApuInsumo[];
  equipos: ApuInsumo[];
  mano_obra: ApuInsumo[];
  indirectos: number;
  utilidad: number;
}): Apu {
  return {
    id: r.id,
    codigo: r.codigo,
    descripcion: r.descripcion,
    unidad: r.unidad,
    cantidad: Number(r.cantidad),
    materiales: (r.materiales ?? []) as ApuInsumo[],
    equipos: (r.equipos ?? []) as ApuInsumo[],
    manoObra: (r.mano_obra ?? []) as ApuInsumo[],
    indirectos: Number(r.indirectos),
    utilidad: Number(r.utilidad),
  };
}
