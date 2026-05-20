import { formatDate } from "../utils";

export default function Reportes({
  reporte,
  pedidosReporte,
  periodoReporte,
  setPeriodoReporte,
  onSelectPedido
}) {

  return (
    <div style={{ padding: 16 }}>

      <h3>Reportes</h3>

      {/* Selector */}
      <div style={{ display: "flex", gap: 8 }}>
        {["hoy", "semana", "mes"].map(p => (
          <button
            key={p}
            onClick={() => setPeriodoReporte(p)}
            style={{
              background: periodoReporte === p ? "#10b981" : "#222",
              color: "#fff",
              padding: "6px 10px"
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <br />

      <div>
        <b>Total:</b> {reporte.total}
      </div>

      <div>
        <b>Ingresos:</b> S/. {reporte.ingresos.toFixed(2)}
      </div>

      <div>
        <b>Ganancia:</b> S/. {reporte.ganancia.toFixed(2)}
      </div>

      <div>
        <b>Kg:</b> {reporte.kg}
      </div>

      <br />

      <h4>Últimos pedidos</h4>

      {pedidosReporte.slice(0, 5).map(p => (
        <div
          key={p.id}
          onClick={() => onSelectPedido(p.id)}
          style={{
            padding: 6,
            borderBottom: "1px solid #333",
            cursor: "pointer"
          }}
        >
          {p.nombre} · {formatDate(p.ingreso)} · S/. {p.precio}
        </div>
      ))}

    </div>
  );
}
