import { useState, useEffect } from "react";

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

export default function App() {
  const [pedidos, setPedidos] = useState(() => JSON.parse(localStorage.getItem("mc_clientes") || "[]"));
  const [directorio, setDirectorio] = useState(() => JSON.parse(localStorage.getItem("mc_directorio") || "[]"));
  
  const [vista, setVista] = useState("dashboard");
  const [filtro, setFiltro] = useState("todos");

  const initialForm = { nombre: "", kg: "", lavanderia: LAVANDERIAS[0], recordarEn: 3, notas: "", precio: "", clienteId: "" };
  const [form, setForm] = useState(initialForm);
  const [formCliente, setFormCliente] = useState({ nombre: "", celular: "", direccion: "", googleMapsUrl: "", notasEntrega: "" });

  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  const [clienteDirDetalle, setClienteDirDetalle] = useState(null);
  const [clienteDirEditId, setClienteDirEditId] = useState(null);

  const [busquedaDir, setBusquedaDir] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  
  // Estados para el control flexible de tiempos en planta
  const [lavanderiaTemp, setLavanderiaTemp] = useState(LAVANDERIAS[0]);
  const [horasEstimadas, setHorasEstimadas] = useState(3);
  const [tick, setTick] = useState(0);
  const [cargandoGps, setCargandoGps] = useState(false);

  useEffect(() => { localStorage.setItem("mc_clientes", JSON.stringify(pedidos)); }, [pedidos]);
  useEffect(() => { localStorage.setItem("mc_directorio", JSON.stringify(directorio)); }, [directorio]);

  // Cronómetro interno que actualiza los relojes de recojo cada 30 segundos de forma automática
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // ⏱️ FORMATEADOR ESTRICTO DE RELOJ: Entrega formato exacto "1h 52m" o avisa recojo
  const obtenerTextoTemporizador = (p) => {
    if (!p.horaEntradaLavanderia) return null;
    const tiempoLimite = new Date(p.horaEntradaLavanderia).getTime() + (p.tiempoEstimadoPlanta || 3) * 3600000;
    const diffMins = Math.round((tiempoLimite - Date.now()) / 60000);

    if (diffMins <= 0) {
      return { desc: "🚨 ¡TIEMPO CUMPLIDO! RECOGER", vencido: true };
    }
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { desc: `⏳ ${hrs}h ${mins}m`, vencido: false };
  };

  // Capturar coordenadas reales frente a la fachada del cliente usando el GPS nativo
  const capturarUbicacionGps = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo o navegador no soporta geolocalización.");
      return;
    }
    setCargandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const urlMaps = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setFormCliente(f => ({ ...f, googleMapsUrl: urlMaps }));
        setCargandoGps(false);
        alert("📍 Ubicación física real capturada y vinculada con éxito.");
      },
      (error) => {
        setCargandoGps(false);
        alert("Error al obtener GPS. Asegúrate de dar permisos de ubicación a la app.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const registrarPedido = () => {
    if (!form.nombre || !form.kg) return;
    const clienteVinculado = directorio.find(d => String(d.id) === form.clienteId);
    const nuevo = {
      id: Date.now(),
      nombre: form.nombre,
      kg: parseFloat(form.kg),
      precio: form.precio || (parseFloat(form.kg) * 5).toFixed(2),
      notes: form.notas,
      clienteId: form.clienteId,
      ingreso: new Date().toISOString(),
      estado: "En recojo",
      lavanderia: "",
      horaEntradaLavanderia: null,
      tiempoEstimadoPlanta: 3,
      historial: [{ estado: "En recojo", fecha: new Date().toISOString() }],
      celularEntrega: clienteVinculado?.celular || "",
      direccionEntrega: clienteVinculado?.direccion || "",
      googleMapsUrl: clienteVinculado?.googleMapsUrl || ""
    };
    setPedidos([nuevo, ...pedidos]);
    setForm(initialForm);
    setVista("dashboard");
  };

  const enviarALavanderiaConTiempo = (id, lavAsignada, horas) => {
    const ahora = new Date().toISOString();
    const actualizados = pedidos.map(p => {
      if (p.id === id) {
        const obj = {
          ...p,
          estado: "En lavandería",
          lavanderia: lavAsignada,
          horaEntradaLavanderia: ahora,
          tiempoEstimadoPlanta: parseFloat(horas) || 3,
          historial: [...(p.historial || []), { estado: "En lavandería", fecha: ahora, lavanderia: lavAsignada }]
        };
        if (pedidoDetalle && pedidoDetalle.id === id) setPedidoDetalle(obj);
        return obj;
      }
      return p;
    });
    setPedidos(actualizados);
  };

  const cambiarEstadoGeneral = (id, nuevoEstado) => {
    const actualizados = pedidos.map(p => {
      if (p.id === id) {
        const obj = {
          ...p,
          estado: nuevoEstado,
          historial: [...(p.historial || []), { estado: nuevoEstado, fecha: new Date().toISOString() }]
        };
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
    setFormCliente({ nombre: "", celular: "", direccion: "", googleMapsUrl: "", notasEntrega: "" });
    setClienteDirEditId(null);
    setVista("directorio");
  };

  const eliminarClienteDir = (id) => {
    if (window.confirm("¿Eliminar este cliente del directorio?")) {
      setDirectorio(directorio.filter(d => d.id !== id));
      setVista("directorio");
    }
  };

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

  return (
    <div style={{
      background: "#0a0a0f", color: "#e8e4dc", minHeight: "100vh",
      maxWidth: 480, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif",
      position: "relative", paddingBottom: 90
    }}>
      
      {/* CONTROL DE VISTAS SUPERIOR */}
      {(vista === "dashboard" || vista === "directorio") && (
        <div style={{ padding: "20px 20px 10px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "sticky", top: 0, background: "#0a0a0fce", backdropFilter: "blur(10px)", zIndex: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#10b981", fontWeight: 700 }}>SISTEMA LOGÍSTICO</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>MC Laundry</div>
            </div>
          </div>

          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 12 }}>
            <button onClick={() => setVista("dashboard")} style={{ flex: 1, border: "none", background: vista === "dashboard" ? "#1a1a2e" : "transparent", color: vista === "dashboard" ? "#10b981" : "#666", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor:"pointer" }}>📦 Órdenes</button>
            <button onClick={() => setVista("directorio")} style={{ flex: 1, border: "none", background: vista === "directorio" ? "#1a1a2e" : "transparent", color: vista === "directorio" ? "#10b981" : "#666", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor:"pointer" }}>👤 Directorio Clientes</button>
          </div>
        </div>
      )}

      {/* VISTA: PANEL PRINCIPAL */}
      {vista === "dashboard" && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pedidos.filter(p => p.estado !== "Entregado").map(p => {
              const reloj = obtenerTextoTemporizador(p);
              const esCritico = reloj?.vencido;

              return (
                <div key={p.id} onClick={() => { setPedidoDetalle(p); setVista("detalle"); }} style={{
                  background: esCritico ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                  border: esCritico ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 16, padding: 16, cursor: "pointer"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{p.nombre}</div>
                      
                      {/* RELOJ EN FORMATO SOLICITADO (1h 52m) */}
                      {reloj && (
                        <div style={{ fontSize: 12, color: esCritico ? "#ef4444" : "#3b82f6", marginTop: 5, fontWeight: 700 }}>
                          🏢 {p.lavanderia} · <span style={{ textDecoration: esCritico ? "blink" : "none" }}>{reloj.desc}</span>
                        </div>
                      )}
                      
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#666", marginTop: 8 }}>
                        <span>⚖️ {p.kg} kg</span>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>S/. {p.precio}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 6, color: ESTADO_COLORS[p.estado], background: `${ESTADO_COLORS[p.estado]}15` }}>
                      {p.estado.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA: DETALLE Y PANEL DE ASIGNACIÓN DE TIEMPO */}
      {vista === "detalle" && pedidoDetalle && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setVista("dashboard")} style={{ border: "none", background: "rgba(255,255,255,0.05)", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor:"pointer" }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Orden: {pedidoDetalle.nombre}</div>
          </div>

          {/* ASIGNADOR DE TIEMPO PERSONALIZADO AL INGRESAR A PLANTA */}
          {pedidoDetalle.estado === "Recogido" && (
            <div style={{ background: "linear-gradient(135deg, #0e1118 0%, #06111a 100%)", border: "1px solid #3b82f6", borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#3b82f6", marginBottom: 12 }}>⏳ CONTROL DE ENTRADA A PLANTA</div>
              
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 6 }}>PLANTA ASIGNADA</label>
              <select value={lavanderiaTemp} onChange={(e) => setLavanderiaTemp(e.target.value)} style={{ width: "100%", background: "#111", color: "#fff", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 15, outline: "none" }}>
                {LAVANDERIAS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 6 }}>TIEMPO ESTIMADO (HORAS)</label>
              <input type="number" min="1" max="24" value={horasEstimadas} onChange={(e) => setHorasEstimadas(e.target.value)} style={{ width: "100%", boxSizing:"border-box", background: "#111", color: "#fff", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 15, fontSize: 14, outline:"none" }} />

              {/* Ajuste rápido para plantas saturadas */}
              <div style={{ display: "flex", gap: 6, marginBottom: 15 }}>
                {[1, 2, 3, 4, 6].map(h => (
                  <button key={h} onClick={() => setHorasEstimadas(h)} style={{ flex: 1, background: horasEstimadas === h ? "#3b82f6" : "rgba(255,255,255,0.04)", border: "none", color: "#fff", padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor:"pointer" }}>
                    {h}h
                  </button>
                ))}
              </div>

              <button onClick={() => { enviarALavanderiaConTiempo(pedidoDetalle.id, lavanderiaTemp, horasEstimadas); setVista("dashboard"); }} style={{ width: "100%", background: "#3b82f6", color: "#fff", border: "none", padding: 14, borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>
                📥 Confirmar Ingreso y Correr Reloj
              </button>
            </div>
          )}

          {/* Rutas de Mapa directo desde el pedido si existen */}
          {pedidoDetalle.googleMapsUrl && (
            <a href={pedidoDetalle.googleMapsUrl} target="_blank" rel="noreferrer" style={{ display: "block", textAlign:"center", background: "rgba(16,185,129,0.15)", color: "#10b981", padding: 12, borderRadius: 12, textDecoration: "none", fontSize: 13, fontWeight: 700, marginBottom: 15, border: "1px solid rgba(16,185,129,0.3)" }}>
              🗺️ Iniciar Navegación GPS a la Casa
            </a>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ESTADOS.map(e => {
              if (e === "En lavandería" && pedidoDetalle.estado === "Recogido") return null;
              return (
                <button key={e} onClick={() => { cambiarEstadoGeneral(pedidoDetalle.id, e); if(e==="Entregado" || e==="Listo para entregar") setVista("dashboard"); }} style={{
                  width: "100%", textAlign: "left", padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)",
                  background: pedidoDetalle.estado === e ? `${ESTADO_COLORS[e]}12` : "rgba(255,255,255,0.02)",
                  color: pedidoDetalle.estado === e ? ESTADO_COLORS[e] : "#aaa", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{ESTADO_DESC[e]}</div>
                  </div>
                  {pedidoDetalle.estado === e && <span style={{fontWeight:700}}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA: REGISTRAR / EDITAR CLIENTE CON UBICACIÓN DE GOOGLE MAPS */}
      {(vista === "nuevoCliente" || vista === "nuevoClienteDashboard") && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setVista(vista === "nuevoClienteDashboard" ? "dashboard" : "directorio")} style={{ border: "none", background: "rgba(255,255,255,0.05)", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor:"pointer" }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{clienteDirEditId ? "Modificar Cliente" : "Nuevo Cliente"}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>NOMBRE DEL CLIENTE</label>
              <input type="text" value={formCliente.nombre} onChange={(e) => setFormCliente({ ...formCliente, nombre: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", outline: "none" }} />
            </div>
            
            <div>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>NÚMERO DE CELULAR</label>
              <input type="text" value={formCliente.celular} onChange={(e) => setFormCliente({ ...formCliente, celular: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", outline: "none" }} />
            </div>

            <div>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>DIRECCIÓN DICTADA (TEXTO)</label>
              <input type="text" placeholder="Ej: Av. Principal 123" value={formCliente.direccion} onChange={(e) => setFormCliente({ ...formCliente, direccion: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", outline: "none" }} />
            </div>

            {/* 📍 CAPTURA MANUAL DE UBICACIÓN REAL EN MAPAS */}
            <div style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.1)", padding: 14, borderRadius: 12 }}>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 8 }}>UBICACIÓN GEOGRÁFICA DE GOOGLE MAPS</label>
              <button type="button" onClick={capturarUbicacionGps} disabled={cargandoGps} style={{ width: "100%", background: "#4f46e5", color: "#fff", border: "none", padding: 12, borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 13, marginBottom: 8 }}>
                {cargandoGps ? "🛰️ Obteniendo señal de satélite..." : "📍 Capturar Ubicación Física Real Aquí"}
              </button>
              {formCliente.googleMapsUrl && (
                <div style={{ fontSize: 11, color: "#10b981", wordBreak: "break-all", background: "rgba(16,185,129,0.05)", padding: 8, borderRadius: 6, border: "1px solid rgba(16,185,129,0.2)" }}>
                  ✅ Guardado: {formCliente.googleMapsUrl}
                </div>
              )}
            </div>

            <button onClick={() => { guardarClienteDir(); setVista(vista === "nuevoClienteDashboard" ? "dashboard" : "directorio"); }} disabled={!formCliente.nombre} style={{ width: "100%", border: "none", borderRadius: 12, padding: 14, fontWeight: 600, background: formCliente.nombre ? "#10b981" : "#222", color: formCliente.nombre ? "#fff" : "#555", cursor: formCliente.nombre ? "pointer" : "default" }}>
              Guardar Cliente en Directorio
            </button>
          </div>
        </div>
      )}

      {/* VISTA: NUEVO PEDIDO */}
      {vista === "nuevo" && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setVista("dashboard")} style={{ border: "none", background: "rgba(255,255,255,0.05)", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor:"pointer" }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Registrar Orden</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>CLIENTE</label>
              <input type="text" placeholder="Buscar cliente..." value={form.nombre} onChange={(e) => handleNombreChange(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", outline:"none" }} />
              {mostrarSugerencias && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#11111f", border: "1px solid #10b981", borderRadius: "0 0 12px 12px", zIndex: 100 }}>
                  {sugerencias.map(s => (
                    <div key={s.id} onClick={() => { setForm({ ...form, nombre: s.nombre, clienteId: String(s.id) }); setMostrarSugerencias(false); }} style={{ padding: 12, cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                      {s.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>PESO (KG)</label>
                <input type="number" placeholder="0.0" value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", outline:"none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>COBRO (S/.)</label>
                <input type="number" placeholder={form.kg ? `S/. ${(form.kg * 5).toFixed(2)}` : "0.00"} value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", outline:"none" }} />
              </div>
            </div>
            <button onClick={registrarPedido} disabled={!form.nombre || !form.kg} style={{ width: "100%", border: "none", borderRadius: 12, padding: 14, fontWeight: 600, background: (form.nombre && form.kg) ? "#10b981" : "#16161f", color: (form.nombre && form.kg) ? "#fff" : "#444", marginTop: 10, cursor:"pointer" }}>Crear Orden</button>
          </div>
        </div>
      )}

      {/* VISTA: LISTA DE DIRECTORIO */}
      {vista === "directorio" && (
        <div style={{ padding: 20 }}>
          <input type="text" placeholder="🔍 Buscar cliente registrado..." value={busquedaDir} onChange={(e) => setBusquedaDir(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 12, color: "#fff", marginBottom: 15, outline:"none" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {directorio.filter(d => d.nombre.toLowerCase().includes(busquedaDir.toLowerCase())).map(d => (
              <div key={d.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{d.nombre}</div>
                    {d.celular && <div style={{ fontSize: 12, color: "#a78bfa", marginTop: 4 }}>📱 Cel: {d.celular}</div>}
                    {d.direccion && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>📍 Dom: {d.direccion}</div>}
                  </div>
                  
                  {/* Acceso inmediato a la ruta guardada en Google Maps */}
                  {d.googleMapsUrl && (
                    <a href={d.googleMapsUrl} target="_blank" rel="noreferrer" style={{ background: "#4f46e5", color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 11, textDecoration: "none", fontWeight: 700 }}>
                      🗺️ MAPA
                    </a>
                  )}
                </div>
                
                <div style={{ display: "flex", gap: 15, marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 8 }}>
                  <button onClick={() => { setFormCliente(d); setClienteDirEditId(d.id); setVista("nuevoCliente"); }} style={{ background: "transparent", border: "none", color: "#3b82f6", fontSize: 11, padding: 0, cursor: "pointer" }}>Editar</button>
                  <button onClick={() => eliminarClienteDir(d.id)} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 11, padding: 0, cursor: "pointer" }}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB: BOTÓN FLOTANTE COMODIDAD ERGONÓMICA */}
      {(vista === "dashboard" || vista === "directorio") && (
        <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 50 }}>
          <button onClick={() => {
            if (vista === "directorio") {
              setFormCliente({ nombre: "", celular: "", direccion: "", googleMapsUrl: "", notasEntrega: "" });
              setClienteDirEditId(null);
              setVista("nuevoCliente");
            } else {
              setForm(initialForm);
              setVista("nuevo");
            }
          }} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 30, padding: "14px 28px", fontSize: 14, fontWeight: 700, boxShadow: "0 10px 25px rgba(16,185,129,0.3)", cursor: "pointer" }}>
            + {vista === "directorio" ? "NUEVO CLIENTE" : "NUEVO PEDIDO"}
          </button>
        </div>
      )}

    </div>
  );
}
