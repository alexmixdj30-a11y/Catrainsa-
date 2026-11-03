import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Smartphone, 
  QrCode, 
  ExternalLink,
  Download,
  MoreVertical,
  PlusSquare,
  ShieldCheck
} from 'lucide-react';
import { InstitutionConfig, ThemeConfig } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: InstitutionConfig;
  theme: ThemeConfig;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  config,
  theme,
}) => {
  const [copied, setCopied] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();
  if (!isOpen) return null;

  // URL pública oficial de la aplicación para compartir con cualquier socio o teléfono
  const SHARED_APP_URL = 'https://ais-pre-ipneky4lakp2lqf6qrpm67-477356531118.us-east5.run.app';

  const getShareableUrl = () => {
    try {
      const origin = window.location.origin;
      // Si estamos en el entorno de previsualización o desarrollo de la nube
      if (origin.includes('ais-pre-')) {
        return `${origin}${window.location.pathname}`;
      }
      if (origin.includes('ais-dev-')) {
        return origin.replace('ais-dev-', 'ais-pre-');
      }
      // En cualquier otro caso (como aistudio.google.com, localhost o iframes), usar la URL compartida oficial
      return SHARED_APP_URL;
    } catch (e) {
      return SHARED_APP_URL;
    }
  };

  const appUrl = getShareableUrl();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Error al copiar enlace', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Buscador de Estado de Cuenta - ${config.nombre}`,
          text: `Consulta tu estado de cuenta, haberes acumulados y préstamos en ${config.nombre}:`,
          url: appUrl,
        });
      } catch (err) {
        console.log('Compartir cancelado o no soportado');
      }
    } else {
      handleCopyLink();
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `🏛️ *${config.nombre}*\n📲 Accede al portal de consulta de estados de cuenta para verificar tus haberes, aportes y disponibilidad:\n👉 ${appUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Generate QR Code URL via reliable public API or SVG representation
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(appUrl)}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Compartir Aplicación</h3>
              <p className="text-xs text-slate-400">Permite a los socios acceder fácilmente desde cualquier teléfono o PC</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-center">
          
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-slate-200 inline-block">
              <img
                src={qrApiUrl}
                alt="Código QR de la aplicación"
                className="w-48 h-48 object-contain rounded-lg"
                loading="lazy"
              />
            </div>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              <span>Escanea con la cámara de tu móvil para abrir</span>
            </p>
          </div>

          {/* URL Box & Copy */}
          <div className="space-y-2 text-left">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Enlace directo de la aplicación
            </label>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="w-full bg-transparent text-xs sm:text-sm font-mono text-slate-700 px-2 outline-none select-all truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-1.5 text-left">
              <span>✨</span>
              <span><strong>Enlace público listo:</strong> Abre directamente en cualquier teléfono o PC sin pedir cuenta de Google ni mostrar pantallas de desarrollo.</span>
            </p>
          </div>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={shareViaWhatsApp}
              className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <button
                type="button"
                onClick={handleNativeShare}
                className={`inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer ${theme.primaryClass}`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Compartir en el Teléfono</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Enlace Completo</span>
              </button>
            )}
          </div>

          {/* Android Home Screen Installation Card */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Colocar Icono en el Escritorio (Android)
                  </h4>
                  <p className="text-[11px] text-slate-500">Accede como una aplicación normal desde tu pantalla de inicio</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                App Web Directa
              </span>
            </div>

            {/* In-app install button if supported */}
            {isInstallable && (
              <button
                type="button"
                onClick={install}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Icono en mi Android Ahora</span>
              </button>
            )}

            {isInstalled && (
              <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡La aplicación ya está instalada en tu pantalla principal!</span>
              </div>
            )}

            {/* Step by Step Guide for Android Chrome */}
            <div className="pt-1 space-y-2 border-t border-slate-200">
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Instrucciones manuales en Google Chrome:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 mb-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>Abre el enlace</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Abre la aplicación desde el navegador <strong>Google Chrome</strong> en tu móvil.
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 mb-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    <span>Menú de opciones</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug flex items-center gap-1">
                    <span>Toca los <strong>3 puntos</strong></span>
                    <MoreVertical className="w-3.5 h-3.5 text-slate-800 shrink-0 inline" />
                    <span>arriba a la derecha.</span>
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 mb-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    <span>Agregar icono</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Toca <strong>«Instalar aplicación»</strong> o <strong>«Agregar a la pantalla principal»</strong>.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
