import { useState, useEffect, useRef } from 'react';
import { UploadCloud, Settings, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageResizeControls from '@/components/shared/ImageResizeControls';
import type { ResizeOptions, ImageMetadata } from '@/lib/imageUtils';
import { 
  loadImage, 
  getImageMetadata, 
  calculateTargetDimensions, 
  resizeImageToCanvas, 
  getImageDataFromCanvas, 
  preprocessImageData, 
  formatFileSize, 
  compareFileSizes 
} from '@/lib/imageUtils';
import type { WorkerResponse, WorkerRequest } from '@/workers/vectorizer.worker';

export default function ImageToSvg() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  
  const [svgBlob, setSvgBlob] = useState<Blob | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Vectorizer Settings
  const [mode, setMode] = useState<'color' | 'grayscale' | 'bw'>('color');
  const [detail, setDetail] = useState<'low' | 'medium' | 'high'>('medium');
  const [colors, setColors] = useState(16);

  // Resize Settings
  const [resizeOptions, setResizeOptions] = useState<ResizeOptions>({
    preset: 'original',
    maintainAspectRatio: true,
  });

  // Track vectorization input dimensions that were actually processed
  const [vectorInputDims, setVectorInputDims] = useState<{ width: number; height: number } | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/vectorizer.worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { type, svg, error } = e.data;
      if (type === 'success' && svg) {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        setSvgBlob(blob);
        if (svgUrl) URL.revokeObjectURL(svgUrl);
        setSvgUrl(URL.createObjectURL(blob));
        setIsProcessing(false);
      } else if (type === 'error') {
        setErrorMsg("Conversion error: " + (error || "Vectorization failed."));
        setIsProcessing(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (svgUrl) URL.revokeObjectURL(svgUrl);
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

  const handleFileSelection = async (selectedFile: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type.toLowerCase()) && !selectedFile.name.match(/\.(png|jpe?g)$/i)) {
      setErrorMsg("Unsupported file format. Please upload a PNG, JPG, or JPEG image.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setErrorMsg("File is too large. Maximum size is 10MB.");
      return;
    }

    try {
      const meta = await getImageMetadata(selectedFile);
      setFile(selectedFile);
      setMetadata(meta);
      setErrorMsg(null);

      if (svgUrl) URL.revokeObjectURL(svgUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      const newPreviewUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(newPreviewUrl);
      setSvgBlob(null);
      setSvgUrl(null);
      setVectorInputDims(null);

      setResizeOptions({
        preset: 'original',
        customWidth: meta.width,
        customHeight: meta.height,
        maintainAspectRatio: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load image.";
      setErrorMsg(msg);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (svgUrl) URL.revokeObjectURL(svgUrl);
    setFile(null);
    setPreviewUrl(null);
    setMetadata(null);
    setSvgBlob(null);
    setSvgUrl(null);
    setVectorInputDims(null);
    setErrorMsg(null);
  };

  const handleConvert = async () => {
    if (!file || !previewUrl || !metadata || !workerRef.current) return;
    setIsProcessing(true);
    setErrorMsg(null);
    
    try {
      const img = await loadImage(previewUrl);
      const targetDims = calculateTargetDimensions(metadata.width, metadata.height, resizeOptions);

      const canvas = resizeImageToCanvas(img, targetDims.width, targetDims.height);
      const resizedImageData = getImageDataFromCanvas(canvas);

      const processedData = preprocessImageData(resizedImageData, mode);

      setVectorInputDims({ width: targetDims.width, height: targetDims.height });
      
      workerRef.current.postMessage({
        type: 'convert',
        imageData: processedData,
        settings: { mode, detail, colors }
      } as WorkerRequest);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process image.";
      setErrorMsg("Failed to process image: " + msg);
      setIsProcessing(false);
    }
  };

  const sizeComparison = (metadata && svgBlob)
    ? compareFileSizes(metadata.size, svgBlob.size)
    : null;

  return (
    <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
      <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto">
        {errorMsg && (
          <div className="max-w-[1200px] mx-auto w-full mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-[14px]">
            {errorMsg}
          </div>
        )}

        {!file ? (
          <div className="w-full max-w-[1200px] mx-auto h-full flex flex-col">
            <div className="mb-8 flex items-center gap-4">
              <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
                <UploadCloud size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">Image to SVG</h2>
                <p className="text-[15px] font-light text-muted-foreground">Convert raster images (PNG, JPG, JPEG) to vector paths.</p>
              </div>
            </div>
            
            <div 
              className={cn(
                "flex-1 border border-dashed rounded-[12px] flex flex-col items-center justify-center p-8 transition-all duration-150 transform min-h-[350px]",
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
              <p className="text-[14px] font-light text-muted-foreground mb-6">Supports PNG, JPG, and JPEG up to 10MB</p>
              
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
            {/* Original Preview Card */}
            <div className="flex-1 flex flex-col bg-card rounded-[10px] border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-secondary font-display font-medium text-[14px] flex justify-between items-center text-foreground">
                <span>Original Image ({metadata?.width} × {metadata?.height})</span>
                <button 
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground text-[12px] uppercase tracking-widest px-2 py-1 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 bg-secondary/30 p-6 flex flex-col items-center justify-center relative min-h-[300px]">
                <div className="absolute inset-0 opacity-[0.03]" 
                     style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                {previewUrl && (
                  <img 
                    src={previewUrl} 
                    alt="Original" 
                    className="max-w-full max-h-[420px] object-contain relative z-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-border rounded-[4px]"
                  />
                )}
                {metadata && (
                  <p className="mt-3 text-[12px] font-display text-muted-foreground relative z-10">
                    {formatFileSize(metadata.size)} • {metadata.type.split('/')[1]?.toUpperCase() || 'IMAGE'}
                  </p>
                )}
              </div>
            </div>

            {/* Vector Result Card */}
            <div className="flex-1 flex flex-col bg-card rounded-[10px] border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-secondary font-display font-medium text-[14px] flex justify-between items-center text-foreground">
                <span>Vector Result {vectorInputDims ? `(${vectorInputDims.width} × ${vectorInputDims.height})` : ''}</span>
                {svgUrl && (
                  <span className="text-primary text-[10px] font-bold tracking-widest uppercase border border-border px-2 py-1 rounded bg-background">
                    Vectorized
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
                  <div className="relative z-10 w-full h-full flex flex-col items-center justify-center cursor-crosshair">
                    <img 
                      src={svgUrl} 
                      alt="Vectorized SVG" 
                      className="max-w-full max-h-[420px] object-contain shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[4px] transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div className="text-muted-foreground relative z-10 text-center px-4 bg-card p-8 rounded-[12px] border border-border shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <Settings className="w-8 h-8 mx-auto mb-4 text-border" strokeWidth={1.5} />
                    <p className="text-[14px] font-light">Adjust settings and click Convert to SVG</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {file && metadata && (
        <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-y-auto shrink-0 z-20">
          <div className="p-8 space-y-8">
            <h3 className="font-display font-medium text-[16px] flex items-center gap-2 text-foreground tracking-tight">
              <Settings size={18} className="text-muted-foreground" strokeWidth={1.5} />
              SVG Settings
            </h3>

            {/* Shared Resize Controls (Pre-vectorization Resize) */}
            <ImageResizeControls
              originalWidth={metadata.width}
              originalHeight={metadata.height}
              value={resizeOptions}
              onChange={setResizeOptions}
            />

            {/* Color Mode */}
            <div className="space-y-4 pt-6 border-t border-border">
              <label className="text-[14px] font-display font-medium text-foreground">Color Mode</label>
              <div className="flex flex-col gap-2.5">
                {(['color', 'grayscale', 'bw'] as const).map(m => (
                  <label key={m} className={cn(
                    "flex items-center gap-3 p-3.5 rounded-[8px] border cursor-pointer transition-all duration-150",
                    mode === m 
                      ? "border-foreground bg-secondary text-foreground font-medium" 
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
                    <span className="capitalize font-display text-[14px]">{m === 'bw' ? 'Black & White' : m}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Level of Detail */}
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

            {/* Number of Colors */}
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

            {/* Vectorization Dimensions & File Size Comparison Info */}
            {vectorInputDims && (
              <div className="pt-6 border-t border-border space-y-3">
                <h4 className="text-[12px] font-display font-bold text-muted-foreground uppercase tracking-widest">
                  Vector Pipeline Info
                </h4>
                <div className="bg-secondary p-4 rounded-[8px] border border-border space-y-1.5 font-display text-[12px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Original Size:</span>
                    <span className="text-foreground">{metadata.width} × {metadata.height} px</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Vector Input:</span>
                    <span className="text-foreground font-medium">{vectorInputDims.width} × {vectorInputDims.height} px</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>SVG Result:</span>
                    <span className="text-foreground font-medium">{vectorInputDims.width} × {vectorInputDims.height} px</span>
                  </div>

                  {sizeComparison && (
                    <div className="pt-2 mt-2 border-t border-border/60 space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Original File:</span>
                        <span className="text-foreground">{sizeComparison.formattedOriginal}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>SVG File:</span>
                        <span className="text-foreground font-medium">{sizeComparison.formattedOutput}</span>
                      </div>
                      <div className="pt-1">
                        {sizeComparison.isSmaller ? (
                          <p className="text-primary font-semibold text-[13px]">
                            {sizeComparison.percentage}% smaller
                          </p>
                        ) : (
                          <p className="text-muted-foreground font-light text-[11px] leading-snug">
                            The converted file is larger than the original. Try reducing the image size or detail.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
  );
}
