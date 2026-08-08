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
        "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col group",
        isDragging ? "opacity-50 ring-2 ring-blue-500 scale-105" : ""
      )}
    >
      <div 
        className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-grab active:cursor-grabbing"
        {...attributes} 
        {...listeners}
      >
        <div className="flex items-center gap-2 text-slate-500">
          <GripVertical size={16} />
          <span className="text-sm font-medium">Page {page.originalIndex + 1}</span>
        </div>
      </div>
      
      <div 
        className="relative flex-1 p-4 bg-[#e5e7eb] dark:bg-[#0f172a] cursor-pointer"
        onClick={() => onPreview(page)}
      >
        <PdfThumbnail 
          pdf={pdf} 
          pageNumber={page.originalIndex + 1} 
          rotation={page.rotation} 
          className="w-full h-auto mx-auto pointer-events-none" 
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white text-slate-700 p-2 rounded-full shadow-lg">
            <ZoomIn size={20} />
          </div>
        </div>
      </div>
      
      <div className="p-2 bg-white dark:bg-slate-800 flex items-center justify-center gap-2">
        <button 
          onClick={() => onRotate(page.id)}
          className="flex-1 py-1.5 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          title="Rotate 90°"
        >
          <RotateCw size={18} />
        </button>
        <button 
          onClick={() => onDelete(page.id)}
          className="flex-1 py-1.5 flex items-center justify-center text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-300 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Delete Page"
        >
          <Trash2 size={18} />
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
      <div className="flex-1 flex flex-col p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Organize PDF</h2>
            <p className="text-sm text-slate-500">Reorder, rotate, and remove pages from your PDF.</p>
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-500">Loading PDF document...</p>
          </div>
        ) : (
          <FileUploadZone 
            accept="application/pdf,.pdf"
            maxSizeMB={50}
            multiple={false}
            onFilesSelected={handleFilesSelected}
            title="Drop PDF here"
            subtitle="PDF • Max 50 MB"
          />
        )}
      </div>
    );
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg mb-6 text-slate-800 dark:text-slate-200">
          Document Status
        </h3>
        
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Original</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{pdf.numPages} pages</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">New Order</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{pages.length} pages</span>
          </div>
          {pdf.numPages - pages.length > 0 && (
            <div className="flex justify-between items-center text-sm text-amber-600 dark:text-amber-400">
              <span>Removed</span>
              <span className="font-medium">{pdf.numPages - pages.length} pages</span>
            </div>
          )}
        </div>

        {resultUrl && (
          <div className="mt-4 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl text-center">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-4">Saved Successfully</h4>
            <a 
              href={resultUrl}
              download={file.name.replace('.pdf', '-organized.pdf')}
              className="w-full py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center bg-green-600 hover:bg-green-700 text-white shadow-md transition-all"
            >
              <Download size={18} className="mr-2" />
              Download
            </a>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <button 
          onClick={handleSave}
          disabled={processing || !!resultUrl}
          className="w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white shadow-md transition-all"
        >
          {processing ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</>
          ) : (
            'Save Organized PDF'
          )}
        </button>
        <button 
          onClick={handleReset}
          className="w-full py-3.5 px-4 rounded-xl font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
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
        <div className="flex-1 h-full overflow-y-auto pr-2 pb-20">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={pages.map(p => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-12">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-lg">Page {previewPage.originalIndex + 1} Preview</h3>
              <button 
                onClick={() => setPreviewPage(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-6 bg-slate-50 dark:bg-slate-950">
              <PdfPreview 
                pdf={pdf} 
                pageNumber={previewPage.originalIndex + 1} 
                rotation={previewPage.rotation}
                className="shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
