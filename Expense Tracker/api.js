/**
 * api.js
 * ──────────────────────────────────────────────────────────────
 * Currency conversion using the free Frankfurter API.
 * https://api.frankfurter.app
 *
 * - Rate caching: rates are cached for 60 minutes to avoid
 *   excessive network calls on every UI update.
 * - All public functions use async/await with try/catch.
 */

const BASE_CURRENCY = 'INR';
const CACHE_TTL_MS  = 60 * 60 * 1000; // 1 hour

/** @type {{ [targetCurrency: string]: { rate: number, fetchedAt: number } }} */
const rateCache = {};

/**
 * Fetches the conversion rate from INR to the given target currency.
 * Falls back to 1 (i.e. no conversion) on network or parse error.
 *
 * @param {string} targetCurrency - e.g. "USD", "EUR", "INR"
 * @returns {Promise<number>}
 */
const fetchConversionRate = async (targetCurrency) => {
  if (targetCurrency === BASE_CURRENCY) return 1;

  const cached = rateCache[targetCurrency];
  const now    = Date.now();

  // Return cached rate if still fresh
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  const url = `https://api.frankfurter.app/latest?from=${BASE_CURRENCY}&to=${targetCurrency}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    const rate = data?.rates?.[targetCurrency];

    if (typeof rate !== 'number') {
      throw new Error(`Unexpected API response: ${JSON.stringify(data)}`);
    }

    // Store in cache
    rateCache[targetCurrency] = { rate, fetchedAt: now };
    return rate;

  } catch (err) {
    console.error(`[API] Currency fetch failed for ${targetCurrency}:`, err.message);
    return rateCache[targetCurrency]?.rate ?? 1; // use stale cache or fallback
  }
};

/**
 * Converts an INR value to the target currency.
 *
 * @param {number} amountInINR
 * @param {string} targetCurrency
 * @returns {Promise<number>}
 */
const convertFromINR = async (amountInINR, targetCurrency) => {
  const rate = await fetchConversionRate(targetCurrency);
  return amountInINR * rate;
};

/**
 * Returns the currency symbol for a given currency code.
 * @param {string} currency
 * @returns {string}
 */
const getCurrencySymbol = (currency) => {
  const symbols = { INR: '₹', USD: '$', EUR: '€' };
  return symbols[currency] ?? currency;
};

export { fetchConversionRate, convertFromINR, getCurrencySymbol };
