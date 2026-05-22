import { useState, useEffect, useRef, useMemo } from "react";
import { Bike, ShoppingBasket, WashingMachine, PackageCheck, Package, Phone, MapPin, FileText, Timer, AlertCircle, User, Users, BarChart2, ClipboardList, Plus, Shirt, Map } from "lucide-react";

const LAVANDERIAS_DEFAULT = ["Lavandería Centro", "Lavandería Norte", "Lavandería Express", "Otra"];
const ESTADOS = ["En recojo", "Recogido", "En lavandería", "Listo para entregar", "Entregado"];
const SIGUIENTE_ESTADO = {
  "En recojo": "Recogido",
  "Recogido": "En lavandería",
  "En lavandería": "Listo para entregar",
  "Listo para entregar": "Entregado",
};
const ESTADO_COLORS = {
  "En recojo":           "#f59e0b",
  "Recogido":            "#e879f9",
  "En lavandería":       "#3b82f6",
  "Listo para entregar": "#10b981",
  "Entregado":           "#6b7280",
};
const ESTADO_DESC = {
  "En recojo":           "Camino a buscar la ropa",
  "Recogido":            "Ropa en mano · eligiendo lavandería",
  "En lavandería":       "Ropa dejada · temporizador activo",
  "Listo para entregar": "Recogida · camino al cliente",
  "Entregado":           "Servicio completado",
};
const ESTADO_ICON = {
  "En recojo":           <Bike size={15} color="#f59e0b" />,
  "Recogido":            <ShoppingBasket size={15} color="#e879f9" />,
  "En lavandería":       <WashingMachine size={15} color="#3b82f6" />,
  "Listo para entregar": <PackageCheck size={15} color="#10b981" />,
  "Entregado":           <Package size={15} color="#6b7280" />,
};

function formatTime(date) {
  return new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(date) {
  return new Date(date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}
function duracion(ms) {
  const totalMin = Math.floor(Math.abs(ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (totalMin < 1) return "1m";
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function timeAgo(date) {
  return duracion(Date.now() - new Date(date).getTime());
}
function startOfWeek(d) {
  const dt = new Date(d); dt.setDate(dt.getDate() - dt.getDay()); dt.setHours(0,0,0,0); return dt;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

const initialForm = { nombre: "", kg: "", notas: "", precio: "", clienteId: "" };
const initialClienteDir = { nombre: "", celular: "", direccion: "", notasEntrega: "", coordenadas: null, mapsLink: "" };
const inputStyle = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "0.5px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "12px 14px",
  color: "#e8e4dc", fontSize: 15, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit"
};
const labelStyle = { fontSize: 11, letterSpacing: 1, color: "#555", marginBottom: 6, display: "block" };

export default function MCLaundry() {
  const [pedidos, setPedidos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mc_clientes") || "[]"); } catch { return []; }
  });
  const [directorio, setDirectorio] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mc_directorio") || "[]"); } catch { return []; }
  });
  const [lavanderias, setLavanderias] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mc_lavanderias") || "null") || LAVANDERIAS_DEFAULT; } catch { return LAVANDERIAS_DEFAULT; }
  });
  const [nuevaLavanderia, setNuevaLavanderia] = useState("");
  const [editandoLav, setEditandoLav] = useState(null); // { idx, nombre }
  const [form, setForm] = useState(initialForm);
  const [clienteDir, setClienteDir] = useState(initialClienteDir);
  const [tab, setTab] = useState("dashboard");
  const [vista, setVista] = useState(null);
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [clienteDirActivo, setClienteDirActivo] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [filtro, setFiltro] = useState("recojo");
  const [busquedaDir, setBusquedaDir] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [modal, setModal] = useState(null); // { tipo, titulo, msg, onConfirm }
  const [costoLavTemp, setCostoLavTemp] = useState("");
  const [lavanderiaTemp, setLavanderiaTemp] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mc_lavanderias") || "null")?.[0] || LAVANDERIAS_DEFAULT[0]; } catch { return LAVANDERIAS_DEFAULT[0]; }
  });
  const [minutosTemp, setMinutosTemp] = useState("");
  const [periodoReporte, setPeriodoReporte] = useState("semana");
  const [tick, setTick] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const nombreInputRef = useRef(null);

  const capturarUbicacion = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setClienteDir(p => ({
          ...p,
          coordenadas: { lat, lng },
          mapsLink: `https://maps.google.com/?q=${lat},${lng}`
        }));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { try { localStorage.setItem("mc_clientes", JSON.stringify(pedidos)); } catch {} }, [pedidos]);
  useEffect(() => { try { localStorage.setItem("mc_directorio", JSON.stringify(directorio)); } catch {} }, [directorio]);
  useEffect(() => { try { localStorage.setItem("mc_lavanderias", JSON.stringify(lavanderias)); } catch {} }, [lavanderias]);

  // Tick cada 30s para actualizar temporizadores
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);


  // Pedir permiso de notificaciones al montar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Alertas por temporizador vencido — batched, sin setState en loop
  useEffect(() => {
    const nuevasAlertas = [];
    const idsMarcados = [];
    pedidos.forEach(c => {
      if (c.estado === "En lavandería" && c.inicioLavanderia && c.tiempoLavanderia && !c.alertado) {
        const fin = new Date(c.inicioLavanderia).getTime() + c.tiempoLavanderia * 60000;
        if (Date.now() >= fin) {
          nuevasAlertas.push({ id: c.id, msg: `¡Recoger ropa de ${c.nombre} en ${c.lavanderia}!` });
          idsMarcados.push(c.id);
        }
      }
    });
    if (nuevasAlertas.length > 0) {
      setAlertas(prev => [...prev, ...nuevasAlertas]);
      setPedidos(prev => prev.map(c => idsMarcados.includes(c.id) ? { ...c, alertado: true } : c));
    }
  }, [tick]);

  // ─── Pedidos ────────────────────────────────────────────────
  const agregarPedido = () => {
    if (!form.nombre || !form.kg) return;
    const cl = directorio.find(d =>
      String(d.id) === String(form.clienteId) ||
      (!form.clienteId && d.nombre.toLowerCase() === form.nombre.toLowerCase())
    );
    const ahora = Date.now();
    const nuevo = {
      id: crypto.randomUUID(), ...form,
      kg: Number(form.kg),
      precio: form.precio || (Number(form.kg) * 5).toFixed(2),
      ingreso: ahora,
      estado: "En recojo",
      lavanderia: "", alertado: false,
      historial: [{ estado: "En recojo", fecha: ahora }],
      celularEntrega: cl?.celular || "",
      direccionEntrega: cl?.direccion || "",
      notasEntregaCliente: cl?.notasEntrega || "",
    };
    setPedidos(prev => [nuevo, ...prev]);
    setForm(initialForm);
    setVista(null);
  };

  // Flujo bloqueado: solo avanza al siguiente estado
  const cambiarEstado = (id, lavanderiaAsignada, minutosLavanderia, costoLav) => {
    setPedidos(prev => prev.map(c => {
      if (c.id !== id) return c;
      const nuevoEstado = SIGUIENTE_ESTADO[c.estado];
      if (!nuevoEstado) return c;
      const ahora = Date.now();
      const yaPageo = c.pago === "Efectivo" || c.pago === "Yape";
      return {
        ...c,
        estado: nuevoEstado,
        ...(lavanderiaAsignada ? { lavanderia: lavanderiaAsignada } : {}),
        ...(minutosLavanderia ? { tiempoLavanderia: minutosLavanderia, inicioLavanderia: ahora } : {}),
        ...(costoLav !== undefined ? { costoLavanderia: costoLav } : {}),
        ...(nuevoEstado === "Entregado" ? { fechaFin: ahora } : {}),
        ...(nuevoEstado === "Entregado" && yaPageo && !c.fechaPago ? { fechaPago: ahora } : {}),
        historial: [...(c.historial || []), {
          estado: nuevoEstado, fecha: ahora,
          ...(lavanderiaAsignada ? { lavanderia: lavanderiaAsignada } : {})
        }]
      };
    }));
  };

  const eliminarPedido = (id) => { setPedidos(prev => prev.filter(c => c.id !== id)); setVista(null); };

  // ─── Directorio ─────────────────────────────────────────────
  const guardarClienteDir = () => {
    if (!clienteDir.nombre) return;
    if (clienteDirActivo) {
      setDirectorio(prev => prev.map(d => d.id === clienteDirActivo ? { ...d, ...clienteDir } : d));
    } else {
      setDirectorio(prev => [{ id: crypto.randomUUID(), ...clienteDir }, ...prev]);
    }
    setClienteDir(initialClienteDir); setClienteDirActivo(null); setVista(null);
  };
  const eliminarClienteDir = (id) => { setDirectorio(prev => prev.filter(d => d.id !== id)); setVista(null); };
  const abrirEditarCliente = (c) => {
    setClienteDir({ nombre: c.nombre, celular: c.celular || "", direccion: c.direccion || "", notasEntrega: c.notasEntrega || "", coordenadas: c.coordenadas || null, mapsLink: c.mapsLink || "" });
    setClienteDirActivo(c.id); setVista("nuevoCliente");
  };

  // ─── Cálculos memorizados ───────────────────────────────────
  const hoy = useMemo(() => new Date().toDateString(), [tick]);
  const ahora = Date.now();

  const urgentes = useMemo(() => pedidos.filter(c => {
    if (c.estado === "En lavandería" && c.inicioLavanderia && c.tiempoLavanderia) {
      return Date.now() >= new Date(c.inicioLavanderia).getTime() + c.tiempoLavanderia * 60000;
    }
    return false;
  }), [pedidos, tick]);

  const stats = useMemo(() => ({
    activos: pedidos.filter(c => c.estado !== "Entregado").length,
    listos: pedidos.filter(c => c.estado === "Listo para entregar").length,
    hoy: pedidos.filter(c => new Date(c.ingreso).toDateString() === hoy).length,
    ingresosHoy: pedidos.filter(c => c.fechaPago && new Date(c.fechaPago).toDateString() === hoy).reduce((s, c) => s + Number(c.precio || 0), 0),
  }), [pedidos, hoy]);

  const grupos = useMemo(() => ({
    activos:    pedidos.filter(c => c.estado !== "Entregado"),
    recojo:     pedidos.filter(c => ["En recojo","Recogido"].includes(c.estado)),
    lavanderia: pedidos.filter(c => c.estado === "En lavandería"),
    listos:     pedidos.filter(c => c.estado === "Listo para entregar"),
    entregados: pedidos.filter(c => c.estado === "Entregado"),
  }), [pedidos]);

  const pedidosFiltrados = grupos[filtro] || grupos.activos;

  const directorioFiltrado = useMemo(() => directorio.filter(d =>
    d.nombre.toLowerCase().includes(busquedaDir.toLowerCase()) ||
    (d.celular || "").includes(busquedaDir) ||
    (d.direccion || "").toLowerCase().includes(busquedaDir.toLowerCase())
  ), [directorio, busquedaDir]);

  const sw = useMemo(() => startOfWeek(new Date()), [hoy]);
  const sm = useMemo(() => startOfMonth(new Date()), [hoy]);

  const pedidosReporte = useMemo(() => pedidos.filter(c => {
    const f = new Date(c.ingreso);
    if (periodoReporte === "semana") return f >= sw;
    if (periodoReporte === "mes") return f >= sm;
    return new Date(c.ingreso).toDateString() === hoy;
  }), [pedidos, periodoReporte, sw, sm, hoy]);

  const reporte = useMemo(() => {
    const cobrados = pedidosReporte.filter(c => c.pago === "Efectivo" || c.pago === "Yape");
    const porCobrar = pedidos.filter(c => (!c.pago || c.pago === "No pagó") && c.estado !== "Entregado");
    return {
      total: pedidosReporte.length,
      entregados: pedidosReporte.filter(c => c.estado === "Entregado").length,
      ingresos: cobrados.reduce((s, c) => s + Number(c.precio || 0), 0),
      ganancia: cobrados.reduce((s, c) => s + (Number(c.precio || 0) - (c.costoLavanderia != null ? c.costoLavanderia : c.kg * 3.5)), 0),
      kg: pedidosReporte.reduce((s, c) => s + Number(c.kg || 0), 0),
      clientesUnicos: [...new Set(pedidosReporte.map(c => c.nombre))].length,
      porEstado: ESTADOS.reduce((acc, e) => { acc[e] = pedidosReporte.filter(c => c.estado === e).length; return acc; }, {}),
      porCobrar: porCobrar.reduce((s, c) => s + Number(c.precio || 0), 0),
      deudores: porCobrar,
    };
  }, [pedidosReporte, pedidos]);

  const pedidoDetalle = pedidos.find(c => c.id === pedidoActivo);
  const clienteDirDetalle = directorio.find(d => d.id === clienteDirActivo);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e8e4dc", maxWidth: 480, margin: "0 auto", paddingBottom: 90 }}>

      {/* Toast */}
      {alertas.map((a, i) => (
        <div key={i} onClick={() => setAlertas(p => p.filter((_,j) => j !== i))}
          style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 448, zIndex: 999, background: "#10b981", borderRadius: 14, padding: "14px 18px", boxShadow: "0 8px 32px rgba(16,185,129,0.5)", cursor: "pointer" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.7)", marginBottom: 3 }}>RECORDATORIO</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{a.msg}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>Toca para cerrar</div>
        </div>
      ))}

      {/* Header principal */}
      {!vista && (
        <div style={{ padding: "20px 16px 0", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, background: "linear-gradient(90deg, #10b981, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Lava Go!</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 2 }}>HOY COBRADO</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#a78bfa", letterSpacing: -1, lineHeight: 1 }}>
                S/. {stats.ingresosHoy.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{stats.hoy} pedido{stats.hoy !== 1 ? "s" : ""}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Activos", val: stats.activos, color: "#3b82f6" },
              { label: "Listos", val: stats.listos, color: "#10b981" },
              { label: "Urgentes", val: urgentes.length, color: urgentes.length > 0 ? "#ef4444" : "#333" },
            ].map((s, i) => (
              <div key={i} style={{ background: i === 2 && s.val > 0 ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)", border: `0.5px solid ${s.color}33`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex" }}>
            {[
              { key: "dashboard",   icon: <ClipboardList size={16} />, label: "Pedidos" },
              { key: "directorio",  icon: <Users size={16} />,         label: "Clientes" },
              { key: "lavanderias", icon: <WashingMachine size={16} />, label: "Lavands." },
              { key: "reportes",    icon: <BarChart2 size={16} />,      label: "Reportes" },
            ].map(t => {
              const activo = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ flex: 1, background: "none", border: "none", borderBottom: activo ? "2px solid #10b981" : "2px solid transparent", padding: "10px 4px", cursor: "pointer", color: activo ? "#10b981" : "#555", fontSize: 12, fontWeight: activo ? 700 : 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span>{t.label}</span>
                  {t.key === "directorio" && directorio.length > 0 && (
                    <span style={{ fontSize: 9, background: "rgba(167,139,250,0.2)", color: "#a78bfa", padding: "1px 5px", borderRadius: 8 }}>{directorio.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Header vistas internas */}
      {vista && (
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => { setVista(null); setMostrarSugerencias(false); setSugerencias([]); setMinutosTemp(""); }}
            style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 18, flexShrink: 0 }}>←</button>
          <div style={{ fontSize: 17, fontWeight: 600 }}>
            {vista === "nuevo" && "Nuevo pedido"}
            {vista === "detalle" && pedidoDetalle?.nombre}
            {vista === "nuevoCliente" && (clienteDirActivo ? "Editar cliente" : "Nuevo cliente")}
            {vista === "detalleCliente" && clienteDirDetalle?.nombre}
            {vista === "gestionLavanderias" && "Gestionar lavanderías"}
          </div>
        </div>
      )}

      {/* Sección URGENTE */}
      {!vista && tab === "dashboard" && urgentes.length > 0 && (
        <div style={{ margin: "12px 16px 0", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 6px #ef4444" }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#ef4444" }}>URGENTE — {urgentes.length} pedido{urgentes.length > 1 ? "s" : ""}</div>
          </div>
          {urgentes.map(c => (
            <div key={c.id} onClick={() => { setPedidoActivo(c.id); setVista("detalle"); }}
              style={{ padding: "8px 14px 10px", borderTop: "0.5px solid rgba(239,68,68,0.15)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nombre}</div>
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 1 }}>¡Tiempo vencido — ir a recoger!</div>
              </div>
              <span style={{ fontSize: 18, color: "#ef4444" }}>→</span>
            </div>
          ))}
        </div>
      )}

      {/* ══ DASHBOARD ══ */}
      {!vista && tab === "dashboard" && (
        <div style={{ padding: "12px 16px 16px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {[
              { key: "recojo",     icon: <Bike size={13} />,          label: "Recojo",     count: grupos.recojo.length },
              { key: "lavanderia", icon: <WashingMachine size={13} />, label: "Lavandería", count: grupos.lavanderia.length },
              { key: "listos",     icon: <PackageCheck size={13} />,   label: "Listos",     count: grupos.listos.length },
              { key: "entregados", icon: <Package size={13} />,        label: "Historial",  count: grupos.entregados.length },
            ].map(f => {
              const activo = filtro === f.key;
              return (
                <button key={f.key} onClick={() => setFiltro(f.key)}
                  style={{ background: activo ? "#10b981" : "rgba(255,255,255,0.04)", border: `0.5px solid ${activo ? "#10b981" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <span style={{ fontSize: 13 }}>{f.icon}</span>
                  <span style={{ fontSize: 12, color: activo ? "#fff" : "#888", fontWeight: activo ? 600 : 400 }}>{f.label}</span>
                  {f.count > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: activo ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)", color: activo ? "#fff" : "#666", padding: "1px 6px", borderRadius: 8 }}>{f.count}</span>}
                </button>
              );
            })}
          </div>

          {filtro === "lavanderia" ? null : pedidosFiltrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#444" }}>
              <div style={{ marginBottom: 12, display:"flex", justifyContent:"center" }}><Shirt size={40} color="#444" /></div>
              <div style={{ fontSize: 14 }}>Sin pedidos aquí</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pedidosFiltrados.map(c => {
                const esUrgente = urgentes.some(u => u.id === c.id);
                return (
                  <div key={c.id} onClick={() => { setPedidoActivo(c.id); setVista("detalle"); }}
                    style={{ background: esUrgente ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)", border: `0.5px solid ${esUrgente ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "13px 14px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 15 }}>{ESTADO_ICON[c.estado]}</span>
                          <div style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</div>
                        </div>
                        <div style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>
                          {c.lavanderia || <span style={{ color: "#e879f9" }}>⚡ Sin lavandería</span>}
                        </div>
                        {c.direccionEntrega && (
                          <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><MapPin size={11} color="#a78bfa" style={{marginRight:4}} />{c.direccionEntrega}</div>
                        )}
                        <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#666" }}>
                          <span>{c.kg} kg</span>
                          <span style={{ color: "#a78bfa", fontWeight: 600 }}>S/. {c.precio}</span>
                          <span>{timeAgo(c.ingreso)}</span>
                        </div>
                        {c.estado === "Listo para entregar" && c.direccionEntrega && (
                          <div style={{ marginTop: 5, fontSize: 12, color: "#10b981", fontWeight: 500 }}><MapPin size={11} color="#a78bfa" style={{marginRight:4}} />{c.direccionEntrega}</div>
                        )}
                      </div>
                      <div style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 700, color: ESTADO_COLORS[c.estado], background: `${ESTADO_COLORS[c.estado]}15`, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap", marginLeft: 10, flexShrink: 0 }}>
                        {c.estado.toUpperCase()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ DIRECTORIO ══ */}
      {!vista && tab === "directorio" && (
        <div style={{ padding: "12px 16px 16px" }}>
          <input type="text" placeholder="🔍  Nombre, celular o dirección..."
            value={busquedaDir} onChange={e => setBusquedaDir(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }} />
          {directorioFiltrado.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#444" }}>
              <div style={{ marginBottom: 12, display:"flex", justifyContent:"center" }}><User size={40} color="#444" /></div>
              <div style={{ fontSize: 14 }}>{directorio.length === 0 ? "Sin clientes aún" : "Sin resultados"}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {directorioFiltrado.map(d => {
                const activos = pedidos.filter(p => (p.clienteId === String(d.id) || p.nombre === d.nombre) && p.estado !== "Entregado").length;
                const total = pedidos.filter(p => p.clienteId === String(d.id) || p.nombre === d.nombre).length;
                return (
                  <div key={d.id} onClick={() => { setClienteDirActivo(d.id); setVista("detalleCliente"); }}
                    style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "13px 14px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{d.nombre}</div>
                          {activos > 0 && <span style={{ fontSize: 10, background: "rgba(16,185,129,0.2)", color: "#10b981", padding: "2px 7px", borderRadius: 6, fontWeight: 700 }}>{activos} activo{activos > 1 ? "s" : ""}</span>}
                        </div>
                        {d.celular && <div style={{ fontSize: 12, color: "#a78bfa", marginBottom: 2 }}><Phone size={12} color="#a78bfa" style={{marginRight:4}} />{d.celular}</div>}
                        {d.direccion && <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><MapPin size={12} color="#555" style={{marginRight:4}} />{d.direccion}</div>}
                      </div>
                      <div style={{ fontSize: 11, color: "#444", marginLeft: 8, flexShrink: 0 }}>{total} pedido{total !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ REPORTES ══ */}
      {!vista && tab === "reportes" && (
        <div style={{ padding: "12px 16px 16px" }}>

          {/* Selector de periodo */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[{ key: "hoy", label: "Hoy" }, { key: "semana", label: "Esta semana" }, { key: "mes", label: "Este mes" }].map(p => (
              <button key={p.key} onClick={() => setPeriodoReporte(p.key)}
                style={{ flex: 1, background: periodoReporte === p.key ? "#10b981" : "rgba(255,255,255,0.04)", border: `0.5px solid ${periodoReporte === p.key ? "#10b981" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "8px 4px", cursor: "pointer", fontSize: 12, fontWeight: periodoReporte === p.key ? 700 : 400, color: periodoReporte === p.key ? "#fff" : "#777" }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* GANANCIA — protagonista */}
          <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 18, padding: "20px 18px", marginBottom: 12, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#10b981", letterSpacing: 2, marginBottom: 8 }}>TU GANANCIA</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#10b981", letterSpacing: -2, lineHeight: 1 }}>
              S/. {reporte.ganancia.toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
              {reporte.total} pedido{reporte.total !== 1 ? "s" : ""} · {reporte.entregados} entregado{reporte.entregados !== 1 ? "s" : ""}
            </div>
          </div>

          {/* COBRADO e INGRESOS secundarios */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div style={{ background: "rgba(167,139,250,0.08)", border: "0.5px solid rgba(167,139,250,0.2)", borderRadius: 14, padding: "14px 12px" }}>
              <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 1, marginBottom: 6 }}>COBRADO</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa", letterSpacing: -1 }}>S/. {reporte.ingresos.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{reporte.entregados} entregados</div>
            </div>
            <div style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.2)", borderRadius: 14, padding: "14px 12px" }}>
              <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: 1, marginBottom: 6 }}>KG LAVADOS</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b", letterSpacing: -1 }}>{reporte.kg.toFixed(1)}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>kilogramos</div>
            </div>
          </div>

          {/* POR COBRAR */}
          {reporte.porCobrar > 0 && (
            <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "14px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: reporte.deudores.length > 0 ? 12 : 0 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "#ef4444", marginBottom: 4 }}>⚠️ POR COBRAR</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#ef4444", letterSpacing: -1 }}>S/. {reporte.porCobrar.toFixed(2)}</div>
                </div>
                <div style={{ fontSize: 11, color: "#666", textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>{reporte.deudores.length}</div>
                  <div>deudor{reporte.deudores.length !== 1 ? "es" : ""}</div>
                </div>
              </div>

              {/* Lista de deudores */}
              {reporte.deudores.length > 0 && (
                <div style={{ borderTop: "0.5px solid rgba(239,68,68,0.15)", paddingTop: 10 }}>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#666", marginBottom: 8 }}>DEUDORES</div>
                  {reporte.deudores.map(p => (
                    <div key={p.id} onClick={() => { setPedidoActivo(p.id); setVista("detalle"); }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid rgba(239,68,68,0.08)", cursor: "pointer" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: "#666" }}>{p.estado} · {p.kg} kg</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>S/. {p.precio}</div>
                        <span style={{ fontSize: 14, color: "#444" }}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Por estado */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 1, color: "#555", padding: "12px 14px 8px" }}>POR ESTADO</div>
            {ESTADOS.map((e, i) => {
              const n = reporte.porEstado[e] || 0;
              const pct = reporte.total > 0 ? (n / reporte.total) * 100 : 0;
              return (
                <div key={e} style={{ padding: "8px 14px", borderTop: i === 0 ? "none" : "0.5px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{ESTADO_ICON[e]}</span>
                      <span style={{ fontSize: 12, color: "#888" }}>{e}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: ESTADO_COLORS[e] }}>{n}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: ESTADO_COLORS[e], borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Últimos pedidos */}
          {pedidosReporte.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1, color: "#555", marginBottom: 8 }}>ÚLTIMOS PEDIDOS</div>
              {pedidosReporte.slice(0, 8).map(p => (
                <div key={p.id} onClick={() => { setPedidoActivo(p.id); setVista("detalle"); }}
                  style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{formatDate(p.ingreso)} · {p.kg} kg</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>S/. {p.precio}</div>
                    <div style={{ fontSize: 10, color: ESTADO_COLORS[p.estado] }}>{p.estado}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ NUEVO PEDIDO ══ */}
      {vista === "nuevo" && (
        <div style={{ padding: "12px 16px 80px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Autocomplete nombre */}
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>NOMBRE DEL CLIENTE</label>
              <div style={{ position: "relative" }}>
                <input ref={nombreInputRef} type="text" placeholder="Escribe el nombre..." value={form.nombre} autoComplete="off"
                  onChange={e => {
                    const val = e.target.value;
                    setForm(p => ({ ...p, nombre: val, clienteId: "" }));
                    if (val.trim().length >= 1) {
                      const m = directorio.filter(d => d.nombre.toLowerCase().includes(val.toLowerCase()));
                      setSugerencias(m); setMostrarSugerencias(m.length > 0);
                    } else { setSugerencias([]); setMostrarSugerencias(false); }
                  }}
                  onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                  onFocus={() => { if (form.nombre.trim().length >= 1 && sugerencias.length > 0) setMostrarSugerencias(true); }}
                  style={{ ...inputStyle, borderColor: form.clienteId ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.1)", paddingRight: form.clienteId ? "40px" : "14px" }} />
                {form.clienteId && (
                  <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#888" }}
                    onClick={() => { setForm(p => ({ ...p, clienteId: "", nombre: "" })); setSugerencias([]); setMostrarSugerencias(false); setTimeout(() => nombreInputRef.current?.focus(), 50); }}>✕</div>
                )}
              </div>

              {mostrarSugerencias && sugerencias.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#131320", border: "0.5px solid rgba(167,139,250,0.35)", borderRadius: "0 0 12px 12px", overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.6)" }}>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#a78bfa", padding: "8px 14px 4px", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>CLIENTES REGISTRADOS</div>
                  {sugerencias.map((d, i) => {
                    const q = form.nombre.toLowerCase(), n = d.nombre, idx = n.toLowerCase().indexOf(q);
                    return (
                      <div key={d.id}
                        onMouseDown={() => { setForm(p => ({ ...p, nombre: d.nombre, clienteId: String(d.id) })); setSugerencias([]); setMostrarSugerencias(false); }}
                        style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < sugerencias.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", gap: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(167,139,250,0.1)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User size={14} color="#a78bfa" /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e4dc" }}>
                            {idx === -1 ? n : <>{n.slice(0,idx)}<span style={{ color: "#a78bfa", background: "rgba(167,139,250,0.15)", borderRadius: 3, padding: "0 1px" }}>{n.slice(idx, idx+q.length)}</span>{n.slice(idx+q.length)}</>}
                          </div>
                          <div style={{ fontSize: 11, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[d.celular, d.direccion].filter(Boolean).join(" · ") || "Sin datos adicionales"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {form.clienteId && (() => {
                const cl = directorio.find(d => d.id === parseInt(form.clienteId));
                if (!cl) return null;
                const mapsUrl = cl.mapsLink
                  ? `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(cl.mapsLink)}&travelmode=motorcycle`
                  : cl.coordenadas
                  ? `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${cl.coordenadas.lat},${cl.coordenadas.lng}&travelmode=motorcycle`
                  : cl.direccion
                  ? `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(cl.direccion + " Pichanaki Peru")}&travelmode=motorcycle`
                  : null;
                return (
                  <div style={{ marginTop: 8, background: "rgba(167,139,250,0.08)", border: "0.5px solid rgba(167,139,250,0.25)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 1, marginBottom: 8 }}>CLIENTE VINCULADO ✓</div>
                    {cl.celular && <div style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 4 }}><Phone size={12} color="#c4b5fd" style={{marginRight:4}} />{cl.celular}</div>}
                    {cl.direccion && <div style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 4 }}><MapPin size={12} color="#c4b5fd" style={{marginRight:4}} />{cl.direccion}</div>}
                    {cl.notasEntrega && <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}><FileText size={12} color="#888" style={{marginRight:4}} />{cl.notasEntrega}</div>}
                    {mapsUrl && (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 14px", borderRadius: 8, textDecoration: "none", marginTop: 4 }}>
                        🗺 Ir en moto al cliente
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>

            {[
              { label: "KILOS DE ROPA", key: "kg", type: "number", placeholder: "Ej: 4.5" },
              { label: "PRECIO COBRADO (S/.)", key: "precio", type: "number", placeholder: "Auto: kg × 5" },
              { label: "NOTAS DEL PEDIDO", key: "notas", type: "text", placeholder: "Ropa delicada, instrucciones..." },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}

            <div style={{ background: "rgba(233,121,249,0.06)", border: "0.5px solid rgba(233,121,249,0.2)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, color: "#e879f9", fontWeight: 600 }}>🚴 Lavandería se asigna después del recojo</div>
              <div style={{ fontSize: 11, color: "#777", marginTop: 3 }}>Primero recoge, luego eliges según disponibilidad</div>
            </div>

            {form.kg && parseFloat(form.kg) > 0 && (
              <div style={{ background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "#10b981", marginBottom: 6, letterSpacing: 1 }}>RESUMEN</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{form.kg} kg × S/. 5.00 = S/. {(parseFloat(form.kg) * 5).toFixed(2)}</div>
                <div style={{ fontSize: 12, color: "#555" }}>Costo ~S/. {(parseFloat(form.kg) * 3.5).toFixed(2)} · Ganancia <span style={{ color: "#10b981", fontWeight: 600 }}>S/. {(parseFloat(form.kg) * 1.5).toFixed(2)}</span></div>
              </div>
            )}

            <button onClick={agregarPedido} disabled={!form.nombre || !form.kg}
              style={{ background: form.nombre && form.kg ? "#10b981" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 14, padding: "18px", color: form.nombre && form.kg ? "#fff" : "#444", fontSize: 16, fontWeight: 700, cursor: form.nombre && form.kg ? "pointer" : "default", boxShadow: form.nombre && form.kg ? "0 4px 24px rgba(16,185,129,0.4)" : "none", marginTop: 4 }}>
              🛵 Iniciar recojo
            </button>
          </div>
        </div>
      )}

      {/* ══ DETALLE PEDIDO ══ */}
      {vista === "detalle" && pedidoDetalle && (
        <div style={{ padding: "12px 16px 80px" }}>

          {/* Info principal */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
            {[
              { label: "Estado", val: <span style={{ color: ESTADO_COLORS[pedidoDetalle.estado], fontWeight: 700 }}>{ESTADO_ICON[pedidoDetalle.estado]} {pedidoDetalle.estado}</span> },
              { label: "Lavandería", val: pedidoDetalle.lavanderia || <span style={{ color: "#e879f9" }}>Sin asignar</span> },
              { label: "Kilos", val: `${pedidoDetalle.kg} kg` },
              { label: "Cobrado", val: <span style={{ color: "#a78bfa", fontWeight: 700 }}>S/. {pedidoDetalle.precio}</span> },
              { label: "Pago", val: (
                <div style={{ display: "flex", gap: 5 }}>
                  {["Efectivo","Yape","No pagó"].map(op => {
                    const activo = (pedidoDetalle.pago || "No pagó") === op;
                    const color = op === "Efectivo" ? "#10b981" : op === "Yape" ? "#a78bfa" : "#ef4444";
                    return (
                      <button key={op}
                        onClick={e => {
                          e.stopPropagation();
                          if (activo) return;
                          setModal({
                            titulo: `¿Confirmar pago en ${op}?`,
                            msg: op !== "No pagó" ? `Se registrará el pago a las ${formatTime(Date.now())}` : "Se marcará como sin pago",
                            onConfirm: () => {
                              const ahora = Date.now();
                              setPedidos(prev => prev.map(c => c.id === pedidoDetalle.id ? {
                                ...c, pago: op,
                                ...(op !== "No pagó" ? { fechaPago: ahora } : { fechaPago: null })
                              } : c));
                            }
                          });
                        }}
                        style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: `1px solid ${activo ? color : "rgba(255,255,255,0.1)"}`, background: activo ? `${color}22` : "transparent", color: activo ? color : "#555", cursor: "pointer" }}>
                        {op}
                      </button>
                    );
                  })}
                </div>
              )},
              { label: "Costo lav.", val: (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#ef4444" }}>S/. {(pedidoDetalle.costoLavanderia ?? (pedidoDetalle.kg * 3.5)).toFixed(2)}</span>
                  <input type="number" step="0.5" placeholder="Editar"
                    value={costoLavTemp}
                    onChange={e => setCostoLavTemp(e.target.value)}
                    onBlur={() => {
                      if (costoLavTemp) {
                        setPedidos(prev => prev.map(c => c.id === pedidoDetalle.id ? { ...c, costoLavanderia: parseFloat(costoLavTemp) } : c));
                        setCostoLavTemp("");
                      }
                    }}
                    style={{ width: 70, background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 6px", color: "#fff", fontSize: 11 }} />
                </div>
              )},
              { label: "Ganancia real", val: <span style={{ color: "#10b981", fontWeight: 700 }}>S/. {(pedidoDetalle.precio - (pedidoDetalle.costoLavanderia ?? (pedidoDetalle.kg * 3.5))).toFixed(2)}</span> },
              { label: "Inicio", val: `${formatDate(pedidoDetalle.ingreso)} ${formatTime(pedidoDetalle.ingreso)}` },
              ...(pedidoDetalle.fechaFin ? [{ label: "Fin", val: `${formatDate(pedidoDetalle.fechaFin)} ${formatTime(pedidoDetalle.fechaFin)}` }] : []),
              ...(pedidoDetalle.notas ? [{ label: "Notas", val: pedidoDetalle.notas }] : []),
            ].map((r, i, arr) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < arr.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ fontSize: 12, color: "#555" }}>{r.label}</span>
                <span style={{ fontSize: 13, textAlign: "right", maxWidth: "60%" }}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Datos de entrega */}
          {(pedidoDetalle.celularEntrega || pedidoDetalle.direccionEntrega || pedidoDetalle.notasEntregaCliente) && (
            <div style={{ background: "rgba(167,139,250,0.06)", border: "0.5px solid rgba(167,139,250,0.2)", borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: 1, color: "#a78bfa", marginBottom: 10 }}>DATOS DE ENTREGA</div>
              {pedidoDetalle.celularEntrega && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Phone size={14} color="#a78bfa" style={{flexShrink:0}} /><a href={`tel:${pedidoDetalle.celularEntrega}`} style={{ fontSize: 15, color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>{pedidoDetalle.celularEntrega}</a></div>}
              {pedidoDetalle.direccionEntrega && <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <MapPin size={14} color="#a78bfa" style={{flexShrink:0}} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{pedidoDetalle.direccionEntrega}</div>
                  {(() => {
                    const cl = directorio.find(d => String(d.id) === String(pedidoDetalle.clienteId));
                    const mapsUrl = cl?.coordenadas
                      ? `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${cl.coordenadas.lat},${cl.coordenadas.lng}&travelmode=motorcycle`
                      : cl?.direccion
                      ? `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(cl.direccion + " Pichanaki Peru")}&travelmode=motorcycle`
                      : pedidoDetalle.direccionEntrega
                      ? `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(pedidoDetalle.direccionEntrega + " Pichanaki Peru")}&travelmode=motorcycle`
                      : null;
                    return mapsUrl ? (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, textDecoration: "none" }}>
                        🗺 Ir en moto al cliente
                      </a>
                    ) : null;
                  })()}
                </div>
              </div>}
              {pedidoDetalle.notasEntregaCliente && <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><FileText size={14} color="#555" style={{flexShrink:0}} /><div style={{ fontSize: 13 }}>{pedidoDetalle.notasEntregaCliente}</div></div>}
            </div>
          )}

          {/* ── FLUJO BLOQUEADO — solo muestra el siguiente paso ── */}

          {/* Paso 1→2: En recojo → Recogido */}
          {pedidoDetalle.estado === "En recojo" && (
            <button onClick={() => cambiarEstado(pedidoDetalle.id)}
              style={{ width: "100%", background: "#e879f9", border: "none", borderRadius: 14, padding: "18px", cursor: "pointer", color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 12, boxShadow: "0 4px 20px rgba(232,121,249,0.4)" }}>
              🧺 Confirmar recojo
            </button>
          )}

          {/* Paso 2→3: Recogido → elegir lavandería + tiempo obligatorio */}
          {pedidoDetalle.estado === "Recogido" && (
            <div style={{ background: "rgba(233,121,249,0.08)", border: "1px solid rgba(233,121,249,0.35)", borderRadius: 14, padding: "14px", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#e879f9", fontWeight: 700, marginBottom: 10 }}>🧺 ¿A qué lavandería y cuánto tiempo?</div>
              <label style={labelStyle}>LAVANDERÍA</label>
              <select value={lavanderiaTemp} onChange={e => setLavanderiaTemp(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10, borderColor: "rgba(233,121,249,0.3)", background: "rgba(233,121,249,0.06)" }}>
                {lavanderias.map(l => <option key={l} value={l} style={{ background: "#1a1a2e" }}>{l}</option>)}
              </select>
              <label style={labelStyle}>TIEMPO EN LAVANDERÍA (horas)</label>
              <input type="number" placeholder="Ej: 1.5 = 1h 30m" step="0.25" min="0.25"
                value={minutosTemp}
                onChange={e => setMinutosTemp(e.target.value)}
                style={{ ...inputStyle, marginBottom: 6 }} />
              {minutosTemp && parseFloat(minutosTemp) > 0 && (
                <div style={{ fontSize: 12, color: "#e879f9", marginBottom: 10, textAlign: "center" }}>
                  = {duracion(parseFloat(minutosTemp) * 3600000)} · listo aprox. {formatTime(Date.now() + parseFloat(minutosTemp) * 3600000)}
                </div>
              )}
              <button
                disabled={!minutosTemp || parseFloat(minutosTemp) <= 0}
                onClick={() => {
                  if (!minutosTemp || parseFloat(minutosTemp) <= 0) return;
                  const mins = Math.round(parseFloat(minutosTemp) * 60);
                  const ahora2 = Date.now();
                  setPedidos(prev => prev.map(c => {
                    if (c.id !== pedidoDetalle.id) return c;
                    return {
                      ...c,
                      estado: "En lavandería",
                      lavanderia: lavanderiaTemp,
                      tiempoLavanderia: mins,
                      inicioLavanderia: ahora2,
                      historial: [...(c.historial || []), { estado: "En lavandería", fecha: ahora2, lavanderia: lavanderiaTemp }]
                    };
                  }));
                  setMinutosTemp("");
                }}
                style={{ width: "100%", background: minutosTemp && parseFloat(minutosTemp) > 0 ? "#3b82f6" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 10, padding: "14px", cursor: minutosTemp && parseFloat(minutosTemp) > 0 ? "pointer" : "default", color: minutosTemp && parseFloat(minutosTemp) > 0 ? "#fff" : "#444", fontSize: 14, fontWeight: 700, boxShadow: minutosTemp && parseFloat(minutosTemp) > 0 ? "0 4px 16px rgba(59,130,246,0.35)" : "none" }}>
                🧼 Dejar en {lavanderiaTemp}
              </button>
            </div>
          )}
          {/* Paso 3: En lavandería → mostrar countdown */}
          {pedidoDetalle.estado === "En lavandería" && pedidoDetalle.inicioLavanderia && pedidoDetalle.tiempoLavanderia && (() => {
            const fin = new Date(pedidoDetalle.inicioLavanderia).getTime() + pedidoDetalle.tiempoLavanderia * 60000;
            const restMs = fin - ahora;
            const vencido = restMs <= 0;
            return (
              <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.35)", borderRadius: 14, padding: "14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 6 }}>TIEMPO RESTANTE</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: vencido ? "#ef4444" : "#3b82f6", marginBottom: 4, letterSpacing: -1 }}>
                  {vencido ? <AlertCircle size={28} color="#ef4444" style={{display:"inline",verticalAlign:"middle",marginRight:6}} /> : <Timer size={28} color="#3b82f6" style={{display:"inline",verticalAlign:"middle",marginRight:6}} />}
                  {vencido ? `Vencido hace ${duracion(restMs)}` : `${duracion(restMs)} ${Math.floor(Math.abs(restMs)/60000) <= 1 ? "restante" : "restantes"}`}
                </div>
                {/* Barra de progreso */}
                {(() => {
                  const total = pedidoDetalle.tiempoLavanderia * 60000;
                  const elapsed = total - restMs;
                  const pct = vencido ? 100 : Math.min(100, Math.round((elapsed / total) * 100));
                  return (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: vencido ? "#ef4444" : "#3b82f6", borderRadius: 4, transition: "width 0.5s ease" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#444", marginTop: 3 }}>
                        <span>{formatTime(new Date(pedidoDetalle.inicioLavanderia))}</span>
                        <span style={{ color: vencido ? "#ef4444" : "#555" }}>{pct}%</span>
                        <span>{formatTime(new Date(fin))}</span>
                      </div>
                    </div>
                  );
                })()}
                <div style={{ fontSize: 12, color: vencido ? "#ef4444" : "#555", marginBottom: 14, fontWeight: vencido ? 600 : 400 }}>
                  {vencido ? "¡Ve a recoger la ropa ahora!" : `Listo aprox. a las ${formatTime(new Date(fin))}`}
                </div>
                <button onClick={() => cambiarEstado(pedidoDetalle.id)}
                  style={{ width: "100%", background: "#10b981", border: "none", borderRadius: 10, padding: "14px", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(16,185,129,0.35)" }}>
                  ✅ Recogí la ropa — Lista para entregar
                </button>
              </div>
            );
          })()}

          {/* Paso 4→5: Lista para entregar → Entregado */}
          {pedidoDetalle.estado === "Listo para entregar" && (
            <button onClick={() => {
              const noPago = !pedidoDetalle.pago || pedidoDetalle.pago === "No pagó";
              if (noPago) {
                setModal({ titulo: "⚠️ Cliente aún no ha pagado", msg: "Registra el pago primero antes de confirmar la entrega.", onConfirm: null });
              } else {
                setModal({ titulo: "¿Confirmar entrega al cliente?", msg: "El pedido pasará a estado Entregado.", onConfirm: () => cambiarEstado(pedidoDetalle.id) });
              }
            }}
              style={{ width: "100%", background: "#10b981", border: "none", borderRadius: 14, padding: "18px", cursor: "pointer", color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 12, boxShadow: "0 4px 20px rgba(16,185,129,0.4)" }}>
              📦 Confirmar entrega al cliente
            </button>
          )}

          {/* Paso final: Entregado — duración total */}
          {pedidoDetalle.estado === "Entregado" && pedidoDetalle.fechaFin && (
            <div style={{ background: "rgba(107,114,128,0.08)", border: "0.5px solid rgba(107,114,128,0.2)", borderRadius: 14, padding: "16px", marginBottom: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 6 }}>DURACIÓN TOTAL DEL SERVICIO</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#a78bfa", letterSpacing: -1 }}>
                {duracion(new Date(pedidoDetalle.fechaFin) - new Date(pedidoDetalle.ingreso))}
              </div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
                {formatDate(pedidoDetalle.ingreso)} {formatTime(pedidoDetalle.ingreso)} → {formatTime(pedidoDetalle.fechaFin)}
              </div>
            </div>
          )}

          {/* Historial */}
          {pedidoDetalle.historial?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: 1, color: "#555", marginBottom: 8 }}>HISTORIAL</div>
              {pedidoDetalle.historial.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: 10, marginBottom: 10, borderBottom: i < pedidoDetalle.historial.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ESTADO_COLORS[h.estado] || "#666", marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, color: "#e8e4dc" }}>{ESTADO_ICON[h.estado]} {h.estado}</div>
                    {h.lavanderia && <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 1 }}>→ {h.lavanderia}</div>}
                    <div style={{ fontSize: 11, color: "#555" }}>{formatDate(h.fecha)} {formatTime(h.fecha)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => eliminarPedido(pedidoDetalle.id)}
            style={{ width: "100%", background: "rgba(239,68,68,0.07)", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>
            Eliminar registro
          </button>
        </div>
      )}

      {/* ══ NUEVO / EDITAR CLIENTE ══ */}
      {vista === "nuevoCliente" && (
        <div style={{ padding: "12px 16px 80px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "NOMBRE COMPLETO *", key: "nombre", type: "text", placeholder: "María García" },
              { label: "CELULAR", key: "celular", type: "tel", placeholder: "987 654 321" },
              { label: "DIRECCIÓN DE ENTREGA", key: "direccion", type: "text", placeholder: "Jr. Los Pinos 123, frente al mercado" },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={clienteDir[f.key]}
                  onChange={e => setClienteDir(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}

            {/* Ubicación GPS */}
            <div>
              <label style={labelStyle}>UBICACIÓN EN MAPS</label>
              <button onClick={capturarUbicacion} disabled={gpsLoading}
                style={{ width: "100%", background: clienteDir.coordenadas ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.08)", border: `0.5px solid ${clienteDir.coordenadas ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{gpsLoading ? <Timer size={20} color="#3b82f6" /> : clienteDir.coordenadas ? <PackageCheck size={20} color="#10b981" /> : <MapPin size={20} color="#3b82f6" />}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: clienteDir.coordenadas ? "#10b981" : "#3b82f6" }}>
                    {gpsLoading ? "Obteniendo ubicación..." : clienteDir.coordenadas ? "Ubicación capturada" : "Marcar ubicación actual"}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>
                    {clienteDir.coordenadas ? `${clienteDir.coordenadas.lat.toFixed(5)}, ${clienteDir.coordenadas.lng.toFixed(5)}` : "Toca cuando estés en casa del cliente"}
                  </div>
                </div>
                {clienteDir.coordenadas && (
                  <div style={{ marginLeft: "auto" }}
                    onClick={e => { e.stopPropagation(); setClienteDir(p => ({ ...p, coordenadas: null, mapsLink: "" })); }}>
                    <span style={{ fontSize: 12, color: "#555" }}>✕</span>
                  </div>
                )}
              </button>

              {/* O pegar link manualmente */}
              <div style={{ fontSize: 11, color: "#555", textAlign: "center", marginBottom: 8 }}>— o pega un link de Google Maps —</div>
              <input type="url" placeholder="https://maps.google.com/..."
                value={clienteDir.mapsLink}
                onChange={e => setClienteDir(p => ({ ...p, mapsLink: e.target.value, coordenadas: null }))}
                style={{ ...inputStyle, fontSize: 13 }} />
              {clienteDir.mapsLink ? (
                <a href={clienteDir.mapsLink} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", marginTop: 6, fontSize: 11, color: "#3b82f6", textAlign: "center" }}>
                  Ver en Maps →
                </a>
              ) : null}
            </div>

            <div>
              <label style={labelStyle}>NOTAS DE ENTREGA</label>
              <textarea placeholder="Ej: Tienda en el mercado central, piso 2 puesto 15. Preguntar por don Carlos."
                value={clienteDir.notasEntrega}
                onChange={e => setClienteDir(p => ({ ...p, notasEntrega: e.target.value }))}
                rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
            </div>
            <button onClick={guardarClienteDir} disabled={!clienteDir.nombre}
              style={{ background: clienteDir.nombre ? "#10b981" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 14, padding: "18px", color: clienteDir.nombre ? "#fff" : "#444", fontSize: 16, fontWeight: 700, cursor: clienteDir.nombre ? "pointer" : "default", boxShadow: clienteDir.nombre ? "0 4px 24px rgba(16,185,129,0.4)" : "none", marginTop: 4 }}>
              {clienteDirActivo ? "Guardar cambios" : "Agregar cliente"}
            </button>
          </div>
        </div>
      )}

      {/* ══ DETALLE CLIENTE ══ */}
      {vista === "detalleCliente" && clienteDirDetalle && (() => {
        const pCli = pedidos.filter(p => p.clienteId === String(clienteDirDetalle.id) || p.nombre === clienteDirDetalle.nombre);
        const activos = pCli.filter(p => p.estado !== "Entregado");
        const entregados = pCli.filter(p => p.estado === "Entregado");
        return (
          <div style={{ padding: "12px 16px 80px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button onClick={() => abrirEditarCliente(clienteDirDetalle)}
                style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#888", fontSize: 13 }}>Editar</button>
            </div>
            <div style={{ background: "rgba(167,139,250,0.06)", border: "0.5px solid rgba(167,139,250,0.2)", borderRadius: 14, padding: "14px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: 1, color: "#a78bfa", marginBottom: 12 }}>DATOS DE CONTACTO</div>
              {clienteDirDetalle.celular ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={18} color="#a78bfa" /></div>
                  <div>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>CELULAR</div>
                    <a href={`tel:${clienteDirDetalle.celular}`} style={{ fontSize: 16, color: "#a78bfa", textDecoration: "none", fontWeight: 700 }}>{clienteDirDetalle.celular}</a>
                  </div>
                </div>
              ) : <div style={{ fontSize: 12, color: "#444", marginBottom: 10 }}>Sin celular</div>}
              {clienteDirDetalle.direccion && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MapPin size={18} color="#a78bfa" /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>DIRECCIÓN</div>
                    <div style={{ fontSize: 13 }}>{clienteDirDetalle.direccion}</div>
                    {clienteDirDetalle.mapsLink && (
                      <a href={clienteDirDetalle.mapsLink} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-block", marginTop: 6, background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, textDecoration: "none" }}>
                        🗺 Abrir en Maps
                      </a>
                    )}
                    {!clienteDirDetalle.mapsLink && clienteDirDetalle.coordenadas && (
                      <a href={`https://maps.google.com/?q=${clienteDirDetalle.coordenadas.lat},${clienteDirDetalle.coordenadas.lng}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-block", marginTop: 6, background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, textDecoration: "none" }}>
                        🗺 Abrir en Maps
                      </a>
                    )}
                  </div>
                </div>
              )}
              {clienteDirDetalle.notasEntrega && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileText size={18} color="#888" /></div>
                  <div><div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>INSTRUCCIONES</div><div style={{ fontSize: 13, lineHeight: 1.5 }}>{clienteDirDetalle.notasEntrega}</div></div>
                </div>
              )}
            </div>
            {activos.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: "#555", marginBottom: 8 }}>ACTIVOS ({activos.length})</div>
                {activos.map(p => (
                  <div key={p.id} onClick={() => { setPedidoActivo(p.id); setVista("detalle"); }}
                    style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "11px 13px", marginBottom: 6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ESTADO_ICON[p.estado]} {p.kg} kg · S/. {p.precio}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{p.lavanderia || "Sin lavandería"} · {formatDate(p.ingreso)}</div>
                    </div>
                    <div style={{ fontSize: 10, color: ESTADO_COLORS[p.estado], background: `${ESTADO_COLORS[p.estado]}18`, padding: "3px 8px", borderRadius: 6 }}>{p.estado}</div>
                  </div>
                ))}
              </div>
            )}
            {entregados.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: "#555", marginBottom: 8 }}>HISTORIAL ({entregados.length})</div>
                {entregados.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 12, color: "#666" }}>{p.kg} kg · {formatDate(p.ingreso)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>S/. {p.precio}</div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setForm({ ...initialForm, clienteId: String(clienteDirDetalle.id), nombre: clienteDirDetalle.nombre }); setVista("nuevo"); }}
              style={{ width: "100%", background: "rgba(16,185,129,0.1)", border: "0.5px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "13px", cursor: "pointer", color: "#10b981", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              + Nuevo pedido para este cliente
            </button>
            <button onClick={() => eliminarClienteDir(clienteDirDetalle.id)}
              style={{ width: "100%", background: "rgba(239,68,68,0.07)", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>
              Eliminar cliente
            </button>
          </div>
        );
      })()}

      {/* ══ BARRA DE PROGRESO EN LAVANDERÍA ══ */}
      {!vista && tab === "dashboard" && filtro === "lavanderia" && grupos.lavanderia.length > 0 && (() => {
        const ahora2 = Date.now();
        const conTimer = grupos.lavanderia
          .filter(c => c.inicioLavanderia && c.tiempoLavanderia)
          .map(c => {
            const inicio = new Date(c.inicioLavanderia).getTime();
            const fin = inicio + c.tiempoLavanderia * 60000;
            const total = fin - inicio;
            const transcurrido = ahora2 - inicio;
            const pct = Math.min(100, Math.max(0, (transcurrido / total) * 100));
            const restMs = fin - ahora2;
            const listo = restMs <= 0;
            return { ...c, pct, restMs, listo, fin };
          })
          .sort((a, b) => b.pct - a.pct); // primero los que más % tienen (más cerca de terminar)
        if (conTimer.length === 0) return null;
        return (
          <div style={{ margin: "0 16px 12px", background: "rgba(59,130,246,0.06)", border: "0.5px solid rgba(59,130,246,0.2)", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, letterSpacing: 1, color: "#3b82f6", marginBottom: 10 }}>EN LAVANDERÍA — PROGRESO</div>
            {conTimer.map(c => (
              <div key={c.id} onClick={() => { setPedidoActivo(c.id); setVista("detalle"); }}
                style={{ marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nombre}</div>
                  <div style={{ fontSize: 11, color: c.listo ? "#10b981" : "#3b82f6", fontWeight: 700 }}>
                    {c.listo ? <><PackageCheck size={12} style={{display:"inline",verticalAlign:"middle",marginRight:3}} />Lista</> : <><Timer size={12} style={{display:"inline",verticalAlign:"middle",marginRight:3}} />{duracion(c.restMs)}</>}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 5 }}>{c.lavanderia} · {c.kg} kg</div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${c.pct}%`,
                    background: c.listo ? "#10b981" : `linear-gradient(90deg, #3b82f6, #60a5fa)`,
                    borderRadius: 4,
                    transition: "width 1s ease"
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 3, textAlign: "right" }}>{Math.round(c.pct)}%</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ══ LAVANDERÍAS ══ */}
      {!vista && tab === "lavanderias" && (() => {
        // Ranking semanal: tiempo promedio por lavandería
        const sw2 = startOfWeek(new Date());
        const pedidosSemana = pedidos.filter(c =>
          c.estado === "Entregado" && c.lavanderia && c.inicioLavanderia && c.fechaFin &&
          new Date(c.ingreso) >= sw2
        );
        const rankingMap = {};
        pedidosSemana.forEach(c => {
          const lav = c.lavanderia;
          if (!rankingMap[lav]) rankingMap[lav] = { total: 0, count: 0 };
          const mins = (new Date(c.fechaFin).getTime() - new Date(c.inicioLavanderia).getTime()) / 60000;
          rankingMap[lav].total += mins;
          rankingMap[lav].count += 1;
        });
        const ranking = Object.entries(rankingMap)
          .map(([lav, d]) => ({ lav, promedio: d.total / d.count, count: d.count }))
          .sort((a, b) => a.promedio - b.promedio);

        return (
          <div style={{ padding: "12px 16px 100px" }}>
            {/* Lista de lavanderías */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: 1, color: "#555", marginBottom: 10 }}>MIS LAVANDERÍAS ({lavanderias.length})</div>
              {lavanderias.map((lav, idx) => (
                <div key={idx} style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {editandoLav?.idx === idx ? (
                    <input
                      value={editandoLav.nombre}
                      onChange={e => setEditandoLav(p => ({ ...p, nombre: e.target.value }))}
                      style={{ ...inputStyle, flex: 1, marginRight: 8 }}
                      autoFocus
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500, display:"flex", alignItems:"center", gap:6 }}><WashingMachine size={14} color="#3b82f6" />{lav}</div>
                  )}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {editandoLav?.idx === idx ? (
                      <>
                        <button onClick={() => {
                          if (!editandoLav.nombre.trim()) return;
                          setLavanderias(prev => prev.map((l, i) => i === idx ? editandoLav.nombre.trim() : l));
                          setEditandoLav(null);
                        }} style={{ background: "#10b981", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✓</button>
                        <button onClick={() => setEditandoLav(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "6px 10px", color: "#888", fontSize: 12, cursor: "pointer" }}>✕</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditandoLav({ idx, nombre: lav })} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "6px 10px", color: "#888", fontSize: 13, cursor: "pointer" }}>✏️</button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Agregar nueva */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <input
                  placeholder="Nueva lavandería..."
                  value={nuevaLavanderia}
                  onChange={e => setNuevaLavanderia(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && nuevaLavanderia.trim()) {
                      setLavanderias(prev => [...prev, nuevaLavanderia.trim()]);
                      setNuevaLavanderia("");
                    }
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={() => {
                  if (!nuevaLavanderia.trim()) return;
                  setLavanderias(prev => [...prev, nuevaLavanderia.trim()]);
                  setNuevaLavanderia("");
                }} style={{ background: "#10b981", border: "none", borderRadius: 10, padding: "0 18px", color: "#fff", fontSize: 18, cursor: "pointer", fontWeight: 700, flexShrink: 0 }}>+</button>
              </div>
            </div>

            {/* Ranking semanal */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1, color: "#555", marginBottom: 10 }}>RANKING ESTA SEMANA — MÁS RÁPIDAS</div>
              {ranking.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#444", fontSize: 13 }}>
                  <div style={{ marginBottom: 8, display:"flex", justifyContent:"center" }}><WashingMachine size={32} color="#444" /></div>
                  Sin datos esta semana aún
                </div>
              ) : ranking.map((r, i) => (
                <div key={r.lav} style={{ background: i === 0 ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.03)", border: `0.5px solid ${i === 0 ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 16 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}</span>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.lav}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#555" }}>{r.count} pedido{r.count !== 1 ? "s" : ""} esta semana</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? "#10b981" : "#a78bfa" }}>{duracion(r.promedio * 60000)}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>promedio</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══ GESTIÓN LAVANDERÍAS (vista) ══ */}
      {vista === "gestionLavanderias" && (
        <div style={{ padding: "12px 16px 80px" }}>
          <div style={{ fontSize: 14, color: "#555", textAlign: "center", paddingTop: 40 }}>
            Usa el tab Lavands. para gestionar tus lavanderías
          </div>
        </div>
      )}


      {/* ══ MODAL GLOBAL ══ */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setModal(null)}>
          <div style={{ background: "#1a1a2e", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{modal.titulo}</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>{modal.msg}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent", color: "#888", cursor: "pointer", fontWeight: 600 }}>
                {modal.onConfirm ? "Cancelar" : "Entendido"}
              </button>
              {modal.onConfirm && (
                <button onClick={() => { modal.onConfirm(); setModal(null); }}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: "#10b981", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!vista && (tab === "dashboard" || tab === "directorio" || tab === "lavanderias") && (
        <button
          onClick={() => {
            if (tab === "directorio") { setClienteDir(initialClienteDir); setClienteDirActivo(null); setVista("nuevoCliente"); }
            else if (tab === "lavanderias") setVista("gestionLavanderias");
            else setVista("nuevo");
          }}
          style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", background: "#10b981", border: "none", borderRadius: 20, padding: "0 32px", height: 56, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700, color: "#fff", boxShadow: "0 6px 32px rgba(16,185,129,0.6)", zIndex: 50, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 22 }}>+</span>
          {tab === "directorio" ? "Nuevo cliente" : tab === "lavanderias" ? "Gestionar" : "Nuevo pedido"}
        </button>
      )}

      {/* ══ BOTTOM NAV ══ */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(10,10,15,0.97)", borderTop: "0.5px solid rgba(255,255,255,0.08)", display: "flex", zIndex: 40 }}>
        {[
          { key: "dashboard",   icon: <ClipboardList size={20} />, label: "Pedidos",   badge: urgentes.length },
          { key: "directorio",  icon: <Users size={20} />,          label: "Clientes",  badge: 0 },
          { key: "lavanderias", icon: <WashingMachine size={20} />, label: "Lavands.",  badge: 0 },
          { key: "reportes",    icon: <BarChart2 size={20} />,      label: "Reportes",  badge: 0 },
        ].map(t => {
          const activo = !vista && tab === t.key;
          return (
            <button key={t.key} onClick={() => { setVista(null); setTab(t.key); }}
              style={{ flex: 1, background: "none", border: "none", padding: "10px 4px 14px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: activo ? "#10b981" : "#444", position: "relative" }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: activo ? 700 : 400 }}>{t.label}</span>
              {t.badge > 0 && (
                <div style={{ position: "absolute", top: 6, right: "calc(50% - 18px)", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{t.badge}</div>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
