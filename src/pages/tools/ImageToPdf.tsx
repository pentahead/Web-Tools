import React, { useState } from 'react';
import { UploadCloud, Settings, FileText, Download, Loader2, X, GripVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePdf, type PageSize, type Orientation, type Margin, type ImageFit, type PdfSettings } from '@/lib/image-to-pdf/pdf-generator';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

// Sortable Item Component
function SortableImageItem({ item, onRemove }: { item: ImageItem; onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1">
        <GripVertical size={20} />
      </div>
      <div className="w-12 h-12 rounded bg-slate-100 overflow-hidden flex-shrink-0">
        <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{item.file.name}</p>
        <p className="text-xs text-slate-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>
      <button 
        onClick={() => onRemove(item.id)}
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default function ImageToPdf() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Settings
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('Auto');
  const [margin, setMargin] = useState<Margin>('Small');
  const [imageFit, setImageFit] = useState<ImageFit>('Fit');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const processFiles = (files: FileList | File[]) => {
    const newItems: ImageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }
      
      if (items.length + newItems.length >= 20) {
        alert("Maximum 20 files allowed.");
        break;
      }

      newItems.push({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file)
      });
    }

    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems]);
      setPdfUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleRemove = (id: string) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      const removed = prev.find(item => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return filtered;
    });
    setPdfUrl(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setPdfUrl(null);
    }
  };

  const handleGeneratePdf = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      const urls = items.map(item => item.previewUrl);
      const settings: PdfSettings = { pageSize, orientation, margin, imageFit };
      
      const blob = await generatePdf(urls, settings, (p) => setProgress(p));
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err: any) {
      alert("Failed to create PDF: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Main Content Area */}
      <div className="flex-1 p-6 flex flex-col overflow-y-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Image to PDF</h2>
            <p className="text-sm text-slate-500">Convert your images into a PDF document.</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div 
            className={cn(
              "flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all duration-300 transform bg-white dark:bg-slate-900",
              isDragging 
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99] shadow-inner" 
                : "border-slate-300 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4 transition-transform group-hover:scale-105">
              <UploadCloud size={32} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-200">Drop images here</h2>
            <p className="text-slate-500 mb-6">Supports PNG, JPG, JPEG up to 10MB</p>
            
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors shadow-sm hover:shadow-md inline-block">
              Choose Images
              <input 
                type="file" 
                className="hidden" 
                accept="image/png, image/jpeg, image/jpg, image/webp" 
                multiple
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                Images ({items.length}/20)
              </h3>
              <label className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium cursor-pointer flex items-center gap-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-md transition-colors">
                <Plus size={16} />
                Add More Images
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/jpg, image/webp" 
                  multiple
                  onChange={handleFileChange}
                />
              </label>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-6 pr-2">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={items.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {items.map(item => (
                      <SortableImageItem key={item.id} item={item} onRemove={handleRemove} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {isProcessing && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p className="font-medium text-slate-700 dark:text-slate-300">Creating PDF...</p>
                <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mt-4 overflow-hidden">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {pdfUrl && !isProcessing && (
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800/30 shadow-sm flex flex-col items-center mb-6">
                <p className="font-medium text-green-800 dark:text-green-300 mb-4">PDF is ready!</p>
                <a 
                  href={pdfUrl}
                  download="images.pdf"
                  className="w-full max-w-md py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Sidebar */}
      {items.length > 0 && (
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
          <div className="p-6 flex-1">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Settings size={18} className="text-slate-500" />
              PDF Settings
            </h3>

            <div className="space-y-6">
              {/* Page Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Page Size</label>
                <select 
                  value={pageSize}
                  onChange={(e) => { setPageSize(e.target.value as PageSize); setPdfUrl(null); }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                  <option value="Original Image">Original Image</option>
                </select>
              </div>

              {/* Orientation */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Orientation</label>
                <select 
                  value={orientation}
                  onChange={(e) => { setOrientation(e.target.value as Orientation); setPdfUrl(null); }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Auto">Auto</option>
                  <option value="Portrait">Portrait</option>
                  <option value="Landscape">Landscape</option>
                </select>
              </div>

              {/* Margin */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Margin</label>
                <select 
                  value={margin}
                  onChange={(e) => { setMargin(e.target.value as Margin); setPdfUrl(null); }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="None">None</option>
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                </select>
              </div>

              {/* Image Fit */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Image Fit</label>
                <select 
                  value={imageFit}
                  onChange={(e) => { setImageFit(e.target.value as ImageFit); setPdfUrl(null); }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Fit">Fit (contain)</option>
                  <option value="Fill">Fill (cover)</option>
                  <option value="Original Size">Original Size</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-auto p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={handleGeneratePdf}
              disabled={isProcessing}
              className={cn(
                "w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center transition-all duration-200",
                isProcessing 
                  ? "bg-blue-400 cursor-not-allowed text-white shadow-inner" 
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-md hover:shadow-lg"
              )}
            >
              {isProcessing ? 'Generating...' : 'Create PDF'}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
