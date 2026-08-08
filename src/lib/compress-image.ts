/** Comprime una imagen en el cliente (JPEG, lado máx. ~1600px). */
export type CompressResult = {
  blob: Blob;
  file: File;
  previewUrl: string;
  originalBytes: number;
  compressedBytes: number;
  savedRatio: number;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export { formatBytes };

function toJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo comprimir la imagen"))),
      "image/jpeg",
      quality,
    );
  });
}

type DecodedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  close: () => void;
};

/** Decodifica con createImageBitmap; si falla (móvil/HEIC), usa Image. */
async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      close: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("No se pudo leer la imagen de la cámara"));
        el.src = url;
      });
      return {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        close: () => URL.revokeObjectURL(url),
      };
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
  }
}

export async function compressImage(
  input: File,
  opts?: { maxSide?: number; quality?: number },
): Promise<CompressResult> {
  if (!input || input.size <= 0) {
    throw new Error("El archivo de imagen está vacío");
  }

  const maxSide = opts?.maxSide ?? 1600;
  const preferredQuality = opts?.quality ?? 0.72;
  const originalBytes = input.size;

  const decoded = await decodeImage(input);
  try {
    if (!decoded.width || !decoded.height) {
      throw new Error("La imagen no tiene dimensiones válidas");
    }

    const scale = Math.min(1, maxSide / Math.max(decoded.width, decoded.height));
    const w = Math.max(1, Math.round(decoded.width * scale));
    const h = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar el canvas de compresión");
    decoded.draw(ctx, w, h);

    const qualities = [preferredQuality, 0.55, 0.4];
    let best = await toJpegBlob(canvas, qualities[0]!);
    for (const q of qualities.slice(1)) {
      if (best.size < originalBytes) break;
      const candidate = await toJpegBlob(canvas, q!);
      if (candidate.size < best.size) best = candidate;
    }

    // Si el JPEG sigue siendo más grande, conservar el archivo original.
    const useOriginal = best.size >= originalBytes;
    const blob: Blob = useOriginal ? input : best;
    const baseName = (input.name || "foto").replace(/\.[^.]+$/, "") || "foto";
    const name = useOriginal ? input.name || `${baseName}.jpg` : `${baseName}.jpg`;
    const type = useOriginal
      ? input.type || "image/jpeg"
      : "image/jpeg";
    const file = new File([blob], name, { type });
    const previewUrl = URL.createObjectURL(blob);
    const compressedBytes = blob.size;
    const savedRatio =
      originalBytes > 0 ? (originalBytes - compressedBytes) / originalBytes : 0;

    return {
      blob,
      file,
      previewUrl,
      originalBytes,
      compressedBytes,
      savedRatio,
    };
  } finally {
    decoded.close();
  }
}
