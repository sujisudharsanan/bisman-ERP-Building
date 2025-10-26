'use client';

import React, { useRef, useState } from 'react';

/* Minimal local SVG icon components to avoid depending on 'lucide-react' */
const Upload = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props} xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 8l-5-5-5 5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 3v12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const X = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props} xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 6l12 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const File = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props} xmlns="http://www.w3.org/2000/svg">
    <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 3v6h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16h.01" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface FileUploadProps {
  label: string;
  accept?: string;
  maxSize?: number; // in MB
  value?: string;
  onChange: (fileUrl: string) => void;
  onError?: (error: string) => void;
  required?: boolean;
  helpText?: string;
}

export default function FileUpload({
  label,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 5,
  value,
  onChange,
  onError,
  required = false,
  helpText,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError('');
    setUploadSuccess(false);

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      const error = `File size exceeds ${maxSize}MB limit`;
      setUploadError(error);
      onError?.(error);
      return;
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    if (!acceptedTypes.includes(fileExtension)) {
      const error = `File type not supported. Accepted types: ${accept}`;
      setUploadError(error);
      onError?.(error);
      return;
    }

    setIsUploading(true);

    try {
      // In a real application, you would upload to your backend/storage
      // For now, we'll simulate an upload and use a data URL
      const reader = new FileReader();
      
      reader.onload = () => {
        // Simulate upload delay
        setTimeout(() => {
          const dataUrl = reader.result as string;
          onChange(dataUrl);
          setIsUploading(false);
          setUploadSuccess(true);
          
          // Clear success message after 3 seconds
          setTimeout(() => setUploadSuccess(false), 3000);
        }, 1000);
      };

      reader.onerror = () => {
        const error = 'Failed to read file';
        setUploadError(error);
        setIsUploading(false);
        onError?.(error);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      const errorMsg = 'Upload failed';
      setUploadError(errorMsg);
      setIsUploading(false);
      onError?.(errorMsg);
    }
  };

  const handleRemoveFile = () => {
    onChange('');
    setUploadSuccess(false);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {!value ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-all duration-200
            ${isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${isUploading ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div className="space-y-3">
            <div className="flex justify-center">
              <Upload className={`w-10 h-10 ${isUploading ? 'animate-pulse' : ''} text-gray-400`} />
            </div>

            {isUploading ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Click to browse</span>
                  {' '}or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {accept.split(',').join(', ')} (max {maxSize}MB)
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <File className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  File uploaded
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Click × to remove
                </p>
              </div>
            </div>

            <button
              onClick={handleRemoveFile}
              className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Remove file"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {uploadSuccess && (
        <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>File uploaded successfully</span>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{uploadError}</span>
        </div>
      )}

      {helpText && !uploadError && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
