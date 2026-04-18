import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { MES_ACTUAL, TODOS_LOS_MESES, estadoPagoAutomatico, getPagoKey } from "./utils";

function getInquilinos(naves, inmuebles) {
  return Object.values(
    inmuebles.flatMap(inm =>
      naves.filter(n => n.inmueble_id === inm.id && n.inquilino && n.inquilino.trim() !== "" && Number(n.renta) > 0)
        .map(n => ({ ...n, inmueble: inm.nombre }))
    ).reduce((acc, nave) => {
      const key = nave.inquilino;
      if (!acc[key]) acc[key] = { empresa: nave.inquilino, naves: [], renta: 0 };
      acc[key].naves.push(nave);
      acc[key].renta += Number(nave.renta);
      return acc;
    }, {})
  );
}

const cellConfig = {
  pagado:   { bg: "#0D2E1F", color: "#00C896", simbolo: "v" },
  parcial:  { bg: "#0D1A2E", color: "#4E8CFF", simbolo: "$" },
  pendiente:{ bg: "#2A2000", color: "#FFB547", simbolo: "!" },
  vencido:  { bg: "#2E0D0D", color: "#FF5C5C", simbolo: "x" },
  futuro:   { bg: "transparent", color: "#2A3A50", simbolo: "-" },
};

const leyenda = [
  { s: "v", bg: "#0D2E1F", c: "#00C896", l: "Pagado" },
  { s: "$", bg: "#0D1A2E", c: "#4E8CFF", l: "Abono parcial" },
  { s: "!", bg: "#2A2000", c: "#FFB547", l: "Pendiente" },
  { s: "x", bg: "#2E0D0D", c: "#FF5C5C", l: "Vencido" },
  { s: "-", bg: "transparent", c: "#2A3A50", l: "Futuro" },
];

export default function ResumenAnual({ naves, pagos }) {
  const [inmuebles, setInmuebles] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inmuebles"), snap => {
      setInmuebles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const inquilinos = getInquilinos(naves, inmuebles);

  const registrarPago = async (empresa, mes, renta) => {
    const key = getPagoKey(empresa, mes);
    const fechaHoy = new Date().toISOString().split("T")[0];
    await setDoc(doc(db, "pagos", key), {
      empresa, mes, estado: "pagado",
      fecha: fechaHoy, monto: renta, monto_base: renta, metodo: "Transferencia"
    });
  };

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>Resumen Anual de Pagos</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>
        Mes actual: <span style={{ color: "#4E8CFF", fontWeight: 600 }}>{MES_ACTUAL}</span>
      </div>

      {inquilinos.length === 0 ? (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "60px", textAlign: "center", color: "#3A5070" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div>No hay inquilinos registrados aun</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "#080C14" }}>
                <th style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: "left", fontWeight: 600, textTransform: "uppercase", whiteSpace: "nowrap", position: "sticky", left: 0, background: "#080C14", zIndex: 2 }}>Inquilino</th>
                <th style={{ padding: "10px 12px", fontSize: 11, color: "#3A5070", textAlign: "right", fontWeight: 600, textTransform: "uppercase", whiteSpace: "nowrap" }}>Renta/mes</th>
                {TODOS_LOS_MESES.map(m => (
                  <th key={m} style={{ padding: "10px 8px", fontSize: 10, color: m === MES_ACTUAL ? "#4E8CFF" : "#3A5070", textAlign: "center", fontWeight: m === MES_ACTUAL ? 700 : 600, whiteSpace: "nowrap", minWidth: 52, borderLeft: m === MES_ACTUAL ? "1px solid #4E8CFF44" : "none" }}>
                    {m.split(" ")[0].substring(0, 3)}<br />{m.split(" ")[1]}
                  </th>
                ))}
                <th style={{ padding: "10px 12px", fontSize: 11, color: "#3A5070", textAlign: "center", fontWeight: 600 }}>Adeudo</th>
              </tr>
            </thead>
            <tbody>
              {inquilinos.map((inq, i) => {
                let mesesVencidos = 0;
                return (
                  <tr key={i} style={{ borderTop: "1px solid #141A28" }}>
                    <td style={{ padding: "12px 16px", position: "sticky", left: 0, background: "#0F1520", zIndex: 1, whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#C8D8F0" }}>{inq.empresa}</div>
                      <div style={{ fontSize: 11, color: "#3A5070" }}>{inq.naves.map(n => n.nombre).join(", ")}</div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: "#00C896", textAlign: "right", whiteSpace: "nowrap" }}>${inq.renta.toLocaleString()}</td>
                    {TODOS_LOS_MESES.map(mes => {
                      const key = getPagoKey(inq.empresa, mes);
                      const pagoDB = pagos[key];
                      const estado = estadoPagoAutomatico(mes, pagoDB, inq.renta);
                      if (estado === "vencido") mesesVencidos++;
                      const c = cellConfig[estado] || cellConfig.futuro;
                      const puedeRegistrar = estado === "vencido" || estado === "pendiente" || estado === "parcial";
                      const tooltip = estado === "parcial" && pagoDB?.monto_base
                        ? `Abonado: $${Number(pagoDB.monto_base).toLocaleString()} de $${inq.renta.toLocaleString()}`
                        : puedeRegistrar ? "Clic para marcar como pagado" : "";
                      return (
                        <td key={mes} style={{ padding: "8px 4px", textAlign: "center", borderLeft: mes === MES_ACTUAL ? "1px solid #4E8CFF44" : "none" }}>
                          <span
                            onClick={() => puedeRegistrar && registrarPago(inq.empresa, mes, inq.renta)}
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 4, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color, cursor: puedeRegistrar ? "pointer" : "default" }}
                            title={tooltip}>
                            {c.simbolo}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {mesesVencidos > 0 ? (
                        <span style={{ background: "#2E0D0D", color: "#FF5C5C", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{mesesVencidos} mes{mesesVencidos > 1 ? "es" : ""}</span>
                      ) : (
                        <span style={{ color: "#00C896", fontSize: 12 }}>Al corriente</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 12, color: "#4E6080", flexWrap: "wrap" }}>
        {leyenda.map(item => (
          <span key={item.l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 18, borderRadius: 3, fontSize: 11, fontWeight: 700, background: item.bg, color: item.c }}>{item.s}</span>
            {item.l}
          </span>
        ))}
      </div>
    </div>
  );
}
