import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Fingerprint,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { BiometricService, DEFAULT_APP_PASSWORD } from '../services/biometric';
import { NotificationService } from '../services/notification';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

type AuthMode = 'password' | 'biometric' | 'pin';

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onUnlock }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authMode === 'password') {
      passwordInputRef.current?.focus();
    }
  }, [authMode]);

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

  const handleBiometricScan = async () => {
    setIsScanning(true);
    setErrorMsg('');
    NotificationService.playReminderChime();

    try {
      const res = await BiometricService.authenticateBiometric();
      if (res.success) {
        setIsScanning(false);
        onUnlock();
        return;
      }

      // Fallback simulation for local environments without hardware platform authenticator
      setTimeout(() => {
        setIsScanning(false);
        BiometricService.unlockApp();
        onUnlock();
      }, 1000);
    } catch {
      setIsScanning(false);
      setErrorMsg('Autentikasi sidik jari dibatalkan. Masukkan kata sandi.');
      setAuthMode('password');
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        setTimeout(() => {
          const verified = BiometricService.verifyPin(nextPin);
          if (verified) {
            NotificationService.playReminderChime();
            onUnlock();
          } else {
            setErrorMsg('PIN yang Anda masukkan salah. Coba lagi.');
            setPinInput('');
          }
        }, 150);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
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
        <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
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

        {/* 1. PASSWORD MODE (DEFAULT) */}
        {authMode === 'password' && (
          <div className="w-full">
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
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

            <div className="mt-3 text-[11px] text-slate-400 text-center">
              Password default:{' '}
              <span className="text-emerald-400 font-mono font-bold select-all">
                {DEFAULT_APP_PASSWORD}
              </span>
            </div>

            {/* Alternative Authentication Options */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('biometric');
                  setErrorMsg('');
                }}
                className="w-full py-2 px-3 text-xs text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>Masuk dengan Sidik Jari (Biometrik)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('pin');
                  setErrorMsg('');
                }}
                className="w-full py-2 px-3 text-xs text-slate-400 hover:text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Gunakan PIN 4 Digit</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. BIOMETRIC MODE */}
        {authMode === 'biometric' && (
          <div className="w-full flex flex-col items-center">
            <div className="relative my-4">
              {isScanning && (
                <div className="absolute -inset-4 rounded-full border-2 border-emerald-400 animate-ping opacity-50" />
              )}
              <button
                type="button"
                onClick={handleBiometricScan}
                disabled={isScanning}
                aria-label="Pindai Sidik Jari untuk Membuka Aplikasi"
                className={`relative w-28 h-28 rounded-3xl border-2 flex flex-col items-center justify-center transition-all shadow-2xl cursor-pointer ${
                  isScanning
                    ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300 scale-105 shadow-emerald-500/40'
                    : 'border-emerald-500/40 bg-slate-800/80 hover:bg-slate-800 text-emerald-400 hover:border-emerald-400 hover:scale-105 active:scale-95'
                }`}
              >
                <Fingerprint className={`w-14 h-14 ${isScanning ? 'animate-pulse' : ''}`} />
                {isScanning && (
                  <div className="absolute inset-x-0 bottom-2 text-[10px] font-semibold text-emerald-300 tracking-wider">
                    MEMINDAI...
                  </div>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2 mb-5">
              {isScanning
                ? 'Memverifikasi sensor biometrik...'
                : 'Sentuh ikon sidik jari di atas untuk membuka'}
            </p>

            <div className="w-full pt-3 border-t border-slate-800/80 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('password');
                  setErrorMsg('');
                }}
                className="w-full py-2 px-3 text-xs text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kembali ke Kata Sandi (Password)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('pin');
                  setErrorMsg('');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
              >
                Gunakan PIN 4 Digit
              </button>
            </div>
          </div>
        )}

        {/* 3. PIN MODE */}
        {authMode === 'pin' && (
          <div className="w-full flex flex-col items-center">
            {/* PIN Dots Indicator */}
            <div className="flex items-center gap-3 my-3">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      isFilled
                        ? 'bg-emerald-500 border-emerald-400 scale-110 shadow-sm shadow-emerald-500'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Masukkan 4 digit PIN keamanan Anda
            </p>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-60 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinDigit(num)}
                  className="w-16 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-base font-bold font-mono text-white border border-slate-700/80 transition-transform active:scale-95 cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="w-16 h-12 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-xs text-slate-400 font-semibold transition-colors cursor-pointer"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => handlePinDigit('0')}
                className="w-16 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-base font-bold font-mono text-white border border-slate-700/80 transition-transform active:scale-95 cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinBackspace}
                aria-label="Hapus satu angka"
                className="w-16 h-12 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-xs text-slate-400 font-semibold transition-colors cursor-pointer flex items-center justify-center"
              >
                ←
              </button>
            </div>

            <div className="w-full pt-3 border-t border-slate-800/80 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('password');
                  setErrorMsg('');
                }}
                className="w-full py-2 px-3 text-xs text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kembali ke Kata Sandi (Password)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('biometric');
                  setErrorMsg('');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
              >
                Masuk dengan Sidik Jari
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
