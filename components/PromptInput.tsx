
import React, { useState } from 'react';
import { useTranslations } from '../hooks/useTranslations';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  disabled?: boolean;
  onEnhance: () => void;
  isEnhancing?: boolean;
}

function PromptInput({ prompt, setPrompt, disabled = false, onEnhance, isEnhancing = false }: PromptInputProps) {
  const { t } = useTranslations();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!prompt.trim() || isCopied) return;
    navigator.clipboard.writeText(prompt).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className="w-full relative">
      <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
        {t('prompt_input_label')}
      </label>
      <textarea
        id="prompt"
        rows={4}
        className="w-full bg-white/5 border border-gray-800 hover:border-gray-700 rounded-lg p-4 pr-28 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent transition-all duration-300"
        placeholder={t('prompt_input_placeholder')}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={disabled || isEnhancing}
      />
      <div className="absolute bottom-3 right-3 flex items-center space-x-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={disabled || isEnhancing || !prompt.trim()}
          title={isCopied ? t('prompt_copied') : t('prompt_copy')}
          aria-label="Copy prompt to clipboard"
          className="p-2 bg-gray-800/80 backdrop-blur-sm rounded-full text-white/70 transition-all duration-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800/80"
        >
          {isCopied ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
              <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onEnhance}
          disabled={disabled || isEnhancing || !prompt.trim()}
          title={t('prompt_enhance_tooltip')}
          aria-label="Enhance prompt with AI"
          className="p-2 bg-gray-800/80 backdrop-blur-sm rounded-full text-white/70 transition-all duration-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800/80"
        >
          {isEnhancing ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1.586l-2.707 2.707a1 1 0 000 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414L8.414 4.586V3a1 1 0 00-1-1H5zM2 12a1 1 0 011-1h1.586l2.707-2.707a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0L4.586 13H3a1 1 0 01-1-1zm15 3a1 1 0 00-1-1h-1.586l-2.707 2.707a1 1 0 000 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414L15.414 16H17a1 1 0 001-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default PromptInput;