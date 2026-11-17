import React, { useState } from 'react';
import { Check, Copy, Mail } from 'lucide-react';

export const HireCtaFooter: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const email = 'urielcsof@gmail.com';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  return (
    <footer className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 text-slate-100">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
        <div className="space-y-3 lg:col-span-7">
          <p className="text-xs font-medium text-blue-400">
            Servicios profesionales de tecnología y formación
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white text-balance">
            ¿Buscas desarrollar herramientas como esta para tu proyecto o equipo?
          </h2>
          <p className="text-sm leading-relaxed text-slate-300 max-w-2xl">
            Contrátame para el desarrollo de este tipo de extensiones y componentes interactivos, páginas web a medida, creación de contenido estratégico y capacitación práctica en Inteligencia Artificial, Tecnología y Negocios.
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-400">
            <span>Extensiones Chrome y Componentes Web</span>
            <span aria-hidden="true">·</span>
            <span>Páginas Web</span>
            <span aria-hidden="true">·</span>
            <span>Creación de Contenido</span>
            <span aria-hidden="true">·</span>
            <span>Capacitación en IA, Tecnología y Negocios</span>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <a
            href={`mailto:${email}?subject=Contacto%20de%20servicios%20-%20Desarrollo%20y%20Capacitaci%C3%B3n`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Escribir a {email}
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                Correo copiado al portapapeles
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copiar correo: {email}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400">
        <span>Pulso Productivo · 100% almacenamiento local en tu navegador</span>
        <span className="font-mono">{email}</span>
      </div>
    </footer>
  );
};
