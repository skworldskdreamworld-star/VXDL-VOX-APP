

export type AppView = 'vxdl' | 'vox' | 'vxpl' | 'cos' | 'vxog';

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type GenerationMode = 'text-to-image' | 'image-to-image' | 'text-to-video' | 'image-to-video';
export type GenerationModel = 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image-preview' | 'vxdl-1-fused';

export type ImageFilter = 'None' | 'Grayscale' | 'Sepia' | 'Invert' | 'Blur';
export type UpscaleResolution = '2x' | '4x';

export type User = {
  type: 'member' | 'guest';
  loginTime?: number;
} | null;

export interface ImageSettings {
  numberOfImages: number;
  aspectRatio: AspectRatio;
  model: GenerationModel;
}

export interface ImageInfo {
  src: string;
  upscaledTo?: UpscaleResolution;
  isRefined: boolean;
  filter?: ImageFilter;
}

export interface VoxSettings {
  negativePrompt: string;
  activeStyles: string[]; // Store names of active styles
  detailIntensity: number;
  aspectRatio?: AspectRatio | 'auto';
}

export interface HistoryItem {
  id: string;
  prompt: string;
  settings: ImageSettings;
  images: ImageInfo[];
  timestamp: number;
  generationMode: GenerationMode;
  inputImage?: string; // Base64 of the input image
  voxSettings?: VoxSettings; // Added for VOX state
  videoSrc?: string; // Base64 or Object URL of the generated video
  seed?: number;
}