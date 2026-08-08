import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  accept: string;
  maxSizeMB: number;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  title?: string;
  subtitle?: string;
}

export default function FileUploadZone({ 
  accept, 
  maxSizeMB, 
  multiple = false, 
  onFilesSelected,
  title = "Drop files here",
  subtitle
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = (fileList: FileList | File[]) => {
    const validFiles: File[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    // Convert accept string (e.g. "image/png, image/jpeg, .pdf") to an array of rules
    const acceptRules = accept.split(',').map(r => r.trim().toLowerCase());
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Check file size
      if (file.size > maxSizeBytes) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSizeMB}MB.`);
        continue;
      }
      
      // Check type extension
      let isValidType = acceptRules.length === 0 || acceptRules.includes('*/*');
      if (!isValidType) {
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        const fileType = file.type.toLowerCase();
        
        for (const rule of acceptRules) {
          if (rule.startsWith('.')) {
            if (fileExt === rule) {
              isValidType = true;
              break;
            }
          } else if (rule.endsWith('/*')) {
            const baseType = rule.split('/')[0];
            if (fileType.startsWith(baseType + '/')) {
              isValidType = true;
              break;
            }
          } else if (fileType === rule) {
            isValidType = true;
            break;
          }
        }
      }
      
      if (!isValidType) {
        alert(`File ${file.name} is not a valid format. Accepted: ${accept}`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      if (!multiple && validFiles.length > 1) {
        onFilesSelected([validFiles[0]]);
      } else {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  return (
    <div 
      className={cn(
        "flex-1 border border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all duration-150 transform min-h-[300px]",
        isDragging 
          ? "border-primary bg-primary/5 scale-[0.99] shadow-inner" 
          : "border-border bg-card hover:border-foreground"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="bg-secondary p-4 rounded-full mb-4">
        <UploadCloud size={32} className="text-foreground" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-display font-medium mb-2 text-foreground">{title}</h2>
      <p className="text-muted-foreground text-sm font-light mb-6">
        {subtitle || `Max ${maxSizeMB}MB`}
      </p>
      
      <label className="bg-primary text-primary-foreground hover:bg-primary-hover px-6 py-3 rounded-lg font-display font-semibold cursor-pointer transition-colors inline-block text-[14px]">
        Choose File{multiple ? 's' : ''}
        <input 
          type="file" 
          className="hidden" 
          accept={accept} 
          multiple={multiple}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
