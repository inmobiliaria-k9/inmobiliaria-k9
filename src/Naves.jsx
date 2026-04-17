import { useState } from "react";
import { db } from "./firebase";
import { collection, doc, setDoc, addDoc } from "firebase/firestore";
import { calcularEstado, calcularPrecioM2, estadoConfig, inmuebles } from "./utils";
import { Badge } from "./Badge";

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
            <button onClick={() => { onSave({ ...form, estado: estadoCalculado }); onClose(); }} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Naves({ naves, setNaves }) {
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [guardando, setGuardando] = useState(false);

  const guardarNave = async (updated) => {
    setGuardando(true);
    try {
      await setDoc(doc(db, "naves", updated.id), updated);
      setNaves(ns => ns.map(n => n.id === updated.id ? { ...n, ...updated } : n));
    } catch (e) { console.error(e); }
    setGuardando(false);
  };

  const agregarNave = async (inmueble_id) => {
    const nombre = prompt("Nombre de la nave:");
    const m2 = prompt("Metros cuadrados:");
    if (nombre && m2) {
      const nueva = { inmueble_id, nombre, m2: Number(m2), renta: 0, inquilino: "", mantenimiento: false };
      try {
        const ref = await addDoc(collection(db, "naves"), nueva);
        setNaves(ns => [...ns, { ...nueva, id: ref.id }]);
      } catch (e) { console.error(e); }
    }
  };

  const rentaTotal = naves.reduce((s, n) => s + Number(n.renta), 0);
  const rentadas = naves.filter(n => calcularEstado(n) === "rentada").length;
  const m2Rentados = naves.filter(n => calcularEstado(n) === "rentada").reduce((s, n) => s + Number(n.m2), 0);

  return (
    <div style={{ padding: "28px" }}>
      {editando && <EditarNaveModal nave={editando} onClose={() => setEditando(null)} onSave={guardarNave} />}
      {guardando && <div style={{ position: "fixed", top: 20, right: 20, background: "#00C896", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 300 }}>💾 Guardando...</div>}

      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>🏭 Inmuebles y Naves</div>
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

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar..."
          style={{ flex: 1, minWidth: 220, background: "#0F1520", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#E8EDF5", outline: "none" }} />
        {["todos", "rentada", "disponible", "mantenimiento"].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{ background: filtro === f ? "#1A2535" : "none", border: `1px solid ${filtro === f ? "#4E8CFF" : "#1E2740"}`, borderRadius: 20, color: filtro === f ? "#4E8CFF" : "#4E6080", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {f === "todos" ? "Todos" : estadoConfig[f]?.label}
          </button>
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
                  <div style={{ fontSize: 18, fontWeight: 800, color: rentadasInm === navesInm.length ? "#00C896" : "#FFB547" }}>{rentadasInm}/{navesInm.length}</div>
                  <div style={{ fontSize: 11, color: "#3A5070" }}>rentadas</div>
                </div>
                <button onClick={() => agregarNave(inm.id)} style={{ background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Nave</button>
              </div>
            </div>
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
          </div>
        );
      })}
    </div>
  );
}
