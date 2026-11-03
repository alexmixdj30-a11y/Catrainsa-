import React from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Landmark, 
  FileCheck,
  AlertOctagon,
  CheckCircle2
} from 'lucide-react';
import { InstitutionConfig, Member, ThemeConfig } from '../types';
import { formatCedula, formatCurrency } from '../utils/storage';

interface PrintCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  config: InstitutionConfig;
  theme: ThemeConfig;
}

export const PrintCertificateModal: React.FC<PrintCertificateModalProps> = ({
  isOpen,
  onClose,
  member,
  config,
  theme,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const isNoAvailability = member.saldoDisponible <= 0;
  const isNegative = member.saldoDisponible < 0;
  const printDate = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const printTime = new Date().toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Native Print
  const handleDirectPrint = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error('Error al imprimir', err);
      handleDownloadHtmlReport();
    }
  };

  // Generate downloadable self-printing standalone HTML file (bypasses any iframe sandbox limits!)
  const handleDownloadHtmlReport = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Estado de Cuenta - ${member.nombre} - ${config.nombre}</title>
  <style>
    @page { size: letter portrait; margin: 1.2cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111; margin: 0; padding: 20px; }
    .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo-box { display: flex; align-items: center; gap: 15px; }
    .logo-img { max-width: 90px; max-height: 90px; object-fit: contain; }
    .inst-title { font-size: 20px; font-weight: 900; margin: 0 0 4px 0; text-transform: uppercase; }
    .inst-info { font-size: 11px; color: #444; margin: 2px 0; }
    .doc-meta { text-align: right; border: 1px solid #000; padding: 8px 12px; border-radius: 4px; font-size: 11px; }
    .title-banner { text-align: center; margin: 25px 0 15px 0; }
    .title-banner h2 { font-size: 16px; font-weight: 900; margin: 0; text-decoration: underline; text-transform: uppercase; }
    .socio-card { border: 1px solid #000; padding: 12px; border-radius: 4px; margin-bottom: 15px; background: #fafafa; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
    .status-alert { padding: 10px 14px; border-radius: 4px; margin-bottom: 20px; font-weight: bold; font-size: 12px; }
    .no-disp { background: #ffebee; border: 2px solid #c62828; color: #b71c1c; }
    .with-disp { background: #e8f5e9; border: 2px solid #2e7d32; color: #1b5e20; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
    th, td { border: 1px solid #000; padding: 8px 10px; }
    th { background: #eee; font-weight: 800; text-transform: uppercase; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; font-size: 13px; }
    .total-row { background: #f0f0f0; font-weight: 900; }
    .balance-row { font-weight: 900; font-size: 14px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; text-align: center; font-size: 11px; }
    .sig-line { border-top: 1px solid #000; padding-top: 6px; margin: 0 20px; }
    .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 10px; color: #777; text-align: center; }
    .print-btn-bar { background: #2563eb; color: #fff; padding: 12px; text-align: center; margin-bottom: 20px; border-radius: 8px; }
    .btn { background: #fff; color: #2563eb; font-weight: bold; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    @media print { .print-btn-bar { display: none; } }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button class="btn" onclick="window.print()">🖨️ Haz clic aquí para Imprimir o Guardar en PDF</button>
  </div>

  <div class="header">
    <div class="logo-box">
      ${config.logoUrl ? `<img src="${config.logoUrl}" class="logo-img" alt="Logo">` : ''}
      <div>
        <h1 class="inst-title">${config.nombre}</h1>
        <p class="inst-info"><strong>RIF:</strong> ${config.rif} | <strong>Sector:</strong> ${config.sector}</p>
        <p class="inst-info"><strong>Dirección:</strong> ${config.direccion}</p>
        <p class="inst-info"><strong>Teléfono:</strong> ${config.telefonoWhatsapp} | <strong>Email:</strong> ${config.correo}</p>
      </div>
    </div>
    <div class="doc-meta">
      <strong>ESTADO DE CUENTA</strong><br>
      Fecha: ${printDate}<br>
      Hora: ${printTime}
    </div>
  </div>

  <div class="title-banner">
    <h2>ESTADO DE CUENTA Y DISPONIBILIDAD DE HABERES</h2>
  </div>

  <div class="socio-card">
    <div class="grid">
      <div><strong>Socio:</strong> ${member.nombre}</div>
      <div><strong>Cédula:</strong> V-${formatCedula(member.cedula)}</div>
      ${member.departamento ? `<div><strong>Departamento:</strong> ${member.departamento}</div>` : ''}
      ${member.telefono ? `<div><strong>Teléfono:</strong> ${member.telefono}</div>` : ''}
    </div>
  </div>

  <div class="status-alert ${isNoAvailability ? 'no-disp' : 'with-disp'}">
    ${isNoAvailability ? 'ADVERTENCIA: EL SOCIO NO TIENE DISPONIBILIDAD' : 'CONDICIÓN: DISPONIBILIDAD ACTIVA'} - 
    ${isNoAvailability 
      ? (isNegative ? `Saldo negativo de ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}. El préstamo excede los haberes.` : `Saldo disponible de ${formatCurrency(0, config.monedaSimbolo)}. Todo su haber se encuentra comprometido en préstamos.`)
      : `El socio cuenta con un saldo neto disponible de ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}.`}
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto Contable</th>
        <th>Descripción</th>
        <th class="text-right">Monto (${config.monedaSimbolo})</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Aporte Socio</td>
        <td>Ahorro voluntario y obligatorio retenido al socio</td>
        <td class="text-right font-mono">${formatCurrency(member.aporteSocio, '')}</td>
      </tr>
      <tr>
        <td>2. Aporte Patronal</td>
        <td>Aporte institucional de la empresa</td>
        <td class="text-right font-mono">${formatCurrency(member.aportePatronal, '')}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL HABERES</td>
        <td>Suma acumulada de aportes en la Caja de Ahorro</td>
        <td class="text-right font-mono">${formatCurrency(member.totalHaberes, '')}</td>
      </tr>
      <tr>
        <td>3. Préstamo Pendiente</td>
        <td>Compromisos crediticios vigentes por amortizar</td>
        <td class="text-right font-mono">${formatCurrency(member.prestamoPendiente, '')}</td>
      </tr>
      <tr class="balance-row ${isNoAvailability ? 'no-disp' : 'with-disp'}">
        <td>SALDO DISPONIBLE</td>
        <td>${isNoAvailability ? 'SIN DISPONIBILIDAD' : 'Capacidad neta de retiro o préstamo'}</td>
        <td class="text-right font-mono">${formatCurrency(member.saldoDisponible, '')}</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div>
      <div class="sig-line">
        ${config.firmasUrl ? `<div style="height: 50px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 2px;"><img src="${config.firmasUrl}" style="max-height: 50px; max-width: 170px; object-fit: contain;" alt="Firmas"></div>` : ''}
        <strong>${config.nombre}</strong><br>
        Consejo de Administración / Presidencia<br>
        Firma y Sello Oficial Autorizado
      </div>
    </div>
    <div>
      <div class="sig-line">
        <strong>${member.nombre}</strong><br>
        C.I. V-${formatCedula(member.cedula)}<br>
        Firma de Conformidad del Socio
      </div>
    </div>
  </div>

  <div class="footer">
    Documento oficial generado por el Sistema de Buscador de Estado de Cuenta de ${config.nombre}.<br>
    Validez sujeta a los registros de la institución.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Estado_Cuenta_${member.cedula}_${member.nombre.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Certificación y Estado de Cuenta (PDF / Impresión)</h3>
              <p className="text-xs text-slate-400">Socio: {member.nombre} (C.I. V-{formatCedula(member.cedula)})</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar inside Modal */}
        <div className="p-4 bg-blue-50 border-b border-blue-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-blue-900 font-medium">
            💡 Puedes mandar a imprimir directamente o descargar el comprobante para abrirlo en cualquier navegador.
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Direct Print */}
            <button
              type="button"
              onClick={handleDirectPrint}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer ${theme.primaryClass}`}
            >
              <Printer className="w-4 h-4" />
              <span>Abrir Impresora / Guardar PDF</span>
            </button>

            {/* Download HTML Print File */}
            <button
              type="button"
              onClick={handleDownloadHtmlReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Descargar archivo listo para imprimir sin restricciones de navegador"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Descargar Archivo para Imprimir</span>
            </button>
          </div>
        </div>

        {/* Certificate Preview Card */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4 text-slate-900 bg-white">
          <div className="border-2 border-slate-300 rounded-2xl p-6 bg-slate-50/50 space-y-4 text-xs">
            
            {/* Letterhead */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
              <div className="flex items-center gap-3">
                {config.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt="Logo"
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="w-14 h-14 border border-slate-400 rounded-lg flex items-center justify-center bg-white">
                    <Landmark className="w-8 h-8 text-slate-800" />
                  </div>
                )}
                <div>
                  <h4 className="text-base font-black uppercase text-slate-900">{config.nombre}</h4>
                  <p className="text-[11px] text-slate-600 font-semibold">RIF: {config.rif} | Sector: {config.sector}</p>
                  <p className="text-[11px] text-slate-500">{config.direccion}</p>
                  <p className="text-[11px] text-slate-500">Tlf: {config.telefonoWhatsapp} | Email: {config.correo}</p>
                </div>
              </div>

              <div className="text-right border border-slate-400 p-2 rounded bg-white text-[10px]">
                <strong className="block font-bold">ESTADO DE CUENTA</strong>
                <span>Fecha: {printDate}</span><br />
                <span>Hora: {printTime}</span>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-1">
              <h5 className="text-sm font-black uppercase underline tracking-wider">
                ESTADO DE CUENTA Y DISPONIBILIDAD DE HABERES
              </h5>
            </div>

            {/* Member Info */}
            <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200">
              <div><strong>Socio:</strong> {member.nombre}</div>
              <div><strong>Cédula:</strong> V-{formatCedula(member.cedula)}</div>
              {member.departamento && <div><strong>Departamento:</strong> {member.departamento}</div>}
              {member.telefono && <div><strong>Teléfono:</strong> {member.telefono}</div>}
            </div>

            {/* Availability Alert */}
            <div className={`p-3 rounded-xl font-bold ${
              isNoAvailability ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
            }`}>
              {isNoAvailability ? 'ADVERTENCIA: EL SOCIO NO TIENE DISPONIBILIDAD' : 'CONDICIÓN: DISPONIBILIDAD ACTIVA'}
              <p className="text-[11px] font-normal mt-0.5">
                {isNoAvailability 
                  ? (isNegative ? `Saldo negativo de ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}. El préstamo pendiente excede sus haberes acumulados.` : `Saldo disponible de ${formatCurrency(0, config.monedaSimbolo)}. Todo su haber se encuentra comprometido en obligaciones crediticias.`)
                  : `El socio cuenta con un saldo neto disponible de ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}.`}
              </p>
            </div>

            {/* Financial Ledger Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300">Concepto</th>
                    <th className="p-2 border-r border-slate-300">Detalle</th>
                    <th className="p-2 text-right">Monto ({config.monedaSimbolo})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 font-bold border-r border-slate-300">1. Aporte Socio</td>
                    <td className="p-2 text-slate-600 border-r border-slate-300">Ahorro voluntario y obligatorio</td>
                    <td className="p-2 text-right font-mono font-bold">{formatCurrency(member.aporteSocio, '')}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold border-r border-slate-300">2. Aporte Patronal</td>
                    <td className="p-2 text-slate-600 border-r border-slate-300">Aporte legal institucional</td>
                    <td className="p-2 text-right font-mono font-bold">{formatCurrency(member.aportePatronal, '')}</td>
                  </tr>
                  <tr className="bg-blue-50/50 font-bold">
                    <td className="p-2 border-r border-slate-300 text-blue-950">TOTAL HABERES</td>
                    <td className="p-2 text-blue-800 border-r border-slate-300">Total acumulado en la institución</td>
                    <td className="p-2 text-right font-mono font-black text-blue-900">{formatCurrency(member.totalHaberes, '')}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold border-r border-slate-300 text-amber-900">3. Préstamo Pendiente</td>
                    <td className="p-2 text-slate-600 border-r border-slate-300">Deuda por amortizar</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-900">{formatCurrency(member.prestamoPendiente, '')}</td>
                  </tr>
                  <tr className={`font-black ${isNoAvailability ? 'bg-rose-100 text-rose-950' : 'bg-emerald-100 text-emerald-950'}`}>
                    <td className="p-2.5 border-r border-slate-300">SALDO DISPONIBLE</td>
                    <td className="p-2.5 border-r border-slate-300 text-[11px]">{isNoAvailability ? 'SIN DISPONIBILIDAD' : 'Disponibilidad Aprobada'}</td>
                    <td className="p-2.5 text-right font-mono text-sm">{formatCurrency(member.saldoDisponible, '')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-[10px]">
              <div>
                {config.firmasUrl && (
                  <div className="h-12 flex items-end justify-center mb-1">
                    <img
                      src={config.firmasUrl}
                      alt="Firmas y Sello"
                      className="max-h-12 max-w-[150px] object-contain"
                    />
                  </div>
                )}
                <div className="border-t border-slate-900 pt-1 mx-4">
                  <strong>{config.nombre}</strong><br />
                  Firma y Sello Oficial Autorizado
                </div>
              </div>
              <div>
                <div className="border-t border-slate-900 pt-1 mx-4">
                  <strong>{member.nombre}</strong><br />
                  C.I. V-{formatCedula(member.cedula)}<br />
                  Firma del Socio
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleDirectPrint}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${theme.primaryClass}`}
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Certificado</span>
          </button>
        </div>

      </div>
    </div>
  );
};
