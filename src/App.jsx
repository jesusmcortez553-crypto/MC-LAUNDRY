import { useState } from "react";

import { usePedidos } from "./hooks/usePedidos";
import Dashboard from "./components/Dashboard";

export default function App() {

  const [filtro, setFiltro] = useState("activos");
  const [busquedaDir, setBusquedaDir] = useState("");
  const [periodoReporte, setPeriodoReporte] = useState("semana");
  const [tick, setTick] = useState(0);

  const {
    grupos,
    urgentes,
    stats
  } = usePedidos({ filtro, busquedaDir, periodoReporte, tick });

  return (
    <div style={{ padding: 10 }}>

      <h2>MC Laundry</h2>

      <div>
        S/. {stats.ingresosHoy.toFixed(2)}
      </div>

      <Dashboard
        pedidosFiltrados={grupos[filtro]}
        grupos={grupos}
        urgentes={urgentes}
        filtro={filtro}
        setFiltro={setFiltro}
        onSelectPedido={() => {}}
      />

    </div>
  );
}
