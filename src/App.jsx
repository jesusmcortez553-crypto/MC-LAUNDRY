import { useState, useEffect, useRef, useMemo } from "react";
import { Bike, ShoppingBasket, WashingMachine, PackageCheck, Package, Phone, MapPin, FileText, Timer, AlertCircle, User, Users, BarChart2, ClipboardList, Plus, Shirt, Map, Pencil } from "lucide-react";

const LAVANDERIAS_DEFAULT = ["Lavandería Centro", "Lavandería Norte", "Lavandería Express", "Otra"];
const ESTADOS = ["En recojo", "Recogido", "En lavandería", "Listo para entregar", "Entregado"];
const SIGUIENTE_ESTADO = {
  "En recojo": "Recogido",
  "Recogido": "En lavandería",
  "En lavandería": "Listo para entregar",
  "Listo para entregar": "Entregado",
};

// Paleta optimizada para el sol: tonos oscuros de alta saturación
const ESTADO_COLORS = {
  "En recojo":           "#D97706", // Ámbar oscuro
  "Recogido":            "#C026D3", // Fucsia fuerte
  "En lavandería":       "#2563EB", // Azul rey de alta visibilidad
  "Listo para entregar": "#16A34A", // Verde esmeralda encendido
  "Entregado":           "#4B5563", // Gris oscuro texturizado
};

const ESTADO_DESC = {
  "En recojo":           "Camino a buscar la ropa",
  "Recogido":            "Ropa en mano · eligiendo lavandería",
  "En lavandería":       "Ropa dejada · temporizador activo",
  "Listo para entregar": "Recogida · camino al cliente",
  "Entregado":           "Servicio completado",
};

const ESTADO_ICONS = {
  "En recojo":           <Bike size={22} strokeWidth={2.5} />,
  "Recogido":            <ShoppingBasket size={22} strokeWidth={2.5} />,
  "En lavandería":       <WashingMachine size={22} strokeWidth={2.5} />,
  "Listo para entregar": <PackageCheck size={22} strokeWidth={2.5} />,
  "Entregado":           <Package size={22} strokeWidth={2.5} />,
};

export default function App() {
  // --- ESTADOS PRINCIPALES ---
  const [pedidos, setPedidos] = useState(() => {
    const s = localStorage.getItem("lavago_pedidos");
    return s ? JSON.parse(s) : [];
  });

  const [directorio, setDirectorio] = useState(() => {
    const s = localStorage.getItem("lavago_directorio");
    return s ? JSON.parse(s) : [];
  });

  const [lavanderias, setLavanderias] = useState(() => {
    const s = localStorage.getItem("lavago_lavanderias");
    return s ? JSON.parse(s) : LAVANDERIAS_DEFAULT;
  });

  // --- NAVEGACIÓN ---
  const [tab, setTab] = useState("dashboard"); // "dashboard", "directorio", "lavanderias", "reportes"
  const [vista, setVista] = useState(null); // null, "crear-pedido", "ver-pedido", "crear-cliente"
  const [pedidoSelId, setPedidoSelId] = useState(null);

  // --- ALERTAS TIEMPO REAL ---
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Guardar en LocalStorage cada vez que cambien los datos
  useEffect(() => { localStorage.setItem("lavago_pedidos", JSON.stringify(pedidos)); }, [pedidos]);
  useEffect(() => { localStorage.setItem("lavago_directorio", JSON.stringify(directorio)); }, [directorio]);
  useEffect(() => { localStorage.setItem("lavago_lavanderias", JSON.stringify(lavanderias)); }, [lavanderias]);

  // --- FORMULARIOS ---
  const [form, setForm] = useState({
    clienteId: "",
    nombre: "",
    celular: "",
    direccion: "",
    referencia: "",
    mapsLink: "",
    peso: "",
    costoLavanderia: "",
    montoCobrado: "",
    lavanderiaAsignada: LAVANDERIAS_DEFAULT[0],
    duracionEstimada: "120",
    notas: ""
  });

  const [formCli, setFormCli] = useState({ nombre: "", celular: "", direccion: "", referencia: "", mapsLink: "" });
  const [nuevaLav, setNuevaLav] = useState("");

  // --- AUTOCOMPLETADO EN TIEMPO REAL ---
  const handleNombreChange = (val) => {
    setForm(f => ({ ...f, nombre: val }));
    const coincidencia = directorio.find(d => d.nombre.toLowerCase().trim() === val.toLowerCase().trim());
    if (coincidencia) {
      setForm(f => ({
        ...f,
        clienteId: coincidencia.id,
        celular: coincidencia.celular,
        direccion: coincidencia.direccion,
        referencia: coincidencia.referencia,
        mapsLink: coincidencia.mapsLink
      }));
    } else {
      setForm(f => ({ ...f, clienteId: "" }));
    }
  };

  const capturarUbicacion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        // CORREGIDO: URL interactiva de mapas estándar y template literals bien estructurados
        const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setForm(f => ({ ...f, mapsLink: link }));
        setFormCli(f => ({ ...f, mapsLink: link }));
        alert("📍 Ubicación GPS capturada exitosamente");
      }, () => {
        alert("No se pudo obtener el acceso GPS.");
      });
    }
  };

  // --- MANEJADORES DE ACCIONES ---
  const agregarPedido = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    let cId = form.clienteId;
    if (!cId) {
      cId = crypto.randomUUID();
      const nuevoCli = {
        id: cId,
        nombre: form.nombre.trim(),
        celular: form.celular.trim(),
        direccion: form.direccion.trim(),
        referencia: form.referencia.trim(),
        mapsLink: form.mapsLink.trim(),
      };
      setDirectorio(prev => [nuevoCli, ...prev]);
    }

    const nuevoPed = {
      id: crypto.randomUUID(),
      clienteId: cId,
      nombre: form.nombre.trim(),
      celular: form.celular.trim(),
      direccion: form.direccion.trim(),
      referencia: form.referencia.trim(),
      mapsLink: form.mapsLink.trim(),
      peso: parseFloat(form.peso) || 0,
      costoLavanderia: parseFloat(form.costoLavanderia) || 0,
      montoCobrado: parseFloat(form.montoCobrado) || 0,
      lavanderiaAsignada: form.lavanderiaAsignada,
      duracionEstimada: parseInt(form.duracionEstimada) || 120,
      notas: form.notas.trim(),
      estado: "En recojo",
      historial: [{ estado: "En recojo", fecha: new Date().toISOString() }],
      timestampLavanderia: null
    };

    setPedidos(prev => [nuevoPed, ...prev]);
    setVista(null);
    resetForm();
  };

  const avanzarEstado = (id) => {
    setPedidos(prev => prev.map(p => {
      if (p.id !== id) return p;
      const prox = SIGUIENTE_ESTADO[p.estado];
      if (!prox) return p;

      const nHistorial = [...p.historial, { estado: prox, fecha: new Date().toISOString() }];
      let tLav = p.timestampLavanderia;
      if (prox === "En lavandería") {
        tLav = new Date().toISOString();
      }

      return { ...p, estado: prox, historial: nHistorial, timestampLavanderia: tLav };
    }));
  };

  const agregarClienteDirecto = (e) => {
    e.preventDefault();
    if (!formCli.nombre.trim()) return;
    const nCli = { id: crypto.randomUUID(), ...formCli };
    setDirectorio(prev => [nCli, ...prev]);
    setVista(null);
    setFormCli({ nombre: "", celular: "", direccion: "", referencia: "", mapsLink: "" });
  };

  const resetForm = () => {
    setForm({
      clienteId: "", nombre: "", celular: "", direccion: "", referencia: "", mapsLink: "",
      peso: "", costoLavanderia: "", montoCobrado: "", lavanderiaAsignada: lavanderias[0],
      duracionEstimada: "120", notas: ""
    });
  };

  // --- MEMOS / REPORTES / TIEMPO ---
  const urgentes = useMemo(() => {
    return pedidos.filter(p => {
      if (p.estado !== "En lavandería" || !p.timestampLavanderia) return false;
      const transcurrido = (new Date() - new Date(p.timestampLavanderia)) / 60000;
      return transcurrido >= p.duracionEstimada;
    });
  }, [pedidos, tick]);

  // Disparar alerta nativa PWA si hay prendas expiradas
  useEffect(() => {
    if (urgentes.length > 0 && "Notification" in window && Notification.permission === "granted") {
      new Notification("⚠️ Alerta Lava Go!", {
        body: `Hay ${urgentes.length} pedidos retrasados en lavandería.`,
        tag: "retraso-lavago"
      });
    }
  }, [urgentes]);

  const pedidoSeleccionado = useMemo(() => pedidos.find(p => p.id === pedidoSelId), [pedidos, pedidoSelId]);

  const reportesGlobales = useMemo(() => {
    const hoyStr = new Date().toISOString().split("T")[0];
    let ingresosHoy = 0, kilosHoy = 0, cuentasPorCobrar = 0, costoLavanderiaTotal = 0;

    pedidos.forEach(p => {
      const entregadoHoy = p.estado === "Entregado" && p.historial.some(h => h.estado === "Entregado" && h.fecha.startsWith(hoyStr));
      if (entregadoHoy) {
        ingresosHoy += p.montoCobrado;
        kilosHoy += p.peso;
        costoLavanderiaTotal += p.costoLavanderia;
      }
      if (p.estado !== "Entregado") {
        cuentasPorCobrar += p.montoCobrado;
      }
    });

    return { ingresosHoy, kilosHoy, cuentasPorCobrar, utilidadProyectada: ingresosHoy - costoLavanderiaTotal };
  }, [pedidos]);

  // --- ESTILOS REUTILIZABLES (MÁXIMO CONTRASTE SOLAR) ---
  const inputStyle = {
    width: "100%",
    padding: "12px",
    background: "#FFFFFF",
    color: "#111827",
    border: "2px solid #9CA3AF",
    borderRadius: "10px",
    fontSize: "16px",
    boxSizing: "border-box",
    marginBottom: "14px"
  };

  const labelStyle = {
    display: "block",
    fontSize: "14px",
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: "6px"
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: "#FFFFFF", color: "#111827", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "sans-serif", paddingBottom: 80 }}>
      
      {/* HEADER DE LA APP */}
      <header style={{ background: "#FFFFFF", borderBottom: "3px solid #D1D5DB", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#16A34A", color: "#FFFFFF", padding: 8, borderRadius: 10 }}><Shirt size={24} strokeWidth={3} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-0.5px" }}>Lava Go!</h1>
            <p style={{ fontSize: 12, margin: 0, color: "#374151", fontWeight: 600 }}>Operaciones en Campo</p>
          </div>
        </div>
        {urgentes.length > 0 && (
          <div style={{ background: "#DC2626", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: "bold", animation: "pulse 1.5s infinite" }}>
            <AlertCircle size={16} strokeWidth={2.5} /> <span>{urgentes.length} ALERTA</span>
          </div>
        )}
      </header>

      {/* RENDERIZADO DE VISTAS EMERGENTES (MODALES) */}
      {vista === "crear-pedido" && (
        <div style={{ padding: 20, background: "#FFFFFF", minHeight: "90vh" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Nuevo Pedido</h2>
            <button onClick={() => { setVista(null); resetForm(); }} style={{ background: "#E5E7EB", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: "bold", color: "#111827" }}>Cerrar</button>
          </div>
          <form onSubmit={agregarPedido}>
            <label style={labelStyle}>Nombre del Cliente *</label>
            <input type="text" value={form.nombre} onChange={e => handleNombreChange(e.target.value)} style={inputStyle} placeholder="Escribe para buscar o agregar..." required list="clientes-lista" />
            <datalist id="clientes-lista">
              {directorio.map(d => <option key={d.id} value={d.nombre} />)}
            </datalist>

            <label style={labelStyle}>Celular</label>
            <input type="tel" value={form.celular} onChange={e => setForm({ ...f => ({ ...f, celular: e.target.value }) })} style={inputStyle} placeholder="Ej. 987654321" />

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Enlace de Ubicación Maps</label>
                <input type="text" value={form.mapsLink} onChange={e => setForm({ ...f => ({ ...f, mapsLink: e.target.value }) })} style={inputStyle} placeholder="https://maps.google..." />
              </div>
              <button type="button" onClick={capturarUbicacion} style={{ marginBottom: 14, padding: "12px", background: "#2563EB", color: "#FFFFFF", border: "none", borderRadius: 10, fontWeight: "bold", display: "flex", alignItems: "center", gap: 5 }}><MapPin size={20} /> GPS</button>
            </div>

            <label style={labelStyle}>Dirección Física</label>
            <input type="text" value={form.direccion} onChange={e => setForm({ ...f => ({ ...f, direccion: e.target.value }) })} style={inputStyle} placeholder="Av. Principal 123" />

            <label style={labelStyle}>Referencia de Entrega</label>
            <input type="text" value={form.referencia} onChange={e => setForm({ ...f => ({ ...f, referencia: e.target.value }) })} style={inputStyle} placeholder="Portón azul, frente al parque" />

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Peso Total (Kg)</label>
                <input type="number" step="0.1" value={form.peso} onChange={e => setForm({ ...f => ({ ...f, peso: e.target.value }) })} style={inputStyle} placeholder="0.0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Costo Lavandería (S/)</label>
                <input type="number" step="0.5" value={form.costoLavanderia} onChange={e => setForm({ ...f => ({ ...f, costoLavanderia: e.target.value }) })} style={inputStyle} placeholder="0.00" />
              </div>
            </div>

            <label style={labelStyle}>Monto Total a Cobrar al Cliente (S/) *</label>
            <input type="number" step="0.5" value={form.montoCobrado} onChange={e => setForm({ ...f => ({ ...f, montoCobrado: e.target.value }) })} style={inputStyle} placeholder="0.00" required />

            <label style={labelStyle}>Lavandería de Destino</label>
            <select value={form.lavanderiaAsignada} onChange={e => setForm({ ...f => ({ ...f, lavanderiaAsignada: e.target.value }) })} style={inputStyle}>
              {lavanderias.map((l, idx) => <option key={idx} value={l}>{l}</option>)}
            </select>

            <label style={labelStyle}>Tiempo Máximo de Entrega (Minutos)</label>
            <select value={form.duracionEstimada} onChange={e => setForm({ ...f => ({ ...f, duracionEstimada: e.target.value }) })} style={inputStyle}>
              <option value="60">1 Hora (Express)</option>
              <option value="120">2 Horas (Estándar)</option>
              <option value="180">3 Horas</option>
              <option value="1440">24 Horas</option>
            </select>

            <label style={labelStyle}>Notas Especiales / Observaciones de Ropa</label>
            <textarea value={form.notas} onChange={e => setForm({ ...f => ({ ...f, notas: e.target.value }) })} style={{ ...inputStyle, height: 80, resize: "none" }} placeholder="Prendas delicadas, edredón manchado, etc." />

            <button type="submit" style={{ width: "100%", padding: 16, background: "#16A34A", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 16, fontWeight: "bold", marginTop: 10 }}>Crear e Iniciar Ruta</button>
          </form>
        </div>
      )}

      {vista === "ver-pedido" && pedidoSeleccionado && (
        <div style={{ padding: 20, background: "#FFFFFF", minHeight: "90vh" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "2px solid #E5E7EB", paddingBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Ficha de Pedido</h2>
              <span style={{ fontSize: 11, color: "#4B5563" }}>ID: {pedidoSeleccionado.id.substring(0,8)}</span>
            </div>
            <button onClick={() => setVista(null)} style={{ background: "#E5E7EB", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: "bold" }}>Regresar</button>
          </div>

          <div style={{ background: "#F3F4F6", border: "2px solid #D1D5DB", padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#111827", display: "flex", alignItems: "center", gap: 8 }}><User size={20} /> {pedidoSeleccionado.nombre}</h3>
            <p style={{ margin: "4px 0", fontSize: 14 }}><b>Celular:</b> {pedidoSeleccionado.celular || "No asignado"}</p>
            <p style={{ margin: "4px 0", fontSize: 14 }}><b>Dirección:</b> {pedidoSeleccionado.direccion || "No asignado"}</p>
            <p style={{ margin: "4px 0", fontSize: 14 }}><b>Referencia:</b> {pedidoSeleccionado.referencia || "No asignado"}</p>
            {pedidoSeleccionado.mapsLink && (
              <a href={pedidoSeleccionado.mapsLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#2563EB", color: "#FFFFFF", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: "bold", textDecoration: "none", marginTop: 10 }}>
                <Map size={16} /> Ver en Google Maps (Ruta GPS)
              </a>
            )}
          </div>

          <div style={{ background: "#F3F4F6", border: "2px solid #D1D5DB", padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 15 }}>Detalles de Carga y Caja</h4>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}><span>Peso:</span> <b>{pedidoSeleccionado.peso} Kg</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}><span>Costo Lavandería:</span> <b>S/ {pedidoSeleccionado.costoLavanderia.toFixed(2)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}><span>Monto Cobrado:</span> <b style={{ color: "#16A34A", fontSize: 16 }}>S/ {pedidoSeleccionado.montoCobrado.toFixed(2)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>Lavandería:</span> <b>{pedidoSeleccionado.lavanderiaAsignada}</b></div>
            {pedidoSeleccionado.notas && <div style={{ marginTop: 10, padding: 8, background: "#FFFFFF", borderLeft: "4px solid #D97706", fontSize: 13, color: "#374151" }}><b>Notas:</b> {pedidoSeleccionado.notas}</div>}
          </div>

          <div style={{ background: "#F3F4F6", border: "2px solid #D1D5DB", padding: 16, borderRadius: 12 }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: 15 }}>Historial de Trazabilidad</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pedidoSeleccionado.historial.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ background: ESTADO_COLORS[h.estado], color: "#FFFFFF", padding: 4, borderRadius: "50%" }}>{ESTADO_ICONS[h.estado]}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: "bold" }}>{h.estado}</div>
                    <div style={{ fontSize: 11, color: "#4B5563" }}>{new Date(h.fecha).toLocaleTimeString()} · {new Date(h.fecha).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {vista === "crear-cliente" && (
        <div style={{ padding: 20, background: "#FFFFFF", minHeight: "90vh" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Registrar Cliente</h2>
            <button onClick={() => setVista(null)} style={{ background: "#E5E7EB", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: "bold" }}>Cerrar</button>
          </div>
          <form onSubmit={agregarClienteDirecto}>
            <label style={labelStyle}>Nombre Completo *</label>
            <input type="text" value={formCli.nombre} onChange={e => setFormCli({ ...formCli, nombre: e.target.value })} style={inputStyle} placeholder="Ej. Juan Pérez" required />

            <label style={labelStyle}>Número de Celular *</label>
            <input type="tel" value={formCli.celular} onChange={e => setFormCli({ ...formCli, celular: e.target.value })} style={inputStyle} placeholder="Ej. 999888777" required />

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ubicación GPS Link</label>
                <input type="text" value={formCli.mapsLink} onChange={e => setFormCli({ ...formCli, mapsLink: e.target.value })} style={inputStyle} placeholder="https://maps..." />
              </div>
              <button type="button" onClick={capturarUbicacion} style={{ marginBottom: 14, padding: "12px", background: "#2563EB", color: "#FFFFFF", border: "none", borderRadius: 10, fontWeight: "bold" }}><MapPin size={20} /></button>
            </div>

            <label style={labelStyle}>Dirección Residencia</label>
            <input type="text" value={formCli.direccion} onChange={e => setFormCli({ ...formCli, direccion: e.target.value })} style={inputStyle} placeholder="Calle Los Almendros 456" />

            <label style={labelStyle}>Referencia</label>
            <input type="text" value={formCli.referencia} onChange={e => setFormCli({ ...formCli, referencia: e.target.value })} style={inputStyle} placeholder="Frente a la bodega Don Pepe" />

            <button type="submit" style={{ width: "100%", padding: 16, background: "#16A34A", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 16, fontWeight: "bold", marginTop: 10 }}>Guardar en Directorio</button>
          </form>
        </div>
      )}

      {/* RENDERIZADO DE PESTAÑAS PRINCIPALES DE NAVEGACIÓN */}
      {!vista && (
        <main style={{ padding: 16, flex: 1 }}>
          
          {/* TAB 1: PEDIDOS / DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#111827" }}>Monitoreo de Entregas</h2>
                <button onClick={() => setVista("crear-pedido")} style={{ background: "#16A34A", color: "#FFFFFF", border: "none", padding: "10px 16px", borderRadius: 10, fontWeight: "bold", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}><Plus size={18} strokeWidth={3} /> Ruta</button>
              </div>

              {pedidos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", background: "#F3F4F6", borderRadius: 16, border: "2px dashed #9CA3AF", marginTop: 10 }}>
                  <ClipboardList size={40} style={{ color: "#6B7280", marginBottom: 10 }} />
                  <p style={{ margin: 0, fontWeight: "bold", color: "#374151" }}>No hay pedidos activos en la ruta de hoy.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {pedidos.map(p => {
                    // CORREGIDO: Búsqueda exacta de cliente por ID String para evitar NaNs
                    const cl = directorio.find(d => String(d.id) === String(p.clienteId));
                    const esExpirado = p.estado === "En lavandería" && p.timestampLavanderia && (((new Date() - new Date(p.timestampLavanderia)) / 60000) >= p.duracionEstimada);
                    
                    return (
                      <div key={p.id} style={{ background: esExpirado ? "#FEF3C7" : "#F3F4F6", border: esExpirado ? "2px solid #D97706" : "2px solid #D1D5DB", borderRadius: 16, padding: 16, position: "relative" }}>
                        
                        {/* Indicador de Estado Superior Derecho */}
                        <div style={{ position: "absolute", top: 14, right: 14, background: ESTADO_COLORS[p.estado], color: "#FFFFFF", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: "bold", display: "flex", alignItems: "center", gap: 4 }}>
                          {ESTADO_ICONS[p.estado]} {p.estado.toUpperCase()}
                        </div>

                        <h3 style={{ margin: "0 0 4px 0", fontSize: 17, fontWeight: 800, paddingRight: 110, color: "#111827" }}>{p.nombre}</h3>
                        <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#374151", fontWeight: 600 }}>📍 {p.direccion || "Dirección no especificada"}</p>
                        
                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                          <span style={{ fontSize: 12, background: "#FFFFFF", border: "1px solid #9CA3AF", padding: "3px 8px", borderRadius: 6, fontWeight: "bold" }}>📦 {p.peso} Kg</span>
                          <span style={{ fontSize: 12, background: "#FFFFFF", border: "1px solid #9CA3AF", padding: "3px 8px", borderRadius: 6, fontWeight: "bold", color: "#16A34A" }}>💰 S/ {p.montoCobrado.toFixed(2)}</span>
                        </div>

                        {esExpirado && (
                          <div style={{ background: "#F59E0B", color: "#FFFFFF", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 12, fontWeight: "bold" }}>
                            <Timer size={16} strokeWidth={2.5} /> Ropa lista en {p.lavanderiaAsignada}. ¡Ir a recoger!
                          </div>
                        )}

                        {/* Botonera de Acción en Ruta */}
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button onClick={() => { setPedidoSelId(p.id); setVista("ver-pedido"); }} style={{ flex: 1, background: "#FFFFFF", border: "2px solid #9CA3AF", padding: "10px", borderRadius: 10, fontWeight: "bold", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "#111827" }}><FileText size={16} /> Detalles</button>
                          {p.celular && (
                            <a href={`tel:${p.celular}`} style={{ background: "#FFFFFF", border: "2px solid #9CA3AF", padding: "10px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB" }}><Phone size={18} strokeWidth={2.5} /></a>
                          )}
                          {p.mapsLink && (
                            <a href={p.mapsLink} target="_blank" rel="noreferrer" style={{ background: "#FFFFFF", border: "2px solid #9CA3AF", padding: "10px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A" }}><Map size={18} strokeWidth={2.5} /></a>
                          )}
                        </div>

                        {/* Gran Botón de Siguiente Estado */}
                        {SIGUIENTE_ESTADO[p.estado] && (
                          <button onClick={() => avanzarEstado(p.id)} style={{ width: "100%", background: ESTADO_COLORS[p.estado], color: "#FFFFFF", border: "none", padding: "14px", borderRadius: 12, fontWeight: "bold", fontSize: 14, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
                            Marcar como: "{SIGUIENTE_ESTADO[p.estado]}" &rarr;
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIRECTORIO DE CLIENTES */}
          {tab === "directorio" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Agenda de Clientes</h2>
                <button onClick={() => setVista("crear-cliente")} style={{ background: "#16A34A", color: "#FFFFFF", border: "none", padding: "10px 16px", borderRadius: 10, fontWeight: "bold", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}><Plus size={18} strokeWidth={3} /> Cliente</button>
              </div>

              {directorio.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", background: "#F3F4F6", borderRadius: 16, border: "2px dashed #9CA3AF" }}>
                  <p style={{ margin: 0, color: "#4B5563" }}>Ningún cliente en base de datos. Se agregan automáticamente al crear rutas.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {directorio.map(d => (
                    <div key={d.id} style={{ background: "#F3F4F6", border: "2px solid #D1D5DB", padding: 14, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: 15 }}>{d.nombre}</div>
                        <div style={{ fontSize: 13, color: "#374151" }}>📱 {d.celular || "Sin celular"}</div>
                        <div style={{ fontSize: 12, color: "#4B5563", marginTop: 2 }}>📍 {d.direccion || "Sin dirección física"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {d.celular && <a href={`tel:${d.celular}`} style={{ padding: 10, background: "#FFFFFF", border: "1px solid #9CA3AF", borderRadius: 8, color: "#2563EB" }}><Phone size={16} strokeWidth={2.5} /></a>}
                        {d.mapsLink && <a href={d.mapsLink} target="_blank" rel="noreferrer" style={{ padding: 10, background: "#FFFFFF", border: "1px solid #9CA3AF", borderRadius: 8, color: "#16A34A" }}><Map size={16} strokeWidth={2.5} /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MÓDULO DE LAVANDERÍAS ASOCIADAS */}
          {tab === "lavanderias" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Talleres de Lavandería</h2>
              <form onSubmit={(e) => { e.preventDefault(); if(nuevaLav.trim()) { setLavanderias([...lavanderias, nuevaLav.trim()]); setNuevaLav(""); } }} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <input type="text" value={nuevaLav} onChange={e => setNuevaLav(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} placeholder="Nombre de nueva lavandería..." />
                <button type="submit" style={{ padding: "0 20px", background: "#16A34A", color: "#FFFFFF", border: "none", borderRadius: 10, fontWeight: "bold" }}>Añadir</button>
              </form>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lavanderias.map((l, i) => {
                  const prendasAhi = pedidos.filter(p => p.estado === "En lavandería" && p.lavanderiaAsignada === l).length;
                  return (
                    <div key={i} style={{ background: "#F3F4F6", border: "2px solid #D1D5DB", padding: 16, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ background: "#2563EB", color: "#FFFFFF", padding: 8, borderRadius: 8 }}><WashingMachine size={20} /></div>
                        <div style={{ fontWeight: "bold" }}>{l}</div>
                      </div>
                      <span style={{ fontSize: 12, background: prendasAhi > 0 ? "#FEF3C7" : "#E5E7EB", border: prendasAhi > 0 ? "1px solid #D97706" : "1px solid #9CA3AF", padding: "4px 10px", borderRadius: 12, fontWeight: "bold", color: prendasAhi > 0 ? "#B45309" : "#111827" }}>
                        {prendasAhi} órdenes procesando
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: MÓDULO FINANCIERO / REPORTES DE LIQUIDACIÓN */}
          {tab === "reportes" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Liquidación de Caja Hoy</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#F3F4F6", border: "2px solid #D1D5DB", padding: 14, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: "#4B5563", fontWeight: "bold" }}>INGRESOS ENTREGADOS</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#16A34A", marginTop: 4 }}>S/ {reportesGlobales.ingresosHoy.toFixed(2)}</div>
                </div>
                <div style={{ background: "#F3F4F6", border: "2px solid #D1D5DB", padding: 14, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: "#4B5563", fontWeight: "bold" }}>KILOS PROCESADOS</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#111827", marginTop: 4 }}>{reportesGlobales.kilosHoy.toFixed(2)} Kg</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div style={{ background: "#F3F4F6", border: "2px solid #D1D5DB", padding: 14, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: "#4B5563", fontWeight: "bold" }}>POR COBRAR (EN RUTA)</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#D97706", marginTop: 4 }}>S/ {reportesGlobales.cuentasPorCobrar.toFixed(2)}</div>
                </div>
                <div style={{ background: "#F3F4F6", border: "2px solid #D1D5DB", padding: 14, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: "#4B5563", fontWeight: "bold" }}>UTILIDAD NETO REAL</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#2563EB", marginTop: 4 }}>S/ {reportesGlobales.utilidadProyectada.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ background: "#FFFFFF", border: "2px solid #D1D5DB", padding: 16, borderRadius: 14 }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: 14, color: "#111827" }}>Auditoría Interna de Caja</h4>
                <p style={{ margin: 0, fontSize: 12, color: "#374151", lineHeight: "1.5" }}>
                  Las métricas se calculan automáticamente con base en los registros locales almacenados en el dispositivo del operador. La utilidad neta resta los costos cargados por los talleres del monto bruto entregado.
                </p>
              </div>
            </div>
          )}

        </main>
      )}

      {/* FOOTER NAVEGADOR - MENÚ FIJO INFERIOR EN CLARO ALTO CONTRASTE */}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#F9FAFB", borderTop: "3px solid #D1D5DB", display: "flex", zIndex: 40 }}>
        {[
          { key: "dashboard",   icon: <ClipboardList size={24} strokeWidth={2.5} />, label: "Pedidos",   badge: urgentes.length },
          { key: "directorio",  icon: <Users size={24} strokeWidth={2.5} />,          label: "Clientes",  badge: 0 },
          { key: "lavanderias", icon: <WashingMachine size={24} strokeWidth={2.5} />, label: "Lavands.",  badge: 0 },
          { key: "reportes",    icon: <BarChart2 size={24} strokeWidth={2.5} />,      label: "Reportes",  badge: 0 },
        ].map(t => {
          const activo = !vista && tab === t.key;
          return (
            <button key={t.key} onClick={() => { setVista(null); setTab(t.key); }}
              style={{ flex: 1, background: "none", border: "none", padding: "12px 4px 16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, color: activo ? "#16A34A" : "#6B7280", position: "relative" }}>
              <span>{t.icon}</span>
              <span style={{ fontSize: 12, fontWeight: activo ? 800 : 600 }}>{t.label}</span>
              {t.badge > 0 && (
                <span style={{ position: "absolute", top: 4, right: "20%", background: "#DC2626", color: "#FFFFFF", fontSize: 10, fontWeight: "bold", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

    </div>
  );
}
