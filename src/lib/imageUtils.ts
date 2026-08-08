export const MAX_IMAGE_DIMENSION = 2048; // Max width or height

export async function getImageDataFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let { width, height } = img;

      // Downscale if image is too large
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Failed to get 2D context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        
        // Return original image data immediately, 
        // we'll apply grayscale/bw filters separately if needed,
        // or actually, let's just create a separate function for preprocessing 
        // to keep getImageDataFromUrl clean.
        resolve(imageData);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export function preprocessImageData(
  imageData: ImageData, 
  mode: 'color' | 'grayscale' | 'bw'
): ImageData {
  if (mode === 'color') return imageData;
  
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Standard luminance calculation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    if (mode === 'bw') {
      const bw = gray > 127 ? 255 : 0;
      data[i] = bw;
      data[i + 1] = bw;
      data[i + 2] = bw;
    } else {
      // grayscale
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    // alpha data[i+3] remains unchanged
  }
  
  return new ImageData(data, imageData.width, imageData.height);
}
