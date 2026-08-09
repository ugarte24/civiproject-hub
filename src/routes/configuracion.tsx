import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Palette, DatabaseBackup, BellRing, SlidersHorizontal, ImageIcon, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, AccesoDenegado } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { usePermisos, resolveCurrencyCode } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  exportRespaldoEmpresa,
  signedUrl,
  useConfigEmpresa,
  useSaveConfigEmpresa,
} from "@/lib/obra/hooks";
import { setFilePickingBusy } from "@/lib/ui-busy";
import { compressImage } from "@/lib/compress-image";
import { formatCompressInfo } from "@/lib/compress-attachment";

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
  const { profile } = useAuth();
  const { data: config, isLoading } = useConfigEmpresa();
  const saveMut = useSaveConfigEmpresa();
  const [empresa, setEmpresa] = useState({
    nombre_empresa: "",
    nit: "",
    direccion: "",
    telefono: "",
    moneda: "BOB",
    costo_indirecto_pct: "12",
    utilidad_pct: "10",
    notif_plazos: true,
    notif_facturas: true,
    notif_informes: true,
    respaldo_auto: true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoNombre, setLogoNombre] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoSizeInfo, setLogoSizeInfo] = useState("");
  const [clearLogo, setClearLogo] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    if (!config) return;
    setEmpresa({
      nombre_empresa: config.nombre_empresa ?? "",
      nit: config.nit ?? "",
      direccion: config.direccion ?? "",
      telefono: config.telefono ?? "",
      moneda: ["BOB", "USD", "EUR", "PEN"].includes(config.moneda)
        ? config.moneda
        : resolveCurrencyCode(config.moneda),
      costo_indirecto_pct: String(config.costo_indirecto_pct ?? 12),
      utilidad_pct: String(config.utilidad_pct ?? 10),
      notif_plazos: config.notif_plazos,
      notif_facturas: config.notif_facturas,
      notif_informes: config.notif_informes,
      respaldo_auto: config.respaldo_auto,
    });
    setClearLogo(false);
    setLogoFile(null);
    setLogoNombre("");
    setLogoSizeInfo("");
  }, [config]);

  useEffect(() => {
    let revoked = false;
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (clearLogo || !config?.logo_path) {
      setLogoPreview(null);
      return;
    }
    void signedUrl("documentos", config.logo_path)
      .then((url) => {
        if (!revoked) setLogoPreview(url);
      })
      .catch(() => {
        if (!revoked) setLogoPreview(null);
      });
    return () => {
      revoked = true;
    };
  }, [logoFile, clearLogo, config?.logo_path]);

  const pickLogo = async (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      setLogoNombre("");
      setLogoSizeInfo("");
      setFilePickingBusy(false);
      return;
    }
    setClearLogo(false);
    setLogoFile(file);
    setLogoNombre(file.name);
    setLogoSizeInfo("Procesando imagen…");
    try {
      const result = await compressImage(file, { maxSide: 1200, quality: 0.8 });
      if (result.previewUrl.startsWith("blob:")) URL.revokeObjectURL(result.previewUrl);
      setLogoFile(result.file);
      setLogoNombre(result.file.name);
      setLogoSizeInfo(formatCompressInfo(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo comprimir el logo";
      toast.error(msg);
      setLogoSizeInfo("");
    } finally {
      window.setTimeout(() => setFilePickingBusy(false), 800);
    }
  };

  const guardar = () => {
    const costo = Number(empresa.costo_indirecto_pct);
    const utilidad = Number(empresa.utilidad_pct);
    if (!Number.isFinite(costo) || costo < 0 || !Number.isFinite(utilidad) || utilidad < 0) {
      toast.error("Los porcentajes de costo indirecto y utilidad deben ser números ≥ 0.");
      return;
    }
    void saveMut
      .mutateAsync({
        nombre_empresa: empresa.nombre_empresa,
        nit: empresa.nit,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        moneda: empresa.moneda,
        costo_indirecto_pct: costo,
        utilidad_pct: utilidad,
        notif_plazos: empresa.notif_plazos,
        notif_facturas: empresa.notif_facturas,
        notif_informes: empresa.notif_informes,
        respaldo_auto: empresa.respaldo_auto,
        ...(logoFile ? { logoFile } : {}),
        ...(clearLogo ? { clearLogo: true } : {}),
      })
      .then(() => {
        toast.success("Configuración guardada correctamente.");
        setLogoFile(null);
        setLogoNombre("");
        setClearLogo(false);
      })
      .catch((err: Error) => toast.error(err.message));
  };

  const generarRespaldo = () => {
    if (!profile?.empresa_id) {
      toast.error("Sin empresa asignada.");
      return;
    }
    setBackingUp(true);
    void exportRespaldoEmpresa(profile.empresa_id)
      .then(() => toast.success("Respaldo JSON descargado."))
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setBackingUp(false));
  };

  if (!puedeVer("configuracion")) return <AccesoDenegado modulo="Configuración" />;

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
          <Field label="Logo institucional" full>
            <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label
                    className="flex cursor-pointer flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                    onPointerDown={() => setFilePickingBusy(true)}
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon className="size-4" /> Galería
                    </span>
                    <span className="text-xs">Seleccionar imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void pickLogo(e.target.files?.[0] ?? null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label
                    className="flex cursor-pointer flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                    onPointerDown={() => setFilePickingBusy(true)}
                  >
                    <span className="flex items-center gap-2">
                      <Camera className="size-4" /> Cámara
                    </span>
                    <span className="text-xs">Tomar foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        void pickLogo(e.target.files?.[0] ?? null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              <div className="flex flex-wrap items-center gap-2">
                {(logoPreview || config?.logo_path) && !clearLogo ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-destructive"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoNombre("");
                      setLogoSizeInfo("");
                      setClearLogo(true);
                    }}
                  >
                    Quitar logo
                  </Button>
                ) : null}
                <span className="text-sm text-muted-foreground">
                  {logoNombre ||
                    (clearLogo
                      ? "Se quitará al guardar"
                      : config?.logo_path
                        ? "Logo guardado"
                        : "Ningún archivo seleccionado")}
                </span>
              </div>
              {logoSizeInfo ? (
                <p className="text-xs text-muted-foreground">{logoSizeInfo}</p>
              ) : null}
              <div>
                <p className="label-kicker">Vista previa</p>
                <div className="mt-2 flex min-h-[8rem] max-h-[40vh] items-center justify-center overflow-auto rounded-md border border-dashed border-border bg-muted/50 p-2">
                  {logoPreview && !clearLogo ? (
                    <img
                      src={logoPreview}
                      alt="Vista previa del logo"
                      className="max-h-[36vh] w-auto max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin imagen seleccionada</span>
                  )}
                </div>
              </div>
            </div>
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
            <span className="text-sm">Respaldo automático diario (preferencia)</span>
            <Switch
              checked={empresa.respaldo_auto}
              onCheckedChange={(v) => setEmpresa((s) => ({ ...s, respaldo_auto: v }))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Descarga un archivo JSON con proyectos, partidas, movimientos, documentos, fotos,
            cronograma, APU y configuración.
          </p>
          <Button variant="outline" onClick={generarRespaldo} disabled={backingUp}>
            {backingUp ? "Generando…" : "Generar respaldo ahora"}
          </Button>
        </Bloque>

        <Bloque icon={BellRing} titulo="Notificaciones">
          {(
            [
              ["notif_plazos", "Vencimiento de plazos"],
              ["notif_facturas", "Nuevas facturas registradas"],
              ["notif_informes", "Informes por aprobar"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm">{label}</span>
              <Switch
                checked={empresa[key]}
                onCheckedChange={(v) => setEmpresa((s) => ({ ...s, [key]: v }))}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Preferencias guardadas por empresa. El envío por correo/push se activará en una etapa
            posterior.
          </p>
        </Bloque>

        <Bloque icon={SlidersHorizontal} titulo="Parámetros">
          <Field label="Moneda">
            <Select
              value={empresa.moneda}
              onValueChange={(v) => setEmpresa((s) => ({ ...s, moneda: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOB">Bolivianos (BOB)</SelectItem>
                <SelectItem value="USD">Dólares (USD)</SelectItem>
                <SelectItem value="EUR">Euros (EUR)</SelectItem>
                <SelectItem value="PEN">Soles (PEN)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Costo indirecto por defecto (%)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={empresa.costo_indirecto_pct}
              onChange={(e) => setEmpresa((s) => ({ ...s, costo_indirecto_pct: e.target.value }))}
            />
          </Field>
          <Field label="Utilidad por defecto (%)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={empresa.utilidad_pct}
              onChange={(e) => setEmpresa((s) => ({ ...s, utilidad_pct: e.target.value }))}
            />
          </Field>
        </Bloque>
      </div>
    </div>
  );
}
