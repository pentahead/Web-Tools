import React, { useState } from 'react';
import { Settings, FileText, Download, Loader2, X, GripVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploadZone from '@/components/shared/FileUploadZone';
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
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(
      "flex items-center gap-4 bg-card border p-3 rounded-[8px] transition-colors",
      isDragging ? "border-foreground shadow-[0_8px_30px_rgba(0,0,0,0.12)] scale-[1.02]" : "border-border hover:border-muted-foreground"
    )}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical size={20} strokeWidth={1.5} />
      </div>
      <div className="w-12 h-12 rounded-[4px] bg-secondary overflow-hidden flex-shrink-0 border border-border">
        <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-medium text-[15px] text-foreground truncate tracking-tight">{item.file.name}</p>
        <p className="text-[13px] font-light text-muted-foreground">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>
      <button 
        onClick={() => onRemove(item.id)}
        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-colors"
      >
        <X size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default function ImageToPdf() {
  const [items, setItems] = useState<ImageItem[]>([]);
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

  const handleRemove = (id: string) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      const removed = prev.find(item => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return filtered;
    });
    setPdfUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.target.value = '';
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
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Main Content Area */}
      <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto">
        <div className="mb-8 flex items-center gap-4 max-w-[1200px] mx-auto w-full">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
            <FileText size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">Image to PDF</h2>
            <p className="text-[15px] font-light text-muted-foreground">Convert your images into a PDF document.</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
            <FileUploadZone 
              accept="image/png, image/jpeg, image/jpg, image/webp"
              maxSizeMB={10}
              multiple={true}
              onFilesSelected={processFiles}
              title="Drop images here"
              subtitle="Supports PNG, JPG, JPEG up to 10MB"
            />
          </div>
        ) : (
          <div className="flex flex-col flex-1 max-w-[1200px] mx-auto w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-medium text-[16px] text-foreground">
                Images ({items.length}/20)
              </h3>
              <label className="text-foreground border border-border hover:border-foreground text-[13px] font-display font-medium cursor-pointer flex items-center gap-2 bg-card hover:bg-secondary px-4 py-2 rounded-[6px] transition-colors">
                <Plus size={16} strokeWidth={2} />
                Add More
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map(item => (
                      <SortableImageItem key={item.id} item={item} onRemove={handleRemove} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {isProcessing && (
              <div className="bg-card p-10 rounded-[12px] border border-border flex flex-col items-center mb-6">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" strokeWidth={1.5} />
                <p className="font-display font-medium text-[16px] text-foreground mb-4">Creating PDF...</p>
                <div className="w-full max-w-md bg-secondary rounded-full h-2 mt-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {pdfUrl && !isProcessing && (
              <div className="bg-secondary p-10 rounded-[12px] border border-foreground flex flex-col items-center mb-6">
                <p className="font-display font-medium text-[20px] text-foreground mb-6">PDF is ready!</p>
                <a 
                  href={pdfUrl}
                  download="images.pdf"
                  className="w-full max-w-sm py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center bg-primary hover:bg-primary-hover text-primary-foreground transition-colors"
                >
                  <Download className="w-5 h-5 mr-2" strokeWidth={2} />
                  Download PDF
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Sidebar */}
      {items.length > 0 && (
        <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-y-auto shrink-0 z-20">
          <div className="p-8 flex-1">
            <h3 className="font-display font-medium text-[16px] mb-8 flex items-center gap-2 text-foreground tracking-tight">
              <Settings size={18} className="text-muted-foreground" strokeWidth={1.5} />
              PDF Settings
            </h3>

            <div className="space-y-6">
              {/* Page Size */}
              <div className="space-y-2">
                <label className="text-[13px] font-display font-medium text-muted-foreground uppercase tracking-widest">Page Size</label>
                <select 
                  value={pageSize}
                  onChange={(e) => { setPageSize(e.target.value as PageSize); setPdfUrl(null); }}
                  className="w-full p-3.5 bg-background border border-border rounded-[8px] text-[15px] font-medium text-foreground outline-none focus:border-foreground transition-colors"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                  <option value="Original Image">Original Image</option>
                </select>
              </div>

              {/* Orientation */}
              <div className="space-y-2">
                <label className="text-[13px] font-display font-medium text-muted-foreground uppercase tracking-widest">Orientation</label>
                <select 
                  value={orientation}
                  onChange={(e) => { setOrientation(e.target.value as Orientation); setPdfUrl(null); }}
                  className="w-full p-3.5 bg-background border border-border rounded-[8px] text-[15px] font-medium text-foreground outline-none focus:border-foreground transition-colors"
                >
                  <option value="Auto">Auto</option>
                  <option value="Portrait">Portrait</option>
                  <option value="Landscape">Landscape</option>
                </select>
              </div>

              {/* Margin */}
              <div className="space-y-2">
                <label className="text-[13px] font-display font-medium text-muted-foreground uppercase tracking-widest">Margin</label>
                <select 
                  value={margin}
                  onChange={(e) => { setMargin(e.target.value as Margin); setPdfUrl(null); }}
                  className="w-full p-3.5 bg-background border border-border rounded-[8px] text-[15px] font-medium text-foreground outline-none focus:border-foreground transition-colors"
                >
                  <option value="None">None</option>
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                </select>
              </div>

              {/* Image Fit */}
              <div className="space-y-2">
                <label className="text-[13px] font-display font-medium text-muted-foreground uppercase tracking-widest">Image Fit</label>
                <select 
                  value={imageFit}
                  onChange={(e) => { setImageFit(e.target.value as ImageFit); setPdfUrl(null); }}
                  className="w-full p-3.5 bg-background border border-border rounded-[8px] text-[15px] font-medium text-foreground outline-none focus:border-foreground transition-colors"
                >
                  <option value="Fit">Fit (contain)</option>
                  <option value="Fill">Fill (cover)</option>
                  <option value="Original Size">Original Size</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-auto p-8 bg-secondary/30 border-t border-border">
            <button 
              onClick={handleGeneratePdf}
              disabled={isProcessing}
              className={cn(
                "w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center transition-colors",
                isProcessing 
                  ? "bg-secondary text-muted-foreground border border-border cursor-not-allowed" 
                  : "bg-primary hover:bg-primary-hover text-primary-foreground"
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
