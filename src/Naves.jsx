import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, doc, setDoc, addDoc, onSnapshot } from "firebase/firestore";
import { calcularEstado, calcularPrecioM2, estadoConfig } from "./utils";
import { Badge } from "./Badge";
import { registrarAuditoria } from "./auditoria";

const inmueblesSemilla = [
  { id: "inm1", nombre: "PARQUE JINT" },
  { id: "inm2", nombre: "JAGÜEY" },
  { id: "inm3", nombre: "PARQUE SAN LORENZO" },
  { id: "inm4", nombre: "AV 15 DE MAYO" },
];

function ModalInmueble({ inicial, onClose, onSave }) {
  const [nombre, setNombre] = useState(inicial?.nombre || "");
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 400 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>{inicial ? "✏️ Editar inmueble" : "➕ Nuevo inmueble"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 6, fontWeight: 600 }}>Nombre del inmueble *</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. PARQUE INDUSTRIAL NORTE"
            style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box", marginBottom: 20 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => { if (nombre.trim()) { onSave(nombre.trim()); onClose(); } }}
              style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {inicial ? "Guardar" : "Enviar a aprobación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalNave({ inmueble_id, onClose, onSave }) {
  const [nombre, setNombre] = useState("");
  const [m2, setM2] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 400 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>➕ Nueva nave</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 6, fontWeight: 600 }}>Nombre de la nave *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Nave A"
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 6, fontWeight: 600 }}>Metros cuadrados *</label>
            <input value={m2} onChange={e => setM2(e.target.value)} placeholder="Ej. 1200" type="number"
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => { if (nombre.trim() && m2) { onSave(nombre.trim(), m2); onClose(); } }}
              style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Enviar a aprobación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditarNaveModal({ nave, onClose, onSave }) {
  const [form, setForm] = useState({ ...nave });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const estadoCalculado = calcularEstado(form);
  const precioM2 = calcularPrecioM2(form.renta, form.m2);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 480 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>✏️ Editar {nave.nombre}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ background: "#0A0E17", borderRadius: 10, padding: "12px 14px", border: "1px solid #1E2740", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 11, color: "#3A5070", marginBottom: 3 }}>Estado automático</div><Badge estado={estadoCalculado} /></div>
            {precioM2 && <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#3A5070", marginBottom: 3 }}>Precio por m²</div><div style={{ fontSize: 16, fontWeight: 800, color: "#FFB547" }}>${precioM2}</div></div>}
          </div>
          {[
            { label: "Nombre de la nave", key: "nombre", type: "text" },
            { label: "Metros cuadrados (m²)", key: "m2", type: "number" },
            { label: "Renta mensual ($)", key: "renta", type: "number" },
            { label: "Inquilino / Empresa", key: "inquilino", type: "text" },
          ].map(({ label, key, type }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>{label}</label>
              <input value={form[key] || ""} onChange={e => set(key, e.target.value)} type={type}
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0A0E17", borderRadius: 10, padding: "12px 14px", border: "1px solid #1E2740" }}>
            <div><div style={{ fontSize: 13, color: "#C8D8F0", fontWeight: 600 }}>🔧 En mantenimiento</div><div style={{ fontSize: 11, color: "#3A5070" }}>Activa si está fuera de servicio</div></div>
            <div onClick={() => set("mantenimiento", !form.mantenimiento)} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: form.mantenimiento ? "#FFB547" : "#1A2535", position: "relative", border: `1px solid ${form.mantenimiento ? "#FFB547" : "#1E2740"}` }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.mantenimiento ? 22 : 2, transition: "all 0.2s" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => { onSave({ ...form, estado: estadoCalculado }); onClose(); }}
              style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Naves({ naves, setNaves, rol, usuarioEmail }) {
  const [inmuebles, setInmuebles] = useState([]);
  const [editando, setEditando] = useState(null);
  const [modalInmueble, setModalInmueble] = useState(false);
  const [modalNave, setModalNave] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inmuebles"), snap => {
      if (snap.empty) {
        inmueblesSemilla.forEach(inm => setDoc(doc(db, "inmuebles", inm.id), { nombre: inm.nombre }));
        setInmuebles(inmueblesSemilla);
      } else {
        setInmuebles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });
    return () => unsub();
  }, []);

  const agregarInmueble = async (nombre) => {
    await addDoc(collection(db, "pendientes"), {
      tipo_movimiento: "inmueble",
      nombre,
      fecha_captura: new Date().toISOString(),
      capturado_por: usuarioEmail,
    });
    await registrarAuditoria({ tipo: "alta", modulo: "inmuebles", descripcion: `Inmueble enviado a aprobación: ${nombre}`, detalle: null });
    alert("Inmueble enviado a aprobaciones ✅");
  };

  const agregarNave = async (nombre, m2, inmueble_id) => {
    await addDoc(collection(db, "pendientes"), {
      tipo_movimiento: "nave",
      nombre,
      m2: Number(m2),
      inmueble_id,
      renta: 0,
      inquilino: "",
      mantenimiento: false,
      fecha_captura: new Date().toISOString(),
      capturado_por: usuarioEmail,
    });
    await registrarAuditoria({ tipo: "alta", modulo: "naves", descripcion: `Nave enviada a aprobación: ${nombre} — ${m2} m²`, detalle: { inmueble_id } });
    alert("Nave enviada a aprobaciones ✅");
  };

  const guardarNave = async (updated) => {
    setGuardando(true);
    try {
      const anterior = naves.find(n => n.id === updated.id);
      await setDoc(doc(db, "naves", updated.id), updated);
      setNaves(ns => ns.map(n => n.id === updated.id ? { ...n, ...updated } : n));
      await registrarAuditoria({ tipo: "edicion", modulo: "naves", descripcion: `Nave editada: ${updated.nombre}`, detalle: { anterior: { renta: anterior?.renta, inquilino: anterior?.inquilino }, nuevo: { renta: updated.renta, inquilino: updated.inquilino } } });
    } catch (e) { console.error(e); }
    setGuardando(false);
  };

  const rentaTotal = naves.reduce((s, n) => s + Number(n.renta), 0);
  const rentadas = naves.filter(n => calcularEstado(n) === "rentada").length;
  const m2Rentados = naves.filter(n => calcularEstado(n) === "rentada").reduce((s, n) => s + Number(n.m2), 0);

  return (
    <div style={{ padding: "28px" }}>
      {editando && <EditarNaveModal nave={editando} onClose={() => setEditando(null)} onSave={guardarNave} />}
      {modalInmueble && <ModalInmueble onClose={() => setModalInmueble(false)} onSave={agregarInmueble} />}
      {modalNave && <ModalNave inmueble_id={modalNave} onClose={() => setModalNave(null)} onSave={(nombre, m2) => agregarNave(nombre, m2, modalNave)} />}
      {guardando && <div style={{ position: "fixed", top: 20, right: 20, background: "#00C896", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 300 }}>💾 Guardando...</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5" }}>🏭 Inmuebles y Naves</div>
        <button onClick={() => setModalInmueble(true)} style={{ background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          ➕ Nuevo inmueble
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#00C896", marginBottom: 20 }}>● Conectado a Firebase — los cambios se guardan automáticamente</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total naves", naves.length, "#4E8CFF"],
          ["Rentadas", rentadas, "#00C896"],
          ["Disponibles", naves.filter(n => calcularEstado(n) === "disponible").length, "#4E8CFF"],
          ["Renta mensual", rentaTotal > 0 ? `$${rentaTotal.toLocaleString()}` : "—", "#00C896"],
          ["Precio prom/m²", m2Rentados > 0 ? `$${(rentaTotal / m2Rentados).toFixed(2)}` : "—", "#FFB547"],
        ].map(([l, v, c], i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 10, padding: "14px 16px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: i > 2 ? 14 : 22, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {inmuebles.map(inm => {
        const navesInm = naves.filter(n => n.inmueble_id === inm.id);
        const rentadasInm = navesInm.filter(n => calcularEstado(n) === "rentada").length;
        const rentaInm = navesInm.reduce((s, n) => s + Number(n.renta), 0);
        return (
          <div key={inm.id} style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0A0E17" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1A2535", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏭</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5" }}>{inm.nombre}</div>
                  <div style={{ fontSize: 12, color: "#3A5070" }}>
                    {navesInm.length} naves · {navesInm.reduce((s, n) => s + Number(n.m2), 0).toLocaleString()} m²
                    {rentaInm > 0 && <span style={{ color: "#00C896" }}> · ${rentaInm.toLocaleString()}/mes</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: rentadasInm === navesInm.length && navesInm.length > 0 ? "#00C896" : "#FFB547" }}>{rentadasInm}/{navesInm.length}</div>
                  <div style={{ fontSize: 11, color: "#3A5070" }}>rentadas</div>
                </div>
                <button onClick={() => setModalNave(inm.id)} style={{ background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Nave</button>
              </div>
            </div>
            {navesInm.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#3A5070", fontSize: 13 }}>
                No hay naves — haz clic en "+ Nave" para agregar la primera
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, padding: 16 }}>
                {navesInm.map(nave => {
                  const estado = calcularEstado(nave);
                  const precioM2 = calcularPrecioM2(nave.renta, nave.m2);
                  return (
                    <div key={nave.id} style={{ background: "#0A0E17", borderRadius: 12, border: `1px solid ${estadoConfig[estado].color}22`, padding: "14px", transition: "all 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = estadoConfig[estado].color + "66"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = estadoConfig[estado].color + "22"}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 26 }}>🏗️</span>
                        <Badge estado={estado} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>{nave.nombre}</div>
                      <div style={{ fontSize: 13, color: "#4E6080", marginBottom: 6 }}>📐 {Number(nave.m2).toLocaleString()} m²</div>
                      {Number(nave.renta) > 0 ? (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#00C896" }}>${Number(nave.renta).toLocaleString()}<span style={{ fontSize: 10, color: "#3A5070", fontWeight: 400 }}>/mes</span></div>
                          {precioM2 && <div style={{ fontSize: 12, color: "#FFB547", fontWeight: 600 }}>${precioM2}/m²</div>}
                        </div>
                      ) : <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 8 }}>Renta: por definir</div>}
                      {nave.inquilino && <div style={{ fontSize: 11, color: "#4E8CFF", marginBottom: 8, background: "#0D1A2E", borderRadius: 6, padding: "4px 8px" }}>🏢 {nave.inquilino}</div>}
                      <button onClick={() => setEditando(nave)} style={{ width: "100%", background: "#1A2535", border: "1px solid #1E2740", borderRadius: 7, color: "#4E6080", padding: "6px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏️ Editar</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}