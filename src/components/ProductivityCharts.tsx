import React, { useMemo, useState } from 'react';
import { Activity, DateRangeFilter, TaskItem } from '../types/productivity';
import { formatMinutes } from '../utils/storage';
import { BarChart3, Clock, PieChart } from 'lucide-react';

interface ProductivityChartsProps {
  tasks: TaskItem[];
  allTasks: TaskItem[];
  activities: Activity[];
  dateFilter: DateRangeFilter;
  onDateFilterChange: (filter: DateRangeFilter) => void;
  onQuickAddTask: () => void;
}

export const ProductivityCharts: React.FC<ProductivityChartsProps> = ({
  tasks,
  allTasks,
  activities,
  dateFilter,
  onDateFilterChange,
  onQuickAddTask,
}) => {
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);

  const totalMinutes = useMemo(
    () => tasks.reduce((sum, t) => sum + Math.max(0, t.minutesSpent), 0),
    [tasks]
  );

  const activityBreakdown = useMemo(() => {
    return activities
      .map((act) => {
        const actTasks = tasks.filter((t) => t.activityId === act.id);
        const totalMins = actTasks.reduce((s, t) => s + t.minutesSpent, 0);
        const completedMins = actTasks
          .filter((t) => t.status === 'completed')
          .reduce((s, t) => s + t.minutesSpent, 0);
        const pendingMins = actTasks
          .filter((t) => t.status === 'pending')
          .reduce((s, t) => s + t.minutesSpent, 0);
        const completedCount = actTasks.filter((t) => t.status === 'completed').length;
        return {
          activity: act,
          totalMins,
          completedMins,
          pendingMins,
          taskCount: actTasks.length,
          completedCount,
          sharePct: totalMinutes > 0 ? Math.round((totalMins / totalMinutes) * 100) : 0,
        };
      })
      .sort((a, b) => b.totalMins - a.totalMins);
  }, [activities, tasks, totalMinutes]);

  const maxActivityMins = useMemo(
    () => Math.max(30, ...activityBreakdown.map((item) => item.totalMins)),
    [activityBreakdown]
  );

  // SVG Donut calculation
  const donutSegments = useMemo(() => {
    const activeItems = activityBreakdown.filter((item) => item.totalMins > 0);
    if (activeItems.length === 0 || totalMinutes === 0) return [];
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;

    return activeItems.map((item) => {
      const fraction = item.totalMins / totalMinutes;
      const strokeLength = fraction * circumference;
      const offset = -cumulative * circumference;
      cumulative += fraction;
      return {
        ...item,
        strokeLength,
        offset,
        circumference,
      };
    });
  }, [activityBreakdown, totalMinutes]);

  // 7-day trend using allTasks
  const sevenDayTrend = useMemo(() => {
    const days: {
      key: string;
      label: string;
      completedMins: number;
      pendingMins: number;
      completedTasks: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const dayTasks = allTasks.filter((t) => {
        const refDate = new Date(t.completedAt || t.createdAt);
        return refDate >= d && refDate < next;
      });

      days.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', ''),
        completedMins: dayTasks
          .filter((t) => t.status === 'completed')
          .reduce((s, t) => s + t.minutesSpent, 0),
        pendingMins: dayTasks
          .filter((t) => t.status === 'pending')
          .reduce((s, t) => s + t.minutesSpent, 0),
        completedTasks: dayTasks.filter((t) => t.status === 'completed').length,
      });
    }
    return days;
  }, [allTasks]);

  const maxTrendMins = useMemo(
    () =>
      Math.max(
        60,
        ...sevenDayTrend.map((d) => d.completedMins + d.pendingMins)
      ),
    [sevenDayTrend]
  );

  const hoveredItem = activityBreakdown.find(
    (item) => item.activity.id === hoveredActivityId
  );

  return (
    <section aria-label="Gráficos de productividad" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Análisis detallado de tiempo por actividad
          </h2>
          <p className="text-sm text-slate-500">
            Visualiza en qué actividades específicas inviertes tu jornada y compara tus metas diarias.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filtrar período de gráficos"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          {(
            [
              { id: 'today', label: 'Hoy' },
              { id: 'week', label: 'Últimos 7 días' },
              { id: 'all', label: 'Todo' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onDateFilterChange(option.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                dateFilter === option.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Clock className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Aún no hay tiempo registrado en este período
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Registra una tarea pendiente o completada manualmente para ver los gráficos de tiempo por actividad.
          </p>
          <button
            type="button"
            onClick={onQuickAddTask}
            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Registrar primera tarea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Horizontal Bar Chart: Time per specific activity */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-900">
                  Tiempo empleado por actividad
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                Total: {formatMinutes(totalMinutes)}
              </span>
            </div>

            <div className="space-y-4">
              {activityBreakdown.map((item) => {
                const completedWidth =
                  (item.completedMins / maxActivityMins) * 100;
                const pendingWidth = (item.pendingMins / maxActivityMins) * 100;
                const goalPct =
                  item.activity.dailyGoalMinutes > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (item.totalMins / item.activity.dailyGoalMinutes) * 100
                        )
                      )
                    : 0;
                const isHovered = hoveredActivityId === item.activity.id;

                return (
                  <div
                    key={item.activity.id}
                    onMouseEnter={() => setHoveredActivityId(item.activity.id)}
                    onMouseLeave={() => setHoveredActivityId(null)}
                    className={`rounded-lg p-2.5 -mx-2.5 transition-colors ${
                      isHovered ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.activity.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-sm font-medium text-slate-900">
                          {item.activity.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500 tabular-nums">
                        <span className="font-mono font-semibold text-slate-900">
                          {formatMinutes(item.totalMins)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.sharePct}%</span>
                      </div>
                    </div>

                    <div
                      className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex"
                      role="img"
                      aria-label={`${item.activity.name}: ${formatMinutes(item.totalMins)}`}
                    >
                      {completedWidth > 0 && (
                        <div
                          className="h-full transition-all duration-200"
                          style={{
                            width: `${completedWidth}%`,
                            backgroundColor: item.activity.color,
                          }}
                          title={`Completado: ${formatMinutes(item.completedMins)}`}
                        />
                      )}
                      {pendingWidth > 0 && (
                        <div
                          className="h-full opacity-35 transition-all duration-200"
                          style={{
                            width: `${pendingWidth}%`,
                            backgroundColor: item.activity.color,
                          }}
                          title={`En pendientes: ${formatMinutes(item.pendingMins)}`}
                        />
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 tabular-nums">
                      <span>
                        {item.completedCount} de {item.taskCount} tareas completadas
                      </span>
                      <span>
                        Meta diaria: {formatMinutes(item.activity.dailyGoalMinutes)} ({goalPct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>Barra sólida: tiempo en tareas completadas</span>
              <span aria-hidden="true">·</span>
              <span>Barra tenue: tiempo asignado a pendientes</span>
            </div>
          </div>

          {/* Donut Distribution Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-900">
                  Distribución proporcional
                </h3>
              </div>

              <div className="flex flex-col items-center py-2">
                <div className="relative h-44 w-44">
                  <svg
                    viewBox="0 0 160 160"
                    className="h-full w-full -rotate-90"
                    role="img"
                    aria-label="Gráfico circular de distribución de tiempo por actividad"
                  >
                    <circle
                      cx="80"
                      cy="80"
                      r="64"
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="18"
                    />
                    {donutSegments.map((seg) => {
                      const active = hoveredActivityId === seg.activity.id;
                      return (
                        <circle
                          key={seg.activity.id}
                          cx="80"
                          cy="80"
                          r="64"
                          fill="transparent"
                          stroke={seg.activity.color}
                          strokeWidth={active ? 22 : 18}
                          strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                          strokeDashoffset={seg.offset}
                          className="cursor-pointer transition-all duration-150"
                          onMouseEnter={() => setHoveredActivityId(seg.activity.id)}
                          onMouseLeave={() => setHoveredActivityId(null)}
                        />
                      );
                    })}
                  </svg>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <span className="text-[11px] font-medium text-slate-500 truncate max-w-[110px]">
                      {hoveredItem ? hoveredItem.activity.name : 'Tiempo total'}
                    </span>
                    <span className="mt-0.5 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {hoveredItem
                        ? formatMinutes(hoveredItem.totalMins)
                        : formatMinutes(totalMinutes)}
                    </span>
                    {hoveredItem && (
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        {hoveredItem.sharePct}% del total
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {activityBreakdown
                .filter((item) => item.totalMins > 0)
                .slice(0, 5)
                .map((item) => (
                  <div
                    key={item.activity.id}
                    onMouseEnter={() => setHoveredActivityId(item.activity.id)}
                    onMouseLeave={() => setHoveredActivityId(null)}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.activity.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium text-slate-700">
                        {item.activity.name}
                      </span>
                    </div>
                    <span className="font-mono font-medium text-slate-900 tabular-nums shrink-0">
                      {formatMinutes(item.totalMins)} · {item.sharePct}%
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* 7-Day Trend Bar Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Evolución diaria de productividad (últimos 7 días)
                </h3>
                <p className="text-xs text-slate-500">
                  Comparativa de minutos completados frente a pendientes registrados cada día
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-blue-600" aria-hidden="true" />
                  Completado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-amber-400" aria-hidden="true" />
                  Pendiente
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-3 pt-2">
              {sevenDayTrend.map((day) => {
                const doneHeight = Math.round(
                  (day.completedMins / maxTrendMins) * 112
                );
                const pendHeight = Math.round(
                  (day.pendingMins / maxTrendMins) * 112
                );
                const totalDay = day.completedMins + day.pendingMins;

                return (
                  <div
                    key={day.key}
                    className="flex flex-col items-center text-center"
                  >
                    <span className="mb-1.5 font-mono text-[11px] text-slate-500 tabular-nums">
                      {totalDay > 0 ? formatMinutes(totalDay) : '0 m'}
                    </span>
                    <div className="flex h-28 w-full max-w-[44px] flex-col justify-end overflow-hidden rounded-md bg-slate-100 p-1">
                      {pendHeight > 0 && (
                        <div
                          className="w-full rounded-t-xs bg-amber-400 transition-all duration-200"
                          style={{ height: `${Math.max(4, pendHeight)}px` }}
                          title={`Pendiente: ${formatMinutes(day.pendingMins)}`}
                        />
                      )}
                      {doneHeight > 0 && (
                        <div
                          className={`w-full bg-blue-600 transition-all duration-200 ${
                            pendHeight === 0 ? 'rounded-t-xs' : ''
                          } rounded-b-xs`}
                          style={{ height: `${Math.max(4, doneHeight)}px` }}
                          title={`Completado: ${formatMinutes(day.completedMins)}`}
                        />
                      )}
                    </div>
                    <span className="mt-2 text-xs font-medium capitalize text-slate-700">
                      {day.label}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {day.completedTasks} hechas
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
