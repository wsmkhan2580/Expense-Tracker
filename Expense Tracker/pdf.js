/**
 * pdf.js
 * ──────────────────────────────────────────────────────────────
 * Generates and downloads a professional PDF expense report
 * using jsPDF (loaded via CDN on window.jspdf).
 */

const generatePDF = ({
  salary,
  totalExpenses,
  remainingBalance,
  expenses,
  displayCurrency,
  symbol,
  rate,
}) => {
  if (typeof window.jspdf === 'undefined') {
    console.error('[PDF] jsPDF is not loaded.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const PAGE_W   = doc.internal.pageSize.getWidth();
  const PAGE_H   = doc.internal.pageSize.getHeight();
  const MARGIN   = 48;
  const COL_W    = PAGE_W - MARGIN * 2;
  const NOW      = new Date();

  // ── Helper: format currency ──────────────────────────────────
  const fmt = (amountINR) =>
    `${symbol}${(amountINR * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Colour palette ───────────────────────────────────────────
  const C = {
    bg:       [11, 14, 20],
    surface:  [18, 23, 32],
    amber:    [245, 166, 35],
    green:    [41, 217, 143],
    red:      [240, 82, 82],
    white:    [232, 237, 245],
    muted:    [122, 139, 160],
    border:   [30, 42, 58],
  };

  let y = 0;

  // ── Background ───────────────────────────────────────────────
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // ── Header band ──────────────────────────────────────────────
  doc.setFillColor(...C.surface);
  doc.rect(0, 0, PAGE_W, 90, 'F');
  doc.setFillColor(...C.amber);
  doc.rect(0, 88, PAGE_W, 2, 'F');

  // ── Brand (FIXED HERE) ───────────────────────────────────────
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.amber);
  doc.text('CASHFLOW', MARGIN, 40); // ✅ removed special symbol

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('SALARY & EXPENSE TRACKER', MARGIN, 54);

  // ── Date / currency info ─────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const dateStr = NOW.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Generated: ${dateStr}`, PAGE_W - MARGIN, 34, { align: 'right' });
  doc.text(`Currency: ${displayCurrency}`, PAGE_W - MARGIN, 46, { align: 'right' });
  if (displayCurrency !== 'INR') {
    doc.text(`Rate: 1 INR = ${rate.toFixed(6)} ${displayCurrency}`, PAGE_W - MARGIN, 58, { align: 'right' });
  }

  y = 110;

  // ── Summary cards ────────────────────────────────────────────
  const cardW   = (COL_W - 20) / 3;
  const cardH   = 62;

  const cards = [
    { label: 'Gross Salary',      value: fmt(salary),           accent: C.amber },
    { label: 'Total Expenses',    value: fmt(totalExpenses),     accent: C.red   },
    { label: 'Remaining Balance', value: fmt(remainingBalance),  accent: C.green },
  ];

  cards.forEach((card, i) => {
    const cx = MARGIN + i * (cardW + 10);

    doc.setFillColor(...C.surface);
    doc.roundedRect(cx, y, cardW, cardH, 4, 4, 'F');

    doc.setFillColor(...card.accent);
    doc.rect(cx, y, cardW, 2, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(card.label.toUpperCase(), cx + 12, y + 18);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.accent);
    doc.text(card.value, cx + 12, y + 40);
  });

  y += cardH + 28;

  // ── Expense Breakdown ────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text('EXPENSE BREAKDOWN', MARGIN, y);

  y += 8;
  doc.setFillColor(...C.amber);
  doc.rect(MARGIN, y, 32, 1.5, 'F');
  y += 16;

  if (expenses.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text('No expenses recorded.', MARGIN, y + 20);
    y += 50;
  } else {
    doc.setFillColor(...C.surface);
    doc.rect(MARGIN, y, COL_W, 22, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('#', MARGIN + 10, y + 14);
    doc.text('DESCRIPTION', MARGIN + 30, y + 14);
    doc.text('AMOUNT', PAGE_W - MARGIN - 10, y + 14, { align: 'right' });
    y += 22;

    expenses.forEach((exp, idx) => {
      const rowH = 26;

      if (idx % 2 === 0) {
        doc.setFillColor(20, 28, 40);
        doc.rect(MARGIN, y, COL_W, rowH, 'F');
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(String(idx + 1).padStart(2, '0'), MARGIN + 10, y + 16);

      doc.setTextColor(...C.white);
      const truncatedName = doc.splitTextToSize(exp.name, COL_W - 120)[0];
      doc.text(truncatedName, MARGIN + 30, y + 16);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.red);
      doc.text(fmt(exp.amount), PAGE_W - MARGIN - 10, y + 16, { align: 'right' });

      y += rowH;

      if (y > PAGE_H - 100) {
        doc.addPage();
        doc.setFillColor(...C.bg);
        doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
        y = 40;
      }
    });

    y += 4;
    doc.setFillColor(...C.surface);
    doc.rect(MARGIN, y, COL_W, 28, 'F');
    doc.setFillColor(...C.red);
    doc.rect(MARGIN, y, 2, 28, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('TOTAL EXPENSES', MARGIN + 16, y + 17);
    doc.setTextColor(...C.red);
    doc.text(fmt(totalExpenses), PAGE_W - MARGIN - 10, y + 17, { align: 'right' });
    y += 40;
  }

  // ── Remaining Balance ────────────────────────────────────────
  doc.setFillColor(...C.surface);
  doc.rect(MARGIN, y, COL_W, 28, 'F');
  doc.setFillColor(...C.green);
  doc.rect(MARGIN, y, 2, 28, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text('REMAINING BALANCE', MARGIN + 16, y + 17);
  doc.setTextColor(...C.green);
  doc.text(fmt(remainingBalance), PAGE_W - MARGIN - 10, y + 17, { align: 'right' });
  y += 44;

  // ── Footer ───────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(
    'CashFlow Tracker — Generated automatically. For personal use only.',
    PAGE_W / 2,
    PAGE_H - 28,
    { align: 'center' }
  );

  // ── Save ─────────────────────────────────────────────────────
  const filename = `cashflow-report-${NOW.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};

export { generatePDF };
