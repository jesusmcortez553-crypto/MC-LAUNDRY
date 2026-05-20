export function formatTime(date) {
  return new Date(date).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short"
  });
}

export function duracion(ms) {
  const totalMin = Math.floor(Math.abs(ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (totalMin < 1) return "1m";
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function timeAgo(date) {
  return duracion(Date.now() - new Date(date).getTime());
}

export function startOfWeek(d) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
