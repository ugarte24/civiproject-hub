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
  /** Path en Storage bucket documentos (opcional). */
  adjuntoPath?: string;
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
  /** storage_path en Supabase Storage */
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
  /** storage_path o URL firmada en UI */
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

export const apuPrecioUnitario = (apu: Apu) => {
  const sum = (items: ApuInsumo[]) =>
    items.reduce((acc, i) => acc + i.cantidad * i.precio, 0);
  const directo = sum(apu.materiales) + sum(apu.equipos) + sum(apu.manoObra);
  const indirecto = directo * (apu.indirectos / 100);
  const utilidad = (directo + indirecto) * (apu.utilidad / 100);
  return { directo, indirecto, utilidad, precio: directo + indirecto + utilidad };
};

export const money = (n: number, currencyCode?: string) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: resolveCurrencyCode(currencyCode ?? getDefaultCurrency()),
    maximumFractionDigits: 0,
  }).format(n);

export const money2 = (n: number) =>
  new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** Mapea texto de configuración a código ISO 4217. */
export function resolveCurrencyCode(moneda: string): string {
  const m = (moneda || "BOB").toUpperCase();
  if (m.includes("USD") || m.includes("DOLAR") || m.includes("DÓLAR")) return "USD";
  if (m.includes("EUR") || m.includes("EURO")) return "EUR";
  if (m.includes("PEN") || m.includes("SOL")) return "PEN";
  if (m.includes("ARS") || m.includes("PESO")) return "ARS";
  if (/^[A-Z]{3}$/.test(m.trim())) return m.trim();
  return "BOB";
}

let defaultCurrency = "BOB";
export function setDefaultCurrency(moneda: string) {
  defaultCurrency = resolveCurrencyCode(moneda);
}
export function getDefaultCurrency() {
  return defaultCurrency;
}

export const fecha = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

/** Store mínimo: rol sincronizado desde Auth (permisos UI). Datos de obra viven en Supabase. */
interface Store {
  role: Role;
  setRole: (r: Role) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Administrador");
  const value = useMemo<Store>(() => ({ role, setRole }), [role]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

/** Módulos visibles y permisos de escritura por rol. */
export const permisos: Record<Role, { modulos: string[]; escribe: string[] }> = {
  SuperAdmin: {
    modulos: ["admin"],
    escribe: [],
  },
  Administrador: {
    modulos: [
      "dashboard",
      "proyectos",
      "presupuesto",
      "contabilidad",
      "documentos",
      "fotografias",
      "cronograma",
      "apu",
      "reportes",
      "usuarios",
      "configuracion",
    ],
    escribe: [
      "proyectos",
      "presupuesto",
      "contabilidad",
      "documentos",
      "fotografias",
      "cronograma",
      "apu",
      "usuarios",
      "configuracion",
    ],
  },
  "Ingeniero Residente": {
    modulos: [
      "dashboard",
      "proyectos",
      "presupuesto",
      "documentos",
      "fotografias",
      "cronograma",
      "apu",
      "reportes",
    ],
    escribe: ["proyectos", "presupuesto", "documentos", "fotografias", "cronograma", "apu"],
  },
  Supervisor: {
    modulos: [
      "dashboard",
      "proyectos",
      "presupuesto",
      "documentos",
      "fotografias",
      "cronograma",
      "apu",
      "reportes",
    ],
    escribe: ["fotografias", "documentos"],
  },
  Contabilidad: {
    modulos: ["dashboard", "presupuesto", "contabilidad", "reportes"],
    escribe: ["contabilidad"],
  },
  Consulta: {
    modulos: [
      "dashboard",
      "proyectos",
      "presupuesto",
      "documentos",
      "fotografias",
      "cronograma",
      "reportes",
    ],
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
