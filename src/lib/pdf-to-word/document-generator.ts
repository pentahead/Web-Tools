import { Document, Packer, Paragraph, TextRun } from 'docx';
import type { ExtractedDocument, PdfToWordSettings } from '@/types/pdf-to-word';

export class DocumentGenerator {
  async generate(extractedDoc: ExtractedDocument, settings: PdfToWordSettings, onProgress?: (msg: string, pct: number) => void): Promise<Blob> {
    onProgress?.("Generating Word document", 60);

    const docxParagraphs: Paragraph[] = [];

    const totalParagraphs = extractedDoc.paragraphs.length;

    for (let i = 0; i < totalParagraphs; i++) {
      if (i % 50 === 0 && onProgress) {
        onProgress(`Processing paragraphs ${i} of ${totalParagraphs}`, 60 + Math.floor((i / totalParagraphs) * 30));
      }

      const p = extractedDoc.paragraphs[i];
      
      if (settings.layout === 'plain') {
        docxParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: p.text,
              }),
            ],
            spacing: {
              after: 200,
            }
          })
        );
      } else {
        // preserve basic paragraphs
        docxParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: p.text,
              }),
            ],
            spacing: {
              after: 200,
            }
          })
        );
      }
    }

    onProgress?.("Finalizing document", 95);

    const doc = new Document({
      sections: [{
        properties: {},
        children: docxParagraphs,
      }],
    });

    const blob = await Packer.toBlob(doc);
    
    onProgress?.("Done", 100);
    return blob;
  }
}
