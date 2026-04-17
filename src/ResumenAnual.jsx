import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  MES_ACTUAL, TODOS_LOS_MESES, estadoPagoAutomatico,
  getPagoKey, inmuebles
} from "./utils";

function getInquilinos(naves) {
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

const cellStyle = (estado) => {
  const colores = {
    pagado:   { bg: "#0D2E1F", color: "#00C896" },
    pendiente:{ bg: "#2A2000", color: "#FFB547" },
    vencido:  { bg: "#2E0D0D", color: "#FF5C5C" },
    futuro:   { bg: "transparent", color: "#2A3A50" },
  };
  return colores[estado] || colores.futuro;
};

const simbolo = { pagado: "✓", pendiente: "!", vencido: "✗", futuro: "—" };

export default function ResumenAnual({ naves, pagos }) {
  const inquilinos = getInquilinos(naves);

  const registrarPago = async (empresa, mes) => {
    const renta = inquilinos.find(i => i.empresa === empresa)?.renta || 0;
    const key = getPagoKey(empresa, mes);
    const fechaHoy = new Date().toISOString().split("T")[0];
    await setDoc(doc(db, "pagos", key), {
      empresa, mes, estado: "pagado",
      fecha: fechaHoy, monto: renta, metodo: "Transferencia"
    });
  };

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>📊 Resumen Anual de Pagos</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>
        Mes actual: <span style={{ color: "#4E8CFF", fontWeight: 600 }}>{MES_ACTUAL}</span> · Haz clic en ✗ o ! para registrar pago
      </div>

      {inquilinos.length === 0 ? (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "60px", textAlign: "center", color: "#3A5070" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div>No hay inquilinos registrados aún</div>
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
                      const estado = estadoPagoAutomatico(mes, pagoDB);
                      if (estado === "vencido") mesesVencidos++;
                      const c = cellStyle(estado);
                      const puedeRegistrar = estado === "vencido" || estado === "pendiente";
                      return (
                        <td key={mes} style={{ padding: "8px 4px", textAlign: "center", borderLeft: mes === MES_ACTUAL ? "1px solid #4E8CFF44" : "none" }}>
                          <span
                            onClick={() => puedeRegistrar && registrarPago(inq.empresa, mes)}
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 4, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color, cursor: puedeRegistrar ? "pointer" : "default" }}
                            title={puedeRegistrar ? "Clic para marcar como pagado" : ""}>
                            {simbolo[estado]}
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
        {[["✓","#0D2E1F","#00C896","Pagado"],["!","#2A2000","#FFB547","Pendiente (mes actual)"],["✗","#2E0D0D","#FF5C5C","Vencido (clic para pagar)"],["—","transparent","#2A3A50","Mes futuro"]].map(([s,bg,c,l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 18, borderRadius: 3, fontSize: 11, fontWeight: 700, background: bg, color: c }}>{s}</span>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
