import { useState, useEffect, useRef } from 'react';
import { Palette, Download, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploadZone from '@/components/shared/FileUploadZone';
import { removeBackground } from '@imgly/background-removal';
import { loadImage, formatFileSize } from '@/lib/imageUtils';
import { compositeBackgroundColor } from '@/lib/background-removal/compositing';

type ToolState = 'idle' | 'segmenting' | 'ready' | 'error';
type ColorPreset = 'transparent' | 'white' | 'black' | 'light-gray' | 'custom';

const PRESET_COLORS: Record<Exclude<ColorPreset, 'transparent' | 'custom'>, string> = {
  white: '#FFFFFF',
  black: '#000000',
  'light-gray': '#F3F4F6',
};

export default function ChangeBackground() {
  const [state, setState] = useState<ToolState>('idle');
  const [file, setFile] = useState<File | null>(null);
  
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Cached Transparent Foreground Image Element (loaded after AI segmentation)
  const cachedForegroundImgRef = useRef<HTMLImageElement | null>(null);
  const origDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Color Selection State
  const [colorPreset, setColorPreset] = useState<ColorPreset>('white');
  const [customColor, setCustomColor] = useState<string>('#3B82F6');

  // AI Progress & Error state
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clean up Object URLs
  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [originalUrl, resultUrl]);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type.toLowerCase()) && !selectedFile.name.match(/\.(png|jpe?g)$/i)) {
      setErrorMsg("Unsupported file format. Please upload a PNG, JPG, or JPEG image.");
      setState('error');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMsg("File is too large. Maximum supported size is 25MB.");
      setState('error');
      return;
    }

    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);

    const objUrl = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setOriginalUrl(objUrl);
    setResultBlob(null);
    setResultUrl(null);
    cachedForegroundImgRef.current = null;
    setErrorMsg(null);
    setState('idle');
  };

  const handleClear = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setOriginalUrl(null);
    setResultBlob(null);
    setResultUrl(null);
    cachedForegroundImgRef.current = null;
    setErrorMsg(null);
    setState('idle');
  };

  // Run AI Background Removal ONCE
  const handleStartSegmentation = async () => {
    if (!file || !originalUrl) return;

    setState('segmenting');
    setProgressMsg('Initializing local AI model...');
    setProgressPct(0);
    setErrorMsg(null);

    try {
      // 1. Run local in-browser AI segmentation
      const transparentBlob = await removeBackground(file, {
        progress: (key, current, total) => {
          const percent = Math.round((current / total) * 100);
          let msg = `Processing ${key}...`;
          if (key.includes('fetch')) msg = 'Loading AI model weights into browser...';
          else if (key.includes('compute')) msg = 'Segmenting subject from background...';
          
          setProgressMsg(msg);
          setProgressPct(percent);
        },
        output: {
          format: 'image/png'
        }
      });

      // 2. Load transparent blob into HTMLImageElement
      const transparentImg = await loadImage(transparentBlob);
      cachedForegroundImgRef.current = transparentImg;
      origDimensionsRef.current = {
        width: transparentImg.naturalWidth || transparentImg.width,
        height: transparentImg.naturalHeight || transparentImg.height,
      };

      // 3. Composite initial background color (White by default)
      await updateCompositedBackground(colorPreset, customColor);
      setState('ready');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Background removal failed.";
      setErrorMsg("Failed to process image: " + msg);
      setState('error');
    }
  };

  // Fast local canvas compositing (Zero AI inference)
  const updateCompositedBackground = async (preset: ColorPreset, customHex: string) => {
    const foregroundImg = cachedForegroundImgRef.current;
    const { width, height } = origDimensionsRef.current;

    if (!foregroundImg || width <= 0 || height <= 0) return;

    let targetColor = 'transparent';
    if (preset === 'custom') {
      targetColor = customHex;
    } else if (preset !== 'transparent') {
      targetColor = PRESET_COLORS[preset];
    }

    try {
      const blob = await compositeBackgroundColor(foregroundImg, targetColor, width, height);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
    } catch (err: unknown) {
      console.error("Compositing error:", err);
    }
  };

  // Handle preset color change (Instant UI update)
  const handlePresetSelect = (preset: ColorPreset) => {
    setColorPreset(preset);
    if (state === 'ready') {
      updateCompositedBackground(preset, customColor);
    }
  };

  // Handle custom color change (Instant UI update)
  const handleCustomColorChange = (hex: string) => {
    setCustomColor(hex);
    setColorPreset('custom');
    if (state === 'ready') {
      updateCompositedBackground('custom', hex);
    }
  };

  const getOutputFilename = (originalName: string) => {
    return originalName.replace(/\.[^/.]+$/, "") + "-background.png";
  };

  const activeColorHex = colorPreset === 'custom' 
    ? customColor 
    : colorPreset === 'transparent' 
      ? 'transparent' 
      : PRESET_COLORS[colorPreset];

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
      <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto">
        <div className="mb-8 flex items-center gap-4 max-w-[1200px] mx-auto w-full">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
            <Palette size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">Change Background</h2>
            <p className="text-[15px] font-light text-muted-foreground">Remove image backgrounds and replace them with any solid color or transparency.</p>
          </div>
        </div>

        {errorMsg && state === 'error' && (
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
              title="Drop your image here"
              subtitle="PNG • JPG • JPEG (Max 25MB)"
            />
          </div>
        ) : (
          <div className="flex flex-col flex-1 mx-auto max-w-[1400px] w-full space-y-6">
            <div className="bg-card border border-border p-5 rounded-[10px] flex items-center justify-between transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-secondary p-3 rounded-[6px] text-foreground border border-border">
                  <ImageIcon size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-display font-medium text-[16px] text-foreground truncate max-w-xs md:max-w-md">
                    {file.name}
                  </p>
                  <p className="text-[13px] font-light text-muted-foreground mt-1">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClear}
                disabled={state === 'segmenting'}
                className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-colors disabled:opacity-50"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* AI Segmentation Loading State */}
            {state === 'segmenting' && (
              <div className="bg-card p-10 rounded-[12px] border border-border flex flex-col items-center shadow-sm">
                <Loader2 className="w-10 h-10 animate-spin mb-6 text-primary" strokeWidth={1.5} />
                <h3 className="font-display font-medium text-[20px] text-foreground mb-2 tracking-tight">Removing background...</h3>
                <p className="text-[14px] font-light text-muted-foreground mb-8">{progressMsg}</p>
                <div className="w-full max-w-md bg-secondary rounded-full h-2 overflow-hidden mb-2">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
                </div>
                <p className="text-[12px] font-light text-muted-foreground mt-5">Processed 100% locally in your browser. No files are uploaded to any server.</p>
              </div>
            )}

            {/* Ready / Idle Image Previews */}
            {(state === 'idle' || state === 'ready') && originalUrl && (
              <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-[350px]">
                {/* Original Preview */}
                <div className="flex-1 flex flex-col bg-card rounded-[10px] border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-secondary font-display font-medium text-[14px] text-foreground">
                    Original Image
                  </div>
                  <div className="flex-1 bg-secondary/30 p-6 flex items-center justify-center relative min-h-[300px]">
                    <div 
                      className="absolute inset-0 opacity-[0.03]" 
                      style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} 
                    />
                    <img
                      src={originalUrl}
                      alt="Original"
                      className="max-w-full max-h-[450px] object-contain rounded-[4px] relative z-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-border"
                    />
                  </div>
                </div>

                {/* Result Preview */}
                <div className="flex-1 flex flex-col bg-card rounded-[10px] border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-secondary font-display font-medium text-[14px] flex justify-between items-center text-foreground">
                    <span>Result Preview</span>
                    {state === 'ready' && (
                      <span className="text-[11px] font-display font-bold uppercase tracking-wider text-primary border border-border px-2 py-0.5 rounded bg-background">
                        {colorPreset}
                      </span>
                    )}
                  </div>
                  <div 
                    className={cn(
                      "flex-1 p-6 flex items-center justify-center relative min-h-[300px] transition-colors duration-200",
                      colorPreset === 'transparent' && 'bg-[url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/ENF5gIuL+F3AwMDgPw0U4yFSAgAupA4FTb8eRwAAAABJRU5ErkJggg==")]'
                    )}
                    style={colorPreset !== 'transparent' ? { backgroundColor: activeColorHex } : undefined}
                  >
                    {state === 'ready' && resultUrl ? (
                      <img
                        src={resultUrl}
                        alt="Background Changed Result"
                        className="max-w-full max-h-[450px] object-contain rounded-[4px] relative z-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground h-full relative z-10 p-8 text-center bg-card/80 border border-border rounded-[12px]">
                        <Palette size={40} className="mb-3 text-muted-foreground/40" strokeWidth={1.5} />
                        <p className="font-display font-medium text-[15px]">Click "Process Image" to generate background</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Sidebar */}
      {file && (state === 'idle' || state === 'ready') && (
        <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-y-auto shrink-0 z-20">
          <div className="p-8 space-y-8 flex-1">
            <h3 className="font-display font-medium text-[16px] text-foreground tracking-tight flex items-center gap-2">
              <Palette size={18} className="text-muted-foreground" strokeWidth={1.5} />
              Background Color
            </h3>

            {/* Preset Color Selection */}
            <div className="space-y-4">
              <label className="text-[14px] font-display font-medium text-foreground block">
                Select Preset
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePresetSelect('transparent')}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-[8px] border font-display text-[13px] transition-all text-left",
                    colorPreset === 'transparent'
                      ? "border-foreground bg-secondary font-medium text-foreground"
                      : "border-border hover:border-muted-foreground text-muted-foreground"
                  )}
                >
                  <span className="w-5 h-5 rounded-full border border-border bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/ENF5gIuL+F3AwMDgPw0U4yFSAgAupA4FTb8eRwAAAABJRU5ErkJggg==')] shrink-0" />
                  <span>Transparent</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetSelect('white')}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-[8px] border font-display text-[13px] transition-all text-left",
                    colorPreset === 'white'
                      ? "border-foreground bg-secondary font-medium text-foreground"
                      : "border-border hover:border-muted-foreground text-muted-foreground"
                  )}
                >
                  <span className="w-5 h-5 rounded-full border border-border bg-white shrink-0" />
                  <span>White</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetSelect('black')}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-[8px] border font-display text-[13px] transition-all text-left",
                    colorPreset === 'black'
                      ? "border-foreground bg-secondary font-medium text-foreground"
                      : "border-border hover:border-muted-foreground text-muted-foreground"
                  )}
                >
                  <span className="w-5 h-5 rounded-full border border-border bg-black shrink-0" />
                  <span>Black</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetSelect('light-gray')}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-[8px] border font-display text-[13px] transition-all text-left",
                    colorPreset === 'light-gray'
                      ? "border-foreground bg-secondary font-medium text-foreground"
                      : "border-border hover:border-muted-foreground text-muted-foreground"
                  )}
                >
                  <span className="w-5 h-5 rounded-full border border-border bg-[#F3F4F6] shrink-0" />
                  <span>Light Gray</span>
                </button>
              </div>
            </div>

            {/* Custom Color Picker */}
            <div className="space-y-4 pt-6 border-t border-border">
              <label className="text-[14px] font-display font-medium text-foreground block">
                Custom Color
              </label>

              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-[8px] overflow-hidden border border-border shrink-0 cursor-pointer">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="absolute -inset-2 w-14 h-14 cursor-pointer"
                  />
                </div>

                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('#') || val.length <= 7) {
                      handleCustomColorChange(val);
                    }
                  }}
                  placeholder="#3B82F6"
                  className="flex-1 uppercase font-mono text-[14px] bg-secondary border border-border rounded-[8px] px-3 py-2 text-foreground focus:outline-none focus:border-foreground"
                />

                <button
                  type="button"
                  onClick={() => handlePresetSelect('custom')}
                  className={cn(
                    "px-3 py-2 rounded-[8px] text-[12px] font-display font-medium border transition-colors",
                    colorPreset === 'custom'
                      ? "bg-foreground text-background border-foreground font-semibold"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* File Info */}
            {state === 'ready' && resultBlob && (
              <div className="pt-6 border-t border-border space-y-2 font-display text-[13px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Output Size:</span>
                  <span className="text-foreground font-medium">{formatFileSize(resultBlob.size)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Format:</span>
                  <span className="text-foreground">PNG</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-auto p-8 bg-secondary/30 border-t border-border space-y-3">
            {state === 'idle' ? (
              <button
                onClick={handleStartSegmentation}
                className="w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center transition-colors bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                Process Image
              </button>
            ) : (
              <a
                href={resultUrl || '#'}
                download={getOutputFilename(file.name)}
                className="w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center transition-colors bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <Download className="w-5 h-5 mr-2" strokeWidth={2} />
                Download PNG
              </a>
            )}

            <p className="text-[12px] font-light text-center text-muted-foreground mt-3">
              100% Client-Side. Your files never leave your device.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
