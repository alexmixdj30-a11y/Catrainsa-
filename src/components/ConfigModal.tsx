import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  KeyRound, 
  Palette, 
  Building2, 
  Database, 
  Check, 
  AlertCircle, 
  Upload, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  FileSpreadsheet,
  Share2,
  Cloud,
  FileCheck
} from 'lucide-react';
import { THEMES } from '../data/defaultData';
import { InstitutionConfig, ThemeColorKey } from '../types';
import { uploadLogoToServer, uploadFirmasToServer } from '../utils/storage';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: InstitutionConfig;
  onSaveConfig: (newConfig: InstitutionConfig) => void;
  currentTheme: ThemeColorKey;
  onSelectTheme: (theme: ThemeColorKey) => void;
  storedPassword: string;
  onSavePassword: (newPassword: string) => void;
  totalMembers: number;
  onResetMembers: () => void;
  onClearMembers: () => void;
  onOpenExcelImport: () => void;
  onOpenShareApp: () => void;
  onOpenDriveSync?: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  currentTheme,
  onSelectTheme,
  storedPassword,
  onSavePassword,
  totalMembers,
  onResetMembers,
  onClearMembers,
  onOpenExcelImport,
  onOpenShareApp,
  onOpenDriveSync,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [showEnteredPassword, setShowEnteredPassword] = useState(false);

  // Compact Zoom state (Requested: "hacer más pequeño ese menú o el zoom para poder ver todo y editar bien")
  const [isCompactZoom, setIsCompactZoom] = useState(true);

  // Active Tab: 'datos' | 'apariencia' | 'password' | 'datos-socios'
  const [activeTab, setActiveTab] = useState<'datos' | 'apariencia' | 'password' | 'datos-socios'>('datos');

  // Form State for Institution Data
  const [formData, setFormData] = useState<InstitutionConfig>({ ...config });
  const [savedSuccessMsg, setSavedSuccessMsg] = useState('');

  // Sincronizar formData cuando cambia la configuración o se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      setFormData({ ...config });
    }
  }, [config, isOpen]);

  // Password Change State
  const [currPwdInput, setCurrPwdInput] = useState('');
  const [newPwdInput, setNewPwdInput] = useState('');
  const [confirmPwdInput, setConfirmPwdInput] = useState('');
  const [pwdChangeError, setPwdChangeError] = useState('');
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState('');

  if (!isOpen) return null;

  // Handle password submission for entering configuration
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === storedPassword) {
      setIsAuthenticated(true);
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('Contraseña incorrecta. Verifique sus credenciales de administración.');
    }
  };

  // Handle saving institutional information
  const handleSaveInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedSuccessMsg('¡Datos actualizados exitosamente!');
    setTimeout(() => setSavedSuccessMsg(''), 3000);
  };

  // Handle password update
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdChangeError('');
    setPwdChangeSuccess('');

    if (currPwdInput !== storedPassword) {
      setPwdChangeError('La contraseña actual es incorrecta.');
      return;
    }
    if (newPwdInput.length < 4) {
      setPwdChangeError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (newPwdInput !== confirmPwdInput) {
      setPwdChangeError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    onSavePassword(newPwdInput);
    setPwdChangeSuccess('¡Contraseña de administración actualizada exitosamente!');
    setCurrPwdInput('');
    setNewPwdInput('');
    setConfirmPwdInput('');
    setTimeout(() => setPwdChangeSuccess(''), 3500);
  };

  // Comprimir imagen a base64 liviano optimizado para máxima nitidez
  const resizeImageToBase64 = (file: File, maxWidth = 512, maxHeight = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type.includes('svg')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.92);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('No se pudo leer la imagen'));
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle Logo Upload (permanente en servidor y optimizado en storage)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG, WebP).');
      return;
    }

    try {
      const base64Optimizado = await resizeImageToBase64(file);
      
      // Subir permanentemente al disco del servidor
      let finalUrl = base64Optimizado;
      try {
        const serverLogoUrl = await uploadLogoToServer(base64Optimizado);
        if (serverLogoUrl) {
          finalUrl = serverLogoUrl;
        }
      } catch (errServer) {
        console.warn('No se pudo guardar en endpoint de servidor, usando base64:', errServer);
      }

      const updated = { ...formData, logoUrl: finalUrl };
      setFormData(updated);
      onSaveConfig(updated);
      setSavedSuccessMsg('¡Foto del logo guardada permanentemente!');
      setTimeout(() => setSavedSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error al procesar logo', err);
      alert('Hubo un problema al procesar la imagen.');
    }
  };

  const handleRemoveLogo = () => {
    const updated = { ...formData, logoUrl: '' };
    setFormData(updated);
    onSaveConfig(updated);
    setSavedSuccessMsg('¡Se restableció el emblema institucional!');
    setTimeout(() => setSavedSuccessMsg(''), 3000);
  };

  // Handle Firmas Upload (permanente en servidor y optimizado en storage)
  const handleFirmasUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG, WebP).');
      return;
    }

    try {
      const base64Optimizado = await resizeImageToBase64(file, 800, 400);
      
      // Subir permanentemente al disco del servidor
      let finalUrl = base64Optimizado;
      try {
        const serverFirmasUrl = await uploadFirmasToServer(base64Optimizado);
        if (serverFirmasUrl) {
          finalUrl = serverFirmasUrl;
        }
      } catch (errServer) {
        console.warn('No se pudo guardar firmas en endpoint de servidor, usando base64:', errServer);
      }

      const updated = { ...formData, firmasUrl: finalUrl };
      setFormData(updated);
      onSaveConfig(updated);
      setSavedSuccessMsg('¡Imagen de firmas y sello guardada permanentemente!');
      setTimeout(() => setSavedSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error al procesar imagen de firmas', err);
      alert('Hubo un problema al procesar la imagen de firmas.');
    }
  };

  const handleRemoveFirmas = () => {
    const updated = { ...formData, firmasUrl: '' };
    setFormData(updated);
    onSaveConfig(updated);
    setSavedSuccessMsg('¡Se eliminó la imagen de firmas!');
    setTimeout(() => setSavedSuccessMsg(''), 3000);
  };

  const handleClose = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError('');
    setSavedSuccessMsg('');
    setPwdChangeError('');
    setPwdChangeSuccess('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal with Zoom Toggle */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/10 text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Configuración del Sistema</h3>
              <p className="text-[11px] text-slate-400">Edición de nombre, colores de interfaz y datos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom toggle button */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsCompactZoom(!isCompactZoom)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                title="Cambiar tamaño para ver todo el menú"
              >
                {isCompactZoom ? <ZoomIn className="w-3.5 h-3.5 text-amber-300" /> : <ZoomOut className="w-3.5 h-3.5 text-amber-300" />}
                <span>{isCompactZoom ? 'Vista Normal' : 'Vista Compacta'}</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEP 1: PASSWORD GATEWAY */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-8 text-center max-w-md mx-auto space-y-4 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900">Acceso a Configuración</h4>
              <p className="text-xs text-slate-500">
                Introduce la contraseña de administración para editar el nombre de la institución y opciones.
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Contraseña de Administrador
                </label>
                <div className="relative">
                  <input
                    type={showEnteredPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (authError) setAuthError('');
                    }}
                    placeholder="Escribe la clave..."
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEnteredPassword(!showEnteredPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showEnteredPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showEnteredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Ingresar
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: AUTHENTICATED COMPACT CONFIGURATION */
          <div className="flex-1 overflow-y-auto flex flex-col">
            
            {/* Tabs Bar */}
            <div className="flex border-b border-slate-200 px-4 pt-2 gap-1.5 shrink-0 bg-slate-50/80 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('datos')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'datos'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Nombre e Institución</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('apariencia')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'apariencia'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-purple-600" />
                <span>Color de Interfaz (8 Colores)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'password'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Contraseña</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('datos-socios')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'datos-socios'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Socios ({totalMembers})</span>
              </button>
            </div>

            {/* Acciones principales requeridas dentro de Configuración: Importar Excel y Compartir App */}
            <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-700">
                Operaciones del Sistema:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenExcelImport();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                  title="Importar archivo Excel con datos de socios"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Importar Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenShareApp();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                  title="Compartir enlace o código QR de la aplicación"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-100" />
                  <span>Compartir / Instalar</span>
                </button>
              </div>
            </div>

            {/* Form Content with Compact Scaling */}
            <div className={`p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5 ${isCompactZoom ? 'text-xs' : 'text-sm'}`}>
              
              {/* TAB 1: Nombre e Institución (Diseño Compacto y Claro) */}
              {activeTab === 'datos' && (
                <form onSubmit={handleSaveInstitution} className="space-y-3">
                  
                  {/* SECCIÓN PRINCIPAL: EDITAR NOMBRE DE LA CAJA DE AHORRO */}
                  <div className="p-3 bg-blue-50/90 border-2 border-blue-300 rounded-xl space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>Nombre de la Caja de Ahorro:</span>
                      </label>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        Visible en toda la App
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: CATRAINSA"
                        className="flex-1 px-3 py-2 text-sm sm:text-base font-black text-slate-900 bg-white border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.nombre.trim()) return;
                          onSaveConfig(formData);
                          setSavedSuccessMsg('¡Nombre de la Caja de Ahorro guardado!');
                          setTimeout(() => setSavedSuccessMsg(''), 2500);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Guardar Nombre
                      </button>
                    </div>
                  </div>

                  {/* SELECTOR RÁPIDO DE COLORES (8 Colores directos) */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5 text-purple-600" />
                        <span>Color de Interfaz (8 colores disponibles):</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {(Object.keys(THEMES) as ThemeColorKey[]).map((key) => {
                        const th = THEMES[key];
                        const isSelected = currentTheme === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => onSelectTheme(key)}
                            title={th.name}
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer shadow-xs ${
                              isSelected ? 'scale-125 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-110 opacity-75 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: th.colorHex }}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Datos Institucionales en Cuadrícula Compacta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* RIF */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                        RIF *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.rif}
                        onChange={(e) => setFormData({ ...formData, rif: e.target.value })}
                        placeholder="Ej: J-12345678-9"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none font-mono font-bold"
                      />
                    </div>

                    {/* Sector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                        Sector *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.sector}
                        onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                        placeholder="Ej: Agroindustrial, etc."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Teléfono / WhatsApp */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                        Teléfono WhatsApp *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.telefonoWhatsapp}
                        onChange={(e) => setFormData({ ...formData, telefonoWhatsapp: e.target.value })}
                        placeholder="Ej: +58 414 1234567"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Correo Electrónico */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.correo}
                        onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                        placeholder="Ej: contacto@caja.com"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Dirección */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                        Dirección Fiscal *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.direccion}
                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                        placeholder="Dirección física completa"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Logo Personalizado (Compacto) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      {formData.logoUrl ? (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-300 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                          <img
                            src={formData.logoUrl}
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}

                      <div className="flex-1 space-y-1.5 text-xs">
                        <span className="font-bold text-slate-800 block">Logo de la Institución:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-2xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Subir Imagen</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>

                          {formData.logoUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Restablecer</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="O escribe/pega la URL directa del logo..."
                          value={formData.logoUrl?.startsWith('data:') ? '' : (formData.logoUrl || '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = { ...formData, logoUrl: val };
                            setFormData(updated);
                            onSaveConfig(updated);
                          }}
                          className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-300 rounded outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Firmas y Sello de los Directivos (Para Estado de Cuenta en PDF) */}
                  <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200">
                    <div className="flex items-center gap-3">
                      {formData.firmasUrl ? (
                        <div className="w-24 h-20 sm:w-28 sm:h-24 rounded-xl border border-indigo-300 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                          <img
                            src={formData.firmasUrl}
                            alt="Firmas y Sello"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-20 sm:w-28 sm:h-24 rounded-xl border-2 border-dashed border-indigo-300 bg-white flex flex-col items-center justify-center text-indigo-400 shrink-0 text-center p-1">
                          <FileCheck className="w-7 h-7 mb-0.5 text-indigo-400" />
                          <span className="text-[10px] font-bold text-indigo-700">Sin Firmas</span>
                        </div>
                      )}

                      <div className="flex-1 space-y-1.5 text-xs">
                        <div>
                          <span className="font-bold text-slate-800 block">Firmas de los Directivos:</span>
                          <span className="text-[11px] text-slate-600 block">
                            Aparecerán en el PDF arriba de <strong>&quot;{formData.nombre} - Firma y Sello Oficial Autorizado&quot;</strong>.
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-2xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Subir Imagen de Firmas</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFirmasUpload}
                              className="hidden"
                            />
                          </label>

                          {formData.firmasUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveFirmas}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar Firmas</span>
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="O escribe/pega la URL directa de la imagen de firmas..."
                          value={formData.firmasUrl?.startsWith('data:') ? '' : (formData.firmasUrl || '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = { ...formData, firmasUrl: val };
                            setFormData(updated);
                            onSaveConfig(updated);
                          }}
                          className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-300 rounded outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {savedSuccessMsg && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{savedSuccessMsg}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Todos los Cambios</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: Color de Interfaz (8 Colores) */}
              {activeTab === 'apariencia' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Selecciona el Color de la Aplicación</h4>
                      <p className="text-xs text-slate-500">
                        Cambia al instante los encabezados, botones y acentos de color
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      8 Temas
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {(Object.keys(THEMES) as ThemeColorKey[]).map((key) => {
                      const themeObj = THEMES[key];
                      const isSelected = currentTheme === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onSelectTheme(key)}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-slate-900 bg-slate-50 shadow-sm ring-2 ring-slate-900/10'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div
                            className="w-full h-6 rounded-md mb-1.5 flex items-center justify-center shadow-2xs"
                            style={{ backgroundColor: themeObj.colorHex }}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 block truncate">
                            {themeObj.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Cambiar Contraseña */}
              {activeTab === 'password' && (
                <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-sm mx-auto py-1">
                  <div className="text-center pb-1">
                    <h4 className="text-sm font-bold text-slate-800">Cambiar Contraseña</h4>
                    <p className="text-[11px] text-slate-500">
                      Modifica la clave de seguridad para entrar a esta configuración
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                      Contraseña Actual *
                    </label>
                    <input
                      type="password"
                      required
                      value={currPwdInput}
                      onChange={(e) => setCurrPwdInput(e.target.value)}
                      placeholder="Clave actual..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                      Nueva Contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      value={newPwdInput}
                      onChange={(e) => setNewPwdInput(e.target.value)}
                      placeholder="Mínimo 4 caracteres..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                      Confirmar Nueva Contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPwdInput}
                      onChange={(e) => setConfirmPwdInput(e.target.value)}
                      placeholder="Repite la clave..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  {pwdChangeError && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{pwdChangeError}</span>
                    </div>
                  )}

                  {pwdChangeSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{pwdChangeSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer mt-1"
                  >
                    Actualizar Contraseña
                  </button>
                </form>
              )}

              {/* TAB 4: Base de Datos */}
              {activeTab === 'datos-socios' && (
                <div className="space-y-4 py-1">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs">Total de Socios Registrados</h5>
                      <p className="text-[11px] text-slate-500">Guardados de forma portable en este dispositivo</p>
                    </div>
                    <span className="text-xl font-black text-slate-900">{totalMembers}</span>
                  </div>

                  {/* Sincronización oficial con Google Drive: DATOS_CATRAINSA */}
                  {onOpenDriveSync && (
                    <div className="p-4 rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-blue-50 to-white shadow-xs space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                          <Cloud className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                            Fuente Oficial Solicitada
                          </span>
                          <h5 className="font-black text-slate-900 text-sm">
                            Hoja de Drive: DATOS_CATRAINSA
                          </h5>
                          <p className="text-[11px] text-slate-600 font-medium">
                            Cuenta vinculada: <strong>alexmixdj.30@gmail.com</strong>
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600">
                        Carga y sincroniza la nómina de socios directamente desde tu archivo en Google Drive para que todos los usuarios en cualquier teléfono tengan los datos actualizados.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          onOpenDriveSync();
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Cloud className="w-4 h-4 text-sky-200" />
                        <span>Sincronizar DATOS_CATRAINSA desde Google Drive</span>
                      </button>
                    </div>
                  )}

                  {/* Acciones directas de Importar Excel y Compartir dentro de la pestaña de socios */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/70 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-950 text-xs block">Importar Archivo Excel</span>
                          <p className="text-[11px] text-emerald-800">Cargar nómina o listado de socios</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          onOpenExcelImport();
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                        <span>Abrir Importador</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl border-2 border-blue-300 bg-blue-50/70 space-y-2">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold text-blue-950 text-xs block">Compartir la Aplicación</span>
                          <p className="text-[11px] text-blue-800">Enlace directo o código QR</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          onOpenShareApp();
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Share2 className="w-4 h-4 text-blue-100" />
                        <span>Compartir App</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <span className="font-bold text-slate-700 text-xs block">Restaurar Socios de Prueba</span>
                      <p className="text-[11px] text-slate-500">Carga la nómina modelo con cédulas de ejemplo.</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('¿Restaurar socios de prueba?')) onResetMembers();
                        }}
                        className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        Restaurar Lista Modelo
                      </button>
                    </div>

                    <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 space-y-1.5">
                      <span className="font-bold text-rose-800 text-xs block">Vaciar Lista de Socios</span>
                      <p className="text-[11px] text-rose-600">Borra todos los registros para importar un nuevo Excel limpio.</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('¿Vaciar la lista de socios?')) onClearMembers();
                        }}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Vaciar Base de Datos
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Bottom Close */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Cerrar Configuración
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
