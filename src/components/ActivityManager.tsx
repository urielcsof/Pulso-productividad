import React, { useState } from 'react';
import { Activity, TaskItem } from '../types/productivity';
import { ACTIVITY_COLOR_PALETTE, formatMinutes } from '../utils/storage';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';

interface ActivityManagerProps {
  activities: Activity[];
  tasks: TaskItem[];
  onAddActivity: (name: string, color: string, dailyGoalMinutes: number) => void;
  onUpdateActivity: (
    id: string,
    updates: { name: string; color: string; dailyGoalMinutes: number }
  ) => void;
  onDeleteActivity: (id: string, reassignToId: string) => void;
}

export const ActivityManager: React.FC<ActivityManagerProps> = ({
  activities,
  tasks,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
}) => {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(ACTIVITY_COLOR_PALETTE[0].hex);
  const [newGoal, setNewGoal] = useState(60);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#2563EB');
  const [editGoal, setEditGoal] = useState(60);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassignId, setReassignId] = useState<string>('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddActivity(trimmed, newColor, Math.max(5, Number(newGoal) || 30));
    setNewName('');
    setNewGoal(60);
  };

  const startEdit = (act: Activity) => {
    setEditingId(act.id);
    setEditName(act.name);
    setEditColor(act.color);
    setEditGoal(act.dailyGoalMinutes);
    setDeletingId(null);
  };

  const saveEdit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    onUpdateActivity(id, {
      name: trimmed,
      color: editColor,
      dailyGoalMinutes: Math.max(5, Number(editGoal) || 30),
    });
    setEditingId(null);
  };

  const startDelete = (act: Activity) => {
    const fallback = activities.find((a) => a.id !== act.id)?.id ?? '';
    setDeletingId(act.id);
    setReassignId(fallback);
    setEditingId(null);
  };

  return (
    <section aria-label="Gestión de actividades" className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Actividades y categorías personalizadas
        </h2>
        <p className="text-sm text-slate-500">
          Añade nuevas áreas de trabajo, modifica sus metas diarias o elimina actividades existentes sin perder tus tareas.
        </p>
      </div>

      {/* Add new activity form */}
      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Añadir nueva actividad
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="new-activity-name"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Nombre de la actividad
            </label>
            <input
              id="new-activity-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Diseño UX, Prospección, Estudio de IA..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              required
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="new-activity-goal"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Meta diaria (minutos)
            </label>
            <input
              id="new-activity-goal"
              type="number"
              min={5}
              max={720}
              value={newGoal}
              onChange={(e) => setNewGoal(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Color
            </span>
            <div className="flex flex-wrap gap-1.5 py-1">
              {ACTIVITY_COLOR_PALETTE.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => setNewColor(swatch.hex)}
                  aria-label={`Seleccionar color ${swatch.label}`}
                  className={`h-6 w-6 rounded-md transition-transform ${
                    newColor === swatch.hex
                      ? 'ring-2 ring-slate-900 ring-offset-2 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Añadir
            </button>
          </div>
        </div>
      </form>

      {/* Activities table / list */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {activities.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-900">
              Aún no hay actividades registradas
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Usa el formulario de arriba para ingresar tus propias actividades (por ejemplo: Estudio, Ventas, Desarrollo, Diseño o Gestión) y su meta diaria en minutos.
            </p>
          </div>
        ) : (
        <div className="divide-y divide-slate-100">
          {activities.map((act) => {
            const actTasks = tasks.filter((t) => t.activityId === act.id);
            const totalMins = actTasks.reduce((s, t) => s + t.minutesSpent, 0);
            const isEditing = editingId === act.id;
            const isDeleting = deletingId === act.id;

            return (
              <div key={act.id} className="p-4 sm:px-6">
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-4">
                      <label className="mb-1 block text-xs text-slate-500">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs text-slate-500">
                        Meta (min)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={720}
                        value={editGoal}
                        onChange={(e) => setEditGoal(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <span className="mb-1 block text-xs text-slate-500">
                        Color
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {ACTIVITY_COLOR_PALETTE.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => setEditColor(swatch.hex)}
                            aria-label={`Color ${swatch.label}`}
                            className={`h-5 w-5 rounded-sm ${
                              editColor === swatch.hex
                                ? 'ring-2 ring-slate-900 ring-offset-1'
                                : ''
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(act.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : isDeleting ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-3">
                    <div className="text-sm text-red-900">
                      <span className="font-semibold">¿Eliminar "{act.name}"?</span>{' '}
                      {actTasks.length > 0
                        ? `Tiene ${actTasks.length} tarea(s). Elige a qué actividad moverlas:`
                        : 'No tiene tareas asociadas.'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {actTasks.length > 0 && activities.length > 1 && (
                        <select
                          value={reassignId}
                          onChange={(e) => setReassignId(e.target.value)}
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        >
                          {activities
                            .filter((other) => other.id !== act.id)
                            .map((other) => (
                              <option key={other.id} value={other.id}>
                                Mover a: {other.name}
                              </option>
                            ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteActivity(act.id, reassignId);
                          setDeletingId(null);
                        }}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Confirmar eliminación
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-3.5 w-3.5 rounded-sm shrink-0"
                        style={{ backgroundColor: act.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {act.name}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {actTasks.length} tareas · {formatMinutes(totalMins)} acumulados · Meta diaria: {formatMinutes(act.dailyGoalMinutes)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(act)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Modificar
                      </button>
                      <button
                        type="button"
                        onClick={() => startDelete(act)}
                        title="Eliminar actividad"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Eliminar
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
