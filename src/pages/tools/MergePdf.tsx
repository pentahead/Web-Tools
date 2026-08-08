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
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm flex items-center justify-between mb-3 group",
        isDragging ? "opacity-50 ring-2 ring-blue-500 scale-[1.02]" : ""
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div 
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing p-1"
          {...attributes} 
          {...listeners}
        >
          <GripVertical size={20} />
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-lg w-10 h-10 flex items-center justify-center shrink-0">
          {index + 1}
        </div>
        
        <div className="min-w-0 pr-4">
          <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-sm text-slate-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
      
      <button 
        onClick={() => onDelete(file.name)}
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
        title="Remove File"
      >
        <Trash2 size={20} />
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
      <div className="flex-1 flex flex-col p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Merge PDF</h2>
            <p className="text-sm text-slate-500">Combine multiple PDFs into one document in the order you prefer.</p>
          </div>
        </div>
        
        <FileUploadZone 
          accept="application/pdf,.pdf"
          maxSizeMB={50}
          multiple={true}
          onFilesSelected={handleFilesSelected}
          title="Drop PDFs here"
          subtitle="Select up to 20 files"
        />
      </div>
    );
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg mb-6 text-slate-800 dark:text-slate-200">
          Merge Status
        </h3>
        
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Total Files</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{files.length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Total Size</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {(files.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>

        {resultUrl && (
          <div className="mt-4 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl text-center">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Merge Complete</h4>
            <p className="text-sm text-green-700/80 dark:text-green-400/80 mb-4">
              Result size: {(resultSize / 1024 / 1024).toFixed(2)} MB
            </p>
            <a 
              href={resultUrl}
              download="merged-document.pdf"
              className="w-full py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center bg-green-600 hover:bg-green-700 text-white shadow-md transition-all mb-3"
            >
              <Download size={18} className="mr-2" />
              Download
            </a>
            <button 
              onClick={handleReset}
              className="w-full py-2 text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 underline"
            >
              Merge More Files
            </button>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <button 
          onClick={handleMerge}
          disabled={processing || !!resultUrl || files.length < 2}
          className="w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white shadow-md transition-all"
        >
          {processing ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Merging...</>
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

        <div className="mt-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
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
          <div className="py-6 flex items-center justify-center text-slate-500 font-medium">
            <Plus size={20} className="mr-2" />
            Add More Files
          </div>
        </div>
      </div>
    </PdfWorkspace>
  );
}
