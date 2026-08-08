import { useState, useEffect } from 'react';
import { Eraser, Download, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploadZone from '@/components/shared/FileUploadZone';
import { removeBackground } from '@imgly/background-removal';

type ToolState = 'idle' | 'processing' | 'applying' | 'completed' | 'error';
type PreviewBg = 'transparent' | 'white' | 'black';

export default function RemoveBackground() {
  const [state, setState] = useState<ToolState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewBg, setPreviewBg] = useState<PreviewBg>('transparent');
  const [resultSize, setResultSize] = useState<number>(0);
  


  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [originalUrl, resultUrl]);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    
    // Validate image resolution (max 4096x4096px roughly, handled loosely or strictly)
    // We'll rely on the worker to process or crash, but we can do a quick check
    const img = new Image();
    const objUrl = URL.createObjectURL(selectedFile);
    
    img.onload = () => {
      if (img.width > 4096 || img.height > 4096) {
        setError("This image has too many pixels. Try using a smaller image (Max 4096x4096px).");
        setState('error');
        URL.revokeObjectURL(objUrl);
        return;
      }
      
      setFile(selectedFile);
      setOriginalUrl(objUrl);
      setState('idle');
      setResultUrl(null);
      setError(null);
    };
    
    img.onerror = () => {
      setError("Failed to read image.");
      setState('error');
      URL.revokeObjectURL(objUrl);
    };
    
    img.src = objUrl;
  };

  const handleRemove = () => {
    setFile(null);
    setState('idle');
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl);
      setOriginalUrl(null);
    }
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setError(null);
  };

  const handleProcess = async () => {
    if (!file) return;
    setState('processing');
    setProgressMsg('Initializing and loading AI model (may take a while)...');
    setProgressPct(0);
    setError(null);

    try {
      // Configuration for local assets if needed, but for now we let it fetch
      // If we copy assets, we can pass publicPath here.
      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          const percent = Math.round((current / total) * 100);
          let msg = `Processing ${key}...`;
          if (key.includes('fetch')) msg = 'Downloading model...';
          else if (key.includes('compute')) msg = 'Analyzing image...';
          
          setProgressMsg(msg);
          setProgressPct(percent);
        },
        output: {
          format: 'image/png'
        }
      });

      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);
      setState('completed');
    } catch (err: any) {
      console.error(err);
      setError("Failed to process image: " + err.message);
      setState('error');
    }
  };

  const getOutputFilename = (originalName: string) => {
    return originalName.replace(/\.[^/.]+$/, "") + ".png";
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 p-6 flex flex-col overflow-y-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg text-white">
            <Eraser size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Remove Background</h2>
            <p className="text-sm text-slate-500">Remove backgrounds from your images instantly.</p>
          </div>
        </div>

        {!file && state !== 'error' ? (
          <FileUploadZone 
            accept="image/png, image/jpeg, image/jpg"
            maxSizeMB={10}
            multiple={false}
            onFilesSelected={handleFilesSelected}
            title="Drop your image here"
            subtitle="PNG • JPG • JPEG (Max 10 MB)"
          />
        ) : (
          <div className="flex flex-col flex-1 mx-auto w-full space-y-6">
            
            {file && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-slate-500">
                    <ImageIcon size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs md:max-w-md">
                      {file.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleRemove}
                  disabled={state === 'processing' || state === 'applying'}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* States */}
            {(state === 'processing' || state === 'applying') && (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-500" />
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-2">Removing background...</h3>
                <p className="text-slate-500 mb-6">{progressMsg}</p>
                <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
                </div>
                {progressPct < 20 && (
                   <p className="text-xs text-slate-400 mt-4">The first conversion may take a little longer while the AI model loads.</p>
                )}
              </div>
            )}

            {state === 'error' && (
              <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-xl border border-red-200 dark:border-red-800/30 shadow-sm flex flex-col items-center text-center">
                <h3 className="font-semibold text-xl text-red-800 dark:text-red-300 mb-2">We couldn't process this image.</h3>
                <p className="text-red-700/80 dark:text-red-400/80 mb-6 max-w-md">
                  {error || "Please try another file."}
                </p>
                <button 
                  onClick={handleRemove}
                  className="py-2.5 px-6 rounded-lg font-medium bg-red-200 hover:bg-red-300 dark:bg-red-800 dark:hover:bg-red-700 text-red-900 dark:text-red-100 transition-colors"
                >
                  Choose Another Image
                </button>
              </div>
            )}

            {(state === 'idle' || state === 'completed') && file && originalUrl && (
               <div className="flex flex-col md:flex-row gap-6 h-full">
                 <div className="flex-1 flex flex-col min-h-[300px]">
                   <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Original</h3>
                   <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center p-4">
                     <img src={originalUrl} alt="Original" className="max-w-full max-h-[500px] object-contain rounded" />
                   </div>
                 </div>

                 <div className="flex-1 flex flex-col min-h-[300px]">
                   <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                     <span>Result</span>
                     {state === 'completed' && (
                       <div className="flex gap-1">
                         <button onClick={() => setPreviewBg('transparent')} className={cn("px-2 py-1 rounded text-xs", previewBg === 'transparent' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'text-slate-400 hover:text-slate-600')}>Transp</button>
                         <button onClick={() => setPreviewBg('white')} className={cn("px-2 py-1 rounded text-xs", previewBg === 'white' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'text-slate-400 hover:text-slate-600')}>White</button>
                         <button onClick={() => setPreviewBg('black')} className={cn("px-2 py-1 rounded text-xs", previewBg === 'black' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'text-slate-400 hover:text-slate-600')}>Black</button>
                       </div>
                     )}
                   </h3>
                   <div className={cn(
                     "flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center p-4 relative",
                     previewBg === 'transparent' && 'bg-[url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/ENF5gIuL+F3AwMDgPw0U4yFSAgAupA4FTb8eRwAAAABJRU5ErkJggg==")]',
                     previewBg === 'white' && 'bg-white',
                     previewBg === 'black' && 'bg-black'
                   )}>
                     {state === 'completed' && resultUrl ? (
                       <img src={resultUrl} alt="Result" className="max-w-full max-h-[500px] object-contain rounded" />
                     ) : (
                       <div className="flex flex-col items-center justify-center text-slate-400 h-full">
                         <ImageIcon size={48} className="mb-4 opacity-50" />
                         <p>Result will appear here</p>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Sidebar */}
      {file && (state === 'idle' || state === 'completed') && (
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
          <div className="p-6 flex-1">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-200">
              Details
            </h3>

            {state === 'completed' ? (
              <div className="space-y-4">
                 <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800/30">
                   <h4 className="font-medium text-green-800 dark:text-green-300 mb-1">Background removed</h4>
                   <p className="text-sm text-green-700/80 dark:text-green-400/80 font-mono break-all">{getOutputFilename(file.name)}</p>
                   <p className="text-xs text-green-600/80 dark:text-green-500/80 mt-2">{(resultSize / 1024 / 1024).toFixed(2)} MB • PNG</p>
                 </div>
              </div>
            ) : (
              <div className="space-y-4">
                 <p className="text-sm text-slate-600 dark:text-slate-400">
                   Ready to process. Best results with clear subjects and distinct backgrounds.
                 </p>
              </div>
            )}
            
          </div>

          <div className="mt-auto p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
            {state === 'idle' ? (
               <button 
                 onClick={handleProcess}
                 className="w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center transition-all duration-200 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white shadow-md hover:shadow-lg"
               >
                 Remove Background
               </button>
            ) : (
               <a 
                 href={resultUrl || '#'}
                 download={getOutputFilename(file.name)}
                 className="w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center transition-all duration-200 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white shadow-md hover:shadow-lg"
               >
                 <Download className="w-5 h-5 mr-2" />
                 Download PNG
               </a>
            )}
            
            <p className="text-xs text-center text-slate-500 mt-4">
              Your image is processed locally in your browser and is not uploaded to a server.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
