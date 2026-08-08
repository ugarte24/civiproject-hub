/** Contador de UI “ocupada” (diálogos, cámara, formularios) para diferir chequeos de plan. */
let depth = 0;
let filePicking = false;

export function pushUiBusy() {
  depth += 1;
}

export function popUiBusy() {
  depth = Math.max(0, depth - 1);
}

export function isUiBusy() {
  return depth > 0;
}

/** Marca selección de archivo/cámara (idempotente). */
export function setFilePickingBusy(busy: boolean) {
  if (busy && !filePicking) {
    filePicking = true;
    pushUiBusy();
  } else if (!busy && filePicking) {
    filePicking = false;
    popUiBusy();
  }
}

/**
 * true si no conviene verificar la suscripción ahora:
 * diálogo abierto, cámara/archivo, o foco en un campo de formulario.
 */
export function shouldDeferSubscriptionCheck(): boolean {
  if (isUiBusy()) return true;
  if (typeof document === "undefined") return false;

  const ae = document.activeElement as HTMLElement | null;
  if (!ae || ae === document.body) return false;

  if (ae.closest('[role="dialog"], [role="alertdialog"]')) return true;

  const tag = ae.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (ae.isContentEditable) return true;

  return false;
}
