
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from './Button';
import { useTranslations } from '../hooks/useTranslations';

interface InpaintingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInpaint: (maskBase64: string, inpaintPrompt: string) => void;
  imageSrc: string | null;
  isInpainting: boolean;
}

function InpaintingModal({ isOpen, onClose, onInpaint, imageSrc, isInpainting }: InpaintingModalProps) {
  const { t } = useTranslations();
  const [prompt, setPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(40);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const drawOnCanvas = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2 * scaleX, 0, Math.PI * 2);
    ctx.fill();
  }, [isDrawing, brushSize]);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    drawOnCanvas(e.nativeEvent);
  }, [drawOnCanvas]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    drawOnCanvas(e.nativeEvent);
  }, [drawOnCanvas]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
     drawOnCanvas(e.nativeEvent);
  }, [drawOnCanvas]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (isOpen && imageSrc && imageRef.current) {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const onLoad = () => {
            if (canvas) {
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                clearCanvas();
            }
        };
        if (image.complete) {
            onLoad();
        } else {
            image.addEventListener('load', onLoad);
        }
        return () => image.removeEventListener('load', onLoad);
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleInpaintClick = () => {
    const canvas = canvasRef.current;
    if (prompt.trim() && canvas) {
      const maskBase64 = canvas.toDataURL('image/png');
      onInpaint(maskBase64, prompt);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-950/80 border border-white/10 rounded-2xl p-6 w-full max-w-4xl mx-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('inpainting_modal_title')}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative aspect-square bg-black/20 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center">
            <img ref={imageRef} src={imageSrc} alt="Image to inpaint" className="max-w-full max-h-full object-contain" style={{ display: 'block' }} />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full opacity-50 cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onMouseMove={handleMouseMove}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchMove={handleTouchMove}
            />
          </div>
          
          <div className="flex flex-col space-y-4">
            <div>
              <label htmlFor="inpaint-prompt" className="block text-sm font-medium text-gray-300 mb-2">{t('inpainting_modal_instructions_label')}</label>
              <textarea
                id="inpaint-prompt"
                rows={5}
                className="w-full bg-white/5 border border-gray-800 hover:border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/80 transition-all"
                placeholder={t('inpainting_modal_placeholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isInpainting}
              />
            </div>
            <div className="space-y-2">
                <label htmlFor="brush-size" className="block text-sm font-medium text-gray-300">{t('inpainting_modal_brush_size_label', { size: brushSize })}</label>
                <input
                    id="brush-size"
                    type="range"
                    min="10"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                    disabled={isInpainting}
                    title="Adjust the size of the inpainting brush"
                />
            </div>
            <p className="text-xs text-gray-500">{t('inpainting_modal_note')}</p>
            <div className="flex-grow flex items-end gap-4">
              <button onClick={clearCanvas} disabled={isInpainting} className="w-1/2 bg-white/10 text-white font-semibold py-3 px-6 rounded-lg hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50" title="Erase the entire mask">{t('inpainting_modal_clear_button')}</button>
              <Button onClick={handleInpaintClick} isLoading={isInpainting} disabled={!prompt.trim() || isInpainting} title="Regenerate the masked area based on your prompt">{t('inpainting_modal_apply_button')}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InpaintingModal;