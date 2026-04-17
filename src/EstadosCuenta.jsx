import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function EstadosCuenta() {
  const [propietarios, setPropietarios] = useState([]);
  const [cuentaActiva, setCuentaActiva] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [saldoBanco, setSaldoBanco] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "propietarios"), snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPropietarios(lista);
      if (lista.length > 0 && lista[0].cuentas?.length > 0 && !cuentaActiva) {
        setCuentaActiva({ propietario_id: lista[0].id, propietario: lista[0].nombre, ...lista[0].cuentas[0], idx: 0, key: `${lista[0].id}_0` });
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

  const todasLasCuentas = propietarios.flatMap(p =>
    (p.cuentas || []).map((c, i) => ({
      propietario_id: p.id, propietario: p.nombre,
      idx: i, ...c, key: `${p.id}_${i}`
    }))
  );

  const pagosDeCuenta = cuentaActiva
    ? pagos.filter(p => p.cuenta_id === cuentaActiva.key && p.estado === "pagado")
    : [];

  const pagosFiltrados = filtro === "todos" ? pagosDeCuenta : pagosDeCuenta;

  const totalEntradas = pagosDeCuenta.reduce((s, p) => s + Number(p.monto || 0), 0);
  const saldoBancoNum = saldoBanco ? Number(saldoBanco) : null;
  const cuadra = saldoBancoNum !== null ? Math.abs(saldoBancoNum - totalEntradas) < 1 : null;

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>🏦 Estados de Cuenta</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>Movimientos por cuenta bancaria</div>

      {todasLasCuentas.length === 0 ? (
        <div style={{ background: "#2A2000", border: "1px solid #FFB54733", borderRadius: 10, padding: "16px 20px", marginBottom: 20, fontSize: 13, color: "#FFB547" }}>
          ⚠️ No hay cuentas bancarias registradas. Agrégalas en el módulo de Propietarios.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {todasLasCuentas.map(c => {
            const isActiva = cuentaActiva?.key === c.key;
            return (
              <div key={c.key} onClick={() => setCuentaActiva(c)}
                style={{ flex: 1, minWidth: 180, background: isActiva ? "#0D2E1F" : "#0F1520", border: `1px solid ${isActiva ? "#00C89633" : "#1E2740"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
                {isActiva && <div style={{ fontSize: 11, color: "#00C896", marginBottom: 4, fontWeight: 600 }}>CUENTA ACTIVA</div>}
                <div style={{ fontSize: 14, fontWeight: 700, color: isActiva ? "#E8EDF5" : "#5A7090" }}>{c.nombre || `Cuenta ${c.idx + 1}`}</div>
                <div style={{ fontSize: 11, color: isActiva ? "#4E6080" : "#3A5070" }}>{c.banco} · {c.propietario}</div>
              </div>
            );
          })}
        </div>
      )}

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

      <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0" }}>
            Movimientos {cuentaActiva ? `— ${cuentaActiva.nombre || "Cuenta"} ${cuentaActiva.banco}` : ""}
          </div>
        </div>

        {pagosFiltrados.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#3A5070" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏦</div>
            <div style={{ fontSize: 13 }}>No hay movimientos en esta cuenta aún</div>
            <div style={{ fontSize: 11, marginTop: 6 }}>Los pagos registrados en Cuentas por Cobrar aparecerán aquí</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#080C14" }}>
                {["Fecha", "Concepto", "Período", "Método", "Entrada"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "#3A5070", textAlign: h === "Entrada" ? "right" : "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{p.fecha || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#C8D8F0" }}>Renta — {p.empresa}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "#4E6080" }}>{p.mes}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#4E6080" }}>{p.metodo || "—"}</td>
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

      <div style={{ background: "#0F1520", borderRadius: 12, border: "1px solid #1E2740", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#C8D8F0", marginBottom: 4 }}>Saldo al día</div>
          <div style={{ fontSize: 11, color: "#3A5070" }}>Ingresa el saldo de tu banco para verificar que cuadra con el sistema</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input value={saldoBanco} onChange={e => setSaldoBanco(e.target.value)} placeholder="0.00" type="number"
            style={{ background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", width: 150 }} />
          {cuadra === true && (
            <div style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, color: "#00C896" }}>✓ Cuadra</div>
          )}
          {cuadra === false && (
            <div style={{ background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, color: "#FF5C5C" }}>
              ✗ Diferencia: ${Math.abs(saldoBancoNum - totalEntradas).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
