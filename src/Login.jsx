import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const auth = getAuth();

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Por favor ingresa tu correo y contraseña.");
      return;
    }
    setCargando(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (e) {
      setError("Correo o contraseña incorrectos.");
    }
    setCargando(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0E17",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "'DM Sans','Segoe UI',sans-serif"
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, #00C896, #4E8CFF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, margin: "0 auto 16px"
          }}>🏗️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 6 }}>INMOBILIARIA K9</div>
          <div style={{ fontSize: 13, color: "#4E6080" }}>Sistema de administración de naves</div>
        </div>

        {/* Card */}
        <div style={{
          background: "#0F1520", borderRadius: 16,
          border: "1px solid #1E2740", padding: 28
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginBottom: 20 }}>
            Iniciar sesión
          </div>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 6, fontWeight: 600 }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{
                width: "100%", background: "#0A0E17", border: "1px solid #1E2740",
                borderRadius: 8, padding: "10px 12px", fontSize: 13,
                color: "#E8EDF5", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 6, fontWeight: 600 }}>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={verPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{
                  width: "100%", background: "#0A0E17", border: "1px solid #1E2740",
                  borderRadius: 8, padding: "10px 40px 10px 12px", fontSize: 13,
                  color: "#E8EDF5", outline: "none", boxSizing: "border-box"
                }}
              />
              <button
                onClick={() => setVerPassword(!verPassword)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#4E8CFF",
                  fontSize: 11, cursor: "pointer", fontWeight: 600
                }}
              >{verPassword ? "Ocultar" : "Ver"}</button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "#2E0D0D", border: "1px solid #FF5C5C33",
              borderRadius: 8, padding: "10px 12px", fontSize: 13,
              color: "#FF5C5C", marginBottom: 16
            }}>{error}</div>
          )}

          {/* Botón */}
          <button
            onClick={handleLogin}
            disabled={cargando}
            style={{
              width: "100%", background: cargando ? "#1A2535" : "linear-gradient(135deg, #00C896, #4E8CFF)",
              border: "none", borderRadius: 8, padding: 12,
              fontSize: 14, fontWeight: 700, color: cargando ? "#4E6080" : "#fff",
              cursor: cargando ? "default" : "pointer", marginBottom: 16
            }}
          >
            {cargando ? "Verificando..." : "Entrar al sistema"}
          </button>

          <div style={{ textAlign: "center", fontSize: 12, color: "#3A5070" }}>
            ¿Olvidaste tu contraseña?{" "}
            <span style={{ color: "#4E8CFF", cursor: "pointer" }}>Recuperar acceso</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C896" }}></div>
          <div style={{ fontSize: 11, color: "#3A5070" }}>Sistema seguro · Firebase Authentication</div>
        </div>
      </div>
    </div>
  );
}
