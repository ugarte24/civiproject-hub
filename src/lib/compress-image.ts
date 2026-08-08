/** Comprime una imagen en el cliente (JPEG, lado máx. ~1280–1600px). */
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

function targetSize(srcW: number, srcH: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  return {
    w: Math.max(1, Math.round(srcW * scale)),
    h: Math.max(1, Math.round(srcH * scale)),
  };
}

/** Decodifica redimensionando en el decode cuando el navegador lo permite (menos RAM en móvil). */
async function decodeImage(file: File, maxSide: number): Promise<DecodedImage> {
  try {
    // Primero intentamos obtener tamaño y redimensionar en un solo paso.
    const probe = await createImageBitmap(file);
    const { w, h } = targetSize(probe.width, probe.height, maxSide);
    if (probe.width === w && probe.height === h) {
      return {
        width: probe.width,
        height: probe.height,
        draw: (ctx, dw, dh) => ctx.drawImage(probe, 0, 0, dw, dh),
        close: () => probe.close(),
      };
    }
    probe.close();

    try {
      const resized = await createImageBitmap(file, {
        resizeWidth: w,
        resizeHeight: h,
        resizeQuality: "medium",
      });
      return {
        width: resized.width,
        height: resized.height,
        draw: (ctx, dw, dh) => ctx.drawImage(resized, 0, 0, dw, dh),
        close: () => resized.close(),
      };
    } catch {
      const full = await createImageBitmap(file);
      return {
        width: full.width,
        height: full.height,
        draw: (ctx, dw, dh) => ctx.drawImage(full, 0, 0, dw, dh),
        close: () => full.close(),
      };
    }
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

function isMobileClient() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export async function compressImage(
  input: File,
  opts?: { maxSide?: number; quality?: number },
): Promise<CompressResult> {
  if (!input || input.size <= 0) {
    throw new Error("El archivo de imagen está vacío");
  }

  const mobile = isMobileClient();
  const maxSide = opts?.maxSide ?? (mobile ? 1280 : 1600);
  const preferredQuality = opts?.quality ?? (mobile ? 0.65 : 0.72);
  const originalBytes = input.size;

  const decoded = await decodeImage(input, maxSide);
  try {
    if (!decoded.width || !decoded.height) {
      throw new Error("La imagen no tiene dimensiones válidas");
    }

    const { w, h } = targetSize(decoded.width, decoded.height, maxSide);

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

    // En móvil/cámara nunca conservar el original gigante: preferir JPEG comprimido.
    const keepOriginal =
      !mobile && best.size >= originalBytes && originalBytes < 800_000;
    const blob: Blob = keepOriginal ? input : best;
    const baseName = (input.name || "foto").replace(/\.[^.]+$/, "") || "foto";
    const name = keepOriginal ? input.name || `${baseName}.jpg` : `${baseName}.jpg`;
    const type = keepOriginal ? input.type || "image/jpeg" : "image/jpeg";
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
