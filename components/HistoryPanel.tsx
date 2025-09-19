
import React from 'react';
import { HistoryItem } from '../types';
import { useTranslations } from '../hooks/useTranslations';

const timeSince = (date: number, t: (key: string, replacements?: { [key: string]: string | number }) => string): string => {
  const seconds = Math.floor((new Date().getTime() - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) {
    return t('history_time_years_ago', { value: Math.floor(interval) });
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return t('history_time_months_ago', { value: Math.floor(interval) });
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return t('history_time_days_ago', { value: Math.floor(interval) });
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return t('history_time_hours_ago', { value: Math.floor(interval) });
  }
  interval = seconds / 60;
  if (interval > 1) {
    return t('history_time_minutes_ago', { value: Math.floor(interval) });
  }
  return t('history_time_now');
};


interface HistoryPanelProps {
    history: HistoryItem[];
    onSelectItem: (item: HistoryItem) => void;
    onClearHistory: () => void;
    disabled?: boolean;
}

function HistoryPanel({ history, onSelectItem, onClearHistory, disabled = false }: HistoryPanelProps) {
  const { t } = useTranslations();

  const handleClearClick = () => {
    if (window.confirm(t('history_clear_confirm'))) {
      onClearHistory();
    }
  };
  
  // FIX: This function safely retrieves the image source URL.
  // History items might store images as strings (for older items) or as ImageInfo objects.
  // This handles both cases to prevent runtime errors and fix the type error.
  const getThumbnailSrc = (image: any): string => {
    if (typeof image === 'string') {
      return image;
    }
    if (image && typeof image.src === 'string') {
      return image.src;
    }
    return '';
  };
  
  return (
    <div className="bg-gray-950/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 id="history-heading" className="text-xl font-bold text-white">{t('history_panel_title')}</h2>
        {history.length > 0 && (
          <button
            onClick={handleClearClick}
            disabled={disabled}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 disabled:opacity-50"
            aria-label={t('history_clear_tooltip')}
            title={t('history_clear_tooltip')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>{t('history_empty')}</p>
        </div>
      ) : (
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
            {history.map(item => (
                <li key={item.id}>
                    <button
                        onClick={() => onSelectItem(item)}
                        disabled={disabled}
                        className="w-full flex items-center space-x-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950/50 focus:ring-white/80 transform active:scale-[0.98]"
                        aria-label={`Reload prompt: ${item.prompt}`}
                        title={t('history_reload_tooltip')}
                    >
                        <div className="relative flex-shrink-0">
                            <img 
                                src={getThumbnailSrc(item.images[0])} 
                                alt="Generated thumbnail"
                                className="w-16 h-16 rounded-lg object-cover bg-gray-800 border border-gray-700"
                                loading="lazy"
                            />
                            {item.generationMode === 'image-to-image' && (
                                <div className="absolute bottom-1 right-1 p-1 bg-black/60 backdrop-blur-sm rounded-full text-white" title={t('history_i2i_tooltip')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-medium text-white truncate" title={item.prompt}>{item.prompt}</p>
                            <p className="text-xs text-gray-400 mt-1">{timeSince(item.timestamp, t)}</p>
                            {item.generationMode === 'text-to-image' && item.settings && (
                                <p className="text-xs text-gray-500 mt-1">{`${t('settings_num_images_label', { count: item.settings.numberOfImages})} • ${item.settings.aspectRatio}`}</p>
                            )}
                        </div>
                    </button>
                </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export default HistoryPanel;