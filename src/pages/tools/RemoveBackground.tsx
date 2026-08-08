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
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
      <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto">
        <div className="mb-8 flex items-center gap-4 max-w-[1200px] mx-auto w-full">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
            <Eraser size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">Remove Background</h2>
            <p className="text-[15px] font-light text-muted-foreground">Remove backgrounds from your images instantly.</p>
          </div>
        </div>

        {!file && state !== 'error' ? (
          <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
            <FileUploadZone 
              accept="image/png, image/jpeg, image/jpg"
              maxSizeMB={10}
              multiple={false}
              onFilesSelected={handleFilesSelected}
              title="Drop your image here"
              subtitle="PNG • JPG • JPEG (Max 10 MB)"
            />
          </div>
        ) : (
          <div className="flex flex-col flex-1 mx-auto max-w-[1200px] w-full space-y-6">
            
            {file && (
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
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleRemove}
                  disabled={state === 'processing' || state === 'applying'}
                  className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-colors disabled:opacity-50"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* States */}
            {(state === 'processing' || state === 'applying') && (
              <div className="bg-card p-10 rounded-[12px] border border-border flex flex-col items-center">
                <Loader2 className="w-10 h-10 animate-spin mb-6 text-primary" strokeWidth={1.5} />
                <h3 className="font-display font-medium text-[20px] text-foreground mb-2 tracking-tight">Removing background...</h3>
                <p className="text-[14px] font-light text-muted-foreground mb-8">{progressMsg}</p>
                <div className="w-full max-w-md bg-secondary rounded-full h-2 overflow-hidden mb-2">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
                </div>
                {progressPct < 20 && (
                   <p className="text-[12px] font-light text-muted-foreground mt-5">The first conversion may take a little longer while the AI model loads.</p>
                )}
              </div>
            )}

            {state === 'error' && (
              <div className="bg-card p-10 rounded-[12px] border border-destructive/30 flex flex-col items-center text-center">
                <h3 className="font-display font-medium text-[20px] text-foreground mb-3 tracking-tight">We couldn't process this image.</h3>
                <p className="text-[14px] font-light text-muted-foreground mb-8 max-w-md">
                  {error || "Please try another file."}
                </p>
                <button 
                  onClick={handleRemove}
                  className="py-3 px-8 rounded-[8px] font-display font-medium bg-secondary text-foreground hover:bg-border transition-colors border border-border"
                >
                  Choose Another Image
                </button>
              </div>
            )}

            {(state === 'idle' || state === 'completed') && file && originalUrl && (
               <div className="flex flex-col md:flex-row gap-6 h-full">
                 <div className="flex-1 flex flex-col min-h-[300px]">
                   <h3 className="text-[12px] font-display font-bold text-muted-foreground mb-3 uppercase tracking-widest">Original</h3>
                   <div className="flex-1 bg-secondary/30 rounded-[10px] overflow-hidden border border-border flex items-center justify-center p-6 relative">
                     <div className="absolute inset-0 opacity-[0.03]" 
                       style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                     <img src={originalUrl} alt="Original" className="max-w-full max-h-[500px] object-contain rounded-[4px] relative z-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-border" />
                   </div>
                 </div>

                 <div className="flex-1 flex flex-col min-h-[300px]">
                   <h3 className="text-[12px] font-display font-bold text-muted-foreground mb-3 uppercase tracking-widest flex justify-between items-center">
                     <span>Result</span>
                     {state === 'completed' && (
                       <div className="flex gap-2">
                         <button onClick={() => setPreviewBg('transparent')} className={cn("px-3 py-1.5 rounded-[4px] text-[10px] uppercase font-bold tracking-wider transition-colors", previewBg === 'transparent' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>Transp</button>
                         <button onClick={() => setPreviewBg('white')} className={cn("px-3 py-1.5 rounded-[4px] text-[10px] uppercase font-bold tracking-wider transition-colors border border-border", previewBg === 'white' ? 'bg-white text-black' : 'text-muted-foreground hover:text-foreground bg-secondary/50')}>White</button>
                         <button onClick={() => setPreviewBg('black')} className={cn("px-3 py-1.5 rounded-[4px] text-[10px] uppercase font-bold tracking-wider transition-colors border border-border", previewBg === 'black' ? 'bg-black text-white' : 'text-muted-foreground hover:text-foreground bg-secondary/50')}>Black</button>
                       </div>
                     )}
                   </h3>
                   <div className={cn(
                     "flex-1 rounded-[10px] overflow-hidden border border-border flex items-center justify-center p-6 relative transition-colors duration-300",
                     previewBg === 'transparent' && 'bg-[url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/ENF5gIuL+F3AwMDgPw0U4yFSAgAupA4FTb8eRwAAAABJRU5ErkJggg==")]',
                     previewBg === 'white' && 'bg-white',
                     previewBg === 'black' && 'bg-black'
                   )}>
                     {state === 'completed' && resultUrl ? (
                       <img src={resultUrl} alt="Result" className="max-w-full max-h-[500px] object-contain rounded-[4px] relative z-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)]" />
                     ) : (
                       <div className="flex flex-col items-center justify-center text-muted-foreground h-full relative z-10">
                         <ImageIcon size={48} className="mb-4 opacity-30" strokeWidth={1} />
                         <p className="font-light text-[14px]">Result will appear here</p>
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
        <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-y-auto shrink-0 z-20">
          <div className="p-8 flex-1">
            <h3 className="font-display font-medium text-[16px] mb-8 text-foreground tracking-tight">
              Details
            </h3>

            {state === 'completed' ? (
              <div className="space-y-4">
                 <div className="bg-secondary p-5 rounded-[10px] border border-foreground">
                   <h4 className="font-display font-medium text-[15px] text-foreground mb-2">Background removed</h4>
                   <p className="text-[13px] font-light text-muted-foreground break-all">{getOutputFilename(file.name)}</p>
                   <p className="text-[11px] font-display font-bold uppercase tracking-widest text-foreground mt-4">{(resultSize / 1024 / 1024).toFixed(2)} MB • PNG</p>
                 </div>
              </div>
            ) : (
              <div className="space-y-4">
                 <p className="text-[14px] font-light text-muted-foreground leading-relaxed">
                   Ready to process. Best results with clear subjects and distinct backgrounds.
                 </p>
              </div>
            )}
            
          </div>

          <div className="mt-auto p-8 bg-secondary/30 border-t border-border">
            {state === 'idle' ? (
               <button 
                 onClick={handleProcess}
                 className="w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center transition-colors bg-primary hover:bg-primary-hover text-primary-foreground"
               >
                 Remove Background
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
            
            <p className="text-[12px] font-light text-center text-muted-foreground mt-5">
              Your image is processed locally in your browser.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
