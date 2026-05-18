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
const ESTADO_DESC = {
  "En recojo":           "Camino a buscar la ropa",
  "Recogido":            "Ropa en mano · asignando lavandería",
  "En lavandería":       "Ropa dejada en lavandería",
  "Listo para entregar": "Lavada y lista para entregar",
  "Entregado":           "Entregada al cliente",
};

function formatTime(date) {
  return new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(date) {
  return new Date(date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}
function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `hace ${h}h ${m}m`;
  return `hace ${m}m`;
}

const initialForm = {
  nombre: "", kg: "", lavanderia: LAVANDERIAS[0],
  recordarEn: 3, notas: "", precio: "",
  clienteId: "" // vinculado al directorio
};

const initialClienteDir = {
  nombre: "", celular: "", direccion: "", notasEntrega: ""
};

const inputStyle = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "0.5px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "12px 14px",
  color: "#e8e4dc", fontSize: 15, outline: "none",
  boxSizing: "border-box"
};

const labelStyle = { fontSize: 11, letterSpacing: 1, color: "#666", marginBottom: 6 };

export default function MCLaundry() {
  const [pedidos, setPedidos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mc_clientes") || "[]"); } catch { return []; }
  });
  const [directorio, setDirectorio] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mc_directorio") || "[]"); } catch { return []; }
  });
  const [form, setForm] = useState(initialForm);
  const [clienteDir, setClienteDir] = useState(initialClienteDir);
  const [vista, setVista] = useState("dashboard"); // dashboard | nuevo | detalle | directorio | nuevoCliente | detalleCliente
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [clienteDirActivo, setClienteDirActivo] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [busquedaDir, setBusquedaDir] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [lavanderiaTemp, setLavanderiaTemp] = useState(LAVANDERIAS[0]);
  const nombreInputRef = useRef(null);
  const intervalRef = useRef(null);

  // Persist pedidos
  useEffect(() => {
    try { localStorage.setItem("mc_clientes", JSON.stringify(pedidos)); } catch {}
  }, [pedidos]);

  // Persist directorio
  useEffect(() => {
    try { localStorage.setItem("mc_directorio", JSON.stringify(directorio)); } catch {}
  }, [directorio]);

  // Check reminders every 30s
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      pedidos.forEach(c => {
        if (c.estado === "En lavandería" && c.recordarEn) {
          const alertTime = new Date(c.ingreso).getTime() + c.recordarEn * 3600000;
          if (now >= alertTime && now <= alertTime + 60000 && !c.alertado) {
            setAlertas(prev => [...prev, { id: c.id, msg: `¡Recoger ropa de ${c.nombre} en ${c.lavanderia}!` }]);
            setPedidos(prev => prev.map(x => x.id === c.id ? { ...x, alertado: true } : x));
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("MC Laundry", { body: `Recoger ropa de ${c.nombre}`, icon: "👕" });
            }
          }
        }
      });
    };
    intervalRef.current = setInterval(check, 30000);
    return () => clearInterval(intervalRef.current);
  }, [pedidos]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ─── Pedidos ────────────────────────────────────────────────
  const agregarPedido = () => {
    if (!form.nombre || !form.kg) return;
    const clienteVinculado = directorio.find(d => d.id === parseInt(form.clienteId));
    const nuevo = {
      id: Date.now(),
      ...form,
      kg: parseFloat(form.kg),
      precio: form.precio || (parseFloat(form.kg) * 5).toFixed(2),
      ingreso: new Date().toISOString(),
      estado: "En recojo",
      lavanderia: "",   // se asigna después, cuando esté "En lavandería"
      alertado: false,
      historial: [{ estado: "En recojo", fecha: new Date().toISOString() }],
      celularEntrega: clienteVinculado?.celular || "",
      direccionEntrega: clienteVinculado?.direccion || "",
      notasEntregaCliente: clienteVinculado?.notasEntrega || "",
    };
    setPedidos(prev => [nuevo, ...prev]);
    setForm(initialForm);
    setVista("dashboard");
  };

  const cambiarEstado = (id, nuevoEstado, lavanderiaAsignada) => {
    setPedidos(prev => prev.map(c => c.id === id ? {
      ...c,
      estado: nuevoEstado,
      ...(lavanderiaAsignada ? { lavanderia: lavanderiaAsignada } : {}),
      historial: [...(c.historial || []), {
        estado: nuevoEstado,
        fecha: new Date().toISOString(),
        ...(lavanderiaAsignada ? { lavanderia: lavanderiaAsignada } : {})
      }]
    } : c));
  };

  const eliminarPedido = (id) => {
    setPedidos(prev => prev.filter(c => c.id !== id));
    setVista("dashboard");
  };

  // ─── Directorio ─────────────────────────────────────────────
  const guardarClienteDir = () => {
    if (!clienteDir.nombre) return;
    if (clienteDirActivo) {
      // editar
      setDirectorio(prev => prev.map(d => d.id === clienteDirActivo ? { ...d, ...clienteDir } : d));
    } else {
      // nuevo
      setDirectorio(prev => [{ id: Date.now(), ...clienteDir }, ...prev]);
    }
    setClienteDir(initialClienteDir);
    setClienteDirActivo(null);
    setVista("directorio");
  };

  const eliminarClienteDir = (id) => {
    setDirectorio(prev => prev.filter(d => d.id !== id));
    setVista("directorio");
  };

  const abrirEditarCliente = (cliente) => {
    setClienteDir({
      nombre: cliente.nombre,
      celular: cliente.celular || "",
      direccion: cliente.direccion || "",
      notasEntrega: cliente.notasEntrega || ""
    });
    setClienteDirActivo(cliente.id);
    setVista("nuevoCliente");
  };

  // ─── Filtros ─────────────────────────────────────────────────
  const pedidosFiltrados = pedidos.filter(c => {
    if (filtro === "todos") return c.estado !== "Entregado";
    if (filtro === "entregados") return c.estado === "Entregado";
    return c.estado === filtro;
  });

  const directorioFiltrado = directorio.filter(d =>
    d.nombre.toLowerCase().includes(busquedaDir.toLowerCase()) ||
    (d.celular || "").includes(busquedaDir) ||
    (d.direccion || "").toLowerCase().includes(busquedaDir.toLowerCase())
  );

  const stats = {
    activos: pedidos.filter(c => c.estado !== "Entregado").length,
    listos: pedidos.filter(c => c.estado === "Listo para entregar").length,
    hoy: pedidos.filter(c => new Date(c.ingreso).toDateString() === new Date().toDateString()).length,
    ingresosHoy: pedidos
      .filter(c => new Date(c.ingreso).toDateString() === new Date().toDateString())
      .reduce((s, c) => s + parseFloat(c.precio || 0), 0),
  };

  const pedidoDetalle = pedidos.find(c => c.id === pedidoActivo);
  const clienteDirDetalle = directorio.find(d => d.id === clienteDirActivo);

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e8e4dc", maxWidth: 480, margin: "0 auto",
      position: "relative", overflow: "hidden"
    }}>
      {/* Ambient background */}
      <div style={{
        position: "fixed", top: -100, right: -100,
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      {/* Alerts */}
      {alertas.map((a, i) => (
        <div key={i} onClick={() => setAlertas(prev => prev.filter((_, j) => j !== i))}
          style={{
            position: "fixed", top: 16, left: 16, right: 16, zIndex: 999,
            background: "linear-gradient(135deg, #10b981, #059669)",
            borderRadius: 12, padding: "14px 16px",
            boxShadow: "0 8px 32px rgba(16,185,129,0.4)",
            cursor: "pointer"
          }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>RECORDATORIO</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{a.msg}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Toca para cerrar</div>
        </div>
      ))}

      {/* Header */}
      <div style={{ padding: "20px 20px 0", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#10b981", marginBottom: 4 }}>OPERACIONES</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>MC Laundry</div>
          </div>
          {(vista === "dashboard" || vista === "directorio") && (
            <button
              onClick={() => vista === "directorio" ? (setClienteDir(initialClienteDir), setClienteDirActivo(null), setVista("nuevoCliente")) : setVista("nuevo")}
              style={{
                background: "#10b981", border: "none", borderRadius: 10,
                width: 40, height: 40, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, color: "#fff",
                boxShadow: "0 4px 16px rgba(16,185,129,0.4)"
              }}>+</button>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, paddingBottom: 12 }}>
          {[
            { label: "Activos", val: stats.activos, color: "#3b82f6" },
            { label: "Listos", val: stats.listos, color: "#10b981" },
            { label: "Hoy", val: stats.hoy, color: "#f59e0b" },
            { label: "S/.", val: stats.ingresosHoy.toFixed(0), color: "#a78bfa" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              border: `0.5px solid ${s.color}33`,
              borderRadius: 10, padding: "10px 8px", textAlign: "center"
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#666", letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Nav tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 4 }}>
          {[
            { key: "dashboard", label: "Pedidos" },
            { key: "directorio", label: "Clientes" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setVista(tab.key)}
              style={{
                flex: 1, background: "none", border: "none",
                borderBottom: (vista === tab.key || (tab.key === "dashboard" && ["nuevo", "detalle"].includes(vista)) || (tab.key === "directorio" && ["nuevoCliente", "detalleCliente"].includes(vista)))
                  ? "2px solid #10b981" : "2px solid transparent",
                padding: "10px 0", cursor: "pointer",
                color: (vista === tab.key || (tab.key === "dashboard" && ["nuevo", "detalle"].includes(vista)) || (tab.key === "directorio" && ["nuevoCliente", "detalleCliente"].includes(vista)))
                  ? "#10b981" : "#555",
                fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
                transition: "all 0.2s"
              }}>{tab.label}
              {tab.key === "directorio" && (
                <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(167,139,250,0.15)", color: "#a78bfa", padding: "1px 6px", borderRadius: 10 }}>
                  {directorio.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          DASHBOARD — lista de pedidos
      ════════════════════════════════════════ */}
      {vista === "dashboard" && (
        <div style={{ padding: "16px 20px 80px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {[
              { key: "todos", label: "Activos" },
              { key: "En recojo", label: "Por recoger" },
              { key: "En lavandería", label: "En lavandería" },
              { key: "Listo para entregar", label: "Listos" },
              { key: "entregados", label: "Entregados" },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltro(f.key)}
                style={{
                  background: filtro === f.key ? "#10b981" : "rgba(255,255,255,0.05)",
                  border: "none", borderRadius: 8, padding: "6px 12px",
                  cursor: "pointer", whiteSpace: "nowrap",
                  fontSize: 12, color: filtro === f.key ? "#fff" : "#888",
                  fontWeight: filtro === f.key ? 600 : 400
                }}>{f.label}</button>
            ))}
          </div>

          {pedidosFiltrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#444" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👕</div>
              <div style={{ fontSize: 14 }}>No hay pedidos aquí</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Toca + para agregar uno</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pedidosFiltrados.map(c => {
                const alertTime = new Date(c.ingreso).getTime() + c.recordarEn * 3600000;
                const minutosParaAlerta = Math.round((alertTime - Date.now()) / 60000);
                const urgente = minutosParaAlerta <= 30 && minutosParaAlerta > 0 && c.estado === "En lavandería";
                const vencido = minutosParaAlerta <= 0 && c.estado === "En lavandería";

                return (
                  <div key={c.id}
                    onClick={() => { setPedidoActivo(c.id); setVista("detalle"); }}
                    style={{
                      background: vencido ? "rgba(239,68,68,0.08)" : urgente ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)",
                      border: `0.5px solid ${vencido ? "rgba(239,68,68,0.3)" : urgente ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{c.nombre}</div>
                          {vencido && <span style={{ fontSize: 10, background: "rgba(239,68,68,0.2)", color: "#ef4444", padding: "2px 8px", borderRadius: 6, letterSpacing: 1 }}>RECOGER YA</span>}
                          {urgente && <span style={{ fontSize: 10, background: "rgba(245,158,11,0.2)", color: "#f59e0b", padding: "2px 8px", borderRadius: 6, letterSpacing: 1 }}>PRONTO</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                          {c.lavanderia || <span style={{ color: "#e879f9", fontSize: 11 }}>⚡ Asignar lavandería</span>}
                        </div>
                        {/* Dirección de entrega si existe */}
                        {c.direccionEntrega && (
                          <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                            <span>📍</span> {c.direccionEntrega}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#888" }}>
                          <span>{c.kg} kg</span>
                          <span>S/. {c.precio}</span>
                          <span>{timeAgo(c.ingreso)}</span>
                        </div>
                        {c.estado === "En lavandería" && (
                          <div style={{ fontSize: 11, color: minutosParaAlerta <= 0 ? "#ef4444" : "#f59e0b", marginTop: 4 }}>
                            {minutosParaAlerta <= 0
                              ? `⚠️ Debía recogerse hace ${Math.abs(minutosParaAlerta)}min`
                              : `⏱ Recoger en ${minutosParaAlerta}min`}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 10, letterSpacing: 1, fontWeight: 600,
                        color: ESTADO_COLORS[c.estado],
                        background: `${ESTADO_COLORS[c.estado]}18`,
                        padding: "4px 8px", borderRadius: 6, whiteSpace: "nowrap", marginLeft: 8
                      }}>{c.estado.toUpperCase()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          NUEVO PEDIDO
      ════════════════════════════════════════ */}
      {vista === "nuevo" && (
        <div style={{ padding: "20px 20px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button onClick={() => { setVista("dashboard"); setMostrarSugerencias(false); setSugerencias([]); }}
              style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 18 }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Nuevo pedido</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── Campo nombre con AUTOCOMPLETE ── */}
            <div style={{ position: "relative" }}>
              <div style={labelStyle}>NOMBRE DEL CLIENTE</div>
              <div style={{ position: "relative" }}>
                <input
                  ref={nombreInputRef}
                  type="text"
                  placeholder="Escribe el nombre..."
                  value={form.nombre}
                  autoComplete="off"
                  onChange={e => {
                    const val = e.target.value;
                    setForm(prev => ({ ...prev, nombre: val, clienteId: "" }));
                    if (val.trim().length >= 1) {
                      const matches = directorio.filter(d =>
                        d.nombre.toLowerCase().includes(val.toLowerCase())
                      );
                      setSugerencias(matches);
                      setMostrarSugerencias(matches.length > 0);
                    } else {
                      setSugerencias([]);
                      setMostrarSugerencias(false);
                    }
                  }}
                  onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                  onFocus={() => {
                    if (form.nombre.trim().length >= 1 && sugerencias.length > 0) {
                      setMostrarSugerencias(true);
                    }
                  }}
                  style={{
                    ...inputStyle,
                    borderColor: form.clienteId ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.1)",
                    paddingRight: form.clienteId ? "40px" : "14px"
                  }}
                />
                {/* Ícono de cliente vinculado */}
                {form.clienteId && (
                  <div style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    fontSize: 16, cursor: "pointer"
                  }}
                    onClick={() => {
                      setForm(prev => ({ ...prev, clienteId: "", nombre: "" }));
                      setSugerencias([]);
                      setMostrarSugerencias(false);
                      setTimeout(() => nombreInputRef.current?.focus(), 50);
                    }}
                    title="Quitar cliente">
                    ✕
                  </div>
                )}
              </div>

              {/* Dropdown de sugerencias */}
              {mostrarSugerencias && sugerencias.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                  background: "#131320",
                  border: "0.5px solid rgba(167,139,250,0.35)",
                  borderRadius: "0 0 12px 12px",
                  overflow: "hidden",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.6)"
                }}>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#a78bfa", padding: "8px 14px 4px", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                    CLIENTES REGISTRADOS
                  </div>
                  {sugerencias.map((d, i) => (
                    <div key={d.id}
                      onMouseDown={() => {
                        setForm(prev => ({
                          ...prev,
                          nombre: d.nombre,
                          clienteId: String(d.id)
                        }));
                        setSugerencias([]);
                        setMostrarSugerencias(false);
                      }}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        borderBottom: i < sugerencias.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none",
                        display: "flex", alignItems: "center", gap: 10,
                        transition: "background 0.15s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(167,139,250,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "rgba(167,139,250,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, flexShrink: 0
                      }}>👤</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Resaltar la parte que coincide */}
                        {(() => {
                          const q = form.nombre.toLowerCase();
                          const n = d.nombre;
                          const idx = n.toLowerCase().indexOf(q);
                          if (idx === -1) return <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e4dc" }}>{n}</div>;
                          return (
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e4dc" }}>
                              {n.slice(0, idx)}
                              <span style={{ color: "#a78bfa", background: "rgba(167,139,250,0.15)", borderRadius: 3, padding: "0 1px" }}>
                                {n.slice(idx, idx + q.length)}
                              </span>
                              {n.slice(idx + q.length)}
                            </div>
                          );
                        })()}
                        <div style={{ fontSize: 11, color: "#555", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[d.celular, d.direccion].filter(Boolean).join(" · ") || "Sin datos adicionales"}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: "#a78bfa", flexShrink: 0 }}>Seleccionar →</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tarjeta del cliente vinculado */}
              {form.clienteId && (() => {
                const cl = directorio.find(d => d.id === parseInt(form.clienteId));
                return cl ? (
                  <div style={{ marginTop: 8, background: "rgba(167,139,250,0.08)", border: "0.5px solid rgba(167,139,250,0.25)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 1, marginBottom: 6 }}>CLIENTE VINCULADO ✓</div>
                    {cl.celular && <div style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 2 }}>📱 {cl.celular}</div>}
                    {cl.direccion && <div style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 2 }}>📍 {cl.direccion}</div>}
                    {cl.notasEntrega && <div style={{ fontSize: 11, color: "#888" }}>📝 {cl.notasEntrega}</div>}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Resto de campos */}
            {[
              { label: "Kilos de ropa", key: "kg", type: "number", placeholder: "4" },
              { label: "Precio cobrado (S/.)", key: "precio", type: "number", placeholder: "Auto: kg × 5" },
              { label: "Recordar en (horas)", key: "recordarEn", type: "number", placeholder: "3" },
              { label: "Notas del pedido", key: "notas", type: "text", placeholder: "Ropa delicada, entregar a domicilio..." },
            ].map(f => (
              <div key={f.key}>
                <div style={labelStyle}>{f.label.toUpperCase()}</div>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}

            <div>
              <div style={labelStyle}>LAVANDERÍA</div>
              <div style={{
                background: "rgba(233,121,249,0.06)", border: "0.5px solid rgba(233,121,249,0.2)",
                borderRadius: 10, padding: "12px 14px"
              }}>
                <div style={{ fontSize: 13, color: "#e879f9" }}>🚴 Se asigna después del recojo</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                  Primero recoge, luego eliges la lavandería disponible
                </div>
              </div>
            </div>

            {form.kg && (
              <div style={{
                background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.2)",
                borderRadius: 10, padding: "12px 14px"
              }}>
                <div style={{ fontSize: 12, color: "#10b981", marginBottom: 4 }}>Resumen</div>
                <div style={{ fontSize: 14, color: "#e8e4dc" }}>
                  {form.kg} kg × S/. 5.00 = <strong>S/. {(parseFloat(form.kg) * 5).toFixed(2)}</strong>
                </div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                  Costo lavandería: S/. {(parseFloat(form.kg) * 3.5).toFixed(2)} |
                  Tu ganancia: S/. {(parseFloat(form.kg) * 1.5).toFixed(2)}
                </div>
              </div>
            )}

            <button onClick={agregarPedido}
              disabled={!form.nombre || !form.kg}
              style={{
                background: form.nombre && form.kg ? "#10b981" : "rgba(255,255,255,0.05)",
                border: "none", borderRadius: 12, padding: "16px",
                color: form.nombre && form.kg ? "#fff" : "#444",
                fontSize: 15, fontWeight: 600, cursor: form.nombre && form.kg ? "pointer" : "default",
                boxShadow: form.nombre && form.kg ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
                marginTop: 8
              }}>
              Registrar pedido
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          DETALLE PEDIDO
      ════════════════════════════════════════ */}
      {vista === "detalle" && pedidoDetalle && (
        <div style={{ padding: "20px 20px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button onClick={() => setVista("dashboard")}
              style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 18 }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{pedidoDetalle.nombre}</div>
          </div>

          {/* Info principal */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "16px", marginBottom: 12
          }}>
            {[
              { label: "Lavandería", val: pedidoDetalle.lavanderia || "—  Sin asignar aún" },
              { label: "Kilos", val: `${pedidoDetalle.kg} kg` },
              { label: "Precio cobrado", val: `S/. ${pedidoDetalle.precio}` },
              { label: "Tu ganancia", val: `S/. ${(pedidoDetalle.kg * 1.5).toFixed(2)}` },
              { label: "Ingresado", val: `${formatDate(pedidoDetalle.ingreso)} ${formatTime(pedidoDetalle.ingreso)}` },
              { label: "Notas", val: pedidoDetalle.notas || "—" },
            ].map((r, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: i < 5 ? "0.5px solid rgba(255,255,255,0.05)" : "none"
              }}>
                <span style={{ fontSize: 12, color: "#666" }}>{r.label}</span>
                <span style={{ fontSize: 13, color: r.label === "Lavandería" && !pedidoDetalle.lavanderia ? "#e879f9" : "#e8e4dc", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Datos de entrega */}
          {(pedidoDetalle.celularEntrega || pedidoDetalle.direccionEntrega || pedidoDetalle.notasEntregaCliente) && (
            <div style={{
              background: "rgba(167,139,250,0.06)", border: "0.5px solid rgba(167,139,250,0.2)",
              borderRadius: 14, padding: "14px 16px", marginBottom: 12
            }}>
              <div style={{ fontSize: 11, letterSpacing: 1, color: "#a78bfa", marginBottom: 10 }}>DATOS DE ENTREGA</div>
              {pedidoDetalle.celularEntrega && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>📱</span>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 1 }}>CELULAR</div>
                    <a href={`tel:${pedidoDetalle.celularEntrega}`}
                      style={{ fontSize: 14, color: "#a78bfa", textDecoration: "none", fontWeight: 500 }}>
                      {pedidoDetalle.celularEntrega}
                    </a>
                  </div>
                </div>
              )}
              {pedidoDetalle.direccionEntrega && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, marginTop: 2 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 1 }}>DIRECCIÓN</div>
                    <div style={{ fontSize: 13, color: "#e8e4dc" }}>{pedidoDetalle.direccionEntrega}</div>
                  </div>
                </div>
              )}
              {pedidoDetalle.notasEntregaCliente && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 16, marginTop: 2 }}>📝</span>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 1 }}>INSTRUCCIONES</div>
                    <div style={{ fontSize: 13, color: "#e8e4dc" }}>{pedidoDetalle.notasEntregaCliente}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cambiar estado — flujo inteligente */}
          <div style={{ fontSize: 11, letterSpacing: 1, color: "#666", marginBottom: 8 }}>CAMBIAR ESTADO</div>

          {/* Tarjeta especial: si está "Recogido", mostrar el paso de asignar lavandería */}
          {pedidoDetalle.estado === "Recogido" && (
            <div style={{
              background: "rgba(233,121,249,0.08)", border: "1px solid rgba(233,121,249,0.35)",
              borderRadius: 14, padding: "14px 16px", marginBottom: 12
            }}>
              <div style={{ fontSize: 12, color: "#e879f9", fontWeight: 600, marginBottom: 10 }}>
                🧺 Tienes la ropa — ¿a qué lavandería la llevas?
              </div>
              <select value={lavanderiaTemp}
                onChange={e => setLavanderiaTemp(e.target.value)}
                style={{
                  ...inputStyle,
                  marginBottom: 10,
                  borderColor: "rgba(233,121,249,0.3)",
                  background: "rgba(233,121,249,0.06)"
                }}>
                {LAVANDERIAS.map(l => <option key={l} value={l} style={{ background: "#1a1a2e" }}>{l}</option>)}
              </select>
              <button
                onClick={() => cambiarEstado(pedidoDetalle.id, "En lavandería", lavanderiaTemp)}
                style={{
                  width: "100%", background: "#3b82f6", border: "none",
                  borderRadius: 10, padding: "12px", cursor: "pointer",
                  color: "#fff", fontSize: 14, fontWeight: 600,
                  boxShadow: "0 4px 16px rgba(59,130,246,0.35)"
                }}>
                Confirmar → Dejar en {lavanderiaTemp}
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {ESTADOS.map(e => {
              const esActual = pedidoDetalle.estado === e;
              // Ocultar "En lavandería" del listado si está en "Recogido" (ya tiene la tarjeta especial arriba)
              if (e === "En lavandería" && pedidoDetalle.estado === "Recogido") return null;
              return (
                <button key={e}
                  onClick={() => {
                    if (e === "En lavandería" && pedidoDetalle.estado !== "Recogido") {
                      // Si salta directo a "En lavandería" desde otro estado, también asigna lavandería
                      cambiarEstado(pedidoDetalle.id, e, lavanderiaTemp);
                    } else {
                      cambiarEstado(pedidoDetalle.id, e);
                    }
                  }}
                  style={{
                    background: esActual ? `${ESTADO_COLORS[e]}20` : "rgba(255,255,255,0.03)",
                    border: `0.5px solid ${esActual ? ESTADO_COLORS[e] : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                    color: esActual ? ESTADO_COLORS[e] : "#888",
                    fontSize: 14, fontWeight: esActual ? 600 : 400,
                    textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                  <div>
                    <div>{e}</div>
                    <div style={{ fontSize: 11, color: esActual ? `${ESTADO_COLORS[e]}bb` : "#555", marginTop: 1 }}>
                      {ESTADO_DESC[e]}
                    </div>
                  </div>
                  {esActual && <span style={{ fontSize: 16 }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Historial */}
          {pedidoDetalle.historial?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1, color: "#666", marginBottom: 8 }}>HISTORIAL</div>
              {pedidoDetalle.historial.map((h, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  paddingBottom: 12, marginBottom: 12,
                  borderBottom: i < pedidoDetalle.historial.length - 1 ? "0.5px solid rgba(255,255,255,0.05)" : "none"
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: ESTADO_COLORS[h.estado], marginTop: 4, flexShrink: 0
                  }} />
                  <div>
                    <div style={{ fontSize: 13, color: "#e8e4dc" }}>{h.estado}</div>
                    {h.lavanderia && <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 1 }}>→ {h.lavanderia}</div>}
                    <div style={{ fontSize: 11, color: "#555" }}>{formatDate(h.fecha)} {formatTime(h.fecha)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => eliminarPedido(pedidoDetalle.id)}
            style={{
              width: "100%", background: "rgba(239,68,68,0.08)",
              border: "0.5px solid rgba(239,68,68,0.2)",
              borderRadius: 10, padding: "12px", cursor: "pointer",
              color: "#ef4444", fontSize: 14, marginTop: 8
            }}>
            Eliminar registro
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════
          DIRECTORIO DE CLIENTES
      ════════════════════════════════════════ */}
      {vista === "directorio" && (
        <div style={{ padding: "16px 20px 80px" }}>
          {/* Buscador */}
          <input
            type="text"
            placeholder="🔍  Buscar por nombre, celular o dirección..."
            value={busquedaDir}
            onChange={e => setBusquedaDir(e.target.value)}
            style={{
              ...inputStyle,
              marginBottom: 16,
              background: "rgba(255,255,255,0.04)"
            }}
          />

          {directorioFiltrado.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#444" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
              <div style={{ fontSize: 14 }}>
                {directorio.length === 0 ? "Aún no hay clientes registrados" : "No se encontraron resultados"}
              </div>
              {directorio.length === 0 && (
                <div style={{ fontSize: 12, marginTop: 4 }}>Toca + para agregar un cliente</div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {directorioFiltrado.map(d => {
                const pedidosCliente = pedidos.filter(p =>
                  p.clienteId === String(d.id) || p.nombre === d.nombre
                );
                const activos = pedidosCliente.filter(p => p.estado !== "Entregado").length;
                return (
                  <div key={d.id}
                    onClick={() => { setClienteDirActivo(d.id); setVista("detalleCliente"); }}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "0.5px solid rgba(255,255,255,0.07)",
                      borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                          {d.nombre}
                          {activos > 0 && (
                            <span style={{ fontSize: 10, background: "rgba(16,185,129,0.2)", color: "#10b981", padding: "2px 8px", borderRadius: 6 }}>
                              {activos} activo{activos > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {d.celular && <div style={{ fontSize: 12, color: "#a78bfa", marginBottom: 2 }}>📱 {d.celular}</div>}
                        {d.direccion && <div style={{ fontSize: 12, color: "#666" }}>📍 {d.direccion}</div>}
                        {d.notasEntrega && (
                          <div style={{ fontSize: 11, color: "#555", marginTop: 4, fontStyle: "italic" }}>
                            "{d.notasEntrega}"
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#444", marginLeft: 8 }}>
                        {pedidosCliente.length} pedido{pedidosCliente.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          NUEVO / EDITAR CLIENTE DEL DIRECTORIO
      ════════════════════════════════════════ */}
      {vista === "nuevoCliente" && (
        <div style={{ padding: "20px 20px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button onClick={() => { setVista("directorio"); setClienteDir(initialClienteDir); setClienteDirActivo(null); }}
              style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 18 }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {clienteDirActivo ? "Editar cliente" : "Nuevo cliente"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={labelStyle}>NOMBRE COMPLETO *</div>
              <input type="text" placeholder="María García"
                value={clienteDir.nombre}
                onChange={e => setClienteDir(prev => ({ ...prev, nombre: e.target.value }))}
                style={inputStyle} />
            </div>

            <div>
              <div style={labelStyle}>NÚMERO DE CELULAR</div>
              <input type="tel" placeholder="987 654 321"
                value={clienteDir.celular}
                onChange={e => setClienteDir(prev => ({ ...prev, celular: e.target.value }))}
                style={inputStyle} />
            </div>

            <div>
              <div style={labelStyle}>DIRECCIÓN DE ENTREGA</div>
              <input type="text" placeholder="Jr. Los Pinos 123, Urb. Las Flores"
                value={clienteDir.direccion}
                onChange={e => setClienteDir(prev => ({ ...prev, direccion: e.target.value }))}
                style={inputStyle} />
            </div>

            <div>
              <div style={labelStyle}>NOTAS DE ENTREGA</div>
              <textarea
                placeholder="Ej: Llevar a la tienda ubicada en el mercado central, piso 2, puesto 15. Preguntar por don Carlos."
                value={clienteDir.notasEntrega}
                onChange={e => setClienteDir(prev => ({ ...prev, notasEntrega: e.target.value }))}
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  lineHeight: "1.5"
                }} />
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                Aquí puedes poner instrucciones especiales, referencias del lugar, horarios, etc.
              </div>
            </div>

            <button onClick={guardarClienteDir}
              disabled={!clienteDir.nombre}
              style={{
                background: clienteDir.nombre ? "#10b981" : "rgba(255,255,255,0.05)",
                border: "none", borderRadius: 12, padding: "16px",
                color: clienteDir.nombre ? "#fff" : "#444",
                fontSize: 15, fontWeight: 600, cursor: clienteDir.nombre ? "pointer" : "default",
                boxShadow: clienteDir.nombre ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
                marginTop: 8
              }}>
              {clienteDirActivo ? "Guardar cambios" : "Agregar cliente"}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          DETALLE CLIENTE DEL DIRECTORIO
      ════════════════════════════════════════ */}
      {vista === "detalleCliente" && clienteDirDetalle && (() => {
        const pedidosCliente = pedidos.filter(p =>
          p.clienteId === String(clienteDirDetalle.id) || p.nombre === clienteDirDetalle.nombre
        );
        const activosCliente = pedidosCliente.filter(p => p.estado !== "Entregado");
        const entregadosCliente = pedidosCliente.filter(p => p.estado === "Entregado");
        return (
          <div style={{ padding: "20px 20px 80px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => { setVista("directorio"); setClienteDirActivo(null); }}
                  style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 18 }}>←</button>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{clienteDirDetalle.nombre}</div>
              </div>
              <button onClick={() => abrirEditarCliente(clienteDirDetalle)}
                style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#888", fontSize: 13 }}>
                Editar
              </button>
            </div>

            {/* Tarjeta de contacto */}
            <div style={{
              background: "rgba(167,139,250,0.06)", border: "0.5px solid rgba(167,139,250,0.2)",
              borderRadius: 14, padding: "16px", marginBottom: 16
            }}>
              <div style={{ fontSize: 11, letterSpacing: 1, color: "#a78bfa", marginBottom: 12 }}>DATOS DE CONTACTO</div>
              {clienteDirDetalle.celular ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📱</div>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>CELULAR</div>
                    <a href={`tel:${clienteDirDetalle.celular}`}
                      style={{ fontSize: 15, color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>
                      {clienteDirDetalle.celular}
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#444", marginBottom: 12 }}>Sin celular registrado</div>
              )}

              {clienteDirDetalle.direccion && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📍</div>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>DIRECCIÓN</div>
                    <div style={{ fontSize: 14, color: "#e8e4dc" }}>{clienteDirDetalle.direccion}</div>
                  </div>
                </div>
              )}

              {clienteDirDetalle.notasEntrega && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📝</div>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>INSTRUCCIONES DE ENTREGA</div>
                    <div style={{ fontSize: 13, color: "#e8e4dc", lineHeight: 1.5 }}>{clienteDirDetalle.notasEntrega}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Pedidos activos del cliente */}
            {activosCliente.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: "#666", marginBottom: 8 }}>
                  PEDIDOS ACTIVOS ({activosCliente.length})
                </div>
                {activosCliente.map(p => (
                  <div key={p.id}
                    onClick={() => { setPedidoActivo(p.id); setVista("detalle"); }}
                    style={{
                      background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)",
                      borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{p.kg} kg · S/. {p.precio}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{p.lavanderia} · {formatDate(p.ingreso)}</div>
                    </div>
                    <div style={{
                      fontSize: 10, color: ESTADO_COLORS[p.estado],
                      background: `${ESTADO_COLORS[p.estado]}18`,
                      padding: "4px 8px", borderRadius: 6
                    }}>{p.estado}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Historial entregados */}
            {entregadosCliente.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: "#666", marginBottom: 8 }}>
                  HISTORIAL ({entregadosCliente.length} entregados)
                </div>
                {entregadosCliente.slice(0, 5).map(p => (
                  <div key={p.id} style={{
                    padding: "8px 0",
                    borderBottom: "0.5px solid rgba(255,255,255,0.04)",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#888" }}>{p.kg} kg · S/. {p.precio}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{formatDate(p.ingreso)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>Entregado</div>
                  </div>
                ))}
              </div>
            )}

            {/* Botón nuevo pedido para este cliente */}
            <button
              onClick={() => {
                setForm({ ...initialForm, clienteId: String(clienteDirDetalle.id), nombre: clienteDirDetalle.nombre });
                setVista("nuevo");
              }}
              style={{
                width: "100%", background: "rgba(16,185,129,0.1)",
                border: "0.5px solid rgba(16,185,129,0.3)",
                borderRadius: 10, padding: "12px", cursor: "pointer",
                color: "#10b981", fontSize: 14, fontWeight: 600, marginBottom: 10
              }}>
              + Nuevo pedido para este cliente
            </button>

            <button onClick={() => eliminarClienteDir(clienteDirDetalle.id)}
              style={{
                width: "100%", background: "rgba(239,68,68,0.08)",
                border: "0.5px solid rgba(239,68,68,0.2)",
                borderRadius: 10, padding: "12px", cursor: "pointer",
                color: "#ef4444", fontSize: 14
              }}>
              Eliminar cliente
            </button>
          </div>
        );
      })()}
    </div>
  );
}
