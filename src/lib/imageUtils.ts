export const MAX_IMAGE_DIMENSION = 4096;

export interface ImageMetadata {
  width: number;
  height: number;
  name: string;
  size: number;
  type: string;
}

export type ResizePreset = 'original' | '75%' | '50%' | '25%' | 'custom';

export interface ResizeOptions {
  preset: ResizePreset;
  customWidth?: number;
  customHeight?: number;
  maintainAspectRatio?: boolean;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function compareFileSizes(originalSize: number, outputSize: number) {
  const formattedOriginal = formatFileSize(originalSize);
  const formattedOutput = formatFileSize(outputSize);
  const isSmaller = outputSize < originalSize;
  let percentage = 0;
  
  if (originalSize > 0) {
    const diff = Math.abs(originalSize - outputSize);
    percentage = parseFloat(((diff / originalSize) * 100).toFixed(1));
  }

  return {
    formattedOriginal,
    formattedOutput,
    isSmaller,
    percentage,
  };
}

export function loadImage(source: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    let objectUrl: string | null = null;
    if (typeof source !== 'string') {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    } else {
      img.src = source;
    }

    img.onload = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve(img);
    };

    img.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error("Failed to load image. File may be corrupt or an invalid format."));
    };
  });
}

export async function getImageMetadata(file: File): Promise<ImageMetadata> {
  const img = await loadImage(file);
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export function calculateTargetDimensions(
  origWidth: number,
  origHeight: number,
  options: ResizeOptions
): { width: number; height: number } {
  const { preset, customWidth, customHeight, maintainAspectRatio = true } = options;

  if (origWidth <= 0 || origHeight <= 0) {
    return { width: 1, height: 1 };
  }

  let scale = 1.0;
  switch (preset) {
    case '75%':
      scale = 0.75;
      break;
    case '50%':
      scale = 0.5;
      break;
    case '25%':
      scale = 0.25;
      break;
    case 'original':
      scale = 1.0;
      break;
    case 'custom':
      if (customWidth && customHeight) {
        return {
          width: Math.max(1, Math.round(customWidth)),
          height: Math.max(1, Math.round(customHeight)),
        };
      } else if (customWidth) {
        const targetW = Math.max(1, Math.round(customWidth));
        const targetH = maintainAspectRatio
          ? Math.max(1, Math.round((targetW * origHeight) / origWidth))
          : origHeight;
        return { width: targetW, height: targetH };
      } else if (customHeight) {
        const targetH = Math.max(1, Math.round(customHeight));
        const targetW = maintainAspectRatio
          ? Math.max(1, Math.round((targetH * origWidth) / origHeight))
          : origWidth;
        return { width: targetW, height: targetH };
      }
      return { width: origWidth, height: origHeight };
  }

  return {
    width: Math.max(1, Math.round(origWidth * scale)),
    height: Math.max(1, Math.round(origHeight * scale)),
  };
}

export function resizeImageToCanvas(
  img: HTMLImageElement | HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(targetWidth));
  canvas.height = Math.max(1, Math.round(targetHeight));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Failed to get 2D canvas rendering context.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas;
}

export function getImageDataFromCanvas(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Failed to get 2D canvas context.");
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/webp',
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`Failed to encode image to format ${type}.`));
        }
      },
      type,
      quality
    );
  });
}

export async function getImageDataFromUrl(url: string): Promise<ImageData> {
  const img = await loadImage(url);
  let { naturalWidth: width, naturalHeight: height } = img;
  if (!width || !height) {
    width = img.width;
    height = img.height;
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = resizeImageToCanvas(img, width, height);
  return getImageDataFromCanvas(canvas);
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
    
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    if (mode === 'bw') {
      const bw = gray > 127 ? 255 : 0;
      data[i] = bw;
      data[i + 1] = bw;
      data[i + 2] = bw;
    } else {
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }
  
  return new ImageData(data, imageData.width, imageData.height);
}
