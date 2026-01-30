import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

export function FileUpload({ 
  onFileUpload, 
  acceptedTypes = ['.csv', '.txt'],
  maxSizeMB = 50 
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      toast.error(`Invalid file type. Please upload: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);
    onFileUpload(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 cursor-pointer
          transition-all duration-200 text-center
          ${isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary/50 hover:bg-secondary/30'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="ml-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">
                Supports CSV files with OHLCV data
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max {maxSizeMB}MB • {acceptedTypes.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            File ready for processing
          </span>
        </div>
      )}
    </div>
  );
}
