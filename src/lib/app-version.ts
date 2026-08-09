import packageJson from "../../package.json";

/** Versión desde package.json (ej. 1.2.0 → v1.2.0). */
export function getAppVersionLabel(): string {
  const raw = typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
  return `v${raw}`;
}

/** Texto del pie del menú: SIGOC v1.3.1 */
export function getAppFooterLabel(): string {
  return `SIGOC ${getAppVersionLabel()}`;
}
