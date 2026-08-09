import type { CompressResult } from "@/lib/compress-image";
import { formatBytes } from "@/lib/compress-image";

export { formatBytes };

/**
 * Comprime un PDF en el cliente: rasteriza páginas a JPEG y genera un PDF más liviano.
 * Si no mejora el tamaño o falla, conserva el original.
 */
export async function compressPdf(
  input: File,
  opts?: { maxSide?: number; quality?: number; maxPages?: number },
): Promise<CompressResult> {
  if (!input || input.size <= 0) {
    throw new Error("El archivo PDF está vacío");
  }

  const originalBytes = input.size;
  const maxSide = opts?.maxSide ?? 1280;
  const quality = opts?.quality ?? 0.65;
  const maxPages = opts?.maxPages ?? 30;

  // PDFs ya livianos: no gastar CPU
  if (originalBytes < 350_000) {
    return {
      blob: input,
      file: input,
      previewUrl: URL.createObjectURL(input),
      originalBytes,
      compressedBytes: originalBytes,
      savedRatio: 0,
    };
  }

  try {
    const pdfjs = await import("pdfjs-dist");
    const workerSrc = (
      await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    ).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const data = new Uint8Array(await input.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pageCount = Math.min(pdf.numPages, maxPages);
    const { jsPDF } = await import("jspdf");

    let out: InstanceType<typeof jsPDF> | null = null;

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, maxSide / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo preparar el canvas de compresión");

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
        // pdfjs v4+ espera la referencia del canvas en algunos entornos
        canvas,
      } as Parameters<typeof page.render>[0]);
      await renderTask.promise;

      const imgData = canvas.toDataURL("image/jpeg", quality);
      const w = canvas.width;
      const h = canvas.height;
      const orient = w >= h ? "landscape" : "portrait";

      if (!out) {
        out = new jsPDF({
          orientation: orient,
          unit: "pt",
          format: [w, h],
          compress: true,
        });
      } else {
        out.addPage([w, h], orient);
      }
      out.addImage(imgData, "JPEG", 0, 0, w, h, undefined, "FAST");
    }

    if (!out) {
      throw new Error("El PDF no tiene páginas");
    }

    const blob = out.output("blob");
    if (blob.size >= originalBytes) {
      return {
        blob: input,
        file: input,
        previewUrl: URL.createObjectURL(input),
        originalBytes,
        compressedBytes: originalBytes,
        savedRatio: 0,
      };
    }

    const baseName = (input.name || "documento").replace(/\.pdf$/i, "") || "documento";
    const file = new File([blob], `${baseName}.pdf`, { type: "application/pdf" });
    return {
      blob,
      file,
      previewUrl: URL.createObjectURL(blob),
      originalBytes,
      compressedBytes: blob.size,
      savedRatio: (originalBytes - blob.size) / originalBytes,
    };
  } catch (err) {
    console.warn("compressPdf: se mantiene el original", err);
    return {
      blob: input,
      file: input,
      previewUrl: URL.createObjectURL(input),
      originalBytes,
      compressedBytes: originalBytes,
      savedRatio: 0,
    };
  }
}
