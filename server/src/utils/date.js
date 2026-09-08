function toCalendarDay(date) {
  return {
    y: date.getFullYear(),
    m: date.getMonth(),
    d: date.getDate(),
  };
}

/** Compare two dates by local calendar day (timezone-safe). */
function sameCalendarDay(a, b) {
  const da = toCalendarDay(a instanceof Date ? a : new Date(a));
  const db = toCalendarDay(b instanceof Date ? b : new Date(b));
  return da.y === db.y && da.m === db.m && da.d === db.d;
}

function toDateOnlyString(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = { sameCalendarDay, toDateOnlyString, startOfDay };
