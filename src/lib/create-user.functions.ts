import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type CreateUserInput = {
  accessToken: string;
  nombre: string;
  correo: string;
  telefono?: string;
  password: string;
  rol:
    | "Administrador"
    | "Ingeniero Residente"
    | "Supervisor"
    | "Contabilidad"
    | "Consulta";
  /** Solo SuperAdmin puede forzar otra empresa; Admin siempre usa la suya */
  empresaId?: string | null;
  /** SuperAdmin solo puede crear el primer Admin tras onboard_empresa */
  modoOnboard?: boolean;
};

function adminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const createAppUserFn = createServerFn({ method: "POST" })
  .inputValidator((data: CreateUserInput) => {
    if (!data?.accessToken) throw new Error("Sesión requerida");
    if (!data.nombre?.trim() || data.nombre.trim().length < 4) {
      throw new Error("Nombre inválido");
    }
    if (!data.correo?.includes("@")) throw new Error("Correo inválido");
    if (!data.password || data.password.length < 8) {
      throw new Error("Contraseña mínimo 8 caracteres");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const admin = adminClient();

    const { data: authData, error: authErr } = await admin.auth.getUser(data.accessToken);
    if (authErr || !authData.user) {
      throw new Error("No autorizado");
    }

    const { data: caller, error: callerErr } = await admin
      .from("profiles")
      .select("es_superadmin, empresa_id, rol")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (callerErr || !caller) {
      throw new Error("Perfil no encontrado");
    }

    const isSuper = Boolean(caller.es_superadmin);
    const isAdminEmpresa = caller.rol === "Administrador" && !isSuper;

    if (isSuper && !data.modoOnboard) {
      throw new Error(
        "El SuperAdmin da de alta clientes desde Panel SaaS → Nuevo cliente",
      );
    }

    if (!isSuper && !isAdminEmpresa) {
      throw new Error("Solo el Administrador de la empresa puede crear usuarios");
    }

    // Admin cliente: siempre su empresa. SuperAdmin (onboard): la empresa recién creada.
    const empresaId = isSuper
      ? data.empresaId
      : caller.empresa_id;

    if (!empresaId) {
      throw new Error("No hay empresa asignada para el nuevo usuario");
    }

    // Verificar suscripción vigente de la empresa (Admin cliente)
    if (!isSuper) {
      const { data: sub } = await admin
        .from("suscripciones")
        .select("fecha_fin, estado")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (!sub || sub.estado === "cancelada") {
        throw new Error("La empresa no tiene suscripción activa");
      }
      const fin = String(sub.fecha_fin).slice(0, 10);
      const hoy = new Date();
      const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
      if (fin < hoyStr) {
        throw new Error("Suscripción vencida: renueve el plan para crear usuarios");
      }
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: data.correo.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre.trim(), rol: data.rol },
    });

    if (createErr || !created.user) {
      throw new Error(createErr?.message || "No se pudo crear el usuario en Auth");
    }

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: created.user.id,
      nombre: data.nombre.trim(),
      correo: data.correo.trim().toLowerCase(),
      telefono: data.telefono?.trim() || null,
      rol: data.rol,
      estado: "Activo",
      es_superadmin: false,
      empresa_id: empresaId,
    });

    if (profileErr) {
      throw new Error(profileErr.message);
    }

    return {
      id: created.user.id,
      correo: data.correo.trim().toLowerCase(),
      nombre: data.nombre.trim(),
    };
  });
