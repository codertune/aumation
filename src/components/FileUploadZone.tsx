import React, { useState, useRef } from 'react';
import { Upload, File, X, FileText, AlertCircle } from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  acceptedFormats?: string;
}

export default function FileUploadZone({
  onFileSelect,
  selectedFile,
  onClear,
  acceptedFormats = '.csv,.xlsx,.xls,.pdf'
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024;
    const allowedExtensions = acceptedFormats.split(',').map(f => f.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return false;
    }

    if (!allowedExtensions.includes(fileExtension)) {
      setError(`Invalid file type. Accepted formats: ${acceptedFormats}`);
      return false;
    }

    setError('');
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (selectedFile) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-lg mb-1 truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                {formatFileSize(selectedFile.size)}
              </p>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700 font-medium">Ready for processing</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClear}
            className="w-10 h-10 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 text-red-600" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-4">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragging
                ? 'bg-blue-500 scale-110'
                : 'bg-gradient-to-br from-blue-500 to-purple-600'
            }`}
          >
            <Upload className="h-10 w-10 text-white" />
          </div>

          <div>
            <p className="text-xl font-semibold text-gray-900 mb-2">
              {isDragging ? 'Drop your file here' : 'Upload your file'}
            </p>
            <p className="text-gray-600 mb-1">
              Drag and drop or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: {acceptedFormats.split(',').join(', ')}
            </p>
            <p className="text-xs text-gray-400 mt-1">Maximum file size: 50MB</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
