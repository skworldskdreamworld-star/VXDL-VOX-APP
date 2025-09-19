import React, { useState } from 'react';
import AnimatedBackground from './AnimatedBackground';
import { useTranslations } from '../hooks/useTranslations';

interface LandingPageProps {
  onProceed: () => void;
}

function LandingPage({ onProceed }: LandingPageProps) {
  const { t } = useTranslations();
  const [isExiting, setIsExiting] = useState(false);

  const handleStartClick = () => {
    setIsExiting(true);
    setTimeout(onProceed, 500); // Match animation duration
  };

  const mainPart = "VXDLabs";
  const voxPart = "VOX";

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center">
      <AnimatedBackground />
      <div className={`relative z-10 text-center animate-fade-in-up ${isExiting ? 'animate-fade-out-and-scale' : ''}`}>
        <h1 className="text-6xl md:text-8xl font-extrabold text-white tracking-tight flex justify-center items-center gap-4">
            <span className="glitch" data-text={mainPart}>
                {mainPart}
            </span>
            <span className="glitch font-light" data-text={voxPart}>
                {voxPart}
            </span>
        </h1>
        <p className="mt-4 text-xl text-gray-400 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          {t('landing_subtitle')}
        </p>
        <div className="mt-12 animate-fade-in" style={{ animationDelay: '1s' }}>
          <button
            onClick={handleStartClick}
            className="bg-white text-black font-semibold py-3 px-10 rounded-lg shadow-lg hover:shadow-xl hover:shadow-white/20 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-white/50 transform hover:scale-105 active:scale-100"
            title="Begin your creative journey"
          >
            {t('landing_start_button')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;