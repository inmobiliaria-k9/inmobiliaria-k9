import { useState, useEffect } from "react";
import { db } from "./firebase";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDocs, setDoc, onSnapshot } from "firebase/firestore";
import { navesIniciales, MES_ACTUAL } from "./utils";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Naves from "./Naves";
import EstadosCuenta from "./EstadosCuenta";
import ResumenAnual from "./ResumenAnual";
import Propietarios from "./Propietarios";
import Inquilinos from "./Inquilinos";

const auth = getAuth();

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "propietarios", label: "Propietarios", icon: "🏢" },
  { id: "naves", label: "Inmuebles y Naves", icon: "🏭" },
  { id: "inquilinos", label: "Inquilinos", icon: "👥" },
  { id: "estados", label: "Estados de Cuenta", icon: "💳" },
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

  const handleLogout = async () => {
    await signOut(auth);
    setUsuario(null);
    setNaves([]);
  };

  if (verificando) return (
    <div style={{ minHeight: "100vh", background: "#0A0E17", display: "flex", alignItems: "center", justifyContent: "center", color: "#4E8CFF", fontSize: 16, fontFamily: "sans-serif" }}>
      🔄 Verificando sesión...
    </div>
  );

  if (!usuario) return <Login onLogin={() => {}} />;

  if (cargando) return (
    <div style={{ minHeight: "100vh", background: "#0A0E17", display: "flex", alignItems: "center", justifyContent: "center", color: "#4E8CFF", fontSize: 16, fontFamily: "sans-serif" }}>
      🔄 Cargando datos...
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
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        {active === "dashboard" && <Dashboard naves={naves} pagos={pagos} />}
        {active === "propietarios" && <Propietarios />}
        {active === "naves" && <Naves naves={naves} setNaves={setNaves} />}
        {active === "inquilinos" && <Inquilinos />}
        {active === "estados" && <EstadosCuenta naves={naves} pagos={pagos} />}
        {active === "resumen" && <ResumenAnual naves={naves} pagos={pagos} />}
      </main>
    </div>
  );
}
