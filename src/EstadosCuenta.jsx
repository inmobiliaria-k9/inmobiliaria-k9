import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

const CUENTA_EFECTIVO = { key: "efectivo", nombre: "Efectivo", banco: "Caja general", propietario: "General" };

export default function EstadosCuenta() {
  const [propietarios, setPropietarios] = useState([]);
  const [cuentaActiva, setCuentaActiva] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [saldoBanco, setSaldoBanco] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "propietarios"), snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPropietarios(lista);
      if (!cuentaActiva) {
        setCuentaActiva(CUENTA_EFECTIVO);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pagos"), snap => {
      setPagos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const todasLasCuentas = [
    CUENTA_EFECTIVO,
    ...propietarios.flatMap(p =>
      (p.cuentas || []).map((c, i) => ({
        key: `${p.id}_${i}`,
        propietario_id: p.id,
        propietario: p.nombre,
        idx: i,
        nombre: c.nombre || `Cuenta ${i + 1}`,
        banco: c.banco,
      }))
    )
  ];

  const pagosDeCuenta = cuentaActiva
    ? pagos.filter(p => p.cuenta_id === cuentaActiva.key && p.estado === "pagado")
    : [];

  const totalEntradas = pagosDeCuenta.reduce((s, p) => s + Number(p.monto || 0), 0);
  const saldoBancoNum = saldoBanco ? Number(saldoBanco) : null;
  const cuadra = saldoBancoNum !== null ? Math.abs(saldoBancoNum - totalEntradas) < 1 : null;

  const isEfectivo = cuentaActiva?.key === "efectivo";

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>Estados de Cuenta</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>Movimientos por cuenta bancaria</div>

      {/* Selector de cuentas */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {todasLasCuentas.map(c => {
          const isActiva = cuentaActiva?.key === c.key;
          return (
            <div key={c.key} onClick={() => { setCuentaActiva(c); setSaldoBanco(""); }}
              style={{ flex: 1, minWidth: 160, background: isActiva ? (c.key === "efectivo" ? "#2A2000" : "#0D2E1F") : "#0F1520", border: `1px solid ${isActiva ? (c.key === "efectivo" ? "#FFB54733" : "#00C89633") : "#1E2740"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
              {isActiva && <div style={{ fontSize: 11, color: c.key === "efectivo" ? "#FFB547" : "#00C896", marginBottom: 4, fontWeight: 600 }}>ACTIVA</div>}
              <div style={{ fontSize: 14, fontWeight: 700, color: isActiva ? "#E8EDF5" : "#5A7090" }}>
                {c.key === "efectivo" ? "💵 " : ""}{c.nombre}
              </div>
              <div style={{ fontSize: 11, color: isActiva ? "#4E6080" : "#3A5070" }}>{c.banco} · {c.propietario}</div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total entradas", `$${totalEntradas.toLocaleString()}`, "#00C896"],
          ["Total salidas", "$0", "#FF5C5C"],
          ["Saldo sistema", `$${totalEntradas.toLocaleString()}`, "#E8EDF5"],
          ["Movimientos", pagosDeCuenta.length, "#4E8CFF"],
        ].map(([l, v, c], i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 10, padding: "14px 16px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: i === 3 ? 22 : 18, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1E2740" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0" }}>
            Movimientos — {cuentaActiva?.nombre} {cuentaActiva?.banco && `(${cuentaActiva.banco})`}
          </div>
        </div>

        {pagosDeCuenta.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#3A5070" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{isEfectivo ? "💵" : "🏦"}</div>
            <div style={{ fontSize: 13 }}>No hay movimientos en esta cuenta aun</div>
            <div style={{ fontSize: 11, marginTop: 6 }}>Los pagos registrados en Cuentas por Cobrar apareceran aqui</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#080C14" }}>
                {["Fecha", "Concepto", "Periodo", "Metodo", "Entrada"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: h === "Entrada" ? "right" : "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagosDeCuenta.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{p.fecha || "-"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#C8D8F0" }}>Renta — {p.empresa}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "#4E6080" }}>{p.mes}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{p.metodo || "-"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "#00C896", textAlign: "right" }}>+${Number(p.monto || 0).toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "1px solid #1E2740", background: "#0D2E1F" }}>
                <td colSpan={4} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#00C896" }}>Total</td>
                <td style={{ padding: "12px 16px", fontSize: 15, fontWeight: 800, color: "#00C896", textAlign: "right" }}>+${totalEntradas.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Saldo al dia */}
      <div style={{ background: "#0F1520", borderRadius: 12, border: "1px solid #1E2740", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#C8D8F0", marginBottom: 4 }}>
            {isEfectivo ? "Efectivo en caja" : "Saldo al dia"}
          </div>
          <div style={{ fontSize: 11, color: "#3A5070" }}>
            {isEfectivo ? "Ingresa el efectivo real que tienes para verificar que cuadra" : "Ingresa el saldo de tu banco para verificar que cuadra con el sistema"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input value={saldoBanco} onChange={e => setSaldoBanco(e.target.value)} placeholder="0.00" type="number"
            style={{ background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", width: 150 }} />
          {cuadra === true && (
            <div style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, color: "#00C896" }}>Cuadra</div>
          )}
          {cuadra === false && (
            <div style={{ background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, color: "#FF5C5C" }}>
              Diferencia: ${Math.abs(saldoBancoNum - totalEntradas).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
