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
import { usePermisos, money, fecha, type Project } from "@/lib/store";
import { useProyectos } from "@/lib/obra/hooks";

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

function csvEscape(v: string | number) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportExcel(lista: Project[]) {
  const headers = [
    "Código",
    "Proyecto",
    "Empresa",
    "Responsable",
    "Inicio",
    "Fin",
    "Estado",
    "Presupuesto",
    "Ejecutado",
    "Avance %",
  ];
  const rows = lista.map((p) =>
    [
      p.codigo,
      p.nombre,
      p.empresa,
      p.responsable,
      p.fechaInicio,
      p.fechaFinal,
      p.estado,
      p.presupuesto,
      p.ejecutado,
      p.avanceFisico,
    ]
      .map(csvEscape)
      .join(","),
  );
  const bom = "\uFEFF";
  const csv = bom + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-sigoc-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(lista: Project[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const margin = 12;
  let y = margin;

  doc.setFontSize(14);
  doc.text("SIGOC — Reporte de proyectos", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleString("es-BO")}`, margin, y);
  doc.setTextColor(0);
  y += 8;

  const cols = [
    { h: "Código", w: 28 },
    { h: "Proyecto", w: 55 },
    { h: "Empresa", w: 40 },
    { h: "Responsable", w: 35 },
    { h: "Estado", w: 22 },
    { h: "Presupuesto", w: 28 },
    { h: "Ejecutado", w: 28 },
    { h: "Avance", w: 18 },
  ];

  const drawHeader = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    let x = margin;
    for (const c of cols) {
      doc.text(c.h, x, y);
      x += c.w;
    }
    y += 2;
    doc.setDrawColor(180);
    doc.line(margin, y, margin + cols.reduce((a, c) => a + c.w, 0), y);
    y += 5;
    doc.setFont("helvetica", "normal");
  };

  drawHeader();

  for (const p of lista) {
    if (y > 190) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
    const cells = [
      p.codigo,
      p.nombre,
      p.empresa,
      p.responsable,
      p.estado,
      money(p.presupuesto),
      money(p.ejecutado),
      `${p.avanceFisico}%`,
    ];
    let x = margin;
    cells.forEach((cell, i) => {
      const text = doc.splitTextToSize(String(cell), cols[i]!.w - 2);
      doc.text(text[0] ?? "", x, y);
      x += cols[i]!.w;
    });
    y += 6;
  }

  if (!lista.length) {
    doc.text("Sin resultados para los filtros seleccionados.", margin, y);
  }

  doc.save(`reporte-sigoc-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function ReportesPage() {
  const { data: projects = [] } = useProyectos();
  const { puedeVer } = usePermisos();
  const [proyecto, setProyecto] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [empresa, setEmpresa] = useState("");
  const [responsable, setResponsable] = useState("");
  const [desde, setDesde] = useState("");
  const [exporting, setExporting] = useState(false);

  if (!puedeVer("reportes")) return <AccesoDenegado modulo="Reportes" />;

  const lista = projects.filter(
    (p) =>
      (proyecto === "todos" || p.id === proyecto) &&
      (estado === "todos" || p.estado === estado) &&
      (!empresa || p.empresa.toLowerCase().includes(empresa.toLowerCase())) &&
      (!responsable || p.responsable.toLowerCase().includes(responsable.toLowerCase())) &&
      (!desde || p.fechaInicio >= desde),
  );

  const onPdf = () => {
    setExporting(true);
    void exportPdf(lista)
      .then(() => toast.success("Reporte PDF descargado."))
      .catch((err: Error) => toast.error(err.message || "No se pudo generar el PDF."))
      .finally(() => setExporting(false));
  };

  const onExcel = () => {
    try {
      exportExcel(lista);
      toast.success("Reporte Excel (CSV) descargado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el Excel.");
    }
  };

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
        <Button className="gap-2" onClick={onPdf} disabled={exporting}>
          <FileDown className="size-4" /> Exportar PDF
        </Button>
        <Button variant="outline" className="gap-2" onClick={onExcel}>
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
