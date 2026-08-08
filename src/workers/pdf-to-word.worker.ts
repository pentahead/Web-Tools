import * as pdfjsLib from 'pdfjs-dist';
import { NativeTextExtractor } from '@/lib/pdf-to-word/text-extractor';
import { DocumentGenerator } from '@/lib/pdf-to-word/document-generator';
import type { WorkerRequest, WorkerResponse } from '@/types/pdf-to-word';

// Configure PDF.js worker
// pdf.worker.mjs is located in pdfjs-dist/build/
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const data = e.data;
  if (data.type !== 'process') return;

  try {
    const { file, settings } = data;

    const reportProgress = (message: string, percent: number) => {
      self.postMessage({ type: 'progress', message, percent } as WorkerResponse);
    };

    reportProgress('Initializing...', 0);

    const extractor = new NativeTextExtractor();
    const extractedDoc = await extractor.extract(file, reportProgress);

    if (extractedDoc.isScanned) {
      self.postMessage({ type: 'scanned' } as WorkerResponse);
      return;
    }

    const generator = new DocumentGenerator();
    const docxBlob = await generator.generate(extractedDoc, settings, reportProgress);

    self.postMessage({ type: 'success', docxBlob } as WorkerResponse);

  } catch (error: any) {
    self.postMessage({ type: 'error', error: error.message || 'Unknown error occurred' } as WorkerResponse);
  }
};
