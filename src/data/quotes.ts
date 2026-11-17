import { MotivationalQuote } from '../types/productivity';

export const COMPLETION_QUOTES: MotivationalQuote[] = [
  {
    id: 'c1',
    text: 'Cada tarea terminada es un voto de confianza hacia la persona profesional que estás construyendo.',
    author: 'Enfoque Diario',
  },
  {
    id: 'c2',
    text: 'La constancia silenciosa supera al talento intermitente. Excelente cierre de bloque.',
    author: 'Pulso Productivo',
  },
  {
    id: 'c3',
    text: 'No se trata de hacer más cosas, sino de terminar lo que realmente mueve la aguja.',
    author: 'Principio de Impacto',
  },
  {
    id: 'c4',
    text: 'Un pendiente menos es claridad mental ganada para tu siguiente gran idea.',
    author: 'Claridad Operativa',
  },
  {
    id: 'c5',
    text: 'Lo que hoy parece un avance pequeño, en treinta días se convierte en tu ventaja competitiva.',
    author: 'Efecto Compuesto',
  },
  {
    id: 'c6',
    text: 'Terminar lo que empezaste entrena tu mente para confiar en tu propia palabra.',
    author: 'Disciplina Práctica',
  },
  {
    id: 'c7',
    text: 'Gran ejecución. Mantén el impulso: la energía sigue a la acción completada.',
    author: 'Impulso Real',
  },
  {
    id: 'c8',
    text: 'El progreso medible transforma jornadas pesadas en resultados de los que puedes sentirte orgulloso.',
    author: 'Métricas con Propósito',
  },
  {
    id: 'c9',
    text: 'Has convertido intención en resultado tangible. Tómate un respiro breve y celebra el avance.',
    author: 'Hábito Sostenible',
  },
  {
    id: 'c10',
    text: 'La productividad sana no es correr sin pausa, es avanzar con dirección y cerrar ciclos.',
    author: 'Ritmo Consciente',
  },
  {
    id: 'c11',
    text: 'Otro objetivo cumplido. Tu enfoque de hoy está comprando tranquilidad para tu futuro yo.',
    author: 'Visión Largo Plazo',
  },
  {
    id: 'c12',
    text: 'Excelente trabajo. La maestría nace de completar con cuidado las tareas cotidianas.',
    author: 'Oficio Digital',
  },
];

export const PENDING_MOTIVATION_QUOTES: MotivationalQuote[] = [
  {
    id: 'p1',
    text: 'No necesitas terminar todo hoy; elige una sola tarea pendiente y dedícale los próximos 15 minutos.',
    author: 'Regla de Arranque',
  },
  {
    id: 'p2',
    text: 'La fricción siempre es mayor antes de empezar. Al primer minuto de acción, la resistencia baja.',
    author: 'Inercia Positiva',
  },
  {
    id: 'p3',
    text: 'Empieza por la tarea pendiente más pequeña para desbloquear tu ritmo de ejecución.',
    author: 'Victoria Rápida',
  },
  {
    id: 'p4',
    text: 'Tu lista de pendientes no es una deuda, es un mapa de oportunidades para cerrar el día en paz.',
    author: 'Mentalidad de Cierre',
  },
  {
    id: 'p5',
    text: 'Hecho es mejor que perfecto esperando en la bandeja de pendientes. Da el siguiente paso.',
    author: 'Ejecución Ágil',
  },
  {
    id: 'p6',
    text: 'Divide el pendiente más grande en un bloque de 20 minutos y activa una alerta a tu favor.',
    author: 'Bloques de Enfoque',
  },
  {
    id: 'p7',
    text: 'Cada minuto invertido en tus tareas pendientes reduce el ruido mental de mañana.',
    author: 'Orden Mental',
  },
  {
    id: 'p8',
    text: 'Estás a una decisión de transformar tu lista de pendientes en una lista de logros.',
    author: 'Pulso Productivo',
  },
];

export function pickRandomQuote(
  pool: MotivationalQuote[],
  excludeId?: string | null
): MotivationalQuote {
  const candidates =
    excludeId && pool.length > 1
      ? pool.filter((q) => q.id !== excludeId)
      : pool;
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index] ?? pool[0];
}
