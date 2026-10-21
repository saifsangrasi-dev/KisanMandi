/**
 * KisanMandi Alert Engine Service
 */

import { storage } from './storage.js';
import { getLatestPrice } from './marketPriceService.js';

/**
 * Evaluates all active price alerts against current mandi prices.
 *
 * State transition rules:
 * - Active alert with condition 'Above': condition met if latestPrice >= target_price
 * - Active alert with condition 'Below': condition met if latestPrice <= target_price
 * - Transition unmet -> met: counts as newly triggered, sets triggered_status = true and last_triggered_at = now
 * - Transition met -> met: remains triggered_status = true, NOT counted as new trigger (avoids duplicate notification)
 * - Transition met -> unmet: condition no longer holds, resets triggered_status = false
 * - Inactive alerts: skipped from evaluation
 */
export async function evaluateAlerts(customStorage = storage) {
  const [alerts, prices] = await Promise.all([
    customStorage.getCollection('alerts'),
    customStorage.getCollection('prices')
  ]);

  let newlyTriggeredCount = 0;
  let evaluatedCount = 0;
  let hasModifications = false;

  const updatedAlerts = alerts.map((alert) => {
    // Only evaluate active alerts
    if (!alert.active_status) {
      return alert;
    }

    evaluatedCount++;
    const latest = getLatestPrice(alert.crop_id, alert.market_id, prices);

    if (!latest || typeof latest.price !== 'number') {
      return alert;
    }

    const currentPrice = latest.price;
    const isConditionMet =
      alert.condition === 'Above'
        ? currentPrice >= alert.target_price
        : alert.condition === 'Below'
        ? currentPrice <= alert.target_price
        : false;

    // Check transition
    if (isConditionMet) {
      if (!alert.triggered_status) {
        // Transition: false -> true (new trigger!)
        newlyTriggeredCount++;
        hasModifications = true;
        return {
          ...alert,
          triggered_status: true,
          last_triggered_at: new Date().toISOString(),
          current_price: currentPrice
        };
      } else {
        // Already triggered previously, condition remains met
        return {
          ...alert,
          current_price: currentPrice
        };
      }
    } else {
      if (alert.triggered_status) {
        // Condition no longer met, reset triggered_status to false
        hasModifications = true;
        return {
          ...alert,
          triggered_status: false,
          current_price: currentPrice
        };
      }
      return {
        ...alert,
        current_price: currentPrice
      };
    }
  });

  if (hasModifications) {
    const db = await customStorage.read();
    db.alerts = updatedAlerts.map(({ current_price, ...rest }) => rest);
    await customStorage.write(db);
  }

  return {
    success: true,
    evaluated_count: evaluatedCount,
    newly_triggered_count: newlyTriggeredCount,
    alerts: updatedAlerts
  };
}
