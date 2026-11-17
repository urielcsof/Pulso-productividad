import React, { useEffect, useMemo, useState } from 'react';
import {
  DateRangeFilter,
  MotivationalQuote,
  ProductivityStore,
  TaskItem,
  TaskStatus,
  WorkspaceTab,
} from './types/productivity';
import {
  COMPLETION_QUOTES,
  PENDING_MOTIVATION_QUOTES,
  pickRandomQuote,
} from './data/quotes';
import {
  createId,
  formatMinutes,
  getInitialStore,
  saveStore,
} from './utils/storage';
import { exportProductivityPdf } from './utils/pdfExport';
import { buildChromeExtensionZip } from './utils/extensionZipBuilder';
import { ProductivityCharts } from './components/ProductivityCharts';
import { TaskManager } from './components/TaskManager';
import { ActivityManager } from './components/ActivityManager';
import { ExtensionSimulator } from './components/ExtensionSimulator';
import { ChromeStoreExport } from './components/ChromeStoreExport';
import { HireCtaFooter } from './components/HireCtaFooter';
import {
  BarChart3,
  Bell,
  BellOff,
  CheckCircle2,
  Download,
  FileDown,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

function playGentleChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.46);
  } catch {
    // Audio playback may be blocked prior to user interaction
  }
}

export default function App() {
  const [store, setStore] = useState<ProductivityStore>(() => getInitialStore());
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');

  const [nameDraft, setNameDraft] = useState(store.settings.userName);
  const [editingName, setEditingName] = useState(
    !store.settings.userName.trim()
  );

  const [completionQuote, setCompletionQuote] =
    useState<MotivationalQuote | null>(null);
  const [pendingQuote, setPendingQuote] = useState<MotivationalQuote>(() =>
    pickRandomQuote(PENDING_MOTIVATION_QUOTES)
  );

  const [activeAlerts, setActiveAlerts] = useState<TaskItem[]>([]);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Sync to LocalStorage on every change
  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Live timer & alert watcher
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setNowTick(now);

      setStore((prev) => {
        const dueTasks = prev.tasks.filter(
          (t) =>
            t.status === 'pending' &&
            t.alertAt &&
            !t.alertTriggered &&
            new Date(t.alertAt).getTime() <= now
        );
        if (dueTasks.length === 0) return prev;

        if (prev.settings.soundAlertsEnabled) {
          playGentleChime();
        }

        if (
          prev.settings.browserNotificationsEnabled &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          dueTasks.forEach((task) => {
            new Notification('Pulso Productivo · Alerta de tarea', {
              body: `Es momento de avanzar con: "${task.title}"`,
            });
          });
        }

        setActiveAlerts((curr) => {
          const existingIds = new Set(curr.map((c) => c.id));
          const fresh = dueTasks.filter((d) => !existingIds.has(d.id));
          return fresh.length > 0 ? [...fresh, ...curr] : curr;
        });

        const dueIds = new Set(dueTasks.map((d) => d.id));
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            dueIds.has(t.id) ? { ...t, alertTriggered: true } : t
          ),
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const elapsedSeconds = useMemo(() => {
    if (!store.activeTimer) return 0;
    return Math.max(0, Math.floor((nowTick - store.activeTimer.startedAt) / 1000));
  }, [store.activeTimer, nowTick]);

  // Date-filtered tasks for overview & PDF export
  const filteredByDateTasks = useMemo(() => {
    if (dateFilter === 'all') return store.tasks;
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

    return store.tasks.filter((task) => {
      const refTime = new Date(task.completedAt || task.createdAt).getTime();
      if (dateFilter === 'today') return refTime >= startOfToday;
      return refTime >= sevenDaysAgo;
    });
  }, [store.tasks, dateFilter]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const completed = filteredByDateTasks.filter((t) => t.status === 'completed');
    const pending = filteredByDateTasks.filter((t) => t.status === 'pending');
    const totalMins = filteredByDateTasks.reduce(
      (s, t) => s + t.minutesSpent,
      0
    );
    const completionRate =
      filteredByDateTasks.length > 0
        ? Math.round((completed.length / filteredByDateTasks.length) * 100)
        : 0;
    const scheduledAlerts = pending.filter((t) => Boolean(t.alertAt)).length;

    const minsByAct = new Map<string, number>();
    filteredByDateTasks.forEach((t) => {
      minsByAct.set(
        t.activityId,
        (minsByAct.get(t.activityId) ?? 0) + t.minutesSpent
      );
    });
    let topActName = 'Sin registros';
    let topActMins = 0;
    store.activities.forEach((a) => {
      const m = minsByAct.get(a.id) ?? 0;
      if (m > topActMins) {
        topActMins = m;
        topActName = a.name;
      }
    });

    return {
      totalCount: filteredByDateTasks.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      completionRate,
      totalMins,
      scheduledAlerts,
      topActName,
      topActMins,
    };
  }, [filteredByDateTasks, store.activities]);

  // Handlers
  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameDraft.trim();
    setStore((prev) => ({
      ...prev,
      settings: { ...prev.settings, userName: clean },
    }));
    setEditingName(false);
  };

  const handleToggleBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    if (!store.settings.browserNotificationsEnabled) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setStore((prev) => ({
          ...prev,
          settings: { ...prev.settings, browserNotificationsEnabled: true },
        }));
      }
    } else {
      setStore((prev) => ({
        ...prev,
        settings: { ...prev.settings, browserNotificationsEnabled: false },
      }));
    }
  };

  const handleAddTask = (payload: {
    title: string;
    activityId: string;
    status: TaskStatus;
    minutesSpent: number;
    alertAt: string | null;
    notes: string;
  }) => {
    const newTask: TaskItem = {
      id: createId('tsk'),
      title: payload.title,
      activityId: payload.activityId,
      status: payload.status,
      minutesSpent: payload.minutesSpent,
      alertAt: payload.status === 'pending' ? payload.alertAt : null,
      alertTriggered: false,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      completedAt:
        payload.status === 'completed' ? new Date().toISOString() : null,
    };

    setStore((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));

    if (payload.status === 'completed') {
      setCompletionQuote((prevQuote) =>
        pickRandomQuote(COMPLETION_QUOTES, prevQuote?.id)
      );
    }
  };

  const handleUpdateTask = (
    id: string,
    updates: Partial<
      Pick<
        TaskItem,
        'title' | 'activityId' | 'status' | 'minutesSpent' | 'alertAt' | 'notes'
      >
    >
  ) => {
    let becameCompleted = false;
    setStore((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== id) return task;
        const nextStatus = updates.status ?? task.status;
        if (task.status !== 'completed' && nextStatus === 'completed') {
          becameCompleted = true;
        }
        return {
          ...task,
          ...updates,
          alertTriggered:
            updates.alertAt !== undefined && updates.alertAt !== task.alertAt
              ? false
              : task.alertTriggered,
          completedAt:
            nextStatus === 'completed'
              ? task.completedAt || new Date().toISOString()
              : null,
        };
      }),
    }));

    if (becameCompleted) {
      setCompletionQuote((prevQuote) =>
        pickRandomQuote(COMPLETION_QUOTES, prevQuote?.id)
      );
    }
  };

  const handleToggleStatus = (id: string) => {
    let completedNow = false;
    setStore((prev) => {
      let nextTimer = prev.activeTimer;
      let extraMins = 0;

      if (prev.activeTimer?.taskId === id) {
        const secs = Math.max(
          0,
          Math.floor((Date.now() - prev.activeTimer.startedAt) / 1000)
        );
        extraMins = secs >= 15 ? Math.max(1, Math.round(secs / 60)) : 0;
        nextTimer = null;
      }

      return {
        ...prev,
        activeTimer: nextTimer,
        tasks: prev.tasks.map((task) => {
          if (task.id !== id) return task;
          const nextStatus: TaskStatus =
            task.status === 'pending' ? 'completed' : 'pending';
          if (nextStatus === 'completed') completedNow = true;
          return {
            ...task,
            status: nextStatus,
            minutesSpent: task.minutesSpent + extraMins,
            completedAt:
              nextStatus === 'completed' ? new Date().toISOString() : null,
          };
        }),
      };
    });

    if (completedNow) {
      setCompletionQuote((prevQuote) =>
        pickRandomQuote(COMPLETION_QUOTES, prevQuote?.id)
      );
      setActiveAlerts((curr) => curr.filter((a) => a.id !== id));
    }
  };

  const handleDeleteTask = (id: string) => {
    setStore((prev) => ({
      ...prev,
      activeTimer: prev.activeTimer?.taskId === id ? null : prev.activeTimer,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
    setActiveAlerts((curr) => curr.filter((a) => a.id !== id));
  };

  const handleStartTimer = (taskId: string) => {
    setStore((prev) => {
      let updatedTasks = prev.tasks;
      if (prev.activeTimer && prev.activeTimer.taskId !== taskId) {
        const secs = Math.max(
          0,
          Math.floor((Date.now() - prev.activeTimer.startedAt) / 1000)
        );
        const mins = secs >= 15 ? Math.max(1, Math.round(secs / 60)) : 0;
        if (mins > 0) {
          updatedTasks = prev.tasks.map((t) =>
            t.id === prev.activeTimer?.taskId
              ? { ...t, minutesSpent: t.minutesSpent + mins }
              : t
          );
        }
      }
      return {
        ...prev,
        tasks: updatedTasks,
        activeTimer: { taskId, startedAt: Date.now() },
      };
    });
  };

  const handleStopTimer = () => {
    setStore((prev) => {
      if (!prev.activeTimer) return prev;
      const secs = Math.max(
        0,
        Math.floor((Date.now() - prev.activeTimer.startedAt) / 1000)
      );
      const addedMins = secs >= 15 ? Math.max(1, Math.round(secs / 60)) : 1;
      const targetId = prev.activeTimer.taskId;
      return {
        ...prev,
        activeTimer: null,
        tasks: prev.tasks.map((t) =>
          t.id === targetId
            ? { ...t, minutesSpent: t.minutesSpent + addedMins }
            : t
        ),
      };
    });
  };

  const handleAddActivity = (
    name: string,
    color: string,
    dailyGoalMinutes: number
  ) => {
    setStore((prev) => ({
      ...prev,
      activities: [
        ...prev.activities,
        {
          id: createId('act'),
          name,
          color,
          dailyGoalMinutes,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const handleUpdateActivity = (
    id: string,
    updates: { name: string; color: string; dailyGoalMinutes: number }
  ) => {
    setStore((prev) => ({
      ...prev,
      activities: prev.activities.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  };

  const handleDeleteActivity = (id: string, reassignToId: string) => {
    setStore((prev) => {
      const remaining = prev.activities.filter((a) => a.id !== id);
      const fallback = reassignToId || remaining[0]?.id || '';
      return {
        ...prev,
        activities: remaining,
        tasks: prev.tasks.map((t) =>
          t.activityId === id ? { ...t, activityId: fallback } : t
        ),
      };
    });
  };

  const handleClearAll = () => {
    setStore((prev) => ({
      ...prev,
      activities: [],
      tasks: [],
      activeTimer: null,
    }));
    setActiveAlerts([]);
    setCompletionQuote(null);
    setConfirmClearAll(false);
    setActiveTab('activities');
  };

  const handleExportPdf = () => {
    exportProductivityPdf({
      userName: store.settings.userName,
      tasks: filteredByDateTasks,
      activities: store.activities,
      dateFilter,
    });
  };

  const handleQuickDownloadExtension = async () => {
    try {
      setDownloadingZip(true);
      const blob = await buildChromeExtensionZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pulso-productivo-chrome-extension.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } finally {
      setDownloadingZip(false);
    }
  };

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'overview', label: 'Resumen y Gráficos', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tareas y Alertas', icon: ListTodo },
    { id: 'activities', label: 'Actividades', icon: FolderKanban },
    { id: 'simulator', label: 'Simulador Popup Chrome', icon: Smartphone },
    { id: 'chrome-store', label: 'Chrome Web Store (.zip)', icon: Download },
  ];

  const userDisplayName = store.settings.userName.trim();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Workspace Sidebar */}
      <aside className="w-full lg:w-64 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col justify-between">
        <div className="p-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/Dise_o_sin_t_tulo__2__68040bab.png"
              alt="Ícono de Pulso Productivo"
              className="h-9 w-9 rounded-lg object-cover shrink-0 border border-slate-200"
            />
            <div>
              <span className="font-display text-base font-bold tracking-tight text-slate-900 block leading-tight">
                Pulso Productivo
              </span>
              <span className="text-[11px] text-slate-500 block">
                Extensión Chrome MV3
              </span>
            </div>
          </div>

          <nav
            aria-label="Navegación del espacio de trabajo"
            className="mt-6 flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Local Privacy & Alert Preferences */}
        <div className="hidden lg:block border-t border-slate-200 p-5 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">
              Preferencias de alertas
            </p>
            <button
              type="button"
              onClick={() =>
                setStore((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    soundAlertsEnabled: !prev.settings.soundAlertsEnabled,
                  },
                }))
              }
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                {store.settings.soundAlertsEnabled ? (
                  <Volume2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                )}
                Sonido en alertas
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {store.settings.soundAlertsEnabled ? 'Activo' : 'Silencio'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleBrowserNotifications}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                {store.settings.browserNotificationsEnabled ? (
                  <Bell className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                ) : (
                  <BellOff className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                )}
                Notificaciones web
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {store.settings.browserNotificationsEnabled ? 'Sí' : 'No'}
              </span>
            </button>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-2 border border-slate-200/80">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
              Privacidad local
            </div>
            <p className="leading-relaxed text-[11.5px]">
              Sin logins ni bases de datos. Todo se guarda en tu{' '}
              <code className="font-mono">LocalStorage</code>.
            </p>
            <div className="flex flex-col gap-1.5 pt-1">
              {(store.tasks.length > 0 || store.activities.length > 0) ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-red-600 hover:underline text-left"
                >
                  <RotateCcw className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Limpiar todo y empezar de cero
                </button>
              ) : (
                <span className="text-[11.5px] text-slate-500">
                  Día cero: 0 actividades y 0 tareas.
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract */}
        <header className="border-b border-slate-200 bg-white px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">
              Espacio local · {navItems.find((n) => n.id === activeTab)?.label}
            </p>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 truncate">
              {userDisplayName
                ? `Hola, ${userDisplayName}`
                : 'Panel de productividad personal'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <FileDown className="h-4 w-4 text-slate-600" aria-hidden="true" />
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={handleQuickDownloadExtension}
              disabled={downloadingZip}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {downloadingZip ? 'Preparando...' : 'Descargar Extensión Chrome'}
            </button>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-8 py-6 space-y-6">
          {/* Active Task Alerts Banner */}
          {activeAlerts.length > 0 && (
            <div
              role="alert"
              className="space-y-2"
            >
              {activeAlerts.map((alertTask) => (
                <div
                  key={alertTask.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-950"
                >
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold text-red-800">
                        Alerta programada de tarea
                      </p>
                      <p className="text-sm font-semibold text-red-950">
                        {alertTask.title}
                      </p>
                      <p className="text-xs text-red-800">
                        {userDisplayName ? `${userDisplayName}, ` : ''}dedícale un bloque enfocado ahora para acercarte al cierre de tus pendientes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(alertTask.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Completar tarea
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveAlerts((curr) =>
                          curr.filter((item) => item.id !== alertTask.id)
                        )
                      }
                      aria-label="Descartar alerta"
                      className="rounded-lg p-1.5 text-red-700 hover:bg-red-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User Name Only Personalization Strip (No Login / No Email) */}
          {editingName ? (
            <form
              onSubmit={handleSaveName}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:px-5"
            >
              <div className="space-y-0.5">
                <label
                  htmlFor="local-user-name"
                  className="text-sm font-semibold text-slate-900 block"
                >
                  Personaliza con tu nombre (sin registro ni contraseña)
                </label>
                <p className="text-xs text-slate-600">
                  Solo usamos tu nombre para saludarte y encabezar tus reportes PDF. Todo vive en LocalStorage.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input
                  id="local-user-name"
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Escribe tu nombre..."
                  className="flex-1 sm:w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Guardar nombre
                </button>
                {userDisplayName && (
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs text-slate-600">
              <span>
                Sesión local de <strong className="text-slate-900">{userDisplayName}</strong> · Sin cuentas ni recolección de datos
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(store.settings.userName);
                    setEditingName(true);
                  }}
                  className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Cambiar nombre
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 font-medium text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Limpiar todo
                </button>
              </div>
            </div>
          )}

          {/* Inline Clear All button when user is still in editingName mode */}
          {editingName && (store.tasks.length > 0 || store.activities.length > 0) && !confirmClearAll && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs text-slate-600">
              <span>
                ¿Prefieres empezar completamente en blanco e ingresar tus propias actividades?
              </span>
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-medium text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Limpiar todo
              </button>
            </div>
          )}

          {/* Inline Confirmation Banner for Limpiar Todo */}
          {confirmClearAll && (
            <div
              role="alertdialog"
              aria-label="Confirmar limpieza total"
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-red-900">
                  ¿Limpiar todas las tareas y actividades actuales?
                </p>
                <p className="text-xs text-red-800">
                  Se borrarán todos los registros de ejemplo y listas actuales para que ingreses tus propias actividades desde cero.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap"
                >
                  Sí, limpiar todo e ingresar actividades
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Empty Activities Guidance Banner when user is on Overview or Tasks */}
          {store.activities.length === 0 && activeTab !== 'activities' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-900">
                  Espacio limpio: ingresa tus propias actividades
                </p>
                <p className="text-xs text-slate-600">
                  Añade tus áreas o actividades personalizadas para empezar a capturar tareas y medir tu tiempo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('activities')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                Ingresar actividades
              </button>
            </div>
          )}

          {/* 4-Column KPI Strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">
                Tareas completadas
              </p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {kpis.completedCount}
                <span className="ml-1.5 text-sm font-normal text-slate-500">
                  / {kpis.totalCount}
                </span>
              </p>
              <p className="mt-1 text-xs text-emerald-700 font-medium tabular-nums">
                {kpis.completionRate}% de cumplimiento
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">
                Tareas pendientes
              </p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {kpis.pendingCount}
              </p>
              <p className="mt-1 text-xs text-amber-700 font-medium tabular-nums">
                {kpis.scheduledAlerts}{' '}
                {kpis.scheduledAlerts === 1
                  ? 'alerta programada'
                  : 'alertas programadas'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">
                Tiempo enfocado total
              </p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {formatMinutes(kpis.totalMins)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Medido entre manual y cronómetro
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">
                Actividad principal
              </p>
              <p className="mt-1.5 text-base font-bold text-slate-900 truncate">
                {kpis.topActName}
              </p>
              <p className="mt-1.5 font-mono text-xs text-blue-700 font-medium tabular-nums">
                {kpis.topActMins > 0
                  ? `${formatMinutes(kpis.topActMins)} dedicados`
                  : 'Sin minutos registrados'}
              </p>
            </div>
          </div>

          {/* Active View Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <ProductivityCharts
                tasks={filteredByDateTasks}
                allTasks={store.tasks}
                activities={store.activities}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                onQuickAddTask={() => setActiveTab('tasks')}
              />

              <TaskManager
                tasks={store.tasks}
                activities={store.activities}
                activeTimer={store.activeTimer}
                elapsedSeconds={elapsedSeconds}
                completionQuote={completionQuote}
                pendingQuote={pendingQuote}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onToggleStatus={handleToggleStatus}
                onDeleteTask={handleDeleteTask}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                onDismissCompletionQuote={() => setCompletionQuote(null)}
                onRefreshPendingQuote={() =>
                  setPendingQuote((prev) =>
                    pickRandomQuote(PENDING_MOTIVATION_QUOTES, prev.id)
                  )
                }
              />
            </div>
          )}

          {activeTab === 'tasks' && (
            <TaskManager
              tasks={store.tasks}
              activities={store.activities}
              activeTimer={store.activeTimer}
              elapsedSeconds={elapsedSeconds}
              completionQuote={completionQuote}
              pendingQuote={pendingQuote}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onToggleStatus={handleToggleStatus}
              onDeleteTask={handleDeleteTask}
              onStartTimer={handleStartTimer}
              onStopTimer={handleStopTimer}
              onDismissCompletionQuote={() => setCompletionQuote(null)}
              onRefreshPendingQuote={() =>
                setPendingQuote((prev) =>
                  pickRandomQuote(PENDING_MOTIVATION_QUOTES, prev.id)
                )
              }
            />
          )}

          {activeTab === 'activities' && (
            <ActivityManager
              activities={store.activities}
              tasks={store.tasks}
              onAddActivity={handleAddActivity}
              onUpdateActivity={handleUpdateActivity}
              onDeleteActivity={handleDeleteActivity}
            />
          )}

          {activeTab === 'simulator' && (
            <ExtensionSimulator
              userName={store.settings.userName}
              tasks={store.tasks}
              activities={store.activities}
              completionQuote={completionQuote}
              pendingQuote={pendingQuote}
              onAddTask={handleAddTask}
              onToggleStatus={handleToggleStatus}
              onExportPdf={handleExportPdf}
              onGoToStoreDownload={() => setActiveTab('chrome-store')}
            />
          )}

          {activeTab === 'chrome-store' && <ChromeStoreExport />}

          {/* Quick Jump to Charts banner when inside Tasks */}
          {activeTab === 'tasks' && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <BarChart3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span>¿Quieres revisar tus gráficos de tiempo por actividad?</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap"
              >
                Ver resumen y gráficos
              </button>
            </div>
          )}

          {/* Requested Final Hire & Services CTA */}
          <HireCtaFooter />
        </main>
      </div>
    </div>
  );
}
