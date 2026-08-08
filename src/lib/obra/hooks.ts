import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type {
  Actividad,
  Apu,
  ApuInsumo,
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
    }) => {
      const { error } = await supabase.from("partidas").insert({
        proyecto_id: p.proyectoId,
        nombre: p.nombre,
        monto: p.monto,
        descripcion: p.descripcion,
        ejecutado: 0,
      });
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
    }) => {
      const { error } = await supabase.from("movimientos").insert({
        tipo: m.tipo,
        proyecto_id: m.proyectoId,
        proveedor: m.proveedor,
        nit: m.nit || null,
        numero: m.numero || null,
        monto: m.monto,
        fecha: m.fecha,
        observacion: m.observacion,
      });
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movimientos").delete().eq("id", id);
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
      const path = `${profile.empresa_id}/${f.proyectoId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from("fotografias").upload(path, f.file, {
        upsert: false,
        contentType: "image/jpeg",
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
};

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
      return data as ConfigEmpresa | null;
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
    }) => {
      if (!profile?.empresa_id) throw new Error("Sin empresa asignada");
      const { error } = await supabase.from("configuracion_empresa").upsert({
        empresa_id: profile.empresa_id,
        ...c,
        updated_at: new Date().toISOString(),
      });
      throwIf(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.config }),
  });
}

/** Tipo de proyecto con empresaId opcional para UI. */
export type ProjectWithEmpresa = Project & { empresaId?: string };
