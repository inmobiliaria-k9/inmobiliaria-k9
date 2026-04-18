import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import {
  MES_ACTUAL, TODOS_LOS_MESES, estadoPagoAutomatico, getPagoKey
} from "./utils";
import { Badge } from "./Badge";

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

function getMesesDeuda(empresa, pagos) {
  return TODOS_LOS_MESES.filter(mes => {
    const key = getPagoKey(empresa, mes);
    const pagoDB = pagos[key];
    const estado = estadoPagoAutomatico(mes, pagoDB);
    return estado === "vencido" || estado === "pendiente";
  });
}

function RegistrarPagoModal({ inquilino, pagos, onClose, onSave }) {
  const fechaHoy = new Date().toISOString().split("T")[0];
  const [cuentas, setCuentas] = useState([]);
  const [form, setForm] = useState({
    fecha: fechaHoy, metodo: "Transferencia",
    cuenta_id: "", cuenta_nombre: "", notas: "",
    aplica_iva: true, pct_iva: 16,
    aplica_ret_iva: true, pct_ret_iva: 10.67,
    aplica_ret_isr: true, pct_ret_isr: 10,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const mesesDeuda = getMesesDeuda(inquilino.empresa, pagos);
  const mesAplicar = mesesDeuda[0] || MES_ACTUAL;
  const monto = inquilino.renta;

  useEffect(() => {
    const cargarCuentas = async () => {
      const snap = await getDocs(collection(db, "propietarios"));
      const lista = [];
      snap.docs.forEach(d => {
        const p = d.data();
        (p.cuentas || []).forEach((c, i) => {
          lista.push({ id: `${d.id}_${i}`, nombre: c.nombre || `Cuenta ${i + 1}`, banco: c.banco, propietario: p.nombre });
        });
      });
      setCuentas(lista);
      if (lista.length > 0) { set("cuenta_id", lista[0].id); set("cuenta_nombre", `${lista[0].nombre} — ${lista[0].banco}`); }
    };
    cargarCuentas();
  }, []);

  const seleccionarCuenta = (id) => {
    const c = cuentas.find(c => c.id === id);
    if (c) { set("cuenta_id", id); set("cuenta_nombre", `${c.nombre} — ${c.banco}`); }
  };

  const iva = form.aplica_iva ? monto * (form.pct_iva / 100) : 0;
  const totalFactura = monto + iva;
  const retIva = form.aplica_ret_iva ? monto * (form.pct_ret_iva / 100) : 0;
  const retIsr = form.aplica_ret_isr ? monto * (form.pct_ret_isr / 100) : 0;
  const montoNeto = totalFactura - retIva - retIsr;
  const fmt = n => `$${Math.round(n).toLocaleString()}`;

  const Toggle = ({ activo, onChange }) => (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: activo ? "#00C896" : "#1A2535", position: "relative", border: `1px solid ${activo ? "#00C896" : "#1E2740"}`, flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: activo ? 23 : 3, transition: "all 0.2s" }} />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 480, margin: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>✅ Registrar pago</div>
            <div style={{ fontSize: 12, color: "#4E6080", marginTop: 2 }}>{inquilino.empresa}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ background: "#0A0E17", borderRadius: 10, border: "1px solid #1E2740", padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 8, fontWeight: 600 }}>DEUDA PENDIENTE</div>
            {mesesDeuda.length === 0 ? (
              <div style={{ fontSize: 13, color: "#00C896" }}>✓ Al corriente</div>
            ) : mesesDeuda.map((mes, i) => (
              <div key={mes} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < mesesDeuda.length - 1 ? "1px solid #141A28" : "none" }}>
                <span style={{ fontSize: 12, color: i === 0 ? "#FFB547" : "#4E6080", fontWeight: i === 0 ? 700 : 400 }}>{i === 0 ? "→ " : ""}{mes}</span>
                <span style={{ fontSize: 12, color: i === 0 ? "#FF5C5C" : "#3A5070", fontWeight: 700 }}>${inquilino.renta.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#00C896", fontWeight: 600, marginBottom: 2 }}>APLICANDO PAGO A</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{mesAplicar}</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#00C896" }}>${monto.toLocaleString()}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Fecha de pago</label>
              <input value={form.fecha} onChange={e => set("fecha", e.target.value)} type="date"
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Método de pago</label>
              <select value={form.metodo} onChange={e => set("metodo", e.target.value)}
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
                {["Transferencia", "Efectivo", "Cheque", "Depósito", "Otro"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#00C896", marginBottom: 5, fontWeight: 600 }}>💰 Cuenta bancaria destino</label>
            {cuentas.length === 0 ? (
              <div style={{ background: "#2A2000", border: "1px solid #FFB54733", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#FFB547" }}>⚠️ No hay cuentas. Agrégalas en Propietarios.</div>
            ) : (
              <select value={form.cuenta_id} onChange={e => seleccionarCuenta(e.target.value)}
                style={{ width: "100%", background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#00C896", outline: "none", fontWeight: 600 }}>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.banco} ({c.propietario})</option>)}
              </select>
            )}
          </div>

          <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Impuestos y retenciones</div>
          {[
            { label: "IVA", sub: "Impuesto al valor agregado", ka: "aplica_iva", kp: "pct_iva" },
            { label: "Retención IVA", sub: "Retención de IVA", ka: "aplica_ret_iva", kp: "pct_ret_iva" },
            { label: "Retención ISR", sub: "Retención de ISR", ka: "aplica_ret_isr", kp: "pct_ret_isr" },
          ].map(({ label, sub, ka, kp }) => (
            <div key={ka} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: form[ka] ? "#0D2E1F" : "#0A0E17", borderRadius: 10, padding: "10px 14px", border: `1px solid ${form[ka] ? "#00C89633" : "#1E2740"}`, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Toggle activo={form[ka]} onChange={() => set(ka, !form[ka])} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{label}</div>
                  <div style={{ fontSize: 11, color: "#3A5070" }}>{sub}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input value={form[kp]} onChange={e => set(kp, e.target.value)} type="number" disabled={!form[ka]}
                  style={{ width: 60, background: "#0A0E17", border: `1px solid ${form[ka] ? "#00C89633" : "#1E2740"}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, color: form[ka] ? "#00C896" : "#3A5070", textAlign: "right", outline: "none" }} />
                <span style={{ fontSize: 13, color: form[ka] ? "#00C896" : "#3A5070", fontWeight: 600 }}>%</span>
              </div>
            </div>
          ))}

          <div style={{ background: "#0A0E17", borderRadius: 10, border: "1px solid #1E2740", padding: "14px", marginTop: 4, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#4E6080", fontWeight: 700, marginBottom: 10 }}>CÁLCULO</div>
            {[
              ["Renta base", fmt(monto), "#4E6080"],
              form.aplica_iva && [`+ IVA ${form.pct_iva}%`, `+${fmt(iva)}`, "#4E8CFF"],
              ["Total factura", fmt(totalFactura), "#C8D8F0"],
              form.aplica_ret_iva && [`- Ret. IVA ${form.pct_ret_iva}%`, `-${fmt(retIva)}`, "#FF5C5C"],
              form.aplica_ret_isr && [`- Ret. ISR ${form.pct_ret_isr}%`, `-${fmt(retIsr)}`, "#FF5C5C"],
            ].filter(Boolean).map(([l, v, c], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #141A28" }}>
                <span style={{ color: "#4E6080" }}>{l}</span>
                <span style={{ color: c, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 0 0", marginTop: 4 }}>
              <span style={{ color: "#00C896", fontWeight: 700 }}>💰 Entra a tu cuenta</span>
              <span style={{ color: "#00C896", fontWeight: 800 }}>{fmt(montoNeto)}</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Notas (opcional)</label>
            <input value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Referencia, observaciones..."
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => {
              onSave({ mes: mesAplicar, ...form, estado: "pagado", monto: montoNeto, monto_base: monto, iva: Math.round(iva), ret_iva: Math.round(retIva), ret_isr: Math.round(retIsr), total_factura: Math.round(totalFactura) });
              onClose();
            }} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ✅ Confirmar pago
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CuentasPorCobrar({ naves, pagos }) {
  const [registrando, setRegistrando] = useState(null);
  const [mesFiltro, setMesFiltro] = useState(MES_ACTUAL);
  const [mesVisible, setMesVisible] = useState(Math.max(0, TODOS_LOS_MESES.length - 4));
  const [inmuebles, setInmuebles] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inmuebles"), snap => {
      setInmuebles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const mesesVisibles = TODOS_LOS_MESES.slice(mesVisible, mesVisible + 4);
  const inquilinos = getInquilinos(naves, inmuebles);

  const registrarPago = async (empresa, data) => {
    const key = getPagoKey(empresa, data.mes);
    await setDoc(doc(db, "pagos", key), { empresa, ...data });
  };

  const pagosDeMes = inquilinos.map(inq => {
    const key = getPagoKey(inq.empresa, mesFiltro);
    const pagoDB = pagos[key];
    return { ...inq, pago: { estado: estadoPagoAutomatico(mesFiltro, pagoDB), ...pagoDB } };
  });

  const totalMes = pagosDeMes.reduce((s, i) => s + i.renta, 0);
  const cobradoMes = pagosDeMes.filter(i => i.pago.estado === "pagado").reduce((s, i) => s + (i.pago.monto_base || i.renta), 0);

  const inquilinosConDeuda = inquilinos.map(inq => {
    const mesesDeuda = getMesesDeuda(inq.empresa, pagos);
    return { ...inq, mesesDeuda, mesOldest: mesesDeuda[0] };
  });

  return (
    <div style={{ padding: "28px" }}>
      {registrando && (
        <RegistrarPagoModal inquilino={registrando} pagos={pagos} onClose={() => setRegistrando(null)} onSave={(data) => registrarPago(registrando.empresa, data)} />
      )}

      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>💳 Cuentas por Cobrar</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>
        Mes actual: <span style={{ color: "#4E8CFF", fontWeight: 600 }}>{MES_ACTUAL}</span>
      </div>

      <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0" }}>Estado de cuenta por inquilino</div>
          <div style={{ fontSize: 12, color: "#3A5070" }}>El pago se aplica al mes más antiguo automáticamente</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#080C14" }}>
              {["Inquilino", "Mes más antiguo", "Meses vencidos", "Total adeudo", "Acción"].map(h => (
                <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inquilinosConDeuda.map((inq, i) => (
              <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #4E8CFF, #00C896)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>{inq.empresa[0]}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#C8D8F0" }}>{inq.empresa}</div>
                      <div style={{ fontSize: 11, color: "#3A5070" }}>${inq.renta.toLocaleString()}/mes</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {inq.mesOldest ? (
                    <span style={{ background: "#2E0D0D", color: "#FF5C5C", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{inq.mesOldest}</span>
                  ) : (
                    <span style={{ color: "#00C896", fontSize: 12 }}>✓ Al corriente</span>
                  )}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: inq.mesesDeuda.length > 0 ? "#FF5C5C" : "#00C896" }}>
                  {inq.mesesDeuda.length > 0 ? inq.mesesDeuda.length : "—"}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: inq.mesesDeuda.length > 0 ? "#FF5C5C" : "#00C896" }}>
                  {inq.mesesDeuda.length > 0 ? `$${(inq.renta * inq.mesesDeuda.length).toLocaleString()}` : "—"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {inq.mesesDeuda.length > 0 ? (
                    <button onClick={() => setRegistrando(inq)} style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 8, color: "#00C896", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      ✅ Registrar pago
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "#3A5070" }}>Al corriente ✓</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0", marginBottom: 12 }}>Vista por mes</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
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
    </div>
  );
}
