/**
 * Browser-side preparation of an image before upload.
 *
 * Photos larger than MAX_UPLOAD_SIDE on their longest side are scaled down on
 * the uploader's device and encoded again in the same format. That keeps the
 * stored image a sensible size for the web, makes uploads faster on mobile
 * connections and drops all embedded metadata (a canvas carries none). The
 * browser applies the camera orientation while decoding, so the result is
 * upright.
 *
 * Smaller images are uploaded untouched; the server rebuilds them without
 * metadata either way (src/lib/media/image-sanitize.ts).
 */

import { formatForMime, readImageHeader } from "@/lib/media/image-sanitize";

export const MAX_UPLOAD_SIDE = 2560;
const QUALITY = 0.88;

export async function prepareImageForUpload(file: File): Promise<File> {
  const format = formatForMime(file.type);
  if (!format || typeof createImageBitmap !== "function") return file;
  let header;
  try {
    header = readImageHeader(new Uint8Array(await file.arrayBuffer()), format);
  } catch {
    return file; // the server reports what is wrong with it
  }
  const scale = MAX_UPLOAD_SIDE / Math.max(header.width, header.height);
  if (scale >= 1) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, QUALITY));
    // Browsers that cannot write the format (WebP in older Safari) fall back
    // to PNG, which is fine: the upload is sent with the type it really has.
    if (!blob || !formatForMime(blob.type)) return file;
    const extension = blob.type === "image/jpeg" ? "jpg" : blob.type.slice("image/".length);
    const name = file.name.replace(/\.[^.]+$/, "") + "." + extension;
    return new File([blob], name, { type: blob.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}
