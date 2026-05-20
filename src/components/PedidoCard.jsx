import React from "react";
import { ESTADO_COLORS, ESTADO_ICON } from "../constants";
import { duracion, timeAgo } from "../utils";

const PedidoCard = React.memo(({ pedido, urgentes, ahora, onClick }) => {

  const esUrgente = urgentes.some(u => u.id === pedido.id);

  let timerInfo = null;

  if (pedido.estado === "En lavanderia" && pedido.inicioLavanderia &&
    pedido.tiempoLavanderia) {
    const fin = pedido.inicioLavanderia + pedido.tiempoLavanderia * 60000;
    const restMs = fin - ahora;

    timerInfo = {
      vencido: restMs <= 0,
      texto: duracion(restMs)
    };
  }

  return (
    <div onClick={onClick}
      style={{
        background: esUrgente ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 14
      }}>

      <div style={{ display: "flex", justifyContent: "space-between" }}>

        <div>
          <div>{ESTADO_ICON[pedido.estado]} {pedido.nombre}</div>
          <div>{pedido.kg} kg - S/. {pedido.precio}</div>
          <div>{timeAgo(pedido.ingreso)}</div>
        </div>

        {timerInfo && (
          <div>
            {timerInfo.vencido
              ? `⚠️ Vencido`
              : `⏱ ${timerInfo.texto}`
            }
          </div>
        )}
      </div>

      <div style={{ color: ESTADO_COLORS[pedido.estado] }}>
        {pedido.estado}
      </div>

    </div>
  );
});

export default PedidoCard;
