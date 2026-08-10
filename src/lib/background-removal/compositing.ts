/**
 * Composite a transparent foreground image over a selected background color.
 *
 * @param foregroundImg The transparent foreground HTMLImageElement
 * @param color Hex color string (e.g. "#FFFFFF", "#3B82F6") or 'transparent'
 * @param width Canvas width (original image width)
 * @param height Canvas height (original image height)
 * @returns Promise resolving to a PNG Blob
 */
export function compositeBackgroundColor(
  foregroundImg: HTMLImageElement,
  color: string,
  width: number,
  height: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Failed to get 2D canvas rendering context."));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fill background if not transparent
      if (color && color.toLowerCase() !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw transparent foreground image over the background
      ctx.drawImage(foregroundImg, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to export canvas to PNG blob."));
        }
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}
