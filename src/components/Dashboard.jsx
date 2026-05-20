import PedidoCard from "./PedidoCard";

export default function Dashboard({
  pedidosFiltrados,
  grupos,
  urgentes,
  filtro,
  setFiltro,
  onSelectPedido
}) {

  return (
    <div style={{ padding: 16 }}>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {Object.keys(grupos).map(key => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #333",
              background: filtro === key ? "#10b981" : "#111",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            {key} ({grupos[key].length})
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pedidosFiltrados.map(c => (
          <PedidoCard
            key={c.id}
            pedido={c}
            urgentes={urgentes}
            ahora={Date.now()}
            onClick={() => onSelectPedido(c.id)}
          />
        ))}
      </div>

    </div>
  );
}
