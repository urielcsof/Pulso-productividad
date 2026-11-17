import { Activity, ProductivityStore } from '../types/productivity';

export const STORAGE_KEY = 'pulso_productivo_v2';

export const ACTIVITY_COLOR_PALETTE = [
  { label: 'Cobalto', hex: '#2563EB' },
  { label: 'Esmeralda', hex: '#16A34A' },
  { label: 'Ámbar', hex: '#D97706' },
  { label: 'Índigo', hex: '#4F46E5' },
  { label: 'Teal', hex: '#0D9488' },
  { label: 'Rosa', hex: '#E11D48' },
  { label: 'Pizarra', hex: '#475569' },
  { label: 'Cian', hex: '#0284C7' },
];

export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function getDefaultActivities(): Activity[] {
  return [];
}

export function getInitialStore(): ProductivityStore {
  const emptyStore: ProductivityStore = {
    settings: {
      userName: '',
      soundAlertsEnabled: true,
      browserNotificationsEnabled: false,
    },
    activities: [],
    tasks: [],
    activeTimer: null,
  };

  if (typeof window === 'undefined') {
    return emptyStore;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProductivityStore>;
      const activities = Array.isArray(parsed.activities)
        ? parsed.activities
        : [];
      const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
      const settings = {
        userName: parsed.settings?.userName ?? '',
        soundAlertsEnabled: parsed.settings?.soundAlertsEnabled ?? true,
        browserNotificationsEnabled:
          parsed.settings?.browserNotificationsEnabled ?? false,
      };
      return {
        settings,
        activities,
        tasks,
        activeTimer: parsed.activeTimer ?? null,
      };
    }
  } catch {
    // Fallback to clean Day Zero state if localStorage is malformed
  }

  return emptyStore;
}

export function saveStore(store: ProductivityStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function formatMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) {
    return `${mins} min`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatTimerClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
