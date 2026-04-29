/**
 * ui.js
 * ──────────────────────────────────────────────────────────────
 * Handles all DOM manipulation, rendering, and UI state updates.
 * No business logic here — pure presentation concerns.
 */

import { getCurrencySymbol } from './api.js';

// ── DOM Element References ─────────────────────────────────────
const $ = (id) => document.getElementById(id);

const els = {
  // Salary
  salaryInput:   $('salaryInput'),
  salaryPrefix:  $('salaryPrefix'),
  saveSalary:    $('saveSalary'),

  // Expense form
  expenseName:   $('expenseName'),
  expenseAmount: $('expenseAmount'),
  expensePrefix: $('expensePrefix'),
  addExpense:    $('addExpense'),
  formError:     $('formError'),

  // Expense list
  expenseList:   $('expenseList'),
  emptyState:    $('emptyState'),
  expenseCount:  $('expenseCount'),

  // Stats
  statSalary:    $('statSalary'),
  statSalaryRaw: $('statSalaryRaw'),
  statExpenses:  $('statExpenses'),
  statBalance:   $('statBalance'),
  statPercent:   $('statPercent'),
  expenseBar:    $('expenseBar'),
  statBalanceCard: $('statBalanceCard'),

  // Budget alert
  budgetAlert:   $('budgetAlert'),
  alertMessage:  $('alertMessage'),

  // Chart
  chartCanvas:      $('budgetChart'),
  chartPlaceholder: $('chartPlaceholder'),
  chartLegend:      $('chartLegend'),

  // Currency
  currencySelect: $('currencySelect'),
  currencyStatus: $('currencyStatus'),

  // PDF
  downloadPdf:   $('downloadPdf'),

  // Toast
  toast: $('toast'),
};

// ── Toast ──────────────────────────────────────────────────────
let toastTimer = null;

/**
 * Shows a temporary toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
const showToast = (message, type = 'info') => {
  const { toast } = els;
  toast.textContent = message;
  toast.className   = `toast show ${type}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 2800);
};

// ── Form Error ─────────────────────────────────────────────────
const showFormError = (msg) => { els.formError.textContent = msg; };
const clearFormError = ()   => { els.formError.textContent = ''; };

// ── Salary Input ───────────────────────────────────────────────
/**
 * Pre-fills the salary input from persisted state.
 * @param {number} salary
 */
const setSalaryInputValue = (salary) => {
  els.salaryInput.value = salary > 0 ? salary : '';
};

/**
 * Updates the currency symbol prefix on salary + expense inputs.
 * @param {string} currency
 */
const updateInputPrefixes = (currency) => {
  const sym = getCurrencySymbol(currency);
  // Note: salary prefix remains ₹ (we always store in INR)
  // Expense prefix also stays ₹ — inputs are always in INR
  // Only the display/stats are converted
};

// ── Stats ──────────────────────────────────────────────────────
/**
 * Formats a number as a currency string.
 * @param {number} amount
 * @param {string} symbol
 * @returns {string}
 */
const formatCurrency = (amount, symbol) =>
  `${symbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Updates all stat cards with converted values.
 *
 * @param {object} params
 * @param {number} params.salary
 * @param {number} params.totalExpenses
 * @param {number} params.remainingBalance
 * @param {string} params.symbol
 * @param {string} params.currency
 * @param {number} params.rate
 * @param {boolean} params.isLowBalance
 */
const updateStats = ({
  salary,
  totalExpenses,
  remainingBalance,
  symbol,
  currency,
  rate,
  isLowBalance,
}) => {
  const convert = (v) => v * rate;
  const fmt     = (v) => formatCurrency(convert(v), symbol);

  // Salary card
  els.statSalary.textContent = salary > 0 ? fmt(salary) : '—';
  if (currency !== 'INR' && salary > 0) {
    els.statSalaryRaw.textContent = `₹${salary.toLocaleString('en-IN')} INR`;
  } else {
    els.statSalaryRaw.textContent = '';
  }

  // Expenses card
  els.statExpenses.textContent = totalExpenses > 0 ? fmt(totalExpenses) : '—';

  // Expense progress bar
  const pct = salary > 0 ? Math.min((totalExpenses / salary) * 100, 100) : 0;
  els.expenseBar.style.width = `${pct}%`;

  // Balance card
  const balanceAmt = convert(remainingBalance);
  if (salary > 0) {
    els.statBalance.textContent = formatCurrency(Math.abs(balanceAmt), symbol);
    if (remainingBalance < 0) {
      els.statBalance.textContent = `-${formatCurrency(Math.abs(balanceAmt), symbol)}`;
    }
  } else {
    els.statBalance.textContent = '—';
  }

  // Balance colour + card danger state
  if (isLowBalance) {
    els.statBalance.classList.add('danger');
    els.statBalance.classList.remove('positive');
    els.statBalanceCard.classList.add('danger');
  } else if (remainingBalance > 0) {
    els.statBalance.classList.remove('danger');
    els.statBalance.classList.add('positive');
    els.statBalanceCard.classList.remove('danger');
  } else {
    els.statBalance.classList.remove('danger', 'positive');
    els.statBalanceCard.classList.remove('danger');
  }

  // Percent label
  if (salary > 0) {
    const balancePct = ((remainingBalance / salary) * 100).toFixed(1);
    els.statPercent.textContent = `${balancePct}% of salary`;
  } else {
    els.statPercent.textContent = '';
  }
};

// ── Budget Alert ───────────────────────────────────────────────
/**
 * Shows or hides the low-balance warning banner.
 * @param {boolean} show
 * @param {number}  remainingBalance - in INR
 * @param {string}  symbol
 * @param {number}  rate
 */
const updateBudgetAlert = (show, remainingBalance, symbol, rate) => {
  if (show) {
    els.budgetAlert.hidden = false;
    const converted = (remainingBalance * rate).toFixed(2);
    els.alertMessage.textContent =
      `Your remaining balance (${symbol}${converted}) is below 10% of your salary.`;
  } else {
    els.budgetAlert.hidden = true;
  }
};

// ── Expense List ───────────────────────────────────────────────
/**
 * Renders the full expense list.
 * @param {Array}    expenses  - Array of expense objects
 * @param {string}   symbol    - Currency symbol
 * @param {number}   rate      - Conversion rate
 * @param {Function} onDelete  - Callback(expenseId)
 */
const renderExpenseList = (expenses, symbol, rate, onDelete) => {
  els.expenseList.innerHTML = '';
  const count = expenses.length;

  // Toggle empty state
  els.emptyState.hidden    = count > 0;
  els.expenseList.hidden   = count === 0;
  els.expenseCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;

  if (count === 0) return;

  const fragment = document.createDocumentFragment();

  expenses.forEach((exp) => {
    const converted = (exp.amount * rate).toFixed(2);
    const item = document.createElement('div');
    item.className  = 'expense-item';
    item.dataset.id = exp.id;
    item.setAttribute('role', 'listitem');

    item.innerHTML = `
      <span class="expense-dot" aria-hidden="true"></span>
      <span class="expense-name" title="${escapeHTML(exp.name)}">${escapeHTML(exp.name)}</span>
      <span class="expense-amount">−${symbol}${Number(converted).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      <button
        class="btn-delete"
        aria-label="Delete expense: ${escapeHTML(exp.name)}"
        data-id="${exp.id}"
        title="Remove this expense"
      >×</button>
    `;

    // Attach delete handler directly (avoids event delegation complexity)
    item.querySelector('.btn-delete').addEventListener('click', () => {
      // Animate out before removing
      item.classList.add('removing');
      setTimeout(() => onDelete(exp.id), 200);
    });

    fragment.appendChild(item);
  });

  els.expenseList.appendChild(fragment);
};

// ── Chart Placeholder ──────────────────────────────────────────
const showChartPlaceholder = (show) => {
  if (show) {
    els.chartPlaceholder.classList.remove('hidden');
    els.chartCanvas.style.visibility = 'hidden';
  } else {
    els.chartPlaceholder.classList.add('hidden');
    els.chartCanvas.style.visibility = 'visible';
  }
};

// ── Chart Legend ───────────────────────────────────────────────
/**
 * Renders custom chart legend below the chart.
 * @param {number} expensesConverted
 * @param {number} balanceConverted
 * @param {string} symbol
 */
const renderChartLegend = (expensesConverted, balanceConverted, symbol) => {
  const fmt = (v) => `${symbol}${Math.max(v, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  els.chartLegend.innerHTML = `
    <span class="legend-item">
      <span class="legend-dot" style="background:#f05252"></span>
      Expenses: ${fmt(expensesConverted)}
    </span>
    <span class="legend-item">
      <span class="legend-dot" style="background:#29d98f"></span>
      Remaining: ${fmt(balanceConverted)}
    </span>
  `;
};

// ── Currency Status ────────────────────────────────────────────
const setCurrencyStatus = (msg) => {
  els.currencyStatus.textContent = msg;
};

// ── Form Helpers ───────────────────────────────────────────────
const clearExpenseForm = () => {
  els.expenseName.value   = '';
  els.expenseAmount.value = '';
  els.expenseName.focus();
};

// ── Utility ───────────────────────────────────────────────────
/** Prevents XSS in dynamic HTML rendering. */
const escapeHTML = (str) =>
  String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

export {
  els,
  showToast,
  showFormError,
  clearFormError,
  setSalaryInputValue,
  updateInputPrefixes,
  formatCurrency,
  updateStats,
  updateBudgetAlert,
  renderExpenseList,
  showChartPlaceholder,
  renderChartLegend,
  setCurrencyStatus,
  clearExpenseForm,
};
