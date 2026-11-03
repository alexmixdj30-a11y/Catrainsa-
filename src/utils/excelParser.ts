import * as XLSX from 'xlsx';
import { Member } from '../types';
import { normalizeCedula } from './storage';

export interface ParseResult {
  members: Member[];
  errors: string[];
  totalRows: number;
  availableColumns: string[];
  sheetNames: string[];
  detectedHeaderRow: number;
}

/**
 * Parsea montos financieros de manera exhaustiva soportando:
 * - Números nativos de Excel (enteros y flotantes)
 * - Paréntesis contables para valores negativos: (1.500,00) -> -1500
 * - Signos negativos al inicio o final: -500 o 500-
 * - Celdas con texto de moneda: Bs., Bs, VES, VEF, $, USD, EUR, €
 * - Formato latino/europeo (1.250,50) y anglosajón (1,250.50)
 * - Separadores de miles con puntos o comas
 * - Valores vacíos, guiones contables '-', 'N/A'
 */
export function parseFinancialNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }

  let str = String(val).trim();
  if (
    !str ||
    str === '-' ||
    str === '--' ||
    str === '—' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === '#n/a' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'none' ||
    str === '0' ||
    str === '0.00' ||
    str === '0,00'
  ) {
    return 0;
  }

  // Detectar número contable negativo en paréntesis: (1,250.50) o (1.250,50)
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  } else if (str.endsWith('-')) {
    isNegative = true;
    str = str.slice(0, -1).trim();
  }

  // Remover palabras y símbolos de moneda sin alterar puntos y comas decimales
  str = str
    .replace(/cr|db|dr|bs\.?|ves|vef|usd|eur|\$|€/gi, '')
    .replace(/\s+/g, '');

  if (!str) return 0;

  let parsed = 0;
  // Si contiene tanto comas como puntos
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Formato latino: 1.250,50 -> la coma es decimal
      const clean = str.replace(/\./g, '').replace(',', '.');
      parsed = parseFloat(clean);
    } else {
      // Formato anglosajón: 1,250.50 -> el punto es decimal
      const clean = str.replace(/,/g, '');
      parsed = parseFloat(clean);
    }
  } else if (str.includes(',')) {
    // Solo comas
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal latino ej 1250,50 o 0,00
      parsed = parseFloat(str.replace(',', '.'));
    } else {
      // Miles ej 1,250 o 1,250,000
      parsed = parseFloat(str.replace(/,/g, ''));
    }
  } else if (str.includes('.')) {
    // Solo puntos
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal anglosajón ej 1250.50 o 0.00
      parsed = parseFloat(str);
    } else {
      // Puntos de miles ej 1.250 o 1.250.000
      parsed = parseFloat(str.replace(/\./g, ''));
    }
  } else {
    parsed = parseFloat(str);
  }

  if (isNaN(parsed)) return 0;
  return isNegative ? -Math.abs(parsed) : parsed;
}

export function parseExcelFile(
  fileData: ArrayBuffer, 
  customMapping?: Record<string, string>,
  targetSheetName?: string
): Promise<ParseResult> {
  return new Promise((resolve) => {
    try {
      const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
      const sheetNames = workbook.SheetNames;
      if (!sheetNames || sheetNames.length === 0) {
        resolve({
          members: [],
          errors: ['El archivo Excel está vacío o no contiene hojas de cálculo.'],
          totalRows: 0,
          availableColumns: [],
          sheetNames: [],
          detectedHeaderRow: 0,
        });
        return;
      }

      const activeSheetName = targetSheetName && sheetNames.includes(targetSheetName)
        ? targetSheetName
        : sheetNames[0];

      const worksheet = workbook.Sheets[activeSheetName];
      // Convertir toda la hoja a una matriz 2D para escanear encabezados incluso si hay títulos arriba
      const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rawMatrix.length === 0) {
        resolve({
          members: [],
          errors: ['No se encontraron datos en la hoja seleccionada.'],
          totalRows: 0,
          availableColumns: [],
          sheetNames,
          detectedHeaderRow: 0,
        });
        return;
      }

      // 1. Encontrar la fila de encabezados principal
      let headerRowIndex = 0;
      let maxScore = -1;

      const headerKeywords = [
        'cedula', 'cédula', 'ci', 'c.i.', 'identificacion', 'documento',
        'nombre', 'nombres', 'socio', 'trabajador', 'empleado',
        'aporte', 'ahorro', 'haberes', 'prestamo', 'préstamo', 'saldo', 'disponible',
        'deuda', 'credito', 'crédito', 'ptmo', 'pto', 'pcp', 'plp', 'pmp'
      ];

      for (let r = 0; r < Math.min(rawMatrix.length, 30); r++) {
        const row = rawMatrix[r];
        if (!Array.isArray(row)) continue;

        let score = 0;
        for (const cell of row) {
          if (!cell) continue;
          const cleanCell = String(cell).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          for (const kw of headerKeywords) {
            if (cleanCell === kw || cleanCell.includes(kw)) {
              score += 2;
            }
          }
        }

        if (score > maxScore && score >= 2) {
          maxScore = score;
          headerRowIndex = r;
        }
      }

      // Detectar si hay fila de subencabezados o encabezados combinados (muy común en Cajas de Ahorro: fila 1 PRESTAMOS, fila 2 CORTO PLAZO / LARGO PLAZO)
      let nextRowHasSubheaders = false;
      const nextRowIdx = headerRowIndex + 1;
      if (nextRowIdx < rawMatrix.length) {
        const nextRow = rawMatrix[nextRowIdx];
        if (Array.isArray(nextRow)) {
          let textCells = 0;
          for (const cell of nextRow) {
            if (cell && typeof cell === 'string' && isNaN(Number(cell.replace(/\D/g, ''))) && cell.trim().length > 1) {
              textCells++;
            }
          }
          if (textCells >= 2) {
            nextRowHasSubheaders = true;
          }
        }
      }

      const mainHeaderRow = rawMatrix[headerRowIndex] || [];
      const subHeaderRow = nextRowHasSubheaders ? (rawMatrix[nextRowIdx] || []) : [];

      // Determinar número total de columnas
      const maxColCount = Math.max(mainHeaderRow.length, subHeaderRow.length, 1);
      const availableColumns: string[] = [];

      let lastParentHeader = '';
      for (let c = 0; c < maxColCount; c++) {
        const mainVal = String(mainHeaderRow[c] || '').trim();
        const subVal = String(subHeaderRow[c] || '').trim();

        // En hojas contables, si mainVal viene con título (ej: "PRESTAMOS") y las siguientes celdas están vacías por fusión
        if (mainVal) {
          lastParentHeader = mainVal;
        }

        let combined = '';
        if (nextRowHasSubheaders) {
          if (mainVal && subVal && mainVal !== subVal) {
            combined = `${mainVal} - ${subVal}`;
          } else if (subVal && lastParentHeader && lastParentHeader !== subVal) {
            combined = `${lastParentHeader} - ${subVal}`;
          } else if (subVal) {
            combined = subVal;
          } else if (mainVal) {
            combined = mainVal;
          }
        } else {
          combined = mainVal;
        }

        availableColumns.push(combined || `Columna_${c + 1}`);
      }

      // La fila de inicio de datos es después de los encabezados
      const dataStartRow = nextRowHasSubheaders ? headerRowIndex + 2 : headerRowIndex + 1;

      // Normalizador para comparaciones insensibles a mayúsculas, acentos y signos
      const normStr = (s: string) => 
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').trim();
      
      const stripStr = (s: string) => 
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

      // Función auxiliar para buscar índice de columna por alias
      const findColumnIndex = (possibleAliases: string[], explicitCustomKeys: string[] = []): number => {
        // 1. Mapeo manual explícito proporcionado por el usuario
        if (customMapping) {
          for (const key of explicitCustomKeys) {
            if (customMapping[key]) {
              const mappedColName = customMapping[key];
              const idx = availableColumns.indexOf(mappedColName);
              if (idx !== -1) return idx;
            }
          }
        }

        // 2. Coincidencia exacta normalizada
        for (let i = 0; i < availableColumns.length; i++) {
          const colClean = normStr(availableColumns[i]);
          for (const alias of possibleAliases) {
            const aliasClean = normStr(alias);
            if (colClean === aliasClean) return i;
          }
        }

        // 3. Coincidencia por inclusión de alias dentro del encabezado
        for (let i = 0; i < availableColumns.length; i++) {
          const colClean = normStr(availableColumns[i]);
          for (const alias of possibleAliases) {
            const aliasClean = normStr(alias);
            if (colClean.includes(aliasClean)) return i;
          }
        }

        return -1;
      };

      // 1. Cédula
      let colIdxCedula = 0;
      if (customMapping && customMapping['cedula']) {
        const mappedIdx = availableColumns.indexOf(customMapping['cedula']);
        if (mappedIdx !== -1) colIdxCedula = mappedIdx;
      } else {
        const detectedCed = findColumnIndex([
          'cedula', 'cédula', 'ci', 'c.i.', 'identificacion', 'documento',
          'cedula identidad', 'c i', 'documento identidad', 'num cedula'
        ], ['cedula']);
        if (detectedCed !== -1) colIdxCedula = detectedCed;
      }

      // 2. Nombre
      let colIdxNombre = findColumnIndex([
        'nombre y apellido', 'nombres y apellidos', 'apellidos y nombres',
        'nombre', 'nombres', 'nombre completo', 'socio', 'asociado', 'trabajador', 'empleado', 'beneficiario'
      ], ['nombre', 'nombres', 'socio']);
      if (colIdxNombre === -1 && availableColumns.length > 1) {
        colIdxNombre = 1; // Columna B por defecto
      }

      // 3. Aporte Socio
      let colIdxAporteSocio = -1;
      if (customMapping && customMapping['aporteSocio']) {
        const mappedIdx = availableColumns.indexOf(customMapping['aporteSocio']);
        if (mappedIdx !== -1) colIdxAporteSocio = mappedIdx;
      } else {
        const detectedAporte = findColumnIndex([
          'aporte socio', 'ahorro socio', 'aporte personal', 'ahorro personal',
          'aporte empleado', 'aporte asociado', 'retencion socio', 'ap socio'
        ], ['aporteSocio', 'aporte_socio', 'aportePersonal']);
        if (detectedAporte !== -1) {
          colIdxAporteSocio = detectedAporte;
        } else if (availableColumns.length > 2 && colIdxCedula !== 2 && colIdxNombre !== 2) {
          colIdxAporteSocio = 2; // Columna C habitual
        }
      }

      // 4. Aporte Patronal
      let colIdxAportePatronal = -1;
      if (customMapping && customMapping['aportePatronal']) {
        const mappedIdx = availableColumns.indexOf(customMapping['aportePatronal']);
        if (mappedIdx !== -1) colIdxAportePatronal = mappedIdx;
      } else {
        colIdxAportePatronal = findColumnIndex([
          'aporte patronal', 'ahorro patronal', 'patronal', 'empresa', 'patrono',
          'aporte empresa', 'aporte instituto', 'ap patronal', 'institucional'
        ], ['aportePatronal', 'aporte_patronal']);
      }

      // 5. Total Haberes
      let colIdxTotalHaberes = -1;
      if (customMapping && customMapping['totalHaberes']) {
        const mappedIdx = availableColumns.indexOf(customMapping['totalHaberes']);
        if (mappedIdx !== -1) colIdxTotalHaberes = mappedIdx;
      } else {
        colIdxTotalHaberes = findColumnIndex([
          'total haberes', 'haberes', 'haber', 'haberes acumulados',
          'total ahorro', 'total acumulado', 'saldo haberes', 'haberes totales', 'total ahorros', 'ahorro total'
        ], ['totalHaberes', 'total_haberes', 'haberes']);
      }

      // 6. Saldo Disponible
      let colIdxSaldoDisponible = -1;
      if (customMapping && customMapping['saldoDisponible']) {
        const mappedIdx = availableColumns.indexOf(customMapping['saldoDisponible']);
        if (mappedIdx !== -1) colIdxSaldoDisponible = mappedIdx;
      } else {
        colIdxSaldoDisponible = findColumnIndex([
          'saldo disponible', 'disponible', 'disponibilidad', 'saldo neto',
          'neto disponible', 'disponible retiro', 'liquidez', 'saldo libre'
        ], ['saldoDisponible', 'disponible', 'saldo_disponible']);
      }

      // 7. Préstamo Pendiente
      let colIdxPrestamo = -1;
      if (customMapping && customMapping['prestamo']) {
        const mappedIdx = availableColumns.indexOf(customMapping['prestamo']);
        if (mappedIdx !== -1) colIdxPrestamo = mappedIdx;
      } else {
        colIdxPrestamo = findColumnIndex([
          'prestamo pendiente', 'prestamo', 'préstamo', 'deuda', 'prestamos',
          'credito', 'crédito', 'ptmo', 'saldo deudor', 'total prestamo'
        ], ['prestamo', 'prestamoPendiente']);
      }

      const colIdxDepto = findColumnIndex(['departamento', 'area', 'unidad', 'gerencia', 'cargo'], ['departamento']);
      const colIdxTel = findColumnIndex(['telefono', 'teléfono', 'celular', 'whatsapp', 'movil'], ['telefono']);

      const members: Member[] = [];
      const errors: string[] = [];
      const todayStr = new Date().toLocaleDateString('es-VE');

      // Procesar filas de datos a partir de dataStartRow
      for (let r = dataStartRow; r < rawMatrix.length; r++) {
        const row = rawMatrix[r];
        if (!row || row.length === 0) continue;

        // Extraer valor de cédula
        const rawCedVal = colIdxCedula !== -1 ? row[colIdxCedula] : row[0];
        const cleanCed = normalizeCedula(rawCedVal);

        // Si la fila no tiene cédula válida, se ignora (ej: filas vacías o totales finales)
        if (!cleanCed) {
          continue;
        }

        // Extraer nombre
        let nombre = '';
        if (colIdxNombre !== -1 && row[colIdxNombre]) {
          nombre = String(row[colIdxNombre]).trim();
        }
        if (!nombre && row[1]) {
          nombre = String(row[1]).trim();
        }
        if (!nombre) {
          nombre = `Socio C.I. ${cleanCed}`;
        }

        // Extraer Aporte Socio
        let aporteSocio = 0;
        if (colIdxAporteSocio !== -1 && row[colIdxAporteSocio] !== undefined && row[colIdxAporteSocio] !== '') {
          aporteSocio = Math.abs(parseFinancialNumber(row[colIdxAporteSocio]));
        } else if (row[2] !== undefined && row[2] !== '' && colIdxPrestamo !== 2) {
          aporteSocio = Math.abs(parseFinancialNumber(row[2]));
        }

        // Extraer Aporte Patronal
        let aportePatronal = 0;
        if (colIdxAportePatronal !== -1 && row[colIdxAportePatronal] !== undefined && row[colIdxAportePatronal] !== '') {
          aportePatronal = Math.abs(parseFinancialNumber(row[colIdxAportePatronal]));
        }

        // Extraer Total Haberes
        let totalHaberes = 0;
        if (colIdxTotalHaberes !== -1 && row[colIdxTotalHaberes] !== undefined && row[colIdxTotalHaberes] !== '') {
          totalHaberes = Math.abs(parseFinancialNumber(row[colIdxTotalHaberes]));
        }
        // Si no se proporcionó columna de Total Haberes o vino en 0 pero hay aportes, sumar ambos
        if (totalHaberes === 0 && (aporteSocio > 0 || aportePatronal > 0)) {
          totalHaberes = aporteSocio + aportePatronal;
        }

        // Extraer Préstamo Pendiente
        let prestamoPendiente = 0;
        if (colIdxPrestamo !== -1 && row[colIdxPrestamo] !== undefined && row[colIdxPrestamo] !== '') {
          prestamoPendiente = Math.abs(parseFinancialNumber(row[colIdxPrestamo]));
        }

        // Extraer Saldo Disponible
        let saldoDisponible = 0;
        if (colIdxSaldoDisponible !== -1 && row[colIdxSaldoDisponible] !== '' && row[colIdxSaldoDisponible] !== undefined) {
          saldoDisponible = parseFinancialNumber(row[colIdxSaldoDisponible]);
        } else {
          saldoDisponible = totalHaberes - prestamoPendiente;
        }

        const departamento = colIdxDepto !== -1 && row[colIdxDepto] ? String(row[colIdxDepto]).trim() : undefined;
        const telefono = colIdxTel !== -1 && row[colIdxTel] ? String(row[colIdxTel]).trim() : undefined;

        members.push({
          id: `excel_${cleanCed}_${r}_${Date.now()}`,
          cedula: cleanCed,
          nombre,
          aporteSocio,
          aportePatronal,
          totalHaberes,
          prestamoPendiente,
          saldoDisponible,
          fechaActualizacion: todayStr,
          departamento,
          telefono,
        });
      }

      if (members.length === 0) {
        errors.push('No se pudieron extraer registros válidos. Verifique que la hoja contenga una columna con el número de Cédula.');
      }

      resolve({
        members,
        errors,
        totalRows: rawMatrix.length,
        availableColumns,
        sheetNames,
        detectedHeaderRow: headerRowIndex + 1,
      });

    } catch (err: any) {
      resolve({
        members: [],
        errors: [`Error crítico procesando el archivo: ${err.message || 'Formato de archivo no válido'}`],
        totalRows: 0,
        availableColumns: [],
        sheetNames: [],
        detectedHeaderRow: 0,
      });
    }
  });
}

/**
 * Genera y descarga una plantilla Excel modelo con encabezados transparentes y compatibles
 */
export function downloadSampleExcelTemplate(): void {
  const sampleData = [
    {
      'Cédula': '18456789',
      'Nombre y Apellido': 'Carlos Alberto Mendoza Rojas',
      'Aporte Socio': 1850.50,
      'Aporte Patronal': 1850.50,
      'Total Haberes': 3701.00,
      'Préstamo Pendiente': 650.00,
      'Saldo Disponible': 3051.00,
      'Departamento': 'Gerencia de Operaciones',
      'Teléfono': '+58 412 555-1201',
    },
    {
      'Cédula': '14238910',
      'Nombre y Apellido': 'María Eugenia Salazar Blanco',
      'Aporte Socio': 2400.00,
      'Aporte Patronal': 2400.00,
      'Total Haberes': 4800.00,
      'Préstamo Pendiente': 5900.00,
      'Saldo Disponible': -1100.00,
      'Departamento': 'Talento Humano',
      'Teléfono': '+58 416 888-4321',
    },
    {
      'Cédula': '20984123',
      'Nombre y Apellido': 'José Gregorio Hernández Pérez',
      'Aporte Socio': 1600.00,
      'Aporte Patronal': 1600.00,
      'Total Haberes': 3200.00,
      'Préstamo Pendiente': 3200.00,
      'Saldo Disponible': 0.00,
      'Departamento': 'Contabilidad y Finanzas',
      'Teléfono': '+58 424 777-6543',
    },
    {
      'Cédula': '16890345',
      'Nombre y Apellido': 'Ana Gabriela Silva Contreras',
      'Aporte Socio': 4200.75,
      'Aporte Patronal': 4200.75,
      'Total Haberes': 8401.50,
      'Préstamo Pendiente': 1200.00,
      'Saldo Disponible': 7201.50,
      'Departamento': 'Tecnología e Informática',
      'Teléfono': '+58 414 333-9087',
    },
    {
      'Cédula': '23112456',
      'Nombre y Apellido': 'Roberto Alejandro Ramírez Díaz',
      'Aporte Socio': 950.00,
      'Aporte Patronal': 950.00,
      'Total Haberes': 1900.00,
      'Préstamo Pendiente': 2400.00,
      'Saldo Disponible': -500.00,
      'Departamento': 'Mantenimiento General',
      'Teléfono': '+58 412 111-7788',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 34 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 28 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Socios_Caja_Ahorro');
  XLSX.writeFile(workbook, 'Plantilla_Socios_Caja_Ahorro.xlsx');
}
