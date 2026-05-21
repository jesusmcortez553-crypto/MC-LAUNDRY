export const LAVANDERIAS = [
  "Lavanderia Centro",
  "Lavanderia Norte",
  "Lavanderia Express",
  "Otra"
];

export const ESTADOS = [
  "En recojo",
  "Recogido",
  "En lavanderia",
  "Listo para entregar",
  "Entregado"
];

export const SIGUIENTE_ESTADO = {
  "En recojo": "Recogido",
  "Recogido": "En lavanderia",
  "En lavanderia": "Listo para entregar",
  "Listo para entregar": "Entregado",
};

export const ESTADO_COLORS = {
  "En recojo": "#f59e0b",
  "Recogido": "#e879f9",
  "En lavanderia": "#3b82f6",
  "Listo para entregar": "#10b981",
  "Entregado": "#6b7280",
};

export const ESTADO_DESC = {
  "En recojo": "Camino a buscar la ropa",
  "Recogido": "Ropa en mano - eligiendo lavanderia",
  "En lavanderia": "Ropa dejada - temporizador activo",
  "Listo para entregar": "Recogida - camino al cliente",
  "Entregado": "Servicio completado",
};

export const ESTADO_ICON = {
  "En recojo": "🛵",
  "Recogido": "🪣",
  "En lavanderia": "🫧",
  "Listo para entregar": "✅",
  "Entregado": "📦",
};
