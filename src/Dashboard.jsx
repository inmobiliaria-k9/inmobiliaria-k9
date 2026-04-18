import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { MES_ACTUAL, getPagoKey } from "./utils";

function calcularEstado(nave) {
  if (nave.mantenimiento) return "mantenimiento";
  if (nave.inquilino && nave.inquilino.trim() !== "" && Number(nave.renta) > 0) return "rentada";
  return "disponible";
}

export default function Dashboard({ naves, pagos }) {
  const [inmuebles, setInmuebles] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inmuebles"), snap => {
      setInmuebles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const rentadas = naves.filter(n => calcularEstado(n) === "rentada").length;
  const rentaTotal = naves.reduce((s, n) => s + Number(n.renta), 0);
  const inquilinos = [...new Set(naves.filter(n => n.inquilino).map(n => n.inquilino))];
  const pendientesMes = inquilinos.filter(emp => {
    const key = getPagoKey(emp, MES_ACTUAL);
    const p = pagos[key];
    return !p || p.estado !== "pagado";
  }).length;

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 2 }}>Dashboard</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 24 }}>
        Mes actual: <span style={{ color: "#4E8CFF", fontWeight: 600 }}>{MES_ACTUAL}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total naves", value: naves.length, color: "#4E8CFF", icon: "🏗️" },
          { label: "Rentadas", value: rentadas, color: "#00C896", icon: "✅" },
          { label: "Renta mensual", value: rentaTotal > 0 ? `$${rentaTotal.toLocaleString()}` : "Por definir", color: "#00C896", icon: "💰" },
          { label: `Pendientes ${MES_ACTUAL}`, value: pendientesMes, color: pendientesMes > 0 ? "#FF5C5C" : "#00C896", icon: "⚠️" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 14, padding: "20px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: i === 2 ? 16 : 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#4E6080", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0", marginBottom: 16 }}>🏭 Inmuebles</div>
        {inmuebles.length === 0 ? (
          <div style={{ color: "#3A5070", fontSize: 13 }}>Cargando inmuebles...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {inmuebles.map(inm => {
              const navesInm = naves.filter(n => n.inmueble_id === inm.id);
              const rentadasInm = navesInm.filter(n => calcularEstado(n) === "rentada").length;
              const rentaInm = navesInm.reduce((s, n) => s + Number(n.renta), 0);
              return (
                <div key={inm.id} style={{ background: "#0A0E17", borderRadius: 10, padding: "14px", border: "1px solid #1E2740" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🏭</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#C8D8F0", marginBottom: 4 }}>{inm.nombre}</div>
                  <div style={{ fontSize: 12, color: "#3A5070" }}>{navesInm.length} naves · {rentadasInm} rentadas</div>
                  {rentaInm > 0 && <div style={{ fontSize: 12, color: "#00C896", marginTop: 4 }}>${rentaInm.toLocaleString()}/mes</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
