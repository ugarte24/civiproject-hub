import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type {
  Actividad,
  Apu,
  DocCategoria,
  MovimientoTipo,
  Project,
  ProjectStatus,
} from "@/lib/store";
import {
  mapActividad,
  mapApu,
  mapDocumento,
  mapFotografia,
  mapMovimiento,
  mapPartida,
  mapProyecto,
  type ProyectoRow,
} from "@/lib/obra/mappers";

const qk = {
  proyectos: ["obra", "proyectos"] as const,
  partidas: ["obra", "partidas"] as const,
  movimientos: ["obra", "movimientos"] as const,
  documentos: ["obra", "documentos"] as const,
  fotografias: ["obra", "fotografias"] as const,
  actividades: ["obra", "actividades"] as const,
  apus: ["obra", "apus"] as const,
  config: ["obra", "config"] as const,
  miembros: ["obra", "miembros"] as const,
};

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function useProyectos() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.proyectos, profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proyectos")
        .select("*")
        .order("created_at", { ascending: false });
      throwIf(error);
      return ((data ?? []) as ProyectoRow[]).map(mapProyecto);
    },
  });
}

export function useUpsertProyecto() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      codigo: string;
      nombre: string;
      entidad: string;
      empresa: string;
      responsable: string;
      presupuesto: number;
      fechaInicio: string;
      fechaFinal: string;
      estado: ProjectStatus;
      ejecutado?: number;
      avanceFisico?: number;
    }) => {
      if (!profile?.empresa_id) throw new Error("Sin empresa asignada");
      const row = {
        empresa_id: profile.empresa_id,
        codigo: input.codigo,
        nombre: input.nombre,
        entidad: input.entidad,
        empresa: input.empresa,
        responsable: input.responsable,
        presupuesto: input.presupuesto,
        fecha_inicio: input.fechaInicio,
        fecha_final: input.fechaFinal,
        estado: input.estado,
        ...(input.ejecutado != null ? { ejecutado: input.ejecutado } : {}),
        ...(input.avanceFisico != null ? { avance_fisico: input.avanceFisico } : {}),
      };
      if (input.id) {
        const { error } = await supabase.from("proyectos").update(row).eq("id", input.id);
        throwIf(error);
        return input.id;
      }
      const { data, error } = await supabase.from("proyectos").insert(row).select("id").single();
      throwIf(error);
      return data!.id as string;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.proyectos }),
  });
}

export function useDeleteProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proyectos").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.proyectos }),
  });
}

export type EmpresaUsuario = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  estado: string;
};

export function useEmpresaUsuarios(opts?: { enabled?: boolean }) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.miembros, "usuarios", profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id) && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, correo, rol, estado")
        .eq("empresa_id", profile!.empresa_id!)
        .eq("es_superadmin", false)
        .order("nombre");
      throwIf(error);
      return (data ?? []).map((r) => ({
        id: r.id as string,
        nombre: (r.nombre as string) || "—",
        correo: (r.correo as string) || "—",
        rol: (r.rol as string) || "Consulta",
        estado: (r.estado as string) === "Inactivo" ? "Inactivo" : "Activo",
      })) as EmpresaUsuario[];
    },
  });
}

export type ProyectoMiembro = {
  proyectoId: string;
  userId: string;
  nombre: string;
  correo: string;
  rol: string;
};

export function useProyectoMiembros(proyectoId: string | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.miembros, proyectoId, profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id && proyectoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proyecto_miembros")
        .select("proyecto_id, user_id, profiles:user_id (id, nombre, correo, rol)")
        .eq("proyecto_id", proyectoId!);
      throwIf(error);
      return (data ?? []).map((r) => {
        const p = r.profiles as
          | { id: string; nombre: string | null; correo: string | null; rol: string | null }
          | null
          | Array<{ id: string; nombre: string | null; correo: string | null; rol: string | null }>;
        const profileRow = Array.isArray(p) ? p[0] : p;
        return {
          proyectoId: r.proyecto_id as string,
          userId: r.user_id as string,
          nombre: profileRow?.nombre || "—",
          correo: profileRow?.correo || "—",
          rol: profileRow?.rol || "Consulta",
        } as ProyectoMiembro;
      });
    },
  });
}

export function useAddProyectoMiembro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { proyectoId: string; userId: string }) => {
      const { error } = await supabase.from("proyecto_miembros").insert({
        proyecto_id: input.proyectoId,
        user_id: input.userId,
      });
      throwIf(error);
    },
    onSuccess: (_d, vars) =>
      void qc.invalidateQueries({ queryKey: [...qk.miembros, vars.proyectoId] }),
  });
}

export function useRemoveProyectoMiembro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { proyectoId: string; userId: string }) => {
      const { error } = await supabase
        .from("proyecto_miembros")
        .delete()
        .eq("proyecto_id", input.proyectoId)
        .eq("user_id", input.userId);
      throwIf(error);
    },
    onSuccess: (_d, vars) =>
      void qc.invalidateQueries({ queryKey: [...qk.miembros, vars.proyectoId] }),
  });
}

export function usePartidas() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.partidas, profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("partidas").select("*").order("nombre");
      throwIf(error);
      return (data ?? []).map(mapPartida);
    },
  });
}

export function useAddPartida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      proyectoId: string;
      nombre: string;
      monto: number;
      descripcion: string;
      ejecutado?: number;
    }) => {
      const { error } = await supabase.from("partidas").insert({
        proyecto_id: p.proyectoId,
        nombre: p.nombre,
        monto: p.monto,
        descripcion: p.descripcion,
        ejecutado: p.ejecutado ?? 0,
      });
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.partidas }),
  });
}

export function useUpdatePartida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      nombre: string;
      monto: number;
      descripcion: string;
      ejecutado: number;
    }) => {
      const { error } = await supabase
        .from("partidas")
        .update({
          nombre: p.nombre,
          monto: p.monto,
          descripcion: p.descripcion,
          ejecutado: p.ejecutado,
        })
        .eq("id", p.id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.partidas }),
  });
}

export function useDeletePartida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partidas").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.partidas }),
  });
}

export function useMovimientos(opts?: { enabled?: boolean }) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.movimientos, profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id) && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimientos")
        .select("*")
        .order("fecha", { ascending: false });
      throwIf(error);
      return (data ?? []).map(mapMovimiento);
    },
  });
}

export function useAddMovimiento() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (m: {
      tipo: MovimientoTipo;
      proyectoId: string;
      proveedor: string;
      nit: string;
      numero: string;
      monto: number;
      fecha: string;
      observacion: string;
      file?: File | null;
    }) => {
      if (!profile?.empresa_id) throw new Error("Sin empresa asignada");
      let adjunto_path: string | null = null;
      if (m.file) {
        const ext = m.file.name.split(".").pop() || "bin";
        adjunto_path = `${profile.empresa_id}/${m.proyectoId}/movimientos/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documentos")
          .upload(adjunto_path, m.file, {
            upsert: false,
            contentType: m.file.type || "application/octet-stream",
          });
        throwIf(upErr);
      }
      const { error } = await supabase.from("movimientos").insert({
        tipo: m.tipo,
        proyecto_id: m.proyectoId,
        proveedor: m.proveedor,
        nit: m.nit || null,
        numero: m.numero || null,
        monto: m.monto,
        fecha: m.fecha,
        observacion: m.observacion,
        adjunto_path,
      });
      throwIf(error);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.movimientos });
      void qc.invalidateQueries({ queryKey: qk.proyectos });
    },
  });
}

export function useUpdateMovimiento() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (m: {
      id: string;
      tipo: MovimientoTipo;
      proyectoId: string;
      proveedor: string;
      nit: string;
      numero: string;
      monto: number;
      fecha: string;
      observacion: string;
      file?: File | null;
      adjuntoPath?: string;
    }) => {
      if (!profile?.empresa_id) throw new Error("Sin empresa asignada");
      let adjunto_path = m.adjuntoPath ?? null;
      if (m.file) {
        const ext = m.file.name.split(".").pop() || "bin";
        const newPath = `${profile.empresa_id}/${m.proyectoId}/movimientos/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documentos")
          .upload(newPath, m.file, {
            upsert: false,
            contentType: m.file.type || "application/octet-stream",
          });
        throwIf(upErr);
        if (m.adjuntoPath) {
          await supabase.storage.from("documentos").remove([m.adjuntoPath]);
        }
        adjunto_path = newPath;
      }
      const { error } = await supabase
        .from("movimientos")
        .update({
          tipo: m.tipo,
          proyecto_id: m.proyectoId,
          proveedor: m.proveedor,
          nit: m.nit || null,
          numero: m.numero || null,
          monto: m.monto,
          fecha: m.fecha,
          observacion: m.observacion,
          adjunto_path,
        })
        .eq("id", m.id);
      throwIf(error);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.movimientos });
      void qc.invalidateQueries({ queryKey: qk.proyectos });
    },
  });
}

export function useDeleteMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { id: string; adjuntoPath?: string }) => {
      if (m.adjuntoPath) {
        await supabase.storage.from("documentos").remove([m.adjuntoPath]);
      }
      const { error } = await supabase.from("movimientos").delete().eq("id", m.id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.movimientos }),
  });
}

export function useDocumentos() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.documentos, profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .order("fecha", { ascending: false });
      throwIf(error);
      return (data ?? []).map(mapDocumento);
    },
  });
}

export function useAddDocumento() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (d: {
      nombre: string;
      categoria: DocCategoria;
      proyectoId: string;
      descripcion: string;
      file: File;
    }) => {
      if (!profile?.empresa_id) throw new Error("Sin empresa asignada");
      const ext = d.file.name.split(".").pop() || "bin";
      const path = `${profile.empresa_id}/${d.proyectoId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, d.file, {
        upsert: false,
        contentType: d.file.type || "application/octet-stream",
      });
      throwIf(upErr);
      const peso =
        d.file.size < 1024 * 1024
          ? `${(d.file.size / 1024).toFixed(1)} KB`
          : `${(d.file.size / (1024 * 1024)).toFixed(2)} MB`;
      const { error } = await supabase.from("documentos").insert({
        nombre: d.nombre,
        categoria: d.categoria,
        proyecto_id: d.proyectoId,
        storage_path: path,
        peso,
        descripcion: d.descripcion,
        fecha: new Date().toISOString().slice(0, 10),
        created_by: user?.id ?? null,
      });
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.documentos }),
  });
}

export function useUpdateDocumento() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (d: {
      id: string;
      nombre: string;
      categoria: DocCategoria;
      proyectoId: string;
      descripcion: string;
      archivo?: string;
      file?: File | null;
    }) => {
      let storage_path = d.archivo;
      let peso: string | undefined;
      if (d.file) {
        if (!profile?.empresa_id) throw new Error("Sin empresa asignada");
        const ext = d.file.name.split(".").pop() || "bin";
        const path = `${profile.empresa_id}/${d.proyectoId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("documentos").upload(path, d.file, {
          upsert: false,
          contentType: d.file.type || "application/octet-stream",
        });
        throwIf(upErr);
        if (d.archivo) {
          await supabase.storage.from("documentos").remove([d.archivo]);
        }
        storage_path = path;
        peso =
          d.file.size < 1024 * 1024
            ? `${(d.file.size / 1024).toFixed(1)} KB`
            : `${(d.file.size / (1024 * 1024)).toFixed(2)} MB`;
      }
      const { error } = await supabase
        .from("documentos")
        .update({
          nombre: d.nombre,
          categoria: d.categoria,
          proyecto_id: d.proyectoId,
          descripcion: d.descripcion,
          ...(storage_path ? { storage_path } : {}),
          ...(peso ? { peso } : {}),
        })
        .eq("id", d.id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.documentos }),
  });
}

export function useDeleteDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: { id: string; archivo: string }) => {
      if (doc.archivo) {
        await supabase.storage.from("documentos").remove([doc.archivo]);
      }
      const { error } = await supabase.from("documentos").delete().eq("id", doc.id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.documentos }),
  });
}

export async function signedUrl(bucket: "documentos" | "fotografias", path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  throwIf(error);
  return data!.signedUrl;
}

export function useFotografias(opts?: { enabled?: boolean }) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.fotografias, profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id) && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fotografias")
        .select("*")
        .order("fecha", { ascending: false });
      throwIf(error);
      return (data ?? []).map(mapFotografia);
    },
  });
}

export function useAddFotografia() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (f: {
      proyectoId: string;
      fecha: string;
      descripcion: string;
      ubicacion: string;
      autor: string;
      file: File;
    }) => {
      if (!profile?.empresa_id) throw new Error("Sin empresa asignada");
      const mime = f.file.type || "image/jpeg";
      const ext =
        mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${profile.empresa_id}/${f.proyectoId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("fotografias").upload(path, f.file, {
        upsert: false,
        contentType: mime,
      });
      throwIf(upErr);
      const { error } = await supabase.from("fotografias").insert({
        proyecto_id: f.proyectoId,
        fecha: f.fecha,
        descripcion: f.descripcion,
        ubicacion: f.ubicacion,
        autor: f.autor,
        storage_path: path,
        created_by: user?.id ?? null,
      });
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.fotografias }),
  });
}

export function useUpdateFotografia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: {
      id: string;
      proyectoId: string;
      fecha: string;
      descripcion: string;
      ubicacion: string;
      autor: string;
    }) => {
      const { error } = await supabase
        .from("fotografias")
        .update({
          proyecto_id: f.proyectoId,
          fecha: f.fecha,
          descripcion: f.descripcion,
          ubicacion: f.ubicacion,
          autor: f.autor,
        })
        .eq("id", f.id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.fotografias }),
  });
}

export function useDeleteFotografia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (foto: { id: string; imagen: string }) => {
      if (foto.imagen && !foto.imagen.startsWith("data:")) {
        await supabase.storage.from("fotografias").remove([foto.imagen]);
      }
      const { error } = await supabase.from("fotografias").delete().eq("id", foto.id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.fotografias }),
  });
}

export function useActividades(opts?: { enabled?: boolean }) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.actividades, profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id) && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase.from("actividades").select("*").order("inicio");
      throwIf(error);
      return (data ?? []).map(mapActividad);
    },
  });
}

export function useUpsertActividad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: {
      id?: string;
      proyectoId: string;
      nombre: string;
      inicio: string;
      fin: string;
      responsable: string;
      estado: Actividad["estado"];
      avance: number;
    }) => {
      const row = {
        proyecto_id: a.proyectoId,
        nombre: a.nombre,
        inicio: a.inicio,
        fin: a.fin,
        responsable: a.responsable,
        estado: a.estado,
        avance: a.avance,
      };
      if (a.id) {
        const { error } = await supabase.from("actividades").update(row).eq("id", a.id);
        throwIf(error);
        return;
      }
      const { error } = await supabase.from("actividades").insert(row);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.actividades }),
  });
}

export function useDeleteActividad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("actividades").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.actividades }),
  });
}

export function useApus() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.apus, profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("apus").select("*").order("codigo");
      throwIf(error);
      return (data ?? []).map(mapApu);
    },
  });
}

export function useAddApu() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (a: Omit<Apu, "id">) => {
      if (!profile?.empresa_id) throw new Error("Sin empresa asignada");
      const { error } = await supabase.from("apus").insert({
        empresa_id: profile.empresa_id,
        codigo: a.codigo,
        descripcion: a.descripcion,
        unidad: a.unidad,
        cantidad: a.cantidad,
        materiales: a.materiales,
        equipos: a.equipos,
        mano_obra: a.manoObra,
        indirectos: a.indirectos,
        utilidad: a.utilidad,
      });
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.apus }),
  });
}

export function useUpdateApu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Apu) => {
      const { error } = await supabase
        .from("apus")
        .update({
          codigo: a.codigo,
          descripcion: a.descripcion,
          unidad: a.unidad,
          cantidad: a.cantidad,
          materiales: a.materiales,
          equipos: a.equipos,
          mano_obra: a.manoObra,
          indirectos: a.indirectos,
          utilidad: a.utilidad,
        })
        .eq("id", a.id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.apus }),
  });
}

export function useDeleteApu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apus").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.apus }),
  });
}

export type ConfigEmpresa = {
  empresa_id: string;
  nombre_empresa: string | null;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  moneda: string;
  costo_indirecto_pct: number;
  utilidad_pct: number;
  logo_path: string | null;
  notif_plazos: boolean;
  notif_facturas: boolean;
  notif_informes: boolean;
  respaldo_auto: boolean;
};

function mapConfig(data: Record<string, unknown>): ConfigEmpresa {
  return {
    empresa_id: String(data["empresa_id"]),
    nombre_empresa: (data["nombre_empresa"] as string | null) ?? null,
    nit: (data["nit"] as string | null) ?? null,
    direccion: (data["direccion"] as string | null) ?? null,
    telefono: (data["telefono"] as string | null) ?? null,
    moneda: String(data["moneda"] || "BOB"),
    costo_indirecto_pct: Number(data["costo_indirecto_pct"] ?? 12),
    utilidad_pct: Number(data["utilidad_pct"] ?? 10),
    logo_path: (data["logo_path"] as string | null) ?? null,
    notif_plazos: data["notif_plazos"] !== false,
    notif_facturas: data["notif_facturas"] !== false,
    notif_informes: data["notif_informes"] !== false,
    respaldo_auto: data["respaldo_auto"] !== false,
  };
}

export function useConfigEmpresa() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...qk.config, profile?.empresa_id],
    enabled: Boolean(profile?.empresa_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracion_empresa")
        .select("*")
        .eq("empresa_id", profile!.empresa_id!)
        .maybeSingle();
      throwIf(error);
      if (!data) return null;
      return mapConfig(data as Record<string, unknown>);
    },
  });
}

export function useSaveConfigEmpresa() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (c: {
      nombre_empresa: string;
      nit: string;
      direccion: string;
      telefono: string;
      moneda: string;
      costo_indirecto_pct: number;
      utilidad_pct: number;
      notif_plazos: boolean;
      notif_facturas: boolean;
      notif_informes: boolean;
      respaldo_auto: boolean;
      logoFile?: File | null;
      clearLogo?: boolean;
    }) => {
      if (!profile?.empresa_id) throw new Error("Sin empresa asignada");

      let logo_path: string | null | undefined;
      if (c.clearLogo) {
        logo_path = null;
      } else if (c.logoFile) {
        const ext = c.logoFile.name.split(".").pop() || "png";
        logo_path = `${profile.empresa_id}/logo/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documentos")
          .upload(logo_path, c.logoFile, {
            upsert: false,
            contentType: c.logoFile.type || "image/png",
          });
        throwIf(upErr);
      }

      const { logoFile: _f, clearLogo: _c, ...rest } = c;
      const { error } = await supabase.from("configuracion_empresa").upsert({
        empresa_id: profile.empresa_id,
        ...rest,
        ...(logo_path !== undefined ? { logo_path } : {}),
        updated_at: new Date().toISOString(),
      });
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.config }),
  });
}

/** Exporta un respaldo JSON de los datos de obra de la empresa actual. */
export async function exportRespaldoEmpresa(empresaId: string) {
  const tables = [
    "proyectos",
    "partidas",
    "movimientos",
    "documentos",
    "fotografias",
    "actividades",
    "apus",
    "configuracion_empresa",
  ] as const;

  const payload: Record<string, unknown> = {
    generado_en: new Date().toISOString(),
    empresa_id: empresaId,
    version: 1,
  };

  for (const table of tables) {
    let q = supabase.from(table).select("*");
    if (table === "configuracion_empresa") {
      q = q.eq("empresa_id", empresaId);
    } else if (table === "proyectos" || table === "apus") {
      q = q.eq("empresa_id", empresaId);
    }
    // partidas/movimientos/docs/fotos/actividades filtrados por RLS de empresa
    const { data, error } = await q;
    throwIf(error);
    payload[table] = data ?? [];
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sigoc-respaldo-${empresaId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Tipo de proyecto con empresaId opcional para UI. */
export type ProjectWithEmpresa = Project & { empresaId?: string };
