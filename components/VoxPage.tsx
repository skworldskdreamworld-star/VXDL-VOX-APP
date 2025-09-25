
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateImagesFromPrompt, editImageFromPrompt, upscaleImage, combineImages, generateCreativePrompt, generateVariations, reframeImage, generateVideo, changeImageViewpoint, analyzeImageForSuggestions, suggestNegativePrompt, analyzeImageStyle, inpaintImage, generateVisualPromptFromImage } from '../services/geminiService';
import { ImageSettings, GenerationModel, AspectRatio, HistoryItem, ImageInfo, VoxSettings, UpscaleResolution, GenerationMode } from '../types';
import { AVAILABLE_MODELS, STYLE_PRESETS, DETAIL_LEVELS, ASPECT_RATIOS } from '../constants';
import Spinner from './Spinner';
import KnowledgeBaseModal from './KnowledgeBaseModal';
import { useTranslations } from '../hooks/useTranslations';
import PromptEditorModal from './PromptEditorModal';

const MAX_HISTORY_ITEMS = 10;
const MAX_UNDO_STACK_SIZE = 20;
const VOX_AUTOSAVE_KEY = 'voxAutoSaveState';
const VOX_SETTINGS_KEY = 'voxFineTuneSettings';
const PROMPT_LENGTH_THRESHOLD = 120;


// Defines the shape of the state object for the undo/redo system.
interface VoxState {
  prompt: string;
  bgUrl1: string | null;
  bgUrl2: string | null;
  isBg1Active: boolean;
  currentImage: { base64: string; mimeType: string; } | null;
  activeHistoryItemId: string | null;
  uploadedImages: { base64: string; mimeType: string; }[];
  negativePrompt: string;
  activeStyles: string[]; // Set is converted to Array for serialization
  detailIntensity: number;
  selectedAspectRatio: AspectRatio | 'auto';
  imageDimensions: { width: number, height: number } | null;
  currentVideoUrl: string | null;
  seed: string;
  lastSeed: number | null;
}


const timeSince = (date: number): string => {
  const seconds = Math.floor((new Date().getTime() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
};

// Safely retrieves the image source URL from a history item's image data.
// Handles both modern ImageInfo objects and legacy raw string URLs.
const getThumbnailSrc = (image: any): string => {
  if (typeof image === 'string') {
    return image;
  }
  if (image && typeof image.src === 'string') {
    return image.src;
  }
  return '';
};

const SmallSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface VoxPageProps {
  history: HistoryItem[];
  addToHistory: (item: HistoryItem) => void;
  updateHistoryItem: (itemId: string, updatedImages: ImageInfo[]) => void;
  clearHistory: () => void;
  deleteHistoryItems: (ids: Set<string>) => void;
}

function VoxPage({ history, addToHistory, updateHistoryItem, clearHistory, deleteHistoryItems }: VoxPageProps) {
  const { t } = useTranslations();
  
  // Core State
  const [prompt, setPrompt] = useState('');
  const [bgUrl1, setBgUrl1] = useState<string | null>(null);
  const [bgUrl2, setBgUrl2] = useState<string | null>(null);
  const [isBg1Active, setIsBg1Active] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<{ base64: string; mimeType: string; } | null>(null);
  const [activeHistoryItemId, setActiveHistoryItemId] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number; } | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [conversationalResponse, setConversationalResponse] = useState<string | null>(null);
  
  // Input & Uploads
  const [uploadedImages, setUploadedImages] = useState<{ base64: string; mimeType: string; }[]>([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set<number>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFineTunePanelOpen, setIsFineTunePanelOpen] = useState(true);
  const [isActionsPanelOpen, setIsActionsPanelOpen] = useState(true);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const [isUpscalePanelOpen, setIsUpscalePanelOpen] = useState(false);
  const upscalePanelRef = useRef<HTMLDivElement>(null);
  const [isReframePanelOpen, setIsReframePanelOpen] = useState(false);
  const reframePanelRef = useRef<HTMLDivElement>(null);
  const [isHistoryFullWarningVisible, setIsHistoryFullWarningVisible] = useState(false);
  const [selectedHistoryImages, setSelectedHistoryImages] = useState(new Set<string>());
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [is360View, setIs360View] = useState(false);
  const [perspectiveTransform, setPerspectiveTransform] = useState({});
  const [showGenerativeUI, setShowGenerativeUI] = useState(true);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [isUploadNoticeVisible, setIsUploadNoticeVisible] = useState(false);


  // Fine-tuning State
  const [selectedModel, setSelectedModel] = useState<GenerationModel>('vxdl-1-fused');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());
  const [detailIntensity, setDetailIntensity] = useState(3);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | 'auto'>('auto');
  const [styleReferenceImage, setStyleReferenceImage] = useState<{ base64: string; mimeType: string; } | null>(null);
  const [seed, setSeed] = useState<string>('');
  const [lastSeed, setLastSeed] = useState<number | null>(null);
  const [isSeedCopied, setIsSeedCopied] = useState(false);

  // Async Action State
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isReframing, setIsReframing] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
  const [isChangingViewpoint, setIsChangingViewpoint] = useState(false);
  const [viewpointDirection, setViewpointDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [isSuggestingNegatives, setIsSuggestingNegatives] = useState(false);
  const [isAnalyzingScene, setIsAnalyzingScene] = useState(false);
  const [isGeneratingVxog, setIsGeneratingVxog] = useState(false);
  
  // VXOG State
  const [vxogPrompt, setVxogPrompt] = useState<string | null>(null);
  const [isVxogCopied, setIsVxogCopied] = useState(false);

  // Canvas Transform State
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [pinchStartDistance, setPinchStartDistance] = useState<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [isZoomPanelOpen, setIsZoomPanelOpen] = useState(false);
  
  // Session & History State
  const [tokenUsage, setTokenUsage] = useState({ last: 0, session: 0 });
  const [isTokenUsageVisible, setIsTokenUsageVisible] = useState(false);
  const [undoStack, setUndoStack] = useState<VoxState[]>([]);
  const [redoStack, setRedoStack] = useState<VoxState[]>([]);
  const [autoSaveState, setAutoSaveState] = useState<VoxState | null>(null);

  // Inpainting State
  const [isInpaintingMode, setIsInpaintingMode] = useState(false);
  const [inpaintingPrompt, setInpaintingPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isInpaintingLoading, setIsInpaintingLoading] = useState(false);
  const inpaintingCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Renders model's conversational responses with simple markdown (bold).
  const renderFormattedText = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index} className="font-bold">{part}</strong> : part
    );
  };

  // --- SESSION MANAGEMENT & STATE PERSISTENCE ---
  
  useEffect(() => {
    try {
      const noticeDismissed = sessionStorage.getItem('voxUploadNoticeDismissed');
      if (!noticeDismissed) {
        setIsUploadNoticeVisible(true);
      }
    } catch (e) {
      console.error("Could not access session storage:", e);
    }
  }, []);

  const handleDismissUploadNotice = () => {
    setIsUploadNoticeVisible(false);
    try {
      sessionStorage.setItem('voxUploadNoticeDismissed', 'true');
    } catch (e) {
      console.error("Could not access session storage:", e);
    }
  };

  const captureState = useCallback((): VoxState => ({
    prompt, bgUrl1, bgUrl2, isBg1Active, currentImage, activeHistoryItemId,
    uploadedImages, negativePrompt, activeStyles: Array.from(activeStyles),
    detailIntensity, selectedAspectRatio, imageDimensions, currentVideoUrl,
    seed, lastSeed,
  }), [prompt, bgUrl1, bgUrl2, isBg1Active, currentImage, activeHistoryItemId, uploadedImages, negativePrompt, activeStyles, detailIntensity, selectedAspectRatio, imageDimensions, currentVideoUrl, seed, lastSeed]);

  const restoreState = useCallback((state: VoxState | null) => {
    if (!state) return;
    setPrompt(state.prompt);
    setBgUrl1(state.bgUrl1);
    setBgUrl2(state.bgUrl2);
    setIsBg1Active(state.isBg1Active);
    setCurrentImage(state.currentImage);
    setActiveHistoryItemId(state.activeHistoryItemId);
    setUploadedImages(state.uploadedImages);
    setNegativePrompt(state.negativePrompt);
    setActiveStyles(new Set(state.activeStyles));
    setDetailIntensity(state.detailIntensity);
    setSelectedAspectRatio(state.selectedAspectRatio);
    setImageDimensions(state.imageDimensions);
    setCurrentVideoUrl(state.currentVideoUrl);
    setSeed(state.seed);
    setLastSeed(state.lastSeed);
    resetTransform();
    setIsPanelExpanded(!!state.bgUrl1 || !!state.bgUrl2 || !!state.currentVideoUrl);
  }, []);

  const saveCurrentSession = useCallback((state: VoxState) => {
    try {
        const liteState = { ...state, uploadedImages: [], currentImage: null, bgUrl1: null, bgUrl2: null, currentVideoUrl: null };
        sessionStorage.setItem(VOX_AUTOSAVE_KEY, JSON.stringify(liteState));
    } catch (e) {
        console.error("An unexpected error occurred during auto-save:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(VOX_SETTINGS_KEY);
      if (savedSettings) {
        const { negativePrompt, activeStyles, detailIntensity, selectedAspectRatio } = JSON.parse(savedSettings);
        if (negativePrompt) setNegativePrompt(negativePrompt);
        if (activeStyles) setActiveStyles(new Set(activeStyles));
        if (detailIntensity) setDetailIntensity(detailIntensity);
        if (selectedAspectRatio) setSelectedAspectRatio(selectedAspectRatio);
      }
    } catch (e) { console.error("Failed to load persistent settings:", e); }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VOX_SETTINGS_KEY, JSON.stringify({
        negativePrompt, activeStyles: Array.from(activeStyles), detailIntensity, selectedAspectRatio
      }));
    } catch (e) { console.error("Failed to save persistent settings:", e); }
  }, [negativePrompt, activeStyles, detailIntensity, selectedAspectRatio]);

  useEffect(() => {
    const hasContent = prompt || bgUrl1 || currentImage || currentVideoUrl;
    if (!hasContent) {
        try { sessionStorage.removeItem(VOX_AUTOSAVE_KEY); } catch (e) { console.error("Failed to clear auto-save state.", e); }
        return;
    }
    const intervalId = setInterval(() => saveCurrentSession(captureState()), 60000);
    return () => clearInterval(intervalId);
  }, [captureState, saveCurrentSession, prompt, bgUrl1, currentImage, currentVideoUrl]);

  useEffect(() => {
    try {
      const savedStateJSON = sessionStorage.getItem(VOX_AUTOSAVE_KEY);
      if (savedStateJSON) setAutoSaveState(JSON.parse(savedStateJSON));
    } catch (e) { console.error("Failed to load auto-saved state:", e); }
  }, []);

  const clearAutoSave = () => { sessionStorage.removeItem(VOX_AUTOSAVE_KEY); setAutoSaveState(null); };
  const handleRestoreSession = () => { restoreState(autoSaveState); clearAutoSave(); };

  const saveStackToSessionStorage = useCallback((key: string, stack: VoxState[]) => {
    try { sessionStorage.setItem(key, JSON.stringify(stack.map(s => ({...s, bgUrl1: null, bgUrl2: null, currentImage: null, currentVideoUrl: null, uploadedImages: []})))); } catch (e) { console.error(`Failed to save ${key} to session storage`, e); }
  }, []);
  
  useEffect(() => { saveStackToSessionStorage('voxUndoStack', undoStack); }, [undoStack, saveStackToSessionStorage]);
  useEffect(() => { saveStackToSessionStorage('voxRedoStack', redoStack); }, [redoStack, saveStackToSessionStorage]);

  const saveStateForUndo = useCallback(() => { setUndoStack(prev => [...prev.slice(-MAX_UNDO_STACK_SIZE + 1), captureState()]); setRedoStack([]); }, [captureState]);
  const handleUndo = useCallback(() => { if (undoStack.length === 0) return; const currentState = captureState(); const prevState = undoStack[undoStack.length - 1]; setUndoStack(undoStack.slice(0, -1)); setRedoStack(prev => [...prev, currentState]); restoreState(prevState); }, [undoStack, captureState, restoreState]);
  const handleRedo = useCallback(() => { if (redoStack.length === 0) return; const currentState = captureState(); const nextState = redoStack[redoStack.length - 1]; setRedoStack(redoStack.slice(0, -1)); setUndoStack(prev => [...prev, currentState]); restoreState(nextState); }, [redoStack, captureState, restoreState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) setIsModelSelectorOpen(false);
      if (reframePanelRef.current && !reframePanelRef.current.contains(event.target as Node)) setIsReframePanelOpen(false);
      if (upscalePanelRef.current && !upscalePanelRef.current.contains(event.target as Node)) setIsUpscalePanelOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateTokenUsage = (cost: number) => setTokenUsage(prev => ({ last: cost, session: prev.session + cost }));
  const resetTransform = () => { setTransform({ scale: 1, x: 0, y: 0 }); setPerspectiveTransform({}); };
  const getActiveAspectRatio = (): AspectRatio => {
    if (selectedAspectRatio !== 'auto') return selectedAspectRatio; if (typeof window === 'undefined') return '16:9'; const ratio = window.innerWidth / window.innerHeight;
    if (ratio > 1.5) return '16:9'; if (ratio > 1.2) return '4:3'; if (ratio > 0.8) return '1:1'; if (ratio > 0.6) return '3:4'; return '9:16';
  };

  const handleMediaSuccess = (mediaSrc: string, isVideo: boolean = false) => {
    if (isVideo) {
      setCurrentVideoUrl(mediaSrc);
      setBgUrl1(null); setBgUrl2(null); setCurrentImage(null);
      setImageDimensions(null);
    } else {
      const img = new Image(); img.src = mediaSrc;
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        if (!bgUrl1 && !bgUrl2) setBgUrl1(mediaSrc);
        else { if (isBg1Active) setBgUrl2(mediaSrc); else setBgUrl1(mediaSrc); setIsBg1Active(!isBg1Active); }
      };
      img.onerror = () => { setError('Failed to load the generated image.'); setImageDimensions(null); };
      setCurrentVideoUrl(null);
    }
    resetTransform(); setIsPanelExpanded(true);
  };
  
  const constructFinalPrompt = () => { let finalPrompt = prompt; const styleKeywords = [...activeStyles].map(name => STYLE_PRESETS.find(p => p.name === name)?.keywords || '').join(', '); if (styleKeywords) finalPrompt += `, ${styleKeywords}`; const detailKeywords = DETAIL_LEVELS[detailIntensity]; if (detailKeywords) finalPrompt += `, ${detailKeywords}`; if (negativePrompt.trim()) finalPrompt += ` --no ${negativePrompt.trim()}`; return finalPrompt; };
  // FIX: Replaced MAX_HISTORY_IMAGES with MAX_HISTORY_ITEMS to match the defined constant.
  const createAndStoreHistoryItem = (thumbnail: ImageInfo[], userPrompt: string, settings: ImageSettings, mode: GenerationMode, videoSrc: string | null = null, seed: number | null = null) => { if (history.length >= MAX_HISTORY_ITEMS) { setIsHistoryFullWarningVisible(true); return; } const voxSettings: VoxSettings = { negativePrompt, activeStyles: Array.from(activeStyles), detailIntensity, aspectRatio: selectedAspectRatio }; const newHistoryItem: HistoryItem = { id: new Date().toISOString(), prompt: userPrompt, settings, images: thumbnail, timestamp: Date.now(), generationMode: mode, inputImage: currentImage?.base64, voxSettings, videoSrc: videoSrc ?? undefined, seed: seed ?? undefined }; addToHistory(newHistoryItem); setActiveHistoryItemId(newHistoryItem.id); };
  // FIX: Replaced MAX_HISTORY_IMAGES with MAX_HISTORY_ITEMS to match the defined constant.
  const preGenerationCheck = () => { if (history.length >= MAX_HISTORY_ITEMS) { setIsHistoryFullWarningVisible(true); return false; } return true; }

  const handleGenerateOrEdit = async () => {
    if (!prompt.trim() || !preGenerationCheck()) return;
    saveStateForUndo(); setIsLoading(true); setError(null); setCurrentVideoUrl(null); setConversationalResponse(null);
    try {
      const finalPrompt = constructFinalPrompt();
      const inputSeed = seed ? parseInt(seed, 10) : undefined;
      let generationResult: { images: string[]; seed: number };
      let modelUsedForHistory: GenerationModel;
      let activeRatio: AspectRatio = getActiveAspectRatio();
      
      if (currentImage) {
        modelUsedForHistory = 'gemini-2.5-flash-image-preview';
        const masterPrompt = t('gemini_editImage_masterPrompt', { prompt: finalPrompt });
        generationResult = await editImageFromPrompt(masterPrompt, currentImage.base64, currentImage.mimeType, inputSeed);
      } else {
        modelUsedForHistory = selectedModel;
        const settings: ImageSettings = { model: selectedModel, numberOfImages: 1, aspectRatio: activeRatio };
        const vxdlUltraSystemInstruction = selectedModel === 'gemini-2.5-flash-image-preview' ? t('gemini_vxdlUltra_systemInstruction') : undefined;
        const aspectRatioTextTemplate = t('gemini_aspectRatio_text');
        generationResult = await generateImagesFromPrompt(finalPrompt, settings, vxdlUltraSystemInstruction, aspectRatioTextTemplate, inputSeed);
        setSelectedAspectRatio(activeRatio);
      }

      const newImageSrc = generationResult.images.length > 0 ? generationResult.images[0] : null;

      if (newImageSrc) {
        setLastSeed(generationResult.seed);
        handleMediaSuccess(newImageSrc);
        const imageInfo: ImageInfo = { src: newImageSrc, isRefined: false };
        createAndStoreHistoryItem([imageInfo], prompt, { model: modelUsedForHistory, numberOfImages: 1, aspectRatio: activeRatio }, currentImage ? 'image-to-image' : 'text-to-image', null, generationResult.seed);
        updateTokenUsage(currentImage ? 350 : 250);
        if (currentImage) {
            const mimeType = newImageSrc.substring(newImageSrc.indexOf(':') + 1, newImageSrc.indexOf(';'));
            setCurrentImage({ base64: newImageSrc, mimeType });
            setPrompt('');
        } else {
            setCurrentImage(null);
        }
      } else {
          throw new Error("The model did not return an image. Please try a different prompt.");
      }
    } catch (err) { 
        if (err instanceof Error) {
            if (err.message.startsWith('Model refusal: ')) {
                setConversationalResponse(err.message.replace('Model refusal: ', ''));
            } else {
                setError(err.message); 
            }
        } else {
            setError('An unexpected error occurred.'); 
        }
    } 
    finally { setIsLoading(false); }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim() || !preGenerationCheck()) return;
    saveStateForUndo(); setIsVideoLoading(true); setError(null); setConversationalResponse(null);
    const videoProgressMessages = [t('video_loading_message_1'), t('video_loading_message_2'), t('video_loading_message_3'), t('video_loading_message_4'), t('video_loading_message_5')];
    try {
      const finalPrompt = constructFinalPrompt(); const videoMasterPrompt = t('gemini_generateVideo_prompt', { prompt: finalPrompt });
      const videoUrl = await generateVideo(videoMasterPrompt, currentImage, (msg) => setVideoLoadingMessage(msg), videoProgressMessages);
      handleMediaSuccess(videoUrl, true); updateTokenUsage(1000);
    } catch (err) { 
        if (err instanceof Error) {
            if (err.message.startsWith('Model refusal: ')) {
                setConversationalResponse(err.message.replace('Model refusal: ', ''));
            } else {
                setError(err.message);
            }
        } else {
            setError('An unexpected error occurred during video generation.');
        }
    }
    finally { setIsVideoLoading(false); }
  };
  
  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
    const imageInfo: ImageInfo = { src: thumbnailUrl, isRefined: false };
    const mode: GenerationMode = currentImage ? 'image-to-video' : 'text-to-video';
    createAndStoreHistoryItem([imageInfo], prompt, { model: 'vxdl-1-fused', numberOfImages: 1, aspectRatio: getActiveAspectRatio() }, mode, video.src);
    if (currentImage) { setCurrentImage(null); setPrompt(''); }
  };

  const handleCombineImages = async () => { 
    if (selectedIndices.size < 2 || !prompt.trim() || !preGenerationCheck()) return; 
    saveStateForUndo(); 
    setIsLoading(true); 
    setError(null);
    setConversationalResponse(null);
    try { 
        const imagesToCombine = Array.from(selectedIndices).map(index => uploadedImages[index]); 
        const masterPrompt = t('gemini_combine_masterPrompt', { prompt }); 
        const combinedImages = await combineImages(imagesToCombine, masterPrompt); 
        if (combinedImages.length > 0) { 
            const newImageSrc = combinedImages[0]; 
            handleMediaSuccess(newImageSrc); 
            const mimeType = newImageSrc.substring(newImageSrc.indexOf(':') + 1, newImageSrc.indexOf(';')); 
            const imageInfo: ImageInfo = { src: newImageSrc, isRefined: false }; 
            createAndStoreHistoryItem([imageInfo], prompt, { model: 'gemini-2.5-flash-image-preview', numberOfImages: 1, aspectRatio: getActiveAspectRatio() }, 'image-to-image'); 
            updateTokenUsage(500); 
            setCurrentImage({ base64: newImageSrc, mimeType }); 
            setPrompt(''); 
            setUploadedImages([]); 
            setSelectedIndices(new Set()); 
        } else { 
            throw new Error("The model did not combine the images."); 
        } 
    } catch (err) { 
        if (err instanceof Error) {
            if (err.message.startsWith('Model refusal: ')) {
                setConversationalResponse(err.message.replace('Model refusal: ', ''));
            } else {
                setError(err.message);
            }
        } else {
            setError('An unexpected error occurred.');
        }
    } finally { 
        setIsLoading(false); 
    } 
  };
  
  const handleNewVision = () => {
    saveStateForUndo();
    setCurrentImage(null);
    setSelectedIndices(new Set());
    setBgUrl1(null);
    setBgUrl2(null);
    setIsBg1Active(true);
    setPrompt('');
    setError(null);
    setConversationalResponse(null);
    setUploadedImages([]);
    resetTransform();
    setIsPanelExpanded(false);
    setActiveHistoryItemId(null);
    setImageDimensions(null);
    setTokenUsage({ last: 0, session: 0 });
    setIsTokenUsageVisible(false);
    clearAutoSave();
    setCurrentVideoUrl(null);
    setSeed('');
    setLastSeed(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDownload = async () => {
    const activeUrl = currentVideoUrl || (isBg1Active ? bgUrl1 : bgUrl2);
    if (!activeUrl) return;

    const isVideo = !!currentVideoUrl;
    const sanitizedPrompt = prompt.slice(0, 50).trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');

    if (isVideo) {
      // Videos are already blob object URLs, download directly
      const extension = 'mp4';
      const filename = (sanitizedPrompt || `vox_creation`) + `.${extension}`;
      const link = document.createElement('a');
      link.href = activeUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For image data URLs, convert to a blob for reliable downloading
      try {
        const response = await fetch(activeUrl);
        const blob = await response.blob();

        let extension = 'jpg'; // default extension
        if (blob.type && blob.type.startsWith('image/')) {
          extension = blob.type.split('/')[1];
          if (extension === 'jpeg') {
            extension = 'jpg';
          }
        }
        
        const filename = (sanitizedPrompt || `vox_creation`) + `.${extension}`;
        const objectUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the created object URL
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        console.error("Download failed", e);
        setError("Failed to prepare file for download.");
      }
    }
  };

  const handleUpscale = async (resolution: UpscaleResolution) => {
    setIsUpscalePanelOpen(false);
    const imageToUpscale = currentImage?.base64 || (isBg1Active ? bgUrl1 : bgUrl2);
    if (!imageToUpscale || !activeHistoryItemId) {
        setError("No active image to upscale.");
        return;
    }
    saveStateForUndo();
    setIsUpscaling(true);
    setError(null);
    setConversationalResponse(null);
    try {
        const upscalePrompt = resolution === '2x' ? t('gemini_upscale_2x_prompt') : t('gemini_upscale_4x_prompt');
        const upscaledImageSrc = await upscaleImage(imageToUpscale, resolution, upscalePrompt);
        handleMediaSuccess(upscaledImageSrc);
        const mimeType = upscaledImageSrc.substring(upscaledImageSrc.indexOf(':') + 1, upscaledImageSrc.indexOf(';'));
        setCurrentImage({ base64: upscaledImageSrc, mimeType: mimeType });
        const updatedImageInfo: ImageInfo = { src: upscaledImageSrc, upscaledTo: resolution, isRefined: false };
        updateHistoryItem(activeHistoryItemId, [updatedImageInfo]);
        updateTokenUsage(150);
    } catch (err) {
        if (err instanceof Error) {
            if (err.message.startsWith('Model refusal: ')) {
                setConversationalResponse(err.message.replace('Model refusal: ', ''));
            } else {
                setError(err.message);
            }
        } else {
            setError('An unexpected error occurred.');
        }
    } finally {
        setIsUpscaling(false);
    }
  };

  const handleSurpriseMe = async () => { 
    setIsGeneratingPrompt(true); 
    setError(null); 
    setConversationalResponse(null);
    try { 
        const creativePrompt = await generateCreativePrompt(t('gemini_creativePrompt_instruction'), t('gemini_creativePrompt_systemInstruction')); 
        setPrompt(creativePrompt); 
        updateTokenUsage(50); 
    } catch (err) { 
        if (err instanceof Error) {
            if (err.message.startsWith('Model refusal: ')) {
                setConversationalResponse(err.message.replace('Model refusal: ', ''));
            } else {
                setError(err.message);
            }
        } else {
            setError('An unexpected error occurred.');
        }
    } finally { 
        setIsGeneratingPrompt(false); 
    } 
  };

  const handleGenerateVariations = async () => { 
    const imageForVariations = currentImage?.base64 || (isBg1Active ? bgUrl1 : bgUrl2); 
    if (!imageForVariations || !preGenerationCheck()) return; 
    saveStateForUndo(); 
    setIsGeneratingVariations(true); 
    setError(null); 
    setConversationalResponse(null);
    try { 
        const mimeType = imageForVariations.substring(imageForVariations.indexOf(':') + 1, imageForVariations.indexOf(';')); 
        const variationImages = await generateVariations(imageForVariations, mimeType, t('gemini_variations_prompt')); 
        if (variationImages.length > 0) { 
            handleMediaSuccess(variationImages[0]); 
            const newMimeType = variationImages[0].substring(variationImages[0].indexOf(':') + 1, variationImages[0].indexOf(';')); 
            const imageInfo: ImageInfo = { src: variationImages[0], isRefined: false }; 
            createAndStoreHistoryItem([imageInfo], `Variations of: ${prompt || 'input image'}`, { model: 'gemini-2.5-flash-image-preview', numberOfImages: 1, aspectRatio: getActiveAspectRatio() }, 'image-to-image'); 
            updateTokenUsage(300); 
            setCurrentImage({ base64: variationImages[0], mimeType: newMimeType }); 
        } else { 
            throw new Error("The model did not return any variations."); 
        } 
    } catch (err) { 
        if (err instanceof Error) {
            if (err.message.startsWith('Model refusal: ')) {
                setConversationalResponse(err.message.replace('Model refusal: ', ''));
            } else {
                setError(err.message);
            }
        } else {
            setError('An unexpected error occurred.');
        }
    } finally { 
        setIsGeneratingVariations(false); 
    } 
  };
  
  const handleReframe = async (newRatio: AspectRatio) => { 
    setIsReframePanelOpen(false); 
    const imageToReframe = currentImage?.base64 || (isBg1Active ? bgUrl1 : bgUrl2); 
    if (!imageToReframe || !preGenerationCheck()) return; 
    saveStateForUndo(); 
    setIsReframing(true); 
    setError(null); 
    setConversationalResponse(null);
    try { 
        const mimeType = imageToReframe.substring(imageToReframe.indexOf(':') + 1, imageToReframe.indexOf(';')); 
        const masterPrompt = t('gemini_reframe_masterPrompt', { aspectRatio: newRatio }); 
        const reframedImages = await reframeImage(imageToReframe, mimeType, masterPrompt); 
        if (reframedImages.length > 0) { 
            const newImageSrc = reframedImages[0]; 
            handleMediaSuccess(newImageSrc); 
            const newMimeType = newImageSrc.substring(newImageSrc.indexOf(':') + 1, newImageSrc.indexOf(';')); 
            const imageInfo: ImageInfo = { src: newImageSrc, isRefined: false }; 
            createAndStoreHistoryItem([imageInfo], `Reframe of: ${prompt || 'input image'}`, { model: 'gemini-2.5-flash-image-preview', numberOfImages: 1, aspectRatio: newRatio }, 'image-to-image'); 
            updateTokenUsage(200); 
            setCurrentImage({ base64: newImageSrc, mimeType: newMimeType }); 
            setSelectedAspectRatio(newRatio); 
        } else { 
            throw new Error("The model did not return a reframed image."); 
        } 
    } catch (err) { 
        if (err instanceof Error) {
            if (err.message.startsWith('Model refusal: ')) {
                setConversationalResponse(err.message.replace('Model refusal: ', ''));
            } else {
                setError(err.message);
            }
        } else {
            setError('An unexpected error occurred.');
        }
    } finally { 
        setIsReframing(false); 
    } 
  };

  const handleSelectHistoryItem = (item: HistoryItem) => { 
      setError(null);
      setConversationalResponse(null);
      saveStateForUndo(); 
      clearAutoSave(); 
      if (item.videoSrc) { 
          handleMediaSuccess(item.videoSrc, true); 
      } else if (item.images && item.images.length > 0) { 
          const firstImageSrc = getThumbnailSrc(item.images[0]); 
          if (!firstImageSrc) { setError("Could not load image from history item."); return; } 
          handleMediaSuccess(firstImageSrc); 
          const mimeType = firstImageSrc.substring(firstImageSrc.indexOf(':') + 1, firstImageSrc.indexOf(';')); 
          setCurrentImage({ base64: firstImageSrc, mimeType }); 
      } else return; 
      setPrompt(item.prompt); 
      setSelectedModel(item.settings.model || 'vxdl-1-fused'); 
      setActiveHistoryItemId(item.id); 
      if (item.seed) {
        setLastSeed(item.seed);
        setSeed(String(item.seed));
      } else {
        setLastSeed(null);
        setSeed('');
      }
      if (item.voxSettings) { 
          setNegativePrompt(item.voxSettings.negativePrompt || ''); 
          setActiveStyles(new Set(item.voxSettings.activeStyles || [])); 
          setDetailIntensity(item.voxSettings.detailIntensity || 3); 
          setSelectedAspectRatio(item.voxSettings.aspectRatio || 'auto'); 
      } else { 
          setNegativePrompt(''); 
          setActiveStyles(new Set()); 
          setDetailIntensity(3); 
          setSelectedAspectRatio('auto'); 
      } 
      setIsHistoryOpen(false); 
      resetTransform(); 
  };

  const handleClearHistory = () => { if(window.confirm('Are you sure you want to clear all generation history?')) clearHistory(); }; const handleDeleteSelectedHistory = () => { deleteHistoryItems(selectedHistoryImages); setSelectedHistoryImages(new Set()); }; const handleToggleHistorySelection = (id: string) => setSelectedHistoryImages(prev => { const newSelection = new Set(prev); if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id); return newSelection; });
  const handleFilesSelected = async (files: FileList | null) => {
      if (!files) return;
      const filesArray = Array.from(files).slice(0, 6 - uploadedImages.length);
      const newImages = await Promise.all(filesArray.map(file => new Promise<{ base64: string; mimeType: string }>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ base64: reader.result as string, mimeType: file.type });
          reader.readAsDataURL(file);
      })));
      if (newImages.length === 1) {
          const firstImage = newImages[0];
          saveStateForUndo();
          setCurrentImage(firstImage);
          handleMediaSuccess(firstImage.base64);
          setPrompt('');
          setUploadedImages([]);
          setSelectedIndices(new Set());
      } else if (newImages.length > 0) {
          setUploadedImages(prev => [...prev, ...newImages]);
      }
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };
  const handleToggleStyle = (styleName: string) => setActiveStyles(prev => { const newStyles = new Set(prev); if (newStyles.has(styleName)) newStyles.delete(styleName); else newStyles.add(styleName); return newStyles; }); const handleToggleSelection = (index: number) => setSelectedIndices(prev => { const newSelection = new Set(prev); if (newSelection.has(index)) newSelection.delete(index); else newSelection.add(index); return newSelection; }); const handleRemoveUploadedImage = (indexToRemove: number) => { setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove)); setSelectedIndices(prev => { const newSelection = new Set(prev); newSelection.delete(indexToRemove); return newSelection; }); };
  
  // 360 View & Canvas Transform Handlers
  const handleMouseMove360 = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!is360View) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const rotateY = (clientX / innerWidth - 0.5) * 60;
    const rotateX = (clientY / innerHeight - 0.5) * -60;
    setPerspectiveTransform({ transform: `perspective(1500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.1)` });
  };
  
  const toggle360View = () => {
    const turningOn = !is360View;
    if (turningOn) {
      resetTransform();
    } else {
      setPerspectiveTransform({});
    }
    setIs360View(turningOn);
  };

  const handleChangeViewpoint = async (direction: 'up' | 'down' | 'left' | 'right') => {
    const sourceImage = currentImage?.base64 || (isBg1Active ? bgUrl1 : bgUrl2);
    if (!sourceImage || !preGenerationCheck() || isChangingViewpoint) return;

    saveStateForUndo();
    setIsChangingViewpoint(true);
    setViewpointDirection(direction);
    setError(null);
    setConversationalResponse(null);

    try {
      const mimeType = sourceImage.substring(sourceImage.indexOf(':') + 1, sourceImage.indexOf(';'));
      const instruction = t('gemini_changeViewpoint_instruction', { direction });

      const newImageSrc = await changeImageViewpoint(sourceImage, mimeType, instruction);

      handleMediaSuccess(newImageSrc);
      const newMimeType = newImageSrc.substring(newImageSrc.indexOf(':') + 1, newImageSrc.indexOf(';'));
      const imageInfo: ImageInfo = { src: newImageSrc, isRefined: false };
      
      createAndStoreHistoryItem(
        [imageInfo],
        `Change viewpoint to ${direction}: ${prompt || 'input image'}`,
        { model: 'gemini-2.5-flash-image-preview', numberOfImages: 1, aspectRatio: getActiveAspectRatio() },
        'image-to-image'
      );

      updateTokenUsage(200);
      setCurrentImage({ base64: newImageSrc, mimeType: newMimeType });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.startsWith('Model refusal: ')) {
            setConversationalResponse(err.message.replace('Model refusal: ', ''));
        } else {
            setError(err.message);
        }
      } else {
        setError('An unexpected error occurred while changing the viewpoint.');
      }
    } finally {
      setIsChangingViewpoint(false);
      setViewpointDirection(null);
    }
  };

  const getDistance = (touches: React.TouchEvent<HTMLDivElement>['touches']) => Math.sqrt(Math.pow(touches[1].clientX - touches[0].clientX, 2) + Math.pow(touches[1].clientY - touches[0].clientY, 2));
  const handleScale = (scaleMultiplier: number, clientX: number, clientY: number) => { const container = imageContainerRef.current; if (!container) return; const rect = container.getBoundingClientRect(); const imageX = (clientX - rect.left - transform.x) / transform.scale; const imageY = (clientY - rect.top - transform.y) / transform.scale; let newScale = Math.max(0.5, Math.min(transform.scale * scaleMultiplier, 10)); setTransform({ scale: newScale, x: clientX - rect.left - imageX * newScale, y: clientY - rect.top - imageY * newScale }); };
  const handleZoom = (direction: 'in' | 'out') => { const container = imageContainerRef.current; if (!container) return; handleScale(direction === 'in' ? 1.2 : 1 / 1.2, container.getBoundingClientRect().width / 2, container.getBoundingClientRect().height / 2); };
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => { if (is360View || isInpaintingMode) return; e.preventDefault(); handleScale(e.deltaY > 0 ? 1 / 1.1 : 1.1, e.clientX, e.clientY); };
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { if (is360View || transform.scale <= 1 || isInpaintingMode) return; e.preventDefault(); setIsPanning(true); setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y }); };
  const handleMouseUp = () => { if (isPanning) setIsPanning(false); };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => { if (is360View) { handleMouseMove360(e); return; } if (isInpaintingMode || !isPanning) return; e.preventDefault(); setTransform(t => ({ ...t, x: e.clientX - panStart.x, y: e.clientY - panStart.y })); };
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => { if (is360View || isInpaintingMode) return; if (e.touches.length === 2) { e.preventDefault(); setPinchStartDistance(getDistance(e.touches)); setIsPanning(false); } else if (e.touches.length === 1 && transform.scale > 1) { e.preventDefault(); setIsPanning(true); setPanStart({ x: e.touches[0].clientX - transform.x, y: e.touches[0].clientY - transform.y }); } };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => { if (is360View || isInpaintingMode) return; if (e.touches.length === 2 && pinchStartDistance !== null) { e.preventDefault(); const newDist = getDistance(e.touches); handleScale(newDist / pinchStartDistance, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2); setPinchStartDistance(newDist); } else if (e.touches.length === 1 && isPanning) { e.preventDefault(); setTransform(t => ({ ...t, x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y })); } };
  const handleTouchEnd = () => { setIsPanning(false); setPinchStartDistance(null); };
  const handleZoomSliderChange = (newScale: number) => {
    const container = imageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;

    const imageX = (clientX - rect.left - transform.x) / transform.scale;
    const imageY = (clientY - rect.top - transform.y) / transform.scale;

    setTransform({
        scale: newScale,
        x: clientX - rect.left - imageX * newScale,
        y: clientY - rect.top - imageY * newScale,
    });
  };
  
  const handleAnalyzeScene = async () => {
    const imageToAnalyze = currentImage?.base64 || (isBg1Active ? bgUrl1 : bgUrl2);
    if (!imageToAnalyze) return;
    setIsAnalyzingScene(true);
    setError(null);
    setConversationalResponse(null);
    try {
        const instruction = t('gemini_analyzeScene_instruction');
        const suggestions = await analyzeImageForSuggestions(imageToAnalyze, instruction);
        setConversationalResponse(suggestions);
        updateTokenUsage(100);
    } catch (err) {
        if (err instanceof Error) {
            if (err.message.startsWith('Model refusal: ')) {
                setConversationalResponse(err.message.replace('Model refusal: ', ''));
            } else {
                setError(err.message);
            }
        } else {
            setError('An unexpected error occurred during scene analysis.');
        }
    } finally {
        setIsAnalyzingScene(false);
    }
  };
  
  const handleSuggestNegatives = async () => {
      if (!prompt.trim()) return;
      setIsSuggestingNegatives(true);
      setError(null);
      try {
          const instruction = t('gemini_suggestNegative_instruction');
          const suggestions = await suggestNegativePrompt(prompt, instruction);
          setNegativePrompt(prev => prev ? `${prev}, ${suggestions}` : suggestions);
          updateTokenUsage(50);
      } catch (err) {
          if (err instanceof Error) {
              setError(err.message);
          } else {
              setError('An unexpected error occurred while suggesting negatives.');
          }
      } finally {
          setIsSuggestingNegatives(false);
      }
  };

  const handleStyleFileSelected = (files: FileList | null) => {
    if (files && files[0]) {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setStyleReferenceImage({ base64: reader.result as string, mimeType: file.type });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleApplyStyle = async () => {
      if (!styleReferenceImage) return;
      setIsAnalyzingStyle(true);
      setError(null);
      try {
          const instruction = t('gemini_analyzeStyle_instruction');
          const styleKeywords = await analyzeImageStyle(styleReferenceImage.base64, instruction);
          setPrompt(prev => prev ? `${prev}, ${styleKeywords}` : styleKeywords);
          updateTokenUsage(100);
      } catch (err) {
          if (err instanceof Error) {
              setError(err.message);
          } else {
              setError('An unexpected error occurred during style analysis.');
          }
      } finally {
          setIsAnalyzingStyle(false);
      }
  };

    const enterInpaintingMode = () => {
        if (!hasMedia || currentVideoUrl) return;
        resetTransform();
        setIsInpaintingMode(true);
    };

    const exitInpaintingMode = useCallback(() => {
        setIsInpaintingMode(false);
        setInpaintingPrompt('');
        const canvas = inpaintingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, []);

    const clearInpaintingMask = useCallback(() => {
        const canvas = inpaintingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const handleApplyInpainting = async () => {
        const imageToInpaint = currentImage?.base64 || (isBg1Active ? bgUrl1 : bgUrl2);
        const canvas = inpaintingCanvasRef.current;
        if (!imageToInpaint || !canvas || !inpaintingPrompt.trim() || !preGenerationCheck()) return;

        saveStateForUndo();
        setIsInpaintingLoading(true);
        setError(null);
        setConversationalResponse(null);

        try {
            const maskBase64 = canvas.toDataURL('image/png');
            const mimeType = imageToInpaint.substring(imageToInpaint.indexOf(':') + 1, imageToInpaint.indexOf(';'));
            const masterPrompt = t('gemini_inpaint_masterPrompt', { prompt: inpaintingPrompt });
            const inpaintedImages = await inpaintImage(imageToInpaint, maskBase64, mimeType, masterPrompt);

            if (inpaintedImages.length > 0) {
                const newImageSrc = inpaintedImages[0];
                handleMediaSuccess(newImageSrc);
                const newMimeType = newImageSrc.substring(newImageSrc.indexOf(':') + 1, newImageSrc.indexOf(';'));
                const imageInfo: ImageInfo = { src: newImageSrc, isRefined: true };
                createAndStoreHistoryItem(
                    [imageInfo],
                    `Inpaint: ${inpaintingPrompt}`,
                    { model: 'gemini-2.5-flash-image-preview', numberOfImages: 1, aspectRatio: getActiveAspectRatio() },
                    'image-to-image'
                );
                updateTokenUsage(300);
                setCurrentImage({ base64: newImageSrc, mimeType: newMimeType });
                exitInpaintingMode();
            } else {
                throw new Error("Inpainting failed to return an image.");
            }
        } catch (err) {
            if (err instanceof Error) {
                if (err.message.startsWith('Model refusal: ')) {
                    setConversationalResponse(err.message.replace('Model refusal: ', ''));
                } else {
                    setError(err.message);
                }
            } else {
                setError('An unexpected error occurred during inpainting.');
            }
        } finally {
            setIsInpaintingLoading(false);
        }
    };
    
    useEffect(() => {
        if (!isInpaintingMode) return;
        const canvas = inpaintingCanvasRef.current;
        const activeUrl = isBg1Active ? bgUrl1 : bgUrl2;
        if (!canvas || !activeUrl) return;

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = activeUrl;
        image.onload = () => {
            const container = imageContainerRef.current;
            if (container) {
                const containerRatio = container.clientWidth / container.clientHeight;
                const imageRatio = image.naturalWidth / image.naturalHeight;
                let newWidth, newHeight;
                if (containerRatio > imageRatio) {
                    newHeight = container.clientHeight;
                    newWidth = newHeight * imageRatio;
                } else {
                    newWidth = container.clientWidth;
                    newHeight = newWidth / imageRatio;
                }
                canvas.style.width = `${newWidth}px`;
                canvas.style.height = `${newHeight}px`;
            }
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            clearInpaintingMask();
        };
        image.onerror = () => {
            setError("Failed to load image for inpainting.");
        }
    }, [isInpaintingMode, bgUrl1, bgUrl2, isBg1Active, clearInpaintingMask]);
    
    const draw = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDrawing) return;
        const canvas = inpaintingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if (e instanceof MouseEvent) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            return;
        }

        const currentPoint = {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };

        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        ctx.lineWidth = brushSize * scaleX;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (lastPointRef.current) {
            ctx.beginPath();
            ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            ctx.lineTo(currentPoint.x, currentPoint.y);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(currentPoint.x, currentPoint.y, (brushSize * scaleX) / 2, 0, Math.PI * 2);
        ctx.fill();

        lastPointRef.current = currentPoint;
    }, [isDrawing, brushSize]);

    const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        lastPointRef.current = null;
        draw(e.nativeEvent);
    }, [draw]);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
        lastPointRef.current = null;
    }, []);

    const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPrompt = e.target.value;
        setPrompt(newPrompt);
        if (newPrompt.length > PROMPT_LENGTH_THRESHOLD && !isPromptEditorOpen) {
            setIsPromptEditorOpen(true);
        }
    };

    const handlePromptClick = () => {
        if (prompt.length > PROMPT_LENGTH_THRESHOLD) {
            setIsPromptEditorOpen(true);
        }
    };
    
    const handleGenerateVxog = async () => {
        const sourceImage = currentImage?.base64 || (isBg1Active ? bgUrl1 : bgUrl2);
        if (!sourceImage || isBusy) return;
        
        saveStateForUndo();
        setIsGeneratingVxog(true);
        setError(null);
        setConversationalResponse(null);
        
        try {
          const instruction = t('gemini_vxog_instruction');
          const result = await generateVisualPromptFromImage(sourceImage, instruction);
          setVxogPrompt(result);
          updateTokenUsage(150); // Estimate
        } catch (err) {
            if (err instanceof Error) {
                if (err.message.startsWith('Model refusal: ')) {
                    setConversationalResponse(err.message.replace('Model refusal: ', ''));
                } else {
                    setError(err.message);
                }
            } else {
                setError('An unexpected error occurred during VXOG generation.');
            }
        } finally {
          setIsGeneratingVxog(false);
        }
    };

    const handleCopySeed = () => {
        if (!lastSeed || isSeedCopied) return;
        navigator.clipboard.writeText(String(lastSeed)).then(() => {
          setIsSeedCopied(true);
          setTimeout(() => setIsSeedCopied(false), 2000);
        });
    };


  const hasMedia = bgUrl1 || bgUrl2 || currentVideoUrl;
  const operationMode = selectedIndices.size >= 2 ? 'combine' : currentImage ? 'edit' : 'generate';
  const handlePrimaryAction = () => { if (operationMode === 'combine') handleCombineImages(); else handleGenerateOrEdit(); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handlePrimaryAction(); };
  const currentModelName = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel;
  const placeholderText = operationMode === 'combine' ? t('promptCombinePlaceholder', { count: selectedIndices.size }) : operationMode === 'edit' ? t('promptEditPlaceholder') : t('promptVisionPlaceholder');
  const buttonTitle = operationMode === 'combine' ? t('buttonCombine', { count: selectedIndices.size }) : operationMode === 'edit' ? t('buttonRemix') : t('buttonGenerate');
  const isBusy = isLoading || isUpscaling || isGeneratingPrompt || isGeneratingVariations || isReframing || isVideoLoading || isChangingViewpoint || isAnalyzingScene || isAnalyzingStyle || isSuggestingNegatives || isInpaintingLoading || isGeneratingVxog;
  const imageTransformStyle = { 
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, 
      transition: isPanning || is360View ? 'none' : 'transform 0.1s ease-out',
      ...perspectiveTransform
  };
  const actionButtonClasses = "bg-black/50 backdrop-blur-lg border border-white/20 text-white font-semibold h-10 px-3 rounded-lg text-sm hover:bg-white/10 transition-colors active:scale-95 disabled:opacity-50 flex justify-center items-center text-center";
  const activeHistoryItem = history.find(item => item.id === activeHistoryItemId);
  const currentImageInfo = activeHistoryItem?.images[0];

  return (
    <>
      <KnowledgeBaseModal isOpen={isKnowledgeBaseOpen} onClose={() => setIsKnowledgeBaseOpen(false)} />
       <PromptEditorModal
        isOpen={isPromptEditorOpen}
        onClose={() => setIsPromptEditorOpen(false)}
        prompt={prompt}
        setPrompt={setPrompt}
      />
      {autoSaveState && ( <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] animate-fade-in"><div className="bg-gray-950/80 border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-fade-in-up"><h3 className="text-2xl font-bold text-cyan-400">{t('unsavedSessionTitle')}</h3><p className="mt-4 text-gray-300">{t('unsavedSessionBody')}</p><div className="mt-8 flex justify-end gap-4"><button onClick={() => clearAutoSave()} className="text-gray-400 font-semibold py-2 px-6 rounded-lg hover:text-white transition-colors">{t('discard')}</button><button onClick={handleRestoreSession} className="bg-white text-black font-semibold py-2 px-6 rounded-lg shadow-sm hover:shadow-md hover:shadow-white/10 transition-all">{t('restore')}</button></div></div></div> )}
      {isHistoryFullWarningVisible && ( <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"><div className="bg-gray-950/80 border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-fade-in-up"><h3 className="text-2xl font-bold text-amber-400">{t('historyFullTitle')}</h3><p className="mt-4 text-base text-gray-300">{t('historyFullBody', { count: MAX_HISTORY_ITEMS })}</p><p className="mt-2 text-base text-gray-400">{t('historyFullAction')}</p><div className="mt-8 text-center"><button onClick={() => { setIsHistoryFullWarningVisible(false); setIsHistoryOpen(true); }} className="bg-white text-black font-semibold py-2 px-8 rounded-lg shadow-sm hover:shadow-md hover:shadow-white/10 transition-all">{t('manageHistory')}</button></div></div></div> )}
      {isVideoLoading && ( <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-[60] animate-fade-in"><Spinner /><p className="mt-4 text-xl font-semibold text-white text-center max-w-md">{videoLoadingMessage}</p></div> )}
        
      {vxogPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in" onClick={() => setVxogPrompt(null)}>
          <div className="bg-gray-950/80 border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4 animate-fade-in-up flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-2xl font-bold text-white">{t('vxogModalTitle')}</h2>
              <button onClick={() => setVxogPrompt(null)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors" title={t('kbClose')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="bg-black/30 p-4 rounded-lg overflow-y-auto no-scrollbar flex-grow">
              <p className="text-base text-gray-300 font-mono selectable-text leading-relaxed break-words">
                {vxogPrompt}
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-4 flex-shrink-0">
               <button 
                  onClick={() => {
                    if (vxogPrompt) navigator.clipboard.writeText(vxogPrompt);
                    setIsVxogCopied(true);
                    setTimeout(() => setIsVxogCopied(false), 2000);
                  }}
                  className="text-gray-300 font-semibold py-2 px-6 rounded-lg hover:text-white transition-colors bg-white/10">
                  {isVxogCopied ? t('prompt_copied') : t('prompt_copy')}
                </button>
               <button onClick={() => { if (vxogPrompt) setPrompt(vxogPrompt); setVxogPrompt(null); }} className="bg-white text-black font-semibold py-2 px-6 rounded-lg shadow-sm hover:shadow-md hover:shadow-white/10 transition-all">
                {t('useAsPrompt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {is360View && (
        <>
          <button
            onClick={() => setShowGenerativeUI(p => !p)}
            className="fixed z-[35] top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md h-10 px-4 rounded-full border border-white/10 text-white/80 hover:text-white transition-colors pointer-events-auto animate-fade-in"
            title={t('toggleGenerativeUI')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.064 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          {showGenerativeUI && (
            <div className="fixed inset-0 z-[35] flex items-center justify-center pointer-events-none animate-fade-in">
              <div className="relative w-48 h-48 pointer-events-auto">
                {[
                  { dir: 'up', classes: 'top-0 left-1/2 -translate-x-1/2' },
                  { dir: 'down', classes: 'bottom-0 left-1/2 -translate-x-1/2' },
                  { dir: 'left', classes: 'left-0 top-1/2 -translate-y-1/2' },
                  { dir: 'right', classes: 'right-0 top-1/2 -translate-y-1/2' },
                ].map(({ dir, classes }) => (
                  <button
                    key={dir}
                    onClick={() => handleChangeViewpoint(dir as 'up' | 'down' | 'left' | 'right')}
                    disabled={isChangingViewpoint}
                    className={`absolute w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white/80 hover:bg-white/10 transition-all duration-200 disabled:opacity-50 group ${classes}`}
                    title={t('extendScene')}
                  >
                    {isChangingViewpoint && viewpointDirection === dir ? (
                      <SmallSpinner />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-125 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {dir === 'up' && <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />}
                        {dir === 'down' && <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
                        {dir === 'left' && <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />}
                        {dir === 'right' && <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />}
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className={`fixed inset-y-0 left-0 z-[45] w-80 bg-black/60 backdrop-blur-xl border-r border-white/10 shadow-2xl transition-transform duration-300 ease-in-out ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full"><div className="flex justify-between items-center p-4 border-b border-white/10"><h2 className="text-lg font-semibold text-white">{t('historyCount', { current: history.length, max: MAX_HISTORY_ITEMS })}</h2><button onClick={() => setIsHistoryOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button></div>
            {history.length === 0 ? (<div className="flex-1 flex items-center justify-center text-gray-500">{t('noHistory')}</div>) : (<ul className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">{history.map(item => (<li key={item.id} className="relative group/history"><button onClick={() => handleSelectHistoryItem(item)} className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left pl-10"><img src={getThumbnailSrc(item.images[0])} alt="thumbnail" className="w-14 h-14 rounded-md object-cover bg-gray-800 border border-gray-700 flex-shrink-0" /><div className="overflow-hidden flex-1"><p className="text-sm font-medium text-white truncate">{item.prompt}</p><p className="text-xs text-gray-400 mt-1">{timeSince(item.timestamp)}</p></div></button><div className="absolute inset-y-0 left-0 flex items-center justify-start p-2 cursor-pointer" onClick={() => handleToggleHistorySelection(item.id)}><div className={`h-5 w-5 rounded-md border-2 ${selectedHistoryImages.has(item.id) ? 'bg-white border-white' : 'bg-black/30 border-gray-400 group-hover/history:border-gray-200'} flex items-center justify-center transition-colors`}>{selectedHistoryImages.has(item.id) && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}</div></div></li>))}</ul>)}
            {history.length > 0 && <div className="p-2 border-t border-white/10 grid grid-cols-2 gap-2"><button onClick={handleDeleteSelectedHistory} disabled={selectedHistoryImages.size === 0} className="w-full text-center py-2 px-3 text-sm rounded-md transition-colors bg-red-800/50 text-red-300 hover:bg-red-800/80 hover:text-red-200 disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed">{t('delete')} ({selectedHistoryImages.size})</button><button onClick={handleClearHistory} className="w-full text-center py-2 px-3 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">{t('clearAll')}</button></div>}
        </div>
      </div>
      
      <div ref={imageContainerRef} className="fixed inset-0 z-[20] bg-black overflow-hidden touch-none flex items-center justify-center" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ cursor: !is360View && transform.scale > 1 && !isInpaintingMode ? (isPanning ? 'grabbing' : 'grab') : (isInpaintingMode ? 'crosshair' : 'default') }}>
        {!currentVideoUrl && <>
            <img src={bgUrl1 ?? undefined} alt="" className="absolute max-w-full max-h-full object-contain transition-all duration-1000" style={{ ...imageTransformStyle, opacity: bgUrl1 && isBg1Active ? 1 : 0 }} hidden={!bgUrl1} />
            <img src={bgUrl2 ?? undefined} alt="" className="absolute max-w-full max-h-full object-contain transition-all duration-1000" style={{ ...imageTransformStyle, opacity: bgUrl2 && !isBg1Active ? 1 : 0 }} hidden={!bgUrl2} />
        </>}
        {isInpaintingMode && (
          <canvas
              ref={inpaintingCanvasRef}
              className="absolute object-contain opacity-50 pointer-events-auto"
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onMouseMove={(e) => draw(e.nativeEvent)}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchMove={(e) => draw(e.nativeEvent)}
          />
        )}
      </div>

      {conversationalResponse && (
        <div className="fixed inset-0 z-[28] flex items-center justify-center p-8 pointer-events-none animate-fade-in">
            <div className="bg-red-900/60 backdrop-blur-md border border-red-600/80 text-white rounded-xl p-6 max-w-2xl shadow-lg pointer-events-auto">
                <p className="selectable-text whitespace-pre-wrap">{renderFormattedText(conversationalResponse)}</p>
            </div>
        </div>
      )}

      {currentVideoUrl && ( <div className="fixed inset-0 z-[25] flex items-center justify-center bg-black p-4 animate-fade-in"><video key={currentVideoUrl} src={currentVideoUrl} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" onLoadedData={handleVideoLoaded} /></div> )}
      {(hasMedia && (imageDimensions || lastSeed)) && (
        <div className="fixed z-30 top-4 left-4 flex flex-col items-start gap-1.5 pointer-events-auto">
            {imageDimensions && (
                <div className="bg-black/50 backdrop-blur-md text-white text-xs font-mono rounded px-2 py-1 animate-fade-in">
                    {imageDimensions.width} x {imageDimensions.height}
                </div>
            )}
            {lastSeed && (
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md text-white text-xs font-mono rounded px-2 py-1 animate-fade-in">
                    <span>Seed: {lastSeed}</span>
                    <button
                        onClick={handleCopySeed}
                        className="text-gray-400 hover:text-white"
                        title={isSeedCopied ? "Copied!" : "Copy seed"}
                    >
                        {isSeedCopied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" /><path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" /></svg>
                        )}
                    </button>
                </div>
            )}
        </div>
      )}
      {hasMedia && !currentVideoUrl && ( <div className="fixed z-[35] top-4 right-4 flex flex-col items-end gap-2 animate-fade-in"><div className="relative"><button onClick={() => setIsZoomPanelOpen(p => !p)} className="h-10 w-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white/80 hover:text-white transition-colors" title={t('zoomControls')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg></button>{isZoomPanelOpen && (<div className="absolute top-0 right-12 flex items-center gap-3 bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 animate-fade-in"><div className="flex flex-col items-center gap-1"><label className="text-white text-xs font-mono">{Math.round(transform.scale * 100)}%</label><input type="range" min="0.5" max="10" step="0.01" value={transform.scale} onChange={(e) => handleZoomSliderChange(parseFloat(e.target.value))} className="w-24 h-1 appearance-none bg-gray-600 rounded-full cursor-pointer accent-white" title={t('zoomLevel')} /></div><div className="flex flex-col gap-1"><button onClick={() => handleZoom('in')} className="h-8 w-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors" title={t('zoomIn')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg></button><button onClick={resetTransform} className="h-8 w-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors" title={t('resetView')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.064 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg></button><button onClick={() => handleZoom('out')} className="h-8 w-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors" title={t('zoomOut')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button></div></div>)}</div></div> )}

      {isUploadNoticeVisible && !hasMedia && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
          <div className="max-w-sm w-full bg-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl animate-fade-in-up pointer-events-auto">
              <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-cyan-400 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  </div>
                  <div className="flex-1">
                      <h4 className="font-bold text-white text-lg">{t('vox_upload_notice_title')}</h4>
                      <ul className="mt-2 text-sm text-gray-300 space-y-1">
                          <li dangerouslySetInnerHTML={{ __html: t('vox_upload_notice_single') }}></li>
                          <li dangerouslySetInnerHTML={{ __html: t('vox_upload_notice_multiple') }}></li>
                      </ul>
                  </div>
                  <button onClick={handleDismissUploadNotice} className="-mt-2 -mr-2 p-1.5 text-gray-500 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                  </button>
              </div>
          </div>
        </div>
      )}

      <main className={`fixed inset-0 z-[30] flex flex-col items-center justify-end p-4 md:p-8 pointer-events-none transition-opacity duration-300 ${isInpaintingMode ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-full max-w-3xl flex flex-col items-center pointer-events-auto">
            <div className={`w-full transition-all duration-500 ease-in-out overflow-y-auto no-scrollbar ${isPanelExpanded ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0'}`}>
                {uploadedImages.length > 0 && (<div className="mb-4 animate-fade-in-up"><div className="flex justify-center gap-2 flex-wrap p-2 bg-black/20 rounded-lg">{uploadedImages.map((img, index) => (<div key={index} className="relative group"><img src={img.base64} alt={`upload ${index}`} className={`w-16 h-16 rounded-md object-cover cursor-pointer border-2 ${selectedIndices.has(index) ? 'border-white' : 'border-transparent'}`} onClick={() => handleToggleSelection(index)} /><button onClick={() => handleRemoveUploadedImage(index)} className="absolute -top-1 -right-1 h-5 w-5 bg-black/80 rounded-full text-white/70 hover:text-white text-xs items-center justify-center opacity-0 group-hover:opacity-100 hidden group-hover:flex">&times;</button></div>))}</div></div>)}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 animate-fade-in-up">
                    <div className="bg-black/20 p-4 rounded-lg"><button onClick={() => setIsFineTunePanelOpen(!isFineTunePanelOpen)} className="w-full flex justify-between items-center text-left font-semibold text-white mb-2"><span>{t('fineTuningTitle')}</span><svg className={`w-5 h-5 transform transition-transform duration-300 ${isFineTunePanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></button>
                        {isFineTunePanelOpen && (<div className="space-y-4 pt-4 mt-2 border-t border-white/10 animate-fade-in"><div><p className="text-sm font-medium text-gray-300 mb-2">{t('aspectRatio')}</p><div className="flex flex-wrap gap-2"><button onClick={() => setSelectedAspectRatio('auto')} disabled={isBusy} className={`px-3 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 ${selectedAspectRatio === 'auto' ? 'bg-white text-black border-white' : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'}`}>{t('auto')}</button>{ASPECT_RATIOS.map(ratio => (<button key={ratio} onClick={() => setSelectedAspectRatio(ratio)} disabled={isBusy} className={`px-3 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 ${selectedAspectRatio === ratio ? 'bg-white text-black border-white' : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'}`}>{ratio}</button>))}</div></div>
                        <div className="relative">
                            <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-300 mb-2">{t('negativePrompt')}</label>
                            <div className="flex items-center gap-2">
                                <input type="text" id="negative-prompt" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/80" placeholder={t('negativePromptPlaceholder')} />
                                <button onClick={handleSuggestNegatives} disabled={isBusy || !prompt.trim()} className="p-2 bg-white/10 rounded-lg text-white/70 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-50" title={t('suggest')}>{isSuggestingNegatives ? <SmallSpinner/> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1.586l-2.707 2.707a1 1 0 000 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414L8.414 4.586V3a1 1 0 00-1-1H5zM2 12a1 1 0 011-1h1.586l2.707-2.707a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0L4.586 13H3a1 1 0 01-1-1zm15 3a1 1 0 00-1-1h-1.586l-2.707 2.707a1 1 0 000 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414L15.414 16H17a1 1 0 001-1z" clipRule="evenodd" /></svg>}</button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="seed-input" className="block text-sm font-medium text-gray-300 mb-2">Seed</label>
                            <input
                                id="seed-input"
                                type="text"
                                value={seed}
                                onChange={e => setSeed(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/80"
                                placeholder="Random if empty"
                                disabled={isBusy}
                            />
                        </div>
                        <div><label htmlFor="detail-intensity" className="block text-sm font-medium text-gray-300 mb-2">{t('detailIntensity')} ({detailIntensity})</label><input id="detail-intensity" type="range" min="1" max="5" step="1" value={detailIntensity} onChange={e => setDetailIntensity(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white" /></div><div><p className="text-sm font-medium text-gray-300 mb-2">{t('artisticStyles')}</p><div className="flex flex-wrap gap-2">{STYLE_PRESETS.map(style => (<button key={style.name} onClick={() => handleToggleStyle(style.name)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${activeStyles.has(style.name) ? 'bg-white text-black border-white' : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'}`}>{style.name}</button>))}</div></div>
                        <div>
                            <p className="text-sm font-medium text-gray-300 mb-2">{t('styleReference')}</p>
                            <div className="flex items-center gap-3">
                                <button onClick={() => styleFileInputRef.current?.click()} disabled={isBusy} className="flex-grow text-center py-2 px-3 text-sm rounded-md transition-colors bg-white/10 text-gray-300 hover:bg-white/20">{t('uploadStyleImage')}</button>
                                {styleReferenceImage && (
                                    <div className="relative group/style">
                                        <img src={styleReferenceImage.base64} alt="Style Reference" className="w-12 h-12 rounded-md object-cover"/>
                                        <button onClick={() => setStyleReferenceImage(null)} className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-black/80 rounded-full text-white/70 hover:text-white text-xs opacity-0 group-hover/style:opacity-100">&times;</button>
                                    </div>
                                )}
                                <button onClick={handleApplyStyle} disabled={isBusy || !styleReferenceImage} className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/40 hover:text-cyan-300 transition-colors disabled:opacity-50" title={t('applyStyle')}>{isAnalyzingStyle ? <SmallSpinner/> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>}</button>
                            </div>
                        </div>
                        </div>)}
                    </div>
                    <div className="bg-black/20 p-4 rounded-lg flex flex-col"><button onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)} className="w-full flex justify-between items-center text-left font-semibold text-white mb-2"><span>{t('actionsAndToolsTitle')}</span><svg className={`w-5 h-5 transform transition-transform duration-300 ${isActionsPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></button>
                        {isActionsPanelOpen && (<div className="grid grid-cols-2 lg:grid-cols-3 gap-2 flex-grow content-start pt-4 mt-2 border-t border-white/10 animate-fade-in">
                           <button onClick={handleUndo} disabled={isBusy || undoStack.length === 0} className={actionButtonClasses}>{t('undo')}</button>
                           <button onClick={handleRedo} disabled={isBusy || redoStack.length === 0} className={actionButtonClasses}>{t('redo')}</button>
                           <button onClick={handleSurpriseMe} disabled={isBusy} className={actionButtonClasses}>{isGeneratingPrompt ? <SmallSpinner /> : t('surpriseMe')}</button>
                           {hasMedia && <button onClick={handleAnalyzeScene} disabled={isBusy} className={actionButtonClasses}>{isAnalyzingScene ? <SmallSpinner /> : t('analyzeScene')}</button>}
                           {hasMedia && <button onClick={handleGenerateVxog} disabled={isBusy} className={actionButtonClasses} title={t('vxogTooltip')}>{isGeneratingVxog ? <SmallSpinner /> : t('vxog')}</button>}
                           {hasMedia && <button onClick={handleGenerateVariations} disabled={isBusy} className={actionButtonClasses}>{isGeneratingVariations ? <SmallSpinner /> : t('variations')}</button>}
                           {hasMedia && !currentVideoUrl && <button onClick={enterInpaintingMode} disabled={isBusy} className={actionButtonClasses}>{t('inpaint')}</button>}
                           {hasMedia && !currentVideoUrl && (<div ref={upscalePanelRef} className="relative"><button onClick={() => setIsUpscalePanelOpen(p => !p)} disabled={isBusy || currentImageInfo?.upscaledTo === '4x'} className={actionButtonClasses + ' w-full'}>{isUpscaling ? <SmallSpinner /> : (currentImageInfo?.upscaledTo ? `${t('upscaled')} ${currentImageInfo.upscaledTo}` : t('vxeye'))}</button>{isUpscalePanelOpen && (<div className="absolute bottom-full mb-2 w-full grid grid-cols-1 gap-1 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-1 animate-fade-in-up origin-bottom">{currentImageInfo?.upscaledTo !== '2x' && <button onClick={() => handleUpscale('2x')} className="px-2 py-1.5 text-sm text-center rounded-md transition-colors bg-white/10 text-gray-300 hover:bg-white/20">{t('upscale2x')}</button>}<button onClick={() => handleUpscale('4x')} className="px-2 py-1.5 text-sm text-center rounded-md transition-colors bg-white/10 text-gray-300 hover:bg-white/20">{t('upscale4x')}</button></div>)}</div>)}
                           {hasMedia && !currentVideoUrl && (<div ref={reframePanelRef} className="relative"><button onClick={() => setIsReframePanelOpen(p => !p)} disabled={isBusy} className={actionButtonClasses + ' w-full'}>{isReframing ? <SmallSpinner/> : t('reframe')}</button>{isReframePanelOpen && (<div className="absolute bottom-full mb-2 w-full grid grid-cols-3 gap-1 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-1 animate-fade-in-up origin-bottom">{ASPECT_RATIOS.map(ratio => (<button key={ratio} onClick={() => handleReframe(ratio)} className="px-2 py-1 text-xs text-center rounded-md transition-colors bg-white/10 text-gray-300 hover:bg-white/20">{ratio}</button>))}</div>)}</div>)}
                           {hasMedia && !currentVideoUrl && <button onClick={toggle360View} className={`${actionButtonClasses} ${is360View ? 'bg-cyan-500/20 text-cyan-400' : ''}`}>{t('view360')}</button>}
                           <button onClick={() => setIsHistoryOpen(true)} disabled={isBusy} className={actionButtonClasses}>{t('history')}</button>
                           <button onClick={() => fileInputRef.current?.click()} disabled={isBusy || uploadedImages.length >= 6} className={actionButtonClasses}>{t('upload')}</button>
                           <button onClick={() => setIsKnowledgeBaseOpen(true)} className={actionButtonClasses}>{t('knowledgeBase')}</button>
                           {hasMedia && <button onClick={handleNewVision} disabled={isBusy} className={actionButtonClasses}>{t('newVision')}</button>}
                           {hasMedia && <button onClick={handleDownload} disabled={isBusy} className={actionButtonClasses}>{t('download')}</button>}
                           <button onClick={handleGenerateVideo} disabled={isBusy || !prompt.trim()} className={actionButtonClasses}>{t('generateVideo')}</button>
                        </div>)}
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={(e) => handleFilesSelected(e.target.files)} multiple accept="image/*" className="hidden" />
                <input type="file" ref={styleFileInputRef} onChange={(e) => handleStyleFileSelected(e.target.files)} accept="image/*" className="hidden" />
            </div>
            <div className="relative group w-full animate-slide-in-from-left">
                {error && (<div className="absolute bottom-full mb-2 w-full p-3 bg-red-900/50 border border-red-700/80 text-red-300 text-sm rounded-lg text-center animate-fade-in-up transition-all">{error}</div>)}
                <input type="text" value={prompt} onChange={handlePromptChange} onClick={handlePromptClick} onKeyDown={handleKeyDown} placeholder={placeholderText} disabled={isBusy} className="w-full bg-black/50 backdrop-blur-lg border border-white/20 text-white font-semibold py-4 pl-6 pr-20 rounded-full shadow-lg focus:outline-none focus:ring-4 focus:ring-white/50 transition-all duration-300" />
                <button onClick={handlePrimaryAction} disabled={isBusy || (operationMode !== 'combine' && !prompt.trim())} className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center bg-white text-black rounded-full transition-transform duration-200 transform group-hover:scale-105 active:scale-95 disabled:bg-gray-700 disabled:cursor-not-allowed" title={buttonTitle}>{isLoading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009.172 16V4.414a1 1 0 00-1.414-1.414L4 6.586V4a1 1 0 011-1h5a1 1 0 011 1v1.586l4.293 4.293a1 1 0 11-1.414 1.414L10.894 9.106V16l5.169 1.477a1 1 0 001.169-1.409l-7-14z" /></svg>}</button>
            </div>
            <div className="w-full max-w-lg mt-2 animate-fade-in-up"><div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg text-xs transition-all duration-300"><button onClick={() => setIsTokenUsageVisible(!isTokenUsageVisible)} className="w-full flex justify-between items-center p-2 text-left text-gray-400 hover:text-white"><div className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 13.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-3.586l-1-1V12a1 1 0 00-1-1H5a1 1 0 00-1 1v.414l-1 1zM4 3a1 1 0 011-1h10a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V3z"></path><path d="M3 8a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1-1H4a1 1 0 01-1-1V8z"></path></svg><span>{t('tokenUsageTitle')}</span></div><div className="flex items-center gap-2"><span>{t('sessionTotal')} {tokenUsage.session}</span><svg className={`w-4 h-4 transform transition-transform duration-300 ${isTokenUsageVisible ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div></button>{isTokenUsageVisible && (<div className="p-3 border-t border-white/10 text-gray-300 space-y-1 animate-fade-in"><div className="flex justify-between"><span>{t('lastOperation')}</span><span>{tokenUsage.last} {t('tokens')}</span></div><div className="flex justify-between"><span>{t('sessionTotal')}</span><span>{tokenUsage.session} {t('tokens')}</span></div><p className="pt-2 text-gray-500 text-[11px]">{t('tokenUsageNote')}</p></div>)}</div></div>
            <div className="relative mt-4 flex justify-center items-center gap-4 animate-fade-in-up"><div ref={modelSelectorRef} className="relative"><button onClick={() => setIsModelSelectorOpen(p => !p)} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50" disabled={!!currentImage || isBusy} title={currentImage ? t('modelFixed') : t('selectModel')}>{currentModelName}<svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>{isModelSelectorOpen && (<div className="absolute bottom-full mb-2 w-48 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-1 animate-fade-in-up origin-bottom">{AVAILABLE_MODELS.map(model => (<button key={model.id} onClick={() => { setSelectedModel(model.id); setIsModelSelectorOpen(false); }} className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${selectedModel === model.id ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}>{model.name}</button>))}</div>)}</div><span className="text-gray-600">|</span><button onClick={() => setIsPanelExpanded(p => !p)} className="text-sm text-gray-300 hover:text-white transition-colors">{isPanelExpanded ? t('lessOptions') : t('moreOptions')}</button></div>
        </div>
      </main>

      {isInpaintingMode && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-end p-4 md:p-8 pointer-events-none animate-fade-in">
          <div className="w-full max-w-3xl flex flex-col gap-4 items-center pointer-events-auto">
            <div className="w-full max-w-xl p-3 bg-black/50 backdrop-blur-lg border border-white/10 rounded-lg flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="brush-size" className="block text-xs font-medium text-gray-300 mb-1">{t('brushSize')}: {brushSize}px</label>
                <input id="brush-size" type="range" min="10" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white" disabled={isInpaintingLoading} />
              </div>
              <button onClick={clearInpaintingMask} disabled={isInpaintingLoading} className="h-10 px-4 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">{t('clearMask')}</button>
            </div>
            <div className="relative group w-full">
              <input type="text" value={inpaintingPrompt} onChange={(e) => setInpaintingPrompt(e.target.value)} placeholder={t('inpaintPromptPlaceholder')} disabled={isInpaintingLoading} className="w-full bg-black/50 backdrop-blur-lg border border-white/20 text-white font-semibold py-4 pl-6 pr-20 rounded-full shadow-lg focus:outline-none focus:ring-4 focus:ring-white/50 transition-all" />
              <button onClick={handleApplyInpainting} disabled={isInpaintingLoading || !inpaintingPrompt.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center bg-white text-black rounded-full transition-transform duration-200 transform group-hover:scale-105 active:scale-95 disabled:bg-gray-700 disabled:cursor-not-allowed" title={t('applyInpainting')}>{isInpaintingLoading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>}</button>
            </div>
            <button onClick={exitInpaintingMode} disabled={isInpaintingLoading} className="mt-2 text-sm text-gray-400 hover:text-white transition-colors">{t('exitInpainting')}</button>
          </div>
        </div>
      )}
    </>
  );
}

export default VoxPage;