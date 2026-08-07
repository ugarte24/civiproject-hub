import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role =
  | "SuperAdmin"
  | "Administrador"
  | "Ingeniero Residente"
  | "Supervisor"
  | "Contabilidad"
  | "Consulta";

/** Roles asignables a usuarios de empresa (no incluye SuperAdmin de plataforma). */
export const ROLES_EMPRESA: Role[] = [
  "Administrador",
  "Ingeniero Residente",
  "Supervisor",
  "Contabilidad",
  "Consulta",
];

export type ProjectStatus = "Activo" | "Suspendido" | "Finalizado";

export interface Project {
  id: string;
  codigo: string;
  nombre: string;
  entidad: string;
  empresa: string;
  responsable: string;
  presupuesto: number;
  ejecutado: number;
  avanceFisico: number;
  fechaInicio: string;
  fechaFinal: string;
  estado: ProjectStatus;
}

export interface Partida {
  id: string;
  proyectoId: string;
  nombre: string;
  monto: number;
  ejecutado: number;
  descripcion: string;
}

export type MovimientoTipo = "Ingreso" | "Egreso" | "Factura" | "Pago" | "Retencion" | "Planilla";

export interface Movimiento {
  id: string;
  tipo: MovimientoTipo;
  proyectoId: string;
  proveedor: string;
  nit: string;
  numero: string;
  monto: number;
  fecha: string;
  observacion: string;
}

export type DocCategoria =
  | "Planos"
  | "Contratos"
  | "Memorias"
  | "Licitaciones"
  | "Informes"
  | "APU"
  | "Actas";

export interface Documento {
  id: string;
  nombre: string;
  categoria: DocCategoria;
  proyectoId: string;
  archivo: string;
  peso: string;
  descripcion: string;
  fecha: string;
}

export interface Fotografia {
  id: string;
  proyectoId: string;
  fecha: string;
  descripcion: string;
  ubicacion: string;
  autor: string;
  imagen: string;
}

export interface ApuInsumo {
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio: number;
}

export interface Apu {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  materiales: ApuInsumo[];
  equipos: ApuInsumo[];
  manoObra: ApuInsumo[];
  indirectos: number;
  utilidad: number;
}

export interface Actividad {
  id: string;
  proyectoId: string;
  nombre: string;
  inicio: string;
  fin: string;
  responsable: string;
  estado: "Pendiente" | "En curso" | "Concluida";
  avance: number;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  rol: Role;
  estado: "Activo" | "Inactivo";
}

const uid = () => Math.random().toString(36).slice(2, 10);

const projects: Project[] = [];
const partidas: Partida[] = [];
const movimientos: Movimiento[] = [];
const documentos: Documento[] = [];
const fotografias: Fotografia[] = [];
const apus: Apu[] = [];
const actividades: Actividad[] = [];
const usuarios: Usuario[] = [];

export const apuPrecioUnitario = (apu: Apu) => {
  const sum = (items: ApuInsumo[]) =>
    items.reduce((acc, i) => acc + i.cantidad * i.precio, 0);
  const directo = sum(apu.materiales) + sum(apu.equipos) + sum(apu.manoObra);
  const indirecto = directo * (apu.indirectos / 100);
  const utilidad = (directo + indirecto) * (apu.utilidad / 100);
  return { directo, indirecto, utilidad, precio: directo + indirecto + utilidad };
};

export const money = (n: number) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 0,
  }).format(n);

export const money2 = (n: number) =>
  new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const fecha = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

interface Store {
  role: Role;
  setRole: (r: Role) => void;
  projects: Project[];
  partidas: Partida[];
  movimientos: Movimiento[];
  documentos: Documento[];
  fotografias: Fotografia[];
  apus: Apu[];
  actividades: Actividad[];
  usuarios: Usuario[];
  addProject: (p: Omit<Project, "id" | "ejecutado" | "avanceFisico">) => void;
  updateProject: (id: string, p: Partial<Project>) => void;
  removeProject: (id: string) => void;
  addPartida: (p: Omit<Partida, "id" | "ejecutado">) => void;
  removePartida: (id: string) => void;
  addMovimiento: (m: Omit<Movimiento, "id">) => void;
  removeMovimiento: (id: string) => void;
  addDocumento: (d: Omit<Documento, "id" | "fecha" | "peso">) => void;
  removeDocumento: (id: string) => void;
  addFotografia: (f: Omit<Fotografia, "id">) => void;
  removeFotografia: (id: string) => void;
  addApu: (a: Omit<Apu, "id">) => void;
  removeApu: (id: string) => void;
  addUsuario: (u: Omit<Usuario, "id">) => void;
  updateUsuario: (id: string, u: Partial<Usuario>) => void;
  removeUsuario: (id: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Administrador");
  const [projectList, setProjectList] = useState(projects);
  const [partidaList, setPartidaList] = useState(partidas);
  const [movList, setMovList] = useState(movimientos);
  const [docList, setDocList] = useState(documentos);
  const [fotoList, setFotoList] = useState(fotografias);
  const [apuList, setApuList] = useState(apus);
  const [actividadList] = useState(actividades);
  const [userList, setUserList] = useState(usuarios);

  const value = useMemo<Store>(
    () => ({
      role,
      setRole,
      projects: projectList,
      partidas: partidaList,
      movimientos: movList,
      documentos: docList,
      fotografias: fotoList,
      apus: apuList,
      actividades: actividadList,
      usuarios: userList,
      addProject: (p) =>
        setProjectList((prev) => [
          { ...p, id: uid(), ejecutado: 0, avanceFisico: 0 },
          ...prev,
        ]),
      updateProject: (id, p) =>
        setProjectList((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x))),
      removeProject: (id) => setProjectList((prev) => prev.filter((x) => x.id !== id)),
      addPartida: (p) => setPartidaList((prev) => [{ ...p, id: uid(), ejecutado: 0 }, ...prev]),
      removePartida: (id) => setPartidaList((prev) => prev.filter((x) => x.id !== id)),
      addMovimiento: (m) => setMovList((prev) => [{ ...m, id: uid() }, ...prev]),
      removeMovimiento: (id) => setMovList((prev) => prev.filter((x) => x.id !== id)),
      addDocumento: (d) =>
        setDocList((prev) => [
          { ...d, id: uid(), peso: "—", fecha: new Date().toISOString().slice(0, 10) },
          ...prev,
        ]),
      removeDocumento: (id) => setDocList((prev) => prev.filter((x) => x.id !== id)),
      addFotografia: (f) => setFotoList((prev) => [{ ...f, id: uid() }, ...prev]),
      removeFotografia: (id) => setFotoList((prev) => prev.filter((x) => x.id !== id)),
      addApu: (a) => setApuList((prev) => [{ ...a, id: uid() }, ...prev]),
      removeApu: (id) => setApuList((prev) => prev.filter((x) => x.id !== id)),
      addUsuario: (u) => setUserList((prev) => [{ ...u, id: uid() }, ...prev]),
      updateUsuario: (id, u) =>
        setUserList((prev) => prev.map((x) => (x.id === id ? { ...x, ...u } : x))),
      removeUsuario: (id) => setUserList((prev) => prev.filter((x) => x.id !== id)),
    }),
    [role, projectList, partidaList, movList, docList, fotoList, apuList, actividadList, userList],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

/** Módulos visibles y permisos de escritura por rol. */
export const permisos: Record<Role, { modulos: string[]; escribe: string[] }> = {
  /** Solo plataforma SaaS: no opera obra de clientes. */
  SuperAdmin: {
    modulos: ["admin"],
    escribe: [],
  },
  Administrador: {
    modulos: ["dashboard", "proyectos", "presupuesto", "contabilidad", "documentos", "fotografias", "cronograma", "apu", "reportes", "usuarios", "configuracion"],
    escribe: ["proyectos", "presupuesto", "contabilidad", "documentos", "fotografias", "apu", "usuarios", "configuracion"],
  },
  "Ingeniero Residente": {
    modulos: ["dashboard", "proyectos", "presupuesto", "documentos", "fotografias", "cronograma", "apu", "reportes"],
    escribe: ["proyectos", "presupuesto", "documentos", "fotografias", "apu"],
  },
  Supervisor: {
    modulos: ["dashboard", "proyectos", "presupuesto", "documentos", "fotografias", "cronograma", "apu", "reportes"],
    escribe: ["fotografias", "documentos"],
  },
  Contabilidad: {
    modulos: ["dashboard", "presupuesto", "contabilidad", "reportes"],
    escribe: ["contabilidad"],
  },
  Consulta: {
    modulos: ["dashboard", "proyectos", "presupuesto", "documentos", "fotografias", "cronograma", "reportes"],
    escribe: [],
  },
};

export function usePermisos() {
  const { role } = useStore();
  const p = permisos[role];
  return {
    role,
    puedeVer: (m: string) => p.modulos.includes(m),
    puedeEditar: (m: string) => p.escribe.includes(m),
  };
}
