
import React, { useState, useRef, useEffect } from 'react';
import Spinner from './Spinner';
import { ImageInfo, ImageFilter, UpscaleResolution } from '../types';
import { IMAGE_FILTERS } from '../constants';
import { useTranslations } from '../hooks/useTranslations';

const getCssFilterValue = (filter: ImageFilter | undefined): string => {
  if (!filter || filter === 'None') return 'none';
  switch (filter) {
    case 'Grayscale': return 'grayscale(100%)';
    case 'Sepia': return 'sepia(100%)';
    case 'Invert': return 'invert(100%)';
    case 'Blur': return 'blur(4px)';
    default: return 'none';
  }
};

interface ImageDisplayProps {
  images: ImageInfo[];
  isLoading: boolean;
  error: string | null;
  prompt: string;
  onUpscale: (index: number, resolution: UpscaleResolution) => void;
  upscalingState: { [index: number]: boolean };
  onRefine: (index: number) => void;
  onInpaint: (index: number) => void;
  onApplyFilter: (index: number, filter: ImageFilter) => void;
  disabled?: boolean;
}

function Placeholder() {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-600">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <h3 className="text-xl font-semibold text-gray-400">{t('display_placeholder_title')}</h3>
      <p className="mt-1">{t('display_placeholder_body')}</p>
    </div>
  );
}

function ImageDisplay({ images, isLoading, error, prompt, onUpscale, upscalingState, onRefine, onInpaint, onApplyFilter, disabled = false }: ImageDisplayProps) {
  const { t } = useTranslations();
  const [openFilterMenu, setOpenFilterMenu] = useState<number | null>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [openUpscaleMenu, setOpenUpscaleMenu] = useState<number | null>(null);
  const upscaleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setOpenFilterMenu(null);
      }
      if (upscaleMenuRef.current && !upscaleMenuRef.current.contains(event.target as Node)) {
        setOpenUpscaleMenu(null);
      }
    };
    if (openFilterMenu !== null || openUpscaleMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFilterMenu, openUpscaleMenu]);

  const handleDownload = (imgSrc: string, index: number) => {
    const sanitizedPrompt = prompt
      .slice(0, 50)
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');

    const filename = sanitizedPrompt ? `${sanitizedPrompt}_${index + 1}.jpeg` : `generated_image_${index + 1}.jpeg`;

    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Spinner />
        <p className="mt-4 text-white">{t('display_loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 bg-red-500/10 p-4 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-semibold">{t('display_error_prefix')} {error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return <Placeholder />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in w-full h-full">
      {images.map((imageInfo, index) => {
        const isCurrentlyUpscaling = !!upscalingState[index];
        return (
          <div key={index} className="group relative bg-black/20 rounded-lg overflow-hidden border border-gray-800">
            <img
              src={imageInfo.src}
              alt={`Generated image ${index + 1} from prompt: ${prompt}`}
              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
              style={{ filter: getCssFilterValue(imageInfo.filter) }}
            />
            {isCurrentlyUpscaling && (
              <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center transition-opacity duration-300">
                <Spinner />
                <p className="text-sm mt-2 text-white">{t('display_upscaling')}</p>
              </div>
            )}
            
            {!isCurrentlyUpscaling && <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>}
            
            <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                {imageInfo.upscaledTo && (
                    <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-bold text-white tracking-wider animate-fade-in">
                        {t('display_tag_upscale', { resolution: imageInfo.upscaledTo })}
                    </div>
                )}
                {imageInfo.isRefined && (
                    <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-bold text-white tracking-wider animate-fade-in">
                        {t('display_tag_refined')}
                    </div>
                )}
            </div>

            <div className="absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => handleDownload(imageInfo.src, index)}
                className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white transition-all duration-300 hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-white transform translate-y-2 group-hover:translate-y-0 disabled:opacity-50"
                aria-label="Download image"
                title={t('display_download_tooltip')}
                disabled={isCurrentlyUpscaling || disabled}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              <button
                onClick={() => onRefine(index)}
                className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white transition-all duration-300 hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-white transform translate-y-2 group-hover:translate-y-0 disabled:opacity-50"
                aria-label="Refine image"
                title={t('display_refine_tooltip')}
                disabled={isCurrentlyUpscaling || isLoading || disabled}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
              
              <button
                onClick={() => onInpaint(index)}
                className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white transition-all duration-300 hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-white transform translate-y-2 group-hover:translate-y-0 disabled:opacity-50"
                aria-label="Inpaint image"
                title={t('display_inpaint_tooltip')}
                disabled={isCurrentlyUpscaling || isLoading || disabled}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
              </button>

              <div className="relative">
                <button
                  onClick={() => setOpenFilterMenu(openFilterMenu === index ? null : index)}
                  className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white transition-all duration-300 hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-white transform translate-y-2 group-hover:translate-y-0 disabled:opacity-50"
                  aria-label="Apply filter"
                  title={t('display_filter_tooltip')}
                  disabled={isCurrentlyUpscaling || isLoading || disabled}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1.586l-2.707 2.707a1 1 0 000 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414L8.414 4.586V3a1 1 0 00-1-1H5zM2 12a1 1 0 011-1h1.586l2.707-2.707a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0L4.586 13H3a1 1 0 01-1-1zm15 3a1 1 0 00-1-1h-1.586l-2.707 2.707a1 1 0 000 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414L15.414 16H17a1 1 0 001-1z" clipRule="evenodd" />
                  </svg>
                </button>
                {openFilterMenu === index && (
                  <div 
                      ref={filterMenuRef}
                      className="absolute right-0 mt-2 w-36 bg-gray-900/90 backdrop-blur-md border border-white/20 rounded-lg p-2 animate-fade-in origin-top-right z-10"
                  >
                    <ul className="space-y-1">
                      {IMAGE_FILTERS.map(filter => (
                        <li key={filter}>
                          <button
                            onClick={() => {
                              onApplyFilter(index, filter);
                              setOpenFilterMenu(null);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                              (imageInfo.filter === filter || (!imageInfo.filter && filter === 'None')) ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            {filter}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {imageInfo.upscaledTo !== '4x' && (
                <div className="relative">
                    <button
                        onClick={() => setOpenUpscaleMenu(openUpscaleMenu === index ? null : index)}
                        className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white transition-all duration-300 hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-white transform translate-y-2 group-hover:translate-y-0 disabled:opacity-50"
                        aria-label="Upscale image"
                        title={t('display_upscale_tooltip')}
                        disabled={isCurrentlyUpscaling || isLoading || disabled}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.064 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                    {openUpscaleMenu === index && (
                        <div
                        ref={upscaleMenuRef}
                        className="absolute right-0 mt-2 w-36 bg-gray-900/90 backdrop-blur-md border border-white/20 rounded-lg p-2 animate-fade-in origin-top-right z-10"
                        >
                        <ul className="space-y-1">
                            {imageInfo.upscaledTo !== '2x' && (
                            <li>
                                <button
                                onClick={() => { onUpscale(index, '2x'); setOpenUpscaleMenu(null); }}
                                className="w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors text-gray-300 hover:bg-white/10"
                                >
                                {t('upscale2x')}
                                </button>
                            </li>
                            )}
                            <li>
                            <button
                                onClick={() => { onUpscale(index, '4x'); setOpenUpscaleMenu(null); }}
                                className="w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors text-gray-300 hover:bg-white/10"
                            >
                                {t('upscale4x')}
                            </button>
                            </li>
                        </ul>
                        </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  );
}

export default ImageDisplay;