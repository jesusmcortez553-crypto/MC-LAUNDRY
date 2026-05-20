import { formatDate, formatTime } from "../utils";

export default function DetallePedido({
  pedidoDetalle,
  eliminarPedido
}) {

  if (!pedidoDetalle) return null;

  return (
    <div style={{ padding: 16 }}>

      <h2>{pedidoDetalle.nombre}</h2>

      <div><b>Estado:</b> {pedidoDetalle.estado}</div>

      <div><b>Kilos:</b> {pedidoDetalle.kg} kg</div>

      <div><b>Precio:</b> S/. {pedidoDetalle.precio}</div>

      <div>
        <b>Inicio:</b> {formatDate(pedidoDetalle.ingreso)}
        {formatTime(pedidoDetalle.ingreso)}
      </div>

      {pedidoDetalle.fechaFin && (
        <div>
          <b>Fin:</b> {formatDate(pedidoDetalle.fechaFin)}
          {formatTime(pedidoDetalle.fechaFin)}
        </div>
      )}

      <br />

      <button
        onClick={() => eliminarPedido(pedidoDetalle.id)}
        style={{ background: "red", color: "#fff", padding: 10 }}
      >
        Eliminar
      </button>

    </div>
  );
}
