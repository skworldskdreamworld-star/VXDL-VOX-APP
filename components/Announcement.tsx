
import React from 'react';
import { useTranslations } from '../hooks/useTranslations';

interface AnnouncementProps {
  onClose: () => void;
}

function Announcement({ onClose }: AnnouncementProps) {
  const { t } = useTranslations();

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-950/80 border border-white/20 rounded-2xl p-8 shadow-2xl shadow-black/50 max-w-xl w-full mx-4 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-amber-400">{t('announcement_title')}</h3>
            <p className="mt-4 text-base text-gray-300" dangerouslySetInnerHTML={{ __html: t('announcement_body') }} />
            <p className="mt-6 text-base text-gray-400">
              {t('announcement_cta')}
              <a 
                href="https://vxdepth.site/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {t('announcement_cta_link')}
              </a>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 ml-4 -mt-2 -mr-2"
            aria-label="Dismiss announcement"
            title="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-8 text-center">
            <button 
                onClick={onClose}
                className="bg-white text-black font-semibold py-2 px-8 rounded-lg shadow-sm hover:shadow-md hover:shadow-white/10 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-white/50 transform active:scale-95"
                title="Close this announcement"
            >
                {t('announcement_dismiss_button')}
            </button>
        </div>
      </div>
    </div>
  );
}

export default Announcement;