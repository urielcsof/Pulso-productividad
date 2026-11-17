import React, { useMemo, useState } from 'react';
import {
  ActiveTimer,
  Activity,
  MotivationalQuote,
  TaskItem,
  TaskStatus,
} from '../types/productivity';
import { formatMinutes, formatTimerClock } from '../utils/storage';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface TaskManagerProps {
  tasks: TaskItem[];
  activities: Activity[];
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
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
  onUpdateTask: (
    id: string,
    updates: Partial<
      Pick<
        TaskItem,
        'title' | 'activityId' | 'status' | 'minutesSpent' | 'alertAt' | 'notes'
      >
    >
  ) => void;
  onToggleStatus: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onStartTimer: (taskId: string) => void;
  onStopTimer: () => void;
  onDismissCompletionQuote: () => void;
  onRefreshPendingQuote: () => void;
}

function toLocalDatetimeInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  activities,
  activeTimer,
  elapsedSeconds,
  completionQuote,
  pendingQuote,
  onAddTask,
  onUpdateTask,
  onToggleStatus,
  onDeleteTask,
  onStartTimer,
  onStopTimer,
  onDismissCompletionQuote,
  onRefreshPendingQuote,
}) => {
  const [title, setTitle] = useState('');
  const [activityId, setActivityId] = useState(activities[0]?.id ?? '');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [minutesSpent, setMinutesSpent] = useState<number>(25);
  const [alertMode, setAlertMode] = useState<'none' | '15' | '30' | '60' | 'custom'>('none');
  const [customAlert, setCustomAlert] = useState('');
  const [notes, setNotes] = useState('');

  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterActivity, setFilterActivity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editActivityId, setEditActivityId] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('pending');
  const [editMinutes, setEditMinutes] = useState(0);
  const [editAlert, setEditAlert] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const effectiveActivityId = activities.some((a) => a.id === activityId)
    ? activityId
    : activities[0]?.id ?? '';

  const activityMap = useMemo(
    () => new Map(activities.map((a) => [a.id, a])),
    [activities]
  );

  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending'),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'completed'),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filterTab !== 'all' && task.status !== filterTab) return false;
      if (filterActivity !== 'all' && task.activityId !== filterActivity) return false;
      if (q && !task.title.toLowerCase().includes(q) && !task.notes.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [tasks, filterTab, filterActivity, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !effectiveActivityId) return;

    let alertAt: string | null = null;
    if (status === 'pending') {
      if (alertMode === '15' || alertMode === '30' || alertMode === '60') {
        alertAt = new Date(
          Date.now() + Number(alertMode) * 60 * 1000
        ).toISOString();
      } else if (alertMode === 'custom' && customAlert) {
        const parsed = new Date(customAlert);
        if (!Number.isNaN(parsed.getTime())) {
          alertAt = parsed.toISOString();
        }
      }
    }

    onAddTask({
      title: trimmed,
      activityId: effectiveActivityId,
      status,
      minutesSpent: Math.max(0, Number(minutesSpent) || 0),
      alertAt,
      notes: notes.trim(),
    });

    setTitle('');
    setNotes('');
    setAlertMode('none');
    setCustomAlert('');
  };

  const beginEdit = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditActivityId(task.activityId);
    setEditStatus(task.status);
    setEditMinutes(task.minutesSpent);
    setEditAlert(toLocalDatetimeInputValue(task.alertAt));
    setEditNotes(task.notes);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    let nextAlert: string | null = null;
    if (editStatus === 'pending' && editAlert) {
      const parsed = new Date(editAlert);
      if (!Number.isNaN(parsed.getTime())) {
        nextAlert = parsed.toISOString();
      }
    }
    onUpdateTask(id, {
      title: trimmed,
      activityId: editActivityId,
      status: editStatus,
      minutesSpent: Math.max(0, Number(editMinutes) || 0),
      alertAt: nextAlert,
      notes: editNotes.trim(),
    });
    setEditingTaskId(null);
  };

  const nowMs = Date.now();

  return (
    <section aria-label="Captura de tareas y alertas" className="space-y-6">
      {/* Motivational quote upon completing a task */}
      {completionQuote && (
        <div
          role="status"
          className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-semibold text-emerald-800">
                ¡Tarea completada! Frase motivacional para tu impulso
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-950">
                "{completionQuote.text}"
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">
                — {completionQuote.author}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissCompletionQuote}
            aria-label="Cerrar frase motivacional"
            className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending Tasks Motivation Banner */}
      {pendingTasks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="space-y-1 max-w-2xl">
            <p className="text-xs font-semibold text-amber-900">
              Tienes {pendingTasks.length}{' '}
              {pendingTasks.length === 1 ? 'tarea pendiente' : 'tareas pendientes'} por cerrar
            </p>
            <p className="text-sm text-amber-950">
              "{pendingQuote.text}"
            </p>
          </div>
          <button
            type="button"
            onClick={onRefreshPendingQuote}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100/60 transition-colors whitespace-nowrap shrink-0"
          >
            Otra frase de enfoque
          </button>
        </div>
      )}

      {/* Manual Task Capture Form (Pending OR Completed) */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Capturar tarea manualmente
            </h2>
            <p className="text-xs text-slate-500">
              Registra tanto tareas pendientes con alerta como tareas que ya completaste junto con el tiempo invertido.
            </p>
          </div>

          {/* Segmented status selector */}
          <div
            role="group"
            aria-label="Estado inicial de la tarea"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            <button
              type="button"
              onClick={() => setStatus('pending')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                status === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendiente
            </button>
            <button
              type="button"
              onClick={() => setStatus('completed')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                status === 'completed'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ya completada
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <label
              htmlFor="task-title-input"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Título de la tarea
            </label>
            <input
              id="task-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                status === 'completed'
                  ? 'Ej. Entregué diseño final de landing page'
                  : 'Ej. Terminar presentación para capacitación de IA'
              }
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="task-activity-select"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Actividad específica
            </label>
            {activities.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Sin actividades. Agrega una en la pestaña{' '}
                <strong>Actividades</strong>.
              </div>
            ) : (
              <select
                id="task-activity-select"
                value={effectiveActivityId}
                onChange={(e) => setActivityId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="task-minutes-input"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Tiempo (min)
            </label>
            <input
              id="task-minutes-input"
              type="number"
              min={0}
              max={1440}
              value={minutesSpent}
              onChange={(e) => setMinutesSpent(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="task-alert-select"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Alerta
            </label>
            <select
              id="task-alert-select"
              value={status === 'completed' ? 'none' : alertMode}
              disabled={status === 'completed'}
              onChange={(e) =>
                setAlertMode(
                  e.target.value as 'none' | '15' | '30' | '60' | 'custom'
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-600 focus:outline-none"
            >
              <option value="none">Sin alerta</option>
              <option value="15">En 15 min</option>
              <option value="30">En 30 min</option>
              <option value="60">En 1 hora</option>
              <option value="custom">Fecha y hora</option>
            </select>
          </div>

          {status === 'pending' && alertMode === 'custom' && (
            <div className="md:col-span-4">
              <label
                htmlFor="task-custom-alert"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Fecha y hora exacta de la alerta
              </label>
              <input
                id="task-custom-alert"
                type="datetime-local"
                value={customAlert}
                onChange={(e) => setCustomAlert(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          )}

          <div
            className={
              status === 'pending' && alertMode === 'custom'
                ? 'md:col-span-6'
                : 'md:col-span-10'
            }
          >
            <label
              htmlFor="task-notes-input"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Notas o detalle (opcional)
            </label>
            <input
              id="task-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto breve, entregable o siguiente paso..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={activities.length === 0}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Guardar
            </button>
          </div>
        </div>
      </form>

      {/* Filter Toolbar & Task List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:px-6">
          <div
            role="group"
            aria-label="Filtrar por estado"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                filterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                filterTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendientes ({pendingTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('completed')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                filterTab === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completadas ({completedTasks.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tarea..."
                aria-label="Buscar tarea"
                className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              aria-label="Filtrar por actividad"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none"
            >
              <option value="all">Todas las actividades</option>
              {activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              No hay tareas que coincidan con este filtro.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Usa el formulario superior para registrar una nueva tarea pendiente o completada.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task) => {
              const activity = activityMap.get(task.activityId);
              const isTiming = activeTimer?.taskId === task.id;
              const isEditing = editingTaskId === task.id;
              const alertMs = task.alertAt ? new Date(task.alertAt).getTime() : null;
              const isOverdue =
                task.status === 'pending' && alertMs !== null && alertMs <= nowMs;

              return (
                <div key={task.id} className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors">
                  {isEditing ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                      <div className="md:col-span-4">
                        <label className="mb-1 block text-xs text-slate-500">
                          Título
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="mb-1 block text-xs text-slate-500">
                          Actividad
                        </label>
                        <select
                          value={editActivityId}
                          onChange={(e) => setEditActivityId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                        >
                          {activities.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs text-slate-500">
                          Estado
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) =>
                            setEditStatus(e.target.value as TaskStatus)
                          }
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="completed">Completada</option>
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="mb-1 block text-xs text-slate-500">
                          Minutos
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editMinutes}
                          onChange={(e) => setEditMinutes(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="mb-1 block text-xs text-slate-500">
                          Alerta (solo si pendiente)
                        </label>
                        <input
                          type="datetime-local"
                          disabled={editStatus === 'completed'}
                          value={editAlert}
                          onChange={(e) => setEditAlert(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs disabled:bg-slate-100 focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-5">
                        <label className="mb-1 block text-xs text-slate-500">
                          Notas
                        </label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(task.id)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(task.id)}
                          aria-label={
                            task.status === 'completed'
                              ? `Marcar "${task.title}" como pendiente`
                              : `Marcar "${task.title}" como completada`
                          }
                          className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              task.status === 'completed'
                                ? 'line-through text-slate-500'
                                : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                              <span
                                className="h-2 w-2 rounded-xs"
                                style={{
                                  backgroundColor: activity?.color ?? '#475569',
                                }}
                                aria-hidden="true"
                              />
                              {activity?.name ?? 'General'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                task.status === 'completed'
                                  ? 'text-emerald-700 font-medium'
                                  : 'text-amber-700 font-medium'
                              }
                            >
                              {task.status === 'completed'
                                ? 'Completada'
                                : 'Pendiente'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                              <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                              {formatMinutes(task.minutesSpent)}
                            </span>

                            {task.status === 'pending' && task.alertAt && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={`inline-flex items-center gap-1 font-medium ${
                                    isOverdue ? 'text-red-600' : 'text-blue-700'
                                  }`}
                                >
                                  {isOverdue ? (
                                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                  ) : (
                                    <Bell className="h-3 w-3" aria-hidden="true" />
                                  )}
                                  {isOverdue ? 'Alerta vencida: ' : 'Alerta: '}
                                  {new Date(task.alertAt).toLocaleString('es-MX', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </>
                            )}
                          </div>

                          {task.notes && (
                            <p className="mt-1 text-xs text-slate-500">
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0 pl-8 sm:pl-0">
                        {task.status === 'pending' && (
                          isTiming ? (
                            <button
                              type="button"
                              onClick={onStopTimer}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 tabular-nums"
                            >
                              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                              Pausar {formatTimerClock(elapsedSeconds)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onStartTimer(task.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                            >
                              <Play className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                              Medir tiempo
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => beginEdit(task)}
                          aria-label={`Editar ${task.title}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          aria-label={`Eliminar ${task.title}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Borrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
