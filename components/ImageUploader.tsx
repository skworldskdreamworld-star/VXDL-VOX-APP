
import React, { useState, useCallback } from 'react';

interface ImageUploaderProps {
  onImageUpload: (base64: string, file: File) => void;
  onClearImage: () => void;
  inputImage: string | null;
  disabled?: boolean;
  id?: string;
}

function ImageUploader({ onImageUpload, onClearImage, inputImage, disabled, id = 'image-upload' }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageUpload(e.target?.result as string, file);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const onDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled) {
      handleFileChange(e.dataTransfer.files);
    }
  }, [disabled]);
  
  if (inputImage) {
    return (
      <div className="w-full text-center relative animate-fade-in">
        <img src={inputImage} alt="Input preview" className="rounded-lg w-full object-contain max-h-48 border border-gray-700" />
        <button 
          onClick={onClearImage} 
          disabled={disabled}
          className="absolute -top-1 -right-1 bg-gray-800 hover:bg-gray-700 text-white rounded-full p-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white transform hover:scale-110 active:scale-95"
          aria-label="Clear image"
          title="Remove uploaded image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <label
        htmlFor={id}
        className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors duration-300 ${isDragging ? 'border-white' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        title="Upload an image for editing or remixing"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
          </svg>
          <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
        </div>
        <input 
          id={id} 
          type="file" 
          className="hidden" 
          accept="image/png, image/jpeg, image/webp"
          onChange={(e) => handleFileChange(e.target.files)}
          disabled={disabled}
        />
      </label>
    </div>
  );
}

export default ImageUploader;
