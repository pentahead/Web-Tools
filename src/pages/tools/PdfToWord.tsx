import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Loader2, X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploadZone from '@/components/shared/FileUploadZone';
import type { PdfToWordSettings, WorkerResponse, WorkerRequest } from '@/types/pdf-to-word';

type ToolState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error' | 'scanned-pdf';

export default function PdfToWord() {
  const [state, setState] = useState<ToolState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<PdfToWordSettings>({
    layout: 'preserve'
  });

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/pdf-to-word.worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const data = e.data;
      if (data.type === 'progress') {
        setProgressMsg(data.message);
        setProgressPct(data.percent);
      } else if (data.type === 'success') {
        const url = URL.createObjectURL(data.docxBlob);
        setDocxUrl(url);
        setState('completed');
      } else if (data.type === 'scanned') {
        setState('scanned-pdf');
      } else if (data.type === 'error') {
        setError(data.error);
        setState('error');
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setState('idle');
    setDocxUrl(null);
    setError(null);
  };

  const handleRemove = () => {
    setFile(null);
    setState('idle');
    if (docxUrl) {
      URL.revokeObjectURL(docxUrl);
      setDocxUrl(null);
    }
    setError(null);
  };

  const handleConvert = () => {
    if (!file) return;
    setState('processing');
    setProgressMsg('Initializing...');
    setProgressPct(0);
    setError(null);

    workerRef.current?.postMessage({
      type: 'process',
      file,
      settings
    } as WorkerRequest);
  };

  const getOutputFilename = (originalName: string) => {
    return originalName.replace(/\.pdf$/i, '.docx');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
      <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto">
        <div className="mb-8 flex items-center gap-4 max-w-[1200px] mx-auto w-full">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
            <FileText size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">PDF to Word</h2>
            <p className="text-[15px] font-light text-muted-foreground">Convert PDF files into editable Word documents.</p>
          </div>
        </div>

        {!file ? (
          <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
            <FileUploadZone 
              accept="application/pdf,.pdf"
              maxSizeMB={20}
              multiple={false}
              onFilesSelected={handleFilesSelected}
              title="Drop PDF here"
              subtitle="PDF • Max 20 MB"
            />
          </div>
        ) : (
          <div className="flex flex-col flex-1 max-w-[1200px] mx-auto w-full space-y-6">
            
            {/* File Info Card */}
            <div className="bg-card border border-border p-5 rounded-[10px] flex items-center justify-between transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-secondary p-3 rounded-[6px] text-foreground border border-border">
                  <FileText size={24} strokeWidth={1.5} />
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
                disabled={state === 'processing'}
                className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-colors disabled:opacity-50"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* States */}
            {state === 'processing' && (
              <div className="bg-card p-10 rounded-[12px] border border-border flex flex-col items-center max-w-xl mx-auto w-full">
                <Loader2 className="w-10 h-10 animate-spin mb-6 text-primary" strokeWidth={1.5} />
                <h3 className="font-display font-medium text-[20px] text-foreground mb-2 tracking-tight">Converting PDF...</h3>
                <p className="text-[14px] font-light text-muted-foreground mb-8">{progressMsg}</p>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mb-2">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
                </div>
              </div>
            )}

            {state === 'completed' && docxUrl && (
              <div className="bg-secondary p-10 rounded-[12px] border border-foreground flex flex-col items-center text-center max-w-xl mx-auto w-full">
                <h3 className="font-display font-medium text-[24px] text-foreground mb-3 tracking-tight">Conversion Complete</h3>
                <p className="text-[15px] font-light text-muted-foreground mb-8">{getOutputFilename(file.name)}</p>
                <a 
                  href={docxUrl}
                  download={getOutputFilename(file.name)}
                  className="py-4 px-8 rounded-[8px] font-display font-semibold flex items-center justify-center bg-primary hover:bg-primary-hover text-primary-foreground transition-colors w-full"
                >
                  <Download className="w-5 h-5 mr-2" strokeWidth={2} />
                  Download Word
                </a>
              </div>
            )}

            {state === 'scanned-pdf' && (
              <div className="bg-card p-10 rounded-[12px] border border-border flex flex-col items-center text-center max-w-xl mx-auto w-full">
                <h3 className="font-display font-medium text-[20px] text-foreground mb-3 tracking-tight">Scanned PDF Detected</h3>
                <p className="text-[14px] font-light text-muted-foreground mb-8 leading-relaxed">
                  We couldn't find selectable text in this document.<br/>
                  OCR support is coming soon.
                </p>
                <button 
                  onClick={handleRemove}
                  className="py-3 px-8 rounded-[8px] font-display font-medium bg-secondary text-foreground hover:bg-border transition-colors border border-border"
                >
                  Choose Another PDF
                </button>
              </div>
            )}

            {state === 'error' && (
              <div className="bg-card p-10 rounded-[12px] border border-destructive/30 flex flex-col items-center text-center max-w-xl mx-auto w-full">
                <h3 className="font-display font-medium text-[20px] text-foreground mb-3 tracking-tight">We couldn't convert this PDF.</h3>
                <p className="text-[14px] font-light text-muted-foreground mb-8 leading-relaxed">
                  {error || "Please try another file."}
                </p>
                <button 
                  onClick={handleRemove}
                  className="py-3 px-8 rounded-[8px] font-display font-medium bg-secondary text-foreground hover:bg-border transition-colors border border-border"
                >
                  Choose Another PDF
                </button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Settings Sidebar */}
      {file && (
        <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-y-auto shrink-0 z-20">
          <div className="p-8 flex-1">
            <h3 className="font-display font-medium text-[16px] mb-8 flex items-center gap-2 text-foreground tracking-tight">
              <Settings size={18} className="text-muted-foreground" strokeWidth={1.5} />
              Conversion Options
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[13px] font-display font-medium text-muted-foreground uppercase tracking-widest">Text Layout</label>
                <select 
                  value={settings.layout}
                  onChange={(e) => setSettings({ ...settings, layout: e.target.value as 'preserve' | 'plain' })}
                  disabled={state === 'processing'}
                  className="w-full p-3.5 bg-background border border-border rounded-[8px] text-[15px] font-medium text-foreground outline-none focus:border-foreground transition-colors disabled:opacity-50"
                >
                  <option value="preserve">Preserve basic paragraphs</option>
                  <option value="plain">Plain text</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-auto p-8 bg-secondary/30 border-t border-border">
            <button 
              onClick={handleConvert}
              disabled={state === 'processing'}
              className={cn(
                "w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center transition-colors",
                state === 'processing'
                  ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border" 
                  : "bg-primary hover:bg-primary-hover text-primary-foreground"
              )}
            >
              {state === 'processing' ? 'Converting...' : 'Convert to Word'}
            </button>
            <p className="text-[12px] text-center font-light text-muted-foreground mt-5">
              Your PDF is processed locally in your browser.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
