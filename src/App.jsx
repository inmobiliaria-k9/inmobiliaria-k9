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

const TIPO_LABELS = {
  propietario: "Propietario",
  inmueble: "Inmueble",
  nave: "Nave",
  inquilino: "Inquilino",
  pago: "Pago",
  gasto: "Gasto",
};

const TIPO_ICONS = {
  propietario: "🏢",
  inmueble: "🏭",
  nave: "🏗️",
  inquilino: "👥",
  pago: "💰",
  gasto: "📋",
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

// ─── PANEL MIS CAPTURAS ───────────────────────────────────────────────────────
function MisCapturas({ usuarioEmail, onClose }) {
  const [pendientes, setPendientes] = useState([]);
  const [confirmBorrar, setConfirmBorrar] = useState(null);

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

  const getNombre = (item) => {
    if (item.tipo_movimiento === "pago") return `${item.empresa} — ${item.mes}`;
    if (item.tipo_movimiento === "gasto") return item.concepto;
    if (item.tipo_movimiento === "inquilino") return item.alias;
    return item.nombre;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const [y, m, d] = fecha.split("T")[0].split("-");
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d} ${meses[parseInt(m) - 1]} ${y}`;
  };

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000AA", zIndex: 300 }} />

      {/* Panel */}
      <div style={{ position: "fixed", top: 0, right: 0, width: 420, height: "100vh", background: "#0F1520", borderLeft: "1px solid #1E2740", zIndex: 301, display: "flex", flexDirection: "column" }}>

        {/* Header */}
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

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {pendientes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#3A5070" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>No tienes capturas pendientes</div>
              <div style={{ fontSize: 12 }}>Todo ha sido aprobado</div>
            </div>
          ) : (
            pendientes.map(item => (
              <div key={item.id} style={{ background: "#0A0E17", borderRadius: 12, border: "1px solid #1E2740", padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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

                {item.tipo_movimiento === "pago" && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#4E6080" }}>
                    Monto: <span style={{ color: "#00C896", fontWeight: 600 }}>${Number(item.monto_base || 0).toLocaleString()}</span>
                  </div>
                )}
                {item.tipo_movimiento === "gasto" && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#4E6080" }}>
                    Monto: <span style={{ color: "#FF5C5C", fontWeight: 600 }}>${Number(item.monto || 0).toLocaleString()}</span>
                  </div>
                )}

                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setConfirmBorrar(item)}
                    style={{ background: "#2E0D0D", border: "1px solid #FF5C5C33", borderRadius: 6, color: "#FF5C5C", padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Borrar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirm borrar */}
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
  const [migrando, setMigrando] = useState(false);
  const [migrandoInmuebles, setMigrandoInmuebles] = useState(false);
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

  // Contar pendientes del administrador
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
    const inicializar = async () => {
      try {
        const snap = await getDocs(collection(db, "naves"));
        if (snap.empty) {
          for (const nave of navesIniciales) {
            await setDoc(doc(db, "naves", nave.id), nave);
          }
          setNaves(navesIniciales);
        } else {
          setNaves(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) {
        console.error(e);
        setNaves(navesIniciales);
      }
      setCargando(false);
    };
    inicializar();
  }, [usuario]);

  const navesConIdNumerico = naves.filter(n => typeof n.inmueble_id === "number");

  const migrarInmuebles = async () => {
    setMigrandoInmuebles(true);
    try {
      const mapa = { 1: "inm1", 2: "inm2", 3: "inm3", 4: "inm4" };
      const snap = await getDocs(collection(db, "naves"));
      let actualizadas = 0;
      for (const d of snap.docs) {
        const nave = d.data();
        if (typeof nave.inmueble_id === "number" && mapa[nave.inmueble_id]) {
          await updateDoc(doc(db, "naves", d.id), { inmueble_id: mapa[nave.inmueble_id] });
          actualizadas++;
        }
      }
      const snap2 = await getDocs(collection(db, "naves"));
      setNaves(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
      alert(`${actualizadas} naves migradas.`);
    } catch (e) { alert("Error en la migracion."); }
    setMigrandoInmuebles(false);
  };

  const migrarInquilinos = async () => {
    setMigrando(true);
    try {
      const navesSnap = await getDocs(collection(db, "naves"));
      const todasNaves = navesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const navesConInquilino = todasNaves.filter(n => n.inquilino && n.inquilino.trim() !== "");
      const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
      const aliasExistentes = inquilinosSnap.docs.map(d => d.data().alias?.toLowerCase());
      let creados = 0;
      for (const nave of navesConInquilino) {
        const alias = nave.inquilino.trim();
        if (aliasExistentes.includes(alias.toLowerCase())) continue;
        await addDoc(collection(db, "inquilinos"), {
          alias, razon_social: "", rfc: "", contacto: "", telefono: "", correo: "",
          nave_id: nave.id, inmueble_id: nave.inmueble_id,
          fecha_inicio: "", fecha_fin: "", notas: "Migrado automaticamente",
        });
        creados++;
      }
      alert(`${creados} inquilinos creados.`);
      setActive("inquilinos");
    } catch (e) { alert("Error en la migracion."); }
    setMigrando(false);
  };

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

      {/* Panel Mis Capturas */}
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

          {navesConIdNumerico.length > 0 && (
            <button onClick={migrarInmuebles} disabled={migrandoInmuebles}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "1px dashed #FFB54744", cursor: migrandoInmuebles ? "default" : "pointer", textAlign: "left", width: "100%", background: "#2A2000", color: "#FFB547", fontSize: 12, fontWeight: 600, marginTop: 8 }}>
              <span style={{ fontSize: 14 }}>🔄</span>
              {migrandoInmuebles ? "Migrando..." : "Migrar naves"}
            </button>
          )}

          {naves.some(n => n.inquilino && n.inquilino.trim() !== "") && (
            <button onClick={migrarInquilinos} disabled={migrando}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "1px dashed #FFB54744", cursor: migrando ? "default" : "pointer", textAlign: "left", width: "100%", background: "#2A2000", color: "#FFB547", fontSize: 12, fontWeight: 600, marginTop: 4 }}>
              <span style={{ fontSize: 14 }}>🔄</span>
              {migrando ? "Migrando..." : "Migrar inquilinos"}
            </button>
          )}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid #1E2740" }}>

          {/* Botón Mis Capturas — solo para administrador */}
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