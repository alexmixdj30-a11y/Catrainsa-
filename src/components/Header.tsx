import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Settings, 
  FileSpreadsheet, 
  Phone, 
  Mail, 
  MapPin, 
  Tag, 
  ShieldCheck, 
  Landmark,
  Coins
} from 'lucide-react';
import { InstitutionConfig, ThemeConfig } from '../types';

interface HeaderProps {
  config: InstitutionConfig;
  theme: ThemeConfig;
  totalMembers: number;
  onOpenConfig: () => void;
  onOpenExcelImport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  theme,
  totalMembers,
  onOpenConfig,
}) => {
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Reset logo error when URL changes
  useEffect(() => {
    setLogoLoadError(false);
  }, [config.logoUrl]);

  // Render logo (custom uploaded photo or institutional emblem)
  const renderLogo = () => {
    if (config.logoUrl && !logoLoadError) {
      return (
        <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-52 lg:h-52 rounded-3xl bg-white p-3 sm:p-4 shadow-2xl ring-4 ring-white/40 flex items-center justify-center overflow-hidden shrink-0 transition-transform hover:scale-105">
          <img
            src={config.logoUrl}
            alt={`Logo de ${config.nombre}`}
            className="w-full h-full object-contain"
            onError={() => {
              console.error('Error cargando imagen de logo');
              setLogoLoadError(true);
            }}
          />
        </div>
      );
    }

    // High impact prominent emblem
    return (
      <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-52 lg:h-52 rounded-3xl bg-white p-4 sm:p-5 shadow-2xl ring-4 ring-white/35 flex flex-col items-center justify-center shrink-0 text-slate-800 relative group transition-transform hover:scale-105">
        <div className="relative flex items-center justify-center w-full h-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
          <Landmark className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 ${theme.textClass} drop-shadow-sm`} />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-2 shadow-md">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>
    );
  };

  // WhatsApp clean link
  const cleanPhone = config.telefonoWhatsapp.replace(/\D/g, '');

  return (
    <header className={`${theme.headerBg} text-white shadow-2xl border-b border-white/10 relative overflow-hidden transition-colors duration-500 print:hidden`}>
      {/* Decorative background glows */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top action bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 pb-2 flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-white/20 text-white backdrop-blur-xs border border-white/20 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>PORTAL CREADO POR ANTONIO ROJAS &quot;Contador Público&quot; | Teléfono: 0412-4238613 | Correo: alexmixdj.30@gmail.com</span>
          </span>
          <span className="hidden lg:inline text-white/40">|</span>
          <span className="hidden lg:inline text-white/80 text-[11px]">
            Base de datos: <strong className="text-white font-semibold">{totalMembers}</strong> socios
          </span>
        </div>
      </div>

      {/* Main institution showcase: BIG LOGO & BIG NAME */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="flex flex-col md:flex-row items-center md:items-center gap-5 sm:gap-7">
          {/* 6) Logo grande que resalta */}
          <div className="flex flex-col items-center text-center shrink-0">
            {renderLogo()}
          </div>

          {/* 7) Nombre grande y datos compactos juntos */}
          <div className="flex-1 text-center md:text-left space-y-2">
            {/* INSTITUTION NAME (Tamaño estilizado y proporcionado) */}
            <div className="flex items-center justify-center md:justify-start">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[28px] font-bold tracking-tight text-white leading-snug drop-shadow-md">
                {config.nombre}
              </h1>
            </div>

            {/* Datos compactos y agrupados (no separados) */}
            <div className="bg-white/10 rounded-xl p-2.5 sm:p-3 backdrop-blur-xs border border-white/15 text-xs text-white/90 space-y-1.5 max-w-4xl">
              {/* Línea 1: RIF, Sector, WhatsApp, Correo */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-300" />
                  <strong className="text-white/70">RIF:</strong>{' '}
                  <span className="font-mono font-bold text-white">{config.rif}</span>
                </span>

                <span className="hidden sm:inline text-white/30">•</span>

                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                  <strong className="text-white/70">Sector:</strong> {config.sector}
                </span>

                <span className="hidden sm:inline text-white/30">•</span>

                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-green-400" />
                  <strong className="text-white/70">WhatsApp:</strong>{' '}
                  {cleanPhone ? (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-300 hover:text-emerald-200 underline decoration-dotted font-medium"
                    >
                      {config.telefonoWhatsapp}
                    </a>
                  ) : (
                    <span>{config.telefonoWhatsapp}</span>
                  )}
                </span>

                <span className="hidden md:inline text-white/30">•</span>

                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-sky-300" />
                  <strong className="text-white/70">Correo:</strong>{' '}
                  <a href={`mailto:${config.correo}`} className="text-sky-200 hover:text-sky-100 underline decoration-dotted">
                    {config.correo}
                  </a>
                </span>
              </div>

              {/* Línea 2: Dirección completa */}
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-white/85 pt-0.5 border-t border-white/10 text-[11px] sm:text-xs">
                <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                <span className="truncate">
                  <strong className="text-white/70">Dirección:</strong> {config.direccion}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
