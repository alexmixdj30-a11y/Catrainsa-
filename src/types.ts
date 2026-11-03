export interface Member {
  id: string;
  cedula: string;
  nombre: string;
  aporteSocio: number;
  aportePatronal: number;
  totalHaberes: number;
  prestamoPendiente: number;
  saldoDisponible: number;
  fechaActualizacion?: string;
  departamento?: string;
  telefono?: string;
}

export interface InstitutionConfig {
  nombre: string;
  rif: string;
  sector: string;
  direccion: string;
  telefonoWhatsapp: string;
  correo: string;
  logoUrl?: string; // custom base64 or URL
  logoTipo?: 'icono' | 'imagen';
  firmasUrl?: string; // custom base64 or URL with signatures of directors
  monedaSimbolo: string;
}

export type ThemeColorKey = 
  | 'azul-bancario'
  | 'verde-esmeralda'
  | 'azul-marino'
  | 'borgoña'
  | 'indigo-real'
  | 'dorado-ambar'
  | 'purpura'
  | 'grafito-pizarra';

export interface ThemeConfig {
  key: ThemeColorKey;
  name: string;
  colorHex: string;
  primaryClass: string;
  primaryHoverClass: string;
  textClass: string;
  bgLightClass: string;
  borderClass: string;
  ringClass: string;
  gradientFrom: string;
  gradientTo: string;
  headerBg: string;
}
