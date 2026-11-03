import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Download, 
  Database, 
  ExternalLink,
  Table,
  Check,
  ShieldCheck,
  LogOut,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { Member, ThemeConfig } from '../types';
import { 
  signInWithGoogle, 
  signOutGoogle, 
  initGoogleAuth, 
  getAccessToken,
  searchDriveFiles,
  downloadDriveSpreadsheetBuffer,
  DriveFileItem
} from '../services/googleDriveService';
import { parseExcelFile, ParseResult } from '../utils/excelParser';
import { formatCedula, formatCurrency } from '../utils/storage';
import { User } from 'firebase/auth';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onImportMembers: (members: Member[], mode: 'replace' | 'merge') => void;
  monedaSimbolo: string;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  isOpen,
  onClose,
  theme,
  onImportMembers,
  monedaSimbolo,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFileItem | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // File parsing states
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [showMapping, setShowMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user) => {
        setCurrentUser(user);
        handleSearchFiles();
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // When modal opens, if already authenticated, search files
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      getAccessToken().then((token) => {
        if (token) {
          handleSearchFiles();
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage('');
    try {
      const { user } = await signInWithGoogle();
      setCurrentUser(user);
      await handleSearchFiles();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Error al iniciar sesión con Google.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGoogle();
    setCurrentUser(null);
    setDriveFiles([]);
    setSelectedFile(null);
    setFileBuffer(null);
    setParseResult(null);
  };

  const handleSearchFiles = async () => {
    setIsSearching(true);
    setErrorMessage('');
    try {
      // 1. Search for DATOS_CATRAINSA
      let files = await searchDriveFiles('DATOS_CATRAINSA');
      if (files.length === 0) {
        // Fallback: search for CATRAINSA
        files = await searchDriveFiles('CATRAINSA');
      }
      if (files.length === 0) {
        // Fallback: search for any spreadsheet
        const allSpreadsheets = await searchDriveFiles('');
        files = allSpreadsheets;
      }
      setDriveFiles(files);

      // Auto-select the first matching DATOS_CATRAINSA file
      const exactMatch = files.find((f) => f.name.toUpperCase().includes('DATOS_CATRAINSA')) || files[0];
      if (exactMatch) {
        setSelectedFile(exactMatch);
        await handleLoadFile(exactMatch);
      } else {
        setErrorMessage('No se encontró ningún archivo llamado "DATOS_CATRAINSA" en tu Google Drive. Sube la hoja de Excel a tu Drive para sincronizarla.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al buscar archivos en Google Drive.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadFile = async (file: DriveFileItem, sheet?: string, mapping?: Record<string, string>) => {
    setSelectedFile(file);
    setIsDownloading(true);
    setErrorMessage('');
    try {
      let buffer = fileBuffer;
      if (!buffer || selectedFile?.id !== file.id) {
        buffer = await downloadDriveSpreadsheetBuffer(file);
        setFileBuffer(buffer);
      }

      const parsed = await parseExcelFile(buffer, mapping || columnMapping, sheet || selectedSheet);
      setParseResult(parsed);
      if (parsed.sheetNames.length > 0 && !sheet && !selectedSheet) {
        setSelectedSheet(parsed.sheetNames[0]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el archivo de Google Drive.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSheetChange = async (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (selectedFile && fileBuffer) {
      setIsDownloading(true);
      try {
        const parsed = await parseExcelFile(fileBuffer, columnMapping, newSheet);
        setParseResult(parsed);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error al cambiar de hoja.');
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleMappingChange = async (fieldKey: string, colName: string) => {
    const updated = { ...columnMapping, [fieldKey]: colName };
    setColumnMapping(updated);
    if (selectedFile && fileBuffer) {
      const parsed = await parseExcelFile(fileBuffer, updated, selectedSheet);
      setParseResult(parsed);
    }
  };

  const handleExecuteSync = () => {
    if (!parseResult || parseResult.members.length === 0) {
      setErrorMessage('No hay datos válidos para sincronizar.');
      return;
    }

    onImportMembers(parseResult.members, importMode);
    setSuccessMessage(`¡Éxito! Se sincronizaron ${parseResult.members.length} socios desde DATOS_CATRAINSA.`);
    setTimeout(() => {
      onClose();
      setSuccessMessage('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Cloud className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Sincronización con Google Drive
              </h3>
              <p className="text-xs text-white/70">
                Usa directamente los datos de la hoja <strong>DATOS_CATRAINSA</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs sm:text-sm flex-1">
          
          {/* 1. Google Account Connection Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>

              <div>
                {currentUser ? (
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-0.5">
                      <Check className="w-3 h-3" /> Conectado a Google Drive
                    </span>
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">
                      {currentUser.email || 'alexmixdj.30@gmail.com'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Acceso autorizado para leer y sincronizar <strong>DATOS_CATRAINSA</strong>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">
                      Conectar cuenta de Google Drive
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Inicia sesión con la cuenta <strong>alexmixdj.30@gmail.com</strong> para cargar los datos de DATOS_CATRAINSA
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSearchFiles}
                    disabled={isSearching}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                    <span>Actualizar Archivos</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors cursor-pointer"
                    title="Cerrar sesión de Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  <span>{isSigningIn ? 'Conectando...' : 'Conectar con Google Drive'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Error notice */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success notice */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 2. Detected Drive File Card */}
          {selectedFile && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md mb-0.5">
                      Archivo Encontrado en Drive
                    </span>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base">
                      {selectedFile.name}
                    </h4>
                    {selectedFile.modifiedTime && (
                      <p className="text-[11px] text-slate-500">
                        Última modificación en Drive: {new Date(selectedFile.modifiedTime).toLocaleString('es-VE')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleLoadFile(selectedFile)}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-300 text-blue-900 hover:bg-blue-100 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDownloading ? 'animate-spin' : ''}`} />
                    <span>Recargar de Drive</span>
                  </button>
                </div>
              </div>

              {/* Sheet Selection if multiple sheets exist */}
              {parseResult && parseResult.sheetNames.length > 1 && (
                <div className="pt-2 border-t border-blue-200/60 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Hoja de cálculo:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-950 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {parseResult.sheetNames.map((sheet) => (
                      <option key={sheet} value={sheet}>{sheet}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 3. Preview of records extracted from DATOS_CATRAINSA */}
          {parseResult && parseResult.members.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-800">
                    {parseResult.members.length} socios leídos de DATOS_CATRAINSA
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMapping(!showMapping)}
                    className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{showMapping ? 'Ocultar ajuste de columnas' : 'Ajustar columnas si es necesario'}</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <span>Modo:</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="syncImportMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />
                      <span>Reemplazar todo</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="syncImportMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                      />
                      <span>Combinar</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Column Mapping Drawer */}
              {showMapping && parseResult.availableColumns.length > 0 && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <p className="font-bold text-slate-700">Mapeo manual de columnas:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Cédula</label>
                      <select
                        value={columnMapping.cedula || ''}
                        onChange={(e) => handleMappingChange('cedula', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-medium"
                      >
                        <option value="">Auto</option>
                        {parseResult.availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nombre</label>
                      <select
                        value={columnMapping.nombre || ''}
                        onChange={(e) => handleMappingChange('nombre', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-medium"
                      >
                        <option value="">Auto</option>
                        {parseResult.availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Total Haberes</label>
                      <select
                        value={columnMapping.totalHaberes || ''}
                        onChange={(e) => handleMappingChange('totalHaberes', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-medium"
                      >
                        <option value="">Auto</option>
                        {parseResult.availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Préstamo Pendiente</label>
                      <select
                        value={columnMapping.prestamo || ''}
                        onChange={(e) => handleMappingChange('prestamo', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-medium"
                      >
                        <option value="">Auto</option>
                        {parseResult.availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Cédula</th>
                      <th className="py-2 px-3">Nombre</th>
                      <th className="py-2 px-3 text-right">Total Haberes</th>
                      <th className="py-2 px-3 text-right">Préstamo</th>
                      <th className="py-2 px-3 text-right">Saldo Disp.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.members.slice(0, 30).map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">V-{formatCedula(m.cedula)}</td>
                        <td className="py-1.5 px-3 font-medium truncate max-w-[150px]">{m.nombre}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-blue-900 font-bold">{formatCurrency(m.totalHaberes, monedaSimbolo)}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-amber-900">{formatCurrency(m.prestamoPendiente, monedaSimbolo)}</td>
                        <td className={`py-1.5 px-3 text-right font-mono font-bold ${m.saldoDisponible <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatCurrency(m.saldoDisponible, monedaSimbolo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parseResult.members.length > 30 && (
                <p className="text-[11px] text-slate-500 text-center">
                  Mostrando los primeros 30 de {parseResult.members.length} socios leídos de DATOS_CATRAINSA.
                </p>
              )}
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          {parseResult && parseResult.members.length > 0 && (
            <button
              type="button"
              onClick={handleExecuteSync}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer ${theme.primaryClass}`}
            >
              <Database className="w-4 h-4" />
              <span>Sincronizar y Cargar {parseResult.members.length} Socios de DATOS_CATRAINSA</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
