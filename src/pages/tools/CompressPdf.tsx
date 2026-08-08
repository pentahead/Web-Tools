import { useState } from 'react';
import { FileDown, Loader2, Download, ArrowRight, Settings2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploadZone from '@/components/shared/FileUploadZone';
import PdfWorkspace from '@/components/pdf/PdfWorkspace';
import { compressPdf, type CompressionPreset, type CompressProgressEvent } from '@/lib/pdf/pdf-compressor';

// ----------------------------------------------------------------------
// Main CompressPdf Component
// ----------------------------------------------------------------------
export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<CompressionPreset>('balanced');
  
  const [processing, setProcessing] = useState(false);
  const [progressEvent, setProgressEvent] = useState<CompressProgressEvent | null>(null);
  
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [savedPct, setSavedPct] = useState(0);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    setFile(files[0]);
    handleResetResult();
  };

  const handleResetResult = () => {
    setResultUrl(null);
    setProgressEvent(null);
    setIsError(false);
    setErrorMessage('');
    setOriginalSize(0);
    setCompressedSize(0);
    setSavedPct(0);
  };

  const handleCompress = async () => {
    if (!file) return;
    
    setProcessing(true);
    handleResetResult();
    
    try {
      const result = await compressPdf(file, preset, (evt) => {
        setProgressEvent(evt);
      });
      
      if (result.compressedSize >= result.originalSize) {
        setIsError(true);
        setErrorMessage("The PDF could not be reduced further. The original file may already be optimized.");
      } else {
        const url = URL.createObjectURL(result.blob);
        setResultUrl(url);
        setOriginalSize(result.originalSize);
        setCompressedSize(result.compressedSize);
        setSavedPct(result.percentageSaved);
      }
    } catch (err: any) {
      console.error(err, err.originalError);
      setIsError(true);
      setErrorMessage(
        (err.originalError?.message) 
          ? `Error: ${err.originalError.message}` 
          : (err.message || "Failed to compress PDF. Please try another file.")
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileDown size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Compress PDF</h2>
            <p className="text-sm text-slate-500">Reduce PDF file size while keeping good quality.</p>
          </div>
        </div>
        
        <FileUploadZone 
          accept="application/pdf,.pdf"
          maxSizeMB={50}
          multiple={false}
          onFilesSelected={handleFilesSelected}
          title="Drop PDF here"
          subtitle="PDF • Max 50 MB"
        />
      </div>
    );
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <Settings2 size={18} className="text-slate-500" />
          Compression Level
        </h3>
        
        <div className="space-y-3 mb-6">
          <button
            onClick={() => setPreset('max')}
            disabled={processing}
            className={cn(
              "w-full text-left p-4 rounded-xl border transition-all",
              preset === 'max' 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500" 
                : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800"
            )}
          >
            <div className="font-semibold text-slate-800 dark:text-slate-200">Small Size</div>
            <div className="text-sm text-slate-500 mt-1">Maximum compression, lower image quality</div>
          </button>
          
          <button
            onClick={() => setPreset('balanced')}
            disabled={processing}
            className={cn(
              "w-full text-left p-4 rounded-xl border transition-all",
              preset === 'balanced' 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500" 
                : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800"
            )}
          >
            <div className="flex justify-between items-center">
              <div className="font-semibold text-slate-800 dark:text-slate-200">Balanced</div>
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">Recommended</span>
            </div>
            <div className="text-sm text-slate-500 mt-1">Good quality, good compression</div>
          </button>
          
          <button
            onClick={() => setPreset('lossless')}
            disabled={processing}
            className={cn(
              "w-full text-left p-4 rounded-xl border transition-all",
              preset === 'lossless' 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500" 
                : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800"
            )}
          >
            <div className="font-semibold text-slate-800 dark:text-slate-200">High Quality</div>
            <div className="text-sm text-slate-500 mt-1">Minimal visual degradation, larger output</div>
          </button>
        </div>
      </div>

      <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {resultUrl ? (
          <a 
            href={resultUrl}
            download={file.name.replace('.pdf', '-compressed.pdf')}
            className="w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center bg-green-600 hover:bg-green-700 text-white shadow-md transition-all mb-3"
          >
            <Download size={18} className="mr-2" />
            Download PDF
          </a>
        ) : (
          <button 
            onClick={handleCompress}
            disabled={processing}
            className="w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white shadow-md transition-all"
          >
            {processing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Compressing...</>
            ) : (
              'Compress PDF'
            )}
          </button>
        )}
        <button 
          onClick={() => { setFile(null); handleResetResult(); }}
          className="w-full py-3.5 px-4 rounded-xl font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          {resultUrl || isError ? 'Compress Another PDF' : 'Cancel'}
        </button>
      </div>
    </div>
  );

  return (
    <PdfWorkspace
      title="Compress PDF"
      description="Optimize your PDF file size without losing important quality."
      sidebar={sidebar}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto w-full">
        
        {processing && !isError && !resultUrl && (
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
            <Loader2 className="w-12 h-12 animate-spin mb-6 text-blue-500" />
            <h3 className="font-semibold text-xl text-slate-800 dark:text-slate-200 mb-2">Compressing...</h3>
            <p className="text-slate-500 font-medium mb-6">
              {progressEvent?.message || "Analyzing document structure..."}
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.max(5, progressEvent?.progress || 5)}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 mt-4 flex items-center justify-center gap-1">
              <Info size={14} /> Processing securely in your browser
            </p>
          </div>
        )}

        {isError && (
          <div className="w-full max-w-md bg-amber-50 dark:bg-amber-900/20 p-8 rounded-2xl border border-amber-200 dark:border-amber-800/30 flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
              <Info size={32} />
            </div>
            <h3 className="font-semibold text-xl text-amber-800 dark:text-amber-300 mb-3">No further compression needed</h3>
            <p className="text-amber-700/80 dark:text-amber-400/80 mb-6 text-center leading-relaxed">
              {errorMessage}
            </p>
            <button 
              onClick={() => { setFile(null); handleResetResult(); }}
              className="py-2.5 px-6 rounded-lg font-medium bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors shadow-sm"
            >
              Choose Another PDF
            </button>
          </div>
        )}

        {resultUrl && !isError && (
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 p-8 rounded-2xl border border-green-200 dark:border-green-800/30 shadow-xl flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
            
            <h3 className="font-bold text-2xl text-slate-800 dark:text-slate-100 mb-8">Compression Complete</h3>
            
            <div className="flex items-center justify-between w-full mb-8">
              <div className="text-center flex-1">
                <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Original</div>
                <div className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                  {(originalSize / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              
              <div className="px-4 text-slate-300">
                <ArrowRight size={32} />
              </div>
              
              <div className="text-center flex-1">
                <div className="text-green-600 dark:text-green-400 text-sm font-medium mb-1 uppercase tracking-wider">Compressed</div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {(compressedSize / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
            
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
              <div className="text-sm text-slate-500 mb-1">Total Savings</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {savedPct.toFixed(1)}% <span className="text-slate-400 font-normal">({((originalSize - compressedSize) / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            </div>
          </div>
        )}

        {!processing && !isError && !resultUrl && (
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <FileDown size={32} />
            </div>
            <h3 className="font-semibold text-xl text-slate-800 dark:text-slate-200 mb-2 truncate w-full px-4 text-center">
              {file.name}
            </h3>
            <p className="text-slate-500 font-medium mb-6">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-sm text-slate-400">
              Select a compression level on the right and click "Compress PDF".
            </p>
          </div>
        )}
      </div>
    </PdfWorkspace>
  );
}
