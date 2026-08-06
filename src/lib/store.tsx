import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role =
  | "Administrador"
  | "Ingeniero Residente"
  | "Supervisor"
  | "Contabilidad"
  | "Consulta";

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

const projects: Project[] = [
  {
    id: "p1",
    codigo: "PRY-2026-001",
    nombre: "Pavimentación Av. Costanera Tramo II",
    entidad: "Gobierno Autónomo Municipal de La Paz",
    empresa: "Constructora Andina S.R.L.",
    responsable: "Ing. Mauricio Villalba",
    presupuesto: 8450000,
    ejecutado: 5210000,
    avanceFisico: 64,
    fechaInicio: "2026-02-10",
    fechaFinal: "2026-11-30",
    estado: "Activo",
  },
  {
    id: "p2",
    codigo: "PRY-2026-002",
    nombre: "Puente Vehicular Río Seco",
    entidad: "Administradora Boliviana de Carreteras",
    empresa: "Ingeniería Puentes Bolivia S.A.",
    responsable: "Ing. Carla Peñaranda",
    presupuesto: 12750000,
    ejecutado: 4180000,
    avanceFisico: 38,
    fechaInicio: "2026-04-01",
    fechaFinal: "2027-03-15",
    estado: "Activo",
  },
  {
    id: "p3",
    codigo: "PRY-2025-014",
    nombre: "Edificio Administrativo Municipal",
    entidad: "GAM El Alto",
    empresa: "Grupo Constructor Illimani",
    responsable: "Ing. Jorge Camacho",
    presupuesto: 5300000,
    ejecutado: 5300000,
    avanceFisico: 100,
    fechaInicio: "2025-03-05",
    fechaFinal: "2026-05-20",
    estado: "Finalizado",
  },
  {
    id: "p4",
    codigo: "PRY-2026-003",
    nombre: "Sistema de Agua Potable Zona Sur",
    entidad: "EPSAS",
    empresa: "Hidroconstrucciones Ltda.",
    responsable: "Ing. Silvia Rocha",
    presupuesto: 3980000,
    ejecutado: 940000,
    avanceFisico: 22,
    fechaInicio: "2026-06-15",
    fechaFinal: "2027-01-10",
    estado: "Suspendido",
  },
];

const partidas: Partida[] = [
  { id: uid(), proyectoId: "p1", nombre: "Excavación y movimiento de tierras", monto: 980000, ejecutado: 760000, descripcion: "Corte, relleno y compactado de subrasante." },
  { id: uid(), proyectoId: "p1", nombre: "Hormigón estructural H21", monto: 2150000, ejecutado: 1420000, descripcion: "Losas, cordones y cunetas." },
  { id: uid(), proyectoId: "p1", nombre: "Acero de refuerzo", monto: 1240000, ejecutado: 880000, descripcion: "Fy = 4200 kg/cm²." },
  { id: uid(), proyectoId: "p1", nombre: "Pavimento flexible", monto: 2380000, ejecutado: 1310000, descripcion: "Carpeta asfáltica e = 7 cm." },
  { id: uid(), proyectoId: "p2", nombre: "Mano de obra especializada", monto: 1850000, ejecutado: 620000, descripcion: "Cuadrillas de obra fina y estructura." },
  { id: uid(), proyectoId: "p2", nombre: "Materiales de construcción", monto: 4300000, ejecutado: 1980000, descripcion: "Cemento, agregados, encofrados." },
  { id: uid(), proyectoId: "p2", nombre: "Equipos y maquinaria", monto: 2100000, ejecutado: 890000, descripcion: "Grúa, retroexcavadora, vibrocompactador." },
];

const movimientos: Movimiento[] = [
  { id: uid(), tipo: "Factura", proyectoId: "p1", proveedor: "Cementos Viacha S.A.", nit: "1020304050", numero: "F-004512", monto: 348000, fecha: "2026-07-18", observacion: "Cemento IP-30, 1200 bolsas." },
  { id: uid(), tipo: "Pago", proyectoId: "p1", proveedor: "Constructora Andina S.R.L.", nit: "3040506070", numero: "PG-0091", monto: 620000, fecha: "2026-07-25", observacion: "Planilla de avance N° 5." },
  { id: uid(), tipo: "Egreso", proyectoId: "p2", proveedor: "Aceros Bolivia Ltda.", nit: "5060708090", numero: "E-0234", monto: 415000, fecha: "2026-08-01", observacion: "Fierro corrugado 12 mm." },
  { id: uid(), tipo: "Ingreso", proyectoId: "p2", proveedor: "ABC — Desembolso", nit: "—", numero: "D-0007", monto: 1500000, fecha: "2026-06-30", observacion: "Anticipo 15% del contrato." },
  { id: uid(), tipo: "Retencion", proyectoId: "p1", proveedor: "Retención garantía", nit: "—", numero: "R-0012", monto: 43000, fecha: "2026-07-25", observacion: "7% sobre planilla N° 5." },
  { id: uid(), tipo: "Planilla", proyectoId: "p1", proveedor: "Planilla de obra N° 6", nit: "—", numero: "PL-006", monto: 712000, fecha: "2026-08-05", observacion: "En revisión de supervisión." },
];

const documentos: Documento[] = [
  { id: uid(), nombre: "Planos estructurales tramo II", categoria: "Planos", proyectoId: "p1", archivo: "EST-TRAMO-II.dwg", peso: "18.4 MB", descripcion: "Planta, cortes y detalles de armadura.", fecha: "2026-03-12" },
  { id: uid(), nombre: "Contrato de obra ANB-114/2026", categoria: "Contratos", proyectoId: "p2", archivo: "contrato-anb-114.pdf", peso: "2.1 MB", descripcion: "Contrato principal y adendas.", fecha: "2026-04-02" },
  { id: uid(), nombre: "Memoria de cálculo puente", categoria: "Memorias", proyectoId: "p2", archivo: "memoria-puente.pdf", peso: "6.8 MB", descripcion: "Verificación de vigas postensadas.", fecha: "2026-05-09" },
  { id: uid(), nombre: "Informe mensual julio", categoria: "Informes", proyectoId: "p1", archivo: "informe-07-2026.docx", peso: "1.3 MB", descripcion: "Avance físico y financiero.", fecha: "2026-08-02" },
  { id: uid(), nombre: "Planilla de cómputos métricos", categoria: "APU", proyectoId: "p1", archivo: "computos.xlsx", peso: "740 KB", descripcion: "Cómputos por ítem.", fecha: "2026-03-20" },
  { id: uid(), nombre: "Acta de recepción provisional", categoria: "Actas", proyectoId: "p3", archivo: "acta-recepcion.pdf", peso: "980 KB", descripcion: "Firmada por comisión de recepción.", fecha: "2026-05-22" },
];

const fotografias: Fotografia[] = [
  { id: uid(), proyectoId: "p1", fecha: "2026-07-30", descripcion: "Vaciado de losa de aproximación", ubicacion: "Km 2+400", autor: "Ing. Mauricio Villalba", imagen: "" },
  { id: uid(), proyectoId: "p1", fecha: "2026-07-12", descripcion: "Compactado de subrasante", ubicacion: "Km 1+800", autor: "Sup. Andrea Suárez", imagen: "" },
  { id: uid(), proyectoId: "p2", fecha: "2026-08-03", descripcion: "Armado de estribo derecho", ubicacion: "Estribo E-2", autor: "Ing. Carla Peñaranda", imagen: "" },
  { id: uid(), proyectoId: "p2", fecha: "2026-07-21", descripcion: "Excavación para pilotes", ubicacion: "Eje 3", autor: "Ing. Carla Peñaranda", imagen: "" },
  { id: uid(), proyectoId: "p4", fecha: "2026-07-05", descripcion: "Tendido de tubería PVC", ubicacion: "Calle 21", autor: "Ing. Silvia Rocha", imagen: "" },
  { id: uid(), proyectoId: "p3", fecha: "2026-05-18", descripcion: "Fachada concluida", ubicacion: "Bloque A", autor: "Ing. Jorge Camacho", imagen: "" },
];

const apus: Apu[] = [
  {
    id: uid(),
    codigo: "APU-001",
    descripcion: "Hormigón simple H21 para cordones",
    unidad: "m³",
    cantidad: 1,
    materiales: [
      { descripcion: "Cemento IP-30", unidad: "bls", cantidad: 7.5, precio: 58 },
      { descripcion: "Arena fina", unidad: "m³", cantidad: 0.5, precio: 140 },
      { descripcion: "Grava", unidad: "m³", cantidad: 0.65, precio: 160 },
    ],
    equipos: [{ descripcion: "Mezcladora 320 L", unidad: "hr", cantidad: 1.2, precio: 45 }],
    manoObra: [
      { descripcion: "Albañil", unidad: "hr", cantidad: 3, precio: 22 },
      { descripcion: "Ayudante", unidad: "hr", cantidad: 4, precio: 15 },
    ],
    indirectos: 12,
    utilidad: 10,
  },
  {
    id: uid(),
    codigo: "APU-002",
    descripcion: "Excavación manual en terreno semiduro",
    unidad: "m³",
    cantidad: 1,
    materiales: [],
    equipos: [{ descripcion: "Herramienta menor", unidad: "glb", cantidad: 1, precio: 8 }],
    manoObra: [{ descripcion: "Peón", unidad: "hr", cantidad: 2.5, precio: 15 }],
    indirectos: 10,
    utilidad: 10,
  },
];

const actividades: Actividad[] = [
  { id: uid(), proyectoId: "p1", nombre: "Movilización e instalación de faenas", inicio: "2026-02-10", fin: "2026-03-05", responsable: "Ing. Villalba", estado: "Concluida", avance: 100 },
  { id: uid(), proyectoId: "p1", nombre: "Excavación y conformación", inicio: "2026-03-06", fin: "2026-05-20", responsable: "Ing. Villalba", estado: "Concluida", avance: 100 },
  { id: uid(), proyectoId: "p1", nombre: "Obras de drenaje", inicio: "2026-05-21", fin: "2026-08-15", responsable: "Ing. Rocha", estado: "En curso", avance: 72 },
  { id: uid(), proyectoId: "p1", nombre: "Carpeta asfáltica", inicio: "2026-08-16", fin: "2026-10-30", responsable: "Ing. Villalba", estado: "Pendiente", avance: 0 },
  { id: uid(), proyectoId: "p1", nombre: "Señalización y cierre", inicio: "2026-11-01", fin: "2026-11-30", responsable: "Sup. Suárez", estado: "Pendiente", avance: 0 },
];

const usuarios: Usuario[] = [
  { id: uid(), nombre: "Mauricio Villalba", correo: "m.villalba@sigeproc.bo", telefono: "70011223", rol: "Ingeniero Residente", estado: "Activo" },
  { id: uid(), nombre: "Andrea Suárez", correo: "a.suarez@sigeproc.bo", telefono: "71122334", rol: "Supervisor", estado: "Activo" },
  { id: uid(), nombre: "Rodrigo Alanoca", correo: "r.alanoca@sigeproc.bo", telefono: "72233445", rol: "Contabilidad", estado: "Activo" },
  { id: uid(), nombre: "Patricia Mendoza", correo: "p.mendoza@sigeproc.bo", telefono: "73344556", rol: "Administrador", estado: "Activo" },
  { id: uid(), nombre: "Luis Fernández", correo: "l.fernandez@sigeproc.bo", telefono: "74455667", rol: "Consulta", estado: "Inactivo" },
];

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
