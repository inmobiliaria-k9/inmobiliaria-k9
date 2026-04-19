import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

const CUENTA_EFECTIVO = { key: "efectivo", nombre: "Efectivo", banco: "Caja general", propietario: "General" };

export default function EstadosCuenta() {
  const [propietarios, setPropietarios] = useState([]);
  const [cuentaActiva, setCuentaActiva] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [saldoBanco, setSaldoBanco] = useState("");
  const tablaRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "propietarios"), snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPropietarios(lista);
      if (!cuentaActiva) setCuentaActiva(CUENTA_EFECTIVO);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pagos"), snap => {
      setPagos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gastos"), snap => {
      setGastos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Scroll al fondo cuando cambia la cuenta o los datos
  useEffect(() => {
    if (tablaRef.current) {
      tablaRef.current.scrollTop = tablaRef.current.scrollHeight;
    }
  }, [cuentaActiva, pagos, gastos]);

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

  // Entradas de la cuenta activa
  const entradasCuenta = cuentaActiva
    ? pagos.filter(p => p.cuenta_id === cuentaActiva.key && p.estado === "pagado")
    : [];

  // Salidas (gastos) de la cuenta activa
  const salidasCuenta = cuentaActiva
    ? gastos.filter(g => g.cuenta_id === cuentaActiva.key)
    : [];

  // Combinar entradas y salidas ordenadas por fecha
  const movimientos = [
    ...entradasCuenta.map(p => ({ ...p, tipo: "entrada", fechaSort: p.fecha || "0000" })),
    ...salidasCuenta.map(g => ({ ...g, tipo: "salida", fechaSort: g.fecha || "0000" })),
  ].sort((a, b) => a.fechaSort > b.fechaSort ? 1 : a.fechaSort < b.fechaSort ? -1 : 0);

  const totalEntradas = entradasCuenta.reduce((s, p) => s + Number(p.monto || 0), 0);
  const totalSalidas = salidasCuenta.reduce((s, g) => s + Number(g.monto || 0), 0);
  const saldoSistema = totalEntradas - totalSalidas;
  const saldoBancoNum = saldoBanco ? Number(saldoBanco) : null;
  const cuadra = saldoBancoNum !== null ? Math.abs(saldoBancoNum - saldoSistema) < 1 : null;
  const isEfectivo = cuentaActiva?.key === "efectivo";

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const [y, m, d] = fecha.split("-");
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d} ${meses[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>Estados de Cuenta</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>Movimientos por cuenta — del mas antiguo al mas reciente</div>

      {/* Selector de cuentas */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {todasLasCuentas.map(c => {
          const isActiva = cuentaActiva?.key === c.key;
          return (
            <div key={c.key} onClick={() => { setCuentaActiva(c); setSaldoBanco(""); }}
              style={{ flex: 1, minWidth: 160, background: isActiva ? (c.key === "efectivo" ? "#2A2000" : "#0D2E1F") : "#0F1520", border: `1px solid ${isActiva ? (c.key === "efectivo" ? "#FFB54733" : "#00C89633") : "#1E2740"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
              {isActiva && <div style={{ fontSize: 11, color: c.key === "efectivo" ? "#FFB547" : "#00C896", marginBottom: 4, fontWeight: 600 }}>ACTIVA</div>}
              <div style={{ fontSize: 14, fontWeight: 700, color: isActiva ? "#E8EDF5" : "#5A7090" }}>
                {c.key === "efectivo" ? "Efectivo" : c.nombre}
              </div>
              <div style={{ fontSize: 11, color: isActiva ? "#4E6080" : "#3A5070" }}>{c.banco} · {c.propietario}</div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total entradas", `+$${totalEntradas.toLocaleString()}`, "#00C896"],
          ["Total salidas", `-$${totalSalidas.toLocaleString()}`, "#FF5C5C"],
          ["Saldo sistema", `$${saldoSistema.toLocaleString()}`, saldoSistema >= 0 ? "#E8EDF5" : "#FF5C5C"],
          ["Movimientos", movimientos.length, "#4E8CFF"],
        ].map(([l, v, c], i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 10, padding: "14px 16px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: i === 3 ? 22 : 18, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tabla con scroll */}
      <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1E2740" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0" }}>
            Movimientos — {cuentaActiva?.nombre} {cuentaActiva?.banco && `(${cuentaActiva.banco})`}
          </div>
        </div>

        {movimientos.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#3A5070" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{isEfectivo ? "💵" : "🏦"}</div>
            <div style={{ fontSize: 13 }}>No hay movimientos en esta cuenta aun</div>
          </div>
        ) : (
          <div ref={tablaRef} style={{ maxHeight: 400, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "#080C14" }}>
                  {["Fecha", "Concepto", "Tipo", "Entrada", "Salida", "Saldo"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: ["Entrada","Salida","Saldo"].includes(h) ? "right" : "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let saldoAcumulado = 0;
                  return movimientos.map((m, i) => {
                    const esEntrada = m.tipo === "entrada";
                    const monto = Number(m.monto || 0);
                    if (esEntrada) saldoAcumulado += monto;
                    else saldoAcumulado -= monto;
                    return (
                      <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{formatFecha(m.fecha)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#C8D8F0" }}>
                          {esEntrada ? `Renta — ${m.empresa} (${m.mes})` : m.concepto}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: esEntrada ? "#0D2E1F" : "#2E0D0D", color: esEntrada ? "#00C896" : "#FF5C5C", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                            {esEntrada ? "Entrada" : "Salida"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#00C896", textAlign: "right" }}>
                          {esEntrada ? `+$${monto.toLocaleString()}` : ""}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#FF5C5C", textAlign: "right" }}>
                          {!esEntrada ? `-$${monto.toLocaleString()}` : ""}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: saldoAcumulado >= 0 ? "#E8EDF5" : "#FF5C5C", textAlign: "right" }}>
                          ${saldoAcumulado.toLocaleString()}
                        </td>
                      </tr>
                    );
                  });
                })()}
                <tr style={{ borderTop: "1px solid #1E2740", background: "#0D2E1F" }}>
                  <td colSpan={3} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#00C896" }}>Saldo final</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#00C896", textAlign: "right" }}>+${totalEntradas.toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#FF5C5C", textAlign: "right" }}>-${totalSalidas.toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", fontSize: 15, fontWeight: 800, color: saldoSistema >= 0 ? "#00C896" : "#FF5C5C", textAlign: "right" }}>${saldoSistema.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Saldo al dia */}
      <div style={{ background: "#0F1520", borderRadius: 12, border: "1px solid #1E2740", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#C8D8F0", marginBottom: 4 }}>
            {isEfectivo ? "Efectivo en caja" : "Saldo al dia"}
          </div>
          <div style={{ fontSize: 11, color: "#3A5070" }}>
            {isEfectivo ? "Ingresa el efectivo real para verificar" : "Ingresa el saldo de tu banco para verificar"}
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
              Diferencia: ${Math.abs(saldoBancoNum - saldoSistema).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
