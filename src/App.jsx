import { useState, useEffect } from "react";
import { db } from "./firebase";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDocs, setDoc, onSnapshot, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { navesIniciales, MES_ACTUAL } from "./utils";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Naves from "./Naves";
import CuentasPorCobrar from "./CuentasPorCobrar";
import ResumenAnual from "./ResumenAnual";
import Propietarios from "./Propietarios";
import Inquilinos from "./Inquilinos";
import EstadosCuenta from "./EstadosCuenta";
import Gastos from "./Gastos";
import Aprobaciones from "./Aprobaciones";
import Auditoria from "./Auditoria.jsx";

const auth = getAuth();

const DIRECTORES = ["kananjose9@gmail.com"];

function getRol(email) {
  if (!email) return "administrador";
  if (DIRECTORES.includes(email.toLowerCase())) return "director";
  return "administrador";
}

const BLOQUEADOS_ADMIN = ["dashboard", "aprobaciones", "auditoria"];

const navItems = [
  { id: "dashboard",    label: "Dashboard",         icon: "▦",  soloDirector: true  },
  { id: "propietarios", label: "Propietarios",       icon: "🏢", soloDirector: false },
  { id: "naves",        label: "Inmuebles y Naves",  icon: "🏭", soloDirector: false },
  { id: "inquilinos",   label: "Inquilinos",         icon: "👥", soloDirector: false },
  { id: "cobrar",       label: "Cuentas por Cobrar", icon: "💳", soloDirector: false },
  { id: "gastos",       label: "Gastos",             icon: "📋", soloDirector: false },
  { id: "aprobaciones", label: "Aprobaciones",       icon: "✅", soloDirector: true  },
  { id: "auditoria",    label: "Auditoria",          icon: "🔍", soloDirector: true  },
  { id: "estados",      label: "Estados de Cuenta",  icon: "🏦", soloDirector: false },
  { id: "resumen",      label: "Resumen Anual",      icon: "📊", soloDirector: false },
];

const TIPO_ICONS = {
  propietario: "🏢", inmueble: "🏭", nave: "🏗️",
  inquilino: "👥", pago: "💰", gasto: "📋", incremento: "📈",
};

const TIPO_LABELS = {
  propietario: "Propietario", inmueble: "Inmueble", nave: "Nave",
  inquilino: "Inquilino", pago: "Pago", gasto: "Gasto", incremento: "Incremento",
};

function usePagos() {
  const [pagos, setPagos] = useState({});
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pagos"), (snap) => {
      const data = {};
      snap.forEach(d => { data[d.id] = d.data(); });
      setPagos(data);
    });
    return () => unsub();
  }, []);
  return pagos;
}

// ─── MODAL EDITAR CAPTURA ─────────────────────────────────────────────────────
function ModalEditarCaptura({ item, onClose, onGuardar }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = (label, key, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>{label}</label>
      <input value={form[key] || ""} onChange={e => set(key, e.target.value)} type={type} placeholder={placeholder}
        style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  const renderCampos = () => {
    if (item.tipo_movimiento === "pago") return (
      <>
        <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 600, marginBottom: 10 }}>PAGO — {item.empresa} · {item.mes}</div>
        {inp("Monto base ($)", "monto_base", "number")}
        {inp("Fecha de pago", "fecha", "date")}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Método</label>
          <select value={form.metodo || "Transferencia"} onChange={e => set("metodo", e.target.value)}
            style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
            {["Transferencia","Efectivo","Cheque","Deposito","Otro"].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        {inp("Notas", "notas", "text")}
      </>
    );
    if (item.tipo_movimiento === "gasto") return (
      <>
        <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 600, marginBottom: 10 }}>GASTO</div>
        {inp("Concepto *", "concepto", "text")}
        {inp("Monto ($) *", "monto", "number")}
        {inp("Fecha", "fecha", "date")}
      </>
    );
    if (item.tipo_movimiento === "inquilino") return (
      <>
        <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 600, marginBottom: 10 }}>INQUILINO</div>
        {inp("Alias *", "alias", "text")}
        {inp("Razón social", "razon_social", "text")}
        {inp("RFC", "rfc", "text")}
        {inp("Contacto", "contacto", "text")}
        {inp("Teléfono", "telefono", "tel")}
        {inp("Correo", "correo", "email")}
        {inp("Fecha inicio contrato", "fecha_inicio", "date")}
        {inp("Fecha fin contrato", "fecha_fin", "date")}
        {inp("Notas", "notas", "text")}
      </>
    );
    if (item.tipo_movimiento === "propietario") return (
      <>
        <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 600, marginBottom: 10 }}>PROPIETARIO</div>
        {inp("Nombre *", "nombre", "text")}
      </>
    );
    if (item.tipo_movimiento === "inmueble") return (
      <>
        <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 600, marginBottom: 10 }}>INMUEBLE</div>
        {inp("Nombre *", "nombre", "text")}
      </>
    );
    if (item.tipo_movimiento === "nave") return (
      <>
        <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 600, marginBottom: 10 }}>NAVE</div>
        {inp("Nombre *", "nombre", "text")}
        {inp("Metros cuadrados", "m2", "number")}
      </>
    );
    if (item.tipo_movimiento === "incremento") return (
      <>
        <div style={{ fontSize: 12, color: "#4E6080", fontWeight: 600, marginBottom: 10 }}>INCREMENTO — {item.inquilino_alias}</div>
        {inp("Fecha de incremento", "fecha_incremento", "date")}
        {inp("Renta nueva ($)", "renta_nueva", "number")}
        {inp("Notas", "notas_incremento", "text")}
      </>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 440, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>
            {TIPO_ICONS[item.tipo_movimiento]} Editar {TIPO_LABELS[item.tipo_movimiento]}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {renderCampos()}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => onGuardar(form)} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PANEL MIS CAPTURAS ───────────────────────────────────────────────────────
function MisCapturas({ usuarioEmail, onClose }) {
  const [pendientes, setPendientes] = useState([]);
  const [confirmBorrar, setConfirmBorrar] = useState(null);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pendientes"), snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.capturado_por === usuarioEmail)
        .sort((a, b) => (a.fecha_captura || "") > (b.fecha_captura || "") ? -1 : 1);
      setPendientes(lista);
    });
    return () => unsub();
  }, [usuarioEmail]);

  const borrar = async (id) => {
    await deleteDoc(doc(db, "pendientes", id));
    setConfirmBorrar(null);
  };

  const guardarEdicion = async (form) => {
    await updateDoc(doc(db, "pendientes", form.id), form);
    setEditando(null);
  };

  const getNombre = (item) => {
    if (item.tipo_movimiento === "pago") return `${item.empresa} — ${item.mes}`;
    if (item.tipo_movimiento === "gasto") return item.concepto;
    if (item.tipo_movimiento === "inquilino") return item.alias;
    if (item.tipo_movimiento === "incremento") return item.inquilino_alias;
    return item.nombre;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const f = fecha.includes("T") ? fecha.split("T")[0] : fecha;
    const [y, m, d] = f.split("-");
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d} ${meses[parseInt(m) - 1]} ${y}`;
  };

  const fmt = n => `$${Math.round(Number(n) || 0).toLocaleString()}`;

  const renderDetalle = (item) => {
    const rows = [];
    if (item.tipo_movimiento === "pago") {
      rows.push(["Periodo", item.mes]);
      rows.push(["Monto base", fmt(item.monto_base)]);
      rows.push(["Entra a cuenta", fmt(item.monto)]);
      rows.push(["Método", item.metodo || "-"]);
      rows.push(["Cuenta", item.cuenta_nombre || "-"]);
      if (item.notas) rows.push(["Notas", item.notas]);
    } else if (item.tipo_movimiento === "gasto") {
      rows.push(["Concepto", item.concepto]);
      rows.push(["Monto", fmt(item.monto)]);
      rows.push(["Fecha", formatFecha(item.fecha)]);
      rows.push(["Cuenta", item.cuenta_nombre || "-"]);
    } else if (item.tipo_movimiento === "inquilino") {
      rows.push(["Alias", item.alias]);
      if (item.razon_social) rows.push(["Razón social", item.razon_social]);
      if (item.rfc) rows.push(["RFC", item.rfc]);
      if (item.contacto) rows.push(["Contacto", item.contacto]);
      if (item.fecha_inicio) rows.push(["Inicio contrato", formatFecha(item.fecha_inicio)]);
      if (item.fecha_fin) rows.push(["Fin contrato", formatFecha(item.fecha_fin)]);
    } else if (item.tipo_movimiento === "incremento") {
      rows.push(["Inquilino", item.inquilino_alias]);
      rows.push(["Renta actual", fmt(item.renta_actual)]);
      rows.push(["Renta nueva", fmt(item.renta_nueva)]);
      rows.push(["Diferencia", `+${fmt(Number(item.renta_nueva) - Number(item.renta_actual))}`]);
      rows.push(["Fecha incremento", formatFecha(item.fecha_incremento)]);
      if (item.notas_incremento) rows.push(["Notas", item.notas_incremento]);
    } else if (item.tipo_movimiento === "propietario") {
      rows.push(["Nombre", item.nombre]);
      rows.push(["Cuentas bancarias", `${item.cuentas?.length || 0} cuenta(s)`]);
      rows.push(["Inmuebles", `${item.inmuebles_ids?.length || 0} inmueble(s)`]);
    } else if (item.tipo_movimiento === "inmueble") {
      rows.push(["Nombre", item.nombre]);
    } else if (item.tipo_movimiento === "nave") {
      rows.push(["Nombre", item.nombre]);
      rows.push(["Metros cuadrados", `${Number(item.m2 || 0).toLocaleString()} m²`]);
    }
    return rows;
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000AA", zIndex: 300 }} />
      {editando && <ModalEditarCaptura item={editando} onClose={() => setEditando(null)} onGuardar={guardarEdicion} />}

      <div style={{ position: "fixed", top: 0, right: 0, width: 420, height: "100vh", background: "#0F1520", borderLeft: "1px solid #1E2740", zIndex: 301, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>Mis capturas</div>
            <div style={{ fontSize: 12, color: "#3A5070", marginTop: 2 }}>
              {pendientes.length > 0
                ? <span style={{ color: "#FFB547" }}>{pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""} de aprobación</span>
                : <span style={{ color: "#00C896" }}>Todo aprobado</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 22 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {pendientes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#3A5070" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>No tienes capturas pendientes</div>
              <div style={{ fontSize: 12 }}>Todo ha sido aprobado</div>
            </div>
          ) : (
            pendientes.map(item => (
              <div key={item.id} style={{ background: "#0A0E17", borderRadius: 12, border: "1px solid #1E2740", padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{TIPO_ICONS[item.tipo_movimiento]}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#C8D8F0" }}>{getNombre(item)}</div>
                      <div style={{ fontSize: 11, color: "#3A5070", marginTop: 2 }}>
                        {TIPO_LABELS[item.tipo_movimiento]} · {formatFecha(item.fecha_captura)}
                      </div>
                    </div>
                  </div>
                  <span style={{ background: "#2A2000", color: "#FFB547", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    Pendiente
                  </span>
                </div>
                <div style={{ background: "#141A28", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                  {renderDetalle(item).map(([label, value], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: i < renderDetalle(item).length - 1 ? "1px solid #1E2740" : "none" }}>
                      <span style={{ fontSize: 12, color: "#4E6080" }}>{label}</span>
                      <span style={{ fontSize: 12, color: "#C8D8F0", fontWeight: 600, maxWidth: 200, textAlign: "right" }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setEditando(item)}
                    style={{ flex: 1, background: "#0D1A2E", border: "1px solid #4E8CFF33", borderRadius: 6, color: "#4E8CFF", padding: "7px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Editar
                  </button>
                  <button onClick={() => setConfirmBorrar(item)}
                    style={{ flex: 1, background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 6, color: "#FF5C5C", padding: "7px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Borrar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {confirmBorrar && (
        <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 380, padding: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginBottom: 8 }}>Confirmar borrar</div>
            <div style={{ fontSize: 13, color: "#4E6080", marginBottom: 20 }}>
              ¿Seguro que quieres borrar <strong style={{ color: "#C8D8F0" }}>{getNombre(confirmBorrar)}</strong>?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmBorrar(null)} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => borrar(confirmBorrar.id)} style={{ flex: 1, background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 8, color: "#FF5C5C", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sí, borrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(true);
  const [active, setActive] = useState(null);
  const [naves, setNaves] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [migrandoInquilinos, setMigrandoInquilinos] = useState(false);
  const [mostrarMisCapturas, setMostrarMisCapturas] = useState(false);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const pagos = usePagos();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setVerificando(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!usuario) return;
    const rol = getRol(usuario.email);
    setActive(rol === "director" ? "dashboard" : "propietarios");
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    const rol = getRol(usuario.email);
    if (rol === "director") return;
    const unsub = onSnapshot(collection(db, "pendientes"), snap => {
      const total = snap.docs.filter(d => d.data().capturado_por === usuario.email).length;
      setTotalPendientes(total);
    });
    return () => unsub();
  }, [usuario]);

 useEffect(() => {
    if (!usuario) return;
    const unsub = onSnapshot(collection(db, "naves"), async (snap) => {
      if (snap.empty) {
        for (const nave of navesIniciales) {
          await setDoc(doc(db, "naves", nave.id), nave);
        }
        setNaves(navesIniciales);
      } else {
        setNaves(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      setCargando(false);
    });
    return () => unsub();
  }, [usuario]);

  // Migrar inmueble_id de inquilinos de número a string
  const migrarInmuebleIdInquilinos = async () => {
    setMigrandoInquilinos(true);
    const mapa = { 1: "inm1", 2: "inm2", 3: "inm3", 4: "inm4" };
    try {
      const snap = await getDocs(collection(db, "inquilinos"));
      let actualizados = 0;
      for (const d of snap.docs) {
        const inq = d.data();
        if (typeof inq.inmueble_id === "number" && mapa[inq.inmueble_id]) {
          await updateDoc(doc(db, "inquilinos", d.id), { inmueble_id: mapa[inq.inmueble_id] });
          actualizados++;
        }
      }
      alert(`${actualizados} inquilinos migrados correctamente ✅`);
    } catch (e) {
      alert("Error en la migración.");
    }
    setMigrandoInquilinos(false);
  };

  // Verificar si hay inquilinos con inmueble_id numérico
  const [hayInquilinosSinMigrar, setHayInquilinosSinMigrar] = useState(false);
  useEffect(() => {
    if (!usuario) return;
    const unsub = onSnapshot(collection(db, "inquilinos"), snap => {
      const sinMigrar = snap.docs.some(d => typeof d.data().inmueble_id === "number");
      setHayInquilinosSinMigrar(sinMigrar);
    });
    return () => unsub();
  }, [usuario]);

  const handleLogout = async () => {
    await signOut(auth);
    setUsuario(null);
    setNaves([]);
  };

  if (verificando) return (
    <div style={{ minHeight: "100vh", background: "#0A0E17", display: "flex", alignItems: "center", justifyContent: "center", color: "#4E8CFF", fontSize: 16, fontFamily: "sans-serif" }}>
      Verificando sesion...
    </div>
  );

  if (!usuario) return <Login onLogin={() => {}} />;

  if (cargando) return (
    <div style={{ minHeight: "100vh", background: "#0A0E17", display: "flex", alignItems: "center", justifyContent: "center", color: "#4E8CFF", fontSize: 16, fontFamily: "sans-serif" }}>
      Cargando datos...
    </div>
  );

  const rol = getRol(usuario.email);
  const esDirector = rol === "director";

  if (!esDirector && BLOQUEADOS_ADMIN.includes(active)) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#0A0E17", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#E8EDF5" }}>Acceso restringido</div>
        <div style={{ fontSize: 13, color: "#4E6080" }}>No tienes permiso para ver esta sección</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0E17", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#E8EDF5" }}>

      {mostrarMisCapturas && !esDirector && (
        <MisCapturas usuarioEmail={usuario.email} onClose={() => setMostrarMisCapturas(false)} />
      )}

      <aside style={{ width: 240, background: "#0F1520", borderRight: "1px solid #1E2740", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "24px 16px", borderBottom: "1px solid #1E2740", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #00C896, #4E8CFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏗️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>INMOBILIARIA K9</div>
            <div style={{ fontSize: 11, color: "#00C896" }}>● Firebase activo</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {navItems
            .filter(item => esDirector || !item.soloDirector)
            .map(item => (
              <button key={item.id} onClick={() => setActive(item.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left", width: "100%", background: active === item.id ? "rgba(0,200,150,0.1)" : "transparent", color: active === item.id ? "#00C896" : "#5A7090", borderLeft: active === item.id ? "2px solid #00C896" : "2px solid transparent", fontSize: 13, fontWeight: active === item.id ? 600 : 400, marginBottom: 2 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

          {/* Botón temporal migración — solo aparece si hay inquilinos sin migrar */}
          {hayInquilinosSinMigrar && esDirector && (
            <button onClick={migrarInmuebleIdInquilinos} disabled={migrandoInquilinos}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "1px dashed #FFB54744", cursor: migrandoInquilinos ? "default" : "pointer", textAlign: "left", width: "100%", background: "#2A2000", color: "#FFB547", fontSize: 12, fontWeight: 600, marginTop: 8 }}>
              <span style={{ fontSize: 14 }}>🔄</span>
              {migrandoInquilinos ? "Migrando..." : "Migrar inquilinos"}
            </button>
          )}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid #1E2740" }}>
          {!esDirector && (
            <button onClick={() => setMostrarMisCapturas(true)}
              style={{ width: "100%", background: totalPendientes > 0 ? "#2A2000" : "#0F1520", border: `1px solid ${totalPendientes > 0 ? "#FFB54744" : "#1E2740"}`, borderRadius: 8, color: totalPendientes > 0 ? "#FFB547" : "#4E6080", padding: "8px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>📋 Mis capturas</span>
              {totalPendientes > 0 && (
                <span style={{ background: "#FFB547", color: "#0A0E17", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                  {totalPendientes}
                </span>
              )}
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #4E8CFF, #00C896)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
              {usuario.email[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#C8D8F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{usuario.email}</div>
              <div style={{ fontSize: 11, color: esDirector ? "#00C896" : "#4E8CFF", fontWeight: 600 }}>
                {esDirector ? "Director" : "Administrador"}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#FF5C5C", padding: "8px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        {active === "dashboard"    && esDirector && <Dashboard naves={naves} pagos={pagos} />}
        {active === "propietarios" && <Propietarios rol={rol} usuarioEmail={usuario.email} />}
        {active === "naves"        && <Naves naves={naves} setNaves={setNaves} rol={rol} usuarioEmail={usuario.email} />}
        {active === "inquilinos"   && <Inquilinos rol={rol} usuarioEmail={usuario.email} />}
        {active === "cobrar"       && <CuentasPorCobrar naves={naves} pagos={pagos} rol={rol} usuarioEmail={usuario.email} />}
        {active === "gastos"       && <Gastos rol={rol} usuarioEmail={usuario.email} />}
        {active === "aprobaciones" && esDirector && <Aprobaciones />}
        {active === "auditoria"    && esDirector && <Auditoria />}
        {active === "estados"      && <EstadosCuenta rol={rol} />}
        {active === "resumen"      && <ResumenAnual naves={naves} pagos={pagos} rol={rol} />}
      </main>
    </div>
  );
}