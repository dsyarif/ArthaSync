import { SecuritySettings } from '../types/finance';

const SECURITY_KEY = 'arthasync_security_settings_v1';

const DEFAULT_SETTINGS: SecuritySettings = {
  biometricEnabled: true,
  pinCode: '1234',
  isLocked: false,
  lockTimeoutMinutes: 5,
};

export class BiometricService {
  private static listeners: Set<(settings: SecuritySettings) => void> = new Set();
  private static lockTimer: any = null;

  public static getSettings(): SecuritySettings {
    try {
      const data = localStorage.getItem(SECURITY_KEY);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: SecuritySettings) {
    localStorage.setItem(SECURITY_KEY, JSON.stringify(settings));
    this.listeners.forEach((cb) => cb(settings));
  }

  public static subscribe(callback: (settings: SecuritySettings) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public static async isBiometricAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
      } catch {
        return false;
      }
    }
    return false;
  }

  public static lockApp() {
    const current = this.getSettings();
    this.saveSettings({ ...current, isLocked: true });
  }

  public static unlockApp() {
    const current = this.getSettings();
    this.saveSettings({ ...current, isLocked: false });
    this.resetInactivityTimer();
  }

  public static verifyPin(inputPin: string): boolean {
    const settings = this.getSettings();
    const isValid = settings.pinCode === inputPin;
    if (isValid) {
      this.unlockApp();
    }
    return isValid;
  }

  /**
   * Perform WebAuthn Biometric Authentication
   */
  public static async authenticateBiometric(): Promise<{ success: boolean; message?: string }> {
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'preferred',
            rpId: window.location.hostname || 'localhost',
          },
        });

        if (credential) {
          this.unlockApp();
          return { success: true };
        }
      }
    } catch (err: any) {
      console.warn('WebAuthn biometric returned error or canceled:', err?.message);
    }

    // Fallback simulation for environments without hardware platform authenticator
    return {
      success: false,
      message: 'Sensor sidik jari hardware tidak merespons, silakan masukkan PIN alternatif.',
    };
  }

  public static initInactivityListener() {
    if (typeof window === 'undefined') return;

    const reset = () => this.resetInactivityTimer();
    window.addEventListener('mousemove', reset, { passive: true });
    window.addEventListener('keydown', reset, { passive: true });
    window.addEventListener('touchstart', reset, { passive: true });

    this.resetInactivityTimer();
  }

  private static resetInactivityTimer() {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }

    const settings = this.getSettings();
    if (!settings.biometricEnabled || settings.lockTimeoutMinutes <= 0 || settings.isLocked) {
      return;
    }

    const timeoutMs = settings.lockTimeoutMinutes * 60 * 1000;
    this.lockTimer = setTimeout(() => {
      this.lockApp();
    }, timeoutMs);
  }
}
