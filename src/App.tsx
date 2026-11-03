import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  FileSpreadsheet, 
  Share2, 
  Settings, 
  UserCheck, 
  AlertCircle, 
  HelpCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Smartphone,
  Printer,
  Coins,
  Layers,
  ArrowRight,
  Users,
  Cloud
} from 'lucide-react';
import { Header } from './components/Header';
import { SearchSection } from './components/SearchSection';
import { MemberStatement } from './components/MemberStatement';
import { ConfigModal } from './components/ConfigModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { ShareAppModal } from './components/ShareAppModal';
import { ShareStatementModal } from './components/ShareStatementModal';
import { DriveSyncModal } from './components/DriveSyncModal';
import { DirectoryModal } from './components/DirectoryModal';
import { PrintCertificateModal } from './components/PrintCertificateModal';
import { PrintView } from './components/PrintView';
import { DEFAULT_MEMBERS, THEMES } from './data/defaultData';
import { InstitutionConfig, Member, ThemeColorKey } from './types';
import { 
  formatCedula, 
  getStoredConfig, 
  getStoredMembers, 
  getStoredPassword, 
  getStoredTheme, 
  matchesMemberQuery, 
  normalizeCedula, 
  saveStoredConfig, 
  saveStoredMembers, 
  saveStoredPassword, 
  saveStoredTheme,
  fetchServerData,
  syncServerData
} from './utils/storage';

export default function App() {
  // Application State
  const [members, setMembers] = useState<Member[]>(() => getStoredMembers());
  const [config, setConfig] = useState<InstitutionConfig>(() => getStoredConfig());
  const [themeKey, setThemeKey] = useState<ThemeColorKey>(() => getStoredTheme());
  const [password, setPassword] = useState<string>(() => getStoredPassword());

  // Search and selection
  const [searchCedula, setSearchCedula] = useState<string>(() => {
    const list = getStoredMembers();
    return list.length > 0 ? list[0].cedula : '18456789';
  });
  const [notFoundQuery, setNotFoundQuery] = useState<string>('');

  // Modals
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [isShareAppOpen, setIsShareAppOpen] = useState(false);
  const [isShareStatementOpen, setIsShareStatementOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isPrintCertificateOpen, setIsPrintCertificateOpen] = useState(false);
  const [isDriveSyncOpen, setIsDriveSyncOpen] = useState(false);

  // Active theme object
  const activeTheme = useMemo(() => THEMES[themeKey] || THEMES['azul-bancario'], [themeKey]);

  // Carga inicial y sincronización con el servidor (para acceso compartido multiusuario)
  useEffect(() => {
    fetchServerData().then((serverData) => {
      if (serverData) {
        if (serverData.members && Array.isArray(serverData.members) && serverData.members.length > 0) {
          setMembers(serverData.members);
          saveStoredMembers(serverData.members);
          if (!searchCedula && serverData.members[0]) {
            setSearchCedula(serverData.members[0].cedula);
          }
        }
        if (serverData.config) {
          const serverConfig = serverData.config;
          setConfig((prev) => {
            const preservedLogo = prev.logoUrl || '';
            const preservedFirmas = prev.firmasUrl || '';
            const merged: InstitutionConfig = {
              ...prev,
              ...serverConfig,
              logoUrl: serverConfig.logoUrl || preservedLogo,
              firmasUrl: serverConfig.firmasUrl || preservedFirmas,
            };
            saveStoredConfig(merged);
            return merged;
          });
        }
        if (serverData.theme) {
          setThemeKey(serverData.theme);
          saveStoredTheme(serverData.theme);
        }
        if (serverData.password) {
          setPassword(serverData.password);
          saveStoredPassword(serverData.password);
        }
      }
    });
  }, []);

  // Save changes to storage and sync to server
  const handleSaveConfig = (newConfig: InstitutionConfig) => {
    setConfig(newConfig);
    saveStoredConfig(newConfig);
    syncServerData({ config: newConfig });
  };

  const handleSelectTheme = (newTheme: ThemeColorKey) => {
    setThemeKey(newTheme);
    saveStoredTheme(newTheme);
    syncServerData({ theme: newTheme });
  };

  const handleSavePassword = (newPassword: string) => {
    setPassword(newPassword);
    saveStoredPassword(newPassword);
    syncServerData({ password: newPassword });
  };

  const handleImportMembers = (newMembers: Member[], mode: 'replace' | 'merge') => {
    let updated: Member[] = [];
    if (mode === 'replace') {
      updated = newMembers;
    } else {
      // Merge / overwrite by cédula
      const map = new Map<string, Member>();
      members.forEach((m) => map.set(normalizeCedula(m.cedula), m));
      newMembers.forEach((m) => map.set(normalizeCedula(m.cedula), m));
      updated = Array.from(map.values());
    }
    setMembers(updated);
    saveStoredMembers(updated);
    syncServerData({ members: updated });

    // If imported members exist, select the first one immediately so user sees their Excel data right away
    if (newMembers.length > 0) {
      setSearchCedula(newMembers[0].cedula);
      setNotFoundQuery('');
    }
  };

  const handleResetMembers = () => {
    setMembers(DEFAULT_MEMBERS);
    saveStoredMembers(DEFAULT_MEMBERS);
    syncServerData({ members: DEFAULT_MEMBERS });
    setSearchCedula(DEFAULT_MEMBERS[0].cedula);
    setNotFoundQuery('');
  };

  const handleClearMembers = () => {
    setMembers([]);
    saveStoredMembers([]);
    syncServerData({ members: [] });
    setSearchCedula('');
    setNotFoundQuery('');
  };

  // Search logic: handles exact digits, normalized cédula, and name query
  const handleSearch = (query: string) => {
    if (!query || !query.trim()) {
      setSearchCedula('');
      setNotFoundQuery('');
      return;
    }

    const cleanInput = normalizeCedula(query);

    // 1. Try exact normalized match
    let found = members.find((m) => normalizeCedula(m.cedula) === cleanInput);

    // 2. Try match using matchesMemberQuery (supports name and partial cédula)
    if (!found) {
      found = members.find((m) => matchesMemberQuery(m, query));
    }

    if (found) {
      setSearchCedula(found.cedula);
      setNotFoundQuery('');
    } else {
      setSearchCedula('');
      setNotFoundQuery(query);
    }
  };

  // Find currently matched member
  const currentMember = useMemo(() => {
    if (!searchCedula) return null;
    const cleanSearch = normalizeCedula(searchCedula);
    return members.find((m) => normalizeCedula(m.cedula) === cleanSearch) || null;
  }, [members, searchCedula]);

  const handlePrint = () => {
    setIsPrintCertificateOpen(true);
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.log('Abriendo vista de impresión');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      
      {/* 1) & 6) & 7) Institutional Header with Big Logo and Big Name */}
      <Header
        config={config}
        theme={activeTheme}
        totalMembers={members.length}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        
        {/* 5) Search Box with autocomplete and directory button */}
        <SearchSection
          theme={activeTheme}
          onSearch={handleSearch}
          allMembers={members}
          currentCedula={searchCedula}
          onOpenDirectory={() => setIsDirectoryOpen(true)}
        />

        {/* Member Found: Detailed Financial Statement */}
        {currentMember && (
          <MemberStatement
            member={currentMember}
            config={config}
            theme={activeTheme}
            onPrint={handlePrint}
            onOpenShareStatement={() => setIsShareStatementOpen(true)}
          />
        )}

        {/* Not Found Screen */}
        {!currentMember && notFoundQuery && (
          <div className="w-full max-w-2xl mx-auto px-4 mt-8 print:hidden">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  Socio no encontrado en el listado
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  No se encontró ningún registro para la búsqueda{' '}
                  <strong className="text-slate-900 font-mono">"{notFoundQuery}"</strong> en los datos de {config.nombre}.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-2">
                <p className="font-bold text-slate-700">Verifique las siguientes opciones:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Compruebe que el número de cédula esté escrito correctamente.</li>
                  <li>Puedes abrir el <strong>Directorio</strong> para revisar todos los socios cargados actualmente ({members.length} registrados).</li>
                  <li>Si acabas de cargar un Excel y las columnas no coincidían, puedes volver a importar y ajustar el mapeo de columnas.</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDirectoryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Ver Directorio ({members.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExcelOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Importar Listado Excel</span>
                </button>

                {members.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSearch(members[0].cedula)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer"
                  >
                    <span>Ver primer socio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty Search Screen (When user clears search) */}
        {!currentMember && !notFoundQuery && (
          <div className="w-full max-w-3xl mx-auto px-4 mt-8 print:hidden">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                <Search className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">
                  Buscador de Estado de Cuenta Listo
                </h3>
                <p className="text-sm text-slate-600 max-w-lg mx-auto">
                  Introduce el número de cédula en el recuadro superior o consulta el directorio completo para visualizar el estado de cuenta y disponibilidad del socio.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDirectoryOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Users className="w-4 h-4" />
                  <span>Ver Directorio Completo de Socios ({members.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDriveSyncOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Cloud className="w-4 h-4 text-sky-200" />
                  <span>Sincronizar DATOS_CATRAINSA (Drive)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExcelOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Importar Archivo Excel Local</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Printable Official View (Only active during print) */}
      {currentMember && (
        <PrintView member={currentMember} config={config} />
      )}

      {/* Footer (Hidden during print) */}
      <footer className="bg-slate-900 text-white/70 pt-8 pb-10 border-t border-slate-800 text-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Quick installation / share banner for shared phones */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-800/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">
                  ¿Quieres tener esta aplicación en tu teléfono como un icono?
                </h4>
                <p className="text-white/60 text-xs">
                  Añade el acceso directo a la pantalla de tu móvil o comparte el enlace por WhatsApp con otros socios.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsShareAppOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Instalar / Compartir App</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-white">{config.nombre}</span>
              <span className="text-white/40">|</span>
              <span className="font-mono text-white/80">RIF: {config.rif}</span>
            </div>

            <div className="text-white/60 text-xs">
              PORTAL CREADO POR ANTONIO ROJAS &quot;Contador Público&quot; | Tlf: 0412-4238613 | Email: alexmixdj.30@gmail.com
            </div>
          </div>

          {/* BOTÓN DE CONFIGURACIÓN AL FINAL, ABAJO DE ÚLTIMO */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border-2 border-amber-500/30 hover:border-amber-400/60 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer group"
              title="Panel de administración y configuración del sistema"
            >
              <Settings className="w-4 h-4 text-amber-400 group-hover:rotate-90 transition-transform duration-300" />
              <span>Configuración del Sistema</span>
            </button>
            <span className="text-[11px] text-slate-500 mt-2 font-medium">
              Acceso a importar archivos, cambiar colores y datos institucionales
            </span>
          </div>

        </div>
      </footer>

      {/* Modals */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        currentTheme={themeKey}
        onSelectTheme={handleSelectTheme}
        storedPassword={password}
        onSavePassword={handleSavePassword}
        totalMembers={members.length}
        onResetMembers={handleResetMembers}
        onClearMembers={handleClearMembers}
        onOpenExcelImport={() => setIsExcelOpen(true)}
        onOpenShareApp={() => setIsShareAppOpen(true)}
        onOpenDriveSync={() => setIsDriveSyncOpen(true)}
      />

      <DriveSyncModal
        isOpen={isDriveSyncOpen}
        onClose={() => setIsDriveSyncOpen(false)}
        theme={activeTheme}
        onImportMembers={handleImportMembers}
        monedaSimbolo={config.monedaSimbolo}
      />

      <ExcelImportModal
        isOpen={isExcelOpen}
        onClose={() => setIsExcelOpen(false)}
        theme={activeTheme}
        onImportMembers={handleImportMembers}
        monedaSimbolo={config.monedaSimbolo}
      />

      <ShareAppModal
        isOpen={isShareAppOpen}
        onClose={() => setIsShareAppOpen(false)}
        config={config}
        theme={activeTheme}
      />

      {currentMember && (
        <ShareStatementModal
          isOpen={isShareStatementOpen}
          onClose={() => setIsShareStatementOpen(false)}
          member={currentMember}
          config={config}
          theme={activeTheme}
          onPrint={handlePrint}
        />
      )}

      {currentMember && (
        <PrintCertificateModal
          isOpen={isPrintCertificateOpen}
          onClose={() => setIsPrintCertificateOpen(false)}
          member={currentMember}
          config={config}
          theme={activeTheme}
        />
      )}

      <DirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        members={members}
        theme={activeTheme}
        monedaSimbolo={config.monedaSimbolo}
        onSelectMember={(ced) => handleSearch(ced)}
        onOpenExcel={() => setIsExcelOpen(true)}
      />

    </div>
  );
}
