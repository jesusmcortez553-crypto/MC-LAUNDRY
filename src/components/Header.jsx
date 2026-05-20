export default function Header({
  stats,
  urgentes,
  tab,
  setTab,
  directorio
}) {

  return (
    <div style={{
      padding: 16,
      borderBottom: "1px solid #222",
      marginBottom: 10
    }}>

      <div style={{
        display: "flex",
        justifyContent: "space-between"
      }}>

        <div>
          <div style={{ fontSize: 10 }}>LAVAGET</div>
          <div style={{ fontSize: 22 }}>MC Laundry</div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10 }}>HOY COBRADO</div>
          <div style={{ fontSize: 24 }}>
            S/. {stats.ingresosHoy.toFixed(2)}
          </div>
        </div>

      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginTop: 10
      }}>
        <div>Activos: {stats.activos}</div>
        <div>Listos: {stats.listos}</div>
        <div>Urgentes: {urgentes.length}</div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        marginTop: 10,
        justifyContent: "space-around"
      }}>
        {["dashboard", "directorio", "reportes"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              color: tab === t ? "#10b981" : "#555"
            }}
          >
            {t}
          </button>
        ))}
      </div>

    </div>
  );
}
