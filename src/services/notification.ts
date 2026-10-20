import { ReminderSettings } from '../types/finance';

const REMINDER_KEY = 'arthasync_reminder_settings_v1';

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  time: '20:00', // 8:00 PM default reminder
  soundEnabled: true,
};

export class NotificationService {
  private static listeners: Set<(settings: ReminderSettings) => void> = new Set();
  private static timerId: any = null;

  public static getSettings(): ReminderSettings {
    try {
      const data = localStorage.getItem(REMINDER_KEY);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: ReminderSettings) {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
    this.listeners.forEach((cb) => cb(settings));
    this.setupScheduler();
  }

  public static subscribe(callback: (settings: ReminderSettings) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public static init() {
    this.setupScheduler();
  }

  public static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return await Notification.requestPermission();
  }

  /**
   * Synthesize a gentle financial reminder chime using Web Audio API
   */
  public static playReminderChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Soft marimba / chime chords (E5 -> G#5 -> B5 -> E6)
      const notes = [659.25, 830.61, 987.77, 1318.51];
      const startTime = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.12);

        gain.gain.setValueAtTime(0, startTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, startTime + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + idx * 0.12 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + idx * 0.12);
        osc.stop(startTime + idx * 0.12 + 0.5);
      });
    } catch {
      // Audio context might be restricted or unavailable
    }
  }

  public static async triggerNotification(title?: string, body?: string) {
    const settings = this.getSettings();

    if (settings.soundEnabled) {
      this.playReminderChime();
    }

    const notifTitle = title || 'Waktunya Catat Pengeluaran Hari Ini!';
    const notifBody =
      body || 'Jangan lupa rekap pengeluaranmu hari ini di ArthaSync agar keuangan keluarga tetap sehat dan terkontrol.';

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notifTitle, {
          body: notifBody,
          icon: '/favicon.ico',
        });
        return true;
      } catch {
        // Fallback or permission rejected in context
      }
    }
    return false;
  }

  private static setupScheduler() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    const settings = this.getSettings();
    if (!settings.enabled) return;

    // Check every minute if it matches reminder time
    this.timerId = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMins}`;
      const todayDateStr = now.toISOString().split('T')[0];

      if (currentTimeStr === settings.time && settings.lastNotifiedDate !== todayDateStr) {
        this.triggerNotification();
        this.saveSettings({ ...settings, lastNotifiedDate: todayDateStr });
      }
    }, 30000); // Check every 30s
  }
}
