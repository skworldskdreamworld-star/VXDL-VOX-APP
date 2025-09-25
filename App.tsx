
import React from 'react';
import { useState } from 'react';
import PromptInput from './components/PromptInput';
import AdvancedSettings from './components/AdvancedSettings';
import Button from './components/Button';
import ImageDisplay from './components/ImageDisplay';
import HistoryPanel from './components/HistoryPanel';
import ModeSwitcher from './components/ModeSwitcher';
import ImageUploader from './components/ImageUploader';
import RefinementModal from './components/RefinementModal';
import InpaintingModal from './components/InpaintingModal';
import Announcement from './components/Announcement';
import { generateImagesFromPrompt, editImageFromPrompt, upscaleImage, enhancePrompt, refineImage, inpaintImage } from './services/geminiService';
import type { ImageSettings, HistoryItem, GenerationMode, ImageInfo, ImageFilter, UpscaleResolution } from './types';
import { useTranslations } from './hooks/useTranslations';

interface AppProps {
  history: HistoryItem[];
  addToHistory: (item: HistoryItem) => void;
  updateHistoryItem: (itemId: string, updatedImages: ImageInfo[]) => void;
  clearHistory: () => void;
}

// FIX: Added 'export default' to the function definition. This fixes an error where
// the 'App' component was not being exported, causing an import failure in 'Root.tsx'.
// Now, 'App' is correctly exposed as the default export of this module.
export default function App({ history, addToHistory, updateHistoryItem, clearHistory }: AppProps) {
  const { t } = useTranslations();

  const [prompt, setPrompt] = useState<string>('');
  const [settings, setSettings] = useState<ImageSettings>({
    numberOfImages: 1,
    aspectRatio: "1:1",
    model: 'vxdl-1-fused',
  });
  const [generatedImages, setGeneratedImages] = useState<ImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [generationMode, setGenerationMode] = useState<GenerationMode>('text-to-image');
  const [inputImage, setInputImage] = useState<{base64: string; mimeType: string} | null>(null);

  const [upscalingState, setUpscalingState] = useState<{ [index: number]: boolean }>({});
  const [activeHistoryItemId, setActiveHistoryItemId] = useState<string | null>(null);
  
  const [refinementState, setRefinementState] = useState<{ isOpen: boolean; imageIndex: number | null; imageSrc: string | null }>({ isOpen: false, imageIndex: null, imageSrc: null });
  const [isRefining, setIsRefining] = useState<boolean>(false);
  
  const [inpaintingState, setInpaintingState] = useState<{ isOpen: boolean; imageIndex: number | null; imageSrc: string | null }>({ isOpen: false, imageIndex: null, imageSrc: null });
  const [isInpainting, setIsInpainting] = useState<boolean>(false);
  
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  
  const isVxdlOutdated = true;
  
  const handleCloseAnnouncement = () => {
    setShowAnnouncement(false);
  };
  
  const handleImageUpload = (base64: string, file: File) => {
    setInputImage({ base64, mimeType: file.type });
  };
  
  const handleClearImage = () => {
    setInputImage(null);
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
  
    setIsEnhancing(true);
    setError(null);
  
    try {
      const enhanceSystemInstruction = t('gemini_enhancePrompt_systemInstruction');
      const enhanced = await enhancePrompt(prompt, enhanceSystemInstruction);
      setPrompt(enhanced);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message); 
      } else {
        setError("An unexpected error occurred while enhancing the prompt.");
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }
    if (generationMode === 'image-to-image' && !inputImage) {
      setError("Please upload an image to edit.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      let images: string[] = [];
      let seed: number | undefined;
      let newHistoryItem: HistoryItem;

      if (generationMode === 'text-to-image') {
        let finalPrompt = prompt;
        if (settings.model === 'vxdl-1-fused') {
            const enhanceSystemInstruction = t('gemini_enhancePrompt_systemInstruction');
            finalPrompt = await enhancePrompt(prompt, enhanceSystemInstruction);
        }
        const vxdlUltraSystemInstruction = settings.model === 'gemini-2.5-flash-image-preview' ? t('gemini_vxdlUltra_systemInstruction') : undefined;
        const aspectRatioTextTemplate = t('gemini_aspectRatio_text');
        // FIX: Correctly handle the object returned by `generateImagesFromPrompt`.
        // The service returns an object `{ images: string[], seed: number }`, not just a string array.
        // This destructuring fixes the type error.
        const { images: resultImages, seed: resultSeed } = await generateImagesFromPrompt(finalPrompt, settings, vxdlUltraSystemInstruction, aspectRatioTextTemplate);
        images = resultImages;
        seed = resultSeed;
      } else { // image-to-image
        if (!inputImage) throw new Error("Input image is missing.");
        const masterPrompt = t('gemini_editImage_masterPrompt', { prompt });
        // FIX: Correctly handle the object returned by `editImageFromPrompt`.
        // The service returns an object `{ images: string[], seed: number }`, not just a string array.
        // This destructuring fixes the type error.
        const { images: resultImages, seed: resultSeed } = await editImageFromPrompt(masterPrompt, inputImage.base64, inputImage.mimeType);
        images = resultImages;
        seed = resultSeed;
      }
      
      const imageInfos: ImageInfo[] = images.map(src => ({ src, isRefined: false }));
      
      newHistoryItem = {
        id: new Date().toISOString(),
        prompt,
        settings,
        images: imageInfos,
        timestamp: Date.now(),
        generationMode,
        inputImage: generationMode === 'image-to-image' ? inputImage?.base64 : undefined,
        seed,
      };
      
      setGeneratedImages(imageInfos);
      setActiveHistoryItemId(newHistoryItem.id);
      addToHistory(newHistoryItem);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpscaleImage = async (imageIndex: number, resolution: UpscaleResolution) => {
    if (!activeHistoryItemId) return;
    
    setUpscalingState(prev => ({ ...prev, [imageIndex]: true }));
    setError(null);
    
    try {
      const imageToUpscale = generatedImages[imageIndex];
      const upscalePrompt = resolution === '2x' 
        ? t('gemini_upscale_2x_prompt') 
        : t('gemini_upscale_4x_prompt');
      const upscaledImageSrc = await upscaleImage(imageToUpscale.src, resolution, upscalePrompt);

      const updatedImageInfo: ImageInfo = { ...imageToUpscale, src: upscaledImageSrc, upscaledTo: resolution };
      delete (updatedImageInfo as any).isUpscaled; // Ensure legacy property is removed

      const updatedGeneratedImages = generatedImages.map((img, idx) =>
        idx === imageIndex ? updatedImageInfo : img
      );
      setGeneratedImages(updatedGeneratedImages);
      updateHistoryItem(activeHistoryItemId, updatedGeneratedImages);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during upscaling.");
      }
    } finally {
      setUpscalingState(prev => ({ ...prev, [imageIndex]: false }));
    }
  };
  
  const handleOpenRefinementModal = (imageIndex: number) => {
    setRefinementState({
      isOpen: true,
      imageIndex,
      imageSrc: generatedImages[imageIndex].src,
    });
  };

  const handleCloseRefinementModal = () => {
    setRefinementState({ isOpen: false, imageIndex: null, imageSrc: null });
  };
  
  const handleRefineImage = async (refinementPrompt: string) => {
    if (refinementState.imageIndex === null || !activeHistoryItemId) {
      setError("Cannot refine image: state is invalid.");
      return;
    }
    
    const imageIndex = refinementState.imageIndex;
    
    setIsRefining(true);
    setError(null);
    
    try {
      const imageToRefine = generatedImages[imageIndex];
      const masterPrompt = t('gemini_refine_masterPrompt', { prompt: refinementPrompt });
      const refinedImageSrc = await refineImage(imageToRefine.src, masterPrompt);

      const updatedImageInfo: ImageInfo = { ...imageToRefine, src: refinedImageSrc, isRefined: true };

      const updatedGeneratedImages = generatedImages.map((img, idx) =>
        idx === imageIndex ? updatedImageInfo : img
      );
      setGeneratedImages(updatedGeneratedImages);
      updateHistoryItem(activeHistoryItemId, updatedGeneratedImages);
      
      handleCloseRefinementModal();

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        // Display error in modal in a future update
      } else {
        setError("An unexpected error occurred during refinement.");
      }
    } finally {
      setIsRefining(false);
    }
  };

  const handleOpenInpaintingModal = (imageIndex: number) => {
    setInpaintingState({
      isOpen: true,
      imageIndex,
      imageSrc: generatedImages[imageIndex].src,
    });
  };

  const handleCloseInpaintingModal = () => {
    setInpaintingState({ isOpen: false, imageIndex: null, imageSrc: null });
  };
  
  const handleInpaintImage = async (maskBase64: string, inpaintPrompt: string) => {
    if (inpaintingState.imageIndex === null || !activeHistoryItemId) {
      setError("Cannot inpaint image: state is invalid.");
      return;
    }
    
    const imageIndex = inpaintingState.imageIndex;
    
    setIsInpainting(true);
    setError(null);
    
    try {
      const imageToInpaint = generatedImages[imageIndex];
      const mimeType = imageToInpaint.src.substring(imageToInpaint.src.indexOf(':') + 1, imageToInpaint.src.indexOf(';'));

      const masterPrompt = t('gemini_inpaint_masterPrompt', { prompt: inpaintPrompt });
      const inpaintedImages = await inpaintImage(imageToInpaint.src, maskBase64, mimeType, masterPrompt);

      if (inpaintedImages.length === 0) {
        throw new Error("Inpainting failed to return an image.");
      }
      
      const inpaintedImageSrc = inpaintedImages[0];
      const updatedImageInfo: ImageInfo = { ...imageToInpaint, src: inpaintedImageSrc, isRefined: true };

      const updatedGeneratedImages = generatedImages.map((img, idx) =>
        idx === imageIndex ? updatedImageInfo : img
      );
      setGeneratedImages(updatedGeneratedImages);
      updateHistoryItem(activeHistoryItemId, updatedGeneratedImages);
      
      handleCloseInpaintingModal();

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during inpainting.");
      }
    } finally {
      setIsInpainting(false);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    const imageInfos: ImageInfo[] = (item.images as any[]).map((img: any) => {
      if (typeof img === 'string') {
        return {
          src: img,
          isRefined: false,
        };
      }
      
      const newImgInfo = {
        isRefined: false,
        ...img,
      };
      delete (newImgInfo as any).isUpscaled; // Remove legacy property
      return newImgInfo;
    });

    setGenerationMode(item.generationMode);
    setPrompt(item.prompt);
    
    const restoredSettings: ImageSettings = {
        numberOfImages: 1,
        aspectRatio: '1:1',
        model: 'imagen-4.0-generate-001',
        ...item.settings,
    };
    setSettings(restoredSettings);
    
    setGeneratedImages(imageInfos);
    setActiveHistoryItemId(item.id);

    if (item.generationMode === 'image-to-image' && item.inputImage) {
      const mimeType = item.inputImage.substring(item.inputImage.indexOf(':') + 1, item.inputImage.indexOf(';'));
      setInputImage({ base64: item.inputImage, mimeType: mimeType });
    } else {
      setInputImage(null);
    }
    
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyFilter = (imageIndex: number, filter: ImageFilter) => {
    const updatedGeneratedImages = generatedImages.map((image, idx) => {
      if (idx === imageIndex) {
        const newImage = { ...image };
        if (filter === 'None') {
          delete newImage.filter;
        } else {
          newImage.filter = filter;
        }
        return newImage;
      }
      return image;
    });
    setGeneratedImages(updatedGeneratedImages);

    if (activeHistoryItemId) {
      updateHistoryItem(activeHistoryItemId, updatedGeneratedImages);
    }
  };

  const isGenerateDisabled = !prompt.trim() || isEnhancing || (generationMode === 'image-to-image' && !inputImage);
  const buttonText = generationMode === 'text-to-image' ? t('app_generate_button') : t('app_remix_button');

  return (
    <>
        {showAnnouncement && <Announcement onClose={handleCloseAnnouncement} />}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Controls Column */}
          <fieldset disabled={isVxdlOutdated} className="lg:col-span-1 space-y-6">
            <legend className="sr-only">Image Generation Controls</legend>
            <ModeSwitcher mode={generationMode} setMode={setGenerationMode} disabled={isLoading} />
            
            {generationMode === 'image-to-image' && (
              <ImageUploader 
                onImageUpload={handleImageUpload} 
                onClearImage={handleClearImage}
                inputImage={inputImage?.base64 || null}
                disabled={isLoading}
              />
            )}
            
            <PromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              disabled={isLoading}
              onEnhance={handleEnhancePrompt}
              isEnhancing={isEnhancing}
            />
            <AdvancedSettings
              settings={settings}
              setSettings={setSettings}
              disabled={isLoading || generationMode === 'image-to-image'}
            />
            <Button onClick={handleGenerate} isLoading={isLoading} disabled={isGenerateDisabled}>
              {buttonText}
            </Button>
          </fieldset>

          {/* Display Column */}
          <div className="lg:col-span-2 bg-black/20 rounded-2xl p-4 min-h-[50vh] flex items-center justify-center border border-gray-800">
            <ImageDisplay
              images={generatedImages}
              isLoading={isLoading}
              error={error}
              prompt={prompt}
              onUpscale={handleUpscaleImage}
              upscalingState={upscalingState}
              onRefine={handleOpenRefinementModal}
              onInpaint={handleOpenInpaintingModal}
              onApplyFilter={handleApplyFilter}
              disabled={isVxdlOutdated}
            />
          </div>
        </main>

        {/* History Panel below main content */}
        <section className="mt-16" aria-labelledby="history-heading">
          <HistoryPanel history={history} onSelectItem={handleSelectHistoryItem} onClearHistory={clearHistory} disabled={isVxdlOutdated}/>
        </section>
        
        {refinementState.isOpen && (
            <RefinementModal 
                isOpen={refinementState.isOpen}
                onClose={handleCloseRefinementModal}
                onRefine={handleRefineImage}
                imageSrc={refinementState.imageSrc}
                isRefining={isRefining}
            />
        )}
        
        {inpaintingState.isOpen && (
          <InpaintingModal
            isOpen={inpaintingState.isOpen}
            onClose={handleCloseInpaintingModal}
            onInpaint={handleInpaintImage}
            imageSrc={inpaintingState.imageSrc}
            isInpainting={isInpainting}
          />
        )}
    </>
  );
}