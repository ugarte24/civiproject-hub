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
      Emitido el ${formatFechaBO(new Date().toISOString().slice(0, 10))}.
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
