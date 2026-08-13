// The API always returns UTC ISO strings; formatting to the viewer's local
// timezone happens here, at the boundary, using whatever timezone the
// browser reports. See docs/adr/0004-timezone-strategy.md.

export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function isPast(iso) {
  return new Date(iso).getTime() <= Date.now();
}

// For <input type="datetime-local">: needs "YYYY-MM-DDTHH:mm" in local time,
// not the UTC string the API returns.
export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
