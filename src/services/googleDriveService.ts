import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { parseExcelFile, ParseResult } from '../utils/excelParser';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Enforce prompt so user can select their account alexmixdj.30@gmail.com
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (Do NOT store in localStorage or sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error al iniciar sesión con Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

/**
 * Searches user's Google Drive for files matching the target name, focusing on DATOS_CATRAINSA
 */
export async function searchDriveFiles(queryName: string = 'DATOS_CATRAINSA'): Promise<DriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debes iniciar sesión con Google para buscar en Google Drive.');
  }

  // Construct query: files whose name contains queryName and are not in trash
  const q = `name contains '${queryName}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=20`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Error ${res.status} al consultar Google Drive`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Downloads a spreadsheet file (Excel binary or Google Sheet exported as Excel)
 */
export async function downloadDriveSpreadsheetBuffer(file: DriveFileItem): Promise<ArrayBuffer> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debes iniciar sesión con Google para descargar el archivo.');
  }

  let downloadUrl = '';
  // Check if it's a native Google Sheet or an uploaded Excel file (.xlsx / .xls)
  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    // Export native Google Sheet to standard XLSX format
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
  } else {
    // Download raw binary (e.g. uploaded .xlsx or .xls file)
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  }

  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Error ${res.status} al descargar el archivo desde Google Drive`);
  }

  return await res.arrayBuffer();
}

/**
 * High-level helper: Finds DATOS_CATRAINSA in Google Drive, downloads it, and parses member data
 */
export async function loadAndParseDatosCatrainsa(
  selectedFileId?: string,
  sheetName?: string,
  customMapping?: Record<string, string>
): Promise<{
  file: DriveFileItem;
  parseResult: ParseResult;
  availableFiles: DriveFileItem[];
}> {
  // 1. Search for matching files
  const files = await searchDriveFiles('DATOS_CATRAINSA');
  if (files.length === 0) {
    // Also try case-insensitive search for Catrainsa
    const fallbackFiles = await searchDriveFiles('catrainsa');
    if (fallbackFiles.length === 0) {
      throw new Error('No se encontró ningún archivo llamado "DATOS_CATRAINSA" en tu Google Drive. Asegúrate de tener el archivo en tu cuenta.');
    }
    files.push(...fallbackFiles);
  }

  // 2. Determine target file
  let targetFile: DriveFileItem | undefined;
  if (selectedFileId) {
    targetFile = files.find((f) => f.id === selectedFileId);
  }
  if (!targetFile) {
    targetFile = files[0];
  }

  // 3. Download as ArrayBuffer
  const buffer = await downloadDriveSpreadsheetBuffer(targetFile);

  // 4. Parse using standard robust excelParser
  const parseResult = await parseExcelFile(buffer, customMapping, sheetName);

  return {
    file: targetFile,
    parseResult,
    availableFiles: files,
  };
}
