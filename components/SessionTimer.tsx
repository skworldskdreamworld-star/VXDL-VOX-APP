import React from 'react';

interface SessionTimerProps {
  remainingTime: number; // in seconds
  guestLayout?: boolean;
}

function SessionTimer({ remainingTime, guestLayout = false }: SessionTimerProps) {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const isLowTime = remainingTime <= 300; // 5 minutes

  if (guestLayout) {
    if (remainingTime <= 0) {
      return (
          <span className={`text-red-400 font-mono text-xs`}>
              Expired
          </span>
      );
    }
    return (
      <span className={`${isLowTime ? 'text-amber-400' : 'text-gray-300'} font-mono text-xs`}>
        {formattedTime}
      </span>
    );
  }

  if (remainingTime <= 0) {
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/80 backdrop-blur-md border border-red-500 text-red-300 rounded-full px-4 py-2 text-sm font-mono shadow-lg animate-fade-in-down">
            Guest Session Expired
        </div>
    );
  }

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 backdrop-blur-md border ${isLowTime ? 'border-amber-500 text-amber-400' : 'border-white/20 text-white'} rounded-full px-4 py-2 text-sm font-mono shadow-lg animate-fade-in-down`}>
      Guest Session: {formattedTime}
    </div>
  );
}

export default SessionTimer;