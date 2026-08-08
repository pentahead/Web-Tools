import * as pdfjsLib from 'pdfjs-dist';

// We configure workerSrc
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function loadPdf(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf;
}

export async function renderPageToCanvas(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number = 1.0
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error("Could not create canvas context");
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  } as any;
  
  await page.render(renderContext).promise;
  return canvas;
}

export async function renderPageToDataUrl(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number = 0.5
): Promise<string> {
  const canvas = await renderPageToCanvas(pdf, pageNumber, scale);
  return canvas.toDataURL('image/jpeg', 0.8);
}
