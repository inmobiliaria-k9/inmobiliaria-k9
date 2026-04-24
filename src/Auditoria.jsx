import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";

const tipoConfig = {
  alta:       { color: "#00C896", bg: "#0D2E1F", label: "Alta" },
  edicion:    { color: "#4E8CFF", bg: "#0D1A2E", label: "Edicion" },
  borrado:    { color: "#FF5C5C", bg: "#2E0D0D", label: "Borrado" },
  aprobacion: { color: "#00C896", bg: "#0D2E1F", label: "Aprobado" },
  rechazo:    { color: "#FFB547", bg: "#2A2000", label: "Rechazado" },
  pago:       { color: "#00C896", bg: "#0D2E1F", label: "Pago" },
  gasto:      { color: "#FF5C5C", bg: "#2E0D0D", label: "Gasto" },
  login:      { color: "#4E8CFF", bg: "#0D1A2E", label: "Acceso" },
};

const moduloIcono = {
  inquilinos: "👥",
  naves: "🏗️",
  inmuebles: "🏭",
  propietarios: "🏢",
  pagos: "💳",
  gastos: "📋",
  aprobaciones: "✅",
  sistema: "⚙️",
};

export default function Auditoria() {
  const [registros, setRegistros] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const q = query(collection(db, "auditoria"), orderBy("fecha", "desc"), limit(500));
    const unsub = onSnapshot(q, snap => {
      setRegistros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const d = new Date(fecha);
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  const modulos = ["todos", ...new Set(registros.map(r => r.modulo).filter(Boolean))];
  const tipos = ["todos", ...new Set(registros.map(r => r.tipo).filter(Boolean))];

  const filtrados = registros.filter(r => {
    if (filtroModulo !== "todos" && r.modulo !== filtroModulo) return false;
    if (filtroTipo !== "todos" && r.tipo !== filtroTipo) return false;
    if (busqueda && !JSON.stringify(r).toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5" }}>Bitacora de Auditoria</div>
          <div style={{ fontSize: 12, color: "#3A5070", marginTop: 2 }}>
            {registros.length} registro{registros.length !== 1 ? "s" : ""} — todo lo que pasa en el sistema
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..."
          style={{ flex: 1, minWidth: 200, background: "#0F1520", border: "1px solid #1E2740", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }} />
        <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)}
          style={{ background: "#0F1520", border: "1px solid #1E2740", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
          {modulos.map(m => <option key={m} value={m}>{m === "todos" ? "Todos los modulos" : m}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ background: "#0F1520", border: "1px solid #1E2740", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
          {tipos.map(t => <option key={t} value={t}>{t === "todos" ? "Todos los tipos" : t}</option>)}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "60px", textAlign: "center", color: "#3A5070" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>No hay registros aun</div>
          <div style={{ fontSize: 12 }}>Cada accion en el sistema quedara registrada aqui</div>
        </div>
      ) : (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#080C14" }}>
                {["Fecha", "Tipo", "Modulo", "Descripcion", "Usuario", "Detalle"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r, i) => {
                const tc = tipoConfig[r.tipo] || { color: "#4E6080", bg: "#141A28", label: r.tipo };
                const icono = moduloIcono[r.modulo] || "📋";
                return (
                  <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "11px 16px", fontSize: 11, color: "#4E6080", whiteSpace: "nowrap" }}>{formatFecha(r.fecha)}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ background: tc.bg, color: tc.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{tc.label}</span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#4E6080" }}>{icono} {r.modulo}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, color: "#C8D8F0", fontWeight: 500, maxWidth: 300 }}>{r.descripcion}</td>
                    <td style={{ padding: "11px 16px", fontSize: 11, color: "#4E6080" }}>{r.usuario || "Sistema"}</td>
                    <td style={{ padding: "11px 16px", fontSize: 11, color: "#3A5070", maxWidth: 200 }}>
                      {r.detalle && (
                        <div style={{ background: "#0A0E17", borderRadius: 6, padding: "4px 8px", fontFamily: "monospace", fontSize: 10 }}>
                          {typeof r.detalle === "string" ? r.detalle : JSON.stringify(r.detalle).substring(0, 100)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
