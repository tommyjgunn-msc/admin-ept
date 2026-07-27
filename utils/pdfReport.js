// utils/pdfReport.js — renders a results report for one sitting as a PDF.
//
// Uses pdfkit's standalone build: it embeds the standard font metrics, which
// the normal entry point loads from .afm files on disk. Those files do not
// survive Next.js's serverless bundling, so the standalone build is the one
// that actually works once deployed.
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';

const INK = '#12171B';
const MUTED = '#5A6672';
const RULE = '#D8D8D4';
const RED = '#E0273F';

const COLUMNS = [
  { key: 'name', label: 'Student', width: 172 },
  { key: 'ept', label: 'EPT ID', width: 66 },
  { key: 'reading', label: 'Reading', width: 54, align: 'right' },
  { key: 'writing', label: 'Writing', width: 54, align: 'right' },
  { key: 'listening', label: 'Listening', width: 58, align: 'right' },
  { key: 'total', label: 'Total', width: 56, align: 'right' },
  { key: 'pct', label: '%', width: 40, align: 'right' },
];

/**
 * Clip to the column width by measuring the actual rendered string. Long names
 * are common in this cohort and pdfkit's own lineBreak:false still wrapped
 * them, which pushed rows into each other; measuring is the reliable fix.
 */
function clip(doc, text, width) {
  const value = String(text ?? '');
  if (doc.widthOfString(value) <= width - 4) return value;
  let cut = value;
  while (cut.length > 1 && doc.widthOfString(`${cut}…`) > width - 4) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

function cell(doc, text, x, y, width, align = 'left') {
  doc.text(clip(doc, text, width), x, y, { width, align, lineBreak: false });
}

function sectionCell(entry) {
  if (!entry) return '—';
  if (entry.state === 'review') return 'review';
  if (entry.state === 'ungraded') return 'ungraded';
  return `${entry.score}/${entry.total}`;
}

function drawHeaderRow(doc, y) {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED);
  let x = doc.page.margins.left;
  for (const col of COLUMNS) {
    cell(doc, col.label.toUpperCase(), x, y, col.width, col.align);
    x += col.width;
  }
  doc.moveTo(doc.page.margins.left, y + 12)
    .lineTo(doc.page.width - doc.page.margins.right, y + 12)
    .strokeColor(RULE).lineWidth(0.5).stroke();
  return y + 19;
}

/**
 * @param {{date_iso:string,date_label:string,students:Array,summary:object}} sitting
 * @returns {Promise<Buffer>}
 */
export function buildResultsPdf(sitting) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 46 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    // Masthead
    doc.font('Helvetica-Bold').fontSize(16).fillColor(INK)
      .text('English Proficiency Test — Results', left, 46);
    doc.font('Helvetica').fontSize(10.5).fillColor(MUTED)
      .text(sitting.date_label, { continued: false });
    doc.fontSize(8.5).fillColor(MUTED)
      .text('African Leadership University, Kigali', { continued: false });
    doc.moveDown(0.6);

    // Summary strip
    const s = sitting.summary;
    const summaryY = doc.y;
    doc.moveTo(left, summaryY).lineTo(right, summaryY)
      .strokeColor(RULE).lineWidth(0.5).stroke();

    doc.font('Helvetica').fontSize(9).fillColor(INK);
    const stats = [
      `${s.students} students`,
      `${s.complete} complete`,
      s.averagePercentage !== null ? `average ${s.averagePercentage}%` : 'average n/a',
      `${s.needsReview} needing review`,
      `${s.flagged} proctoring-flagged`,
    ];
    doc.text(stats.join('     ·     '), left, summaryY + 7, { width: right - left });
    doc.moveDown(1);

    let y = doc.y + 4;
    y = drawHeaderRow(doc, y);

    for (const student of sitting.students) {
      // Page break, repeating the column header on the new page.
      if (y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        y = doc.page.margins.top;
        y = drawHeaderRow(doc, y);
      }

      const flagged = student.anyFlagged;
      doc.font('Helvetica').fontSize(9).fillColor(flagged ? RED : INK);

      const values = {
        name: student.name || '(no Auth record)',
        ept: student.student_id,
        reading: sectionCell(student.sections.reading),
        writing: sectionCell(student.sections.writing),
        listening: sectionCell(student.sections.listening),
        total: student.complete ? `${student.totalScore}/${student.totalPossible}` : '—',
        pct: student.overallPercentage !== null && student.complete
          ? `${student.overallPercentage}%` : '—',
      };

      let x = left;
      for (const col of COLUMNS) {
        cell(doc, values[col.key], x, y, col.width, col.align);
        x += col.width;
      }

      if (flagged) {
        doc.fontSize(7).fillColor(RED)
          .text('proctoring flag raised', left, y + 10, { width: 200, lineBreak: false });
        y += 8;
      }

      y += 15;
      doc.moveTo(left, y - 4).lineTo(right, y - 4)
        .strokeColor('#EFEFEC').lineWidth(0.5).stroke();
    }

    // Footnotes — the report is read by people who did not build the system,
    // so the non-obvious states are spelled out rather than left as jargon.
    if (y > doc.page.height - doc.page.margins.bottom - 70) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
      .text(
        'Reading and listening are machine-scored. Writing is scored out of 50 against CEFR criteria; ' +
        '"review" means a mark could not be read automatically and the script needs a human. ' +
        '"ungraded" means the script has not been marked yet. Totals and percentages are shown only ' +
        'where all three sections carry a mark. A proctoring flag records that monitoring signals were ' +
        'raised during the sitting; it is a prompt to look, not a finding of misconduct.',
        left, y + 10, { width: right - left, align: 'left' }
      );

    doc.fontSize(7).fillColor(MUTED)
      .text(`Generated ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`,
        left, doc.page.height - doc.page.margins.bottom - 10, { width: right - left });

    doc.end();
  });
}
