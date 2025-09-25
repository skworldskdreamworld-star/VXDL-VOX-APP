import React, { useEffect, useRef } from 'react';
import { useTranslations } from '../hooks/useTranslations';

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
}

function PromptEditorModal({ isOpen, onClose, prompt, setPrompt }: PromptEditorModalProps) {
  const { t } = useTranslations();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the textarea and move cursor to the end when the modal opens.
      // This should only run when the modal's `isOpen` state changes from false to true.
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        // Use a timeout to ensure the focus and selection happen after the modal is fully rendered.
        setTimeout(() => {
            textarea.setSelectionRange(prompt.length, prompt.length);
        }, 0);
      }
    }
  }, [isOpen]); // FIX: Removed `prompt.length` from the dependency array. This prevents the cursor from jumping to the end on every keystroke or click inside the textarea.

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
    }
  }, [prompt]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-950/80 border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4 animate-fade-in-up flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4 flex-shrink-0">{t('promptEditor_title')}</h2>
        <div className="flex-grow overflow-y-auto no-scrollbar">
            <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none text-lg leading-relaxed"
            placeholder={t('promptEditor_placeholder')}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            />
        </div>
        <div className="mt-6 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="bg-white text-black font-semibold py-2 px-8 rounded-lg shadow-sm hover:shadow-md hover:shadow-white/10 transition-all transform active:scale-95"
          >
            {t('promptEditor_doneButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PromptEditorModal;