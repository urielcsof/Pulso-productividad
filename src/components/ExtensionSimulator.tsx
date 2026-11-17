import React, { useState } from 'react';
import {
  Activity,
  MotivationalQuote,
  TaskItem,
  TaskStatus,
} from '../types/productivity';
import { formatMinutes } from '../utils/storage';
import {
  CheckCircle2,
  Circle,
  Download,
  FileDown,
  Plus,
} from 'lucide-react';

interface ExtensionSimulatorProps {
  userName: string;
  tasks: TaskItem[];
  activities: Activity[];
  completionQuote: MotivationalQuote | null;
  pendingQuote: MotivationalQuote;
  onAddTask: (payload: {
    title: string;
    activityId: string;
    status: TaskStatus;
    minutesSpent: number;
    alertAt: string | null;
    notes: string;
  }) => void;
  onToggleStatus: (id: string) => void;
  onExportPdf: () => void;
  onGoToStoreDownload: () => void;
}

export const ExtensionSimulator: React.FC<ExtensionSimulatorProps> = ({
  userName,
  tasks,
  activities,
  completionQuote,
  pendingQuote,
  onAddTask,
  onToggleStatus,
  onExportPdf,
  onGoToStoreDownload,
}) => {
  const [popupTab, setPopupTab] = useState<'pending' | 'completed'>('pending');
  const [title, setTitle] = useState('');
  const [activityId, setActivityId] = useState(activities[0]?.id ?? '');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [minutes, setMinutes] = useState(25);
  const [alertMins, setAlertMins] = useState<string>('');

  const effectiveActId = activities.some((a) => a.id === activityId)
    ? activityId
    : activities[0]?.id ?? '';

  const pending = tasks.filter((t) => t.status === 'pending');
  const completed = tasks.filter((t) => t.status === 'completed');
  const displayList = popupTab === 'pending' ? pending : completed;
  const actMap = new Map(activities.map((a) => [a.id, a]));

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const alertAt =
      status === 'pending' && Number(alertMins) > 0
        ? new Date(Date.now() + Number(alertMins) * 60000).toISOString()
        : null;
    onAddTask({
      title: title.trim(),
      activityId: effectiveActId,
      status,
      minutesSpent: Math.max(0, Number(minutes) || 0),
      alertAt,
      notes: '',
    });
    setTitle('');
    setAlertMins('');
  };

  return (
    <section aria-label="Simulador de popup de Chrome" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Simulador en vivo del Popup de Chrome
          </h2>
          <p className="text-sm text-slate-500">
            Así luce y funciona la ventana emergente (400px) cuando haces clic en el ícono de la extensión en Google Chrome.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToStoreDownload}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Descargar Extensión (.zip)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Realistic Chrome Extension Popup Frame */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-[416px] rounded-xl border border-slate-300 bg-slate-50 shadow-lg overflow-hidden">
            {/* Simulated Chrome toolbar strip */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/assets/aistudio/Dise_o_sin_t_tulo__2__68040bab.png"
                  alt="Ícono de Pulso Productivo"
                  className="h-8 w-8 rounded-lg object-cover shrink-0 border border-slate-200"
                />
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-slate-900">
                    Pulso Productivo
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {userName.trim()
                      ? `Hola, ${userName.trim()} · LocalStorage`
                      : '100% local · Sin cuentas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onExportPdf}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                PDF
              </button>
            </div>

            <div className="p-3.5 space-y-3">
              {completionQuote && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900">
                  <span className="font-semibold">¡Completada! </span>"{completionQuote.text}"
                </div>
              )}

              {pending.length > 0 && popupTab === 'pending' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                  <span className="font-semibold">Pendientes ({pending.length}): </span>
                  {pendingQuote.text}
                </div>
              )}

              <form
                onSubmit={handleQuickAdd}
                className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5"
              >
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Captura rápida de tarea..."
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={effectiveActId}
                    onChange={(e) => setActivityId(e.target.value)}
                    disabled={activities.length === 0}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 disabled:bg-slate-100"
                  >
                    {activities.length === 0 ? (
                      <option value="">Sin actividades</option>
                    ) : (
                      activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))
                    )}
                  </select>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="completed">Completada</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    aria-label="Minutos en simulador"
                    className="rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs tabular-nums"
                  />
                  <select
                    value={status === 'completed' ? '' : alertMins}
                    disabled={status === 'completed'}
                    onChange={(e) => setAlertMins(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 disabled:bg-slate-100"
                  >
                    <option value="">Sin alerta</option>
                    <option value="15">Alerta 15m</option>
                    <option value="30">Alerta 30m</option>
                    <option value="60">Alerta 1h</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={activities.length === 0}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Registrar desde Popup
                </button>
              </form>

              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/70 p-1">
                <button
                  type="button"
                  onClick={() => setPopupTab('pending')}
                  className={`rounded-md py-1 text-xs font-medium ${
                    popupTab === 'pending'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Pendientes ({pending.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPopupTab('completed')}
                  className={`rounded-md py-1 text-xs font-medium ${
                    popupTab === 'completed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Completadas ({completed.length})
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                {displayList.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-500">
                    Sin tareas en esta pestaña.
                  </p>
                ) : (
                  displayList.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-2 p-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleStatus(task.id)}
                        className="flex items-start gap-2 text-left min-w-0"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <div className="min-w-0">
                          <p
                            className={`truncate text-xs font-medium ${
                              task.status === 'completed'
                                ? 'line-through text-slate-500'
                                : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {actMap.get(task.activityId)?.name ?? 'General'} ·{' '}
                            {formatMinutes(task.minutesSpent)}
                          </p>
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Explanation column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              ¿Qué incluye el paquete real de la extensión?
            </h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-900">01. Popup rápido (popup.html):</span>{' '}
                Captura inmediata de tareas pendientes o completadas, frases motivacionales al instante y exportación PDF directa.
              </li>
              <li>
                <span className="font-semibold text-slate-900">02. Panel completo en pestaña (dashboard.html):</span>{' '}
                Gráficos detallados en Canvas por actividad, CRUD completo de actividades y edición de tareas.
              </li>
              <li>
                <span className="font-semibold text-slate-900">03. Alertas en segundo plano (background.js):</span>{' '}
                Usa <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">chrome.alarms</code> y{' '}
                <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">chrome.notifications</code> para recordarte tareas aunque cierres el popup.
              </li>
              <li>
                <span className="font-semibold text-slate-900">04. Generador PDF sin internet (pdf-builder.js):</span>{' '}
                Construye archivos <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">.pdf</code> nativos cumpliendo estrictamente con la política CSP de Manifest V3.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
