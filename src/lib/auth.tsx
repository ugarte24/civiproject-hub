import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useStore, type Role } from "@/lib/store";
import {
  computeSubscriptionStatus,
  type Suscripcion,
  type SubscriptionStatus,
} from "@/lib/subscription";

export interface AuthProfile {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: Role;
  estado: string;
  empresa_id: string | null;
  es_superadmin: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  subscription: SubscriptionStatus;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLES: Role[] = [
  "Administrador",
  "Ingeniero Residente",
  "Supervisor",
  "Contabilidad",
  "Consulta",
];

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombre, correo, telefono, rol, estado, empresa_id, es_superadmin")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const rol = isRole(data.rol) ? data.rol : "Consulta";

  return {
    id: data.id as string,
    nombre: (data.nombre as string) || "Usuario",
    correo: (data.correo as string) || "",
    telefono: (data.telefono as string | null) ?? null,
    rol,
    estado: (data.estado as string) || "Activo",
    empresa_id: (data.empresa_id as string | null) ?? null,
    es_superadmin: Boolean(data.es_superadmin),
  };
}

async function fetchSuscripcion(empresaId: string): Promise<Suscripcion | null> {
  const { data, error } = await supabase
    .from("suscripciones")
    .select(
      "id, empresa_id, plan, periodo, precio_mensual, precio_anual, max_usuarios, fecha_inicio, fecha_fin, estado, notas, empresas(nombre)",
    )
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const empresas = data.empresas as { nombre?: string } | { nombre?: string }[] | null;
  const empresaNombre = Array.isArray(empresas)
    ? empresas[0]?.nombre
    : empresas?.nombre;

  return {
    id: data.id as string,
    empresa_id: data.empresa_id as string,
    plan: data.plan as string,
    periodo: data.periodo === "anual" ? "anual" : "mensual",
    precio_mensual: Number(data.precio_mensual),
    precio_anual: Number(data.precio_anual ?? 5500),
    max_usuarios: Number(data.max_usuarios),
    fecha_inicio: data.fecha_inicio as string,
    fecha_fin: data.fecha_fin as string,
    estado: data.estado as Suscripcion["estado"],
    notas: (data.notas as string | null) ?? null,
    empresa_nombre: empresaNombre,
  };
}

const emptySubscription: SubscriptionStatus = {
  bypass: false,
  loading: true,
  suscripcion: null,
  vigente: false,
  diasRestantes: 0,
  avisoPronto: false,
  fechaFin: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setRole } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus>(emptySubscription);
  const [loading, setLoading] = useState(true);
  const profileUserIdRef = useRef<string | null>(null);

  const loadSubscriptionForProfile = useCallback(async (p: AuthProfile | null) => {
    if (!p) {
      setSubscription({ ...emptySubscription, loading: false });
      return;
    }

    if (p.es_superadmin) {
      let sub: Suscripcion | null = null;
      if (p.empresa_id) {
        try {
          sub = await fetchSuscripcion(p.empresa_id);
        } catch (err) {
          console.error("Error cargando suscripción (superadmin):", err);
        }
      }
      setSubscription({
        ...computeSubscriptionStatus(sub, { bypass: true }),
        loading: false,
      });
      return;
    }

    if (!p.empresa_id) {
      setSubscription({
        ...computeSubscriptionStatus(null),
        loading: false,
      });
      return;
    }

    try {
      const sub = await fetchSuscripcion(p.empresa_id);
      const status = computeSubscriptionStatus(sub);
      setSubscription({ ...status, loading: false });
    } catch (err) {
      console.error("Error cargando suscripción:", err);
      setSubscription({
        ...computeSubscriptionStatus(null),
        loading: false,
      });
    }
  }, []);

  const applyProfile = useCallback(
    async (nextSession: Session | null, opts?: { force?: boolean }) => {
      if (!nextSession?.user) {
        profileUserIdRef.current = null;
        setProfile(null);
        setRole("Consulta");
        setSubscription({ ...emptySubscription, loading: false });
        return;
      }

      // Evitar refetch innecesario (desktop y móvil): mismo usuario ya cargado.
      if (
        !opts?.force &&
        profileUserIdRef.current === nextSession.user.id
      ) {
        return;
      }

      try {
        const p = await fetchProfile(nextSession.user.id);
        if (p) {
          profileUserIdRef.current = p.id;
          setProfile(p);
          // UI: SuperAdmin no usa menú de obra aunque el perfil DB tenga rol Administrador
          setRole(p.es_superadmin ? "SuperAdmin" : p.rol);
          await loadSubscriptionForProfile(p);
        } else {
          const fallback: AuthProfile = {
            id: nextSession.user.id,
            nombre:
              (nextSession.user.user_metadata?.nombre as string | undefined) ||
              nextSession.user.email?.split("@")[0] ||
              "Usuario",
            correo: nextSession.user.email ?? "",
            telefono: null,
            rol: "Consulta",
            estado: "Activo",
            empresa_id: null,
            es_superadmin: false,
          };
          profileUserIdRef.current = fallback.id;
          setProfile(fallback);
          setRole("Consulta");
          await loadSubscriptionForProfile(fallback);
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
        const fallback: AuthProfile = {
          id: nextSession.user.id,
          nombre: nextSession.user.email?.split("@")[0] || "Usuario",
          correo: nextSession.user.email ?? "",
          telefono: null,
          rol: "Consulta",
          estado: "Activo",
          empresa_id: null,
          es_superadmin: false,
        };
        profileUserIdRef.current = fallback.id;
        setProfile(fallback);
        setRole("Consulta");
        setSubscription({
          ...computeSubscriptionStatus(null),
          loading: false,
        });
      }
    },
    [setRole, loadSubscriptionForProfile],
  );

  /** Actualiza perfil sin pantallas de carga globales (desktop y móvil). */
  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applyProfile(data.session, { force: true });
  }, [applyProfile]);

  const refreshSubscription = useCallback(async () => {
    await loadSubscriptionForProfile(profile);
  }, [loadSubscriptionForProfile, profile]);

  useEffect(() => {
    let mounted = true;
    let bootstrapped = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      await applyProfile(data.session, { force: true });
      if (mounted) {
        setLoading(false);
        bootstrapped = true;
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;

      // Actualizar token en memoria sin forzar re-fetch de perfil.
      setSession((prev) => {
        if (
          prev?.access_token === next?.access_token &&
          prev?.user?.id === next?.user?.id
        ) {
          return prev;
        }
        return next;
      });

      if (!bootstrapped) return;

      // Desktop y móvil: estos eventos son frecuentes (pestaña en segundo plano,
      // selector de archivos, cámara, despertar del SO). Nunca desmontar la UI.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        return;
      }

      if (event === "SIGNED_OUT") {
        profileUserIdRef.current = null;
        setProfile(null);
        setSubscription({ ...emptySubscription, loading: false });
        setLoading(false);
        return;
      }

      // Recuperación de sesión / mismo usuario: solo token (ya en setSession).
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        next?.user?.id &&
        profileUserIdRef.current === next.user.id
      ) {
        return;
      }

      // Login real u otro cambio de usuario: perfil sin LoadingScreen global.
      void applyProfile(next, { force: true });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applyProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isSuperAdmin: Boolean(profile?.es_superadmin),
      subscription,
      refreshProfile,
      refreshSubscription,
    }),
    [session, profile, loading, subscription, refreshProfile, refreshSubscription],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
