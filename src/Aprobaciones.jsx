import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, doc, deleteDoc, setDoc, addDoc, updateDoc } from "firebase/firestore";
import { registrarAuditoria } from "./auditoria";

export default function Aprobaciones() {
  const [pendientes, setPendientes] = useState([]);
  const [confirmRechazo, setConfirmRechazo] = useState(null);
  const [notaRechazo, setNotaRechazo] = useState("");
  const [procesando, setProcesando] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pendientes"), snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (a.fecha_captura || "") > (b.fecha_captura || "") ? -1 : 1);
      setPendientes(lista);
    });
    return () => unsub();
  }, []);

  const aprobar = async (item) => {
    setProcesando(item.id);
    try {
      if (item.tipo_movimiento === "pago") {
        // Mover a colección pagos
        const key = `${item.empresa.replace(/\s+/g, "_")}__${item.mes.replace(/\s+/g, "_")}`;
        await setDoc(doc(db, "pagos", key), {
          empresa: item.empresa,
          mes: item.mes,
          estado: item.estado,
          fecha: item.fecha,
          monto: item.monto,
          monto_base: item.monto_base,
          metodo: item.metodo,
          cuenta_id: item.cuenta_id,
          cuenta_nombre: item.cuenta_nombre,
          aplica_iva: item.aplica_iva,
          pct_iva: item.pct_iva,
          aplica_ret_iva: item.aplica_ret_iva,
          pct_ret_iva: item.pct_ret_iva,
          aplica_ret_isr: item.aplica_ret_isr,
          pct_ret_isr: item.pct_ret_isr,
          iva: item.iva,
          ret_iva: item.ret_iva,
          ret_isr: item.ret_isr,
          total_factura: item.total_factura,
          notas: item.notas || "",
          aprobado: true,
        });
      } else if (item.tipo_movimiento === "gasto") {
        // Mover a colección gastos
        await addDoc(collection(db, "gastos"), {
          concepto: item.concepto,
          monto: item.monto,
          fecha: item.fecha,
          cuenta_id: item.cuenta_id,
          cuenta_nombre: item.cuenta_nombre,
          tipo: "gasto",
          aprobado: true,
        });
      }
      // Borrar de pendientes
      await deleteDoc(doc(db, "pendientes", item.id));
      await registrarAuditoria({
        tipo: "aprobacion",
        modulo: item.tipo_movimiento === "pago" ? "pagos" : "gastos",
        descripcion: item.tipo_movimiento === "pago"
          ? `Pago aprobado: ${item.empresa} — ${item.mes} — $${Number(item.monto_base || 0).toLocaleString()}`
          : `Gasto aprobado: ${item.concepto} — $${Number(item.monto || 0).toLocaleString()}`,
        detalle: { monto: item.monto, cuenta: item.cuenta_nombre },
      });
    } catch (e) {
      console.error("Error aprobando:", e);
      alert("Error al aprobar. Intenta de nuevo.");
    }
    setProcesando(null);
  };

  const rechazar = async (item, nota) => {
    await deleteDoc(doc(db, "pendientes", item.id));
    await registrarAuditoria({
      tipo: "rechazo",
      modulo: item.tipo_movimiento === "pago" ? "pagos" : "gastos",
      descripcion: item.tipo_movimiento === "pago"
        ? `Pago rechazado: ${item.empresa} — ${item.mes}`
        : `Gasto rechazado: ${item.concepto}`,
      detalle: nota ? { motivo: nota } : null,
    });
    setConfirmRechazo(null);
    setNotaRechazo("");
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const [y, m, d] = fecha.split("-");
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d} ${meses[parseInt(m) - 1]} ${y}`;
  };

  const fmt = n => `$${Math.round(Number(n) || 0).toLocaleString()}`;

  const pagosPendientes = pendientes.filter(p => p.tipo_movimiento === "pago");
  const gastosPendientes = pendientes.filter(p => p.tipo_movimiento === "gasto");

  return (
    <div style={{ padding: "28px" }}>

      {/* Modal rechazo */}
      {confirmRechazo && (
        <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 400, padding: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginBottom: 8 }}>Rechazar movimiento</div>
            <div style={{ fontSize: 13, color: "#4E6080", marginBottom: 16 }}>
              {confirmRechazo.tipo_movimiento === "pago"
                ? `Pago de ${confirmRechazo.empresa} — ${confirmRechazo.mes}`
                : `Gasto: ${confirmRechazo.concepto}`}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 6, fontWeight: 600 }}>Motivo del rechazo (opcional)</label>
              <input value={notaRechazo} onChange={e => setNotaRechazo(e.target.value)} placeholder="Ej. Monto incorrecto, duplicado..."
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setConfirmRechazo(null); setNotaRechazo(""); }} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => rechazar(confirmRechazo, notaRechazo)} style={{ flex: 1, background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 8, color: "#FF5C5C", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Rechazar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5" }}>Aprobaciones</div>
          <div style={{ fontSize: 12, color: "#3A5070", marginTop: 2 }}>
            {pendientes.length > 0
              ? <span style={{ color: "#FFB547", fontWeight: 600 }}>{pendientes.length} movimiento{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""} de aprobacion</span>
              : <span style={{ color: "#00C896" }}>Todo al dia — no hay movimientos pendientes</span>
            }
          </div>
        </div>
      </div>

      {pendientes.length === 0 ? (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "60px", textAlign: "center", color: "#3A5070" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>No hay movimientos pendientes</div>
          <div style={{ fontSize: 12 }}>Cuando el capturista registre pagos o gastos apareceran aqui</div>
        </div>
      ) : (
        <>
          {/* Pagos pendientes */}
          {pagosPendientes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0", marginBottom: 12 }}>
                Pagos pendientes ({pagosPendientes.length})
              </div>
              <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#080C14" }}>
                      {["Fecha captura", "Inquilino", "Periodo", "Monto base", "Entra a cuenta", "Cuenta", "Acciones"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagosPendientes.map((p, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{formatFecha(p.fecha_captura?.split("T")[0])}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#C8D8F0" }}>{p.empresa}</td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{p.mes}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#C8D8F0" }}>{fmt(p.monto_base)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#00C896" }}>{fmt(p.monto)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 11, color: "#4E6080" }}>{p.cuenta_nombre || "-"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => aprobar(p)}
                              disabled={procesando === p.id}
                              style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 6, color: "#00C896", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              {procesando === p.id ? "..." : "Aprobar"}
                            </button>
                            <button onClick={() => setConfirmRechazo(p)} style={{ background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 6, color: "#FF5C5C", padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Rechazar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gastos pendientes */}
          {gastosPendientes.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0", marginBottom: 12 }}>
                Gastos pendientes ({gastosPendientes.length})
              </div>
              <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#080C14" }}>
                      {["Fecha captura", "Concepto", "Fecha gasto", "Monto", "Cuenta", "Acciones"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gastosPendientes.map((g, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{formatFecha(g.fecha_captura?.split("T")[0])}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#C8D8F0" }}>{g.concepto}</td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{formatFecha(g.fecha)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#FF5C5C" }}>-{fmt(g.monto)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 11, color: "#4E6080" }}>{g.cuenta_nombre || "-"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => aprobar(g)}
                              disabled={procesando === g.id}
                              style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 6, color: "#00C896", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              {procesando === g.id ? "..." : "Aprobar"}
                            </button>
                            <button onClick={() => setConfirmRechazo(g)} style={{ background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 6, color: "#FF5C5C", padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Rechazar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
