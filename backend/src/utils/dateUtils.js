/**
 * KisanMandi Date Utility Functions
 */

export function isValidDateFormat(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDate() {
  return formatDate(new Date());
}

export function isPastDate(dateStr) {
  if (!isValidDateFormat(dateStr)) return false;
  const today = getTodayDate();
  return dateStr < today;
}

export function getRelativeDate(offsetDays, baseDate = new Date()) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return formatDate(d);
}
