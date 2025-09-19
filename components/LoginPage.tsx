import React, { useState } from 'react';
import Button from './Button';

interface LoginPageProps {
  onLoginSuccess: (userType: 'member' | 'guest') => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      let userType: 'member' | 'guest' | null = null;
      if (username === 'vxdl' && password === 'vxdlvox') {
        userType = 'member';
      } else if (username === 'guest' && password === 'vxdl12345') {
        userType = 'guest';
      }

      if (userType) {
        setIsExiting(true);
        setTimeout(() => onLoginSuccess(userType!), 500);
      } else {
        setError('Invalid credentials. Please try again.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className={`fixed inset-0 z-20 flex flex-col items-center justify-center animate-fade-in ${isExiting ? 'animate-fade-out-and-scale' : ''}`}>
      <div className="w-full max-w-sm p-4 space-y-6">
        <h2 className="glitch text-5xl font-bold mb-8 text-center uppercase tracking-widest" data-text="Authentication">
          Authentication
        </h2>
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="stagger-fade-in-down stagger-delay-1">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2 tracking-wider">
              USERNAME
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full bg-transparent border-b-2 border-gray-700 focus:border-white rounded-none p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-0 transition-all duration-300 font-mono"
              required
            />
          </div>
          <div className="stagger-fade-in-down stagger-delay-2">
            <label htmlFor="password"  className="block text-sm font-medium text-gray-300 mb-2 tracking-wider">
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full bg-transparent border-b-2 border-gray-700 focus:border-white rounded-none p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-0 transition-all duration-300 font-mono"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 text-center animate-fade-in">{error}</p>
          )}
          <div className="pt-4 stagger-fade-in-down stagger-delay-3">
            <Button type="submit" isLoading={isLoading} disabled={!username || !password}>
              ACCESS
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
