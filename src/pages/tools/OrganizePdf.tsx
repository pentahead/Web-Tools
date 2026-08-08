import { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as pdfjsLib from 'pdfjs-dist';
import { FileText, Loader2, Download, RotateCw, Trash2, X, ZoomIn, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploadZone from '@/components/shared/FileUploadZone';
import PdfWorkspace from '@/components/pdf/PdfWorkspace';
import PdfThumbnail from '@/components/pdf/PdfThumbnail';
import PdfPreview from '@/components/pdf/PdfPreview';
import { loadPdf } from '@/lib/pdf/pdf-loader';
import { organizePdf } from '@/lib/pdf/pdf-organizer';
import type { PdfPage } from '@/types/pdf';

// ----------------------------------------------------------------------
// Sortable Page Item Component
// ----------------------------------------------------------------------
function SortablePageItem({ 
  page, 
  pdf, 
  onDelete, 
  onRotate,
  onPreview
}: { 
  page: PdfPage, 
  pdf: pdfjsLib.PDFDocumentProxy | null,
  onDelete: (id: string) => void,
  onRotate: (id: string) => void,
  onPreview: (page: PdfPage) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "bg-card rounded-[10px] border shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col group transition-all",
        isDragging ? "opacity-90 ring-1 ring-foreground scale-105 border-foreground" : "border-border hover:border-muted-foreground"
      )}
    >
      <div 
        className="p-3 bg-secondary/50 border-b border-border flex items-center justify-between cursor-grab active:cursor-grabbing"
        {...attributes} 
        {...listeners}
      >
        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
          <GripVertical size={14} strokeWidth={2} />
          <span className="text-[12px] font-display font-medium uppercase tracking-widest">Page {page.originalIndex + 1}</span>
        </div>
      </div>
      
      <div 
        className="relative flex-1 p-4 bg-secondary cursor-pointer border-b border-border"
        onClick={() => onPreview(page)}
      >
        <PdfThumbnail 
          pdf={pdf} 
          pageNumber={page.originalIndex + 1} 
          rotation={page.rotation} 
          className="w-full h-auto mx-auto pointer-events-none drop-shadow-md" 
        />
        <div className="absolute inset-0 bg-background/0 group-hover:bg-foreground/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background text-foreground p-3 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
            <ZoomIn size={18} strokeWidth={2} />
          </div>
        </div>
      </div>
      
      <div className="p-2 bg-card flex items-center justify-center gap-2">
        <button 
          onClick={() => onRotate(page.id)}
          className="flex-1 py-2 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-[6px] transition-colors"
          title="Rotate 90°"
        >
          <RotateCw size={16} strokeWidth={2} />
        </button>
        <button 
          onClick={() => onDelete(page.id)}
          className="flex-1 py-2 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-colors"
          title="Delete Page"
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Main OrganizePdf Component
// ----------------------------------------------------------------------
export default function OrganizePdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [previewPage, setPreviewPage] = useState<PdfPage | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    
    setLoading(true);
    setResultUrl(null);
    const selectedFile = files[0];
    
    try {
      const loadedPdf = await loadPdf(selectedFile);
      
      const initialPages: PdfPage[] = [];
      for (let i = 0; i < loadedPdf.numPages; i++) {
        initialPages.push({
          id: `page-${i}`,
          sourceFileId: selectedFile.name,
          originalIndex: i,
          rotation: 0
        });
      }
      
      setFile(selectedFile);
      setPdf(loadedPdf);
      setPages(initialPages);
    } catch (err) {
      console.error(err);
      alert("Failed to load PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDelete = (id: string) => {
    if (pages.length <= 1) {
      alert("A PDF must contain at least one page.");
      return;
    }
    setPages(pages.filter(p => p.id !== id));
  };

  const handleRotate = (id: string) => {
    setPages(pages.map(p => {
      if (p.id === id) {
        return { ...p, rotation: (p.rotation + 90) % 360 };
      }
      return p;
    }));
  };

  const handleSave = async () => {
    if (!file || pages.length === 0) return;
    
    setProcessing(true);
    try {
      const blob = await organizePdf(file, pages);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (err) {
      console.error(err);
      alert("Failed to save organized PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPdf(null);
    setPages([]);
    setResultUrl(null);
  };

  if (!file || !pdf) {
    return (
      <div className="flex-1 flex flex-col p-8 md:p-12 bg-background overflow-y-auto">
        <div className="mb-8 flex items-center gap-4 max-w-[1200px] mx-auto w-full">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
            <FileText size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">Organize PDF</h2>
            <p className="text-[15px] font-light text-muted-foreground">Reorder, rotate, and remove pages from your PDF.</p>
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-[1200px] mx-auto w-full">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" strokeWidth={1.5} />
            <p className="text-[14px] font-light text-muted-foreground">Loading PDF document...</p>
          </div>
        ) : (
          <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
            <FileUploadZone 
              accept="application/pdf,.pdf"
              maxSizeMB={50}
              multiple={false}
              onFilesSelected={handleFilesSelected}
              title="Drop PDF here"
              subtitle="PDF • Max 50 MB"
            />
          </div>
        )}
      </div>
    );
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-card">
      <div className="p-8 flex-1 flex flex-col">
        <h3 className="font-display font-medium text-[16px] mb-8 text-foreground tracking-tight">
          Document Status
        </h3>
        
        <div className="bg-secondary rounded-[10px] p-5 border border-border space-y-4 mb-6">
          <div className="flex justify-between items-center text-[14px]">
            <span className="font-light text-muted-foreground">Original</span>
            <span className="font-medium text-foreground">{pdf.numPages} pages</span>
          </div>
          <div className="flex justify-between items-center text-[14px]">
            <span className="font-light text-muted-foreground">New Order</span>
            <span className="font-medium text-foreground">{pages.length} pages</span>
          </div>
          {pdf.numPages - pages.length > 0 && (
            <div className="flex justify-between items-center text-[14px] text-destructive pt-2 border-t border-border">
              <span className="font-medium">Removed</span>
              <span className="font-bold">{pdf.numPages - pages.length} pages</span>
            </div>
          )}
        </div>

        {resultUrl && (
          <div className="mt-4 p-6 bg-secondary border border-foreground rounded-[10px] text-center">
            <h4 className="font-display font-medium text-[16px] text-foreground tracking-tight mb-4">Saved Successfully</h4>
            <a 
              href={resultUrl}
              download={file.name.replace('.pdf', '-organized.pdf')}
              className="w-full py-3.5 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center bg-primary hover:bg-primary-hover text-primary-foreground transition-colors"
            >
              <Download size={18} strokeWidth={2} className="mr-2" />
              Download
            </a>
          </div>
        )}
      </div>

      <div className="p-8 bg-secondary/30 border-t border-border space-y-3">
        <button 
          onClick={handleSave}
          disabled={processing || !!resultUrl}
          className="w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground transition-colors"
        >
          {processing ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={2} /> Saving...</>
          ) : (
            'Save Organized PDF'
          )}
        </button>
        <button 
          onClick={handleReset}
          className="w-full py-3.5 px-4 rounded-[8px] font-display font-medium text-[14px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          Close Document
        </button>
      </div>
    </div>
  );

  return (
    <>
      <PdfWorkspace
        title="Organize PDF"
        description={file.name}
        sidebar={sidebar}
      >
        <div className="flex-1 h-full overflow-y-auto pr-2 pb-20 pt-4 max-w-5xl mx-auto w-full">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={pages.map(p => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                {pages.map((page) => (
                  <SortablePageItem 
                    key={page.id} 
                    page={page} 
                    pdf={pdf} 
                    onDelete={handleDelete}
                    onRotate={handleRotate}
                    onPreview={setPreviewPage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </PdfWorkspace>

      {/* Preview Modal */}
      {previewPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/10 backdrop-blur-sm p-4 md:p-12">
          <div className="bg-background rounded-[12px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-5xl h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border bg-card">
              <h3 className="font-display font-medium text-[18px] text-foreground">Page {previewPage.originalIndex + 1} Preview</h3>
              <button 
                onClick={() => setPreviewPage(null)}
                className="p-2 hover:bg-secondary rounded-[6px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-8 bg-secondary flex items-center justify-center">
              <PdfPreview 
                pdf={pdf} 
                pageNumber={previewPage.originalIndex + 1} 
                rotation={previewPage.rotation}
                className="shadow-[0_8px_30px_rgba(0,0,0,0.06)] max-h-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
