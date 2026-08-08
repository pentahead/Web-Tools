import { useState, useEffect, useRef } from 'react';
import { UploadCloud, Settings, Image as ImageIcon, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageDataFromUrl, preprocessImageData } from '@/lib/imageUtils';
import type { WorkerResponse, WorkerRequest } from '@/workers/vectorizer.worker';

export default function App() {
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
    workerRef.current = new Worker(new URL('./workers/vectorizer.worker.ts', import.meta.url), { type: 'module' });
    
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 bg-white dark:bg-slate-900 shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-md text-white shadow-md">
            <ImageIcon size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500 dark:from-blue-400 dark:to-blue-200">
            Vectorize
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 p-6 flex flex-col overflow-y-auto">
          {!file ? (
            <div 
              className={cn(
                "flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all duration-300 transform",
                isDragging 
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99] shadow-inner" 
                  : "border-slate-300 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4 transition-transform group-hover:scale-105">
                <UploadCloud size={32} className="text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Drag & drop an image</h2>
              <p className="text-slate-500 mb-6">Supports PNG, JPG up to 10MB</p>
              
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors shadow-sm hover:shadow-md">
                Browse Files
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/jpg" 
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row gap-6">
              <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 font-medium text-sm flex justify-between items-center">
                  <span>Original Image</span>
                  <button 
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setSvgUrl(null);
                    }}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs px-2 py-1 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800/50 p-4 flex items-center justify-center relative min-h-[300px]">
                  <div className="absolute inset-0 opacity-10 dark:opacity-5" 
                       style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="Original" 
                      className="max-w-full max-h-full object-contain relative z-10 shadow-sm rounded-sm"
                    />
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 font-medium text-sm flex justify-between items-center">
                  <span>Vector Result</span>
                  {svgUrl && (
                    <span className="text-green-600 dark:text-green-400 text-xs font-semibold px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-md">
                      Ready
                    </span>
                  )}
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800/50 p-4 flex items-center justify-center relative min-h-[300px] overflow-hidden group">
                  <div className="absolute inset-0 opacity-10 dark:opacity-5" 
                       style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center text-slate-500 relative z-10 bg-white/80 dark:bg-slate-900/80 p-6 rounded-xl shadow-sm backdrop-blur-sm">
                      <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                      <p className="font-medium animate-pulse">Vectorizing image...</p>
                    </div>
                  ) : svgUrl ? (
                    <div className="relative z-10 w-full h-full flex items-center justify-center cursor-crosshair">
                       {/* SVG preview via Blob Object URL prevents script execution */}
                      <img 
                        src={svgUrl} 
                        alt="Vectorized SVG" 
                        className="max-w-full max-h-full object-contain shadow-sm rounded-sm transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="text-slate-400 relative z-10 text-center px-4 bg-white/50 dark:bg-slate-900/50 p-6 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800/50">
                      <Settings className="w-8 h-8 mx-auto mb-3 opacity-30 text-blue-500" />
                      <p className="text-sm">Adjust settings and click Convert</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {file && (
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
            <div className="p-6">
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Settings size={18} className="text-slate-500" />
                Settings
              </h3>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Color Mode</label>
                  <div className="flex flex-col gap-2">
                    {(['color', 'grayscale', 'bw'] as const).map(m => (
                      <label key={m} className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                        mode === m 
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm" 
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                      )}>
                        <input 
                          type="radio" 
                          name="mode" 
                          value={m} 
                          checked={mode === m} 
                          onChange={() => setMode(m)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="capitalize font-medium">{m === 'bw' ? 'Black & White' : m}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Level of Detail</label>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded capitalize">{detail}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="2" step="1" 
                    value={detail === 'low' ? 0 : detail === 'medium' ? 1 : 2}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDetail(val === 0 ? 'low' : val === 1 ? 'medium' : 'high');
                    }}
                    className="w-full accent-blue-600 hover:accent-blue-700 transition-all"
                  />
                  <div className="flex justify-between text-xs text-slate-400 px-1 font-medium">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                {mode === 'color' && (
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Colors</label>
                      <span className="text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {colors}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="2" max="32" step="1" 
                      value={colors}
                      onChange={(e) => setColors(parseInt(e.target.value))}
                      className="w-full accent-blue-600 hover:accent-blue-700 transition-all"
                    />
                    <div className="flex justify-between text-xs text-slate-400 px-1 font-medium">
                      <span>2</span>
                      <span>32</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <button 
                onClick={handleConvert}
                disabled={isProcessing}
                className={cn(
                  "w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center transition-all duration-200",
                  isProcessing 
                    ? "bg-blue-400 cursor-not-allowed text-white shadow-inner" 
                    : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-md hover:shadow-lg"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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
                  className="w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 active:scale-[0.98] transition-all duration-200 shadow-sm"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download SVG
                </a>
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
