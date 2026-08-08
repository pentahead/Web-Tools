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
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 p-6 flex flex-col overflow-y-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">PDF to Word</h2>
            <p className="text-sm text-slate-500">Convert PDF files into editable Word documents.</p>
          </div>
        </div>

        {!file ? (
          <FileUploadZone 
            accept="application/pdf,.pdf"
            maxSizeMB={20}
            multiple={false}
            onFilesSelected={handleFilesSelected}
            title="Drop PDF here"
            subtitle="PDF • Max 20 MB"
          />
        ) : (
          <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full space-y-6">
            
            {/* File Info Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-500">
                  <FileText size={24} />
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
                disabled={state === 'processing'}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* States */}
            {state === 'processing' && (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-2">Converting PDF...</h3>
                <p className="text-slate-500 mb-6">{progressMsg}</p>
                <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
                </div>
              </div>
            )}

            {state === 'completed' && docxUrl && (
              <div className="bg-green-50 dark:bg-green-900/20 p-8 rounded-xl border border-green-200 dark:border-green-800/30 shadow-sm flex flex-col items-center text-center">
                <h3 className="font-semibold text-xl text-green-800 dark:text-green-300 mb-2">Conversion complete</h3>
                <p className="text-green-700/80 dark:text-green-400/80 mb-6 font-medium">{getOutputFilename(file.name)}</p>
                <a 
                  href={docxUrl}
                  download={getOutputFilename(file.name)}
                  className="py-3 px-8 rounded-xl font-semibold flex items-center justify-center bg-green-600 hover:bg-green-700 text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Word
                </a>
              </div>
            )}

            {state === 'scanned-pdf' && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-xl border border-amber-200 dark:border-amber-800/30 shadow-sm flex flex-col items-center text-center">
                <h3 className="font-semibold text-xl text-amber-800 dark:text-amber-300 mb-2">This PDF appears to be scanned.</h3>
                <p className="text-amber-700/80 dark:text-amber-400/80 mb-6">
                  We couldn't find selectable text in this document.<br/>
                  OCR support is coming soon.
                </p>
                <button 
                  onClick={handleRemove}
                  className="py-2.5 px-6 rounded-lg font-medium bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 transition-colors"
                >
                  Choose Another PDF
                </button>
              </div>
            )}

            {state === 'error' && (
              <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-xl border border-red-200 dark:border-red-800/30 shadow-sm flex flex-col items-center text-center">
                <h3 className="font-semibold text-xl text-red-800 dark:text-red-300 mb-2">We couldn't convert this PDF.</h3>
                <p className="text-red-700/80 dark:text-red-400/80 mb-6 max-w-md">
                  {error || "Please try another file."}
                </p>
                <button 
                  onClick={handleRemove}
                  className="py-2.5 px-6 rounded-lg font-medium bg-red-200 hover:bg-red-300 dark:bg-red-800 dark:hover:bg-red-700 text-red-900 dark:text-red-100 transition-colors"
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
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
          <div className="p-6 flex-1">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Settings size={18} className="text-slate-500" />
              Conversion Options
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Text Layout</label>
                <select 
                  value={settings.layout}
                  onChange={(e) => setSettings({ ...settings, layout: e.target.value as 'preserve' | 'plain' })}
                  disabled={state === 'processing'}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="preserve">Preserve basic paragraphs</option>
                  <option value="plain">Plain text</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-auto p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={handleConvert}
              disabled={state === 'processing'}
              className={cn(
                "w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center transition-all duration-200",
                state === 'processing'
                  ? "bg-blue-400 cursor-not-allowed text-white shadow-inner" 
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-md hover:shadow-lg"
              )}
            >
              {state === 'processing' ? 'Converting...' : 'Convert to Word'}
            </button>
            <p className="text-xs text-center text-slate-500 mt-4">
              Your PDF is processed locally in your browser and is not uploaded to a server.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
