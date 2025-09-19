import React from 'react';
import { GenerationMode } from '../types';

interface ModeSwitcherProps {
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  disabled?: boolean;
}

function ModeSwitcher({ mode, setMode, disabled }: ModeSwitcherProps) {
  const baseClasses = "px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-gray-950/50";
  const activeClasses = "bg-white text-black shadow-md";
  const inactiveClasses = "bg-white/10 text-gray-300 hover:bg-white/20";

  return (
    <div className="flex w-full p-1 space-x-1 bg-gray-900/80 rounded-lg">
      <button 
        onClick={() => setMode('text-to-image')}
        disabled={disabled}
        className={`${baseClasses} ${mode === 'text-to-image' ? activeClasses : inactiveClasses} w-1/2`}
        aria-pressed={mode === 'text-to-image'}
        title="Generate images from a text description"
      >
        Text-to-Image
      </button>
      <button 
        onClick={() => setMode('image-to-image')}
        disabled={disabled}
        className={`${baseClasses} ${mode === 'image-to-image' ? activeClasses : inactiveClasses} w-1/2`}
        aria-pressed={mode === 'image-to-image'}
        title="Edit an existing image using a text prompt"
      >
        Image-to-Image
      </button>
    </div>
  );
}

export default ModeSwitcher;