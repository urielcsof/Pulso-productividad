import { jsPDF } from 'jspdf';
import { Activity, DateRangeFilter, TaskItem } from '../types/productivity';
import { formatMinutes } from './storage';

interface PdfExportOptions {
  userName: string;
  tasks: TaskItem[];
  activities: Activity[];
  dateFilter: DateRangeFilter;
}

function getFilterLabel(filter: DateRangeFilter): string {
  if (filter === 'today') return 'Hoy';
  if (filter === 'week') return 'Últimos 7 días';
  return 'Todo el historial';
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [37, 99, 235];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [
    Number.isNaN(r) ? 37 : r,
    Number.isNaN(g) ? 99 : g,
    Number.isNaN(b) ? 235 : b,
  ];
}

export function exportProductivityPdf({
  userName,
  tasks,
  activities,
  dateFilter,
}: PdfExportOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 18;
    }
  };

  const displayName = userName.trim() || 'Usuario';
  const nowStr = new Date().toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Pulso Productivo — Reporte de Productividad', margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Persona: ${displayName}   |   Período: ${getFilterLabel(dateFilter)}`,
    margin + 6,
    y + 17.5
  );
  doc.text(`Generado localmente: ${nowStr}`, margin + 6, y + 23);

  y += 35;

  // Metrics Calculation
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const totalMinutes = tasks.reduce((acc, t) => acc + t.minutesSpent, 0);
  const completedMinutes = completedTasks.reduce((acc, t) => acc + t.minutesSpent, 0);
  const completionRate =
    tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // KPI Grid (4 boxes)
  const boxGap = 3;
  const boxWidth = (contentWidth - boxGap * 3) / 4;
  const kpis = [
    { label: 'Tareas Totales', value: String(tasks.length) },
    { label: 'Completadas', value: `${completedTasks.length} (${completionRate}%)` },
    { label: 'Pendientes', value: String(pendingTasks.length) },
    { label: 'Tiempo Total', value: formatMinutes(totalMinutes) },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (boxWidth + boxGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, boxWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 3, y + 13.5);
  });

  y += 26;

  // Section 1: Time by Activity with visual bars
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Tiempo empleado por actividad específica', margin, y);
  y += 6;

  const activityStats = activities
    .map((act) => {
      const actTasks = tasks.filter((t) => t.activityId === act.id);
      const mins = actTasks.reduce((acc, t) => acc + t.minutesSpent, 0);
      const done = actTasks.filter((t) => t.status === 'completed').length;
      return {
        activity: act,
        minutes: mins,
        taskCount: actTasks.length,
        completedCount: done,
      };
    })
    .filter((item) => item.minutes > 0 || item.taskCount > 0)
    .sort((a, b) => b.minutes - a.minutes);

  if (activityStats.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No hay tiempo registrado en actividades para este período.', margin, y + 2);
    y += 10;
  } else {
    const maxMins = Math.max(...activityStats.map((s) => s.minutes), 1);
    activityStats.forEach((stat) => {
      ensureSpace(12);
      const [r, g, b] = hexToRgb(stat.activity.color);
      const share =
        totalMinutes > 0 ? Math.round((stat.minutes / totalMinutes) * 100) : 0;

      doc.setFillColor(r, g, b);
      doc.circle(margin + 2, y + 2.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(stat.activity.name, margin + 6, y + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const rightLabel = `${formatMinutes(stat.minutes)} (${share}%) · ${stat.completedCount}/${stat.taskCount} tareas`;
      doc.text(rightLabel, margin + contentWidth, y + 3.5, { align: 'right' });

      // Progress bar track
      y += 5.5;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin + 6, y, contentWidth - 6, 3.2, 1, 1, 'F');

      const fillWidth = Math.max(
        stat.minutes > 0 ? 3 : 0,
        ((contentWidth - 6) * stat.minutes) / maxMins
      );
      if (fillWidth > 0) {
        doc.setFillColor(r, g, b);
        doc.roundedRect(margin + 6, y, fillWidth, 3.2, 1, 1, 'F');
      }
      y += 7;
    });
  }

  y += 4;
  const activityMap = new Map(activities.map((a) => [a.id, a]));

  const renderTaskSection = (
    sectionTitle: string,
    sectionTasks: TaskItem[],
    emptyText: string,
    badgeColor: [number, number, number]
  ) => {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionTitle} (${sectionTasks.length})`, margin, y);
    y += 5;

    if (sectionTasks.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(emptyText, margin, y + 2);
      y += 10;
      return;
    }

    // Table header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Tarea', margin + 3, y + 4.8);
    doc.text('Actividad', margin + 92, y + 4.8);
    doc.text('Tiempo', margin + 140, y + 4.8);
    doc.text('Fecha / Alerta', margin + contentWidth - 2, y + 4.8, { align: 'right' });
    y += 8.5;

    sectionTasks.forEach((task) => {
      const actName = activityMap.get(task.activityId)?.name ?? 'General';
      const titleLines = doc.splitTextToSize(task.title, 82) as string[];
      const rowHeight = Math.max(7, titleLines.length * 4.5 + 2.5);
      ensureSpace(rowHeight + 2);

      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.circle(margin + 2.2, y + 3, 1.1, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(titleLines, margin + 5.5, y + 3.8);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      const actShort = actName.length > 22 ? `${actName.slice(0, 21)}…` : actName;
      doc.text(actShort, margin + 92, y + 3.8);

      doc.setFont('helvetica', 'bold');
      doc.text(formatMinutes(task.minutesSpent), margin + 140, y + 3.8);

      doc.setFont('helvetica', 'normal');
      const dateStr =
        task.status === 'completed' && task.completedAt
          ? new Date(task.completedAt).toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
            })
          : task.alertAt
          ? new Date(task.alertAt).toLocaleString('es-MX', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Sin alerta';
      doc.text(dateStr, margin + contentWidth - 2, y + 3.8, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowHeight - 0.5, margin + contentWidth, y + rowHeight - 0.5);
      y += rowHeight + 1;
    });
    y += 5;
  };

  renderTaskSection(
    'Tareas Completadas',
    completedTasks,
    'Aún no hay tareas completadas en este período.',
    [22, 163, 74]
  );

  renderTaskSection(
    'Tareas Pendientes',
    pendingTasks,
    'Excelente: no tienes tareas pendientes en este período.',
    [217, 119, 6]
  );

  // Closing summary & privacy footer
  ensureSpace(22);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text(
    `Tiempo completado: ${formatMinutes(completedMinutes)} · Sigue construyendo con enfoque`,
    margin + 4,
    y + 7
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Privacidad total: Reporte generado 100% desde almacenamiento local sin cuentas ni servidores.',
    margin + 4,
    y + 13
  );

  const safeSlug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '');
  const todaySlug = new Date().toISOString().slice(0, 10);
  doc.save(`reporte_productividad_${safeSlug || 'usuario'}_${todaySlug}.pdf`);
}
