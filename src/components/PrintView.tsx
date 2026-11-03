import React from 'react';
import { InstitutionConfig, Member } from '../types';
import { formatCedula, formatCurrency } from '../utils/storage';
import { Landmark } from 'lucide-react';

interface PrintViewProps {
  member: Member;
  config: InstitutionConfig;
}

export const PrintView: React.FC<PrintViewProps> = ({ member, config }) => {
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

  return (
    <div className="hidden print:block text-black bg-white p-8 max-w-4xl mx-auto font-sans">
      {/* Official Letterhead Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          {config.logoUrl ? (
            <img
              src={config.logoUrl}
              alt="Logo"
              className="w-28 h-28 object-contain shrink-0"
            />
          ) : (
            <div className="w-24 h-24 border-2 border-black flex items-center justify-center shrink-0">
              <Landmark className="w-14 h-14 text-black" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-black">
              {config.nombre}
            </h1>
            <p className="text-xs font-bold text-gray-700">RIF: {config.rif} | Sector: {config.sector}</p>
            <p className="text-[11px] text-gray-600 max-w-md">{config.direccion}</p>
            <p className="text-[11px] text-gray-600">
              Tel/WhatsApp: {config.telefonoWhatsapp} | Email: {config.correo}
            </p>
          </div>
        </div>

        <div className="text-right border border-black p-2 rounded text-xs">
          <p className="font-bold uppercase tracking-wider">Estado de Cuenta</p>
          <p className="text-[10px] text-gray-600 mt-1">Fecha: {printDate}</p>
          <p className="text-[10px] text-gray-600">Hora: {printTime}</p>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center my-6">
        <h2 className="text-lg font-black tracking-wider uppercase underline underline-offset-4">
          ESTADO DE CUENTA Y DISPONIBILIDAD DE HABERES
        </h2>
        <p className="text-xs text-gray-600 mt-1">
          Certificación oficial de aportes, haberes acumulados y préstamos vigentes
        </p>
      </div>

      {/* Member Identification Box */}
      <div className="border border-black rounded p-4 mb-6 bg-gray-50/50">
        <h3 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          Datos de Identificación del Socio
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="font-bold">Nombre y Apellido:</span>{' '}
            <span className="uppercase font-semibold">{member.nombre}</span>
          </div>
          <div>
            <span className="font-bold">Cédula de Identidad:</span>{' '}
            <span className="font-mono font-bold">V-{formatCedula(member.cedula)}</span>
          </div>
          {member.departamento && (
            <div>
              <span className="font-bold">Departamento / Dependencia:</span>{' '}
              <span>{member.departamento}</span>
            </div>
          )}
          {member.telefono && (
            <div>
              <span className="font-bold">Teléfono de Contacto:</span>{' '}
              <span>{member.telefono}</span>
            </div>
          )}
        </div>
      </div>

      {/* Availability Notice for the Member */}
      <div className={`p-4 border-2 rounded mb-6 ${
        isNoAvailability 
          ? 'border-red-600 bg-red-50 text-red-900' 
          : 'border-emerald-600 bg-emerald-50 text-emerald-950'
      }`}>
        <h4 className="text-sm font-black uppercase tracking-wide">
          {isNoAvailability ? 'ADVERTENCIA: EL SOCIO NO TIENE DISPONIBILIDAD' : 'CONDICIÓN: DISPONIBILIDAD ACTIVA'}
        </h4>
        <p className="text-xs mt-1 font-medium">
          {isNoAvailability
            ? isNegative
              ? `El socio presenta un saldo disponible negativo de ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}. El préstamo pendiente excede sus haberes acumulados.`
              : `El socio presenta saldo disponible de ${formatCurrency(0, config.monedaSimbolo)}. Todo su haber se encuentra comprometido en obligaciones crediticias.`
            : `El socio cuenta con un saldo disponible neto de ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)} disponible para solicitudes de retiro o financiamiento conforme a la normativa vigente.`}
        </p>
      </div>

      {/* Financial Table */}
      <table className="w-full text-xs border border-black mb-8 border-collapse">
        <thead>
          <tr className="bg-gray-200 border-b border-black">
            <th className="py-2 px-3 text-left border-r border-black font-black uppercase">Concepto Financiero</th>
            <th className="py-2 px-3 text-left border-r border-black font-bold uppercase">Descripción</th>
            <th className="py-2 px-3 text-right font-black uppercase">Monto ({config.monedaSimbolo})</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          <tr>
            <td className="py-2 px-3 font-bold border-r border-black">1. Aporte Socio</td>
            <td className="py-2 px-3 text-gray-700 border-r border-black">Ahorro voluntario y obligatorio retenido al socio</td>
            <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(member.aporteSocio, '')}</td>
          </tr>
          <tr>
            <td className="py-2 px-3 font-bold border-r border-black">2. Aporte Patronal</td>
            <td className="py-2 px-3 text-gray-700 border-r border-black">Aporte legal institucional / empresa</td>
            <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(member.aportePatronal, '')}</td>
          </tr>
          <tr className="bg-gray-100 font-bold">
            <td className="py-2 px-3 border-r border-black">TOTAL HABERES</td>
            <td className="py-2 px-3 text-gray-700 border-r border-black">Total acumulado en la Caja de Ahorro</td>
            <td className="py-2 px-3 text-right font-mono text-sm font-black">{formatCurrency(member.totalHaberes, '')}</td>
          </tr>
          <tr>
            <td className="py-2 px-3 font-bold border-r border-black text-amber-900">3. Préstamo Pendiente</td>
            <td className="py-2 px-3 text-gray-700 border-r border-black">Compromisos crediticios y deudas por amortizar</td>
            <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">{formatCurrency(member.prestamoPendiente, '')}</td>
          </tr>
          <tr className={`border-t-2 border-black font-black text-sm ${
            isNoAvailability ? 'bg-red-100 text-red-950' : 'bg-emerald-100 text-emerald-950'
          }`}>
            <td className="py-3 px-3 border-r border-black">SALDO DISPONIBLE</td>
            <td className="py-3 px-3 border-r border-black text-xs">
              {isNoAvailability ? 'NO TIENE DISPONIBILIDAD' : 'Monto neto disponible'}
            </td>
            <td className="py-3 px-3 text-right font-mono text-base">{formatCurrency(member.saldoDisponible, '')}</td>
          </tr>
        </tbody>
      </table>

      {/* Signature & Seal Section */}
      <div className="grid grid-cols-2 gap-12 pt-8 mt-8 text-center text-xs">
        <div>
          {config.firmasUrl && (
            <div className="h-16 flex items-end justify-center mb-1">
              <img
                src={config.firmasUrl}
                alt="Firmas y Sello Oficial"
                className="max-h-16 max-w-[200px] object-contain"
              />
            </div>
          )}
          <div className="border-t border-black pt-2 mx-8">
            <p className="font-bold uppercase tracking-wider">{config.nombre}</p>
            <p className="text-[11px] text-gray-600">Presidencia / Consejo de Administración</p>
            <p className="text-[10px] text-gray-500">Sello y Firma Autorizada</p>
          </div>
        </div>

        <div>
          <div className="border-t border-black pt-2 mx-8">
            <p className="font-bold uppercase tracking-wider">{member.nombre}</p>
            <p className="text-[11px] text-gray-600 font-mono">C.I. V-{formatCedula(member.cedula)}</p>
            <p className="text-[10px] text-gray-500">Firma de Conformidad del Socio</p>
          </div>
        </div>
      </div>

      {/* Footer Legal Note */}
      <div className="mt-12 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-500">
        <p>
          Documento emitido electrónicamente por el Sistema de Buscador de Estado de Cuenta de {config.nombre}.
        </p>
        <p>
          Validez sujeta a los registros contables y estatutos internos de la Caja de Ahorro.
        </p>
      </div>
    </div>
  );
};
