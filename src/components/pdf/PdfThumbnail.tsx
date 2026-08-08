import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { renderPageToDataUrl } from '../../lib/pdf/pdf-loader';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfThumbnailProps {
  pdf: pdfjsLib.PDFDocumentProxy | null;
  pageNumber: number;
  rotation?: number;
  className?: string;
  onLoaded?: (dataUrl: string) => void;
}

export default function PdfThumbnail({ pdf, pageNumber, rotation = 0, className, onLoaded }: PdfThumbnailProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function load() {
      if (!pdf) return;
      try {
        setLoading(true);
        const url = await renderPageToDataUrl(pdf, pageNumber, 0.3); // low res
        if (mounted) {
          setDataUrl(url);
          if (onLoaded) onLoaded(url);
        }
      } catch (err) {
        console.error('Failed to render thumbnail for page', pageNumber, err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    load();
    
    return () => {
      mounted = false;
    };
  }, [pdf, pageNumber]);

  return (
    <div className={cn("relative overflow-hidden bg-white shadow-sm flex items-center justify-center border border-slate-200 aspect-[1/1.4]", className)}>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
      ) : dataUrl ? (
        <img 
          src={dataUrl} 
          alt={`Page ${pageNumber}`} 
          className="w-full h-full object-contain transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      ) : (
        <span className="text-slate-400 text-xs">Failed</span>
      )}
    </div>
  );
}
