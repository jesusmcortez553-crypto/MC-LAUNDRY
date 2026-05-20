export default function Directorio({
  directorioFiltrado,
  busquedaDir,
  setBusquedaDir,
  onSelectCliente
}) {

  return (
    <div style={{ padding: 16 }}>

      <h3>Clientes</h3>

      <input
        placeholder="Buscar cliente..."
        value={busquedaDir}
        onChange={(e) => setBusquedaDir(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
        {directorioFiltrado.map(d => (
          <div
            key={d.id}
            onClick={() => onSelectCliente(d.id)}
            style={{
              padding: 8,
              borderBottom: "1px solid #333",
              cursor: "pointer"
            }}
          >
            {d.nombre}
          </div>
        ))}
      </div>

    </div>
  );
}
