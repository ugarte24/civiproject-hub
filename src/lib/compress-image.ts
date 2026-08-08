/** Comprime una imagen en el cliente (JPEG ~1600px, calidad 0.75). */
export type CompressResult = {
  blob: Blob;
  file: File;
  previewUrl: string;
  originalBytes: number;
  compressedBytes: number;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export { formatBytes };

export async function compressImage(
  input: File,
  opts?: { maxSide?: number; quality?: number },
): Promise<CompressResult> {
  const maxSide = opts?.maxSide ?? 1600;
  const quality = opts?.quality ?? 0.75;
  const originalBytes = input.size;

  const bitmap = await createImageBitmap(input);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el canvas de compresión");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo comprimir la imagen"))),
      "image/jpeg",
      quality,
    );
  });

  const name = input.name.replace(/\.[^.]+$/, "") + ".jpg";
  const file = new File([blob], name, { type: "image/jpeg" });
  const previewUrl = URL.createObjectURL(blob);

  return {
    blob,
    file,
    previewUrl,
    originalBytes,
    compressedBytes: blob.size,
  };
}
