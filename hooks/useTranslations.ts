import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
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
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

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

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string, replacements?: { [key: string]: string | number }): string => {
    let translation = translations[language]?.[key] || translations['en'][key] || key;
    if (replacements) {
        Object.keys(replacements).forEach(placeholder => {
            translation = translation.replace(`{{${placeholder}}}`, String(replacements[placeholder]));
        });
    }
    return translation;
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t
  }), [language, setLanguage, t]);

  // Using React.createElement because .ts files don't support JSX syntax.
  return React.createElement(
    LanguageContext.Provider,
    { value: contextValue },
    children
  );
};

export const useTranslations = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslations must be used within a LanguageProvider');
  }
  return context;
};