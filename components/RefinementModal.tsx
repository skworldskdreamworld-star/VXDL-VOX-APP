
import React, { useState } from 'react';
import Button from './Button';
import { useTranslations } from '../hooks/useTranslations';

interface RefinementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefine: (refinementPrompt: string) => void;
  imageSrc: string | null;
  isRefining: boolean;
}

function RefinementModal({ isOpen, onClose, onRefine, imageSrc, isRefining }: RefinementModalProps) {
  const { t } = useTranslations();
  const [prompt, setPrompt] = useState('');

  if (!isOpen || !imageSrc) {
    return null;
  }

  const handleRefineClick = () => {
    if (prompt.trim()) {
      onRefine(prompt);
    }
  };
  
  const handleEnterKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleRefineClick();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-950/80 border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('refinement_modal_title')}</h2>
          <button 
            onClick={onClose} 
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative aspect-square bg-black/20 rounded-lg overflow-hidden border border-gray-800">
            <img src={imageSrc} alt="Image to refine" className="w-full h-full object-contain" />
          </div>
          
          <div className="flex flex-col space-y-4">
            <div>
              <label htmlFor="refine-prompt" className="block text-sm font-medium text-gray-300 mb-2">
                {t('refinement_modal_instructions_label')}
              </label>
              <textarea
                id="refine-prompt"
                rows={5}
                className="w-full bg-white/5 border border-gray-800 hover:border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent transition-all duration-300"
                placeholder={t('refinement_modal_placeholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleEnterKey}
                disabled={isRefining}
              />
            </div>
            <p className="text-xs text-gray-500">
              {t('refinement_modal_note')}
            </p>
            <div className="flex-grow flex items-end">
              <Button 
                onClick={handleRefineClick} 
                isLoading={isRefining}
                disabled={!prompt.trim() || isRefining}
                title="Apply the refinement to the image"
              >
                {t('refinement_modal_button')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RefinementModal;