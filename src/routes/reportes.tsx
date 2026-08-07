import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, AccesoDenegado } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { DateInput } from "@/components/DateInput";
import { useStore, usePermisos, money, fecha } from "@/lib/store";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes en PDF y Excel — SIGOC" },
      {
        name: "description",
        content:
          "Generación de reportes filtrados por proyecto, fecha, empresa, responsable y estado, exportables a PDF y Excel.",
      },
      { property: "og:title", content: "Reportes — SIGOC" },
      {
        property: "og:description",
        content: "Reportes automáticos del avance físico y financiero de los proyectos.",
      },
    ],
  }),
  component: ReportesPage,
});

function ReportesPage() {
  const { projects } = useStore();
  const { puedeVer } = usePermisos();
  const [proyecto, setProyecto] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [empresa, setEmpresa] = useState("");
  const [responsable, setResponsable] = useState("");
  const [desde, setDesde] = useState("");

  if (!puedeVer("reportes")) return <AccesoDenegado modulo="Reportes" />;

  const lista = projects.filter(
    (p) =>
      (proyecto === "todos" || p.id === proyecto) &&
      (estado === "todos" || p.estado === estado) &&
      (!empresa || p.empresa.toLowerCase().includes(empresa.toLowerCase())) &&
      (!responsable || p.responsable.toLowerCase().includes(responsable.toLowerCase())) &&
      (!desde || p.fechaInicio >= desde),
  );

  return (
    <div>
      <PageHeader
        kicker="Información gerencial"
        title="Reportes"
        description="Aplique filtros y exporte el consolidado del portafolio en PDF o Excel."
      />

      <div className="panel grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Proyecto">
          <Select value={proyecto} onValueChange={setProyecto}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Suspendido">Suspendido</SelectItem>
              <SelectItem value="Finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Empresa">
          <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
        </Field>
        <Field label="Responsable">
          <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} />
        </Field>
        <Field label="Desde">
          <DateInput value={desde} onChange={setDesde} />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="gap-2" onClick={() => toast.success("📄 Reporte PDF generado correctamente.")}>
          <FileDown className="size-4" /> Exportar PDF
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => toast.success("📊 Reporte Excel generado correctamente.")}
        >
          <FileSpreadsheet className="size-4" /> Exportar Excel
        </Button>
      </div>

      <div className="panel mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Código</TableHead>
              <TableHead>Proyecto</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead className="text-right">Ejecutado</TableHead>
              <TableHead className="text-right">Avance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                <TableCell className="max-w-[220px] truncate">{p.nombre}</TableCell>
                <TableCell className="text-sm">{p.empresa}</TableCell>
                <TableCell className="text-sm">{p.responsable}</TableCell>
                <TableCell className="text-sm">
                  {fecha(p.fechaInicio)} – {fecha(p.fechaFinal)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{p.estado}</Badge>
                </TableCell>
                <TableCell className="text-right">{money(p.presupuesto)}</TableCell>
                <TableCell className="text-right">{money(p.ejecutado)}</TableCell>
                <TableCell className="text-right">{p.avanceFisico}%</TableCell>
              </TableRow>
            ))}
            {!lista.length ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Sin resultados para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
