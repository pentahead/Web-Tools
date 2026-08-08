import * as pdfjsLib from 'pdfjs-dist';
import type { ExtractedDocument, ExtractedParagraph, ExtractedLine, ExtractedItem } from '@/types/pdf-to-word';

// Need to set up worker for pdf.js, we will assume it's set in the worker context
// pdfjsLib.GlobalWorkerOptions.workerSrc = '...';

export class NativeTextExtractor {
  async extract(file: File, onProgress?: (msg: string, pct: number) => void): Promise<ExtractedDocument> {
    onProgress?.("Loading PDF", 10);
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    const paragraphs: ExtractedParagraph[] = [];
    let totalChars = 0;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      onProgress?.(`Extracting text Page ${pageNum} of ${pageCount}`, 10 + Math.floor((pageNum / pageCount) * 40));
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items: ExtractedItem[] = [];
      
      for (const item of textContent.items) {
        if ('str' in item) {
          const str = item.str;
          totalChars += str.trim().length;
          // item.transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]
          const x = item.transform[4];
          const y = item.transform[5];
          
          if (str.trim().length > 0) {
            items.push({
              text: str,
              x,
              y,
              width: item.width,
              height: item.height,
              fontName: item.fontName
            });
          }
        }
      }

      // Group items by line (similar Y coordinate)
      // Note: Y in PDF is from bottom to top
      const lines = this.groupIntoLines(items);
      
      // Group lines into paragraphs (Y distance between lines)
      const pageParagraphs = this.groupIntoParagraphs(lines);
      paragraphs.push(...pageParagraphs);
    }
    
    const isScanned = totalChars < 20;

    return {
      paragraphs,
      isScanned,
      pageCount
    };
  }

  private groupIntoLines(items: ExtractedItem[]): ExtractedLine[] {
    if (items.length === 0) return [];
    
    // Sort primarily by Y (descending, because top of page is higher Y in standard PDF transform, 
    // though sometimes it's reversed. Let's assume standard bottom-left origin for now).
    items.sort((a, b) => b.y - a.y);
    
    const lines: ExtractedLine[] = [];
    let currentLine: ExtractedItem[] = [items[0]];
    let currentY = items[0].y;
    
    // threshold for being on the same line
    const Y_TOLERANCE = 5;

    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      if (Math.abs(item.y - currentY) <= Y_TOLERANCE) {
        currentLine.push(item);
      } else {
        // Sort current line by X
        currentLine.sort((a, b) => a.x - b.x);
        lines.push({
          text: currentLine.map(it => it.text).join(' '),
          items: currentLine
        });
        currentLine = [item];
        currentY = item.y;
      }
    }
    
    if (currentLine.length > 0) {
      currentLine.sort((a, b) => a.x - b.x);
      lines.push({
        text: currentLine.map(it => it.text).join(' '),
        items: currentLine
      });
    }
    
    return lines;
  }

  private groupIntoParagraphs(lines: ExtractedLine[]): ExtractedParagraph[] {
    if (lines.length === 0) return [];
    
    const paragraphs: ExtractedParagraph[] = [];
    let currentParagraph: ExtractedLine[] = [lines[0]];
    let lastY = lines[0].items[0]?.y ?? 0;
    
    const LINE_SPACING_TOLERANCE = 25; // Points threshold to consider a new paragraph

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const currentY = line.items[0]?.y ?? 0;
      
      const yDiff = Math.abs(lastY - currentY);
      
      if (yDiff > LINE_SPACING_TOLERANCE) {
        paragraphs.push({
          text: currentParagraph.map(l => l.text).join(' '),
          lines: currentParagraph
        });
        currentParagraph = [line];
      } else {
        currentParagraph.push(line);
      }
      lastY = currentY;
    }
    
    if (currentParagraph.length > 0) {
      paragraphs.push({
        text: currentParagraph.map(l => l.text).join(' '),
        lines: currentParagraph
      });
    }
    
    return paragraphs;
  }
}
