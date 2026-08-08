import { useState, useEffect, useRef } from 'react';
import { UploadCloud, Settings, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageDataFromUrl, preprocessImageData } from '@/lib/imageUtils';
import type { WorkerResponse, WorkerRequest } from '@/workers/vectorizer.worker';

export default function ImageToSvg() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Settings
  const [mode, setMode] = useState<'color' | 'grayscale' | 'bw'>('color');
  const [detail, setDetail] = useState<'low' | 'medium' | 'high'>('medium');
  const [colors, setColors] = useState(16);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/vectorizer.worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { type, svg, error } = e.data;
      if (type === 'success' && svg) {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        setSvgUrl(URL.createObjectURL(blob));
        setIsProcessing(false);
      } else if (type === 'error') {
        alert("Conversion error: " + error);
        setIsProcessing(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(selectedFile.type)) {
      alert("Unsupported file format. Please upload a PNG or JPG.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      alert("File is too large. Maximum size is 10MB.");
      return;
    }

    setFile(selectedFile);
    setSvgUrl(null);
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(newPreviewUrl);
  };

  const handleConvert = async () => {
    if (!file || !previewUrl || !workerRef.current) return;
    setIsProcessing(true);
    
    try {
      const imageData = await getImageDataFromUrl(previewUrl);
      const processedData = preprocessImageData(imageData, mode);
      
      workerRef.current.postMessage({
        type: 'convert',
        imageData: processedData,
        settings: { mode, detail, colors }
      } as WorkerRequest);
    } catch (err: any) {
      alert("Failed to process image: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <>
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
        <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto">
          {!file ? (
            <div className="w-full max-w-[1200px] mx-auto h-full flex flex-col">
              <div className="mb-8 flex items-center gap-4">
                <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
                  <UploadCloud size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">Image to SVG</h2>
                  <p className="text-[15px] font-light text-muted-foreground">Convert raster images to vector paths.</p>
                </div>
              </div>
              
              <div 
                className={cn(
                  "flex-1 border border-dashed rounded-[12px] flex flex-col items-center justify-center p-8 transition-all duration-150 transform",
                  isDragging 
                    ? "border-primary bg-primary/5 scale-[0.99] shadow-inner" 
                    : "border-border hover:border-foreground bg-card"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="bg-secondary p-4 rounded-full mb-4">
                  <UploadCloud size={32} strokeWidth={1.5} className="text-foreground" />
                </div>
                <h2 className="text-xl font-display font-medium mb-2 text-foreground">Drag & drop an image</h2>
                <p className="text-[14px] font-light text-muted-foreground mb-6">Supports PNG, JPG up to 10MB</p>
                
                <label className="bg-primary text-primary-foreground hover:bg-primary-hover px-6 py-3 rounded-[8px] font-display font-semibold cursor-pointer transition-colors inline-block text-[14px]">
                  Browse Files
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/jpg" 
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 max-w-[1400px] mx-auto w-full">
              <div className="flex-1 flex flex-col bg-card rounded-[10px] border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-secondary font-display font-medium text-[14px] flex justify-between items-center text-foreground">
                  <span>Original Image</span>
                  <button 
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setSvgUrl(null);
                    }}
                    className="text-muted-foreground hover:text-foreground text-[12px] uppercase tracking-widest px-2 py-1 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex-1 bg-secondary/30 p-6 flex items-center justify-center relative min-h-[300px]">
                  <div className="absolute inset-0 opacity-[0.03]" 
                       style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="Original" 
                      className="max-w-full max-h-full object-contain relative z-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-border rounded-[4px]"
                    />
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-card rounded-[10px] border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-secondary font-display font-medium text-[14px] flex justify-between items-center text-foreground">
                  <span>Vector Result</span>
                  {svgUrl && (
                    <span className="text-primary text-[10px] font-bold tracking-widest uppercase border border-border px-2 py-1 rounded bg-background">
                      Ready
                    </span>
                  )}
                </div>
                <div className="flex-1 bg-secondary/30 p-6 flex items-center justify-center relative min-h-[300px] overflow-hidden group">
                  <div className="absolute inset-0 opacity-[0.03]" 
                       style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center text-foreground relative z-10 bg-card border border-border p-8 rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                      <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" strokeWidth={1.5} />
                      <p className="font-display font-medium text-[15px]">Vectorizing image...</p>
                    </div>
                  ) : svgUrl ? (
                    <div className="relative z-10 w-full h-full flex items-center justify-center cursor-crosshair">
                      <img 
                        src={svgUrl} 
                        alt="Vectorized SVG" 
                        className="max-w-full max-h-full object-contain shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[4px] transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="text-muted-foreground relative z-10 text-center px-4 bg-card p-8 rounded-[12px] border border-border shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                      <Settings className="w-8 h-8 mx-auto mb-4 text-border" strokeWidth={1.5} />
                      <p className="text-[14px] font-light">Adjust settings and click Convert</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {file && (
          <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-y-auto shrink-0 z-20">
            <div className="p-8">
              <h3 className="font-display font-medium text-[16px] mb-8 flex items-center gap-2 text-foreground tracking-tight">
                <Settings size={18} className="text-muted-foreground" strokeWidth={1.5} />
                Settings
              </h3>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[14px] font-display font-medium text-foreground">Color Mode</label>
                  <div className="flex flex-col gap-3">
                    {(['color', 'grayscale', 'bw'] as const).map(m => (
                      <label key={m} className={cn(
                        "flex items-center gap-3 p-4 rounded-[8px] border cursor-pointer transition-all duration-150",
                        mode === m 
                          ? "border-foreground bg-secondary text-foreground" 
                          : "border-border hover:border-muted-foreground text-muted-foreground"
                      )}>
                        <input 
                          type="radio" 
                          name="mode" 
                          value={m} 
                          checked={mode === m} 
                          onChange={() => setMode(m)}
                          className="text-foreground focus:ring-0 accent-foreground w-4 h-4"
                        />
                        <span className="capitalize font-display font-medium text-[14px]">{m === 'bw' ? 'Black & White' : m}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border">
                  <div className="flex justify-between items-center">
                    <label className="text-[14px] font-display font-medium text-foreground">Level of Detail</label>
                    <span className="text-[10px] font-display font-bold uppercase tracking-widest text-background bg-foreground px-2 py-1 rounded-[4px]">{detail}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="2" step="1" 
                    value={detail === 'low' ? 0 : detail === 'medium' ? 1 : 2}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDetail(val === 0 ? 'low' : val === 1 ? 'medium' : 'high');
                    }}
                    className="w-full accent-foreground cursor-ew-resize"
                  />
                  <div className="flex justify-between text-[11px] font-display font-medium uppercase tracking-widest text-muted-foreground">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                {mode === 'color' && (
                  <div className="space-y-4 pt-6 border-t border-border">
                    <div className="flex justify-between items-center">
                      <label className="text-[14px] font-display font-medium text-foreground">Colors</label>
                      <span className="text-[12px] font-display font-bold bg-secondary px-2 py-1 rounded-[4px] text-foreground border border-border">
                        {colors}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="2" max="32" step="1" 
                      value={colors}
                      onChange={(e) => setColors(parseInt(e.target.value))}
                      className="w-full accent-foreground cursor-ew-resize"
                    />
                    <div className="flex justify-between text-[11px] font-display font-medium uppercase tracking-widest text-muted-foreground">
                      <span>2</span>
                      <span>32</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto p-8 bg-secondary/30 border-t border-border space-y-3">
              <button 
                onClick={handleConvert}
                disabled={isProcessing}
                className={cn(
                  "w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center transition-colors",
                  isProcessing 
                    ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border" 
                    : "bg-primary hover:bg-primary-hover text-primary-foreground"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={2} />
                    Processing...
                  </>
                ) : (
                  'Convert to SVG'
                )}
              </button>

              {svgUrl && (
                <a 
                  href={svgUrl}
                  download={file.name.replace(/\.[^/.]+$/, "") + ".svg"}
                  className="w-full py-3.5 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center bg-card border border-primary text-primary hover:bg-primary/5 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" strokeWidth={2.5} />
                  Download SVG
                </a>
              )}
            </div>
          </aside>
        )}
      </main>
    </>
  );
}
