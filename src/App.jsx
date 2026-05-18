import { useState, useEffect, useRef } from "react";

const LAVANDERIAS = ["Lavandería Centro", "Lavandería Norte", "Lavandería Express", "Otra"];
const ESTADOS = ["En recojo", "Recogido", "En lavandería", "Listo para entregar", "Entregado"];

const ESTADO_COLORS = {
  "En recojo":           "#f59e0b",
  "Recogido":            "#e879f9",
  "En lavandería":       "#3b82f6",
  "Listo para entregar": "#10b981",
  "Entregado":           "#6b7280",
};

const ESTADO_ICONS = {
  "todos":               "📦",
  "En recojo":           "🛵",
  "Recogido":            "🧺",
  "En lavandería":       "🧼",
  "Listo para entregar": "✅",
  "entregados":          "🤝"
};

function formatTime(date) {
  return new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(date) {
  return new Date(date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

export default function App() {
  // Estados principales
  const [pedidos, setPedidos] = useState(() => JSON.parse(localStorage.getItem("mc_clientes") || "[]"));
  const [directorio, setDirectorio] = useState(() => JSON.parse(localStorage.getItem("mc_directorio") || "[]"));
  const [vista, setVista] = useState("dashboard"); // dashboard, nuevo, detalle, directorio, nuevoCliente, detalleCliente, reportes
  const [filtro, setFiltro] = useState("todos");

  // Formularios
  const initialForm = { nombre: "", kg: "", lavanderia: LAVANDERIAS[0], recordarEn: 3, notas: "", precio: "", clienteId: "" };
  const [form, setForm] = useState(initialForm);
  const [formCliente, setFormCliente] = useState({ nombre: "", celular: "", direccion: "", notasEntrega: "" });

  // Selección/Detalle
  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  const [clienteDirDetalle, setClienteDirDetalle] = useState(null);
  const [clienteDirEditId, setClienteDirEditId] = useState(null);

  // Utilidades de interfaz
  const [busquedaDir, setBusquedaDir] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [lavanderiaTemp, setLavanderiaTemp] = useState(LAVANDERIAS[0]);
  const [tick, setTick] = useState(0);

  // Sincronización LocalStorage
  useEffect(() => { localStorage.setItem("mc_clientes", JSON.stringify(pedidos)); }, [pedidos]);
  useEffect(() => { localStorage.setItem("mc_directorio", JSON.stringify(directorio)); }, [directorio]);

  // Reloj interno para refrescar contadores dinámicos cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // --- CÁLCULO DE ALERTAS Y TIEMPOS ---
  const getMinutosParaAlerta = (p) => {
    const alertTime = new Date(p.ingreso).getTime() + p.recordarEn * 3600000;
    return Math.round((alertTime - Date.now()) / 60000);
  };
  const isVencido = (p) => getMinutosParaAlerta(p) <= 0 && p.estado === "En lavandería";
  const isUrgente = (p) => {
    const min = getMinutosParaAlerta(p);
    return min <= 30 && min > 0 && p.estado === "En lavandería";
  };

  // Pedidos Urgentes/Atrasados (Automatización de Dashboard)
  const pedidosUrgentes = pedidos.filter(p => isVencido(p) || isUrgente(p));

  // --- ESTADÍSTICAS DEL DÍA ---
  const statsHoy = () => {
    const hoyStr = new Date().toDateString();
    const pedidosHoy = pedidos.filter(p => new Date(p.ingreso).toDateString() === hoyStr);
    const ingresos = pedidosHoy.reduce((acc, curr) => acc + parseFloat(curr.precio || 0), 0);
    return {
      activos: pedidos.filter(p => p.estado !== "Entregado").length,
      listos: pedidos.filter(p => p.estado === "Listo para entregar").length,
      ingresosHoy: ingresos.toFixed(2)
    };
  };

  // --- REPORTES AVANZADOS (SEMANAL Y MENSUAL) ---
  const statsReportes = () => {
    const ahora = Date.now();
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    const dosSemanas = 14 * 24 * 60 * 60 * 1000;
    const unMes = 30 * 24 * 60 * 60 * 1000;

    const estaSemana = pedidos.filter(p => (ahora - new Date(p.ingreso).getTime()) <= unaSemana);
    const semanaAnterior = pedidos.filter(p => {
      const diff = ahora - new Date(p.ingreso).getTime();
      return diff > unaSemana && diff <= dosSemanas;
    });
    const esteMes = pedidos.filter(p => (ahora - new Date(p.ingreso).getTime()) <= unMes);

    const ingresosSemana = estaSemana.reduce((sum, p) => sum + parseFloat(p.precio || 0), 0);
    const ingresosSemanaAnterior = semanaAnterior.reduce((sum, p) => sum + parseFloat(p.precio || 0), 0);
    const ingresosMes = esteMes.reduce((sum, p) => sum + parseFloat(p.precio || 0), 0);

    const kgSemana = estaSemana.reduce((sum, p) => sum + parseFloat(p.kg || 0), 0);

    return { ingresosSemana, ingresosSemanaAnterior, ingresosMes, kgSemana, pedidosMes: esteMes.length };
  };

  // --- FILTRADO DE LOGS Y DIRECTORIO ---
  const pedidosFiltrados = pedidos.filter(p => {
    if (filtro === "todos") return p.estado !== "Entregado";
    if (filtro === "entregados") return p.estado === "Entregado";
    return p.estado === filtro;
  });

  const directorioFiltrado = directorio.filter(d => {
    const q = busquedaDir.toLowerCase();
    return d.nombre.toLowerCase().includes(q) || (d.celular || "").includes(q) || (d.direccion || "").toLowerCase().includes(q);
  });

  // --- LOGICA AUTOCALCULO DE SUGERENCIAS ---
  const handleNombreChange = (val) => {
    setForm(f => ({ ...f, nombre: val }));
    if (val.trim().length >= 1) {
      const filtrados = directorio.filter(d => d.nombre.toLowerCase().includes(val.toLowerCase()));
      setSugerencias(filtrados);
      setMostrarSugerencias(filtrados.length > 0);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };

  const seleccionarCliente = (c) => {
    setForm(f => ({ ...f, nombre: c.nombre, clienteId: String(c.id) }));
    setMostrarSugerencias(false);
  };

  // --- ACCIONES CORE ---
  const registrarPedido = () => {
    if (!form.nombre || !form.kg) return;
    const clienteVinculado = directorio.find(d => String(d.id) === form.clienteId);
    const nuevo = {
      id: Date.now(),
      nombre: form.nombre,
      kg: parseFloat(form.kg),
      precio: form.precio || (parseFloat(form.kg) * 5).toFixed(2),
      recordarEn: parseInt(form.recordarEn) || 3,
      notas: form.notas,
      clienteId: form.clienteId,
      ingreso: new Date().toISOString(),
      estado: "En recojo",
      lavanderia: "",
      historial: [{ estado: "En recojo", fecha: new Date().toISOString() }],
      celularEntrega: clienteVinculado?.celular || "",
      direccionEntrega: clienteVinculado?.direccion || "",
      notasEntregaCliente: clienteVinculado?.notasEntrega || "",
    };
    setPedidos([nuevo, ...pedidos]);
    setForm(initialForm);
    setVista("dashboard");
  };

  const cambiarEstado = (id, nuevoEstado, lavAsignada) => {
    const actualizados = pedidos.map(p => {
      if (p.id === id) {
        const obj = {
          ...p,
          estado: nuevoEstado,
          historial: [...(p.historial || []), { estado: nuevoEstado, fecha: new Date().toISOString() }]
        };
        if (lavAsignada) {
          obj.lavanderia = lavAsignada;
          obj.historial[obj.historial.length - 1].lavanderia = lavAsignada;
        }
        if (pedidoDetalle && pedidoDetalle.id === id) setPedidoDetalle(obj);
        return obj;
      }
      return p;
    });
    setPedidos(actualizados);
  };

  const guardarClienteDir = () => {
    if (!formCliente.nombre) return;
    if (clienteDirEditId) {
      setDirectorio(directorio.map(d => d.id === clienteDirEditId ? { ...d, ...formCliente } : d));
    } else {
      setDirectorio([{ id: Date.now(), ...formCliente }, ...directorio]);
    }
    setFormCliente({ nombre: "", celular: "", direccion: "", notasEntrega: "" });
    setClienteDirEditId(null);
    setVista("directorio");
  };

  return (
    <div style={{
      background: "#0a0a0f", color: "#e8e4dc", minHeight: "100vh",
      maxWidth: 480, margin: "0 auto", fontFamily: "'DM Sans', sans-serif",
      position: "relative", overflowX: "hidden", paddingBottom: 90
    }}>
      
      {/* HEADER DE CONTROL FIJO (Solo en Dashboard e Historiales) */}
      {(vista === "dashboard" || vista === "directorio" || vista === "reportes") && (
        <div style={{ padding: "20px 20px 10px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", sticky: "top", background: "#0a0a0fce", backdropFilter: "blur(10px)", zIndex: 40 }}>
          <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 15 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#10b981", fontWeight: 700, marginBottom: 2 }}>OPERACIONES</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>MC Laundry</div>
            </div>
            <div style={{ background: "rgba(16,185,129,0.1)", padding: "6px 12px", borderRadius: 20, border: "0.5px solid rgba(16,185,129,0.2)" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981" }}>En línea</span>
            </div>
          </div>

          {/* INDICADOR DE INGRESOS INDUSTRIALES DEL DÍA */}
          {vista === "dashboard" && (
            <div style={{ background: "linear-gradient(135deg, #11111f 0%, #0c1a15 100%)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 16, padding: 16, marginBottom: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#888", letterSpacing: 0.5, fontWeight: 500 }}>INGRESOS DE HOY</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981", marginTop: 2, letterSpacing: "-0.5px" }}>S/. {statsHoy().ingresosHoy}</div>
                </div>
                <div style={{ textRight: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6" }}>{statsHoy().activos}</div>
                  <div style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>RUTAS ACTIVAS</div>
                </div>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min((statsHoy().ingresosHoy / 300) * 100, 100)}%`, background: "#10b981", transition: "width 0.5s ease" }}></div>
              </div>
            </div>
          )}

          {/* NAVEGACIÓN DE TABS PRINCIPALES DE SISTEMA */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 12, border: "0.5px solid rgba(255,255,255,0.05)" }}>
            <button onClick={() => setVista("dashboard")} style={{ flex: 1, border: "none", background: vista === "dashboard" ? "#1a1a2e" : "transparent", color: vista === "dashboard" ? "#10b981" : "#666", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>📦 Pedidos</button>
            <button onClick={() => setVista("directorio")} style={{ flex: 1, border: "none", background: vista === "directorio" ? "#1a1a2e" : "transparent", color: vista === "directorio" ? "#10b981" : "#666", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>👤 Clientes ({directorio.length})</button>
            <button onClick={() => setVista("reportes")} style={{ flex: 1, border: "none", background: vista === "reportes" ? "#1a1a2e" : "transparent", color: vista === "reportes" ? "#10b981" : "#666", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>📊 Reportes</button>
          </div>
        </div>
      )}

      {/* VISTA: DASHBOARD PRINCIPAL */}
      {vista === "dashboard" && (
        <div style={{ padding: 20 }}>
          
          {/* SECCIÓN CRÍTICA DE ALERTA AUTOMÁTICA (MÓDULO URGENTE) */}
          {pedidosUrgentes.length > 0 && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, padding: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ animation: "pulse 1s infinite", color: "#ef4444" }}>⚠️</span>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", letterSpacing: 1 }}>ALERTA DE RECOJO URGENTE</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pedidosUrgentes.map(p => (
                  <div key={p.id} onClick={() => { setPedidoDetalle(p); setLavanderiaTemp(p.lavanderia || LAVANDERIAS[0]); setVista("detalle"); }} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderLeft: "3px solid #ef4444" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{p.lavanderia || "Sin lavandería asignada"}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
                      {getMinutosParaAlerta(p) <= 0 ? `Retrasado hace ${Math.abs(getMinutosParaAlerta(p))} min` : `Recoger en ${getMinutosParaAlerta(p)} min`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHIPS DE FILTRO INTELIGENTES CON COGNICIÓN DE ICONO */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 10 }}>
            {[{ key: "todos", label: "Activos" }, { key: "En recojo", label: "En recojo" }, { key: "Recogido", label: "Recogido" }, { key: "En lavandería", label: "En lavandería" }, { key: "Listo para entregar", label: "Listos" }, { key: "entregados", label: "Entregados" }].map(f => {
              const count = f.key === "todos" ? pedidos.filter(p => p.estado !== "Entregado").length : f.key === "entregados" ? pedidos.filter(p => p.estado === "Entregado").length : pedidos.filter(p => p.estado === f.key).length;
              return (
                <button key={f.key} onClick={() => setFiltro(f.key)} style={{
                  border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 11, fontWeight: 600,
                  background: filtro === f.key ? "#10b981" : "rgba(255,255,255,0.04)",
                  color: filtro === f.key ? "#fff" : "#999", whiteSpace: "nowrap", cursor: "pointer", display: "flex", alignItems: "center", gap: 5
                }}>
                  <span>{ESTADO_ICONS[f.key] || "📦"}</span>
                  {f.label} <span style={{ opacity: 0.6, fontSize: 10, background: "rgba(0,0,0,0.2)", padding: "1px 5px", borderRadius: 10 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* LISTADO DE PEDIDOS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pedidosFiltrados.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444", fontSize: 13 }}>No hay pedidos en esta fase de la operación.</div>
            ) : (
              pedidosFiltrados.map(p => {
                const atrasado = isVencido(p);
                return (
                  <div key={p.id} onClick={() => { setPedidoDetalle(p); setLavanderiaTemp(p.lavanderia || LAVANDERIAS[0]); setVista("detalle"); }} style={{
                    background: atrasado ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                    border: atrasado ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 16, padding: 16, cursor: "pointer", transition: "transform 0.1s"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          {p.nombre}
                          {atrasado && <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>RETRASADO</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>{p.lavanderia || "⚡ Esperando Lavandería"}</div>
                        {p.direccionEntrega && <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 4 }}>📍 {p.direccionEntrega}</div>}
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#999", marginTop: 8 }}>
                          <span>⚖️ {p.kg} kg</span>
                          <span style={{ color: "#10b981", fontWeight: 600 }}>S/. {p.precio}</span>
                          <span>🕒 {timeAgo(p.ingreso)}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 6, color: ESTADO_COLORS[p.estado], background: `${ESTADO_COLORS[p.estado]}15` }}>
                        {p.estado.toUpperCase()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VISTA: REPORTES AVANZADOS (ANÁLISIS SEMANAL Y MENSUAL) */}
      {vista === "reportes" && (
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 15, color: "#10b981" }}>Métricas del Negocio</div>
          
          <div style={{ gridTemplateColumns: "1fr 1fr", display: "grid", gap: 10, marginBottom: 20 }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#666" }}>LAVADO ESTA SEMANA</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "#a78bfa" }}>{statsReportes().kgSemana.toFixed(1)} Kg</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#666" }}>VOLUMEN DEL MES</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "#3b82f6" }}>{statsReportes().pedidosMes} Pedidos</div>
            </div>
          </div>

          {/* BALANCE FINANCIERO INTEGRADO */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>PRODUCCIÓN DE INGRESOS MENSUAL</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>S/. {statsReportes().ingresosMes.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Dinero acumulado en los últimos 30 días operacionales</div>
          </div>

          {/* GRÁFICO COMPARATIVO VISUAL SEMANAL */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 15 }}>RENDIMIENTO: SEMANA ACTUAL VS ANTERIOR</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, color: "#999" }}>
                  <span>Esta Semana</span>
                  <span style={{ fontWeight: 600 }}>S/. {statsReportes().ingresosSemana.toFixed(2)}</span>
                </div>
                <div style={{ height: 12, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#10b981", width: `${Math.max(10, Math.min((statsReportes().ingresosSemana / Math.max(statsReportes().ingresosSemanaAnterior, 1)) * 100, 100))}%` }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, color: "#666" }}>
                  <span>Semana Anterior</span>
                  <span style={{ fontWeight: 600 }}>S/. {statsReportes().ingresosSemanaAnterior.toFixed(2)}</span>
                </div>
                <div style={{ height: 12, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#6b7280", width: `${Math.max(10, Math.min((statsReportes().ingresosSemanaAnterior / Math.max(statsReportes().ingresosSemana, 1)) * 100, 100))}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA: NUEVO PEDIDO (ACCESO DIRECTO DEL PULGAR) */}
      {vista === "nuevo" && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => { setVista("dashboard"); setForm(initialForm); }} style={{ border: "none", background: "rgba(255,255,255,0.05)", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer" }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Nuevo Registro Operativo</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            {/* INPUT INTELIGENTE AUTOCOMPLETE */}
            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>CLIENTE</label>
              <input type="text" placeholder="Escribe para buscar o ingresar..." value={form.nombre} onChange={(e) => handleNombreChange(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
              
              {mostrarSugerencias && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#11111f", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "0 0 12px 12px", zIndex: 100, maxHeight: 180, overflowY: "auto" }}>
                  {sugerencias.map(s => (
                    <div key={s.id} onClick={() => seleccionarCliente(s)} style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", fontSize: 13 }}>
                      <strong>{s.nombre}</strong> {s.celular && `· 📱 ${s.celular}`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>PESO (KG)</label>
                <input type="number" placeholder="0.0" value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>COBRO TOTAL (S/.)</label>
                <input type="number" placeholder={form.kg ? `S/. ${(form.kg * 5).toFixed(2)}` : "0.00"} value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>ALERTAR RETORNO (HORAS)</label>
              <input type="number" placeholder="3" value={form.recordarEn} onChange={(e) => setForm({ ...form, recordarEn: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
            </div>

            <div>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>NOTAS OPERATIVAS</label>
              <input type="text" placeholder="Prendas delicadas, botones sueltos..." value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
            </div>

            <button onClick={registrarPedido} disabled={!form.nombre || !form.kg} style={{
              width: "100%", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, marginTop: 10,
              background: (form.nombre && form.kg) ? "#10b981" : "rgba(255,255,255,0.03)",
              color: (form.nombre && form.kg) ? "#fff" : "#444", cursor: (form.nombre && form.kg) ? "pointer" : "not-allowed"
            }}>Crear Orden e Iniciar Ruta</button>
          </div>
        </div>
      )}

      {/* VISTA: DETALLE DE PEDIDO */}
      {vista === "detalle" && pedidoDetalle && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setVista("dashboard")} style={{ border: "none", background: "rgba(255,255,255,0.05)", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer" }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Orden: {pedidoDetalle.nombre}</div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, marginBottom: 15, fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color: "#666" }}>Lavandería Asignada</span>
              <strong>{pedidoDetalle.lavanderia || "— Ninguna"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color: "#666" }}>Volumen</span>
              <strong>{pedidoDetalle.kg} kg</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color: "#666" }}>Precio Facturado</span>
              <strong style={{ color: "#10b981" }}>S/. {pedidoDetalle.precio}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
              <span style={{ color: "#666" }}>Notas</span>
              <span>{pedidoDetalle.notas || "—"}</span>
            </div>
          </div>

          {/* CONTROL INTEGRADO DEL FLUJO DE TRABAJO */}
          <div style={{ fontSize: 11, color: "#666", marginBottom: 8, letterSpacing: 0.5 }}>ACTUALIZAR ESTADO DE LA ORDEN</div>
          
          {pedidoDetalle.estado === "Recogido" && (
            <div style={{ background: "rgba(232,121,249,0.08)", border: "1px solid rgba(232,121,249,0.3)", borderRadius: 14, padding: 14, marginBottom: 15 }}>
              <div style={{ fontSize: 12, color: "#e879f9", fontWeight: 600, marginBottom: 10 }}>Asignar Destino de Lavado</div>
              <select value={lavanderiaTemp} onChange={(e) => setLavanderiaTemp(e.target.value)} style={{ width: "100%", background: "#111", color: "#fff", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 10, outline: "none" }}>
                {LAVANDERIAS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={() => cambiarEstado(pedidoDetalle.id, "En lavandería", lavanderiaTemp)} style={{ width: "100%", background: "#3b82f6", color: "#fff", border: "none", padding: 10, borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Confirmar Entrega en Planta</button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ESTADOS.map(e => {
              if (e === "En lavandería" && pedidoDetalle.estado === "Recogido") return null;
              return (
                <button key={e} onClick={() => cambiarEstado(pedidoDetalle.id, e)} style={{
                  width: "100%", textAlign: "left", padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)",
                  background: pedidoDetalle.estado === e ? `${ESTADO_COLORS[e]}12` : "rgba(255,255,255,0.02)",
                  color: pedidoDetalle.estado === e ? ESTADO_COLORS[e] : "#aaa", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e}</div>
                  </div>
                  {pedidoDetalle.estado === e && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA: DIRECTORIO DE CLIENTES */}
      {vista === "directorio" && (
        <div style={{ padding: 20 }}>
          <input type="text" placeholder="🔍 Buscar cliente por nombre o dirección..." value={busquedaDir} onChange={(e) => setBusquedaDir(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", marginBottom: 15 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {directorioFiltrado.map(d => (
              <div key={d.id} onClick={() => { setClienteDirDetalle(d); setVista("detalleCliente"); }} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, cursor: "pointer" }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{d.nombre}</div>
                {d.celular && <div style={{ fontSize: 12, color: "#a78bfa", marginTop: 4 }}>📱 {d.celular}</div>}
                {d.direccion && <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>📍 {d.direccion}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA: CREAR / EDITAR CLIENTE */}
      {vista === "nuevoCliente" && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => { setVista("directorio"); setClienteDirEditId(null); setFormCliente({ nombre: "", celular: "", direccion: "", notasEntrega: "" }); }} style={{ border: "none", background: "rgba(255,255,255,0.05)", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer" }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{clienteDirEditId ? "Modificar Cliente" : "Nuevo Perfil de Cliente"}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>NOMBRE COMPLETO</label>
              <input type="text" value={formCliente.nombre} onChange={(e) => setFormCliente({ ...formCliente, nombre: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>CELULAR</label>
              <input type="tel" value={formCliente.celular} onChange={(e) => setFormCliente({ ...formCliente, celular: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>DIRECCIÓN DE ENTREGA</label>
              <input type="text" value={formCliente.direccion} onChange={(e) => setFormCliente({ ...formCliente, direccion: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>NOTAS LOGÍSTICAS DE DELIVERY</label>
              <textarea value={formCliente.notasEntrega} onChange={(e) => setFormCliente({ ...formCliente, notasEntrega: e.target.value })} rows={3} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", resize: "none" }} />
            </div>

            <button onClick={guardarClienteDir} disabled={!formCliente.nombre} style={{
              width: "100%", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, marginTop: 10,
              background: formCliente.nombre ? "#10b981" : "rgba(255,255,255,0.03)",
              color: formCliente.nombre ? "#fff" : "#444", cursor: formCliente.nombre ? "pointer" : "not-allowed"
            }}>Guardar Perfil</button>
          </div>
        </div>
      )}

      {/* VISTA: DETALLE DE CLIENTE DESDE EL DIRECTORIO */}
      {vista === "detalleCliente" && clienteDirDetalle && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setVista("directorio")} style={{ border: "none", background: "rgba(255,255,255,0.05)", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer" }}>←</button>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{clienteDirDetalle.nombre}</div>
            </div>
            <button onClick={() => { setFormCliente(clienteDirDetalle); setClienteDirEditId(clienteDirDetalle.id); setVista("nuevoCliente"); }} style={{ background: "transparent", border: "none", color: "#3b82f6", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Editar</button>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>INFORMACIÓN BASE</div>
            {clienteDirDetalle.celular && <div style={{ fontSize: 14, marginBottom: 8 }}>📱 Celular: <strong style={{ color: "#a78bfa" }}>{clienteDirDetalle.celular}</strong></div>}
            {clienteDirDetalle.direccion && <div style={{ fontSize: 14, marginBottom: 8 }}>📍 Dirección: <strong style={{ color: "#fff" }}>{clienteDirDetalle.direccion}</strong></div>}
            {clienteDirDetalle.notasEntrega && <div style={{ fontSize: 12, color: "#aaa", background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, marginTop: 10 }}>📝 {clienteDirDetalle.notasEntrega}</div>}
          </div>

          <button onClick={() => { setForm({ ...initialForm, clienteId: String(clienteDirDetalle.id), nombre: clienteDirDetalle.nombre }); setVista("nuevo"); }} style={{ width: "100%", background: "#10b981", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontWeight: 600, cursor: "pointer" }}>+ Crear Orden para este Cliente</button>
        </div>
      )}

      {/* 🎯 BOTÓN ACCIÓN FLOTANTE (FAB) CENTRAL - ERGONÓMICO PARA EL PULGAR */}
      {(vista === "dashboard" || vista === "directorio" || vista === "reportes") && (
        <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 50 }}>
          <button onClick={() => {
            if (vista === "directorio") {
              setFormCliente({ nombre: "", celular: "", direccion: "", notasEntrega: "" });
              setVista("nuevoCliente");
            } else {
              setForm(initialForm);
              setVista("nuevo");
            }
          }} style={{
            pointerEvents: "auto", background: "#10b981", color: "#fff", border: "none",
            borderRadius: 30, padding: "14px 28px", fontSize: 14, fontWeight: 700,
            boxShadow: "0 10px 25px rgba(16,185,129,0.4)", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.2px"
          }}>
            <span style={{ fontSize: 18 }}>+</span>
            <span>{vista === "directorio" ? "NUEVO CLIENTE" : "NUEVO PEDIDO"}</span>
          </button>
        </div>
      )}

    </div>
  );
}
