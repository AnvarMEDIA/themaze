import imageCompression from 'browser-image-compression'

/**
 * Compress an image file on the client before upload.
 * - SVG, ICO and GIF are passed through untouched (compression would break them).
 * - Target ~1 MB, max 2560px on the longest side, WebP-friendly.
 *
 * Throws only if the input is unreadable; otherwise returns the original file
 * when compression fails so uploads never silently break.
 */
export async function compressImage(file: File): Promise<File> {
  if (
    file.type === 'image/svg+xml' ||
    file.type === 'image/x-icon' ||
    file.type === 'image/vnd.microsoft.icon' ||
    file.type === 'image/gif' ||
    // Very small files: compression is not worth the CPU.
    file.size < 300 * 1024
  ) {
    return file
  }

  try {
    const compressed: File = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 2560,
      useWebWorker: true,
      initialQuality: 0.82,
    })
    return compressed
  } catch {
    return file
  }
}
