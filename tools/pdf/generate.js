const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const MD_PATH = path.join(__dirname, '..', '..', 'docs', 'proposal.md');
const OUT_PATH = path.join(__dirname, '..', '..', 'docs', 'Hospital_Management_System_Proposal.pdf');

const COLOR = {
  brand: '#1d4ed8',
  dark: '#1e293b',
  gray: '#64748b',
  light: '#e2e8f0',
  white: '#ffffff',
  tableHeader: '#1d4ed8',
};

const doc = new PDFDocument({ size: 'A4', margins: { top: 70, bottom: 70, left: 65, right: 65 }, bufferPages: true });

const out = fs.createWriteStream(OUT_PATH);
doc.pipe(out);

let pageNumber = 1;

function footer() {
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - 45;
    doc
      .fontSize(8)
      .fillColor(COLOR.gray)
      .text('MediCare — Hospital Management & Appointment Scheduling System | Project Proposal', 65, y, {
        width: doc.page.width - 130,
        align: 'center',
      });
  }
  pageNumber = 1;
}

function ensureSpace(needed = 120) {
  if (doc.y + needed > doc.page.height - 70) doc.addPage();
}

function hr() {
  doc.moveTo(65, doc.y).lineTo(doc.page.width - 65, doc.y).strokeColor(COLOR.light).lineWidth(0.8).stroke();
  doc.moveDown(0.4);
}

function stripInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/`(.+?)`/g, '$1');
}

function drawInline(text, opts) {
  const parts = text.split(/(\*\*.+?\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      doc.font('Helvetica-Bold').fontSize(opts.size || 10).fillColor(COLOR.dark).text(part.slice(2, -2), { continued: true });
    } else if (part.startsWith('`') && part.endsWith('`')) {
      doc.font('Courier').fontSize((opts.size || 10) - 1).fillColor(COLOR.brand).text(part.slice(1, -1), { continued: true });
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      doc.font('Helvetica-Oblique').fontSize(opts.size || 10).fillColor(COLOR.dark).text(part.slice(1, -1), { continued: true });
    } else {
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10).fillColor(COLOR.dark).text(part, { continued: true });
    }
  }
  doc.text('', { continued: false });
}

function heading(text, level) {
  ensureSpace(90);
  const clean = stripInline(text);
  if (level === 1) {
    doc.addPage();
    footer();
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR.brand).text(clean);
  } else if (level === 2) {
    doc.moveDown(1.4);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.brand).text(clean);
  } else if (level === 3) {
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(COLOR.dark).text(clean);
  } else {
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR.dark).text(clean);
  }
  if (level <= 2) {
    hr();
  }
  doc.moveDown(0.4);
}

function paragraph(text) {
  ensureSpace(60);
  drawInline(text, { size: 10 });
  doc.moveDown(0.6);
}

function bullet(text, ordered, index) {
  ensureSpace(40);
  const prefix = ordered ? `${index}. ` : '• ';
  const x = doc.x;
  const markerWidth = doc.widthOfString(prefix, { font: 'Helvetica-Bold', size: 10 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.brand).text(prefix, x, doc.y, { lineBreak: false });
  doc.x = x + markerWidth;
  drawInline(text, { size: 10 });
  doc.x = x;
  doc.moveDown(0.2);
}

function codeBlock(text) {
  ensureSpace(80);
  const lines = text.split('\n');
  const top = doc.y;
  doc.rect(65, top, doc.page.width - 130, lines.length * 12 + 16).fill('#f1f5f9');
  doc.fillColor(COLOR.dark).font('Courier').fontSize(8.5);
  doc.text(lines.join('\n'), 75, top + 8, { width: doc.page.width - 150 });
  doc.moveDown(0.8);
}

function quote(text) {
  ensureSpace(40);
  const x = doc.x;
  doc.rect(x, doc.y - 2, 3, 16).fill(COLOR.brand);
  doc.x = x + 10;
  doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLOR.gray).text(stripInline(text));
  doc.x = x;
  doc.moveDown(0.4);
}

function table(headerRow, rows, widths) {
  ensureSpace(rows.length * 20 + 60);
  const tableWidth = doc.page.width - 130;
  const left = 65;
  const rowH = 22;
  const padX = 6;
  const cols = headerRow.length;

  const colWidths = widths || Array(cols).fill(tableWidth / cols);

  let rowIndex = 0;
  const drawRow = (cells, isHeader) => {
    const top = doc.y;
    let x = left;
    const heights = cells.map((c, i) => {
      const words = stripInline(c);
      const wrap = doc
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isHeader ? 9 : 8.5)
        .widthOfString(words, { width: colWidths[i] - padX * 2 });
      const lines = Math.ceil(wrap / (colWidths[i] - padX * 2)) || 1;
      return Math.max(rowH, lines * 11 + 8);
    });
    const h = Math.max(...heights);

    if (isHeader) {
      doc.rect(left, top, tableWidth, h).fill(COLOR.tableHeader);
    } else {
      doc.rect(left, top, tableWidth, h).fill(rowIndex % 2 ? '#ffffff' : '#f8fafc');
      rowIndex++;
    }

    cells.forEach((c, i) => {
      const wrap = doc
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isHeader ? 9 : 8.5)
        .widthOfString(stripInline(c), { width: colWidths[i] - padX * 2 });
      const lines = Math.ceil(wrap / (colWidths[i] - padX * 2)) || 1;
      const textH = lines * 11;
      const textTop = top + (h - textH) / 2;
      doc
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isHeader ? 9 : 8.5)
        .fillColor(isHeader ? '#ffffff' : COLOR.dark)
        .text(stripInline(c), x + padX, textTop, { width: colWidths[i] - padX * 2 });
      x += colWidths[i];
    });

    doc.moveDown(h / 22 + 0.05);
  };

  drawRow(headerRow, true);
  rows.forEach((r) => drawRow(r, false));
  doc.moveDown(0.4);
}

function parseTable(lines, i) {
  const header = lines[i]
    .split('|')
    .filter((s) => s.trim())
    .map((s) => s.trim());
  let j = i + 1;
  while (j < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[j])) j++;
  const rows = [];
  while (j < lines.length && lines[j].trim().startsWith('|')) {
    rows.push(
      lines[j]
        .split('|')
        .filter((s) => s.trim())
        .map((s) => s.trim())
    );
    j++;
  }
  const colCount = header.length;
  const widths = Array(colCount).fill((doc.page.width - 130) / colCount);
  table(header, rows, widths);
  return j - 1;
}

function render() {
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const lines = md.split(/\r?\n/);

  let inCode = false;
  let codeBuf = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCode) {
        codeBlock(codeBuf.join('\n'));
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    if (line.trim() === '---') continue;

    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const h4 = line.match(/^#### (.+)/);
    if (h1) { heading(h1[1], 1); continue; }
    if (h2) { heading(h2[1], 2); continue; }
    if (h3) { heading(h3[1], 3); continue; }
    if (h4) { heading(h4[1], 4); continue; }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      i = parseTable(lines, i);
      continue;
    }

    const ol = line.match(/^\s*(\d+)\.\s+(.+)/);
    if (ol) { bullet(ol[2], true, ol[1]); continue; }

    const ul = line.match(/^\s*[-*]\s+(.+)/);
    if (ul) { bullet(ul[1], false); continue; }

    if (line.trim().startsWith('> ')) { quote(line.trim().slice(2)); continue; }

    if (line.trim() === '') continue;

    paragraph(line.trim());
  }

  footer();
  doc.end();
}

render();
out.on('finish', () => {
  const size = fs.statSync(OUT_PATH).size;
  console.log(`PDF written: ${OUT_PATH} (${(size / 1024).toFixed(1)} KB)`);
});
