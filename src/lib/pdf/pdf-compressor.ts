import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

export type CompressionPreset = 'lossless' | 'balanced' | 'max';

export interface CompressProgressEvent {
  phase: string;
  progress: number;
  message?: string;
}

export async function compressPdf(
  file: File, 
  preset: CompressionPreset,
  onProgress?: (event: CompressProgressEvent) => void
): Promise<{ blob: Blob, originalSize: number, compressedSize: number, percentageSaved: number }> {
  
  const arrayBuffer = await file.arrayBuffer();
  const originalSize = arrayBuffer.byteLength;
  
  const reportProgress = (progress: number, message: string) => {
    if (onProgress) {
      onProgress({ phase: 'compressing', progress, message });
    }
  };

  reportProgress(5, "Analyzing document...");
  
  // 1. Lossless fallback (re-saving strips unused objects)
  const sourceDoc = await PDFDocument.load(arrayBuffer);
  const losslessDoc = await PDFDocument.create();
  const copiedPages = await losslessDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
  copiedPages.forEach(p => losslessDoc.addPage(p));
  const losslessBytes = await losslessDoc.save({ useObjectStreams: true });
  
  if (preset === 'lossless') {
    reportProgress(100, "Finalizing lossless compression...");
    const blob = new Blob([losslessBytes], { type: 'application/pdf' });
    return {
      blob,
      originalSize,
      compressedSize: blob.size,
      percentageSaved: Math.max(0, ((originalSize - blob.size) / originalSize) * 100)
    };
  }

  // 2. Image Compression
  reportProgress(15, "Starting image compression...");
  
  try {
    const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfJsDoc.numPages;
    const imgDoc = await PDFDocument.create();
    
    // Determine settings
    let scale = 1.5;
    let quality = 0.7;
    
    if (preset === 'max') {
      scale = 1.0;
      quality = 0.5;
      if (originalSize > 20 * 1024 * 1024) {
        scale = 0.75; // Even smaller for huge files
      }
    } else {
      // balanced
      if (originalSize > 30 * 1024 * 1024) scale = 1.25;
      if (originalSize > 50 * 1024 * 1024) scale = 1.0;
    }

    for (let i = 1; i <= numPages; i++) {
      const pageProgress = 15 + ((i - 1) / numPages) * 80;
      reportProgress(Math.round(pageProgress), `Compressing page ${i}/${numPages}...`);
      
      const page = await pdfJsDoc.getPage(i);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
      if (!ctx) throw new Error("Could not create canvas context");
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render page on canvas
      await page.render({ canvasContext: ctx, viewport: viewport } as any).promise;
      
      // Convert to JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Clean up memory
      canvas.width = 0;
      canvas.height = 0;
      
      // Embed in PDF
      const imgBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
      const pdfImage = await imgDoc.embedJpg(imgBytes);
      
      // Original dimensions for the page
      const originalViewport = page.getViewport({ scale: 1.0 });
      const newPage = imgDoc.addPage([originalViewport.width, originalViewport.height]);
      
      newPage.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width: originalViewport.width,
        height: originalViewport.height
      });
      
      // Brief pause to unblock UI thread
      await new Promise(r => setTimeout(r, 10));
    }
    
    reportProgress(95, "Finalizing document...");
    const imgBytes = await imgDoc.save({ useObjectStreams: true });
    
    // Choose best result
    const finalBytes = imgBytes.byteLength < losslessBytes.byteLength ? imgBytes : losslessBytes;
    
    const blob = new Blob([finalBytes], { type: 'application/pdf' });
    
    return {
      blob,
      originalSize,
      compressedSize: blob.size,
      percentageSaved: Math.max(0, ((originalSize - blob.size) / originalSize) * 100)
    };
    
  } catch (err) {
    console.warn("Image compression failed, falling back to lossless", err);
    // Fallback to lossless if image compression fails
    const blob = new Blob([losslessBytes], { type: 'application/pdf' });
    return {
      blob,
      originalSize,
      compressedSize: blob.size,
      percentageSaved: Math.max(0, ((originalSize - blob.size) / originalSize) * 100)
    };
  }
}
