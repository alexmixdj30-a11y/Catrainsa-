import React, { useState } from 'react';
import { 
  Printer, 
  Share2, 
  MessageSquare, 
  Copy, 
  Check, 
  AlertOctagon, 
  CheckCircle2, 
  TrendingUp, 
  PiggyBank, 
  Briefcase, 
  CreditCard, 
  Wallet,
  Calendar,
  Building,
  User,
  Landmark,
  Coins
} from 'lucide-react';
import { InstitutionConfig, Member, ThemeConfig } from '../types';
import { formatCedula, formatCurrency } from '../utils/storage';

interface MemberStatementProps {
  member: Member;
  config: InstitutionConfig;
  theme: ThemeConfig;
  onPrint: () => void;
  onOpenShareStatement: () => void;
}

export const MemberStatement: React.FC<MemberStatementProps> = ({
  member,
  config,
  theme,
  onPrint,
  onOpenShareStatement,
}) => {
  const [copied, setCopied] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const isNoAvailability = member.saldoDisponible <= 0;
  const isNegative = member.saldoDisponible < 0;

  // Percentage of savings pledged
  const pledgedRatio = member.totalHaberes > 0 
    ? Math.min(100, Math.round((member.prestamoPendiente / member.totalHaberes) * 100))
    : member.prestamoPendiente > 0 ? 100 : 0;

  // Format message for WhatsApp
  const generateWhatsAppMessage = () => {
    const statusText = isNoAvailability 
      ? '❌ EL SOCIO NO TIENE DISPONIBILIDAD' 
      : '✅ DISPONIBILIDAD ACTIVA';

    const msg = `🏛️ *${config.nombre.toUpperCase()}*
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

_Información generada por el Sistema de Consulta de ${config.nombre}._`;

    return encodeURIComponent(msg);
  };

  const handleCopyText = async () => {
    const rawText = `${config.nombre} - ESTADO DE CUENTA
Socio: ${member.nombre} | C.I.: V-${formatCedula(member.cedula)}
Aporte Socio: ${formatCurrency(member.aporteSocio, config.monedaSimbolo)}
Aporte Patronal: ${formatCurrency(member.aportePatronal, config.monedaSimbolo)}
Total Haberes: ${formatCurrency(member.totalHaberes, config.monedaSimbolo)}
Préstamo Pendiente: ${formatCurrency(member.prestamoPendiente, config.monedaSimbolo)}
Saldo Disponible: ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}
Condición: ${isNoAvailability ? 'EL SOCIO NO TIENE DISPONIBILIDAD' : 'DISPONIBILIDAD ACTIVA'}`;

    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Error al copiar', e);
    }
  };

  const handleShareWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const cleanPhone = member.telefono ? member.telefono.replace(/\D/g, '') : '';
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 mt-5 pb-10 print:hidden">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden transition-all duration-300">
        
        {/* Header inside the Card: Compact Member Identification */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-black tracking-wider text-slate-800 bg-slate-200 px-2.5 py-0.5 rounded font-mono">
                C.I. V-{formatCedula(member.cedula)}
              </span>
              {member.departamento && (
                <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {member.departamento}
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {member.nombre}
            </h3>
          </div>

          <div className="text-xs text-slate-500 font-medium sm:text-right">
            <span>Fecha de emisión: {member.fechaActualizacion || new Date().toLocaleDateString('es-VE')}</span>
          </div>
        </div>

        {/* Financial Content - Compact, grouped and cohesive */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Unified Financial Summary Table (Data not spread out, close together) */}
          <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-700">
              <span>Concepto Contable</span>
              <span>Monto ({config.monedaSimbolo})</span>
            </div>

            <div className="divide-y divide-slate-100 text-sm">
              {/* 1. Aporte Socio */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-2.5">
                  <PiggyBank className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Aporte Socio</span>
                    <span className="hidden sm:inline text-xs text-slate-500 ml-2">(Ahorro retenido al trabajador)</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-900 text-base">
                  {formatCurrency(member.aporteSocio, config.monedaSimbolo)}
                </span>
              </div>

              {/* 2. Aporte Patronal */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Aporte Patronal</span>
                    <span className="hidden sm:inline text-xs text-slate-500 ml-2">(Aporte empresa/institución)</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-900 text-base">
                  {formatCurrency(member.aportePatronal, config.monedaSimbolo)}
                </span>
              </div>

              {/* 3. TOTAL HABERES (Highlighted) */}
              <div className="px-4 py-3.5 bg-blue-50/70 flex items-center justify-between border-y-2 border-blue-200">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-black text-blue-950 uppercase tracking-wide">Total Haberes</span>
                    <span className="hidden sm:inline text-xs text-blue-700 ml-2 font-medium">(Suma acumulada de aportes)</span>
                  </div>
                </div>
                <span className="font-mono font-black text-blue-900 text-lg sm:text-xl">
                  {formatCurrency(member.totalHaberes, config.monedaSimbolo)}
                </span>
              </div>

              {/* 4. Préstamo Pendiente */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Préstamo Pendiente</span>
                    <span className="hidden sm:inline text-xs text-amber-700 ml-2 font-medium">({pledgedRatio}% de haberes)</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-amber-900 text-base">
                  {formatCurrency(member.prestamoPendiente, config.monedaSimbolo)}
                </span>
              </div>

              {/* 5. SALDO DISPONIBLE (Big and final) */}
              <div className={`px-4 py-4 flex items-center justify-between border-t-2 ${
                isNoAvailability
                  ? 'bg-rose-100/80 border-rose-300 text-rose-950'
                  : 'bg-emerald-100/80 border-emerald-300 text-emerald-950'
              }`}>
                <div className="flex items-center gap-2.5">
                  <Wallet className={`w-5 h-5 ${isNoAvailability ? 'text-rose-700' : 'text-emerald-700'} shrink-0`} />
                  <div>
                    <span className="font-black text-base uppercase tracking-wide">Saldo Disponible</span>
                    <span className="block text-xs font-bold opacity-80">
                      {isNoAvailability ? 'SIN DISPONIBILIDAD' : 'Capacidad neta de retiro o préstamo'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-xl sm:text-2xl tracking-tight">
                    {formatCurrency(member.saldoDisponible, config.monedaSimbolo)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cuadro de Disponibilidad: Ubicado después de SALDO DISPONIBLE */}
          {isNoAvailability ? (
            <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 text-rose-950 flex items-center gap-3.5 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black uppercase tracking-wider text-rose-800">
                  Condición Financiera
                </div>
                <h4 className="text-base font-black text-rose-900 uppercase">
                  EL SOCIO NO TIENE DISPONIBILIDAD
                </h4>
                <p className="text-xs text-rose-800 font-medium">
                  {isNegative
                    ? `Presenta saldo negativo de ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}. El préstamo excede los haberes.`
                    : `Saldo disponible de ${formatCurrency(0, config.monedaSimbolo)}. Todo su haber se encuentra comprometido en préstamos.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-emerald-950 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">
                  Disponibilidad Aprobada
                </span>
                <h4 className="text-sm sm:text-base font-bold text-emerald-900">
                  El socio cuenta con disponibilidad para préstamos o retiros
                </h4>
              </div>
            </div>
          )}

          {/* Bottom Action Footer: Solo Compartir */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs print:hidden">
            <div className="text-center sm:text-left space-y-0.5">
              <span className="text-xs font-black text-blue-950 uppercase tracking-wide block">
                Acciones del Estado de Cuenta:
              </span>
              <p className="text-xs text-slate-600 font-medium">
                Enviar por WhatsApp, descargar en PDF directo a tu teléfono o copiar los datos.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenShareStatement}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-black shadow-lg shadow-blue-600/25 transition-all active:scale-95 cursor-pointer shrink-0"
              title="Compartir estado de cuenta (WhatsApp, Descargar PDF o Copiar)"
            >
              <Share2 className="w-5 h-5" />
              <span>Compartir</span>
            </button>
          </div>

          {/* Logo institucional (Luego del cuadro de acciones) */}
          <div className="pt-4 pb-2 flex flex-col items-center justify-center text-center">
            {config.logoUrl && !logoLoadError ? (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-white p-3 shadow-lg border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 transition-transform hover:scale-105">
                <img
                  src={config.logoUrl}
                  alt={`Logo de ${config.nombre}`}
                  className="w-full h-full object-contain"
                  onError={() => setLogoLoadError(true)}
                />
              </div>
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-white p-3.5 shadow-lg border-2 border-slate-200 flex flex-col items-center justify-center shrink-0 relative group transition-transform hover:scale-105">
                <div className="relative flex items-center justify-center w-full h-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                  <Landmark className={`w-16 h-16 sm:w-20 sm:h-20 ${theme.textClass} drop-shadow-xs`} />
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1.5 shadow-xs">
                    <Coins className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}
            <p className="mt-2.5 text-xs sm:text-sm font-bold text-slate-700 tracking-tight">
              {config.nombre}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
