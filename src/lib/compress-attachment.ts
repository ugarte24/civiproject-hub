import { compressImage, formatBytes, type CompressResult } from "@/lib/compress-image";
import { compressPdf } from "@/lib/compress-pdf";

export type { CompressResult };
export { formatBytes };

function passthrough(file: File): CompressResult {
  return {
    blob: file,
    file,
    previewUrl: URL.createObjectURL(file),
    originalBytes: file.size,
    compressedBytes: file.size,
    savedRatio: 0,
  };
}

/** Comprime imagen o PDF; el resto de formatos se deja igual. */
export async function compressAttachment(file: File): Promise<CompressResult> {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();

  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(name)) {
    return compressImage(file);
  }
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return compressPdf(file);
  }
  return passthrough(file);
}

export function formatCompressInfo(result: CompressResult): string {
  if (result.savedRatio > 0.01) {
    const pct = Math.round(result.savedRatio * 100);
    return `${formatBytes(result.originalBytes)} → ${formatBytes(result.compressedBytes)} (−${pct}%)`;
  }
  return `${formatBytes(result.originalBytes)} (ya era liviano; se mantiene el original)`;
}
