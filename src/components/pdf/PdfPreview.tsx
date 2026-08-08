import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface PdfPreviewProps {
  pdf: pdfjsLib.PDFDocumentProxy | null;
  pageNumber: number;
  rotation?: number;
  className?: string;
}

export default function PdfPreview({ pdf, pageNumber, rotation = 0, className }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  
  useEffect(() => {
    let mounted = true;
    let renderTask: pdfjsLib.RenderTask | null = null;
    
    async function renderPage() {
      if (!pdf || !canvasRef.current) return;
      
      try {
        setLoading(true);
        const page = await pdf.getPage(pageNumber);
        
        // Adjust scale based on zoom and device pixel ratio for sharpness
        const devicePixelRatio = window.devicePixelRatio || 1;
        const baseScale = 1.5; // Good default clarity
        const scale = baseScale * zoom * devicePixelRatio;
        
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // CSS dimensions
        canvas.style.width = `${viewport.width / devicePixelRatio}px`;
        canvas.style.height = `${viewport.height / devicePixelRatio}px`;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        } as any;
        
        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Failed to render preview', err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    renderPage();
    
    return () => {
      mounted = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber, zoom]);

  return (
    <div className={`flex flex-col h-full bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden ${className || ''}`}>
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Preview</span>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono w-12 text-center text-slate-600 dark:text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={() => setZoom(z => Math.min(3, z + 0.25))}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ZoomIn size={16} />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button 
            onClick={() => setZoom(1)}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
            title="Reset Zoom"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[#e5e7eb] dark:bg-[#0f172a] relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-black/5 flex items-center justify-center backdrop-blur-[1px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 drop-shadow-md" />
          </div>
        )}
        <div 
          className="bg-white shadow-xl transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    </div>
  );
}
