
import React, { useState, useMemo } from 'react';
import { vxplTemplates, PromptTemplate } from '../vxplTemplates';
import { useTranslations } from '../hooks/useTranslations';
import LazyLoadItem from './LazyLoadItem';

// A single template card component.
interface TemplateCardProps {
  template: PromptTemplate;
  isExpanded: boolean;
  onToggle: () => void;
  animationDelay: string;
}

// FIX: Changed to a const arrow function typed with React.FC. This correctly types the
// component to accept special React props like 'key' when used in a list, resolving a TypeScript error.
const TemplateCard: React.FC<TemplateCardProps> = ({ template, isExpanded, onToggle, animationDelay }) => {
  const { t } = useTranslations();
  const [isCopied, setIsCopied] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card from collapsing when the copy button is clicked
    if (!template.prompt || isCopied) return;
    navigator.clipboard.writeText(template.prompt).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const title = t(template.title);
  const description = t(template.description);
  
  return (
    <div 
      className="bg-gray-950/50 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-lg hover:shadow-cyan-400/10 transition-shadow duration-300 animate-fade-in-up"
      style={{ animationDelay }}
    >
      <button 
        onClick={onToggle} 
        className="p-6 w-full text-left flex justify-between items-center gap-4 hover:bg-white/5 transition-colors duration-200"
        aria-expanded={isExpanded}
        aria-controls={`prompt-content-${template.id}`}
      >
        <div className="flex-grow">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
        <div className="flex-shrink-0 p-2 rounded-full" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-6 w-6 text-gray-400 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {isExpanded && (
        <div
          id={`prompt-content-${template.id}`}
          className="px-6 pb-6 pt-4 border-t border-white/10 animate-fade-in-up"
        >
          <div className="bg-black/30 p-4 rounded-lg relative group">
            <p className="text-sm text-gray-300 font-mono selectable-text leading-relaxed break-words">
              {template.prompt}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              title={isCopied ? t('vxplCopied') : t('vxplCopyPrompt')}
              aria-label={t('vxplCopyAriaLabel')}
              className="absolute top-2 right-2 p-2 bg-gray-800/80 backdrop-blur-sm rounded-full text-white/70 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gray-700 hover:text-white focus:opacity-100"
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
          </div>
        </div>
      )}
    </div>
  );
}

function VXPLPage() {
    const { t } = useTranslations();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleToggleExpand = (templateId: string) => {
        setExpandedId(prevId => (prevId === templateId ? null : templateId));
    };

    const getTranslatedCategory = (category: string) => {
        const key = `vxplCategory${category.replace(/[^a-zA-Z]/g, '')}`;
        return t(key);
    };

    const filteredTemplates = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase().trim();
        if (!lowercasedQuery) return vxplTemplates;

        return vxplTemplates.filter(template => {
            const translatedTitle = t(template.title).toLowerCase();
            const translatedDescription = t(template.description).toLowerCase();
            const translatedCategory = getTranslatedCategory(template.category).toLowerCase();

            const originalTitle = template.title.toLowerCase();
            const originalDescription = template.description.toLowerCase();
            const originalCategory = template.category.toLowerCase();

            return translatedTitle.includes(lowercasedQuery) ||
                   translatedDescription.includes(lowercasedQuery) ||
                   translatedCategory.includes(lowercasedQuery) ||
                   originalTitle.includes(lowercasedQuery) ||
                   originalDescription.includes(lowercasedQuery) ||
                   originalCategory.includes(lowercasedQuery);
        });
    }, [searchQuery, t]);
    
    const categories = useMemo(() => {
        return filteredTemplates.reduce((acc, template) => {
            (acc[template.category] = acc[template.category] || []).push(template);
            return acc;
        }, {} as Record<string, PromptTemplate[]>);
    }, [filteredTemplates]);
    
    const categoryOrder = [
        'Professional',
        'Photography',
        'Utility',
        'Character Design',
        'VXDL PERSONA',
        'Environment & Worlds',
        'Artistic',
        'UI & Icons',
        'Abstract & Sci-Fi',
        'Creative & Fun'
    ];

    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12 animate-fade-in-up">
                <h1 className="text-5xl font-extrabold text-white">
                    <span className="text-cyan-400">VXPL</span> {t('vxplTitle')}
                </h1>
                <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
                    {t('vxplDescription')}
                </p>
                <div className="mt-6 max-w-2xl mx-auto p-3 bg-cyan-900/40 border border-cyan-400/30 rounded-lg text-center text-sm">
                  <p className="text-gray-300">
                      More complex example library context : {' '}
                      <a
                          href="https://github.com/PicoTrex/Awesome-Nano-Banana-images/blob/main/README_en.md"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-cyan-400 hover:underline"
                      >
                          click here
                      </a>.
                  </p>
              </div>
            </div>

            <div className="mb-12 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('vxplSearchPlaceholder')}
                className="w-full bg-gray-900/70 backdrop-blur-sm border border-white/10 rounded-full py-3 px-6 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300"
                aria-label="Search prompt templates"
              />
            </div>

            {filteredTemplates.length > 0 ? (
                <div className="space-y-12">
                    {categoryOrder.map(category => (
                        categories[category] && (
                            <LazyLoadItem key={category} placeholderHeight="500px">
                                <section>
                                    <h2 
                                        className="text-3xl font-bold text-white mb-6 border-b-2 border-white/20 pb-3"
                                    >
                                        {getTranslatedCategory(category)}
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {categories[category].map((template, index) => (
                                            <TemplateCard
                                                key={template.id}
                                                template={template}
                                                isExpanded={expandedId === template.id}
                                                onToggle={() => handleToggleExpand(template.id)}
                                                animationDelay={`${index * 75}ms`}
                                            />
                                        ))}
                                    </div>
                                </section>
                            </LazyLoadItem>
                        )
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-16 animate-fade-in">
                    <p className="text-xl">{t('vxplNoResults')}</p>
                </div>
            )}
        </div>
    );
}

// FIX: Added a default export to make the component available for import in other files.
export default VXPLPage;