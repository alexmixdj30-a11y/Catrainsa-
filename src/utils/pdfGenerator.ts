import { jsPDF } from 'jspdf';
import { InstitutionConfig, Member } from '../types';
import { formatCedula, formatCurrency } from './storage';

/**
 * Loads an image from a URL or base64 and converts it to a PNG data URL for jsPDF.
 */
async function getImageDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 2500); // 2.5s safety timeout
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (e) {
        console.warn('Error convirtiendo imagen a dataURL:', e);
      }
      resolve(null);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Generates an official, clean, standalone PDF of the member's statement
 * and triggers an immediate direct download onto mobile phones and desktops.
 */
export async function downloadMemberStatementPdf(member: Member, config: InstitutionConfig): Promise<void> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    const isNoAvailability = member.saldoDisponible <= 0;
    const isNegative = member.saldoDisponible < 0;
    const printDate = new Date().toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const printTime = new Date().toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Header Border Top
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;

    // Load Logo for Header
    const logoData = config.logoUrl ? await getImageDataUrl(config.logoUrl) : null;
    let textX = margin;
    let textWidth = contentWidth;
    let textY = y + 2;

    if (logoData) {
      // 1) Logo en la parte superior al lado de la descripción
      const logoSize = 25;
      doc.addImage(logoData, 'PNG', margin, y + 1, logoSize, logoSize);
      textX = margin + logoSize + 4;
      textWidth = contentWidth - (logoSize + 4);
    }

    // Institution Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    const titleLines = doc.splitTextToSize(config.nombre.toUpperCase(), textWidth);
    doc.text(titleLines, textX, textY + 3);
    textY += titleLines.length * 4.8 + 1;

    // Subheader details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`RIF: ${config.rif}  |  Sector: ${config.sector}`, textX, textY + 2);
    textY += 3.8;
    doc.text(`Dirección: ${config.direccion}`, textX, textY + 2);
    textY += 3.8;
    doc.text(`Tel/WhatsApp: ${config.telefonoWhatsapp}  |  Correo: ${config.correo}`, textX, textY + 2);
    textY += 4.5;

    y = Math.max(y + 27, textY + 2);

    // Line under header
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    // 2. Document Title Banner
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 8.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138); // Blue
    doc.text('ESTADO DE CUENTA Y DISPONIBILIDAD DE HABERES', pageWidth / 2, y + 5.8, { align: 'center' });
    y += 13;

    // 3. Member Info Card Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    
    // Columna Izquierda: Datos del Socio
    doc.setFont('helvetica', 'bold');
    doc.text('Socio:', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(member.nombre, margin + 20, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Cédula:', margin + 4, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`V-${formatCedula(member.cedula)}`, margin + 20, y + 12);

    if (member.departamento) {
      doc.setFont('helvetica', 'bold');
      doc.text('Depto:', margin + 4, y + 17);
      doc.setFont('helvetica', 'normal');
      doc.text(member.departamento, margin + 20, y + 17);
    }

    // Columna Derecha: Fecha y Hora (Se ELIMINÓ Ref N° y su número)
    const col2X = margin + contentWidth / 2 + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', col2X, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(printDate, col2X + 16, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Hora:', col2X, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(printTime, col2X + 16, y + 14);

    y += 25;

    // 4. Availability Status Banner
    if (isNoAvailability) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(252, 165, 165);
      doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(153, 27, 27);
      doc.text('ADVERTENCIA: EL SOCIO NO TIENE DISPONIBILIDAD', margin + 4, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.text(
        isNegative 
          ? `Saldo negativo de ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}. El préstamo excede sus haberes.`
          : `Saldo disponible de ${formatCurrency(0, config.monedaSimbolo)}. Sus haberes están comprometidos en préstamos.`,
        margin + 4,
        y + 9.5
      );
    } else {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(22, 101, 52);
      doc.text('CONDICIÓN: DISPONIBILIDAD ACTIVA', margin + 4, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(21, 128, 61);
      doc.text(`El socio cuenta con un saldo disponible neto de ${formatCurrency(member.saldoDisponible, config.monedaSimbolo)}.`, margin + 4, y + 9.5);
    }
    y += 17;

    // 5. Table of Financial Concepts
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CONCEPTO', margin + 4, y + 4.8);
    doc.text('DESCRIPCIÓN', margin + 55, y + 4.8);
    doc.text(`MONTO (${config.monedaSimbolo})`, margin + contentWidth - 4, y + 4.8, { align: 'right' });
    y += 7;

    const drawRow = (
      concepto: string, 
      desc: string, 
      monto: string, 
      isHighlighted: boolean = false, 
      isFinal: boolean = false,
      textColor: [number, number, number] = [15, 23, 42]
    ) => {
      const rowHeight = isFinal ? 9 : 7.5;
      if (isHighlighted) {
        doc.setFillColor(239, 246, 255); // light blue
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      } else if (isFinal) {
        if (isNoAvailability) {
          doc.setFillColor(254, 226, 226); // light red
        } else {
          doc.setFillColor(220, 252, 231); // light green
        }
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      // Border bottom
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      doc.setFont('helvetica', isHighlighted || isFinal ? 'bold' : 'normal');
      doc.setFontSize(isFinal ? 9.5 : 8.5);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      doc.text(concepto, margin + 4, y + rowHeight * 0.65);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(desc, margin + 55, y + rowHeight * 0.65);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(monto, margin + contentWidth - 4, y + rowHeight * 0.65, { align: 'right' });

      y += rowHeight;
    };

    // Row 1: Aporte Socio
    drawRow('1. Aporte Socio', 'Ahorro voluntario y retención de nómina', formatCurrency(member.aporteSocio, ''));
    // Row 2: Aporte Patronal
    drawRow('2. Aporte Patronal', 'Aporte legal institucional acumulado', formatCurrency(member.aportePatronal, ''));
    // Row 3: Total Haberes (Highlighted)
    drawRow('TOTAL HABERES', 'Suma acumulada de aportes en la institución', formatCurrency(member.totalHaberes, ''), true, false, [30, 58, 138]);
    // Row 4: Préstamo Pendiente
    drawRow('3. Préstamo Pendiente', 'Compromisos de préstamos por amortizar', formatCurrency(member.prestamoPendiente, ''), false, false, [180, 83, 9]);
    // Row 5: Saldo Disponible
    drawRow(
      'SALDO DISPONIBLE', 
      isNoAvailability ? 'SIN DISPONIBILIDAD' : 'Capacidad neta disponible para retiro o crédito', 
      formatCurrency(member.saldoDisponible, ''), 
      false, 
      true, 
      isNoAvailability ? [153, 27, 27] : [22, 101, 52]
    );

    y += 12;

    // 6. Signatures Area
    const sigColWidth = contentWidth / 2 - 15;
    const sig1X = margin + 10;
    const sig2X = margin + contentWidth / 2 + 10;

    // Load Firmas de los Directivos if present
    const firmasData = config.firmasUrl ? await getImageDataUrl(config.firmasUrl) : null;

    if (firmasData) {
      // 3) Imagen de firmas arriba de "Caja de Ahorro... / Firma y Sello Oficial Autorizado"
      const sigImgWidth = 46;
      const sigImgHeight = 16;
      const sigImgX = sig1X + (sigColWidth - sigImgWidth) / 2;
      doc.addImage(firmasData, 'PNG', sigImgX, y + 1, sigImgWidth, sigImgHeight);
    }

    const lineY = y + 18;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(sig1X, lineY, sig1X + sigColWidth, lineY);
    doc.line(sig2X, lineY, sig2X + sigColWidth, lineY);

    // Texto de firmas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(config.nombre, sig1X + sigColWidth / 2, lineY + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Firma y Sello Oficial Autorizado', sig1X + sigColWidth / 2, lineY + 8.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(member.nombre, sig2X + sigColWidth / 2, lineY + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`C.I. V-${formatCedula(member.cedula)} (Socio)`, sig2X + sigColWidth / 2, lineY + 8.5, { align: 'center' });

    y = lineY + 16;

    // 7. Footer Notice
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentWidth, y);
    y += 4.5;

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('PORTAL CREADO POR ANTONIO ROJAS "Contador Público" | alexmixdj.30@gmail.com | 0412-4238613', pageWidth / 2, y, { align: 'center' });
    y += 3.5;
    doc.text(`Documento emitido electrónicamente el ${printDate} a las ${printTime} por ${config.nombre}.`, pageWidth / 2, y, { align: 'center' });

    // Clean filename
    const cleanCed = member.cedula.replace(/\D/g, '');
    const filename = `Estado_de_Cuenta_V-${cleanCed}.pdf`;

    // Direct save / download to device
    doc.save(filename);
  } catch (error) {
    console.error('Error al generar PDF con jsPDF:', error);
    window.print();
  }
}
