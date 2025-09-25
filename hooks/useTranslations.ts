import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import { translations } from '../language/translations';

// Add new language codes here
export type Language = 'en' | 'id' | 'zh' | 'ar' | 'es' | 'fr' | 'de' | 'ja' | 'ru' | 'pt' | 'ko' | 'hi' | 'vi' | 'th';

export const LANGUAGES: { code: Language, name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ja', name: '日本語' },
    { code: 'ru', name: 'Русский' },
    { code: 'pt', name: 'Português' },
    { code: 'ko', name: '한국어' },
    { code: 'hi', name: 'हिन्दी' }, // Hindi for "Indian"
    { code: 'vi', name: 'Tiếng Việt' }, // Vietnamese
    { code: 'th', name: 'ภาษาไทย' }, // Thai
];

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('vox-language') as Language;
    if (savedLanguage && translations[savedLanguage]) {
      return savedLanguage;
    }
  }
  // Always default to English on the first visit, ignoring browser language.
  return 'en';
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vox-language', language);
    }
    document.documentElement.lang = language;
    // Set document direction for RTL languages
    if (language === 'ar') {
        document.documentElement.dir = 'rtl';
    } else {
        document.documentElement.dir = 'ltr';
    }
  }, [language]);

  // FIX: This properly memoizes the entire context value. The `value` object,
  // including the `t` function, is now only recreated when the `language` state
  // changes. This is the correct and robust way to provide context, ensuring
  // that all consuming components reliably re-render when the language is switched,
  // which definitively fixes the real-time translation issue.
  const value = useMemo(() => {
    const t = (key: string, replacements?: { [key: string]: string | number }): string => {
      let translation = translations[language]?.[key] || translations['en'][key] || key;
      if (replacements) {
          Object.keys(replacements).forEach(placeholder => {
              translation = translation.replace(`{{${placeholder}}}`, String(replacements[placeholder]));
          });
      }
      return translation;
    };

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  // FIX: Replaced JSX syntax with `React.createElement`. The file extension is `.ts`, which does not
  // typically support JSX. This change resolves the parsing errors by using the underlying function
  // that JSX compiles to, making the code valid in a standard TypeScript file.
  return React.createElement(LanguageContext.Provider, { value: value }, children);
};

export const useTranslations = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslations must be used within a LanguageProvider');
  }
  return context;
};
