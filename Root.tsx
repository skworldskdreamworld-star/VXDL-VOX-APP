import React, { useState, useEffect } from 'react';
import App from './App';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import BridgePage from './components/BridgePage';
import VoxPage from './components/VoxPage';
import COSPage from './components/COSPage';
import VXPLPage from './components/VXPLPage';
import VXOGPage from './components/VXOGPage';
import Header from './components/Header';
import AnimatedBackground from './components/AnimatedBackground';
import SessionTimer from './components/SessionTimer';
import { AppView, HistoryItem, ImageInfo, User } from './types';
import { LanguageProvider } from './hooks/useTranslations';

// Reduced history size to prevent localStorage quota errors and improve performance.
const MAX_HISTORY_ITEMS = 10;
const GUEST_SESSION_DURATION = 1800; // 30 minutes in seconds

function Root() {
  const [appState, setAppState] = useState<'landing' | 'login' | 'bridge' | 'app'>('landing');
  const [view, setView] = useState<AppView>('vxdl');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<User>(null);
  const [sessionTime, setSessionTime] = useState(GUEST_SESSION_DURATION);

  const handleLogout = () => {
    sessionStorage.removeItem('userSession');
    setUser(null);
    setAppState('login');
  };

  const handleGoToStart = () => {
    sessionStorage.removeItem('userSession');
    setUser(null);
    setAppState('landing');
  };

  // Load session ONCE on mount
  useEffect(() => {
    try {
      const storedUserJSON = sessionStorage.getItem('userSession');
      if (storedUserJSON) {
        const storedUser: User = JSON.parse(storedUserJSON);
        if (storedUser?.type === 'guest') {
          const elapsedTime = Math.floor((Date.now() - (storedUser.loginTime || 0)) / 1000);
          if (elapsedTime >= GUEST_SESSION_DURATION) {
            handleLogout();
            return; // Exit early, force re-login
          }
          setUser(storedUser);
          setSessionTime(GUEST_SESSION_DURATION - elapsedTime);
          setAppState('bridge');
        } else if (storedUser?.type === 'member') {
          setUser(storedUser);
          setAppState('bridge'); // Members go to the bridge
        }
      }

      const storedHistory = localStorage.getItem('generationHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load session from sessionStorage", error);
      sessionStorage.removeItem('userSession');
    }
  }, []);

  // Timer effect for guest users
  useEffect(() => {
    if (user?.type === 'guest') {
      const timer = setInterval(() => {
        setSessionTime(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timer);
            handleLogout();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [user]);


  /**
   * Safely saves history to localStorage, handling quota errors by silently
   * removing the oldest items until the data fits. This prevents console
   * errors and keeps the app responsive.
   * @param newHistory The desired new history array to save.
   */
  const saveHistory = (newHistory: HistoryItem[]) => {
    let historyToSave = [...newHistory];
    
    while (historyToSave.length > 0) {
      try {
        localStorage.setItem('generationHistory', JSON.stringify(historyToSave));
        // If successful, update the state and exit the loop
        setHistory(historyToSave);
        return; 
      } catch (error) {
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          // Quota exceeded, silently remove the oldest item and retry.
          historyToSave.pop(); 
        } else {
          // Log other, unexpected errors.
          console.error("Failed to save history to localStorage", error);
          return;
        }
      }
    }
    
    // This is reached if all items were removed.
    if (historyToSave.length === 0) {
        try {
            // Ensure localStorage is clean if history is empty.
            localStorage.removeItem('generationHistory');
        } catch (e) {
            console.error("Failed to clear history from localStorage after pruning.", e);
        }
        setHistory([]);
    }
  };


  const addToHistory = (item: HistoryItem) => {
    // Create the potential new history state, capped at the max size
    const newHistory = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
    saveHistory(newHistory);
  };

  const updateHistoryItem = (itemId: string, updatedImages: ImageInfo[]) => {
    const newHistory = history.map(item =>
      item.id === itemId ? { ...item, images: updatedImages } : item
    );
    saveHistory(newHistory);
  };
  
  const clearHistory = () => {
    // The confirmation dialog is handled by the component calling this function.
    try {
      localStorage.removeItem('generationHistory');
    } catch (e) {
      console.error("Failed to clear history from localStorage.", e);
    }
    setHistory([]);
  };

  const deleteHistoryItems = (idsToDelete: Set<string>) => {
    const newHistory = history.filter(item => !idsToDelete.has(item.id));
    saveHistory(newHistory);
  };
  
  const handleSetView = (newView: AppView) => {
    setView(newView);
  };

  const handleViewSelection = (selectedView: AppView) => {
    setView(selectedView);
    setAppState('app');
  };
  
  const handleGoToBridge = () => {
    setAppState('bridge');
  };

  const handleLoginSuccess = (userType: 'member' | 'guest') => {
    const newUser: User = { type: userType };
    if (userType === 'guest') {
        newUser.loginTime = Date.now();
        setSessionTime(GUEST_SESSION_DURATION);
    }

    try {
        sessionStorage.setItem('userSession', JSON.stringify(newUser));
    } catch (e) {
        console.error("Failed to save session to sessionStorage", e);
    }
    
    setUser(newUser);
    setAppState('bridge');
  };

  const historyProps = {
    history,
    addToHistory,
    updateHistoryItem,
    clearHistory
  };

  const renderMainAppView = () => {
    switch(view) {
      case 'vxdl':
        return (
          <div className="p-4 md:p-8 animate-fade-in pt-40 md:pt-48">
            <div className="max-w-7xl mx-auto">
              <App {...historyProps} />
            </div>
          </div>
        );
      case 'vox':
        return (
          <div className="animate-fade-in">
             <VoxPage {...historyProps} deleteHistoryItems={deleteHistoryItems} />
          </div>
        );
      case 'vxog':
        return (
          <div className="animate-fade-in">
            <VXOGPage />
          </div>
        );
      case 'cos':
         return (
          <div className="p-4 md:p-8 animate-fade-in pt-28 md:pt-32">
             <COSPage />
          </div>
        );
      case 'vxpl':
         return (
          <div className="p-4 md:p-8 animate-fade-in pt-28 md:pt-32">
             <VXPLPage />
          </div>
        );
      default:
        return null;
    }
  }
  
  const renderContent = () => {
    if (!user && appState === 'landing') {
      return <LandingPage onProceed={() => setAppState('login')} />;
    }

    if (!user) {
      return (
          <>
            <AnimatedBackground />
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          </>
      );
    }
    
    if (appState === 'bridge') {
      return (
        <>
          <AnimatedBackground />
          <BridgePage onSelectView={handleViewSelection} user={user} onGoToStart={handleGoToStart} />
        </>
      );
    }
    
    // appState === 'app'
    return (
        <>
          <AnimatedBackground />
          <div className="relative min-h-screen text-gray-200 font-sans z-20">
            {/* Shared Header */}
            <div className="absolute top-0 left-0 right-0 z-[40] p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <Header
                      user={user}
                      view={view}
                      setView={handleSetView}
                      disabled={false}
                      onGoToBridge={handleGoToBridge}
                      onLogout={handleLogout}
                      remainingTime={user?.type === 'guest' ? sessionTime : undefined}
                    />
                </div>
            </div>

            {/* View Content */}
            {renderMainAppView()}
          </div>
        </>
    );
  }

  return (
    <LanguageProvider>
      {renderContent()}
    </LanguageProvider>
  );
}

export default Root;
