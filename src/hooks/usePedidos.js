import { useState, useEffect, useMemo } from "react";
import { ESTADOS, SIGUIENTE_ESTADO } from "../constants";
import { startOfWeek, startOfMonth } from "../utils";

export function usePedidos({ filtro, busquedaDir, periodoReporte, tick }) {

  const [pedidos, setPedidos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mc_clientes")) || [];
    } catch {
      return [];
    }
  });

  const [directorio, setDirectorio] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mc_directorio")) || [];
    } catch {
      return [];
    }
  });

  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    localStorage.setItem("mc_clientes", JSON.stringify(pedidos));
  }, [pedidos]);

  useEffect(() => {
    localStorage.setItem("mc_directorio", JSON.stringify(directorio));
  }, [directorio]);

  useEffect(() => {
    const nuevasAlertas = [];

    pedidos.forEach(c => {
      if (
        c.estado === "En lavanderia" &&
        c.inicioLavanderia &&
        c.tiempoLavanderia &&
        !c.alertado
      ) {
        const fin = c.inicioLavanderia + c.tiempoLavanderia * 60000;

        if (Date.now() >= fin) {
          nuevasAlertas.push({
            id: c.id,
            msg: `Recoger ropa de ${c.nombre}`
          });
        }
      }
    });

    if (nuevasAlertas.length) {
      setAlertas(prev => [...prev, ...nuevasAlertas]);
    }
  }, [tick, pedidos]);

  const urgentes = useMemo(() => {
    return pedidos.filter(c =>
      c.estado === "En lavanderia"
    );
  }, [pedidos]);

  const stats = useMemo(() => ({
    activos: pedidos.filter(c => c.estado !== "Entregado").length,
    listos: pedidos.filter(c => c.estado === "Listo para entregar").length,
    hoy: pedidos.length,
    ingresosHoy: pedidos.reduce((s, c) => s + Number(c.precio || 0), 0)
  }), [pedidos]);

  const grupos = useMemo(() => ({
    activos: pedidos.filter(c => c.estado !== "Entregado"),
    recojo: pedidos.filter(c => ["En recojo", "Recogido"].includes(c.estado)),
    lavanderia: pedidos.filter(c => c.estado === "En lavanderia"),
    listos: pedidos.filter(c => c.estado === "Listo para entregar"),
    entregados: pedidos.filter(c => c.estado === "Entregado"),
  }), [pedidos]);

  return {
    pedidos,
    setPedidos,
    directorio,
    alertas,
    urgentes,
    stats,
    grupos
  };
}
