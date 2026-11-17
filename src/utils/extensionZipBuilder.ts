import JSZip from 'jszip';

const EXTENSION_ICON_URL = '/assets/aistudio/Dise_o_sin_t_tulo__2__68040bab.png';

function loadIconImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = EXTENSION_ICON_URL;
  });
}

async function generatePngIconBytes(
  size: number,
  sourceImg?: HTMLImageElement | null
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new Uint8Array();
  }

  const img = sourceImg !== undefined ? sourceImg : await loadIconImage();
  if (img) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
  } else {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#2563EB');
    grad.addColorStop(1, '#1E40AF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return new Uint8Array();
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

const MANIFEST_JSON = JSON.stringify(
  {
    manifest_version: 3,
    name: 'Pulso Productivo — Tareas, Tiempo y Alertas',
    short_name: 'Pulso Productivo',
    version: '1.0.0',
    description:
      'Mide tu productividad con captura manual de tareas, alertas, gráficos por actividad, frases motivacionales y reporte PDF 100% local.',
    permissions: ['storage', 'alarms', 'notifications'],
    action: {
      default_popup: 'popup.html',
      default_title: 'Pulso Productivo',
      default_icon: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
    },
    background: {
      service_worker: 'background.js',
    },
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  null,
  2
);

const BACKGROUND_JS = `/* Pulso Productivo - Service Worker (Manifest V3) */
const STORAGE_KEY = 'pulso_productivo_ext_v2';

async function syncAlarmsFromStorage() {
  if (!chrome.alarms) return;
  const allAlarms = await chrome.alarms.getAll();
  for (const alarm of allAlarms) {
    if (alarm.name.startsWith('task_alert_')) {
      await chrome.alarms.clear(alarm.name);
    }
  }

  const res = await chrome.storage.local.get(STORAGE_KEY);
  const store = res[STORAGE_KEY];
  if (!store || !Array.isArray(store.tasks)) return;

  const now = Date.now();
  for (const task of store.tasks) {
    if (task.status === 'pending' && task.alertAt && !task.alertTriggered) {
      const when = new Date(task.alertAt).getTime();
      if (!Number.isNaN(when) && when > now) {
        chrome.alarms.create('task_alert_' + task.id, { when });
      }
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  syncAlarmsFromStorage();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'SYNC_ALARMS') {
    syncAlarmsFromStorage().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('task_alert_')) return;
  const taskId = alarm.name.replace('task_alert_', '');
  const res = await chrome.storage.local.get(STORAGE_KEY);
  const store = res[STORAGE_KEY];
  if (!store || !Array.isArray(store.tasks)) return;

  const task = store.tasks.find((t) => t.id === taskId);
  if (!task || task.status !== 'pending') return;

  const activity = (store.activities || []).find((a) => a.id === task.activityId);
  const userName = (store.settings && store.settings.userName) ? store.settings.userName : 'Hola';

  chrome.notifications.create('notif_' + taskId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Alerta de tarea · ' + (activity ? activity.name : 'General'),
    message: userName + ', es momento de avanzar con: "' + task.title + '". ¡Tú puedes completarla!',
    priority: 2
  });

  task.alertTriggered = true;
  await chrome.storage.local.set({ [STORAGE_KEY]: store });
});

chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});
`;

const SHARED_JS = `/* Pulso Productivo - Almacenamiento Local y Motivación (Sin servidores) */
(function (global) {
  const STORAGE_KEY = 'pulso_productivo_ext_v2';

  const COLOR_PALETTE = [
    { label: 'Cobalto', hex: '#2563EB' },
    { label: 'Esmeralda', hex: '#16A34A' },
    { label: 'Ámbar', hex: '#D97706' },
    { label: 'Índigo', hex: '#4F46E5' },
    { label: 'Teal', hex: '#0D9488' },
    { label: 'Rosa', hex: '#E11D48' },
    { label: 'Pizarra', hex: '#475569' }
  ];

  const COMPLETION_QUOTES = [
    'Cada tarea terminada es un voto de confianza hacia tu mejor versión profesional.',
    'La constancia silenciosa supera al talento intermitente. Excelente cierre de bloque.',
    'No se trata de hacer más cosas, sino de terminar lo que realmente importa.',
    'Un pendiente menos es claridad mental ganada para tu siguiente gran idea.',
    'Terminar lo que empezaste entrena tu mente para confiar en tu propia palabra.',
    'Gran ejecución. La energía sigue a la acción completada.',
    'Has convertido intención en resultado tangible. Sigue con ese ritmo.'
  ];

  const PENDING_QUOTES = [
    'Elige una sola tarea pendiente y dedícale los próximos 15 minutos.',
    'La fricción siempre es mayor antes de empezar; al primer minuto todo fluye.',
    'Empieza por la tarea pendiente más corta para desbloquear tu impulso.',
    'Hecho es mejor que perfecto esperando en tu lista de pendientes.',
    'Cada pendiente resuelto reduce el ruido mental de tu jornada.'
  ];

  function createId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function getDefaultStore() {
    return {
      settings: { userName: '' },
      activities: [],
      tasks: [],
      activeTimer: null
    };
  }

  async function loadStore() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get(STORAGE_KEY);
      if (res && res[STORAGE_KEY]) {
        const parsed = res[STORAGE_KEY];
        return {
          settings: parsed.settings || { userName: '' },
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          activeTimer: parsed.activeTimer || null
        };
      }
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          settings: parsed.settings || { userName: '' },
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          activeTimer: parsed.activeTimer || null
        };
      }
    } catch (_e) {}
    return getDefaultStore();
  }

  async function saveStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (_e) {}
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: store });
    }
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: 'SYNC_ALARMS' });
      } catch (_e) {}
    }
  }

  function formatMinutes(mins) {
    const m = Math.max(0, Math.round(mins || 0));
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0 ? h + ' h' : h + ' h ' + rem + ' min';
  }

  function pickQuote(list, prev) {
    const candidates = list.length > 1 && prev ? list.filter((q) => q !== prev) : list;
    return candidates[Math.floor(Math.random() * candidates.length)] || list[0];
  }

  global.PulsoShared = {
    COLOR_PALETTE,
    COMPLETION_QUOTES,
    PENDING_QUOTES,
    createId,
    loadStore,
    saveStore,
    formatMinutes,
    pickQuote
  };
})(window);
`;

const PDF_BUILDER_JS = `/* Pulso Productivo - Generador PDF 1.4 puro sin dependencias externas (MV3 CSP safe) */
(function (global) {
  function sanitizePdfText(str) {
    const map = {
      'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n',
      'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ñ': 'N',
      '¡': '!', '¿': '?', '—': '-', '–': '-', '·': '-', '…': '...'
    };
    return String(str || '')
      .replace(/[áéíóúüñÁÉÍÓÚÜÑ¡¿—–·…]/g, (ch) => map[ch] || ch)
      .replace(/[^\\x20-\\x7E]/g, ' ')
      .replace(/\\\\/g, '\\\\\\\\')
      .replace(/\\(/g, '\\\\(')
      .replace(/\\)/g, '\\\\)');
  }

  function hexToRgbNorm(hex) {
    const clean = (hex || '#2563EB').replace('#', '');
    if (clean.length !== 6) return '0.15 0.39 0.92';
    const r = (parseInt(clean.slice(0, 2), 16) / 255).toFixed(2);
    const g = (parseInt(clean.slice(2, 4), 16) / 255).toFixed(2);
    const b = (parseInt(clean.slice(4, 6), 16) / 255).toFixed(2);
    return r + ' ' + g + ' ' + b;
  }

  function exportStoreToPdf(store) {
    const userName = (store.settings && store.settings.userName) ? store.settings.userName : 'Usuario';
    const tasks = store.tasks || [];
    const activities = store.activities || [];
    const completed = tasks.filter((t) => t.status === 'completed');
    const pending = tasks.filter((t) => t.status === 'pending');
    const totalMins = tasks.reduce((a, t) => a + (Number(t.minutesSpent) || 0), 0);
    const rate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;

    const commands = [];
    let y = 780;

    function addText(x, yPos, text, size, bold, colorRgb) {
      const font = bold ? '/F2' : '/F1';
      commands.push('BT ' + font + ' ' + size + ' Tf ' + (colorRgb || '0.06 0.09 0.16') + ' rg 1 0 0 1 ' + x + ' ' + yPos + ' Tm (' + sanitizePdfText(text) + ') Tj ET');
    }

    function addRect(x, yPos, w, h, fillRgb) {
      commands.push(fillRgb + ' rg ' + x + ' ' + yPos + ' ' + w + ' ' + h + ' re f');
    }

    // Header
    addRect(40, 742, 515, 62, '0.06 0.09 0.16');
    addText(56, 782, 'Pulso Productivo - Reporte de Productividad', 16, true, '1 1 1');
    addText(56, 764, 'Persona: ' + userName + '  |  Fecha: ' + new Date().toLocaleDateString('es-MX'), 10, false, '0.80 0.84 0.90');
    addText(56, 750, 'Almacenamiento 100% local en tu navegador (sin recabar datos)', 9, false, '0.64 0.70 0.78');

    y = 716;
    addText(40, y, 'Resumen General: ' + tasks.length + ' tareas | ' + completed.length + ' completadas (' + rate + '%) | ' + pending.length + ' pendientes | Tiempo: ' + global.PulsoShared.formatMinutes(totalMins), 10, true);
    y -= 24;

    addText(40, y, 'Tiempo empleado por actividad especifica', 12, true);
    y -= 18;

    const actStats = activities.map((act) => {
      const mins = tasks.filter((t) => t.activityId === act.id).reduce((s, t) => s + (Number(t.minutesSpent) || 0), 0);
      return { act, mins };
    }).filter((s) => s.mins > 0).sort((a, b) => b.mins - a.mins);

    const maxMins = Math.max(1, ...actStats.map((s) => s.mins));
    if (actStats.length === 0) {
      addText(40, y, 'Sin tiempo registrado por actividad todavia.', 9.5, false, '0.4 0.45 0.52');
      y -= 18;
    } else {
      actStats.forEach((s) => {
        if (y < 90) return;
        const pct = totalMins ? Math.round((s.mins / totalMins) * 100) : 0;
        addText(40, y, s.act.name + ': ' + global.PulsoShared.formatMinutes(s.mins) + ' (' + pct + '%)', 9.5, false);
        y -= 9;
        addRect(40, y, 480, 6, '0.94 0.96 0.98');
        addRect(40, y, Math.max(8, Math.round((480 * s.mins) / maxMins)), 6, hexToRgbNorm(s.act.color));
        y -= 16;
      });
    }

    y -= 10;
    const actMap = {};
    activities.forEach((a) => { actMap[a.id] = a.name; });

    function drawList(title, list) {
      if (y < 100) return;
      addText(40, y, title + ' (' + list.length + ')', 12, true);
      y -= 16;
      if (list.length === 0) {
        addText(40, y, 'Ninguna tarea en esta seccion.', 9.5, false, '0.4 0.45 0.52');
        y -= 18;
        return;
      }
      list.slice(0, 18).forEach((t) => {
        if (y < 60) return;
        const line = '- ' + t.title.slice(0, 48) + ' [' + (actMap[t.activityId] || 'General') + '] - ' + global.PulsoShared.formatMinutes(t.minutesSpent);
        addText(46, y, line, 9.5, false);
        y -= 14;
      });
      y -= 10;
    }

    drawList('Tareas Completadas', completed);
    drawList('Tareas Pendientes', pending);

    const streamContent = commands.join('\\n');
    const objs = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj',
      '4 0 obj << /Length ' + streamContent.length + ' >> stream\\n' + streamContent + '\\nendstream endobj',
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj'
    ];

    let pdf = '%PDF-1.4\\n';
    const offsets = [0];
    objs.forEach((o) => {
      offsets.push(pdf.length);
      pdf += o + '\\n';
    });
    const xrefPos = pdf.length;
    pdf += 'xref\\n0 ' + (objs.length + 1) + '\\n0000000000 65535 f \\n';
    for (let i = 1; i <= objs.length; i++) {
      pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \\n';
    }
    pdf += 'trailer << /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\\nstartxref\\n' + xrefPos + '\\n%%EOF';

    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte_pulso_productivo_' + new Date().toISOString().slice(0, 10) + '.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  global.PulsoPdf = { exportStoreToPdf };
})(window);
`;

const EXT_CSS = `* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f8fafc;
  color: #0f172a;
  line-height: 1.45;
}
.popup-body { width: 410px; min-height: 540px; padding: 14px; }
.dash-body { max-width: 1120px; margin: 0 auto; padding: 24px; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 14px; }
.brand { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
.sub { font-size: 12px; color: #64748b; margin: 2px 0 0; }
.card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
.row { display: flex; gap: 8px; align-items: center; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.kpi { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
.kpi-label { font-size: 11px; color: #64748b; }
.kpi-val { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 2px; }
input, select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  font-size: 13px;
  background: #fff;
  color: #0f172a;
}
label { display: block; font-size: 11.5px; font-weight: 600; color: #475569; margin-bottom: 4px; }
button {
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
}
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #fff; color: #334155; border-color: #cbd5e1; }
.btn-secondary:hover { background: #f1f5f9; }
.btn-danger { background: #fff; color: #dc2626; border-color: #fecaca; }
.tabs { display: flex; gap: 4px; background: #f1f5f9; padding: 3px; border-radius: 8px; margin-bottom: 12px; }
.tab-btn { flex: 1; background: transparent; color: #475569; padding: 6px 8px; font-size: 12px; }
.tab-btn.active { background: #fff; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.task-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
.task-item:last-child { border-bottom: none; }
.task-title { font-size: 13px; font-weight: 600; margin: 0; }
.task-title.done { text-decoration: line-through; color: #64748b; }
.meta { font-size: 11.5px; color: #64748b; margin-top: 2px; font-variant-numeric: tabular-nums; }
.quote-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 9px; padding: 10px 12px; font-size: 12.5px; color: #1e3a8a; margin-bottom: 12px; }
.nudge-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 9px; padding: 10px 12px; font-size: 12.5px; color: #92400e; margin-bottom: 12px; }
.cta-footer { background: #0f172a; color: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 24px; }
.cta-footer a { color: #93c5fd; font-weight: 600; text-decoration: none; }
.hidden { display: none !important; }
`;

const POPUP_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Pulso Productivo</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body class="popup-body">
    <div class="topbar">
      <div class="row">
        <img src="icons/icon48.png" alt="Pulso Productivo" style="width: 32px; height: 32px; border-radius: 7px; object-fit: cover;" />
        <div>
          <h1 class="brand">Pulso Productivo</h1>
          <p class="sub" id="greetingText">100% local · Sin cuentas ni servidores</p>
        </div>
      </div>
      <button id="openDashboardBtn" class="btn-secondary">Panel y Gráficos</button>
    </div>

    <div id="nameCard" class="card">
      <label for="userNameInput">Tu nombre (solo local, sin login)</label>
      <div class="row">
        <input id="userNameInput" type="text" placeholder="Ej. Sofía, Carlos, Uriel..." />
        <button id="saveNameBtn" class="btn-primary">Guardar</button>
      </div>
    </div>

    <div id="quickActCard" class="card hidden">
      <label for="quickActInput">Día cero: crea tu primera actividad</label>
      <div class="row">
        <input id="quickActInput" type="text" placeholder="Ej. Trabajo, Estudio, Ventas..." />
        <button id="quickActBtn" class="btn-primary">Añadir</button>
      </div>
    </div>

    <div id="quoteBanner" class="quote-box hidden"></div>
    <div id="pendingNudge" class="nudge-box hidden"></div>

    <div class="card">
      <div class="grid-2" style="margin-bottom: 8px;">
        <div style="grid-column: span 2;">
          <label for="taskTitle">Nueva tarea (pendiente o completada)</label>
          <input id="taskTitle" type="text" placeholder="¿Qué actividad realizaste o vas a realizar?" />
        </div>
        <div>
          <label for="taskActivity">Actividad</label>
          <select id="taskActivity"></select>
        </div>
        <div>
          <label for="taskStatus">Estado inicial</label>
          <select id="taskStatus">
            <option value="pending">Pendiente</option>
            <option value="completed">Completada</option>
          </select>
        </div>
        <div>
          <label for="taskMinutes">Tiempo (min)</label>
          <input id="taskMinutes" type="number" min="0" value="25" />
        </div>
        <div>
          <label for="taskAlert">Alerta (si pendiente)</label>
          <select id="taskAlert">
            <option value="">Sin alerta</option>
            <option value="15">En 15 minutos</option>
            <option value="30">En 30 minutos</option>
            <option value="60">En 1 hora</option>
          </select>
        </div>
      </div>
      <button id="addTaskBtn" class="btn-primary" style="width: 100%;">Registrar tarea</button>
    </div>

    <div class="tabs">
      <button id="tabPending" class="tab-btn active">Pendientes (<span id="pendingCount">0</span>)</button>
      <button id="tabCompleted" class="tab-btn">Completadas (<span id="completedCount">0</span>)</button>
    </div>

    <div id="taskListCard" class="card"></div>

    <div class="row" style="justify-content: space-between;">
      <button id="exportPdfBtn" class="btn-secondary" style="flex: 1;">Exportar Reporte PDF</button>
    </div>

    <script src="shared.js"></script>
    <script src="pdf-builder.js"></script>
    <script src="popup.js"></script>
  </body>
</html>
`;

const POPUP_JS = `/* Pulso Productivo - Popup Script */
document.addEventListener('DOMContentLoaded', async () => {
  const { loadStore, saveStore, createId, formatMinutes, COMPLETION_QUOTES, PENDING_QUOTES, pickQuote } = window.PulsoShared;

  let store = await loadStore();
  let activeTab = 'pending';
  let lastQuote = '';

  const greetingText = document.getElementById('greetingText');
  const nameCard = document.getElementById('nameCard');
  const userNameInput = document.getElementById('userNameInput');
  const saveNameBtn = document.getElementById('saveNameBtn');
  const quickActCard = document.getElementById('quickActCard');
  const quickActInput = document.getElementById('quickActInput');
  const quickActBtn = document.getElementById('quickActBtn');
  const quoteBanner = document.getElementById('quoteBanner');
  const pendingNudge = document.getElementById('pendingNudge');
  const taskActivity = document.getElementById('taskActivity');
  const taskTitle = document.getElementById('taskTitle');
  const taskStatus = document.getElementById('taskStatus');
  const taskMinutes = document.getElementById('taskMinutes');
  const taskAlert = document.getElementById('taskAlert');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const tabPending = document.getElementById('tabPending');
  const tabCompleted = document.getElementById('tabCompleted');
  const pendingCount = document.getElementById('pendingCount');
  const completedCount = document.getElementById('completedCount');
  const taskListCard = document.getElementById('taskListCard');
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');

  function render() {
    const name = (store.settings && store.settings.userName || '').trim();
    greetingText.textContent = name ? 'Hola, ' + name + ' · 100% en almacenamiento local' : '100% local · Sin cuentas ni servidores';
    if (name) {
      userNameInput.value = name;
      nameCard.classList.add('hidden');
    } else {
      nameCard.classList.remove('hidden');
    }

    taskActivity.innerHTML = '';
    if (store.activities.length === 0) {
      quickActCard.classList.remove('hidden');
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Crea una actividad primero';
      taskActivity.appendChild(opt);
      addTaskBtn.disabled = true;
    } else {
      quickActCard.classList.add('hidden');
      addTaskBtn.disabled = false;
      store.activities.forEach((act) => {
        const opt = document.createElement('option');
        opt.value = act.id;
        opt.textContent = act.name;
        taskActivity.appendChild(opt);
      });
    }

    const pending = store.tasks.filter((t) => t.status === 'pending');
    const completed = store.tasks.filter((t) => t.status === 'completed');
    pendingCount.textContent = String(pending.length);
    completedCount.textContent = String(completed.length);

    if (pending.length > 0 && activeTab === 'pending') {
      pendingNudge.textContent = 'Motivación para tus ' + pending.length + ' pendientes: ' + pickQuote(PENDING_QUOTES);
      pendingNudge.classList.remove('hidden');
    } else {
      pendingNudge.classList.add('hidden');
    }

    const list = activeTab === 'pending' ? pending : completed;
    taskListCard.innerHTML = '';

    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'sub';
      empty.textContent = activeTab === 'pending'
        ? 'No tienes tareas pendientes. ¡Excelente orden!'
        : 'Aún no registras tareas completadas.';
      taskListCard.appendChild(empty);
      return;
    }

    const actMap = new Map(store.activities.map((a) => [a.id, a]));
    list.forEach((task) => {
      const item = document.createElement('div');
      item.className = 'task-item';

      const left = document.createElement('div');
      const titleEl = document.createElement('p');
      titleEl.className = 'task-title' + (task.status === 'completed' ? ' done' : '');
      titleEl.textContent = task.title;

      const act = actMap.get(task.activityId);
      const metaEl = document.createElement('div');
      metaEl.className = 'meta';
      metaEl.textContent = (act ? act.name : 'General') + ' · ' + formatMinutes(task.minutesSpent) + (task.alertAt && task.status === 'pending' ? ' · Con alerta' : '');

      left.appendChild(titleEl);
      left.appendChild(metaEl);

      const actions = document.createElement('div');
      actions.className = 'row';

      const toggleBtn = document.createElement('button');
      toggleBtn.className = task.status === 'pending' ? 'btn-primary' : 'btn-secondary';
      toggleBtn.textContent = task.status === 'pending' ? 'Completar' : 'Reabrir';
      toggleBtn.addEventListener('click', async () => {
        const becomingDone = task.status === 'pending';
        task.status = becomingDone ? 'completed' : 'pending';
        task.completedAt = becomingDone ? new Date().toISOString() : null;
        await saveStore(store);
        if (becomingDone) {
          lastQuote = pickQuote(COMPLETION_QUOTES, lastQuote);
          quoteBanner.textContent = 'Tarea completada: "' + lastQuote + '"';
          quoteBanner.classList.remove('hidden');
        }
        render();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.textContent = 'Borrar';
      delBtn.addEventListener('click', async () => {
        store.tasks = store.tasks.filter((t) => t.id !== task.id);
        await saveStore(store);
        render();
      });

      actions.appendChild(toggleBtn);
      actions.appendChild(delBtn);

      item.appendChild(left);
      item.appendChild(actions);
      taskListCard.appendChild(item);
    });
  }

  saveNameBtn.addEventListener('click', async () => {
    store.settings.userName = userNameInput.value.trim();
    await saveStore(store);
    render();
  });

  quickActBtn.addEventListener('click', async () => {
    const actName = quickActInput.value.trim();
    if (!actName) return;
    store.activities.push({
      id: createId('act'),
      name: actName,
      color: '#2563EB',
      dailyGoalMinutes: 60,
      createdAt: new Date().toISOString()
    });
    quickActInput.value = '';
    await saveStore(store);
    render();
  });

  addTaskBtn.addEventListener('click', async () => {
    const title = taskTitle.value.trim();
    if (!title || store.activities.length === 0) return;
    const status = taskStatus.value;
    const mins = Math.max(0, Number(taskMinutes.value) || 0);
    const alertMins = Number(taskAlert.value) || 0;
    const alertAt = status === 'pending' && alertMins > 0
      ? new Date(Date.now() + alertMins * 60000).toISOString()
      : null;

    store.tasks.unshift({
      id: createId('tsk'),
      title,
      activityId: taskActivity.value || store.activities[0].id,
      status,
      minutesSpent: mins,
      alertAt,
      alertTriggered: false,
      notes: '',
      createdAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : null
    });

    taskTitle.value = '';
    await saveStore(store);

    if (status === 'completed') {
      lastQuote = pickQuote(COMPLETION_QUOTES, lastQuote);
      quoteBanner.textContent = '¡Gran avance! "' + lastQuote + '"';
      quoteBanner.classList.remove('hidden');
    }
    render();
  });

  tabPending.addEventListener('click', () => {
    activeTab = 'pending';
    tabPending.classList.add('active');
    tabCompleted.classList.remove('active');
    render();
  });

  tabCompleted.addEventListener('click', () => {
    activeTab = 'completed';
    tabCompleted.classList.add('active');
    tabPending.classList.remove('active');
    render();
  });

  openDashboardBtn.addEventListener('click', () => {
    const url = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('dashboard.html')
      : 'dashboard.html';
    window.open(url, '_blank');
  });

  exportPdfBtn.addEventListener('click', () => {
    window.PulsoPdf.exportStoreToPdf(store);
  });

  render();
});
`;

const DASHBOARD_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Pulso Productivo — Panel Completo</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body class="dash-body">
    <div class="topbar">
      <div class="row">
        <img src="icons/icon48.png" alt="Pulso Productivo" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover;" />
        <div>
          <h1 class="brand" style="font-size: 20px;">Pulso Productivo</h1>
          <p class="sub" id="dashGreeting">Panel completo de productividad, alertas y reportes PDF</p>
        </div>
      </div>
      <div class="row">
        <input id="dashNameInput" type="text" placeholder="Tu nombre..." style="width: 180px;" />
        <button id="dashSaveNameBtn" class="btn-secondary">Guardar nombre</button>
        <button id="dashClearAllBtn" class="btn-danger">Limpiar todo</button>
        <button id="dashExportPdfBtn" class="btn-primary">Exportar PDF</button>
      </div>
    </div>

    <div id="dashQuoteBanner" class="quote-box hidden"></div>

    <div class="grid-4">
      <div class="kpi"><div class="kpi-label">Tareas Totales</div><div class="kpi-val" id="kpiTotal">0</div></div>
      <div class="kpi"><div class="kpi-label">Completadas</div><div class="kpi-val" id="kpiDone">0</div></div>
      <div class="kpi"><div class="kpi-label">Pendientes</div><div class="kpi-val" id="kpiPending">0</div></div>
      <div class="kpi"><div class="kpi-label">Tiempo Enfocado</div><div class="kpi-val" id="kpiTime">0 min</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2 class="brand" style="margin-bottom: 10px;">Tiempo por actividad específica</h2>
        <canvas id="activityChartCanvas" width="480" height="240" style="width: 100%; height: auto;"></canvas>
      </div>
      <div class="card">
        <h2 class="brand" style="margin-bottom: 10px;">Gestionar Actividades</h2>
        <div class="row" style="margin-bottom: 10px;">
          <input id="newActName" type="text" placeholder="Nueva actividad..." />
          <select id="newActColor" style="width: 130px;"></select>
          <button id="addActBtn" class="btn-primary">Añadir</button>
        </div>
        <div id="activitiesList"></div>
      </div>
    </div>

    <div class="card">
      <h2 class="brand" style="margin-bottom: 10px;">Registrar o editar tarea</h2>
      <div class="row" style="flex-wrap: wrap;">
        <input id="dTitle" type="text" placeholder="Título de la tarea..." style="flex: 2; min-width: 200px;" />
        <select id="dAct" style="flex: 1; min-width: 150px;"></select>
        <select id="dStatus" style="width: 130px;">
          <option value="pending">Pendiente</option>
          <option value="completed">Completada</option>
        </select>
        <input id="dMins" type="number" min="0" value="30" style="width: 90px;" />
        <input id="dAlertAt" type="datetime-local" style="width: 190px;" />
        <button id="dAddBtn" class="btn-primary">Guardar tarea</button>
      </div>
    </div>

    <div class="card">
      <h2 class="brand" style="margin-bottom: 10px;">Listado de Tareas</h2>
      <div id="dashTaskList"></div>
    </div>

    <div class="cta-footer">
      <h3 style="margin: 0 0 6px; font-size: 16px;">¿Necesitas una extensión Chrome, página web, creación de contenido o capacitación?</h3>
      <p style="margin: 0 0 10px; font-size: 13px; color: #cbd5e1;">
        Desarrollo de componentes a medida, sitios web, creación de contenido y capacitación en Inteligencia Artificial, Tecnología y Negocios.
      </p>
      <a href="mailto:urielcsof@gmail.com">Contactar a urielcsof@gmail.com</a>
    </div>

    <script src="shared.js"></script>
    <script src="pdf-builder.js"></script>
    <script src="dashboard.js"></script>
  </body>
</html>
`;

const DASHBOARD_JS = `/* Pulso Productivo - Dashboard Script */
document.addEventListener('DOMContentLoaded', async () => {
  const { loadStore, saveStore, createId, formatMinutes, COLOR_PALETTE, COMPLETION_QUOTES, pickQuote } = window.PulsoShared;
  let store = await loadStore();
  let lastQuote = '';

  const dashGreeting = document.getElementById('dashGreeting');
  const dashNameInput = document.getElementById('dashNameInput');
  const dashSaveNameBtn = document.getElementById('dashSaveNameBtn');
  const dashClearAllBtn = document.getElementById('dashClearAllBtn');
  const dashExportPdfBtn = document.getElementById('dashExportPdfBtn');
  const dashQuoteBanner = document.getElementById('dashQuoteBanner');
  const kpiTotal = document.getElementById('kpiTotal');
  const kpiDone = document.getElementById('kpiDone');
  const kpiPending = document.getElementById('kpiPending');
  const kpiTime = document.getElementById('kpiTime');
  const canvas = document.getElementById('activityChartCanvas');
  const newActName = document.getElementById('newActName');
  const newActColor = document.getElementById('newActColor');
  const addActBtn = document.getElementById('addActBtn');
  const activitiesList = document.getElementById('activitiesList');
  const dTitle = document.getElementById('dTitle');
  const dAct = document.getElementById('dAct');
  const dStatus = document.getElementById('dStatus');
  const dMins = document.getElementById('dMins');
  const dAlertAt = document.getElementById('dAlertAt');
  const dAddBtn = document.getElementById('dAddBtn');
  const dashTaskList = document.getElementById('dashTaskList');

  COLOR_PALETTE.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.hex;
    opt.textContent = c.label;
    newActColor.appendChild(opt);
  });

  function drawChart() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const stats = store.activities.map((a) => ({
      name: a.name,
      color: a.color,
      mins: store.tasks.filter((t) => t.activityId === a.id).reduce((s, t) => s + (Number(t.minutesSpent) || 0), 0)
    }));

    const maxMins = Math.max(10, ...stats.map((s) => s.mins));
    const barH = 22;
    const gap = 14;
    let y = 16;

    stats.forEach((s) => {
      if (y + barH > canvas.height) return;
      ctx.fillStyle = '#334155';
      ctx.font = '600 12px sans-serif';
      ctx.fillText(s.name.slice(0, 24), 4, y + 14);

      const trackX = 180;
      const trackW = 210;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(trackX, y + 3, trackW, 14);

      const fillW = s.mins > 0 ? Math.max(6, Math.round((trackW * s.mins) / maxMins)) : 0;
      ctx.fillStyle = s.color;
      ctx.fillRect(trackX, y + 3, fillW, 14);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px monospace';
      ctx.fillText(formatMinutes(s.mins), trackX + trackW + 10, y + 14);

      y += barH + gap;
    });
  }

  function render() {
    const name = (store.settings.userName || '').trim();
    dashNameInput.value = name;
    dashGreeting.textContent = (name ? 'Espacio de ' + name + ' · ' : '') + 'Todo guardado en almacenamiento local';

    const done = store.tasks.filter((t) => t.status === 'completed');
    const pending = store.tasks.filter((t) => t.status === 'pending');
    const totalMins = store.tasks.reduce((a, t) => a + (Number(t.minutesSpent) || 0), 0);

    kpiTotal.textContent = String(store.tasks.length);
    kpiDone.textContent = String(done.length);
    kpiPending.textContent = String(pending.length);
    kpiTime.textContent = formatMinutes(totalMins);

    dAct.innerHTML = '';
    store.activities.forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      dAct.appendChild(opt);
    });

    activitiesList.innerHTML = '';
    if (store.activities.length === 0) {
      const emptyAct = document.createElement('p');
      emptyAct.className = 'sub';
      emptyAct.textContent = 'Sin actividades todavía. Ingresa tu primera actividad arriba.';
      activitiesList.appendChild(emptyAct);
    }
    store.activities.forEach((act) => {
      const row = document.createElement('div');
      row.className = 'task-item';
      const label = document.createElement('span');
      label.textContent = act.name;
      label.style.fontSize = '13px';
      label.style.fontWeight = '600';

      const btns = document.createElement('div');
      btns.className = 'row';
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-secondary';
      editBtn.textContent = 'Renombrar';
      editBtn.addEventListener('click', async () => {
        const nextName = window.prompt('Nuevo nombre para la actividad:', act.name);
        if (nextName && nextName.trim()) {
          act.name = nextName.trim();
          await saveStore(store);
          render();
        }
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.textContent = 'Eliminar';
      delBtn.addEventListener('click', async () => {
        const remaining = store.activities.filter((a) => a.id !== act.id);
        const fallbackId = remaining[0] ? remaining[0].id : '';
        store.tasks.forEach((t) => {
          if (t.activityId === act.id) t.activityId = fallbackId;
        });
        store.activities = remaining;
        await saveStore(store);
        render();
      });

      btns.appendChild(editBtn);
      btns.appendChild(delBtn);
      row.appendChild(label);
      row.appendChild(btns);
      activitiesList.appendChild(row);
    });

    dashTaskList.innerHTML = '';
    const actMap = new Map(store.activities.map((a) => [a.id, a]));
    if (store.tasks.length === 0) {
      const p = document.createElement('p');
      p.className = 'sub';
      p.textContent = 'No hay tareas registradas todavía.';
      dashTaskList.appendChild(p);
    } else {
      store.tasks.forEach((task) => {
        const row = document.createElement('div');
        row.className = 'task-item';

        const left = document.createElement('div');
        const t = document.createElement('p');
        t.className = 'task-title' + (task.status === 'completed' ? ' done' : '');
        t.textContent = task.title;
        const m = document.createElement('div');
        m.className = 'meta';
        const act = actMap.get(task.activityId);
        m.textContent = (act ? act.name : 'General') + ' · ' + (task.status === 'completed' ? 'Completada' : 'Pendiente') + ' · ' + formatMinutes(task.minutesSpent);
        left.appendChild(t);
        left.appendChild(m);

        const right = document.createElement('div');
        right.className = 'row';
        const toggleBtn = document.createElement('button');
        toggleBtn.className = task.status === 'pending' ? 'btn-primary' : 'btn-secondary';
        toggleBtn.textContent = task.status === 'pending' ? 'Completar' : 'Reabrir';
        toggleBtn.addEventListener('click', async () => {
          const becomingDone = task.status === 'pending';
          task.status = becomingDone ? 'completed' : 'pending';
          task.completedAt = becomingDone ? new Date().toISOString() : null;
          await saveStore(store);
          if (becomingDone) {
            lastQuote = pickQuote(COMPLETION_QUOTES, lastQuote);
            dashQuoteBanner.textContent = '¡Excelente cierre! "' + lastQuote + '"';
            dashQuoteBanner.classList.remove('hidden');
          }
          render();
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-danger';
        delBtn.textContent = 'Eliminar';
        delBtn.addEventListener('click', async () => {
          store.tasks = store.tasks.filter((x) => x.id !== task.id);
          await saveStore(store);
          render();
        });

        right.appendChild(toggleBtn);
        right.appendChild(delBtn);
        row.appendChild(left);
        row.appendChild(right);
        dashTaskList.appendChild(row);
      });
    }

    drawChart();
  }

  dashSaveNameBtn.addEventListener('click', async () => {
    store.settings.userName = dashNameInput.value.trim();
    await saveStore(store);
    render();
  });

  dashClearAllBtn.addEventListener('click', async () => {
    store.activities = [];
    store.tasks = [];
    store.activeTimer = null;
    await saveStore(store);
    render();
    newActName.focus();
  });

  dashExportPdfBtn.addEventListener('click', () => {
    window.PulsoPdf.exportStoreToPdf(store);
  });

  addActBtn.addEventListener('click', async () => {
    const name = newActName.value.trim();
    if (!name) return;
    store.activities.push({
      id: createId('act'),
      name,
      color: newActColor.value,
      dailyGoalMinutes: 60,
      createdAt: new Date().toISOString()
    });
    newActName.value = '';
    await saveStore(store);
    render();
  });

  dAddBtn.addEventListener('click', async () => {
    const title = dTitle.value.trim();
    if (!title || store.activities.length === 0) return;
    const status = dStatus.value;
    const alertAt = status === 'pending' && dAlertAt.value ? new Date(dAlertAt.value).toISOString() : null;
    store.tasks.unshift({
      id: createId('tsk'),
      title,
      activityId: dAct.value || store.activities[0].id,
      status,
      minutesSpent: Math.max(0, Number(dMins.value) || 0),
      alertAt,
      alertTriggered: false,
      notes: '',
      createdAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : null
    });
    dTitle.value = '';
    await saveStore(store);
    render();
  });

  render();
});
`;

const CHROME_STORE_GUIDE_MD = `# Guía para subir "Pulso Productivo" a Google Chrome Web Store

## 1. Probar la extensión localmente en Chrome
1. Descomprime este archivo \`.zip\` en una carpeta de tu computadora.
2. Abre Google Chrome y entra a \`chrome://extensions/\`.
3. Activa el interruptor **Modo de desarrollador** (esquina superior derecha).
4. Haz clic en **Cargar descomprimida** y selecciona la carpeta extraída.
5. Fija el ícono de **Pulso Productivo** en tu barra de extensiones y pruébala.

## 2. Subir a Google Chrome Web Store
1. Entra a la consola de **Chrome Web Store Developer Dashboard**.
2. Sube directamente el archivo \`pulso-productivo-chrome-extension.zip\`.
3. En la ficha de la tienda:
   - **Categoría**: Productividad
   - **Idioma**: Español
4. En **Prácticas de privacidad**:
   - **Uso único**: Medición de productividad personal, gestión de tareas manuales, alertas locales y exportación de reportes PDF.
   - **Justificación de permisos**:
     - \`storage\`: Guardar tareas, actividades y nombre del usuario localmente en el dispositivo.
     - \`alarms\`: Programar recordatorios de tareas pendientes en segundo plano.
     - \`notifications\`: Mostrar la alerta visual cuando vence el recordatorio de una tarea.
   - **Recolección de datos**: Marca que **NO recopilas ni transmites datos del usuario**. Todo vive en el navegador del usuario.

## 3. Desarrollo a medida y capacitación
Si deseas personalizar esta extensión, desarrollar componentes web o recibir capacitación en IA, Tecnología y Negocios, escribe a: **urielcsof@gmail.com**
`;

const PRIVACY_POLICY_MD = `# Política de Privacidad — Pulso Productivo

**Última actualización:** 2026

Pulso Productivo funciona **100% de manera local** en el navegador del usuario.

- **Sin cuentas ni inicios de sesión**: No solicitamos correo, contraseña ni registro. Solo puedes ingresar opcionalmente tu nombre para personalizar tus saludos y reportes PDF.
- **Sin bases de datos externas ni servidores**: Toda la información (tareas pendientes, completadas, actividades, tiempos y alertas) se almacena exclusivamente en \`chrome.storage.local\` y \`localStorage\` dentro de tu propio navegador.
- **Cero recolección de datos**: No utilizamos cookies de seguimiento, analíticas de terceros ni telemetría.
- **Control total**: Puedes modificar o eliminar cualquier actividad, tarea o borrar todos tus datos en cualquier momento.

Contacto del desarrollador: urielcsof@gmail.com
`;

export async function buildChromeExtensionZip(): Promise<Blob> {
  const zip = new JSZip();

  zip.file('manifest.json', MANIFEST_JSON);
  zip.file('background.js', BACKGROUND_JS);
  zip.file('shared.js', SHARED_JS);
  zip.file('pdf-builder.js', PDF_BUILDER_JS);
  zip.file('styles.css', EXT_CSS);
  zip.file('popup.html', POPUP_HTML);
  zip.file('popup.js', POPUP_JS);
  zip.file('dashboard.html', DASHBOARD_HTML);
  zip.file('dashboard.js', DASHBOARD_JS);
  zip.file('CHROME_WEB_STORE_GUIDE.md', CHROME_STORE_GUIDE_MD);
  zip.file('PRIVACY_POLICY.md', PRIVACY_POLICY_MD);

  const sourceImg = await loadIconImage();
  const [icon16, icon48, icon128] = await Promise.all([
    generatePngIconBytes(16, sourceImg),
    generatePngIconBytes(48, sourceImg),
    generatePngIconBytes(128, sourceImg),
  ]);

  zip.file('icons/icon16.png', icon16);
  zip.file('icons/icon48.png', icon48);
  zip.file('icons/icon128.png', icon128);

  return zip.generateAsync({ type: 'blob' });
}

export const EXTENSION_MANIFEST_PREVIEW = MANIFEST_JSON;
