
import React, { useState, useCallback, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import Spinner from './Spinner';
import { COS_STYLE_PRESETS } from '../constants';
import { useTranslations } from '../hooks/useTranslations';
import { editImageFromPrompt } from '../services/geminiService';

const COSPage = () => {
  const { t } = useTranslations();
  
  const [inputImage, setInputImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<(typeof COS_STYLE_PRESETS)[number] | 'custom' | null>(null);
  const [manualPrompt, setManualPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 20 });
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState(0);
  const isCancelledRef = useRef(false);
  
  const handleImageUpload = useCallback((base64: string, file: File) => {
    setInputImage({ base64, mimeType: file.type });
    setGeneratedImages([]);
    setSelectedStyle(null);
    setManualPrompt('');
    setError(null);
    setTokenUsage(0);
  }, []);

  const handleClearImage = useCallback(() => {
    setInputImage(null);
    setGeneratedImages([]);
    setSelectedStyle(null);
    setManualPrompt('');
    setError(null);
    setTokenUsage(0);
  }, []);
  
  const handleGenerate = async () => {
    if (!inputImage || !selectedStyle) return;
    if (selectedStyle === 'custom' && !manualPrompt.trim()) return;

    setIsGenerating(true);
    setGeneratedImages([]);
    setError(null);
    setProgress({ current: 0, total: 20 });
    setTokenUsage(0);
    isCancelledRef.current = false;
    
    const newImages: string[] = [];
    const estimatedTokensPerImage = 300;

    const masterPrompt = selectedStyle === 'custom'
      ? t('gemini_editImage_masterPrompt', { prompt: manualPrompt })
      : t((selectedStyle as (typeof COS_STYLE_PRESETS)[number]).promptId);

    try {
      for (let i = 1; i <= 20; i++) {
        if (isCancelledRef.current) {
          break;
        }
        setProgress({ current: i, total: 20 });
        
        const result = await editImageFromPrompt(masterPrompt, inputImage.base64, inputImage.mimeType);
        
        if (result && result.length > 0) {
          newImages.push(result[0]);
          setGeneratedImages([...newImages]);
          setTokenUsage(prev => prev + estimatedTokensPerImage);
        } else {
          console.warn(`Generation ${i} failed to return an image.`);
        }
      }
    } catch (err) {
      if (isCancelledRef.current) {
        console.log("Generation was cancelled by the user.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsGenerating(false);
  };

  const handleDownloadAll = () => {
    const styleName = (selectedStyle === 'custom' ? 'custom_prompt' : selectedStyle?.name)?.replace(/\s+/g, '_');
    generatedImages.forEach((src, index) => {
      const link = document.createElement('a');
      link.href = src;
      link.download = `cos_variation_${styleName}_${index + 1}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-12 animate-fade-in-up">
        <h1 className="text-5xl font-extrabold text-white">
          <span className="text-cyan-400">COS</span> AI Photoshoot
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
          {t('bridge_cos_description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-gray-950/50 backdrop-blur-xl border border-white/10 rounded-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">1. Upload Your Image</h3>
              <p className="text-sm text-gray-400 mb-4">Upload a clear photo of your subject.</p>
              <ImageUploader 
                onImageUpload={handleImageUpload} 
                onClearImage={handleClearImage}
                inputImage={inputImage?.base64 || null}
                disabled={isGenerating}
                id="cos-image-upload"
              />
            </div>

            {inputImage && (
              <div className="animate-fade-in-up">
                <h3 className="text-xl font-bold text-white mb-1">2. Select a Style or Write a Prompt</h3>
                <p className="text-sm text-gray-400 mb-4">Choose a preset or describe your own edit.</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                  <button
                      key="custom"
                      onClick={() => setSelectedStyle('custom')}
                      disabled={isGenerating}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${selectedStyle === 'custom' ? 'bg-white/10 border-cyan-400' : 'bg-white/5 border-transparent hover:border-white/50'}`}
                  >
                      <p className="font-semibold text-white">{t('cos_custom_prompt_style')}</p>
                      <p className="text-xs text-gray-400">{t('cos_custom_prompt_category')}</p>
                  </button>
                  {COS_STYLE_PRESETS.map(style => (
                    <button
                      key={style.name}
                      onClick={() => setSelectedStyle(style)}
                      disabled={isGenerating}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${selectedStyle && typeof selectedStyle !== 'string' && selectedStyle.name === style.name ? 'bg-white/10 border-cyan-400' : 'bg-white/5 border-transparent hover:border-white/50'}`}
                    >
                      <p className="font-semibold text-white">{t(style.name)}</p>
                      <p className="text-xs text-gray-400">{t(style.category)}</p>
                    </button>
                  ))}
                </div>
                {selectedStyle === 'custom' && (
                  <div className="mt-4 animate-fade-in">
                      <label htmlFor="manual-prompt" className="block text-sm font-medium text-gray-300 mb-2">
                          {t('cos_custom_prompt_label')}
                      </label>
                      <textarea
                          id="manual-prompt"
                          rows={4}
                          className="w-full bg-white/5 border border-gray-800 hover:border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
                          placeholder={t('cos_custom_prompt_placeholder')}
                          value={manualPrompt}
                          onChange={(e) => setManualPrompt(e.target.value)}
                          disabled={isGenerating}
                      />
                  </div>
                )}
              </div>
            )}
            
            {inputImage && selectedStyle && (
                <div className="animate-fade-in-up pt-6 border-t border-white/10">
                    <h3 className="text-xl font-bold text-white mb-1">3. Generate</h3>
                     <p className="text-sm text-gray-400 mb-4">Create 20 unique, high-quality variations.</p>
                    <div className="space-y-2">
                        <Button onClick={handleGenerate} isLoading={isGenerating} disabled={!inputImage || !selectedStyle || (selectedStyle === 'custom' && !manualPrompt.trim()) || isGenerating}>
                            {isGenerating ? `Generating ${progress.current} of ${progress.total}...` : 'Generate 20 Images'}
                        </Button>
                        {isGenerating && (
                            <button 
                                onClick={handleCancel} 
                                className="w-full text-center py-3 px-6 text-sm font-semibold rounded-lg transition-colors bg-red-900/80 text-red-300 hover:bg-red-800/80 border border-red-700/50"
                            >
                                {t('cos_cancel_button')}
                            </button>
                        )}
                    </div>
                    {(tokenUsage > 0 || isGenerating) && (
                        <p className="text-xs text-gray-500 text-center mt-3">
                            {t('cos_token_usage_label')}: <span className="font-mono text-gray-300">{tokenUsage}</span> {t('cos_tokens')}
                        </p>
                    )}
                </div>
            )}
          </div>
          {generatedImages.length > 0 && !isGenerating && (
             <div className="p-6 bg-gray-950/50 backdrop-blur-xl border border-white/10 rounded-2xl animate-fade-in-up">
                <h3 className="text-xl font-bold text-white mb-4">Downloads</h3>
                <Button onClick={handleDownloadAll}>
                  Download All ({generatedImages.length})
                </Button>
            </div>
          )}
        </div>
        
        {/* Results Column */}
        <div className="lg:col-span-2 bg-black/20 rounded-2xl p-4 min-h-[70vh] flex items-center justify-center border border-gray-800">
          {isGenerating && generatedImages.length === 0 && (
             <div className="text-center">
                <Spinner />
                <p className="mt-4 text-white">Starting photoshoot...</p>
              </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full text-red-400 bg-red-500/10 p-4 rounded-lg">
              <p className="font-semibold">{t('display_error_prefix')} {error}</p>
            </div>
          )}

          {!isGenerating && generatedImages.length === 0 && !error && (
            <div className="text-center text-gray-500">
              <p>Your generated images will appear here.</p>
            </div>
          )}

          {generatedImages.length > 0 && (
            <div className="w-full h-full">
              {isGenerating && (
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                      <div className="bg-cyan-400 h-2.5 rounded-full" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                  </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto max-h-[calc(80vh-2rem)] no-scrollbar">
                {generatedImages.map((src, index) => (
                  <div key={index} className="relative aspect-square group animate-fade-in">
                    <img src={src} alt={`Variation ${index + 1}`} className="w-full h-full object-cover rounded-lg bg-gray-800" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <a href={src} download={`cos_variation_${index + 1}.jpeg`} className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-black transition-transform hover:scale-110">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                       </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default COSPage;
