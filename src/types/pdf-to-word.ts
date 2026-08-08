export interface PdfToWordSettings {
  layout: 'preserve' | 'plain';
}

export interface ExtractedDocument {
  paragraphs: ExtractedParagraph[];
  isScanned: boolean;
  pageCount: number;
}

export interface ExtractedParagraph {
  text: string;
  lines: ExtractedLine[];
}

export interface ExtractedLine {
  text: string;
  items: ExtractedItem[];
}

export interface ExtractedItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
}

export interface PdfTextExtractor {
  extract(file: File, onProgress?: (msg: string, pct: number) => void): Promise<ExtractedDocument>;
}

// Worker Types
export type WorkerRequest = {
  type: 'process';
  file: File;
  settings: PdfToWordSettings;
};

export type WorkerResponse = 
  | { type: 'progress'; message: string; percent: number }
  | { type: 'success'; docxBlob: Blob }
  | { type: 'error'; error: string }
  | { type: 'scanned' };
