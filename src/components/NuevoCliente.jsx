export default function NuevoCliente({
  clienteDir,
  setClienteDir,
  guardarClienteDir
}) {

  return (
    <div style={{ padding: 16 }}>

      <h3>Nuevo Cliente</h3>

      <input
        placeholder="Nombre"
        value={clienteDir.nombre}
        onChange={(e) =>
          setClienteDir(p => ({ ...p, nombre: e.target.value }))
        }
      />

      <br />

      <input
        placeholder="Celular"
        value={clienteDir.celular}
        onChange={(e) =>
          setClienteDir(p => ({ ...p, celular: e.target.value }))
        }
      />

      <br /><br />

      <button onClick={() => guardarClienteDir()}>
        Guardar cliente
      </button>

    </div>
  );
}
