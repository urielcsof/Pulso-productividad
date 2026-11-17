import React, { useState } from 'react';
import {
  buildChromeExtensionZip,
  EXTENSION_MANIFEST_PREVIEW,
} from '../utils/extensionZipBuilder';
import { Check, Download, FileCode2, ShieldCheck } from 'lucide-react';

export const ChromeStoreExport: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      const blob = await buildChromeExtensionZip();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'pulso-productivo-chrome-extension.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 4000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section aria-label="Publicar en Google Chrome Web Store" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-4 max-w-2xl">
          <img
            src="/assets/aistudio/Dise_o_sin_t_tulo__2__68040bab.png"
            alt="Ícono oficial de la extensión Pulso Productivo"
            className="h-14 w-14 rounded-xl object-cover shrink-0 border border-slate-200"
          />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Paquete listo para Google Chrome Web Store (Manifest V3)
            </h2>
            <p className="text-sm text-slate-600">
              Descarga el archivo <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">.zip</code> completo con tu ícono en PNG (16, 48 y 128 px), inicio en día cero sin datos de ejemplo, Service Worker de alertas y generador PDF sin dependencias externas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          {downloaded ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Paquete .zip descargado
            </>
          ) : (
            <>
              <Download className="h-4 w-4" aria-hidden="true" />
              {downloading
                ? 'Generando paquete...'
                : 'Descargar Extensión (.zip)'}
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Steps & Privacy */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Pasos para probar y subir a la Chrome Web Store
            </h3>
            <ol className="space-y-3 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-900">
                  01. Prueba local en Chrome:
                </span>{' '}
                Descomprime el <code className="font-mono text-xs">.zip</code>, entra a{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  chrome://extensions
                </code>
                , activa <strong>Modo de desarrollador</strong> y haz clic en{' '}
                <strong>Cargar descomprimida</strong>.
              </li>
              <li>
                <span className="font-semibold text-slate-900">
                  02. Subida a Developer Dashboard:
                </span>{' '}
                Sube directamente el mismo archivo{' '}
                <code className="font-mono text-xs">pulso-productivo-chrome-extension.zip</code>{' '}
                en la consola de Google Chrome Web Store.
              </li>
              <li>
                <span className="font-semibold text-slate-900">
                  03. Declaración de Privacidad:
                </span>{' '}
                Indica que la extensión <strong>NO recopila ni transmite datos</strong> del usuario. Se adjunta el archivo{' '}
                <code className="font-mono text-xs">PRIVACY_POLICY.md</code> dentro del paquete.
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900">
                Justificación de permisos mínimos (aprobación rápida)
              </h3>
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex items-start justify-between gap-4">
                <code className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  storage
                </code>
                <span className="text-slate-600 text-right">
                  Guarda tareas, actividades y nombre solo en el dispositivo del usuario.
                </span>
              </div>
              <div className="py-2.5 flex items-start justify-between gap-4">
                <code className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  alarms
                </code>
                <span className="text-slate-600 text-right">
                  Programa alertas por tarea en segundo plano sin consumir recursos.
                </span>
              </div>
              <div className="py-2.5 flex items-start justify-between gap-4">
                <code className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  notifications
                </code>
                <span className="text-slate-600 text-right">
                  Muestra el recordatorio nativo en Chrome cuando llega la hora de una tarea.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Manifest Preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900">
                manifest.json (Manifest V3)
              </h3>
            </div>
            <span className="font-mono text-xs text-slate-500">v1.0.0</span>
          </div>
          <pre className="flex-1 overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
            <code>{EXTENSION_MANIFEST_PREVIEW}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
