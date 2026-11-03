import React, { useState, useMemo } from 'react';
import { 
  X, 
  Users, 
  Search, 
  CheckCircle2, 
  AlertOctagon, 
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { Member, ThemeConfig } from '../types';
import { formatCedula, formatCurrency, matchesMemberQuery } from '../utils/storage';

interface DirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  theme: ThemeConfig;
  monedaSimbolo: string;
  onSelectMember: (cedula: string) => void;
  onOpenExcel: () => void;
}

export const DirectoryModal: React.FC<DirectoryModalProps> = ({
  isOpen,
  onClose,
  members,
  theme,
  monedaSimbolo,
  onSelectMember,
  onOpenExcel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    return members.filter((m) => matchesMemberQuery(m, searchTerm));
  }, [members, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Directorio Completo de Socios</h3>
              <p className="text-xs text-slate-400">Listado cargado de la Caja de Ahorro ({members.length} socios registrados)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search bar inside directory & Excel button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por cédula o nombre en el directorio..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenExcel();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar Nuevo Excel</span>
            </button>
          </div>

          {/* Directory Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[60vh] overflow-y-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="py-2.5 px-3">Cédula</th>
                  <th className="py-2.5 px-3">Nombre del Socio</th>
                  <th className="py-2.5 px-3 text-right">Aporte Socio</th>
                  <th className="py-2.5 px-3 text-right">Aporte Pat.</th>
                  <th className="py-2.5 px-3 text-right">Total Haberes</th>
                  <th className="py-2.5 px-3 text-right">Préstamo</th>
                  <th className="py-2.5 px-3 text-right">Saldo Disp.</th>
                  <th className="py-2.5 px-3 text-center">Condición</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No se encontraron socios que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                    const noDisp = m.saldoDisponible <= 0;
                    return (
                      <tr 
                        key={m.id || m.cedula}
                        className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                        onClick={() => {
                          onSelectMember(m.cedula);
                          onClose();
                        }}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          V-{formatCedula(m.cedula)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{m.nombre}</div>
                          {m.departamento && (
                            <div className="text-[10px] text-slate-400 font-normal">{m.departamento}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(m.aporteSocio, monedaSimbolo)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(m.aportePatronal, monedaSimbolo)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">{formatCurrency(m.totalHaberes, monedaSimbolo)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-800">{formatCurrency(m.prestamoPendiente, monedaSimbolo)}</td>
                        <td className={`py-2.5 px-3 text-right font-mono font-extrabold ${noDisp ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatCurrency(m.saldoDisponible, monedaSimbolo)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {noDisp ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                              <AlertOctagon className="w-3 h-3" />
                              <span>Sin Disp.</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Disponible</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 group-hover:scale-105 transition-all shadow-2xs"
                          >
                            <span>Ver</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando {filteredMembers.length} de {members.length} socios</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
