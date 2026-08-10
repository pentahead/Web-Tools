import { useState, useEffect } from 'react';
import { Settings, Download, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploadZone from '@/components/shared/FileUploadZone';
import ImageResizeControls from '@/components/shared/ImageResizeControls';
import type { ResizeOptions, ImageMetadata } from '@/lib/imageUtils';
import { 
  loadImage, 
  getImageMetadata, 
  calculateTargetDimensions, 
  resizeImageToCanvas, 
  canvasToBlob, 
  formatFileSize, 
  compareFileSizes 
} from '@/lib/imageUtils';

export default function ImageToWebp() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  
  const [webpBlob, setWebpBlob] = useState<Blob | null>(null);
  const [webpUrl, setWebpUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resize Settings
  const [resizeOptions, setResizeOptions] = useState<ResizeOptions>({
    preset: 'original',
    maintainAspectRatio: true,
  });

  // Quality Settings: Small Size (60), Balanced (80), High Quality (90)
  const [qualityPreset, setQualityPreset] = useState<'small' | 'balanced' | 'high' | 'custom'>('balanced');
  const [qualityValue, setQualityValue] = useState<number>(80);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (webpUrl) URL.revokeObjectURL(webpUrl);
    };
  }, [previewUrl, webpUrl]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type.toLowerCase()) && !selectedFile.name.match(/\.(png|jpe?g)$/i)) {
      setErrorMsg("Unsupported file format. Please upload a PNG, JPG, or JPEG image.");
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMsg("File is too large. Maximum supported size is 25MB.");
      return;
    }

    try {
      const meta = await getImageMetadata(selectedFile);
      setFile(selectedFile);
      setMetadata(meta);
      setErrorMsg(null);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (webpUrl) URL.revokeObjectURL(webpUrl);
      
      const newPreviewUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(newPreviewUrl);
      setWebpBlob(null);
      setWebpUrl(null);

      setResizeOptions({
        preset: 'original',
        customWidth: meta.width,
        customHeight: meta.height,
        maintainAspectRatio: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load image.";
      setErrorMsg(message);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (webpUrl) URL.revokeObjectURL(webpUrl);
    setFile(null);
    setPreviewUrl(null);
    setMetadata(null);
    setWebpBlob(null);
    setWebpUrl(null);
    setErrorMsg(null);
  };

  const handleQualityPresetChange = (preset: 'small' | 'balanced' | 'high') => {
    setQualityPreset(preset);
    if (preset === 'small') setQualityValue(60);
    else if (preset === 'balanced') setQualityValue(80);
    else if (preset === 'high') setQualityValue(90);
  };

  const handleQualitySliderChange = (val: number) => {
    setQualityValue(val);
    if (val === 60) setQualityPreset('small');
    else if (val === 80) setQualityPreset('balanced');
    else if (val === 90) setQualityPreset('high');
    else setQualityPreset('custom');
  };

  const handleConvert = async () => {
    if (!file || !previewUrl || !metadata) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const img = await loadImage(previewUrl);
      const targetDims = calculateTargetDimensions(metadata.width, metadata.height, resizeOptions);
      const canvas = resizeImageToCanvas(img, targetDims.width, targetDims.height);
      const qualityFactor = Math.max(0.01, Math.min(1.0, qualityValue / 100));
      const blob = await canvasToBlob(canvas, 'image/webp', qualityFactor);

      if (webpUrl) URL.revokeObjectURL(webpUrl);
      const newWebpUrl = URL.createObjectURL(blob);

      setWebpBlob(blob);
      setWebpUrl(newWebpUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "WebP encoding failed.";
      setErrorMsg("Conversion failed: " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const outputDimensions = metadata 
    ? calculateTargetDimensions(metadata.width, metadata.height, resizeOptions)
    : { width: 0, height: 0 };

  const sizeComparison = (metadata && webpBlob) 
    ? compareFileSizes(metadata.size, webpBlob.size)
    : null;

  return (
    <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
      <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto">
        <div className="mb-8 flex items-center gap-4 max-w-[1200px] mx-auto w-full">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
            <Sparkles size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">Image to WebP</h2>
            <p className="text-[15px] font-light text-muted-foreground">Convert PNG, JPG, and JPEG images to WebP format with size and quality optimization.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="max-w-[1200px] mx-auto w-full mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-[14px]">
            {errorMsg}
          </div>
        )}

        {!file ? (
          <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
            <FileUploadZone
              accept="image/png, image/jpeg, image/jpg"
              maxSizeMB={25}
              multiple={false}
              onFilesSelected={handleFilesSelected}
              title="Drop an image to convert to WebP"
              subtitle="Supports PNG, JPG, and JPEG up to 25MB"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 max-w-[1400px] mx-auto w-full">
            {/* Original Preview */}
            <div className="flex-1 flex flex-col bg-card rounded-[10px] border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-secondary font-display font-medium text-[14px] flex justify-between items-center text-foreground">
                <span>Original Preview ({metadata?.width} × {metadata?.height})</span>
                <button
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground text-[12px] uppercase tracking-widest px-2 py-1 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 bg-secondary/30 p-6 flex flex-col items-center justify-center relative min-h-[300px]">
                <div 
                  className="absolute inset-0 opacity-[0.03]" 
                  style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} 
                />
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

            {/* WebP Result Preview */}
            <div className="flex-1 flex flex-col bg-card rounded-[10px] border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-secondary font-display font-medium text-[14px] flex justify-between items-center text-foreground">
                <span>WebP Result ({outputDimensions.width} × {outputDimensions.height})</span>
                {webpUrl && (
                  <span className="text-primary text-[10px] font-bold tracking-widest uppercase border border-border px-2 py-1 rounded bg-background">
                    Converted
                  </span>
                )}
              </div>
              <div 
                className="flex-1 rounded-[10px] p-6 flex items-center justify-center relative min-h-[300px] overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/ENF5gIuL+F3AwMDgPw0U4yFSAgAupA4FTb8eRwAAAABJRU5ErkJggg==')]"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center text-foreground relative z-10 bg-card border border-border p-8 rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" strokeWidth={1.5} />
                    <p className="font-display font-medium text-[15px]">Encoding WebP...</p>
                  </div>
                ) : webpUrl ? (
                  <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                    <img
                      src={webpUrl}
                      alt="Converted WebP"
                      className="max-w-full max-h-[420px] object-contain shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[4px]"
                    />
                  </div>
                ) : (
                  <div className="text-muted-foreground relative z-10 text-center px-4 bg-card p-8 rounded-[12px] border border-border shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <Settings className="w-8 h-8 mx-auto mb-4 text-border" strokeWidth={1.5} />
                    <p className="text-[14px] font-light">Configure settings and click Convert to WebP</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Controls */}
      {file && metadata && (
        <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-y-auto shrink-0 z-20">
          <div className="p-8 space-y-8">
            <h3 className="font-display font-medium text-[16px] flex items-center gap-2 text-foreground tracking-tight">
              <Settings size={18} className="text-muted-foreground" strokeWidth={1.5} />
              WebP Settings
            </h3>

            {/* Shared Resize Controls */}
            <ImageResizeControls
              originalWidth={metadata.width}
              originalHeight={metadata.height}
              value={resizeOptions}
              onChange={setResizeOptions}
            />

            {/* Quality Controls */}
            <div className="space-y-4 pt-6 border-t border-border">
              <div className="flex justify-between items-center">
                <label className="text-[14px] font-display font-medium text-foreground">Quality</label>
                <span className="text-[12px] font-display font-bold bg-secondary px-2 py-1 rounded-[4px] text-foreground border border-border">
                  {qualityValue}%
                </span>
              </div>

              {/* Quality Presets */}
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'balanced', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleQualityPresetChange(p)}
                    className={cn(
                      "py-2 text-[12px] font-display font-medium rounded-[6px] transition-all border text-center capitalize",
                      qualityPreset === p
                        ? "border-foreground bg-secondary text-foreground font-semibold"
                        : "border-border hover:border-muted-foreground text-muted-foreground"
                    )}
                  >
                    {p === 'small' ? 'Small Size' : p === 'balanced' ? 'Balanced' : 'High Quality'}
                  </button>
                ))}
              </div>

              {/* Slider 0 - 100 */}
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={qualityValue}
                onChange={(e) => handleQualitySliderChange(parseInt(e.target.value, 10))}
                className="w-full accent-foreground cursor-ew-resize"
              />
              <div className="flex justify-between text-[11px] font-display font-medium uppercase tracking-widest text-muted-foreground">
                <span>0 (Small Size)</span>
                <span>100 (High Quality)</span>
              </div>
            </div>

            {/* Size Comparison Card */}
            {sizeComparison && (
              <div className="pt-6 border-t border-border space-y-2">
                <h4 className="text-[12px] font-display font-bold text-muted-foreground uppercase tracking-widest">
                  File Size Comparison
                </h4>
                <div className="bg-secondary p-4 rounded-[8px] border border-border space-y-1.5 font-display text-[13px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Original:</span>
                    <span className="text-foreground">{sizeComparison.formattedOriginal}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>WebP:</span>
                    <span className="text-foreground font-medium">{sizeComparison.formattedOutput}</span>
                  </div>
                  <div className="pt-2 border-t border-border/60">
                    {sizeComparison.isSmaller ? (
                      <p className="text-primary font-semibold text-[13px]">
                        {sizeComparison.percentage}% smaller
                      </p>
                    ) : (
                      <p className="text-muted-foreground font-light text-[12px] leading-snug">
                        The converted file is larger than the original. Try reducing the image size or quality.
                      </p>
                    )}
                  </div>
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
                  Encoding...
                </>
              ) : (
                'Convert to WebP'
              )}
            </button>

            {webpUrl && file && (
              <a
                href={webpUrl}
                download={file.name.replace(/\.[^/.]+$/, "") + ".webp"}
                className="w-full py-3.5 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center bg-card border border-primary text-primary hover:bg-primary/5 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" strokeWidth={2.5} />
                Download WebP
              </a>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
