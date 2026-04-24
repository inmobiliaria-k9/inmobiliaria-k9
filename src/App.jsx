import { useState, useEffect } from "react";
import { db } from "./firebase";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDocs, setDoc, onSnapshot, addDoc, updateDoc } from "firebase/firestore";
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

const auth = getAuth();

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "propietarios", label: "Propietarios", icon: "🏢" },
  { id: "naves", label: "Inmuebles y Naves", icon: "🏭" },
  { id: "inquilinos", label: "Inquilinos", icon: "👥" },
  { id: "cobrar", label: "Cuentas por Cobrar", icon: "💳" },
  { id: "gastos", label: "Gastos", icon: "📋" },
  { id: "aprobaciones", label: "Aprobaciones", icon: "✅" },
  { id: "estados", label: "Estados de Cuenta", icon: "🏦" },
  { id: "resumen", label: "Resumen Anual", icon: "📊" },
];

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

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(true);
  const [active, setActive] = useState("dashboard");
  const [naves, setNaves] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [migrando, setMigrando] = useState(false);
  const [migrandoInmuebles, setMigrandoInmuebles] = useState(false);
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

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0E17", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#E8EDF5" }}>
      <aside style={{ width: 240, background: "#0F1520", borderRight: "1px solid #1E2740", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "24px 16px", borderBottom: "1px solid #1E2740", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #00C896, #4E8CFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏗️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>INMOBILIARIA K9</div>
            <div style={{ fontSize: 11, color: "#00C896" }}>● Firebase activo</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActive(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left", width: "100%", background: active === item.id ? "rgba(0,200,150,0.1)" : "transparent", color: active === item.id ? "#00C896" : "#5A7090", borderLeft: active === item.id ? "2px solid #00C896" : "2px solid transparent", fontSize: 13, fontWeight: active === item.id ? 600 : 400, marginBottom: 2 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #4E8CFF, #00C896)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
              {usuario.email[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#C8D8F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{usuario.email}</div>
              <div style={{ fontSize: 11, color: "#3A5070" }}>{MES_ACTUAL}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#FF5C5C", padding: "8px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        {active === "dashboard" && <Dashboard naves={naves} pagos={pagos} />}
        {active === "propietarios" && <Propietarios />}
        {active === "naves" && <Naves naves={naves} setNaves={setNaves} />}
        {active === "inquilinos" && <Inquilinos />}
        {active === "cobrar" && <CuentasPorCobrar naves={naves} pagos={pagos} />}
        {active === "gastos" && <Gastos />}
        {active === "aprobaciones" && <Aprobaciones />}
        {active === "estados" && <EstadosCuenta />}
        {active === "resumen" && <ResumenAnual naves={naves} pagos={pagos} />}
      </main>
    </div>
  );
}
