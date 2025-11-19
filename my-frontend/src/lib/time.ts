export function formatAbsolute(d: Date | string | number) {
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export function formatRelative(d: Date | string | number) {
  const date = new Date(d).getTime();
  if (isNaN(date)) return '';
  const now = Date.now();
  const diff = Math.max(0, now - date);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(mo / 12);
  return `${yr}y ago`;
}
