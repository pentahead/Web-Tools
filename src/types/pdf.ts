export interface PdfPage {
  id: string;
  sourceFileId: string;
  originalIndex: number;
  rotation: number;
  thumbnailUrl?: string;
  blob?: Blob; // optional, for generated thumbnails
}

export interface PdfDocumentInfo {
  id: string;
  file: File;
  pages: PdfPage[];
  pageCount: number;
  sizeBytes: number;
}
