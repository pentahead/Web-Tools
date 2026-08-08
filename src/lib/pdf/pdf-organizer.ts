import { PDFDocument, degrees } from 'pdf-lib';
import type { PdfPage } from '../../types/pdf';

export async function mergePdfs(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function organizePdf(file: File, finalPages: PdfPage[]): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const sourceDoc = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();

  // Load pages based on new order
  const indices = finalPages.map(p => p.originalIndex);
  const copiedPages = await newPdf.copyPages(sourceDoc, indices);

  copiedPages.forEach((page, idx) => {
    const pageModel = finalPages[idx];
    if (pageModel.rotation !== 0) {
      // Rotation in pdf-lib is absolute. We need to add to the existing rotation if any,
      // but typical UI rotation is absolute relative to the current display.
      // Assuming pageModel.rotation is the absolute rotation we want to set.
      page.setRotation(degrees(pageModel.rotation));
    }
    newPdf.addPage(page);
  });

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
