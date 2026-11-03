import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  RefreshCw,
  PlusCircle,
  HelpCircle,
  SlidersHorizontal,
  Table
} from 'lucide-react';
import { Member, ThemeConfig } from '../types';
import { downloadSampleExcelTemplate, parseExcelFile, ParseResult } from '../utils/excelParser';
import { formatCedula, formatCurrency } from '../utils/storage';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onImportMembers: (members: Member[], mode: 'replace' | 'merge') => void;
  monedaSimbolo: string;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  theme,
  onImportMembers,
  monedaSimbolo,
}) => {
  const [fileName, setFileName] = useState('');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedMembers, setParsedMembers] = useState<Member[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [successNotice, setSuccessNotice] = useState(false);

  // Advanced Column Mapping
  const [showMapping, setShowMapping] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [detectedHeaderRow, setDetectedHeaderRow] = useState<number>(1);
  const [columnMapping, setColumnMapping] = useState<{
    cedula?: string;
    nombre?: string;
    aporteSocio?: string;
    aportePatronal?: string;
    totalHaberes?: string;
    prestamo?: string;
    saldoDisponible?: string;
  }>({});

  if (!isOpen) return null;

  const processBuffer = async (buffer: ArrayBuffer, sheet?: string, mapping?: Record<string, string>) => {
    setIsProcessing(true);
    setParseErrors([]);
    try {
      const result: ParseResult = await parseExcelFile(buffer, mapping, sheet);
      setParsedMembers(result.members);
      setParseErrors(result.errors);
      setAvailableColumns(result.availableColumns);
      setSheetNames(result.sheetNames);
      setDetectedHeaderRow(result.detectedHeaderRow);
      if (result.sheetNames.length > 0 && !sheet) {
        setSelectedSheet(result.sheetNames[0]);
      }
    } catch (err: any) {
      setParseErrors([err.message || 'Error al procesar el archivo.']);
      setParsedMembers([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSuccessNotice(false);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      await processBuffer(buffer);
    } catch (err: any) {
      setParseErrors([err.message || 'Error al leer el archivo.']);
      setParsedMembers([]);
    }
  };

  const handleSheetChange = async (sheet: string) => {
    setSelectedSheet(sheet);
    if (fileBuffer) {
      await processBuffer(fileBuffer, sheet, columnMapping as Record<string, string>);
    }
  };

  const handleMappingChange = async (fieldKey: string, colName: string) => {
    const newMapping = {
      ...columnMapping,
      [fieldKey]: colName,
    };
    setColumnMapping(newMapping);
    if (fileBuffer) {
      await processBuffer(fileBuffer, selectedSheet, newMapping as Record<string, string>);
    }
  };

  const handleExecuteImport = () => {
    if (parsedMembers.length === 0) return;
    onImportMembers(parsedMembers, importMode);
    setSuccessNotice(true);
    setTimeout(() => {
      onClose();
      // Reset state
      setFileName('');
      setFileBuffer(null);
      setParsedMembers([]);
      setSuccessNotice(false);
    }, 1200);
  };

  const handleClose = () => {
    setFileName('');
    setFileBuffer(null);
    setParsedMembers([]);
    setParseErrors([]);
    setSuccessNotice(false);
    setShowMapping(false);
    onClose();
  };

  const countAvailable = parsedMembers.filter((m) => m.saldoDisponible > 0).length;
  const countNoAvailable = parsedMembers.length - countAvailable;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Importar Listado de Socios desde Excel</h3>
              <p className="text-xs text-slate-400">Carga de cédulas, aportes, haberes acumulados y préstamos</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top helper and Template download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
            <div className="space-y-1">
              <h4 className="text-sm font-bold flex items-center gap-1.5 text-emerald-900">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                <span>¿Deseas verificar el formato modelo?</span>
              </h4>
              <p className="text-xs text-emerald-800">
                Puedes descargar una plantilla Excel modelo lista para rellenar, o subir directamente el archivo contable de tu Caja de Ahorro.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadSampleExcelTemplate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Plantilla Excel</span>
            </button>
          </div>

          {/* File Upload Zone */}
          <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer group">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-emerald-600 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {fileName ? (
                    <span className="text-emerald-700 font-semibold">{fileName}</span>
                  ) : (
                    'Haz clic o arrastra aquí tu archivo de Excel (.xlsx, .xls o .csv)'
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  El sistema detecta automáticamente títulos superiores, columnas de cédula, aportes, haberes y préstamos.
                </p>
              </div>
            </div>
          </div>

          {/* Sheet Selector (if multiple sheets exist) */}
          {sheetNames.length > 1 && (
            <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Seleccionar Hoja de Trabajo:</span>
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1 font-medium text-slate-800 outline-none"
              >
                {sheetNames.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    Hoja: {sheet}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 justify-center">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Analizando filas y mapeando columnas de la hoja de cálculo...</span>
            </div>
          )}

          {/* Parse Errors if any */}
          {parseErrors.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1 text-xs">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span>Observaciones durante la lectura del archivo:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 max-h-24 overflow-y-auto">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Results & Mapping Section */}
          {parsedMembers.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <FileCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-900">
                      {parsedMembers.length} Socios detectados correctamente
                    </h5>
                    <p className="text-xs text-slate-500">
                      Encabezados encontrados en fila {detectedHeaderRow} • {countAvailable} con disponibilidad, {countNoAvailable} sin disponibilidad
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Toggle Column Mapping Tool */}
                  <button
                    type="button"
                    onClick={() => setShowMapping(!showMapping)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{showMapping ? 'Ocultar Mapeo' : 'Ajustar Columnas'}</span>
                  </button>

                  {/* Mode selector */}
                  <div className="flex items-center gap-2 text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <label className="flex items-center gap-1 text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />
                      <span>Reemplazar</span>
                    </label>
                    <label className="flex items-center gap-1 text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                      />
                      <span>Combinar</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Advanced Column Mapping Drawer */}
              {showMapping && availableColumns.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-blue-600" />
                    <span>Asignación manual de columnas (si tus encabezados tienen nombres personalizados):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Columna Cédula *</label>
                      <select
                        value={columnMapping.cedula || ''}
                        onChange={(e) => handleMappingChange('cedula', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                      >
                        <option value="">Detección automática</option>
                        {availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Columna Nombre *</label>
                      <select
                        value={columnMapping.nombre || ''}
                        onChange={(e) => handleMappingChange('nombre', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                      >
                        <option value="">Detección automática</option>
                        {availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Aporte Socio</label>
                      <select
                        value={columnMapping.aporteSocio || ''}
                        onChange={(e) => handleMappingChange('aporteSocio', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                      >
                        <option value="">Detección automática</option>
                        {availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Aporte Patronal</label>
                      <select
                        value={columnMapping.aportePatronal || ''}
                        onChange={(e) => handleMappingChange('aportePatronal', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                      >
                        <option value="">Detección automática</option>
                        {availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Total Haberes</label>
                      <select
                        value={columnMapping.totalHaberes || ''}
                        onChange={(e) => handleMappingChange('totalHaberes', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                      >
                        <option value="">Detección automática (o suma de aportes)</option>
                        {availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Préstamo Pendiente</label>
                      <select
                        value={columnMapping.prestamo || ''}
                        onChange={(e) => handleMappingChange('prestamo', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                      >
                        <option value="">Detección automática</option>
                        {availableColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Cédula</th>
                      <th className="py-2.5 px-3">Nombre</th>
                      <th className="py-2.5 px-3 text-right">Aporte Socio</th>
                      <th className="py-2.5 px-3 text-right">Aporte Pat.</th>
                      <th className="py-2.5 px-3 text-right">Total Haberes</th>
                      <th className="py-2.5 px-3 text-right">Préstamo</th>
                      <th className="py-2.5 px-3 text-right">Saldo Disp.</th>
                      <th className="py-2.5 px-3 text-center">Disponibilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {parsedMembers.slice(0, 50).map((m, idx) => {
                      const noDisp = m.saldoDisponible <= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">V-{formatCedula(m.cedula)}</td>
                          <td className="py-2 px-3 font-medium truncate max-w-[160px]" title={m.nombre}>{m.nombre}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatCurrency(m.aporteSocio, monedaSimbolo)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatCurrency(m.aportePatronal, monedaSimbolo)}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-blue-900">{formatCurrency(m.totalHaberes, monedaSimbolo)}</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-800">{formatCurrency(m.prestamoPendiente, monedaSimbolo)}</td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${noDisp ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {formatCurrency(m.saldoDisponible, monedaSimbolo)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {noDisp ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 uppercase">
                                No disponible
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                Disponible
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedMembers.length > 50 && (
                <p className="text-[11px] text-slate-500 text-center font-medium">
                  Mostrando los primeros 50 socios de {parsedMembers.length} encontrados en el archivo.
                </p>
              )}
            </div>
          )}

          {/* Success banner */}
          {successNotice && (
            <div className="p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span>¡Listado de socios importado correctamente a la aplicación!</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={parsedMembers.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                parsedMembers.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cargar en la Aplicación {parsedMembers.length > 0 ? `(${parsedMembers.length} socios)` : ''}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
