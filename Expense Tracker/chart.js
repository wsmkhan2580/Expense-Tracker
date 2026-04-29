/**
 * chart.js
 * ──────────────────────────────────────────────────────────────
 * Manages the Chart.js budget pie chart.
 *
 * Always destroys the previous instance before re-rendering to
 * prevent Chart.js "Canvas is already in use" errors.
 */

/** @type {Chart|null} The active Chart.js instance. */
let activeChart = null;

// Design tokens (mirror CSS custom properties for chart theming)
const COLORS = {
  expenses:  '#f05252',
  balance:   '#29d98f',
  empty:     '#1e2a3a',
  textMuted: '#7a8ba0',
};

/**
 * Renders (or re-renders) the doughnut chart on the given canvas.
 *
 * @param {object} params
 * @param {HTMLCanvasElement} params.canvas
 * @param {number}            params.totalExpenses   - in display currency
 * @param {number}            params.remainingBalance - in display currency
 * @param {string}            params.symbol           - currency symbol
 */
const renderChart = ({ canvas, totalExpenses, remainingBalance, symbol }) => {
  destroyChart();

  const hasData = totalExpenses > 0 || remainingBalance > 0;

  const data = hasData
    ? [totalExpenses, Math.max(remainingBalance, 0)]
    : [1]; // placeholder slice when no data

  const backgroundColors = hasData
    ? [COLORS.expenses, COLORS.balance]
    : [COLORS.empty];

  const labels = hasData
    ? ['Expenses', 'Remaining']
    : ['No data'];

  activeChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor:  backgroundColors,
        borderColor:      '#0b0e14',
        borderWidth:      3,
        hoverBorderWidth: 3,
        hoverOffset:      8,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '62%',
      animation: {
        animateRotate: true,
        duration:      600,
        easing:        'easeInOutQuart',
      },
      plugins: {
        legend: { display: false }, // we render our own legend
        tooltip: {
          enabled: hasData,
          callbacks: {
            label: (context) => {
              const val   = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
              return ` ${symbol}${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${pct}%)`;
            },
          },
          backgroundColor: '#1a2030',
          borderColor:     '#2a3a52',
          borderWidth:     1,
          titleColor:      '#e8edf5',
          bodyColor:       '#7a8ba0',
          padding:         10,
          cornerRadius:    8,
        },
      },
    },
  });
};

/** Destroys the currently active chart instance, if any. */
const destroyChart = () => {
  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }
};

export { renderChart, destroyChart };


