
import React from 'react';
import { ImageSettings, GenerationModel } from '../types';
import { ASPECT_RATIOS, AVAILABLE_MODELS } from '../constants';
import { useTranslations } from '../hooks/useTranslations';

interface AdvancedSettingsProps {
  settings: ImageSettings;
  setSettings: (settings: ImageSettings) => void;
  disabled?: boolean;
}

function AdvancedSettings({ settings, setSettings, disabled = false }: AdvancedSettingsProps) {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = React.useState(true); // Default to open

  return (
    <div className="w-full bg-white/5 border border-gray-800 rounded-lg p-4 transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left font-semibold text-white p-1 -m-1 rounded-md hover:bg-white/5 transition-colors duration-200"
        disabled={disabled}
        aria-expanded={isOpen}
        title="Toggle advanced settings"
      >
        <span>{t('settings_title')}</span>
        <svg
          className={`w-5 h-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {isOpen && (
        <div className="mt-6 space-y-6">
           <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-2">
              {t('settings_model_label')}
            </label>
            <select
              id="model"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value as GenerationModel })}
              className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent"
              disabled={disabled}
              title="Select the AI model for image generation"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id} className="bg-gray-900">
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          <div className="transition-opacity duration-300 opacity-50">
            <label htmlFor="numImages" className="block text-sm font-medium text-gray-300 mb-2">
              {t('settings_num_images_label', { count: 1 })}
            </label>
            <input
              id="numImages"
              type="range"
              min="1"
              max="4"
              step="1"
              value={1}
              readOnly
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-not-allowed accent-white"
              disabled={true}
              title={t('settings_num_images_tooltip')}
            />
          </div>
          <div className="transition-opacity duration-300 opacity-50">
            <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-2">
              {t('settings_aspect_ratio_label')}
            </label>
            <select
              id="aspectRatio"
              value={settings.aspectRatio}
              className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent"
              disabled={true}
              title={t('settings_aspect_ratio_tooltip')}
            >
              {ASPECT_RATIOS.map((ratio) => (
                <option key={ratio} value={ratio} className="bg-gray-900">
                  {ratio}
                </option>
              ))}
            </select>
          </div>
            <div className="text-xs text-gray-400 -mt-3 text-center animate-fade-in">
              <p>{t('settings_unified_note')}</p>
            </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedSettings;