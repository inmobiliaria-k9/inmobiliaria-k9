import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, getDocs } from "firebase/firestore";

function ModalGasto({ onClose, onSave }) {
  const fechaHoy = new Date().toISOString().split("T")[0];
  const [cuentas, setCuentas] = useState([]);
  const [form, setForm] = useState({
    concepto: "",
    monto: "",
    fecha: fechaHoy,
    cuenta_id: "",
    cuenta_nombre: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const cargarCuentas = async () => {
      const snap = await getDocs(collection(db, "propietarios"));
      const lista = [{ id: "efectivo", nombre: "Efectivo", banco: "Caja general" }];
      snap.docs.forEach(d => {
        const p = d.data();
        (p.cuentas || []).forEach((c, i) => {
          lista.push({ id: `${d.id}_${i}`, nombre: c.nombre || `Cuenta ${i + 1}`, banco: c.banco });
        });
      });
      setCuentas(lista);
      set("cuenta_id", lista[0].id);
      set("cuenta_nombre", `${lista[0].nombre} — ${lista[0].banco}`);
    };
    cargarCuentas();
  }, []);

  const seleccionarCuenta = (id) => {
    const c = cuentas.find(c => c.id === id);
    if (c) { set("cuenta_id", id); set("cuenta_nombre", `${c.nombre} — ${c.banco}`); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 420 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>Nuevo gasto</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>x</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Concepto *</label>
            <input value={form.concepto} onChange={e => set("concepto", e.target.value)} placeholder="Ej. Mantenimiento bomba agua"
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Monto ($) *</label>
              <input value={form.monto} onChange={e => set("monto", e.target.value)} type="number" placeholder="0.00"
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Fecha</label>
              <input value={form.fecha} onChange={e => set("fecha", e.target.value)} type="date"
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#FF5C5C", marginBottom: 5, fontWeight: 600 }}>Cuenta de donde sale</label>
            <select value={form.cuenta_id} onChange={e => seleccionarCuenta(e.target.value)}
              style={{ width: "100%", background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#FF5C5C", outline: "none", fontWeight: 600 }}>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.id === "efectivo" ? "Efectivo — Caja general" : `${c.nombre} — ${c.banco}`}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => {
              if (!form.concepto.trim() || !form.monto) return alert("Concepto y monto son obligatorios");
              onSave({ ...form, monto: Number(form.monto), tipo: "gasto" });
              onClose();
            }} style={{ flex: 2, background: "linear-gradient(135deg, #FF5C5C, #FF8C5C)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Registrar gasto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [filtroCuenta, setFiltroCuenta] = useState("todas");
  const [cuentas, setCuentas] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gastos"), snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar por fecha — más antiguo arriba, más nuevo abajo
      lista.sort((a, b) => a.fecha > b.fecha ? 1 : -1);
      setGastos(lista);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const cargarCuentas = async () => {
      const snap = await getDocs(collection(db, "propietarios"));
      const lista = [{ id: "efectivo", nombre: "Efectivo", banco: "Caja general" }];
      snap.docs.forEach(d => {
        const p = d.data();
        (p.cuentas || []).forEach((c, i) => {
          lista.push({ id: `${d.id}_${i}`, nombre: c.nombre || `Cuenta ${i + 1}`, banco: c.banco });
        });
      });
      setCuentas(lista);
    };
    cargarCuentas();
  }, []);

  const agregar = async (data) => {
    await addDoc(collection(db, "gastos"), data);
  };

  const borrar = async (id) => {
    if (confirm("Seguro que quieres borrar este gasto?")) {
      await deleteDoc(doc(db, "gastos", id));
    }
  };

  const gastosFiltrados = filtroCuenta === "todas" ? gastos : gastos.filter(g => g.cuenta_id === filtroCuenta);
  const totalGastos = gastosFiltrados.reduce((s, g) => s + Number(g.monto), 0);
  const gastosEsteMes = gastos.filter(g => g.fecha && g.fecha.startsWith(new Date().toISOString().substring(0, 7)));
  const totalEsteMes = gastosEsteMes.reduce((s, g) => s + Number(g.monto), 0);

  const getNombreCuenta = (id) => {
    if (id === "efectivo") return { nombre: "Efectivo", color: "#FFB547", bg: "#2A2000" };
    const c = cuentas.find(c => c.id === id);
    return c ? { nombre: `${c.nombre}`, color: "#4E8CFF", bg: "#0D1A2E" } : { nombre: id, color: "#4E6080", bg: "#141A28" };
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const [y, m, d] = fecha.split("-");
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d} ${meses[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div style={{ padding: "28px" }}>
      {modalNuevo && <ModalGasto onClose={() => setModalNuevo(false)} onSave={agregar} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5" }}>Gastos</div>
          <div style={{ fontSize: 12, color: "#3A5070", marginTop: 2 }}>{gastos.length} gasto{gastos.length !== 1 ? "s" : ""} registrado{gastos.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => setModalNuevo(true)} style={{ background: "linear-gradient(135deg, #FF5C5C, #FF8C5C)", border: "none", borderRadius: 8, color: "#fff", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Nuevo gasto
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total gastos", `-$${totalGastos.toLocaleString()}`, "#FF5C5C"],
          ["Este mes", `-$${totalEsteMes.toLocaleString()}`, "#FFB547"],
          ["Movimientos", gastos.length, "#4E8CFF"],
        ].map(([l, v, c], i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 10, padding: "14px 16px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: i === 2 ? 22 : 18, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filtro por cuenta */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setFiltroCuenta("todas")} style={{ background: filtroCuenta === "todas" ? "#1A2535" : "none", border: `1px solid ${filtroCuenta === "todas" ? "#4E8CFF" : "#1E2740"}`, borderRadius: 20, color: filtroCuenta === "todas" ? "#4E8CFF" : "#4E6080", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Todas las cuentas
        </button>
        {cuentas.map(c => (
          <button key={c.id} onClick={() => setFiltroCuenta(c.id)} style={{ background: filtroCuenta === c.id ? "#1A2535" : "none", border: `1px solid ${filtroCuenta === c.id ? "#4E8CFF" : "#1E2740"}`, borderRadius: 20, color: filtroCuenta === c.id ? "#4E8CFF" : "#4E6080", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {c.id === "efectivo" ? "Efectivo" : c.nombre}
          </button>
        ))}
      </div>

      {gastosFiltrados.length === 0 ? (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "60px", textAlign: "center", color: "#3A5070" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>No hay gastos registrados</div>
          <div style={{ fontSize: 12 }}>Haz clic en "Nuevo gasto" para agregar el primero</div>
        </div>
      ) : (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#080C14" }}>
                {["Fecha", "Concepto", "Cuenta", "Salida", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: h === "Salida" ? "right" : "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map((g, i) => {
                const cuenta = getNombreCuenta(g.cuenta_id);
                return (
                  <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{formatFecha(g.fecha)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#C8D8F0" }}>{g.concepto}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: cuenta.bg, color: cuenta.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{cuenta.nombre}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "#FF5C5C", textAlign: "right" }}>-${Number(g.monto).toLocaleString()}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button onClick={() => borrar(g.id)} style={{ background: "none", border: "none", color: "#3A5070", cursor: "pointer", fontSize: 12 }}>Borrar</button>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "1px solid #1E2740", background: "#2E0D0D" }}>
                <td colSpan={3} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#FF5C5C" }}>Total</td>
                <td style={{ padding: "12px 16px", fontSize: 15, fontWeight: 800, color: "#FF5C5C", textAlign: "right" }}>-${totalGastos.toLocaleString()}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
