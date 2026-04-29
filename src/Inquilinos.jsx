import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDocs } from "firebase/firestore";
import { inmuebles } from "./utils";
import { registrarAuditoria } from "./auditoria";

const hoy = new Date();

function diasRestantes(fechaFin) {
  if (!fechaFin) return null;
  const fin = new Date(fechaFin);
  const diff = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
  return diff;
}

function alertaContrato(dias) {
  if (dias === null) return null;
  if (dias < 0) return { color: "#FF5C5C", bg: "#2E0D0D", label: "Vencido" };
  if (dias <= 30) return { color: "#FF5C5C", bg: "#2E0D0D", label: `Vence en ${dias} días` };
  if (dias <= 90) return { color: "#FFB547", bg: "#2A2000", label: `Vence en ${dias} días` };
  return { color: "#00C896", bg: "#0D2E1F", label: `Vigente (${dias} días)` };
}

function Modal({ titulo, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>{titulo}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormInquilino({ inicial, naves, onGuardar, onCancelar }) {
  const empty = {
    alias: "", razon_social: "", rfc: "", contacto: "", telefono: "", correo: "",
    nave_id: "", inmueble_id: "", fecha_inicio: "", fecha_fin: "", notas: ""
  };
  const [form, setForm] = useState(inicial || empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const navesFiltradas = form.inmueble_id
    ? naves.filter(n => String(n.inmueble_id) === String(form.inmueble_id))
    : naves;

  const diasRestantesContrato = diasRestantes(form.fecha_fin);
  const alerta = alertaContrato(diasRestantesContrato);

  const inp = (label, key, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>{label}</label>
      <input value={form[key] || ""} onChange={e => set(key, e.target.value)} type={type} placeholder={placeholder}
        style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Datos del inquilino</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div>{inp("Alias *", "alias", "text", "Ej. LOGÍSTICA ABC")}</div>
        <div>{inp("Razón social", "razon_social", "text", "Nombre legal completo")}</div>
        <div>{inp("RFC", "rfc", "text", "Ej. LAB123456XYZ")}</div>
        <div>{inp("Contacto / Representante", "contacto", "text", "Nombre")}</div>
        <div>{inp("Teléfono", "telefono", "tel", "55 1234 5678")}</div>
        <div>{inp("Correo", "correo", "email", "correo@empresa.com")}</div>
      </div>

      <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 700, marginBottom: 10, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Nave asignada</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Inmueble</label>
          <select value={form.inmueble_id} onChange={e => { set("inmueble_id", e.target.value); set("nave_id", ""); }}
            style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
            <option value="">Seleccionar inmueble</option>
            {inmuebles.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Nave</label>
          <select value={form.nave_id} onChange={e => set("nave_id", e.target.value)}
            style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
            <option value="">Seleccionar nave</option>
            {navesFiltradas.map(n => <option key={n.id} value={n.id}>{n.nombre} — {n.m2} m²</option>)}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 700, marginBottom: 10, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Contrato</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div>{inp("Fecha inicio", "fecha_inicio", "date")}</div>
        <div>{inp("Fecha fin", "fecha_fin", "date")}</div>
      </div>

      {alerta && form.fecha_fin && (
        <div style={{ background: alerta.bg, border: `1px solid ${alerta.color}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>📋</span>
          <span style={{ fontSize: 13, color: alerta.color, fontWeight: 600 }}>{alerta.label}</span>
        </div>
      )}

      <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 700, marginBottom: 10, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Incremento de renta</div>
      <div style={{ background: "#0A0E17", borderRadius: 10, padding: "14px", border: "1px solid #1E2740", marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 10 }}>
          Registra aquí la próxima fecha de incremento y el monto acordado. Pasará a aprobación del Director.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <div>{inp("Fecha de incremento", "fecha_incremento", "date")}</div>
          <div>{inp("Renta nueva ($)", "renta_nueva", "number", "Ej. 95000")}</div>
        </div>
        <div>{inp("Motivo / Notas del incremento", "notas_incremento", "text", "Ej. Incremento anual acordado")}</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Notas generales</label>
        <textarea value={form.notas || ""} onChange={e => set("notas", e.target.value)} rows={2} placeholder="Observaciones, condiciones especiales..."
          style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancelar} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={() => onGuardar(form)} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {inicial ? "Guardar cambios" : "Enviar a aprobación"}
        </button>
      </div>
    </div>
  );
}

function ModalIncrementoDirecto({ inq, naves, onClose, onGuardar }) {
  const nave = naves.find(n => n.id === inq.nave_id);
  const [form, setForm] = useState({
    fecha_incremento: "",
    renta_actual: nave?.renta || 0,
    renta_nueva: "",
    notas_incremento: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 440 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>📈 Registrar incremento</div>
            <div style={{ fontSize: 12, color: "#4E6080", marginTop: 2 }}>{inq.alias}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ background: "#0A0E17", borderRadius: 10, padding: "12px 14px", border: "1px solid #1E2740", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#3A5070", marginBottom: 4 }}>Renta actual</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#00C896" }}>${Number(form.renta_actual).toLocaleString()}/mes</div>
            {nave && <div style={{ fontSize: 11, color: "#3A5070", marginTop: 2 }}>{nave.nombre} · {nave.m2} m²</div>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Fecha del incremento *</label>
            <input value={form.fecha_incremento} onChange={e => set("fecha_incremento", e.target.value)} type="date"
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Renta nueva ($) *</label>
            <input value={form.renta_nueva} onChange={e => set("renta_nueva", e.target.value)} type="number" placeholder="Ej. 95000"
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            {form.renta_nueva && Number(form.renta_nueva) > 0 && (
              <div style={{ fontSize: 12, color: "#FFB547", marginTop: 4 }}>
                Incremento: ${(Number(form.renta_nueva) - Number(form.renta_actual)).toLocaleString()}
                ({(((Number(form.renta_nueva) - Number(form.renta_actual)) / Number(form.renta_actual)) * 100).toFixed(1)}%)
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Motivo / Notas</label>
            <input value={form.notas_incremento} onChange={e => set("notas_incremento", e.target.value)} placeholder="Ej. Incremento anual acordado"
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => {
              if (!form.fecha_incremento || !form.renta_nueva) return alert("Fecha y renta nueva son obligatorios");
              onGuardar({ ...form, renta_actual: Number(form.renta_actual), renta_nueva: Number(form.renta_nueva) });
              onClose();
            }} style={{ flex: 2, background: "linear-gradient(135deg, #FFB547, #FF8C5C)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Enviar a aprobación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Inquilinos({ rol, usuarioEmail }) {
  const [inquilinos, setInquilinos] = useState([]);
  const [naves, setNaves] = useState([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmBorrar, setConfirmBorrar] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [modalIncremento, setModalIncremento] = useState(null);

  useEffect(() => {
    const unsubInq = onSnapshot(collection(db, "inquilinos"), snap => {
      setInquilinos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const cargarNaves = async () => {
      const snap = await getDocs(collection(db, "naves"));
      setNaves(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    cargarNaves();
    return () => unsubInq();
  }, []);

  const agregar = async (form) => {
    if (!form.alias.trim()) return alert("El alias es obligatorio");
    await addDoc(collection(db, "pendientes"), {
      ...form,
      tipo_movimiento: "inquilino",
      fecha_captura: new Date().toISOString(),
      capturado_por: usuarioEmail,
    });
    await registrarAuditoria({
      tipo: "alta", modulo: "inquilinos",
      descripcion: `Inquilino enviado a aprobación: ${form.alias}`,
      detalle: { razon_social: form.razon_social, rfc: form.rfc },
    });
    setModalNuevo(false);
    alert("Inquilino enviado a aprobaciones ✅");
  };

  const actualizar = async (form) => {
    const anterior = editando;
    await updateDoc(doc(db, "inquilinos", editando.id), form);
    await registrarAuditoria({
      tipo: "edicion", modulo: "inquilinos",
      descripcion: `Inquilino editado: ${form.alias}`,
      detalle: { anterior: { alias: anterior.alias, nave_id: anterior.nave_id }, nuevo: { alias: form.alias, nave_id: form.nave_id } },
    });
    setEditando(null);
  };

  const borrar = async (id) => {
    const inq = inquilinos.find(i => i.id === id);
    await deleteDoc(doc(db, "inquilinos", id));
    await registrarAuditoria({
      tipo: "borrado", modulo: "inquilinos",
      descripcion: `Inquilino borrado: ${inq?.alias}`,
      detalle: { razon_social: inq?.razon_social },
    });
    setConfirmBorrar(null);
  };

  const registrarIncremento = async (inq, data) => {
    await addDoc(collection(db, "pendientes"), {
      tipo_movimiento: "incremento",
      inquilino_id: inq.id,
      inquilino_alias: inq.alias,
      nave_id: inq.nave_id,
      inmueble_id: inq.inmueble_id,
      renta_actual: data.renta_actual,
      renta_nueva: data.renta_nueva,
      fecha_incremento: data.fecha_incremento,
      notas_incremento: data.notas_incremento || "",
      fecha_captura: new Date().toISOString(),
      capturado_por: usuarioEmail,
    });
    await registrarAuditoria({
      tipo: "alta", modulo: "incrementos",
      descripcion: `Incremento enviado a aprobación: ${inq.alias} — $${Number(data.renta_actual).toLocaleString()} → $${Number(data.renta_nueva).toLocaleString()}`,
      detalle: { renta_actual: data.renta_actual, renta_nueva: data.renta_nueva, fecha: data.fecha_incremento },
    });
    alert("Incremento enviado a aprobaciones ✅");
  };

  const getNave = (nave_id) => naves.find(n => n.id === nave_id);
  const getInmueble = (inmueble_id) => inmuebles.find(i => String(i.id) === String(inmueble_id));

  const filtrados = inquilinos.filter(inq =>
    `${inq.alias} ${inq.razon_social} ${inq.contacto} ${inq.rfc}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  const vencenPronto = inquilinos.filter(inq => {
    const dias = diasRestantes(inq.fecha_fin);
    return dias !== null && dias <= 90 && dias >= 0;
  });

  const vencidos = inquilinos.filter(inq => {
    const dias = diasRestantes(inq.fecha_fin);
    return dias !== null && dias < 0;
  });

  const incrementosPronto = inquilinos.filter(inq => {
    const dias = diasRestantes(inq.fecha_incremento);
    return dias !== null && dias <= 60 && dias >= 0;
  });

  return (
    <div style={{ padding: "28px" }}>
      {modalNuevo && (
        <Modal titulo="➕ Nuevo inquilino" onClose={() => setModalNuevo(false)}>
          <FormInquilino naves={naves} onGuardar={agregar} onCancelar={() => setModalNuevo(false)} />
        </Modal>
      )}
      {editando && (
        <Modal titulo="✏️ Editar inquilino" onClose={() => setEditando(null)}>
          <FormInquilino inicial={editando} naves={naves} onGuardar={actualizar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
      {confirmBorrar && (
        <Modal titulo="⚠️ Confirmar" onClose={() => setConfirmBorrar(null)}>
          <div style={{ fontSize: 14, color: "#C8D8F0", marginBottom: 20 }}>¿Seguro que quieres borrar a <strong>{confirmBorrar.alias}</strong>?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirmBorrar(null)} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => borrar(confirmBorrar.id)} style={{ flex: 1, background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 8, color: "#FF5C5C", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sí, borrar</button>
          </div>
        </Modal>
      )}
      {modalIncremento && (
        <ModalIncrementoDirecto
          inq={modalIncremento}
          naves={naves}
          onClose={() => setModalIncremento(null)}
          onGuardar={(data) => registrarIncremento(modalIncremento, data)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5" }}>👥 Inquilinos</div>
          <div style={{ fontSize: 12, color: "#3A5070", marginTop: 2 }}>{inquilinos.length} inquilino{inquilinos.length !== 1 ? "s" : ""} registrado{inquilinos.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => setModalNuevo(true)} style={{ background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          ➕ Nuevo inquilino
        </button>
      </div>

      {(vencidos.length > 0 || vencenPronto.length > 0 || incrementosPronto.length > 0) && (
        <div style={{ marginBottom: 20 }}>
          {vencidos.length > 0 && (
            <div style={{ background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span style={{ fontSize: 13, color: "#FF5C5C", fontWeight: 600 }}>{vencidos.length} contrato{vencidos.length > 1 ? "s" : ""} vencido{vencidos.length > 1 ? "s" : ""}: {vencidos.map(i => i.alias).join(", ")}</span>
            </div>
          )}
          {vencenPronto.length > 0 && (
            <div style={{ background: "#2A2000", border: "1px solid #FFB54733", borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <span style={{ fontSize: 13, color: "#FFB547", fontWeight: 600 }}>{vencenPronto.length} contrato{vencenPronto.length > 1 ? "s" : ""} por vencer: {vencenPronto.map(i => i.alias).join(", ")}</span>
            </div>
          )}
          {incrementosPronto.length > 0 && (
            <div style={{ background: "#0D1A2E", border: "1px solid #4E8CFF33", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>📈</span>
              <span style={{ fontSize: 13, color: "#4E8CFF", fontWeight: 600 }}>{incrementosPronto.length} incremento{incrementosPronto.length > 1 ? "s" : ""} próximo{incrementosPronto.length > 1 ? "s" : ""} (menos de 60 días): {incrementosPronto.map(i => i.alias).join(", ")}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total", inquilinos.length, "#4E8CFF"],
          ["Activos", inquilinos.filter(i => { const d = diasRestantes(i.fecha_fin); return d === null || d >= 0; }).length, "#00C896"],
          ["Contratos por vencer", vencenPronto.length, "#FFB547"],
          ["Contratos vencidos", vencidos.length, "#FF5C5C"],
        ].map(([l, v, c], i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 10, padding: "14px 16px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar por alias, razón social, RFC..."
        style={{ width: "100%", background: "#0F1520", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box", marginBottom: 16 }} />

      {filtrados.length === 0 ? (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "60px", textAlign: "center", color: "#3A5070" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>No hay inquilinos registrados</div>
          <div style={{ fontSize: 12 }}>Haz clic en "Nuevo inquilino" para agregar el primero</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {filtrados.map(inq => {
            const nave = getNave(inq.nave_id);
            const inmueble = getInmueble(inq.inmueble_id);
            const dias = diasRestantes(inq.fecha_fin);
            const alerta = alertaContrato(dias);
            const diasIncremento = diasRestantes(inq.fecha_incremento);
            return (
              <div key={inq.id} style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", background: "#0A0E17", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #4E8CFF, #00C896)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>
                      {inq.alias[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{inq.alias}</div>
                      {inq.razon_social && <div style={{ fontSize: 11, color: "#4E6080" }}>{inq.razon_social}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setModalIncremento(inq)}
                      style={{ background: "#0D1A2E", border: "1px solid #4E8CFF33", borderRadius: 6, color: "#4E8CFF", padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>📈</button>
                    <button onClick={() => setEditando(inq)} style={{ background: "#1A2535", border: "1px solid #1E2740", borderRadius: 6, color: "#4E8CFF", padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>✏️</button>
                    <button onClick={() => setConfirmBorrar(inq)} style={{ background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 6, color: "#FF5C5C", padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>🗑️</button>
                  </div>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  {nave && (
                    <div style={{ background: "#0A0E17", borderRadius: 8, padding: "8px 12px", border: "1px solid #1E2740", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#3A5070", marginBottom: 2 }}>🏭 {inmueble?.nombre}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#4E8CFF" }}>{nave.nombre} — {nave.m2?.toLocaleString()} m²</div>
                      </div>
                      {nave.renta > 0 && <div style={{ fontSize: 14, fontWeight: 800, color: "#00C896" }}>${Number(nave.renta).toLocaleString()}</div>}
                    </div>
                  )}
                  {alerta && (
                    <div style={{ background: alerta.bg, borderRadius: 8, padding: "7px 12px", border: `1px solid ${alerta.color}33`, marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: alerta.color, fontWeight: 600 }}>📋 Contrato: {alerta.label}</div>
                      {inq.fecha_fin && <div style={{ fontSize: 11, color: "#3A5070", marginTop: 2 }}>Vence: {inq.fecha_fin}</div>}
                    </div>
                  )}
                  {inq.fecha_incremento && (
                    <div style={{ background: diasIncremento !== null && diasIncremento <= 60 && diasIncremento >= 0 ? "#0D1A2E" : "#0A0E17", borderRadius: 8, padding: "7px 12px", border: `1px solid ${diasIncremento !== null && diasIncremento <= 60 && diasIncremento >= 0 ? "#4E8CFF33" : "#1E2740"}`, marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: diasIncremento !== null && diasIncremento < 0 ? "#FF5C5C" : diasIncremento !== null && diasIncremento <= 60 ? "#4E8CFF" : "#3A5070", fontWeight: 600 }}>
                        📈 Incremento: {inq.fecha_incremento}
                        {inq.renta_nueva && <span style={{ color: "#00C896", marginLeft: 6 }}>${Number(inq.renta_nueva).toLocaleString()}</span>}
                      </div>
                      {diasIncremento !== null && (
                        <div style={{ fontSize: 11, color: diasIncremento < 0 ? "#FF5C5C" : "#4E8CFF", marginTop: 2 }}>
                          {diasIncremento < 0
                            ? `Venció hace ${Math.abs(diasIncremento)} días`
                            : `Faltan ${diasIncremento} días`}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {inq.contacto && <div style={{ fontSize: 12, color: "#4E6080" }}>👤 {inq.contacto}</div>}
                    {inq.telefono && <div style={{ fontSize: 12, color: "#4E6080" }}>📞 {inq.telefono}</div>}
                    {inq.correo && <div style={{ fontSize: 12, color: "#4E6080" }}>✉️ {inq.correo}</div>}
                    {inq.rfc && <div style={{ fontSize: 12, color: "#4E6080" }}>🏷️ {inq.rfc}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}