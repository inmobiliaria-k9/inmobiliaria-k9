import { useState } from "react";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { MES_ACTUAL, TODOS_LOS_MESES, estadoPagoAutomatico, getPagoKey, inmuebles, pagoConfig } from "./utils";
import { Badge } from "./Badge";

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

function RegistrarPagoModal({ inquilino, mes, monto, onClose, onSave }) {
  const fechaHoy = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ fecha: fechaHoy, monto: monto, metodo: "Transferencia", notas: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 420 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>✅ Registrar pago</div>
            <div style={{ fontSize: 12, color: "#4E6080", marginTop: 2 }}>{inquilino} · {mes}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {[
            { label: "Monto pagado ($)", key: "monto", type: "number" },
            { label: "Fecha de pago", key: "fecha", type: "date" },
            { label: "Notas (opcional)", key: "notas", type: "text", placeholder: "Referencia..." },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>{label}</label>
              <input value={form[key]} onChange={e => set(key, e.target.value)} type={type} placeholder={placeholder}
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Método de pago</label>
            <select value={form.metodo} onChange={e => set("metodo", e.target.value)}
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
              {["Transferencia", "Efectivo", "Cheque", "Depósito", "Otro"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => { onSave({ ...form, estado: "pagado" }); onClose(); }} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✅ Confirmar pago</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EstadosCuenta({ naves, pagos }) {
  const [mesFiltro, setMesFiltro] = useState(MES_ACTUAL);
  const [registrando, setRegistrando] = useState(null);
  const [mesVisible, setMesVisible] = useState(Math.max(0, TODOS_LOS_MESES.length - 4));

  const mesesVisibles = TODOS_LOS_MESES.slice(mesVisible, mesVisible + 4);
  const inquilinos = getInquilinos(naves);

  const registrarPago = async (empresa, mes, data) => {
    const key = getPagoKey(empresa, mes);
    await setDoc(doc(db, "pagos", key), { empresa, mes, ...data });
  };

  const pagosDeMes = inquilinos.map(inq => {
    const key = getPagoKey(inq.empresa, mesFiltro);
    const pagoDB = pagos[key];
    return { ...inq, pago: { estado: estadoPagoAutomatico(mesFiltro, pagoDB), ...pagoDB } };
  });

  const totalMes = pagosDeMes.reduce((s, i) => s + i.renta, 0);
  const cobradoMes = pagosDeMes.filter(i => i.pago.estado === "pagado").reduce((s, i) => s + i.renta, 0);

  return (
    <div style={{ padding: "28px" }}>
      {registrando && (
        <RegistrarPagoModal inquilino={registrando.empresa} mes={mesFiltro} monto={registrando.renta}
          onClose={() => setRegistrando(null)} onSave={(data) => registrarPago(registrando.empresa, mesFiltro, data)} />
      )}

      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>💳 Estados de Cuenta</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>
        Mes actual: <span style={{ color: "#4E8CFF", fontWeight: 600 }}>{MES_ACTUAL}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setMesVisible(Math.max(0, mesVisible - 1))} disabled={mesVisible === 0}
          style={{ background: "#0F1520", border: "1px solid #1E2740", borderRadius: 8, color: mesVisible === 0 ? "#2A3A50" : "#4E8CFF", padding: "8px 14px", cursor: mesVisible === 0 ? "default" : "pointer", fontSize: 16 }}>◀</button>
        <div style={{ display: "flex", gap: 8, flex: 1 }}>
          {mesesVisibles.map(m => (
            <button key={m} onClick={() => setMesFiltro(m)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${mesFiltro === m ? "#4E8CFF" : m === MES_ACTUAL ? "#00C89644" : "#1E2740"}`, background: mesFiltro === m ? "#0D1A2E" : "#0F1520", color: mesFiltro === m ? "#4E8CFF" : m === MES_ACTUAL ? "#00C896" : "#4E6080", fontSize: 12, fontWeight: mesFiltro === m ? 700 : 400, cursor: "pointer" }}>{m}</button>
          ))}
        </div>
        <button onClick={() => setMesVisible(Math.min(TODOS_LOS_MESES.length - 4, mesVisible + 1))} disabled={mesVisible >= TODOS_LOS_MESES.length - 4}
          style={{ background: "#0F1520", border: "1px solid #1E2740", borderRadius: 8, color: mesVisible >= TODOS_LOS_MESES.length - 4 ? "#2A3A50" : "#4E8CFF", padding: "8px 14px", cursor: mesVisible >= TODOS_LOS_MESES.length - 4 ? "default" : "pointer", fontSize: 16 }}>▶</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total a cobrar", `$${totalMes.toLocaleString()}`, "#E8EDF5"],
          ["Cobrado", `$${cobradoMes.toLocaleString()}`, "#00C896"],
          ["Pendiente", `$${(totalMes - cobradoMes).toLocaleString()}`, totalMes - cobradoMes > 0 ? "#FF5C5C" : "#00C896"],
        ].map(([l, v, c], i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 10, padding: "14px 16px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {inquilinos.length === 0 ? (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "60px", textAlign: "center", color: "#3A5070" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
          <div>No hay naves rentadas aún</div>
        </div>
      ) : (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#080C14" }}>
                {["Inquilino", "Naves", "Renta mensual", `Estado ${mesFiltro}`, "Acción"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", fontSize: 11, color: "#3A5070", textAlign: "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagosDeMes.map((inq, i) => (
                <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #4E8CFF, #00C896)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>{inq.empresa[0]}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#C8D8F0" }}>{inq.empresa}</div>
                        {inq.pago.fecha && <div style={{ fontSize: 11, color: "#3A5070" }}>Pagó: {inq.pago.fecha}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {inq.naves.map((n, j) => <div key={j} style={{ fontSize: 11, color: "#4E6080" }}>🏗️ {n.inmueble} — {n.nombre}</div>)}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: "#00C896" }}>${inq.renta.toLocaleString()}</td>
                  <td style={{ padding: "14px 16px" }}><Badge estado={inq.pago.estado} tipo="pago" /></td>
                  <td style={{ padding: "14px 16px" }}>
                    {inq.pago.estado !== "pagado" && inq.pago.estado !== "futuro" ? (
                      <button onClick={() => setRegistrando(inq)} style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 8, color: "#00C896", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        ✅ Registrar pago
                      </button>
                    ) : inq.pago.estado === "pagado" ? (
                      <span style={{ fontSize: 12, color: "#3A5070" }}>✓ {inq.pago.metodo}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
