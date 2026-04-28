import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, deleteDoc, updateDoc, addDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { registrarAuditoria } from "./auditoria";
import { MES_ACTUAL, TODOS_LOS_MESES, estadoPagoAutomatico, getPagoKey } from "./utils";
import { Badge } from "./Badge";

const CUENTA_EFECTIVO = { id: "efectivo", nombre: "Efectivo", banco: "Caja general", propietario: "General" };

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

function getMesesDeuda(empresa, pagos, renta) {
  return TODOS_LOS_MESES.filter(mes => {
    const key = getPagoKey(empresa, mes);
    const pagoDB = pagos[key];
    const estado = estadoPagoAutomatico(mes, pagoDB, renta);
    return estado === "vencido" || estado === "pendiente" || estado === "parcial";
  });
}

function getSaldoPendiente(pagoDB, renta) {
  if (!pagoDB) return renta;
  if (pagoDB.estado === "pagado") return 0;
  if (pagoDB.monto_base) return Math.max(0, renta - Number(pagoDB.monto_base));
  return renta;
}

function cargarCuentas(setCuentas) {
  return getDocs(collection(db, "propietarios")).then(snap => {
    const lista = [CUENTA_EFECTIVO];
    snap.docs.forEach(d => {
      const p = d.data();
      (p.cuentas || []).forEach((c, i) => {
        lista.push({ id: `${d.id}_${i}`, nombre: c.nombre || `Cuenta ${i + 1}`, banco: c.banco, propietario: p.nombre });
      });
    });
    setCuentas(lista);
    return lista;
  });
}

function EditarPagoModal({ pago, pagoKey, onClose }) {
  const [cuentas, setCuentas] = useState([]);
  const [form, setForm] = useState({ ...pago });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { cargarCuentas(setCuentas); }, []);

  const seleccionarCuenta = (id) => {
    const c = cuentas.find(c => c.id === id);
    if (c) {
      set("cuenta_id", id);
      set("cuenta_nombre", `${c.nombre} — ${c.banco}`);
      if (id === "efectivo") {
        setForm(f => ({ ...f, cuenta_id: id, cuenta_nombre: `${c.nombre} — ${c.banco}`, aplica_iva: false, aplica_ret_iva: false, aplica_ret_isr: false }));
      }
    }
  };

  const guardar = async () => {
    await updateDoc(doc(db, "pagos", pagoKey), form);
    onClose();
  };

  const Toggle = ({ activo, onChange }) => (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: activo ? "#00C896" : "#1A2535", position: "relative", border: `1px solid ${activo ? "#00C896" : "#1E2740"}`, flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: activo ? 23 : 3, transition: "all 0.2s" }} />
    </div>
  );

  const monto = Number(form.monto_base || 0);
  const iva = form.aplica_iva ? monto * ((form.pct_iva || 16) / 100) : 0;
  const totalFactura = monto + iva;
  const retIva = form.aplica_ret_iva ? monto * ((form.pct_ret_iva || 10.67) / 100) : 0;
  const retIsr = form.aplica_ret_isr ? monto * ((form.pct_ret_isr || 10) / 100) : 0;
  const montoNeto = totalFactura - retIva - retIsr;
  const fmt = n => `$${Math.round(n).toLocaleString()}`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 480, margin: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>Editar pago</div>
            <div style={{ fontSize: 12, color: "#4E6080", marginTop: 2 }}>{pago.empresa} · {pago.mes}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>x</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Monto base ($)</label>
              <input value={form.monto_base || ""} onChange={e => set("monto_base", Number(e.target.value))} type="number"
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Fecha de pago</label>
              <input value={form.fecha || ""} onChange={e => set("fecha", e.target.value)} type="date"
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Metodo de pago</label>
            <select value={form.metodo || "Transferencia"} onChange={e => set("metodo", e.target.value)}
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
              {["Transferencia", "Efectivo", "Cheque", "Deposito", "Otro"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "#00C896", marginBottom: 5, fontWeight: 600 }}>Cuenta destino</label>
            <select value={form.cuenta_id || ""} onChange={e => seleccionarCuenta(e.target.value)}
              style={{ width: "100%", background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#00C896", outline: "none", fontWeight: 600 }}>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.id === "efectivo" ? "Efectivo — Caja general" : `${c.nombre} — ${c.banco} (${c.propietario})`}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Impuestos y retenciones</div>
          {[
            { label: "IVA", sub: "Impuesto al valor agregado", ka: "aplica_iva", kp: "pct_iva", def: 16 },
            { label: "Retencion IVA", sub: "Retencion de IVA", ka: "aplica_ret_iva", kp: "pct_ret_iva", def: 10.67 },
            { label: "Retencion ISR", sub: "Retencion de ISR", ka: "aplica_ret_isr", kp: "pct_ret_isr", def: 10 },
          ].map(({ label, sub, ka, kp, def }) => (
            <div key={ka} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: form[ka] ? "#0D2E1F" : "#0A0E17", borderRadius: 10, padding: "10px 14px", border: `1px solid ${form[ka] ? "#00C89633" : "#1E2740"}`, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Toggle activo={form[ka]} onChange={() => set(ka, !form[ka])} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{label}</div>
                  <div style={{ fontSize: 11, color: "#3A5070" }}>{sub}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input value={form[kp] || def} onChange={e => set(kp, e.target.value)} type="number" disabled={!form[ka]}
                  style={{ width: 60, background: "#0A0E17", border: `1px solid ${form[ka] ? "#00C89633" : "#1E2740"}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, color: form[ka] ? "#00C896" : "#3A5070", textAlign: "right", outline: "none" }} />
                <span style={{ fontSize: 13, color: form[ka] ? "#00C896" : "#3A5070", fontWeight: 600 }}>%</span>
              </div>
            </div>
          ))}
          <div style={{ background: "#0A0E17", borderRadius: 10, border: "1px solid #1E2740", padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#4E6080", fontWeight: 700, marginBottom: 8 }}>CALCULO</div>
            {[
              ["Monto base", fmt(monto), "#4E6080"],
              form.aplica_iva && [`+ IVA`, `+${fmt(iva)}`, "#4E8CFF"],
              ["Total factura", fmt(totalFactura), "#C8D8F0"],
              form.aplica_ret_iva && [`- Ret. IVA`, `-${fmt(retIva)}`, "#FF5C5C"],
              form.aplica_ret_isr && [`- Ret. ISR`, `-${fmt(retIsr)}`, "#FF5C5C"],
            ].filter(Boolean).map(([l, v, c], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                <span style={{ color: "#4E6080" }}>{l}</span>
                <span style={{ color: c, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0 0", borderTop: "1px solid #141A28", marginTop: 4 }}>
              <span style={{ color: "#00C896", fontWeight: 700 }}>Entra a tu cuenta</span>
              <span style={{ color: "#00C896", fontWeight: 800 }}>{fmt(montoNeto)}</span>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Notas</label>
            <input value={form.notas || ""} onChange={e => set("notas", e.target.value)} placeholder="Referencia, observaciones..."
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={guardar} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistrarPagoModal({ inquilino, pagos, onClose, onSave }) {
  const fechaHoy = new Date().toISOString().split("T")[0];
  const [cuentas, setCuentas] = useState([CUENTA_EFECTIVO]);
  const [form, setForm] = useState({
    fecha: fechaHoy, metodo: "Transferencia",
    cuenta_id: "efectivo", cuenta_nombre: "Efectivo — Caja general", notas: "",
    aplica_iva: true, pct_iva: 16, aplica_ret_iva: true, pct_ret_iva: 10.67, aplica_ret_isr: true, pct_ret_isr: 10,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const mesesDeuda = getMesesDeuda(inquilino.empresa, pagos, inquilino.renta);
  const mesAplicar = mesesDeuda[0] || MES_ACTUAL;
  const pagoExistente = pagos[getPagoKey(inquilino.empresa, mesAplicar)];
  const saldoPendiente = getSaldoPendiente(pagoExistente, inquilino.renta);
  const abonoPrevio = pagoExistente?.monto_base ? Number(pagoExistente.monto_base) : 0;
  const [montoAbono, setMontoAbono] = useState(saldoPendiente);

  useEffect(() => { cargarCuentas(setCuentas); }, []);

  const seleccionarCuenta = (id) => {
    const c = cuentas.find(c => c.id === id);
    if (c) {
      if (id === "efectivo") {
        setForm(f => ({ ...f, cuenta_id: id, cuenta_nombre: `${c.nombre} — ${c.banco}`, aplica_iva: false, aplica_ret_iva: false, aplica_ret_isr: false }));
      } else { set("cuenta_id", id); set("cuenta_nombre", `${c.nombre} — ${c.banco}`); }
    }
  };

  const iva = form.aplica_iva ? montoAbono * (form.pct_iva / 100) : 0;
  const totalFactura = montoAbono + iva;
  const retIva = form.aplica_ret_iva ? montoAbono * (form.pct_ret_iva / 100) : 0;
  const retIsr = form.aplica_ret_isr ? montoAbono * (form.pct_ret_isr / 100) : 0;
  const montoNeto = totalFactura - retIva - retIsr;
  const fmt = n => `$${Math.round(n).toLocaleString()}`;
  const esCompleto = montoAbono >= saldoPendiente;
  const nuevoMonto = abonoPrevio + Number(montoAbono);

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
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>Registrar pago</div>
            <div style={{ fontSize: 12, color: "#4E6080", marginTop: 2 }}>{inquilino.empresa}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>x</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ background: "#0A0E17", borderRadius: 10, border: "1px solid #1E2740", padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 8, fontWeight: 600 }}>DEUDA PENDIENTE</div>
            {mesesDeuda.length === 0 ? (
              <div style={{ fontSize: 13, color: "#00C896" }}>Al corriente</div>
            ) : mesesDeuda.map((mes, i) => {
              const p = pagos[getPagoKey(inquilino.empresa, mes)];
              const saldo = getSaldoPendiente(p, inquilino.renta);
              const abono = p?.monto_base ? Number(p.monto_base) : 0;
              return (
                <div key={mes} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < mesesDeuda.length - 1 ? "1px solid #141A28" : "none" }}>
                  <span style={{ fontSize: 12, color: i === 0 ? "#FFB547" : "#4E6080", fontWeight: i === 0 ? 700 : 400 }}>
                    {i === 0 ? "-> " : ""}{mes}
                    {abono > 0 && <span style={{ color: "#4E8CFF", fontSize: 11 }}> (abonado: ${abono.toLocaleString()})</span>}
                  </span>
                  <span style={{ fontSize: 12, color: i === 0 ? "#FF5C5C" : "#3A5070", fontWeight: 700 }}>${saldo.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
          <div style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#00C896", fontWeight: 600, marginBottom: 4 }}>APLICANDO A: {mesAplicar}</div>
            <div style={{ fontSize: 12, color: "#4E6080" }}>Pendiente: ${saldoPendiente.toLocaleString()}{abonoPrevio > 0 && ` · Ya abonado: $${abonoPrevio.toLocaleString()}`}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Monto del abono ($)</label>
            <input value={montoAbono} onChange={e => setMontoAbono(Number(e.target.value))} type="number"
              style={{ width: "100%", background: "#0A0E17", border: `1px solid ${montoAbono >= saldoPendiente ? "#00C89633" : "#FFB54733"}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            <div style={{ fontSize: 11, marginTop: 4, color: esCompleto ? "#00C896" : "#FFB547" }}>
              {esCompleto ? "Pago completo" : `Abono parcial — queda pendiente: $${(saldoPendiente - montoAbono).toLocaleString()}`}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Fecha de pago</label>
              <input value={form.fecha} onChange={e => set("fecha", e.target.value)} type="date"
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Metodo</label>
              <select value={form.metodo} onChange={e => set("metodo", e.target.value)}
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
                {["Transferencia", "Efectivo", "Cheque", "Deposito", "Otro"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#00C896", marginBottom: 5, fontWeight: 600 }}>Cuenta destino</label>
            <select value={form.cuenta_id} onChange={e => seleccionarCuenta(e.target.value)}
              style={{ width: "100%", background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#00C896", outline: "none", fontWeight: 600 }}>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.id === "efectivo" ? "Efectivo — Caja general" : `${c.nombre} — ${c.banco} (${c.propietario})`}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Impuestos y retenciones</div>
          {[
            { label: "IVA", sub: "Impuesto al valor agregado", ka: "aplica_iva", kp: "pct_iva" },
            { label: "Retencion IVA", sub: "Retencion de IVA", ka: "aplica_ret_iva", kp: "pct_ret_iva" },
            { label: "Retencion ISR", sub: "Retencion de ISR", ka: "aplica_ret_isr", kp: "pct_ret_isr" },
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
            <div style={{ fontSize: 11, color: "#4E6080", fontWeight: 700, marginBottom: 10 }}>CALCULO</div>
            {[
              ["Abono base", fmt(montoAbono), "#4E6080"],
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
              <span style={{ color: "#00C896", fontWeight: 700 }}>Entra a tu cuenta</span>
              <span style={{ color: "#00C896", fontWeight: 800 }}>{fmt(montoNeto)}</span>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Notas (opcional)</label>
            <input value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Referencia..."
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => {
              onSave({ mes: mesAplicar, ...form, estado: esCompleto ? "pagado" : "parcial", monto: montoNeto, monto_base: nuevoMonto, iva: Math.round(iva), ret_iva: Math.round(retIva), ret_isr: Math.round(retIsr), total_factura: Math.round(totalFactura) });
              onClose();
            }} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {esCompleto ? "Confirmar pago completo" : "Registrar abono parcial"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CuentasPorCobrar({ naves, pagos, rol, usuarioEmail }) {
  const [registrando, setRegistrando] = useState(null);
  const [editandoPago, setEditandoPago] = useState(null);
  const [confirmBorrar, setConfirmBorrar] = useState(null);
  const [inmuebles, setInmuebles] = useState([]);
  const [vistaActiva, setVistaActiva] = useState("deuda");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inmuebles"), snap => {
      setInmuebles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const inquilinos = getInquilinos(naves, inmuebles);

  const registrarPago = async (empresa, data) => {
    await addDoc(collection(db, "pendientes"), {
      ...data,
      empresa,
      tipo_movimiento: "pago",
      aprobado: false,
      fecha_captura: new Date().toISOString(),
      capturado_por: usuarioEmail,
    });
    await registrarAuditoria({ tipo: "alta", modulo: "pagos", descripcion: `Pago enviado a aprobacion: ${empresa} — ${data.mes} — $${Number(data.monto_base || 0).toLocaleString()}`, detalle: { cuenta: data.cuenta_nombre } });
    alert("Pago enviado a aprobacion");
  };

  const borrarPago = async (key) => {
    const pago = pagosRegistrados.find(p => p.key === key);
    await deleteDoc(doc(db, "pagos", key));
    await registrarAuditoria({ tipo: "borrado", modulo: "pagos", descripcion: `Pago borrado: ${pago?.empresa} — ${pago?.mes} — $${Number(pago?.monto_base || 0).toLocaleString()}`, detalle: null });
    setConfirmBorrar(null);
  };

  const inquilinosConDeuda = inquilinos.map(inq => {
    const mesesDeuda = getMesesDeuda(inq.empresa, pagos, inq.renta);
    const mesOldest = mesesDeuda[0];
    const pagoOldest = mesOldest ? pagos[getPagoKey(inq.empresa, mesOldest)] : null;
    const saldoOldest = mesOldest ? getSaldoPendiente(pagoOldest, inq.renta) : 0;
    const totalDeuda = mesesDeuda.reduce((s, mes) => s + getSaldoPendiente(pagos[getPagoKey(inq.empresa, mes)], inq.renta), 0);
    return { ...inq, mesesDeuda, mesOldest, saldoOldest, totalDeuda };
  });

  const pagosRegistrados = Object.entries(pagos)
    .filter(([, p]) => p.estado === "pagado" || p.estado === "parcial")
    .map(([key, p]) => ({ key, ...p }))
    .sort((a, b) => (a.fecha || "") > (b.fecha || "") ? -1 : 1);

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const [y, m, d] = fecha.split("-");
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d} ${meses[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div style={{ padding: "28px" }}>
      {registrando && <RegistrarPagoModal inquilino={registrando} pagos={pagos} onClose={() => setRegistrando(null)} onSave={(data) => registrarPago(registrando.empresa, data)} />}
      {editandoPago && <EditarPagoModal pago={editandoPago.pago} pagoKey={editandoPago.key} onClose={() => setEditandoPago(null)} />}

      {confirmBorrar && (
        <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 380, padding: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginBottom: 8 }}>Confirmar borrar</div>
            <div style={{ fontSize: 13, color: "#4E6080", marginBottom: 20 }}>
              Seguro que quieres borrar el pago de <strong style={{ color: "#C8D8F0" }}>{confirmBorrar.pago.empresa}</strong> — {confirmBorrar.pago.mes}?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmBorrar(null)} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => borrarPago(confirmBorrar.key)} style={{ flex: 1, background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 8, color: "#FF5C5C", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Si, borrar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>Cuentas por Cobrar</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>
        Mes actual: <span style={{ color: "#4E8CFF", fontWeight: 600 }}>{MES_ACTUAL}</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["deuda","Estado de deuda"],["historial","Historial de pagos"]].map(([id, label]) => (
          <button key={id} onClick={() => setVistaActiva(id)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${vistaActiva === id ? "#4E8CFF" : "#1E2740"}`, background: vistaActiva === id ? "#0D1A2E" : "#0F1520", color: vistaActiva === id ? "#4E8CFF" : "#4E6080", fontSize: 13, fontWeight: vistaActiva === id ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {vistaActiva === "deuda" && (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0" }}>Estado por inquilino</div>
            <div style={{ fontSize: 12, color: "#3A5070" }}>El pago se aplica al mes mas antiguo</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#080C14" }}>
                {["Inquilino","Mes mas antiguo","Saldo pendiente","Total adeudo","Accion"].map(h => (
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
                    ) : <span style={{ color: "#00C896", fontSize: 12 }}>Al corriente</span>}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: inq.saldoOldest > 0 ? "#FFB547" : "#00C896" }}>
                    {inq.saldoOldest > 0 ? `$${inq.saldoOldest.toLocaleString()}` : "-"}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: inq.totalDeuda > 0 ? "#FF5C5C" : "#00C896" }}>
                    {inq.totalDeuda > 0 ? `$${inq.totalDeuda.toLocaleString()}` : "-"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {inq.mesesDeuda.length > 0 ? (
                      <button onClick={() => setRegistrando(inq)} style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 8, color: "#00C896", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Registrar pago
                      </button>
                    ) : <span style={{ fontSize: 12, color: "#3A5070" }}>Al corriente</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vistaActiva === "historial" && (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1E2740" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0" }}>Historial de pagos registrados</div>
          </div>
          {pagosRegistrados.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#3A5070", fontSize: 13 }}>No hay pagos registrados aun</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#080C14" }}>
                  {["Fecha","Inquilino","Periodo","Monto base","Entra a cuenta","Estado","Acciones"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagosRegistrados.map((p, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{formatFecha(p.fecha)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#C8D8F0" }}>{p.empresa}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{p.mes}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#C8D8F0" }}>${Number(p.monto_base || 0).toLocaleString()}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#00C896" }}>${Number(p.monto || 0).toLocaleString()}</td>
                    <td style={{ padding: "12px 16px" }}><Badge estado={p.estado} tipo="pago" /></td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditandoPago({ key: p.key, pago: p })} style={{ background: "#1A2535", border: "1px solid #1E2740", borderRadius: 6, color: "#4E8CFF", padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                        <button onClick={() => setConfirmBorrar({ key: p.key, pago: p })} style={{ background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 6, color: "#FF5C5C", padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}