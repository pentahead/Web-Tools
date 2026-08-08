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
        "flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all duration-300 transform bg-white dark:bg-slate-900 min-h-[300px]",
        isDragging 
          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99] shadow-inner" 
          : "border-slate-300 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4 transition-transform group-hover:scale-105">
        <UploadCloud size={32} className="text-blue-500" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-200">{title}</h2>
      <p className="text-slate-500 mb-6">
        {subtitle || `Max ${maxSizeMB}MB`}
      </p>
      
      <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors shadow-sm hover:shadow-md inline-block">
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
