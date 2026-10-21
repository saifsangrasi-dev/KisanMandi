/**
 * KisanMandi Market Price Calculations Service
 */

/**
 * Finds the newest valid price record by date for a given crop and market.
 */
export function getLatestPrice(cropId, marketId, prices = []) {
  const filtered = prices.filter(
    (p) => p.crop_id === cropId && p.market_id === marketId && typeof p.price === 'number' && p.price > 0
  );

  if (!filtered.length) return null;

  // Sort date descending
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  return filtered[0];
}

/**
 * Calculates daily price change and percentage change between newest and previous day.
 */
export function getDailyPriceChange(cropId, marketId, prices = []) {
  const filtered = prices
    .filter((p) => p.crop_id === cropId && p.market_id === marketId && typeof p.price === 'number' && p.price > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!filtered.length) {
    return {
      latestPrice: null,
      previousPrice: null,
      change: 0,
      percentageChange: 0,
      status: 'NO_DATA'
    };
  }

  const latest = filtered[0];
  const previous = filtered[1] || null;

  if (!previous || previous.price <= 0) {
    return {
      latestPrice: latest.price,
      previousPrice: null,
      change: 0,
      percentageChange: 0,
      status: 'SINGLE_OBSERVATION'
    };
  }

  const change = Number((latest.price - previous.price).toFixed(2));
  const percentageChange = Number(((change / previous.price) * 100).toFixed(2));

  return {
    latestPrice: latest.price,
    previousPrice: previous.price,
    change,
    percentageChange,
    status: 'CALCULATED'
  };
}

/**
 * Computes 14-day price statistics: points, min, max, avg, observationCount.
 * Does NOT fabricate missing records.
 */
export function getFourteenDayStats(cropId, marketId, prices = []) {
  const filtered = prices
    .filter((p) => p.crop_id === cropId && p.market_id === marketId && typeof p.price === 'number' && p.price > 0)
    .sort((a, b) => a.date.localeCompare(b.date)); // chronological order

  // Take the most recent 14 records
  const recent = filtered.slice(-14);

  if (!recent.length) {
    return {
      points: [],
      min: null,
      max: null,
      average: null,
      observations: 0,
      available: false
    };
  }

  const values = recent.map((r) => r.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const average = Number((sum / values.length).toFixed(2));

  return {
    points: recent.map((r) => ({
      date: r.date,
      price: r.price
    })),
    min,
    max,
    average,
    observations: recent.length,
    available: true
  };
}

/**
 * Compares the latest comparable price for a crop across all markets,
 * sorted highest to lowest, identifying the highest-priced valid market.
 */
export function getMarketComparison(cropId, markets = [], prices = []) {
  const marketComparisons = [];

  for (const market of markets) {
    const latest = getLatestPrice(cropId, market.id, prices);
    if (latest && typeof latest.price === 'number') {
      const changeData = getDailyPriceChange(cropId, market.id, prices);
      marketComparisons.push({
        market_id: market.id,
        market_name: market.name,
        district: market.district,
        date: latest.date,
        price: latest.price,
        change: changeData.change,
        percentage_change: changeData.percentageChange
      });
    }
  }

  if (marketComparisons.length === 0) {
    return {
      available: false,
      markets: [],
      highestMarket: null,
      averagePrice: null,
      message: 'No price observations available across markets for this crop'
    };
  }

  // Sort highest to lowest price
  marketComparisons.sort((a, b) => b.price - a.price);

  const sum = marketComparisons.reduce((acc, curr) => acc + curr.price, 0);
  const averagePrice = Number((sum / marketComparisons.length).toFixed(2));
  const highestMarket = marketComparisons[0];

  return {
    available: true,
    markets: marketComparisons,
    highestMarket,
    averagePrice,
    marketCount: marketComparisons.length
  };
}

/**
 * Calculates a produce listing's market label relative to current market average.
 * Difference = ((askingPrice - marketAverage) / marketAverage) * 100
 * - Below market: < -5%
 * - At market: -5% through +5%, inclusive
 * - Above market: > +5%
 * - Market comparison unavailable: no valid comparable average
 */
export function calculateListingMarketLabel(askingPrice, cropId, markets = [], prices = []) {
  const comparison = getMarketComparison(cropId, markets, prices);

  if (!comparison.available || !comparison.averagePrice) {
    return {
      label: 'Market comparison unavailable',
      differencePercentage: null,
      marketAverage: null
    };
  }

  const marketAverage = comparison.averagePrice;
  const rawDiff = ((askingPrice - marketAverage) / marketAverage) * 100;
  const differencePercentage = Number(rawDiff.toFixed(2));

  let label = 'At market';
  if (differencePercentage < -5.0) {
    label = 'Below market';
  } else if (differencePercentage > 5.0) {
    label = 'Above market';
  }

  return {
    label,
    differencePercentage,
    marketAverage
  };
}
