import { DEFAULT_INSTITUTION, DEFAULT_MEMBERS, DEFAULT_PASSWORD } from '../data/defaultData';
import { InstitutionConfig, Member, ThemeColorKey } from '../types';

const STORAGE_KEYS = {
  MEMBERS: 'bda_caja_ahorro_members_v1',
  CONFIG: 'bda_caja_ahorro_config_v1',
  PASSWORD: 'bda_caja_ahorro_pwd_v1',
  THEME: 'bda_caja_ahorro_theme_v1',
};

export function getStoredMembers(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!raw) return DEFAULT_MEMBERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MEMBERS;
  } catch (e) {
    console.error('Error cargando socios de storage', e);
    return DEFAULT_MEMBERS;
  }
}

export function saveStoredMembers(members: Member[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  } catch (e) {
    console.error('Error guardando socios en storage', e);
  }
}

export function getStoredConfig(): InstitutionConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return DEFAULT_INSTITUTION;
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_INSTITUTION, ...parsed };
    if (merged.telefonoWhatsapp === '+58 414 789 6543' || merged.telefonoWhatsapp === '0426-1406807') {
      merged.telefonoWhatsapp = '0412-4238613';
    }
    if (merged.correo === 'atencionsocios@cajadeahorros.com') {
      merged.correo = 'alexmixdj.30@gmail.com';
    }
    return merged;
  } catch (e) {
    console.error('Error cargando configuración', e);
    return DEFAULT_INSTITUTION;
  }
}

export function saveStoredConfig(config: InstitutionConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error guardando configuración', e);
  }
}

export function getStoredPassword(): string {
  try {
    const pwd = localStorage.getItem(STORAGE_KEYS.PASSWORD);
    return pwd || DEFAULT_PASSWORD;
  } catch (e) {
    return DEFAULT_PASSWORD;
  }
}

export function saveStoredPassword(newPassword: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PASSWORD, newPassword);
  } catch (e) {
    console.error('Error guardando contraseña', e);
  }
}

export function getStoredTheme(): ThemeColorKey {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeColorKey;
    if (theme && [
      'azul-bancario',
      'verde-esmeralda',
      'azul-marino',
      'borgoña',
      'indigo-real',
      'dorado-ambar',
      'purpura',
      'grafito-pizarra'
    ].includes(theme)) {
      return theme;
    }
    return 'azul-bancario';
  } catch (e) {
    return 'azul-bancario';
  }
}

export function saveStoredTheme(theme: ThemeColorKey): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (e) {
    console.error('Error guardando tema', e);
  }
}

export async function fetchServerData(): Promise<{
  members?: Member[];
  config?: InstitutionConfig;
  theme?: ThemeColorKey;
  password?: string;
} | null> {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (e) {
    // Modo offline o sin respuesta
  }
  return null;
}

export async function uploadLogoToServer(base64Image: string): Promise<string | null> {
  try {
    const res = await fetch('/api/upload-logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.logoUrl) {
      return json.logoUrl;
    }
  } catch (e) {
    console.error('Error subiendo logo al servidor:', e);
  }
  return null;
}

export async function uploadFirmasToServer(base64Image: string): Promise<string | null> {
  try {
    const res = await fetch('/api/upload-firmas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.firmasUrl) {
      return json.firmasUrl;
    }
  } catch (e) {
    console.error('Error subiendo firmas al servidor:', e);
  }
  return null;
}

export async function syncServerData(payload: {
  members?: Member[];
  config?: InstitutionConfig;
  theme?: ThemeColorKey;
  password?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Normaliza una cédula extrayendo únicamente los dígitos.
 * Maneja valores numéricos de Excel (ej: 18456789.0), cadenas con prefijos (V-18.456.789, E-, J-), etc.
 */
export function normalizeCedula(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();
  
  // Si Excel guardó el número como decimal tipo 18456789.0 o 18456789.00
  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length === 2 && (/^0+$/.test(parts[1]) || parts[1] === '')) {
      str = parts[0];
    }
  }

  // Eliminar cualquier caracter no numérico
  const digits = str.replace(/\D/g, '');
  // Quitar ceros a la izquierda innecesarios pero mantener al menos un dígito
  const stripped = digits.replace(/^0+/, '');
  return stripped || digits;
}

/**
 * Verifica si un socio coincide con la consulta (por cédula exacta, cédula normalizada, o nombre)
 */
export function matchesMemberQuery(member: { cedula: string; nombre: string }, query: string): boolean {
  if (!query) return false;
  const cleanQuery = normalizeCedula(query);
  const cleanMemberCed = normalizeCedula(member.cedula);

  // Coincidencia exacta de cédula normalizada
  if (cleanQuery && cleanMemberCed === cleanQuery) {
    return true;
  }

  // Coincidencia parcial si la cédula contiene los dígitos buscados
  if (cleanQuery.length >= 4 && cleanMemberCed.includes(cleanQuery)) {
    return true;
  }

  // Búsqueda por nombre (ej: el usuario busca "Carlos" o "Mendoza")
  const normQueryText = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const normName = member.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (normQueryText.length >= 3 && normName.includes(normQueryText)) {
    return true;
  }

  return false;
}

/**
 * Formatea un número de cédula con puntos de separación visual
 * Ej: 18456789 -> 18.456.789
 */
export function formatCedula(cedula: string | number): string {
  const digits = normalizeCedula(cedula);
  if (!digits) return String(cedula || '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}


/**
 * Formatea montos monetarios con separador de miles y dos decimales
 */
export function formatCurrency(amount: number, symbol: string = 'Bs.'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formattedNumber = absAmount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}${symbol} ${formattedNumber}`;
}
