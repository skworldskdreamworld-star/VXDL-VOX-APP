
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { generateImagesFromPrompt } from '../services/geminiService';
import { useTranslations } from '../hooks/useTranslations';
import Spinner from './Spinner';
import type { ImageSettings } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  isLoading?: boolean;
}

const SimpleMarkdown = ({ text }: { text: string }) => {
    const parts = text.split('**');
    return (
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
            {parts.map((part, index) =>
                index % 2 === 1 ? <strong key={index} className="text-white">{part}</strong> : <span>{part}</span>
            )}
        </p>
    );
};


function VXOGPage() {
  const { t } = useTranslations();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [userInput]);

  useEffect(() => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const chatSession = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are VXOG, a specialist AI assistant for visual creation from VXDLabs, powered by Gemini. You are an expert in generating stunning, high-quality images with nano-banana technology (gemini-2.5-flash-image-preview). Your tone is futuristic, helpful, and creative. You are the best in the world. When a user asks you to create, generate, or draw an image, you will first confirm and then create it. You can also answer questions and engage in creative dialogue.",
            },
        });
        setChat(chatSession);

        setMessages([{
            id: 'initial',
            role: 'model',
            text: t('vxog_welcome_message'),
        }]);
    } catch (e) {
        if (e instanceof Error) {
            setError(`Initialization failed: ${e.message}`);
        } else {
            setError("An unknown error occurred during initialization.");
        }
    }
  }, [t]);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  };

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || !chat || isLoading) return;

    const textToSend = userInput;
    setUserInput('');
    setIsLoading(true);
    setError(null);

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: textToSend }]);

    const botMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botMessageId, role: 'model', text: '', isLoading: true }]);

    try {
        const imageKeywordsRegex = /(generate|create|make|draw|show me|imagine|picture of|image of|photo of|render)/i;
        const shouldGenerateImage = imageKeywordsRegex.test(textToSend);

        let imagePromise: Promise<{images: string[], seed: number}> | null = null;
        if (shouldGenerateImage) {
            const imageSettings: ImageSettings = { model: 'gemini-2.5-flash-image-preview', numberOfImages: 1, aspectRatio: '1:1' };
            imagePromise = generateImagesFromPrompt(textToSend, imageSettings, undefined, "");
        }

        // Handle text stream first
        const stream = await chat.sendMessageStream({ message: textToSend });
        let fullText = '';
        for await (const chunk of stream) {
            fullText += chunk.text;
            setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: fullText } : m));
        }

        // Then, handle image generation and its specific errors
        if (imagePromise) {
            try {
                const imageResult = await imagePromise;
                if (imageResult.images && imageResult.images.length > 0) {
                    setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, image: imageResult.images[0] } : m));
                }
            } catch (imageError) {
                console.error("Image generation failed:", imageError);
                const errorMessage = imageError instanceof Error ? imageError.message : "An unknown image error occurred.";
                
                // Only show an error if it's NOT a safety/refusal, as the chat text likely covered that.
                const isRefusal = errorMessage.toLowerCase().includes('refusal') || errorMessage.toLowerCase().includes('safety') || errorMessage.toLowerCase().includes('blocked');
                
                if (!isRefusal) {
                    // For non-refusal errors, append them to the message for context.
                    setMessages(prev => prev.map(m => {
                        if (m.id === botMessageId) {
                            const newText = m.text ? `${m.text}\n\n**Image Generation Failed:** ${errorMessage}` : `**Image Generation Failed:** ${errorMessage}`;
                            return { ...m, text: newText };
                        }
                        return m;
                    }));
                }
                // If it is a refusal, we do nothing and let the bot's text response stand on its own.
            }
        }
    } catch (err) { // This will now catch errors from chat.sendMessageStream primarily
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(errorMessage);
        setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: `Error: ${errorMessage}` } : m));
    } finally {
        setIsLoading(false);
        setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isLoading: false } : m));
    }
  }, [userInput, chat, isLoading]);

  return (
    <div className="pt-28 md:pt-32 pb-40 relative h-screen">
      <div className="max-w-4xl mx-auto h-full flex flex-col px-4">
        <div id="message-list" className="flex-1 overflow-y-auto no-scrollbar pr-2">
            <div className="space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-cyan-900/50 border border-cyan-400/50 flex-shrink-0"></div>
                        )}
                        <div className={`relative group w-full max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-white/10' : 'bg-gray-950/50'}`}>
                            {msg.isLoading && msg.text === '' && !msg.image && (
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse delay-0"></span>
                                    <span className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse delay-150"></span>
                                    <span className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse delay-300"></span>
                                </div>
                            )}
                            {msg.text && <SimpleMarkdown text={msg.text} />}
                            {msg.image && (
                                <div className="mt-4 bg-black/30 rounded-lg overflow-hidden border border-gray-700">
                                    <img src={msg.image} alt="Generated by VXOG" className="w-full h-auto" />
                                </div>
                            )}
                            {msg.role === 'model' && msg.text && !msg.isLoading && (
                                <button
                                    onClick={() => handleCopy(msg.text, msg.id)}
                                    title={copiedMessageId === msg.id ? t('prompt_copied') : t('prompt_copy')}
                                    aria-label="Copy response text"
                                    className="absolute top-2 right-2 p-2 bg-gray-800/80 backdrop-blur-sm rounded-full text-white/70 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gray-700 hover:text-white focus:opacity-100"
                                >
                                {copiedMessageId === msg.id ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                                        <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" />
                                    </svg>
                                )}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
          <div ref={messagesEndRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent z-10 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {error && <div className="mb-2 p-3 bg-red-900/50 border border-red-700/80 text-red-300 text-sm rounded-lg text-center">{error}</div>}
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={t('vxog_input_placeholder')}
                        disabled={!chat || isLoading}
                        className="w-full bg-black/50 backdrop-blur-lg border-2 border-white/20 text-white rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300 py-4 pl-6 pr-20 resize-none overflow-y-hidden max-h-48"
                        rows={1}
                    />
                    <button 
                        onClick={handleSendMessage} 
                        disabled={!chat || isLoading || !userInput.trim()} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center bg-white text-black rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:bg-gray-700 disabled:cursor-not-allowed"
                        aria-label="Send message"
                    >
                        {isLoading ? <Spinner/> : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009.172 16V4.414a1 1 0 00-1.414-1.414L4 6.586V4a1 1 0 011-1h5a1 1 0 011 1v1.586l4.293 4.293a1 1 0 11-1.414 1.414L10.894 9.106V16l5.169 1.477a1 1 0 001.169-1.409l-7-14z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default VXOGPage;
