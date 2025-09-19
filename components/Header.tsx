import React from 'react';
import { AppView } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import SessionTimer from './SessionTimer';

type User = {
    type: 'member' | 'guest';
} | null;

interface HeaderProps {
    view: AppView;
    setView: (view: AppView) => void;
    disabled: boolean;
    onGoToBridge: () => void;
    user: User;
    onLogout: () => void;
    remainingTime?: number;
}

function Header({ view, setView, disabled, user, onGoToBridge, onLogout, remainingTime }: HeaderProps) {
  const { t } = useTranslations();
  const mainPart = "VXDLabs";
  const voxPart = "VOX";
  const isGuest = user?.type === 'guest';
  
  // Guest-specific header for VOX view
  if (isGuest && view === 'vox') {
    return (
      <header className="relative z-20 text-center py-4">
        <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-extrabold text-white tracking-tight glitch" data-text="VOX">VOX</h1>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-bold rounded-full tracking-wider bg-amber-600 text-white">
                  {t('guest_tag')}
              </span>
              {remainingTime !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span>|</span>
                  <span>Session:</span>
                  <SessionTimer remainingTime={remainingTime} guestLayout />
                </div>
              )}
            </div>
        </div>
        <button
          onClick={onLogout}
          className="absolute top-1/2 -translate-y-1/2 right-0 p-2 text-gray-400 hover:text-white transition-colors duration-200"
          title="Logout"
          aria-label="Logout"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        </button>
      </header>
    );
  }

  const baseButtonClasses = "px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed";
  const activeButtonClasses = "bg-white text-black shadow-md";
  const inactiveButtonClasses = "bg-white/10 text-gray-300 hover:bg-white/20";
  
  const userTag = user && (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-full tracking-wider ${isGuest ? 'bg-amber-600 text-white' : 'bg-cyan-600 text-white'}`}>
        {isGuest ? t('guest_tag') : t('member_tag')}
    </span>
  );

  const backButton = user?.type === 'member' ? (
    <button
      onClick={onGoToBridge}
      className="absolute top-1/2 -translate-y-1/2 left-0 p-2 text-gray-400 hover:text-white transition-colors duration-200"
      title={t('back_to_menu_tooltip')}
      aria-label={t('back_to_menu_tooltip')}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
    </button>
  ) : null;

  const switcher = (
    <div className="flex items-center gap-4">
      <div className="flex justify-center p-1 space-x-2 bg-black/30 backdrop-blur-sm rounded-lg max-w-md mx-auto">
        <button
          onClick={() => setView('vxdl')}
          disabled={disabled || isGuest}
          className={`${baseButtonClasses} ${view === 'vxdl' ? activeButtonClasses : inactiveButtonClasses} w-1/4`}
          aria-pressed={view === 'vxdl'}
          title={isGuest ? t('vxdl_disabled_tooltip') : t('header_vxdl_tooltip')}
        >
          VXDLabs
        </button>
        <button
          onClick={() => setView('vox')}
          disabled={disabled}
          className={`${baseButtonClasses} ${view === 'vox' ? activeButtonClasses : inactiveButtonClasses} w-1/4`}
          aria-pressed={view === 'vox'}
          title={t('header_vox_tooltip')}
        >
          VOX
        </button>
        <button
          onClick={() => setView('cos')}
          disabled={disabled || isGuest}
          className={`${baseButtonClasses} ${view === 'cos' ? activeButtonClasses : inactiveButtonClasses} w-1/4`}
          aria-pressed={view === 'cos'}
          title={isGuest ? t('cos_disabled_tooltip') : t('header_cos_tooltip')}
        >
          COS
        </button>
         <button
          onClick={() => setView('vxpl')}
          disabled={disabled || isGuest}
          className={`${baseButtonClasses} ${view === 'vxpl' ? activeButtonClasses : inactiveButtonClasses} w-1/4`}
          aria-pressed={view === 'vxpl'}
          title={isGuest ? t('vxpl_disabled_tooltip') : t('header_vxpl_tooltip')}
        >
          VXPL
        </button>
      </div>
      {userTag}
    </div>
  );

  if (view === 'vox' || view === 'vxpl' || view === 'cos') {
    return (
      <header className="relative z-20">
        {backButton}
        <div className="flex justify-center">{switcher}</div>
      </header>
    );
  }

  return (
    <header className="text-center py-4 md:py-8 relative z-20">
      {backButton}
      <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight flex justify-center items-center gap-3">
        <span className="glitch" data-text={mainPart}>
          {mainPart}
        </span>
        <span className="glitch font-light text-white" data-text={voxPart}>
          {voxPart}
        </span>
      </h1>
      <div className="mt-6 flex justify-center">
        {switcher}
      </div>
    </header>
  );
}

export default Header;