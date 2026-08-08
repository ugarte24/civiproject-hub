import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingScreen, SigocBrand } from "@/components/SigocLogo";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, isSuperAdmin, refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      void navigate({ to: isSuperAdmin ? "/admin" : "/" });
    }
  }, [authLoading, session, isSuperAdmin, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshProfile();
      toast.success("Bienvenido a SIGOC");
      let goAdmin = false;
      if (data.user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("es_superadmin")
          .eq("id", data.user.id)
          .maybeSingle();
        goAdmin = Boolean(prof?.es_superadmin);
      }
      void navigate({ to: goAdmin ? "/admin" : "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo iniciar sesión";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <LoadingScreen message="Cargando…" />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <SigocBrand
          className="mb-6"
          logoSize={44}
          subtitle="Inicie sesión para continuar"
        />

        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
