import React, { useState } from 'react';
import { Search, X, UserSearch, AlertCircle, Users } from 'lucide-react';
import { Member, ThemeConfig } from '../types';
import { formatCedula, normalizeCedula } from '../utils/storage';

interface SearchSectionProps {
  theme: ThemeConfig;
  onSearch: (cedula: string) => void;
  allMembers: Member[];
  currentCedula: string;
  onOpenDirectory: () => void;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  theme,
  onSearch,
  allMembers,
  currentCedula,
  onOpenDirectory,
}) => {
  const [inputValue, setInputValue] = useState(currentCedula || '');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync input value only when currentCedula changes externally and input is not active
  React.useEffect(() => {
    if (currentCedula) {
      setInputValue(currentCedula);
    }
  }, [currentCedula]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeCedula(inputValue);
    if (!clean && !inputValue.trim()) {
      setErrorMsg('Por favor introduce un número de cédula.');
      return;
    }

    if (!clean) {
      setErrorMsg('Por favor introduce una cédula válida.');
      return;
    }

    setErrorMsg('');
    onSearch(clean);
  };

  const handleClear = () => {
    setInputValue('');
    setErrorMsg('');
  };

  // Cuando el usuario le da adentro del buscador, se borra automáticamente la cédula escrita
  const handleInputClickOrFocus = () => {
    setInputValue('');
    setErrorMsg('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (errorMsg) setErrorMsg('');

    // Búsqueda directa automática si escribe los dígitos de una cédula registrada
    const clean = normalizeCedula(val);
    if (clean.length >= 6) {
      const match = allMembers.find((m) => normalizeCedula(m.cedula) === clean);
      if (match) {
        onSearch(clean);
      }
    }
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4 -mt-5 sm:-mt-6 relative z-10 print:hidden">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 sm:p-5 backdrop-blur-lg">
        
        {/* Title & Directory Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
              <UserSearch className={`w-5 h-5 ${theme.textClass}`} />
              <span>Consulta de Estado de Cuenta</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Introduce el número de cédula para consultar los haberes y disponibilidad del socio
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenDirectory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer self-start sm:self-auto shadow-2xs active:scale-95"
            title="Ver lista completa de todos los socios registrados"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Ver Directorio ({allMembers.length})</span>
          </button>
        </div>

        {/* Search Input Form (Sin coincidencias encontradas, directo cédula) */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>

            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={inputValue}
              onFocus={handleInputClickOrFocus}
              onClick={handleInputClickOrFocus}
              onChange={handleInputChange}
              placeholder="Introduce la Cédula (ej: 18456789)..."
              className={`w-full pl-11 pr-24 sm:pr-28 py-3.5 text-lg sm:text-xl font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl transition-all focus:bg-white ${theme.ringClass} outline-none placeholder:font-normal placeholder:text-slate-400`}
            />

            <div className="absolute right-2 flex items-center gap-1">
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Limpiar campo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                className={`px-4 sm:px-5 py-2 rounded-lg font-black text-xs sm:text-sm shadow-md cursor-pointer transition-all active:scale-95 ${theme.primaryClass}`}
              >
                Buscar
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-2 text-xs text-rose-600 flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

      </div>
    </section>
  );
};
