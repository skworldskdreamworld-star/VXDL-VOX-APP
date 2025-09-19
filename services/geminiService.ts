import { GoogleGenAI, Modality } from "@google/genai";
import { ImageSettings, AspectRatio, UpscaleResolution } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Resizes a base64 encoded image to a maximum width/height while preserving aspect ratio.
 * This is crucial for reducing payload size and avoiding API errors.
 * @param base64Str The base64 string of the image.
 * @param maxWidth The maximum width of the output image.
 * @param maxHeight The maximum height of the output image.
 * @returns A promise that resolves with the resized base64 string and its mime type.
 */
const resizeImage = (base64Str: string, maxWidth: number = 1024, maxHeight: number = 1024): Promise<{resizedBase64: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = base64Str.substring(base64Str.indexOf(':') + 1, base64Str.indexOf(';'));
      const quality = mimeType === 'image/jpeg' ? 0.9 : undefined;
      const resizedBase64 = canvas.toDataURL(mimeType, quality);
      resolve({ resizedBase64, mimeType });
    };
    img.onerror = (error) => {
      reject(new Error(`Failed to load image for resizing: ${error}`));
    };
  });
};

/**
 * Parses errors from the Gemini API and returns a user-friendly message.
 * @param error The error object caught.
 * @returns A string containing a user-friendly error message.
 */
const parseGeminiError = (error: any): string => {
  console.error("Gemini API Error:", error);

  let message = 'An unknown and unexpected error occurred. Please try again.';

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object') {
    if (error.error && typeof error.error.message === 'string') {
      message = error.error.message;
    } else if (typeof error.message === 'string') {
      message = error.message;
    }
  }

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('xhr error') || lowerMessage.includes('network error') || lowerMessage.includes('failed to fetch')) {
    return 'A network connection error occurred. Please check your internet connection and try again. The API service may be temporarily unavailable.';
  }
  if (message.startsWith('Model refusal:')) {
    return message;
  }
  if (lowerMessage.includes('safety policies') || lowerMessage.includes('blocked')) {
    return 'Your request was blocked due to safety policies. Please adjust your prompt and try again.';
  }
  if (lowerMessage.includes('api key not valid')) {
    return 'The provided API key is invalid. Please ensure it is configured correctly.';
  }
  if (lowerMessage.includes('quota')) {
    return 'API quota exceeded. Please check your usage and limits.';
  }
  if (lowerMessage.includes('resource has been exhausted') || lowerMessage.includes('rate limit')) {
      return 'The server is busy or you have hit a rate limit. Please try again in a moment.';
  }

  return `An unexpected API error occurred: ${message}`;
};

export const enhancePrompt = async (
  currentPrompt: string,
  systemInstruction: string,
): Promise<string> => {
  if (!currentPrompt.trim()) {
    throw new Error("Prompt cannot be empty.");
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: currentPrompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } // Use 0 for low latency
      },
    });

    const enhancedPrompt = response.text.trim();
    
    // Sometimes the model might still add a label, so let's strip it.
    const cleanPrompt = enhancedPrompt.replace(/^(enhanced prompt|prompt):\s*/i, '').trim();

    if (!cleanPrompt) {
      throw new Error("The model could not enhance the prompt.");
    }
    
    return cleanPrompt;

  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const generateCreativePrompt = async (
    instruction: string,
    systemInstruction: string,
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: instruction,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    const creativePrompt = response.text.trim().replace(/^prompt:\s*/i, '').trim();

    if (!creativePrompt) {
      throw new Error("The model could not generate a creative prompt.");
    }
    
    return creativePrompt;

  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const generateVariations = async (
  base64ImageData: string,
  _mimeType: string, // No longer used, will be derived from resized image
  instruction: string,
): Promise<string[]> => {
  try {
    const { resizedBase64, mimeType } = await resizeImage(base64ImageData);
    const pureBase64 = resizedBase64.substring(resizedBase64.indexOf(',') + 1);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: pureBase64,
              mimeType: mimeType,
            },
          },
          { text: instruction },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const images: string[] = [];
    let refusalText: string | null = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        } else if (part.text) {
          refusalText = (refusalText || "") + part.text;
        }
      }
    }

    if (images.length === 0) {
      if (refusalText) {
        throw new Error(`Model refusal: ${refusalText}`);
      }
      throw new Error("The model did not return any variations. It may have refused the request due to safety policies.");
    }

    return images;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};


export const generateImagesFromPrompt = async (
  prompt: string,
  settings: ImageSettings,
  vxdlUltraSystemInstruction: string | undefined,
  aspectRatioTextTemplate: string,
): Promise<string[]> => {
  try {
      if (settings.model === 'gemini-2.5-flash-image-preview') {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image-preview',
              contents: {
                  parts: [{ text: prompt + aspectRatioTextTemplate.replace('{{ratio}}', settings.aspectRatio) }],
              },
              config: {
                  responseModalities: [Modality.IMAGE, Modality.TEXT],
                  ...(vxdlUltraSystemInstruction && { systemInstruction: vxdlUltraSystemInstruction }),
              },
          });

          const images: string[] = [];
          let refusalText: string | null = null;
          if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                  if (part.inlineData) {
                      images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                  } else if (part.text) {
                      refusalText = (refusalText || "") + part.text;
                  }
              }
          }

          if (images.length === 0) {
              if (refusalText) {
                  throw new Error(`Model refusal: ${refusalText}`);
              }
              throw new Error("VXDL 1 ULTRA: The model did not return an image. This might be due to safety policies.");
          }
          return [images[0]];
      } else {
          const response = await ai.models.generateImages({
              model: 'imagen-4.0-generate-001',
              prompt: prompt,
              config: {
                  numberOfImages: 1,
                  aspectRatio: settings.aspectRatio,
              },
          });

          if (!response.generatedImages || response.generatedImages.length === 0) {
              const modelName = settings.model === 'vxdl-1-fused' ? "VXDL 1" : "Imagen 4 Pro";
              throw new Error(`${modelName}: The model did not return an image. This might be due to safety policies.`);
          }
          
          const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
          return [`data:image/png;base64,${base64ImageBytes}`];
      }
  } catch (error) {
      throw new Error(parseGeminiError(error));
  }
};

export const editImageFromPrompt = async (
  masterPrompt: string,
  base64ImageData: string,
  _mimeType: string // No longer used, will be derived from resized image
): Promise<string[]> => {
  try {
    const { resizedBase64, mimeType } = await resizeImage(base64ImageData);
    const pureBase64 = resizedBase64.substring(resizedBase64.indexOf(',') + 1);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: pureBase64,
              mimeType: mimeType,
            },
          },
          { text: masterPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const images: string[] = [];
    let refusalText: string | null = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        } else if (part.text) {
          refusalText = (refusalText || "") + part.text;
        }
      }
    }

    if (images.length === 0) {
      if (refusalText) {
        throw new Error(`Model refusal: ${refusalText}`);
      }
      throw new Error("The model did not return an edited image. It may have refused the request due to safety policies or an unclear prompt.");
    }

    return images;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const inpaintImage = async (
  originalImageBase64: string,
  maskImageBase64: string,
  mimeType: string,
  masterPrompt: string
): Promise<string[]> => {
  try {
    const pureOriginalBase64 = originalImageBase64.substring(originalImageBase64.indexOf(',') + 1);
    const pureMaskBase64 = maskImageBase64.substring(maskImageBase64.indexOf(',') + 1);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: pureOriginalBase64,
              mimeType: mimeType,
            },
          },
          {
            inlineData: {
                data: pureMaskBase64,
                mimeType: 'image/png', // Masks from canvas are PNGs
            },
          },
          { text: masterPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const images: string[] = [];
    let refusalText: string | null = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        } else if (part.text) {
          refusalText = (refusalText || "") + part.text;
        }
      }
    }

    if (images.length === 0) {
      if (refusalText) {
        throw new Error(`Model refusal: ${refusalText}`);
      }
      throw new Error("The model did not return an inpainted image. It may have refused the request.");
    }

    return images;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const combineImages = async (
  images: { base64: string; mimeType: string }[],
  masterPrompt: string,
): Promise<string[]> => {
  try {
    if (images.length < 2 || images.length > 6) {
      throw new Error("Combining requires 2 to 6 images.");
    }

    const resizedImagePromises = images.map(image => resizeImage(image.base64));
    const resizedImages = await Promise.all(resizedImagePromises);

    const imageParts = resizedImages.map(image => {
      const pureBase64 = image.resizedBase64.substring(image.resizedBase64.indexOf(',') + 1);
      return {
        inlineData: {
          data: pureBase64,
          mimeType: image.mimeType,
        },
      };
    });

    const textPart = { text: masterPrompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [...imageParts, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const resultImages: string[] = [];
    let refusalText: string | null = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          resultImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        } else if (part.text) {
          refusalText = (refusalText || "") + part.text;
        }
      }
    }

    if (resultImages.length === 0) {
      if (refusalText) {
        throw new Error(`Model refusal: ${refusalText}`);
      }
      throw new Error("The model did not return a combined image. It may have refused the request due to safety policies or an unclear prompt.");
    }

    return resultImages;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};


export const upscaleImage = async (
  base64ImageData: string,
  resolution: UpscaleResolution,
  upscalePrompt: string
): Promise<string> => {
  try {
    const pureBase64 = base64ImageData.substring(base64ImageData.indexOf(',') + 1);
    const mimeType = base64ImageData.substring(base64ImageData.indexOf(':') + 1, base64ImageData.indexOf(';'));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: pureBase64,
              mimeType: mimeType,
            },
          },
          { text: upscalePrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    let upscaledImage: string | null = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          upscaledImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!upscaledImage) {
      throw new Error("The model did not return an upscaled image. This may be due to safety policies.");
    }

    return upscaledImage;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const refineImage = async (
  base64ImageData: string,
  masterPrompt: string
): Promise<string> => {
  try {
    const { resizedBase64, mimeType } = await resizeImage(base64ImageData);
    const pureBase64 = resizedBase64.substring(resizedBase64.indexOf(',') + 1);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: pureBase64,
              mimeType: mimeType,
            },
          },
          { text: masterPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    let refinedImage: string | null = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          refinedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!refinedImage) {
      throw new Error("The model did not return a refined image. This may be due to safety policies.");
    }

    return refinedImage;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const reframeImage = async (
  base64ImageData: string,
  _mimeType: string, // No longer used, will be derived from resized image
  masterPrompt: string,
): Promise<string[]> => {
  try {
    const { resizedBase64, mimeType } = await resizeImage(base64ImageData);
    const pureBase64 = resizedBase64.substring(resizedBase64.indexOf(',') + 1);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: pureBase64,
              mimeType: mimeType,
            },
          },
          { text: masterPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const images: string[] = [];
    let refusalText: string | null = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        } else if (part.text) {
          refusalText = (refusalText || "") + part.text;
        }
      }
    }

    if (images.length === 0) {
      if (refusalText) {
        throw new Error(`Model refusal: ${refusalText}`);
      }
      throw new Error("The model did not return a reframed image. It may have refused the request.");
    }

    return images;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};


export const generateVideo = async (
  prompt: string,
  image: { base64: string; mimeType: string } | null,
  onProgress: (message: string) => void,
  progressMessages: string[]
): Promise<string> => {
  try {
    let resizedImage: { base64: string; mimeType: string } | null = null;
    if (image) {
      const { resizedBase64, mimeType } = await resizeImage(image.base64);
      resizedImage = { base64: resizedBase64, mimeType: mimeType };
    }
    const pureBase64 = resizedImage ? resizedImage.base64.substring(resizedImage.base64.indexOf(',') + 1) : null;

    const requestPayload: any = {
      model: 'veo-2.0-generate-001',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
      },
    };

    if (pureBase64 && resizedImage) {
      requestPayload.image = {
        imageBytes: pureBase64,
        mimeType: resizedImage.mimeType,
      };
    }
    
    onProgress(progressMessages[0]);

    let operation = await ai.models.generateVideos(requestPayload);
    
    onProgress(progressMessages[1]);

    const progressInterval = 20000; // 20 seconds
    let progressCounter = 2;

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, progressInterval));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      
      if (!operation.done) {
        onProgress(progressMessages[progressCounter % progressMessages.length]);
        progressCounter++;
      }
    }
    
    onProgress("Finalizing video...");

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was found.");
    }

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video file. Status: ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();
    
    return URL.createObjectURL(videoBlob);

  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const changeImageViewpoint = async (
  base64ImageData: string,
  _mimeType: string, // No longer used, will be derived from resized image
  instruction: string,
): Promise<string> => {
  try {
    const { resizedBase64, mimeType } = await resizeImage(base64ImageData);
    const pureBase64 = resizedBase64.substring(resizedBase64.indexOf(',') + 1);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: pureBase64,
              mimeType: mimeType,
            },
          },
          { text: instruction },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let newImage: string | null = null;
    let refusalText: string | null = null;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          newImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break; // We only expect one image back
        } else if (part.text) {
          refusalText = (refusalText || "") + part.text;
        }
      }
    }

    if (!newImage) {
      if (refusalText) {
          throw new Error(`Model refusal: ${refusalText}`);
      }
      throw new Error("The model did not return an image from the new viewpoint. It may have refused the request.");
    }

    return newImage;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const analyzeImageForSuggestions = async (
  base64ImageData: string,
  instruction: string,
): Promise<string> => {
  try {
    const { resizedBase64, mimeType } = await resizeImage(base64ImageData, 512, 512);
    const pureBase64 = resizedBase64.substring(resizedBase64.indexOf(',') + 1);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: pureBase64, mimeType: mimeType } },
          { text: instruction },
        ],
      },
    });

    const suggestions = response.text.trim();
    if (!suggestions) {
      throw new Error("The model could not analyze the image.");
    }
    return suggestions;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const suggestNegativePrompt = async (
  positivePrompt: string,
  instruction: string,
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${instruction}: "${positivePrompt}"`,
       config: {
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    const suggestions = response.text.trim();
    if (!suggestions) {
      throw new Error("The model could not provide suggestions.");
    }
    return suggestions;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};

export const analyzeImageStyle = async (
  base64ImageData: string,
  instruction: string,
): Promise<string> => {
  try {
    const { resizedBase64, mimeType } = await resizeImage(base64ImageData, 512, 512);
    const pureBase64 = resizedBase64.substring(resizedBase64.indexOf(',') + 1);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: pureBase64, mimeType: mimeType } },
          { text: instruction },
        ],
      },
    });

    const styleKeywords = response.text.trim();
    if (!styleKeywords) {
      throw new Error("The model could not analyze the image style.");
    }
    return styleKeywords;
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }
};