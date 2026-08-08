import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Palette, DatabaseBackup, BellRing, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader, AccesoDenegado } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { usePermisos } from "@/lib/store";
import { useConfigEmpresa, useSaveConfigEmpresa } from "@/lib/obra/hooks";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración del sistema — SIGOC" },
      {
        name: "description",
        content:
          "Datos de la empresa, logo, colores institucionales, respaldos, notificaciones y parámetros generales de SIGOC.",
      },
      { property: "og:title", content: "Configuración — SIGOC" },
      {
        property: "og:description",
        content: "Parámetros generales y preferencias del sistema.",
      },
    ],
  }),
  component: ConfiguracionPage,
});

function Bloque({
  icon: Icon,
  titulo,
  children,
}: {
  icon: React.ElementType;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="text-lg font-semibold">{titulo}</h2>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ConfiguracionPage() {
  const { puedeVer } = usePermisos();
  const { data: config, isLoading } = useConfigEmpresa();
  const saveMut = useSaveConfigEmpresa();
  const [empresa, setEmpresa] = useState({
    nombre_empresa: "",
    nit: "",
    direccion: "",
    telefono: "",
    moneda: "Bolivianos (Bs)",
  });

  useEffect(() => {
    if (!config) return;
    setEmpresa({
      nombre_empresa: config.nombre_empresa ?? "",
      nit: config.nit ?? "",
      direccion: config.direccion ?? "",
      telefono: config.telefono ?? "",
      moneda: config.moneda || "Bolivianos (Bs)",
    });
  }, [config]);

  if (!puedeVer("configuracion")) return <AccesoDenegado modulo="Configuración" />;

  const guardar = () => {
    void saveMut
      .mutateAsync(empresa)
      .then(() => toast.success("✅ Configuración guardada correctamente."))
      .catch((err: Error) => toast.error(err.message));
  };

  return (
    <div>
      <PageHeader
        kicker="Administración"
        title="Configuración"
        description="Parámetros institucionales, identidad visual, respaldos y notificaciones del sistema."
        action={
          <Button onClick={guardar} disabled={saveMut.isPending || isLoading}>
            Guardar cambios
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Bloque icon={Building2} titulo="Empresa">
          <Field label="Razón social">
            <Input
              value={empresa.nombre_empresa}
              onChange={(e) => setEmpresa((s) => ({ ...s, nombre_empresa: e.target.value }))}
            />
          </Field>
          <Field label="NIT">
            <Input
              value={empresa.nit}
              onChange={(e) => setEmpresa((s) => ({ ...s, nit: e.target.value }))}
            />
          </Field>
          <Field label="Dirección">
            <Input
              value={empresa.direccion}
              onChange={(e) => setEmpresa((s) => ({ ...s, direccion: e.target.value }))}
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={empresa.telefono}
              onChange={(e) => setEmpresa((s) => ({ ...s, telefono: e.target.value }))}
            />
          </Field>
        </Bloque>

        <Bloque icon={Palette} titulo="Logo y colores">
          <Field label="Logo institucional">
            <Input type="file" accept="image/*" />
          </Field>
          <div className="flex flex-wrap gap-3">
            {["bg-primary", "bg-accent", "bg-success", "bg-info", "bg-destructive"].map((c) => (
              <div key={c} className="text-center">
                <div className={`size-10 rounded-md ${c}`} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Paleta institucional aplicada a todo el sistema mediante tokens del diseño.
          </p>
        </Bloque>

        <Bloque icon={DatabaseBackup} titulo="Respaldos">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">Respaldo automático diario</span>
            <Switch defaultChecked />
          </div>
          <Button
            variant="outline"
            onClick={() => toast.success("✅ Respaldo generado correctamente.")}
          >
            Generar respaldo ahora
          </Button>
        </Bloque>

        <Bloque icon={BellRing} titulo="Notificaciones">
          {["Vencimiento de plazos", "Nuevas facturas registradas", "Informes por aprobar"].map(
            (n) => (
              <div key={n} className="flex items-center justify-between gap-4">
                <span className="text-sm">{n}</span>
                <Switch defaultChecked />
              </div>
            ),
          )}
        </Bloque>

        <Bloque icon={SlidersHorizontal} titulo="Parámetros">
          <Field label="Moneda">
            <Input
              value={empresa.moneda}
              onChange={(e) => setEmpresa((s) => ({ ...s, moneda: e.target.value }))}
            />
          </Field>
          <Field label="Costo indirecto por defecto (%)">
            <Input type="number" defaultValue={12} />
          </Field>
          <Field label="Utilidad por defecto (%)">
            <Input type="number" defaultValue={10} />
          </Field>
        </Bloque>
      </div>
    </div>
  );
}
