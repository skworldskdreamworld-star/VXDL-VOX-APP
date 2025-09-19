import React, { useState, useMemo } from 'react';
import { AppView, User } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import LanguageSelector from './LanguageSelector';

const VxdlIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 md:w-16 md:h-16 mb-4">
        <path d="M12 16H52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M12 48H52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M20 16V48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5"/>
        <path d="M44 16V48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5"/>
        <rect x="26" y="26" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2.5"/>
    </svg>
);

const VoxIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 md:w-16 md:h-16 mb-4">
        <path d="M32 4L4 19V49L32 64L60 49V19L32 4Z" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M4 19L32 34L60 19" stroke="currentColor" strokeWidth="2"/>
        <path d="M32 64V34" stroke="currentColor" strokeWidth="2"/>
        <path d="M18 11.5L18 41.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5"/>
        <path d="M46 11.5L46 41.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5"/>
    </svg>
);

const CosIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 md:w-16 md:h-16 mb-4">
        <rect x="4" y="12" width="56" height="40" rx="4" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.7"/>
        <path d="M4 22H60" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
        <path d="M4 42H60" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
        <path d="M16 12V52" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
        <path d="M48 12V52" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
    </svg>
);

const VxplIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 md:w-16 md:h-16 mb-4">
        <path d="M20 12H48V52H20V12Z" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4"/>
        <path d="M16 10H44C45.1046 10 46 10.8954 46 12V50C46 51.1046 45.1046 52 44 52H16C14.8954 52 14 51.1046 14 50V12C14 10.8954 14.8954 10 16 10Z" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M22 20H38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M22 28H32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
);

interface Choice {
  id: AppView;
  name: string;
  description: string;
  icon: React.ComponentType;
}

interface BridgePageProps {
  onSelectView: (view: AppView) => void;
  user: User;
  onGoToStart: () => void;
}

function BridgePage({ onSelectView, user, onGoToStart }: BridgePageProps) {
  const { t } = useTranslations();
  const [exitingTo, setExitingTo] = useState<AppView | null>(null);

  const choices: Choice[] = useMemo(() => [
    {
      id: 'vxdl',
      name: t('bridge_vxdl_name'),
      description: t('bridge_vxdl_description'),
      icon: VxdlIcon
    },
    {
      id: 'vox',
      name: t('bridge_vox_name'),
      description: t('bridge_vox_description'),
      icon: VoxIcon
    },
    {
      id: 'cos',
      name: t('bridge_cos_name'),
      description: t('bridge_cos_description'),
      icon: CosIcon
    },
    {
      id: 'vxpl',
      name: t('bridge_vxpl_name'),
      description: t('bridge_vxpl_description'),
      icon: VxplIcon
    }
  ], [t]);

  const handleSelect = (view: AppView) => {
    if (exitingTo) return;
    setExitingTo(view);
    setTimeout(() => {
      onSelectView(view);
    }, 800); // Animation duration
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <button
        onClick={onGoToStart}
        className="absolute top-4 left-4 z-20 p-2 text-gray-400 hover:text-white transition-colors duration-200"
        title="Back to Start Page"
        aria-label="Back to Start Page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>

      <LanguageSelector />

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {choices.map((choice, index) => {
          const Icon = choice.icon;
          const isSelected = exitingTo === choice.id;
          const isExiting = exitingTo !== null;

          let animationClass = 'animate-fade-in-up';
          if (isExiting) {
            if (isSelected) {
              animationClass = 'animate-flow-up';
            } else {
              animationClass = 'animate-fade-out-and-scale';
            }
          }

          return (
            <div
              key={choice.id}
              className={`
                relative group
                w-full max-w-xs md:w-64 lg:w-72
                ${animationClass}
              `}
              style={{ animationDelay: isExiting ? '0ms' : `${150 * (index + 1)}ms` }}
            >
              {/* Glow effect for border on hover */}
              <div className="absolute -inset-px bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-70 transition duration-500 pointer-events-none"></div>

              <button
                onClick={() => handleSelect(choice.id)}
                disabled={isExiting}
                className={`
                  relative w-full h-full
                  bg-black/30 backdrop-blur-xl
                  border border-white/10 rounded-2xl
                  p-6 md:p-8 text-center text-white
                  flex flex-col items-center
                  transition-all duration-300 ease-in-out
                  transform group-hover:-translate-y-2 group-hover:bg-black/40
                  focus:outline-none focus:ring-4 focus:ring-cyan-400/50
                  overflow-hidden
                `}
              >
                {/* Top spotlight sheen on hover */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                {/* Content wrapper */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="text-cyan-400 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                    <Icon />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{choice.name}</h3>
                  {(choice.id === 'vox' || choice.id === 'cos') && user?.type === 'member' && (
                    <span className="mb-3 px-3 py-1 text-xs font-bold rounded-full tracking-wider bg-cyan-600 text-white animate-fade-in">
                        {t('member_tag')}
                    </span>
                  )}
                  <p className="text-sm md:text-base text-gray-400">{choice.description}</p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BridgePage;
