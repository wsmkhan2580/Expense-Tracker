/**
 * main.js
 * ──────────────────────────────────────────────────────────────
 * Application entry point.
 * Orchestrates all modules: storage, ui, chart, pdf, api.
 *
 * Responsibilities:
 *  - Bootstrap app state from localStorage
 *  - Wire up all event listeners
 *  - Trigger full UI refresh on every state mutation
 *
 * Design principle: state is the single source of truth.
 * Every change mutates `appState`, saves to storage, then calls refresh().
 */

import { loadState, saveState }                       from './storage.js';
import { convertFromINR, getCurrencySymbol }          from './api.js';
import { renderChart }                                from './chart.js';
import { generatePDF }                                from './pdf.js';
import {
  els,
  showToast,
  showFormError,
  clearFormError,
  setSalaryInputValue,
  updateStats,
  updateBudgetAlert,
  renderExpenseList,
  showChartPlaceholder,
  renderChartLegend,
  setCurrencyStatus,
  clearExpenseForm,
} from './ui.js';

// ── App State ──────────────────────────────────────────────────
/** @type {{ salary: number, currency: string, expenses: Array }} */
let appState = loadState();

// ── Derived Calculations ───────────────────────────────────────
/**
 * Computes totals from current appState.
 * @returns {{ totalExpenses: number, remainingBalance: number, isLowBalance: boolean }}
 */
const calcTotals = () => {
  const totalExpenses    = appState.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBalance = appState.salary - totalExpenses;
  const isLowBalance     = appState.salary > 0 && remainingBalance < appState.salary * 0.1;
  return { totalExpenses, remainingBalance, isLowBalance };
};

// ── Currency conversion state ──────────────────────────────────
let currentRate   = 1;
let currentSymbol = getCurrencySymbol(appState.currency);

// ── Full UI Refresh ────────────────────────────────────────────
/**
 * Re-renders all UI components from current appState + conversion rate.
 * Called after every state mutation.
 */
const refresh = async () => {
  const { salary, expenses, currency } = appState;
  const { totalExpenses, remainingBalance, isLowBalance } = calcTotals();

  // Update symbol / rate
  currentSymbol = getCurrencySymbol(currency);

  // Stats cards
  updateStats({
    salary,
    totalExpenses,
    remainingBalance,
    symbol:   currentSymbol,
    currency,
    rate:     currentRate,
    isLowBalance,
  });

  // Budget alert
  updateBudgetAlert(isLowBalance, remainingBalance, currentSymbol, currentRate);

  // Expense list
  renderExpenseList(expenses, currentSymbol, currentRate, handleDeleteExpense);

  // Chart
  if (salary > 0) {
    showChartPlaceholder(false);
    renderChart({
      canvas:           els.chartCanvas,
      totalExpenses:    totalExpenses * currentRate,
      remainingBalance: remainingBalance * currentRate,
      symbol:           currentSymbol,
    });
    renderChartLegend(totalExpenses * currentRate, remainingBalance * currentRate, currentSymbol);
  } else {
    showChartPlaceholder(true);
  }
};

// ── Save Salary ────────────────────────────────────────────────
const handleSaveSalary = () => {
  const raw = parseFloat(els.salaryInput.value);

  if (isNaN(raw) || raw < 0) {
    showToast('Please enter a valid salary amount.', 'error');
    els.salaryInput.focus();
    return;
  }

  appState.salary = raw;
  saveState(appState);
  refresh();
  showToast('Salary updated ✓', 'success');
};

// ── Add Expense ────────────────────────────────────────────────
const handleAddExpense = () => {
  clearFormError();

  const name   = els.expenseName.value.trim();
  const amount = parseFloat(els.expenseAmount.value);

  if (!name) {
    showFormError('Please enter an expense description.');
    els.expenseName.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showFormError('Please enter a valid positive amount.');
    els.expenseAmount.focus();
    return;
  }

  /** @type {{ id: string, name: string, amount: number, createdAt: number }} */
  const expense = {
    id:        `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    amount,
    createdAt: Date.now(),
  };

  appState.expenses.unshift(expense); // newest first
  saveState(appState);
  clearExpenseForm();
  refresh();
  showToast(`"${name}" added ✓`, 'success');
};

// ── Delete Expense ─────────────────────────────────────────────
/**
 * Removes an expense by id, updates storage, and refreshes.
 * @param {string} id
 */
const handleDeleteExpense = (id) => {
  const idx  = appState.expenses.findIndex((e) => e.id === id);
  if (idx === -1) return;

  const name = appState.expenses[idx].name;
  appState.expenses.splice(idx, 1);
  saveState(appState);
  refresh();
  showToast(`"${name}" removed`, 'info');
};

// ── Currency Change ────────────────────────────────────────────
const handleCurrencyChange = async () => {
  const currency = els.currencySelect.value;
  appState.currency = currency;
  saveState(appState);

  setCurrencyStatus('loading...');
  els.currencySelect.disabled = true;

  try {
    currentRate   = await convertFromINR(1, currency);
    currentSymbol = getCurrencySymbol(currency);
    setCurrencyStatus('');
  } catch {
    setCurrencyStatus('rate error');
  } finally {
    els.currencySelect.disabled = false;
  }

  refresh();
};

// ── PDF Export ─────────────────────────────────────────────────
const handleDownloadPDF = () => {
  const { salary, expenses } = appState;
  const { totalExpenses, remainingBalance } = calcTotals();

  if (salary === 0 && expenses.length === 0) {
    showToast('Nothing to export yet.', 'error');
    return;
  }

  try {
    generatePDF({
      salary,
      totalExpenses,
      remainingBalance,
      expenses,
      displayCurrency: appState.currency,
      symbol:          currentSymbol,
      rate:            currentRate,
    });
    showToast('PDF exported ✓', 'success');
  } catch (err) {
    console.error('[PDF] Export failed:', err);
    showToast('PDF export failed. See console.', 'error');
  }
};

// ── Keyboard Shortcuts ─────────────────────────────────────────
const handleGlobalKeydown = (e) => {
  // Enter on expense form fields → add expense
  if (e.key === 'Enter') {
    if (
      document.activeElement === els.expenseName ||
      document.activeElement === els.expenseAmount
    ) {
      handleAddExpense();
    }
    if (document.activeElement === els.salaryInput) {
      handleSaveSalary();
    }
  }
};

// ── Bootstrap ──────────────────────────────────────────────────
const init = async () => {
  // Restore UI from persisted state
  setSalaryInputValue(appState.salary);
  els.currencySelect.value = appState.currency;

  // Fetch initial conversion rate (non-blocking UX)
  if (appState.currency !== 'INR') {
    setCurrencyStatus('loading...');
    try {
      currentRate = await convertFromINR(1, appState.currency);
    } catch {
      setCurrencyStatus('rate error');
    }
    setCurrencyStatus('');
  }

  currentSymbol = getCurrencySymbol(appState.currency);

  // Wire up event listeners
  els.saveSalary.addEventListener('click',      handleSaveSalary);
  els.addExpense.addEventListener('click',      handleAddExpense);
  els.downloadPdf.addEventListener('click',    handleDownloadPDF);
  els.currencySelect.addEventListener('change', handleCurrencyChange);
  document.addEventListener('keydown',          handleGlobalKeydown);

  // Initial render
  refresh();
};

// Start the application when the DOM is ready
document.addEventListener('DOMContentLoaded', init);

const toggleBtn = document.getElementById("themeToggle");

// saved theme load
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
  toggleBtn.textContent = "☀️";
}

// toggle click
toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");

  const isLight = document.body.classList.contains("light-mode");

  // icon change
  toggleBtn.textContent = isLight ? "☀️" : "🌙";

  // save preference
  localStorage.setItem("theme", isLight ? "light" : "dark");
});
