export default function DetalleCliente({
  clienteDirDetalle,
  pedidos,
  eliminarClienteDir,
  onNuevoPedido,
  onSelectPedido
}) {

  if (!clienteDirDetalle) return null;

  const pedidosCliente = pedidos.filter(
    p =>
      p.clienteId === String(clienteDirDetalle.id) ||
      p.nombre === clienteDirDetalle.nombre
  );

  const activos = pedidosCliente.filter(p => p.estado !== "Entregado");
  const historial = pedidosCliente.filter(p => p.estado === "Entregado");

  return (
    <div style={{ padding: 16 }}>

      <h2>{clienteDirDetalle.nombre}</h2>

      {clienteDirDetalle.celular && (
        <div>📱 {clienteDirDetalle.celular}</div>
      )}

      {clienteDirDetalle.direccion && (
        <div>📍 {clienteDirDetalle.direccion}</div>
      )}

      <br />

      {/* Pedidos activos */}
      {activos.length > 0 && (
        <div>
          <h4>Activos ({activos.length})</h4>

          {activos.map(p => (
            <div
              key={p.id}
              onClick={() => onSelectPedido(p.id)}
              style={{
                padding: 8,
                borderBottom: "1px solid #333",
                cursor: "pointer"
              }}
            >
              {p.kg} kg · S/. {p.precio}
            </div>
          ))}
        </div>
      )}

      <br />

      {/* Historial */}
      {historial.length > 0 && (
        <div>
          <h4>Historial ({historial.length})</h4>

          {historial.slice(0, 5).map(p => (
            <div key={p.id}>
              {p.kg} kg · S/. {p.precio}
            </div>
          ))}
        </div>
      )}

      <br />

      <button onClick={onNuevoPedido}>
        + Nuevo pedido
      </button>

      <br /><br />

      <button
        onClick={() => eliminarClienteDir(clienteDirDetalle.id)}
        style={{ background: "red", color: "#fff", padding: 8 }}
      >
        Eliminar cliente
      </button>

    </div>
  );
}
