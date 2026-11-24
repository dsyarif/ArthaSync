import React, { useState, useRef, useEffect } from 'react';
import { Lock, KeyRound, AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { BiometricService } from '../services/biometric';
import { NotificationService } from '../services/notification';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onUnlock }) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setErrorMsg('');
    const isValid = BiometricService.verifyPassword(passwordInput);
    if (isValid) {
      NotificationService.playReminderChime();
      onUnlock();
    } else {
      setErrorMsg('Kata sandi yang Anda masukkan salah. Silakan coba lagi.');
      setPasswordInput('');
      passwordInputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md text-white animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative">
        {/* Brand Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white mb-1">
          Masuk ke ArthaSync
        </h1>
        <p className="text-xs text-slate-400 mb-5 max-w-xs leading-relaxed">
          Masukkan kata sandi untuk mengakses catatan keuangan harian dan sinkronisasi data Anda.
        </p>

        {/* Error Alert Message */}
        {errorMsg && (
          <div
            role="alert"
            className="w-full mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2.5 text-left animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span className="flex-1 font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handlePasswordSubmit} className="w-full space-y-3.5">
          <div className="relative text-left">
            <label htmlFor="arthasync-login-password" className="sr-only">
              Kata Sandi Sistem
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="arthasync-login-password"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Masukkan kata sandi..."
                className="w-full pl-10 pr-11 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-sans"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!passwordInput.trim()}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk ke Sistem</span>
          </button>
        </form>
      </div>
    </div>
  );
};
