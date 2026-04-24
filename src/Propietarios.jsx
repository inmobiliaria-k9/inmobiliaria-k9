import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { registrarAuditoria } from "./auditoria";

function Modal({ titulo, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>{titulo}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormPropietario({ inicial, inmuebles, onGuardar, onCancelar }) {
  const empty = { nombre: "", cuentas: [{ nombre: "", banco: "", numero: "" }], inmuebles_ids: [] };
  const [form, setForm] = useState(inicial || empty);

  const setCuenta = (i, k, v) => {
    const cuentas = [...form.cuentas];
    cuentas[i] = { ...cuentas[i], [k]: v };
    setForm(f => ({ ...f, cuentas }));
  };

  const agregarCuenta = () => setForm(f => ({ ...f, cuentas: [...f.cuentas, { nombre: "", banco: "", numero: "" }] }));
  const borrarCuenta = (i) => setForm(f => ({ ...f, cuentas: f.cuentas.filter((_, idx) => idx !== i) }));

  const toggleInmueble = (id) => {
    const ids = form.inmuebles_ids.includes(id)
      ? form.inmuebles_ids.filter(i => i !== id)
      : [...form.inmuebles_ids, id];
    setForm(f => ({ ...f, inmuebles_ids: ids }));
  };

  const inp = (label, valor, onChange, placeholder = "") => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>{label}</label>
      <input value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  return (
    <div>
      {inp("Nombre del propietario *", form.nombre, v => setForm(f => ({ ...f, nombre: v })), "Ej. Grupo Hernández")}

      <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 600, marginBottom: 8, marginTop: 4 }}>INMUEBLES ASIGNADOS</div>
      {inmuebles.length === 0 ? (
        <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 16 }}>No hay inmuebles registrados aún.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {inmuebles.map(inm => (
            <div key={inm.id} onClick={() => toggleInmueble(inm.id)}
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${form.inmuebles_ids.includes(inm.id) ? "#00C896" : "#1E2740"}`, background: form.inmuebles_ids.includes(inm.id) ? "#0D2E1F" : "#0A0E17", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🏭</span>
              <span style={{ fontSize: 12, color: form.inmuebles_ids.includes(inm.id) ? "#00C896" : "#4E6080", fontWeight: form.inmuebles_ids.includes(inm.id) ? 600 : 400 }}>{inm.nombre}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 600 }}>CUENTAS BANCARIAS</div>
        <button onClick={agregarCuenta} style={{ background: "none", border: "1px solid #1E2740", borderRadius: 6, color: "#4E8CFF", padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>+ Agregar cuenta</button>
      </div>

      {form.cuentas.map((cuenta, i) => (
        <div key={i} style={{ background: "#0A0E17", borderRadius: 10, padding: "12px", border: "1px solid #1E2740", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#4E8CFF", fontWeight: 600 }}>Cuenta {i + 1}</div>
            {form.cuentas.length > 1 && (
              <button onClick={() => borrarCuenta(i)} style={{ background: "none", border: "none", color: "#FF5C5C", cursor: "pointer", fontSize: 12 }}>✕ Borrar</button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Nombre/Alias", key: "nombre", placeholder: "Ej. Cuenta principal" },
              { label: "Banco", key: "banco", placeholder: "Ej. BBVA" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 11, color: "#3A5070", marginBottom: 4 }}>{label}</label>
                <input value={cuenta[key]} onChange={e => setCuenta(i, key, e.target.value)} placeholder={placeholder}
                  style={{ width: "100%", background: "#141A28", border: "1px solid #1E2740", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ display: "block", fontSize: 11, color: "#3A5070", marginBottom: 4 }}>Número de cuenta (opcional)</label>
              <input value={cuenta.numero} onChange={e => setCuenta(i, "numero", e.target.value)} placeholder="Últimos 4 dígitos"
                style={{ width: "100%", background: "#141A28", border: "1px solid #1E2740", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={onCancelar} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={() => onGuardar(form)} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {inicial ? "Guardar cambios" : "Enviar a aprobación"}
        </button>
      </div>
    </div>
  );
}

export default function Propietarios() {
  const [propietarios, setPropietarios] = useState([]);
  const [inmuebles, setInmuebles] = useState([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmBorrar, setConfirmBorrar] = useState(null);

  useEffect(() => {
    const unsubProp = onSnapshot(collection(db, "propietarios"), snap => {
      setPropietarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubInm = onSnapshot(collection(db, "inmuebles"), snap => {
      setInmuebles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubProp(); unsubInm(); };
  }, []);

  const agregar = async (form) => {
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");
    await addDoc(collection(db, "pendientes"), {
      ...form,
      tipo_movimiento: "propietario",
      fecha_captura: new Date().toISOString(),
    });
    await registrarAuditoria({
      tipo: "alta",
      modulo: "propietarios",
      descripcion: `Propietario enviado a aprobación: ${form.nombre}`,
      detalle: { cuentas: form.cuentas?.length || 0 },
    });
    setModalNuevo(false);
    alert("Propietario enviado a aprobaciones ✅");
  };

  const actualizar = async (form) => {
    const anterior = editando;
    await updateDoc(doc(db, "propietarios", editando.id), form);
    await registrarAuditoria({
      tipo: "edicion",
      modulo: "propietarios",
      descripcion: `Propietario editado: ${form.nombre}`,
      detalle: { cuentas_antes: anterior.cuentas?.length, cuentas_ahora: form.cuentas?.length },
    });
    setEditando(null);
  };

  const borrar = async (id) => {
    const prop = propietarios.find(p => p.id === id);
    await deleteDoc(doc(db, "propietarios", id));
    await registrarAuditoria({
      tipo: "borrado",
      modulo: "propietarios",
      descripcion: `Propietario borrado: ${prop?.nombre}`,
      detalle: null,
    });
    setConfirmBorrar(null);
  };

  return (
    <div style={{ padding: "28px" }}>
      {modalNuevo && (
        <Modal titulo="➕ Nuevo propietario" onClose={() => setModalNuevo(false)}>
          <FormPropietario inmuebles={inmuebles} onGuardar={agregar} onCancelar={() => setModalNuevo(false)} />
        </Modal>
      )}
      {editando && (
        <Modal titulo="✏️ Editar propietario" onClose={() => setEditando(null)}>
          <FormPropietario inicial={editando} inmuebles={inmuebles} onGuardar={actualizar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
      {confirmBorrar && (
        <Modal titulo="Confirmar" onClose={() => setConfirmBorrar(null)}>
          <div style={{ fontSize: 14, color: "#C8D8F0", marginBottom: 20 }}>
            Seguro que quieres borrar a <strong>{confirmBorrar.nombre}</strong>?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirmBorrar(null)} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => borrar(confirmBorrar.id)} style={{ flex: 1, background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 8, color: "#FF5C5C", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Si, borrar</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5" }}>🏢 Propietarios</div>
          <div style={{ fontSize: 12, color: "#3A5070", marginTop: 2 }}>{propietarios.length} propietario{propietarios.length !== 1 ? "s" : ""} registrado{propietarios.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => setModalNuevo(true)} style={{ background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Nuevo propietario
        </button>
      </div>

      {propietarios.length === 0 ? (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "60px", textAlign: "center", color: "#3A5070" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>No hay propietarios registrados</div>
          <div style={{ fontSize: 12 }}>Haz clic en "Nuevo propietario" para agregar el primero</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {propietarios.map(p => (
            <div key={p.id} style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", background: "#0A0E17", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #4E8CFF, #00C896)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>
                    {p.nombre[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: "#3A5070" }}>{p.inmuebles_ids?.length || 0} inmueble{(p.inmuebles_ids?.length || 0) !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditando(p)} style={{ background: "#1A2535", border: "1px solid #1E2740", borderRadius: 6, color: "#4E8CFF", padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>Editar</button>
                  <button onClick={() => setConfirmBorrar(p)} style={{ background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 6, color: "#FF5C5C", padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>Borrar</button>
                </div>
              </div>

              <div style={{ padding: "14px 20px" }}>
                {p.inmuebles_ids?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "#3A5070", marginBottom: 6, fontWeight: 600 }}>INMUEBLES</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {p.inmuebles_ids.map(id => {
                        const inm = inmuebles.find(i => i.id === id);
                        return inm ? (
                          <span key={id} style={{ background: "#0D1A2E", color: "#4E8CFF", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                            🏭 {inm.nombre}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {p.cuentas?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: "#3A5070", marginBottom: 6, fontWeight: 600 }}>CUENTAS BANCARIAS</div>
                    {p.cuentas.map((c, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#0A0E17", borderRadius: 8, border: "1px solid #1E2740", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#C8D8F0" }}>{c.nombre || `Cuenta ${i + 1}`}</div>
                          <div style={{ fontSize: 11, color: "#3A5070" }}>{c.banco}{c.numero ? ` · ****${c.numero}` : ""}</div>
                        </div>
                        <span style={{ background: "#0D2E1F", color: "#00C896", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>Activa</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}