import { SecuritySettings } from '../types/finance';

const SECURITY_KEY = 'arthasync_security_settings_v1';
export const DEFAULT_APP_PASSWORD = 'Yuga1418';

const DEFAULT_SETTINGS: SecuritySettings = {
  biometricEnabled: true,
  pinCode: '1234',
  password: DEFAULT_APP_PASSWORD,
  isLocked: true,
  lockTimeoutMinutes: 5,
};

export class BiometricService {
  private static listeners: Set<(settings: SecuritySettings) => void> = new Set();
  private static lockTimer: any = null;
  private static isSessionUnlocked: boolean = false;

  public static getSettings(): SecuritySettings {
    try {
      let data: string | null = null;
      if (typeof localStorage !== 'undefined') {
        data = localStorage.getItem(SECURITY_KEY);
      }
      if (!data) {
        return {
          ...DEFAULT_SETTINGS,
          isLocked: !this.isSessionUnlocked,
        };
      }
      const parsed = JSON.parse(data);
      const password = parsed.password || DEFAULT_APP_PASSWORD;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        password,
        // Always require login on initial open/session until unlocked
        isLocked: !this.isSessionUnlocked ? true : (parsed.isLocked ?? true),
      };
    } catch {
      return {
        ...DEFAULT_SETTINGS,
        isLocked: !this.isSessionUnlocked,
      };
    }
  }

  public static saveSettings(settings: SecuritySettings) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SECURITY_KEY, JSON.stringify(settings));
    }
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
    this.isSessionUnlocked = false;
    const current = this.getSettings();
    this.saveSettings({ ...current, isLocked: true });
  }

  public static unlockApp() {
    this.isSessionUnlocked = true;
    const current = this.getSettings();
    this.saveSettings({ ...current, isLocked: false });
    this.resetInactivityTimer();
  }

  public static verifyPassword(inputPassword: string): boolean {
    const settings = this.getSettings();
    const correctPassword = settings.password || DEFAULT_APP_PASSWORD;
    const trimmedInput = inputPassword.trim();
    // Allow matching password (e.g. Yuga1418) or fallback PIN
    const isValid = trimmedInput === correctPassword || trimmedInput === settings.pinCode;
    if (isValid) {
      this.unlockApp();
    }
    return isValid;
  }

  public static verifyPin(inputPin: string): boolean {
    return this.verifyPassword(inputPin);
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
      message: 'Sensor sidik jari hardware tidak merespons, silakan masukkan kata sandi login.',
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
    if (this.lockTimer && typeof this.lockTimer.unref === 'function') {
      this.lockTimer.unref();
    }
  }

  public static clearInactivityTimer() {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }
}
