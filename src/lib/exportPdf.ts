/**
 * Serializa la conversación del Playground a un PDF descargable.
 *
 * Usa jsPDF en el cliente. Layout simple: cabecera con título y fecha,
 * cuerpo con turnos prefijados ("Tú" / "Maia"), pie con número de página.
 * El wrap automático lo da `splitTextToSize` — sin html2canvas ni assets
 * externos para mantener el bundle chico.
 */

import { jsPDF } from "jspdf";
import type { MaiaTurn } from "./maiaClient";

const PAGE_MARGIN = 18; // mm
const LINE_HEIGHT = 5.4;
const TITLE_SIZE = 14;
const META_SIZE = 9;
const BODY_SIZE = 10.5;
const ROLE_SIZE = 10;

export function exportConversationToPdf(messages: MaiaTurn[]): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  let y = PAGE_MARGIN;

  // Cabecera
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_SIZE);
  doc.text("Conversación con Maia · Westfield Business School", PAGE_MARGIN, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(META_SIZE);
  doc.setTextColor(110);
  doc.text(
    `Generado el ${new Date().toLocaleString("es")} · ${messages.length} mensajes`,
    PAGE_MARGIN,
    y,
  );
  y += 4;
  doc.setDrawColor(200);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 6;

  doc.setTextColor(0);

  // Cuerpo
  for (const turn of messages) {
    const roleLabel = turn.role === "student" ? "Tú" : "Maia";
    const roleColor: [number, number, number] =
      turn.role === "student" ? [30, 90, 180] : [25, 130, 90];

    const lines = doc.splitTextToSize(turn.content.trim(), contentWidth);
    const blockHeight = LINE_HEIGHT + lines.length * LINE_HEIGHT + 3;

    if (y + blockHeight > pageHeight - PAGE_MARGIN - 8) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(ROLE_SIZE);
    doc.setTextColor(...roleColor);
    doc.text(roleLabel, PAGE_MARGIN, y);
    y += LINE_HEIGHT;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY_SIZE);
    doc.setTextColor(20);
    doc.text(lines, PAGE_MARGIN, y);
    y += lines.length * LINE_HEIGHT + 3;
  }

  // Pie de página con paginación
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(META_SIZE);
    doc.setTextColor(140);
    doc.text(
      `Página ${p} de ${pages}`,
      pageWidth - PAGE_MARGIN,
      pageHeight - 8,
      { align: "right" },
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`maia-conversacion-${stamp}.pdf`);
}
