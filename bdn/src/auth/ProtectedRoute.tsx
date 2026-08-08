import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Lock, ShieldAlert, LogIn, ArrowLeft, Mail, UserCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { LoadingState } from '../components/LoadingState';

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const location = useLocation();

  const [emailInput, setEmailInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (isLoading) {
    return <LoadingState message="Verifying authentication session..." type="spinner" />;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    await login(emailInput || 'guest.viewer@cinemaseat.com');
    setIsLoggingIn(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-amber-500" />

        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/50 flex items-center justify-center mx-auto text-red-500 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Authentication Required</h2>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
            Please sign in to proceed with seat holds, complete payment transactions, or view your verified cinema bookings.
          </p>
        </div>

        {/* Quick Simulated Auth Gate Form */}
        <form onSubmit={handleQuickLogin} className="space-y-4 pt-2">
          <div>
            <label className="block text-[11px] font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="guest.viewer@cinemaseat.com"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoggingIn}
            className="flex items-center justify-center gap-2 py-2.5 font-semibold"
          >
            <LogIn className="w-4 h-4" /> Sign In & Continue
          </Button>
        </form>

        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <Link
            to="/movies"
            className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Movies
          </Link>
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
            Protected Checkout
          </span>
        </div>
      </div>
    </div>
  );
};
