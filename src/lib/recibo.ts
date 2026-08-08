import { formatFechaBO } from "@/lib/subscription";

export type ReciboPago = {
  id: string;
  numero: string;
  empresa_nombre: string;
  periodo: "mensual" | "anual";
  monto: number;
  moneda: string;
  fecha_pago: string;
  vigencia_desde: string;
  vigencia_hasta: string;
  metodo?: string | null;
};

function moneyBO(n: number): string {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(n);
}

function periodoLabel(p: string): string {
  return p === "anual" ? "Anual (12 meses)" : "Mensual (30 días)";
}

function metodoLabel(m?: string | null): string {
  if (m === "transferencia_qr") return "Transferencia / QR";
  return m || "Transferencia / QR";
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Fecha local YYYY-MM-DD (no usar toISOString: en UTC-4 salta de día por la noche). */
function fechaLocalISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** HTML del recibo (vista previa e impresión). */
export function buildReciboHtml(pago: ReciboPago, opts?: { embed?: boolean }): string {
  const embed = opts?.embed ?? false;
  return `<!DOCTYPE html>
<html lang="es-BO">
<head>
  <meta charset="utf-8" />
  <title>Recibo ${pago.numero} — SIGOC</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #1c2433;
      margin: 0;
      padding: ${embed ? "16px" : "32px"};
      background: #fff;
    }
    .sheet { max-width: 640px; margin: 0 auto; border: 1px solid #d8dee8; border-radius: 8px; padding: 28px 32px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #e5a23b; padding-bottom: 16px; }
    .brand { font-size: 28px; font-weight: 700; letter-spacing: 0.06em; margin: 0; }
    .sub { color: #5b6578; font-size: 12px; margin-top: 4px; }
    .badge { background: #e5a23b; color: #1c2433; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 10px; border-radius: 4px; }
    h2 { font-size: 18px; margin: 24px 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px 0; border-bottom: 1px solid #eef1f6; vertical-align: top; }
    th { color: #5b6578; font-weight: 500; width: 42%; }
    .monto { font-size: 22px; font-weight: 700; color: #1c2433; }
    .foot { margin-top: 28px; font-size: 11px; color: #5b6578; line-height: 1.5; }
    .actions { margin: 20px auto; max-width: 640px; display: flex; gap: 8px; }
    .actions button {
      border: 1px solid #c9d1de; background: #1c2433; color: #fff;
      padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;
    }
    .actions button.secondary { background: #fff; color: #1c2433; }
    @media print {
      .actions { display: none !important; }
      body { padding: 0; }
      .sheet { border: none; }
    }
  </style>
</head>
<body>
  ${
    embed
      ? ""
      : `<div class="actions">
    <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
    <button type="button" class="secondary" onclick="window.close()">Cerrar</button>
  </div>`
  }
  <div class="sheet">
    <div class="head">
      <div>
        <p class="brand">SIGOC</p>
        <p class="sub">Sistema de Gestión de Obras Civiles · Bolivia</p>
      </div>
      <div class="badge">Recibo de pago</div>
    </div>
    <h2>Comprobante de renovación</h2>
    <table>
      <tr><th>Nº recibo</th><td><strong>${pago.numero}</strong></td></tr>
      <tr><th>Cliente / empresa</th><td>${escapeHtml(pago.empresa_nombre)}</td></tr>
      <tr><th>Fecha de pago</th><td>${formatFechaBO(pago.fecha_pago)}</td></tr>
      <tr><th>Plan</th><td>Esencial — ${periodoLabel(pago.periodo)}</td></tr>
      <tr><th>Método</th><td>${metodoLabel(pago.metodo)}</td></tr>
      <tr><th>Vigencia</th><td>${formatFechaBO(pago.vigencia_desde)} → ${formatFechaBO(pago.vigencia_hasta)}</td></tr>
      <tr><th>Monto pagado</th><td class="monto">${moneyBO(pago.monto)}</td></tr>
    </table>
    <p class="foot">
      Este documento acredita el registro del pago en SIGOC.
      Emitido el ${formatFechaBO(fechaLocalISO())}.
      Conserve este recibo como constancia de renovación del plan.
    </p>
  </div>
</body>
</html>`;
}

/**
 * Abre el recibo en una pestaña nueva (debe llamarse en respuesta directa a un clic).
 * Tras await/async el navegador suele bloquear popups; use vista previa en diálogo.
 */
export function imprimirRecibo(pago: ReciboPago): void {
  const html = buildReciboHtml(pago);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    throw new Error(
      "El navegador bloqueó la ventana del recibo. Use “Imprimir” en la vista previa.",
    );
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Imprime el contenido de un iframe (vista previa embebida). */
export function imprimirIframeRecibo(iframe: HTMLIFrameElement | null): void {
  const win = iframe?.contentWindow;
  if (!win) {
    throw new Error("No se pudo preparar la impresión del recibo.");
  }
  win.focus();
  win.print();
}

function esDispositivoMovil(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  return navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 1024px)").matches;
}

function buildReciboPdfDoc(
  jsPDF: typeof import("jspdf").jsPDF,
  pago: ReciboPago,
): InstanceType<typeof import("jspdf").jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(28, 36, 51);
  doc.text("SIGOC", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(91, 101, 120);
  doc.text("Sistema de Gestión de Obras Civiles · Bolivia", marginX, y + 6);

  doc.setFillColor(229, 162, 59);
  doc.roundedRect(pageW - marginX - 38, y - 6, 38, 8, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(28, 36, 51);
  doc.text("RECIBO DE PAGO", pageW - marginX - 19, y - 0.5, { align: "center" });

  y += 14;
  doc.setDrawColor(229, 162, 59);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageW - marginX, y);

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(28, 36, 51);
  doc.text("Comprobante de renovación", marginX, y);

  const rows: [string, string][] = [
    ["Nº recibo", pago.numero],
    ["Cliente / empresa", pago.empresa_nombre],
    ["Fecha de pago", formatFechaBO(pago.fecha_pago)],
    ["Plan", `Esencial — ${periodoLabel(pago.periodo)}`],
    ["Método", metodoLabel(pago.metodo)],
    ["Vigencia", `${formatFechaBO(pago.vigencia_desde)} - ${formatFechaBO(pago.vigencia_hasta)}`],
    ["Monto pagado", moneyBO(pago.monto)],
  ];

  y += 10;
  for (const [label, value] of rows) {
    doc.setDrawColor(238, 241, 246);
    doc.setLineWidth(0.2);
    doc.line(marginX, y + 5, pageW - marginX, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(91, 101, 120);
    doc.text(label, marginX, y);

    doc.setFont("helvetica", label === "Monto pagado" || label === "Nº recibo" ? "bold" : "normal");
    doc.setFontSize(label === "Monto pagado" ? 13 : 10);
    doc.setTextColor(28, 36, 51);
    const valueLines = doc.splitTextToSize(value, pageW - marginX * 2 - 55);
    doc.text(valueLines, marginX + 55, y);
    y += Math.max(10, valueLines.length * 5 + 4);
  }

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(91, 101, 120);
  const foot = doc.splitTextToSize(
    `Este documento acredita el registro del pago en SIGOC. Emitido el ${formatFechaBO(fechaLocalISO())}. Conserve este recibo como constancia de renovación del plan.`,
    pageW - marginX * 2,
  );
  doc.text(foot, marginX, y);

  return doc;
}

/**
 * En escritorio descarga el PDF.
 * En móvil abre el PDF en una pestaña/visor para compartirlo (WhatsApp, etc.).
 */
export async function descargarReciboPdf(
  pago: ReciboPago,
): Promise<"opened" | "downloaded"> {
  const mobile = esDispositivoMovil();
  // Abrir en el mismo gesto del usuario; si se espera al await, iOS/Android bloquean el popup.
  const preview = mobile ? window.open("about:blank", "_blank") : null;
  if (preview) {
    try {
      preview.document.open();
      preview.document.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Generando PDF…</title></head><body style="margin:0;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100dvh;color:#1c2433;background:#f7f8fa"><p>Generando recibo PDF…</p></body></html>`,
      );
      preview.document.close();
    } catch {
      // ignore
    }
  }

  try {
    const { jsPDF } = await import("jspdf");
    const doc = buildReciboPdfDoc(jsPDF, pago);
    const filename = `${pago.numero}.pdf`;
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    if (mobile) {
      if (preview && !preview.closed) {
        preview.location.href = url;
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      return "opened";
    }

    if (preview && !preview.closed) preview.close();
    doc.save(filename);
    URL.revokeObjectURL(url);
    return "downloaded";
  } catch (err) {
    if (preview && !preview.closed) preview.close();
    throw err;
  }
}
