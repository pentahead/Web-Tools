import { useState } from 'react';
import { FileDown, Loader2, Download, ArrowRight, Settings2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploadZone from '@/components/shared/FileUploadZone';
import PdfWorkspace from '@/components/pdf/PdfWorkspace';
import { compressPdf, type CompressionPreset, type CompressProgressEvent } from '@/lib/pdf/pdf-compressor';

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
      <div className="flex-1 flex flex-col p-8 md:p-12 bg-background overflow-y-auto">
        <div className="mb-8 flex items-center gap-4 max-w-[1200px] mx-auto w-full">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
            <FileDown size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">Compress PDF</h2>
            <p className="text-[15px] font-light text-muted-foreground">Reduce PDF file size while keeping good quality.</p>
          </div>
        </div>
        
        <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
          <FileUploadZone 
            accept="application/pdf,.pdf"
            maxSizeMB={50}
            multiple={false}
            onFilesSelected={handleFilesSelected}
            title="Drop PDF here"
            subtitle="PDF • Max 50 MB"
          />
        </div>
      </div>
    );
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-card">
      <div className="p-8 flex-1 flex flex-col">
        <h3 className="font-display font-medium text-[16px] mb-8 flex items-center gap-2 text-foreground tracking-tight">
          <Settings2 size={18} className="text-muted-foreground" strokeWidth={1.5} />
          Compression Level
        </h3>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={() => setPreset('max')}
            disabled={processing}
            className={cn(
              "w-full text-left p-5 rounded-[10px] border transition-all text-left group",
              preset === 'max' 
                ? "border-foreground bg-secondary" 
                : "border-border hover:border-muted-foreground bg-background"
            )}
          >
            <div className="font-display font-medium text-[15px] text-foreground mb-1">Small Size</div>
            <div className="text-[13px] font-light text-muted-foreground leading-relaxed">Maximum compression, lower image quality</div>
          </button>
          
          <button
            onClick={() => setPreset('balanced')}
            disabled={processing}
            className={cn(
              "w-full text-left p-5 rounded-[10px] border transition-all text-left group relative",
              preset === 'balanced' 
                ? "border-foreground bg-secondary" 
                : "border-border hover:border-muted-foreground bg-background"
            )}
          >
            <div className="flex justify-between items-center mb-1">
              <div className="font-display font-medium text-[15px] text-foreground">Balanced</div>
              <span className="bg-foreground text-background text-[10px] uppercase tracking-wider px-2 py-1 rounded-[4px] font-display font-semibold">Recommended</span>
            </div>
            <div className="text-[13px] font-light text-muted-foreground leading-relaxed">Good quality, good compression</div>
          </button>
          
          <button
            onClick={() => setPreset('lossless')}
            disabled={processing}
            className={cn(
              "w-full text-left p-5 rounded-[10px] border transition-all text-left group",
              preset === 'lossless' 
                ? "border-foreground bg-secondary" 
                : "border-border hover:border-muted-foreground bg-background"
            )}
          >
            <div className="font-display font-medium text-[15px] text-foreground mb-1">High Quality</div>
            <div className="text-[13px] font-light text-muted-foreground leading-relaxed">Minimal visual degradation, larger output</div>
          </button>
        </div>
      </div>

      <div className="p-8 bg-secondary/30 border-t border-border space-y-3">
        {resultUrl ? (
          <a 
            href={resultUrl}
            download={file.name.replace('.pdf', '-compressed.pdf')}
            className="w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center bg-primary hover:bg-primary-hover text-primary-foreground transition-colors"
          >
            <Download size={18} strokeWidth={2} className="mr-2" />
            Download PDF
          </a>
        ) : (
          <button 
            onClick={handleCompress}
            disabled={processing}
            className="w-full py-4 px-4 rounded-[8px] font-display font-semibold flex items-center justify-center bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground transition-colors"
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
          className="w-full py-3.5 px-4 rounded-[8px] font-display font-medium text-[14px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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
          <div className="w-full max-w-md bg-card p-10 rounded-[12px] border border-border flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin mb-6 text-primary" strokeWidth={1.5} />
            <h3 className="font-display font-medium text-[20px] text-foreground tracking-tight mb-2">Compressing...</h3>
            <p className="text-[14px] font-light text-muted-foreground mb-8">
              {progressEvent?.message || "Analyzing document structure..."}
            </p>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mb-5">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.max(5, progressEvent?.progress || 5)}%` }}
              ></div>
            </div>
            <p className="text-[12px] text-muted-foreground flex items-center justify-center gap-1.5 font-light">
              <Info size={14} strokeWidth={1.5} /> Processing securely in your browser
            </p>
          </div>
        )}

        {isError && (
          <div className="w-full max-w-md bg-card p-10 rounded-[12px] border border-border flex flex-col items-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center text-foreground mb-6">
              <Info size={28} strokeWidth={1.5} />
            </div>
            <h3 className="font-display font-medium text-[20px] text-foreground tracking-tight mb-3">No further compression needed</h3>
            <p className="text-[14px] font-light text-muted-foreground mb-8 text-center leading-relaxed">
              {errorMessage}
            </p>
            <button 
              onClick={() => { setFile(null); handleResetResult(); }}
              className="py-3 px-8 rounded-[8px] font-display font-medium bg-card border border-border text-foreground hover:border-foreground transition-colors"
            >
              Choose Another PDF
            </button>
          </div>
        )}

        {resultUrl && !isError && (
          <div className="w-full max-w-lg bg-card p-10 rounded-[12px] border border-foreground shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col items-center">
            
            <h3 className="font-display font-medium text-[24px] text-foreground tracking-tight mb-10">Compression Complete</h3>
            
            <div className="flex items-center justify-between w-full mb-10">
              <div className="text-center flex-1">
                <div className="text-[10px] font-display font-semibold text-muted-foreground mb-2 uppercase tracking-[0.1em]">Original</div>
                <div className="text-[20px] font-medium text-foreground">
                  {(originalSize / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              
              <div className="px-6 text-border">
                <ArrowRight size={24} strokeWidth={1.5} />
              </div>
              
              <div className="text-center flex-1">
                <div className="text-[10px] font-display font-semibold text-primary mb-2 uppercase tracking-[0.1em]">Compressed</div>
                <div className="text-[28px] font-display font-bold text-primary tracking-tight">
                  {(compressedSize / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
            
            <div className="w-full bg-secondary rounded-[8px] py-4 px-6 flex flex-col items-center justify-center border border-border">
              <div className="text-[11px] font-display font-medium text-muted-foreground uppercase tracking-widest mb-1.5">Total Savings</div>
              <div className="text-[18px] font-medium text-foreground">
                {savedPct.toFixed(1)}% <span className="text-[14px] text-muted-foreground font-light ml-1">({((originalSize - compressedSize) / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            </div>
          </div>
        )}

        {!processing && !isError && !resultUrl && (
          <div className="w-full max-w-md bg-card p-10 rounded-[12px] border border-border flex flex-col items-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center text-foreground mb-6">
              <FileDown size={28} strokeWidth={1.5} />
            </div>
            <h3 className="font-display font-medium text-[20px] text-foreground tracking-tight mb-2 truncate w-full px-4 text-center">
              {file.name}
            </h3>
            <p className="text-[15px] text-foreground font-medium mb-6">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-[14px] font-light text-muted-foreground max-w-[280px]">
              Select a compression level on the right and click "Compress PDF".
            </p>
          </div>
        )}
      </div>
    </PdfWorkspace>
  );
}
