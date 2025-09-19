
import React, { useState, useRef, useEffect } from 'react';
import { useTranslations, Language, LANGUAGES } from '../hooks/useTranslations';

function LanguageSelector() {
  const { language, setLanguage } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === language);

  return (
    <div ref={selectorRef} className="absolute top-4 right-4 z-10">
      <button
        onClick={() => setIsOpen(p => !p)}
        className="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-full border border-white/10 text-white/70 hover:text-white transition-colors px-4 h-10"
        title="Change language"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM6.32 5.035A6.002 6.002 0 0110 4c1.536 0 2.93.576 3.995 1.503l-1.353 1.353A4.002 4.002 0 0010 6a4 4 0 00-2.828 1.172L6.32 5.035zM4 10c0-1.536.576-2.93 1.503-3.995l1.353 1.353A4.002 4.002 0 006 10a4 4 0 001.172 2.828L5.503 14.497A5.996 5.996 0 014 10zm2.497 4.497l1.353-1.353A4.002 4.002 0 0010 14a4 4 0 002.828-1.172l1.353 1.353A5.996 5.996 0 0110 16c-1.536 0-2.93-.576-3.995-1.503L6.497 14.497z" />
        </svg>
        <span className="text-sm font-semibold">{currentLang?.code.toUpperCase()}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 max-h-60 overflow-y-auto no-scrollbar bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg p-1 animate-fade-in origin-top-right">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code as Language); setIsOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${language === lang.code ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
