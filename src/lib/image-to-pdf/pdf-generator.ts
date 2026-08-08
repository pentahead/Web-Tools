import { jsPDF } from 'jspdf';

export type PageSize = 'A4' | 'A5' | 'Letter' | 'Original Image';
export type Orientation = 'Portrait' | 'Landscape' | 'Auto';
export type Margin = 'None' | 'Small' | 'Medium' | 'Large';
export type ImageFit = 'Fit' | 'Fill' | 'Original Size';

export type PdfSettings = {
  pageSize: PageSize;
  orientation: Orientation;
  margin: Margin;
  imageFit: ImageFit;
};

const getMarginPixels = (margin: Margin, pageWidth: number): number => {
  switch (margin) {
    case 'None': return 0;
    case 'Small': return pageWidth * 0.05; // 5% margin
    case 'Medium': return pageWidth * 0.1; // 10% margin
    case 'Large': return pageWidth * 0.15; // 15% margin
  }
};

const getPageDimensions = (pageSize: PageSize, defaultOrientation: 'p' | 'l'): { width: number; height: number } | null => {
  // Dimensions in points (1 pt = 1/72 inch). jsPDF defaults to points or mm. Let's use pt for pixel calculation.
  // We'll use 'pt' in jsPDF initialization.
  const sizes: Record<string, [number, number]> = {
    'A4': [595.28, 841.89],
    'A5': [419.53, 595.28],
    'Letter': [612, 792],
  };

  if (pageSize === 'Original Image') return null;

  const [w, h] = sizes[pageSize];
  if (defaultOrientation === 'l') {
    return { width: Math.max(w, h), height: Math.min(w, h) };
  }
  return { width: Math.min(w, h), height: Math.max(w, h) };
};

export const generatePdf = async (
  imageUrls: string[],
  settings: PdfSettings,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  
  if (imageUrls.length === 0) throw new Error('No images provided');

  // We will initialize the PDF object with the first page's settings.
  let pdf: jsPDF | null = null;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    
    // Load image to get its dimensions
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    const imgWidth = img.width;
    const imgHeight = img.height;
    const isImageLandscape = imgWidth > imgHeight;

    let pageOrientation: 'p' | 'l' = 'p';
    if (settings.orientation === 'Landscape') pageOrientation = 'l';
    else if (settings.orientation === 'Portrait') pageOrientation = 'p';
    else if (settings.orientation === 'Auto') {
      pageOrientation = isImageLandscape ? 'l' : 'p';
    }

    let pageWidth = 0;
    let pageHeight = 0;

    const dimensions = getPageDimensions(settings.pageSize, pageOrientation);
    if (dimensions) {
      pageWidth = dimensions.width;
      pageHeight = dimensions.height;
    } else {
      // Original Image Size (we convert pixels to points assuming 72dpi, or just use pixels directly as points)
      // jsPDF with unit 'px' maps 1px to 1pt usually depending on configuration. We'll use 'pt' and map 1px = 1pt for simplicity
      // Or we can use unit 'px' and format [imgWidth, imgHeight]
      pageWidth = imgWidth;
      pageHeight = imgHeight;
    }

    const marginPt = getMarginPixels(settings.margin, pageWidth);
    
    // Initialize PDF on the first iteration
    if (!pdf) {
      pdf = new jsPDF({
        orientation: pageOrientation,
        unit: 'pt',
        format: settings.pageSize === 'Original Image' ? [pageWidth, pageHeight] : settings.pageSize.toLowerCase(),
      });
    } else {
      pdf.addPage(settings.pageSize === 'Original Image' ? [pageWidth, pageHeight] : settings.pageSize.toLowerCase(), pageOrientation);
    }

    // Now calculate image placement
    const availableWidth = pageWidth - (marginPt * 2);
    const availableHeight = pageHeight - (marginPt * 2);

    let drawWidth = availableWidth;
    let drawHeight = availableHeight;
    let offsetX = marginPt;
    let offsetY = marginPt;

    if (settings.imageFit === 'Original Size') {
      drawWidth = imgWidth;
      drawHeight = imgHeight;
      offsetX = (pageWidth - drawWidth) / 2;
      offsetY = (pageHeight - drawHeight) / 2;
    } else {
      const widthRatio = availableWidth / imgWidth;
      const heightRatio = availableHeight / imgHeight;

      if (settings.imageFit === 'Fit') {
        const ratio = Math.min(widthRatio, heightRatio);
        drawWidth = imgWidth * ratio;
        drawHeight = imgHeight * ratio;
        offsetX = marginPt + (availableWidth - drawWidth) / 2;
        offsetY = marginPt + (availableHeight - drawHeight) / 2;
      } else if (settings.imageFit === 'Fill') {
        const ratio = Math.max(widthRatio, heightRatio);
        drawWidth = imgWidth * ratio;
        drawHeight = imgHeight * ratio;
        offsetX = marginPt + (availableWidth - drawWidth) / 2;
        offsetY = marginPt + (availableHeight - drawHeight) / 2;
      }
    }

    pdf.addImage(img, 'JPEG', offsetX, offsetY, drawWidth, drawHeight);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / imageUrls.length) * 100));
    }
  }

  return pdf!.output('blob');
};
