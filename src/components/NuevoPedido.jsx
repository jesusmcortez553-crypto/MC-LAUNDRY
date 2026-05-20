export default function NuevoPedido({
  form,
  setForm,
  agregarPedido
}) {

  return (
    <div style={{ padding: 16 }}>

      <h3>Nuevo Pedido</h3>

      <input
        placeholder="Nombre"
        value={form.nombre}
        onChange={e =>
          setForm(p => ({ ...p, nombre: e.target.value }))
        }
      />

      <br />

      <input
        placeholder="Kg"
        value={form.kg}
        onChange={e =>
          setForm(p => ({ ...p, kg: e.target.value }))
        }
      />

      <br /><br />

      <button onClick={agregarPedido}>
        Guardar pedido
      </button>

    </div>
  );
}
