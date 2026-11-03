import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Download, 
  FileDown,
  Printer
} from 'lucide-react';
import { InstitutionConfig, Member, ThemeConfig } from '../types';
import { formatCedula, formatCurrency } from '../utils/storage';
import { downloadMemberStatementPdf } from '../utils/pdfGenerator';

interface ShareStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  config: InstitutionConfig;
  theme: ThemeConfig;
  onPrint?: () => void;
}

export const ShareStatementModal: React.FC<ShareStatementModalProps> = ({
  isOpen,
  onClose,
  member,
  config,
  theme,
  onPrint,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const isNoAvailability = member.saldoDisponible <= 0;
  const statusText = isNoAvailability 
    ? '❌ EL SOCIO NO TIENE DISPONIBILIDAD' 
    : '✅ DISPONIBILIDAD ACTIVA';

  const fullText = `🏛️ *${config.nombre.toUpperCase()}*
📄 *ESTADO DE CUENTA DE SOCIO*
━━━━━━━━━━━━━━━━━━━━━
👤 *Nombre:* ${member.nombre}
🆔 *C.I.:* V-${formatCedula(member.cedula)}
📅 *Fecha:* ${member.fechaActualizacion || new Date().toLocaleDateString('es-VE')}

💰 *RESUMEN DE HABERES Y CRÉDITOS:*
• Aporte Socio: ${formatCurrency(member.aporteSocio, config.monedaSimbolo)}
• Aporte Patronal: ${formatCurrency(member.aportePatronal, config.monedaSimbolo)}
━━━━━━━━━━━━━━━━━━━━━
📈 *TOTAL HABERES:* ${formatCurrency(member.totalHaberes, config.monedaSimbolo)}
📉 *Préstamo Pendiente:* ${formatCurrency(member.prestamoPendiente, config.monedaSimbolo)}
━━━━━━━━━━━━━━━━━━━━━
💵 *SALDO DISPONIBLE:* ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}

🚨 *CONDICIÓN:* ${statusText}

_Generado por el Sistema de Consulta de ${config.nombre}._`;

  // 1) Enviar por WhatsApp
  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(fullText);
    const cleanPhone = member.telefono ? member.telefono.replace(/\D/g, '') : '';
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // 2) Descargar PDF Directo al teléfono / computadora
  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await downloadMemberStatementPdf(member, config);
      setTimeout(() => setDownloading(false), 2000);
    } catch (err) {
      console.error('Error generando PDF directo:', err);
      setDownloading(false);
      // Fallback a impresión si ocurriese algún error
      if (onPrint) {
        onPrint();
      }
    }
  };

  // 3) Copiar
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Error al copiar', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                Compartir Estado de Cuenta
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[240px] sm:max-w-xs">
                {member.nombre} | V-{formatCedula(member.cedula)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Tarjeta Resumen del Socio */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-black text-slate-900 border-b border-slate-200 pb-2 text-sm">
              <span className="truncate pr-2">{member.nombre}</span>
              <span className="font-mono text-blue-700 shrink-0">V-{formatCedula(member.cedula)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
              <div>Total Haberes: <strong className="text-blue-900 block font-mono font-bold text-xs sm:text-sm">{formatCurrency(member.totalHaberes, config.monedaSimbolo)}</strong></div>
              <div>Préstamo: <strong className="text-amber-900 block font-mono font-bold text-xs sm:text-sm">{formatCurrency(member.prestamoPendiente, config.monedaSimbolo)}</strong></div>
            </div>
            <div className={`p-2.5 rounded-xl font-black text-center text-xs ${
              isNoAvailability ? 'bg-rose-100 text-rose-900 border border-rose-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
            }`}>
              Saldo Disponible: {formatCurrency(member.saldoDisponible, config.monedaSimbolo)} ({isNoAvailability ? 'SIN DISPONIBILIDAD' : 'DISPONIBILIDAD ACTIVA'})
            </div>
          </div>

          {/* Selector de 3 Opciones Claramente Numeradas */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Seleccione cómo desea enviar o guardar el estado:
            </p>

            {/* OPCIÓN 1: Enviar por WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white flex items-center justify-between shadow-md hover:shadow-lg transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-black leading-tight">
                    1) Enviar por WhatsApp
                  </div>
                  <div className="text-xs text-emerald-100 font-medium">
                    Envío directo al chat con formato ordenado y emoticonos
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg shrink-0 ml-2">
                Abrir
              </span>
            </button>

            {/* OPCIÓN 2: Descargar PDF directo en el teléfono */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="w-full p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white flex items-center justify-between shadow-md hover:shadow-lg transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  {downloading ? (
                    <Check className="w-6 h-6 text-emerald-300 animate-bounce" />
                  ) : (
                    <FileDown className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <div className="text-sm sm:text-base font-black leading-tight">
                    2) Descargar PDF
                  </div>
                  <div className="text-xs text-blue-100 font-medium">
                    {downloading ? '¡Descargando archivo a tu teléfono...!' : 'Se descarga directo en las descargas de tu teléfono'}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg shrink-0 ml-2 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? 'Listo' : 'PDF'}</span>
              </span>
            </button>

            {/* OPCIÓN 3: Copiar */}
            <button
              type="button"
              onClick={handleCopy}
              className="w-full p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-800 border border-slate-300 flex items-center justify-between transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                  {copied ? (
                    <Check className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Copy className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="text-sm sm:text-base font-black leading-tight text-slate-900">
                    3) Copiar
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    {copied ? '¡Texto copiado al portapapeles con éxito!' : 'Copia el texto para pegarlo en cualquier chat o mensaje'}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ml-2 ${
                copied ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {copied ? '¡Copiado!' : 'Copiar'}
              </span>
            </button>
          </div>

          {/* Botón opcional de impresión tradicional */}
          {onPrint && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrint();
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline inline-flex items-center gap-1 cursor-pointer font-medium"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>¿Deseas imprimir la certificación oficial en papel? Clic aquí</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
