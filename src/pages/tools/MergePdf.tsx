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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Layers, Loader2, Download, Trash2, GripVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploadZone from '@/components/shared/FileUploadZone';
import PdfWorkspace from '@/components/pdf/PdfWorkspace';
import { mergePdfs } from '@/lib/pdf/pdf-organizer';

// ----------------------------------------------------------------------
// Sortable File Item Component
// ----------------------------------------------------------------------
function SortableFileItem({ 
  file, 
  index,
  onDelete
}: { 
  file: File, 
  index: number,
  onDelete: (name: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: file.name });

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
        "bg-card border p-4 rounded-[8px] flex items-center justify-between mb-3 group transition-colors",
        isDragging ? "opacity-90 border-foreground shadow-[0_8px_30px_rgba(0,0,0,0.12)] scale-[1.02]" : "border-border hover:border-foreground"
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div 
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1"
          {...attributes} 
          {...listeners}
        >
          <GripVertical size={20} strokeWidth={1.5} />
        </div>
        
        <div className="bg-secondary text-foreground font-display font-bold rounded-[6px] w-10 h-10 flex items-center justify-center shrink-0">
          {index + 1}
        </div>
        
        <div className="min-w-0 pr-4">
          <p className="font-display font-medium text-[15px] text-foreground truncate tracking-tight" title={file.name}>
            {file.name}
          </p>
          <p className="text-[13px] font-light text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
      
      <button 
        onClick={() => onDelete(file.name)}
        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-colors shrink-0"
        title="Remove File"
      >
        <Trash2 size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// Main MergePdf Component
// ----------------------------------------------------------------------
export default function MergePdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState(0);

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

  const handleFilesSelected = (newFiles: File[]) => {
    // Prevent duplicate files by name for simplicity
    const existingNames = new Set(files.map(f => f.name));
    const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
    
    if (files.length + uniqueNewFiles.length > 20) {
      alert("You can merge up to 20 files at once.");
      return;
    }
    
    setFiles(prev => [...prev, ...uniqueNewFiles]);
    setResultUrl(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(item => item.name === active.id);
        const newIndex = items.findIndex(item => item.name === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDelete = (name: string) => {
    setFiles(files.filter(f => f.name !== name));
    if (files.length === 1) setResultUrl(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      alert("Please add at least 2 files to merge.");
      return;
    }
    
    setProcessing(true);
    try {
      const blob = await mergePdfs(files);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);
    } catch (err) {
      console.error(err);
      alert("Failed to merge PDFs. One of the files might be corrupted or encrypted.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResultUrl(null);
    setResultSize(0);
  };

  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-8 md:p-12 bg-background overflow-y-auto">
        <div className="mb-8 flex items-center gap-4 max-w-[1200px] mx-auto w-full">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
            <Layers size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">Merge PDF</h2>
            <p className="text-[15px] font-light text-muted-foreground">Combine multiple PDFs into one document in the order you prefer.</p>
          </div>
        </div>
        
        <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
          <FileUploadZone 
            accept="application/pdf,.pdf"
            maxSizeMB={50}
            multiple={true}
            onFilesSelected={handleFilesSelected}
            title="Drop PDFs here"
            subtitle="Select up to 20 files"
          />
        </div>
      </div>
    );
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-card">
      <div className="p-8 flex-1 flex flex-col">
        <h3 className="font-display font-medium text-[16px] mb-8 text-foreground tracking-tight">
          Merge Status
        </h3>
        
        <div className="bg-secondary rounded-[10px] p-5 border border-border space-y-4 mb-6">
          <div className="flex justify-between items-center text-[14px]">
            <span className="font-light text-muted-foreground">Total Files</span>
            <span className="font-medium text-foreground">{files.length}</span>
          </div>
          <div className="flex justify-between items-center text-[14px]">
            <span className="font-light text-muted-foreground">Total Size</span>
            <span className="font-medium text-foreground">
              {(files.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>

        {resultUrl && (
          <div className="mt-4 p-6 bg-secondary border border-foreground rounded-[10px] text-center">
            <h4 className="font-display font-medium text-[16px] text-foreground tracking-tight mb-2">Merge Complete</h4>
            <p className="text-[13px] font-light text-muted-foreground mb-5">
              Result size: {(resultSize / 1024 / 1024).toFixed(2)} MB
            </p>
            <a 
              href={resultUrl}
              download="merged-document.pdf"
              className="w-full py-3.5 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center bg-primary hover:bg-primary-hover text-primary-foreground transition-colors mb-3"
            >
              <Download size={18} strokeWidth={2} className="mr-2" />
              Download
            </a>
            <button 
              onClick={handleReset}
              className="w-full py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Merge More Files
            </button>
          </div>
        )}
      </div>

      <div className="p-8 bg-secondary/30 border-t border-border space-y-3">
        <button 
          onClick={handleMerge}
          disabled={processing || !!resultUrl || files.length < 2}
          className="w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground transition-colors"
        >
          {processing ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={2} /> Merging...</>
          ) : (
            'Merge PDFs'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <PdfWorkspace
      title="Merge PDF"
      description="Drag to reorder. The top file will appear first in the merged document."
      sidebar={sidebar}
    >
      <div className="flex-1 overflow-y-auto pr-2 pb-20 max-w-3xl mx-auto w-full pt-4">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={files.map(f => f.name)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col">
              {files.map((file, index) => (
                <SortableFileItem 
                  key={file.name} 
                  file={file} 
                  index={index}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-4 border border-dashed border-border rounded-[8px] bg-secondary/50 relative overflow-hidden transition-colors hover:border-foreground">
          <input 
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => {
              if (e.target.files) handleFilesSelected(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
          <div className="py-6 flex items-center justify-center text-[14px] font-display font-medium text-muted-foreground group-hover:text-foreground">
            <Plus size={18} strokeWidth={2} className="mr-2" />
            Add More Files
          </div>
        </div>
      </div>
    </PdfWorkspace>
  );
}
