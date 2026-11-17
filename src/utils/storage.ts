import { Activity, ProductivityStore, TaskItem } from '../types/productivity';

export const STORAGE_KEY = 'pulso_productivo_v1';

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
  const now = new Date().toISOString();
  return [
    {
      id: 'act_dev',
      name: 'Desarrollo y Tecnología',
      color: '#2563EB',
      dailyGoalMinutes: 120,
      createdAt: now,
    },
    {
      id: 'act_content',
      name: 'Creación de Contenido',
      color: '#0D9488',
      dailyGoalMinutes: 60,
      createdAt: now,
    },
    {
      id: 'act_business',
      name: 'Negocios y Clientes',
      color: '#D97706',
      dailyGoalMinutes: 60,
      createdAt: now,
    },
    {
      id: 'act_ai',
      name: 'Capacitación e IA',
      color: '#4F46E5',
      dailyGoalMinutes: 45,
      createdAt: now,
    },
    {
      id: 'act_general',
      name: 'Organización General',
      color: '#475569',
      dailyGoalMinutes: 30,
      createdAt: now,
    },
  ];
}

function daysAgoIso(daysAgo: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

export function getStarterTasks(): TaskItem[] {
  const upcoming = new Date(Date.now() + 45 * 60 * 1000).toISOString();
  return [
    {
      id: 'tsk_demo_1',
      title: 'Diseñar arquitectura de extensión Chrome MV3',
      activityId: 'act_dev',
      status: 'completed',
      minutesSpent: 75,
      alertAt: null,
      alertTriggered: false,
      notes: 'Definición de permisos mínimos y almacenamiento local.',
      createdAt: daysAgoIso(0, 9),
      completedAt: daysAgoIso(0, 10),
    },
    {
      id: 'tsk_demo_2',
      title: 'Grabar guion corto sobre productividad con IA',
      activityId: 'act_content',
      status: 'completed',
      minutesSpent: 45,
      alertAt: null,
      alertTriggered: false,
      notes: 'Estructura gancho, ejemplo práctico y cierre.',
      createdAt: daysAgoIso(0, 11),
      completedAt: daysAgoIso(0, 12),
    },
    {
      id: 'tsk_demo_3',
      title: 'Preparar propuesta de capacitación empresarial',
      activityId: 'act_business',
      status: 'pending',
      minutesSpent: 20,
      alertAt: upcoming,
      alertTriggered: false,
      notes: 'Incluir temario práctico de automatización e IA.',
      createdAt: daysAgoIso(0, 13),
      completedAt: null,
    },
    {
      id: 'tsk_demo_4',
      title: 'Revisar notas del taller de flujos de trabajo',
      activityId: 'act_ai',
      status: 'completed',
      minutesSpent: 50,
      alertAt: null,
      alertTriggered: false,
      notes: '',
      createdAt: daysAgoIso(1, 16),
      completedAt: daysAgoIso(1, 17),
    },
    {
      id: 'tsk_demo_5',
      title: 'Actualizar portafolio web y formulario de contacto',
      activityId: 'act_dev',
      status: 'completed',
      minutesSpent: 90,
      alertAt: null,
      alertTriggered: false,
      notes: '',
      createdAt: daysAgoIso(2, 10),
      completedAt: daysAgoIso(2, 12),
    },
    {
      id: 'tsk_demo_6',
      title: 'Responder correos y seguimiento semanal',
      activityId: 'act_general',
      status: 'pending',
      minutesSpent: 15,
      alertAt: null,
      alertTriggered: false,
      notes: 'Priorizar respuestas de clientes activos.',
      createdAt: daysAgoIso(0, 14),
      completedAt: null,
    },
  ];
}

export function getInitialStore(): ProductivityStore {
  if (typeof window === 'undefined') {
    return {
      settings: {
        userName: '',
        soundAlertsEnabled: true,
        browserNotificationsEnabled: false,
      },
      activities: getDefaultActivities(),
      tasks: getStarterTasks(),
      activeTimer: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProductivityStore>;
      const activities = Array.isArray(parsed.activities)
        ? parsed.activities
        : getDefaultActivities();
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
    // Fallback to clean defaults if localStorage is malformed
  }

  return {
    settings: {
      userName: '',
      soundAlertsEnabled: true,
      browserNotificationsEnabled: false,
    },
    activities: getDefaultActivities(),
    tasks: getStarterTasks(),
    activeTimer: null,
  };
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
