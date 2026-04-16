import { useState } from "react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "naves", label: "Inmuebles y Naves", icon: "🏭" },
  { id: "estados", label: "Estados de Cuenta", icon: "💳" },
];

const inmuebles = [
  { id: 1, nombre: "PARQUE JINT" },
  { id: 2, nombre: "JAGÜEY" },
  { id: 3, nombre: "PARQUE SAN LORENZO" },
  { id: 4, nombre: "AV 15 DE MAYO" },
];

const navesIniciales = [
  { id: 1, inmueble_id: 1, nombre: "NAVE 1", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: 2, inmueble_id: 1, nombre: "NAVE 2", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: 3, inmueble_id: 1, nombre: "NAVE 3", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: 4, inmueble_id: 1, nombre: "NAVE 4", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: 5, inmueble_id: 1, nombre: "NAVE 5", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: 6, inmueble_id: 3, nombre: "NAVE 1", m2: 948,  renta: 0, inquilino: "", mantenimiento: false },
  { id: 7, inmueble_id: 3, nombre: "NAVE 2", m2: 1054, renta: 0, inquilino: "", mantenimiento: false },
  { id: 8, inmueble_id: 4, nombre: "15 DE MAYO", m2: 4479, renta: 0, inquilino: "", mantenimiento: false },
  { id: 9, inmueble_id: 2, nombre: "JAGÜEY", m2: 4479, renta: 0, inquilino: "", mantenimiento: false },
];

const mesesSistema = ["Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026"];

function calcularEstado(nave) {
  if (nave.mantenimiento) return "mantenimiento";
  if (nave.inquilino && nave.inquilino.trim() !== "" && Number(nave.renta) > 0) return "rentada";
  return "disponible";
}

function calcularPrecioM2(renta, m2) {
  if (!renta || !m2 || Number(m2) === 0) return null;
  return (Number(renta) / Number(m2)).toFixed(2);
}

const estadoConfig = {
  rentada:       { color: "#00C896", bg: "#0D2E1F", label: "Rentada" },
  disponible:    { color: "#4E8CFF", bg: "#0D1A2E", label: "Disponible" },
  mantenimiento: { color: "#FFB547", bg: "#2A2000", label: "Mantenimiento" },
};

const pagoConfig = {
  pagado:   { color: "#00C896", bg: "#0D2E1F", label: "Pagado" },
  pendiente:{ color: "#FFB547", bg: "#2A2000", label: "Pendiente" },
  vencido:  { color: "#FF5C5C", bg: "#2E0D0D", label: "Vencido" },
};

function Badge({ estado, tipo = "estado" }) {
  const config = tipo === "pago" ? pagoConfig : estadoConfig;
  const c = config[estado];
  if (!c) return null;
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, display: "inline-block" }} />
      {c.label}
    </span>
  );
}

function RegistrarPagoModal({ inquilino, mes, monto, onClose, onSave }) {
  const hoy = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ fecha: hoy, monto: monto, metodo: "Transferencia", notas: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 420 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>✅ Registrar pago</div>
            <div style={{ fontSize: 12, color: "#4E6080", marginTop: 2 }}>{inquilino} · {mes}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {[
            { label: "Monto pagado ($)", key: "monto", type: "number" },
            { label: "Fecha de pago", key: "fecha", type: "date" },
            { label: "Notas (opcional)", key: "notas", type: "text", placeholder: "Referencia, observaciones..." },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>{label}</label>
              <input value={form[key]} onChange={e => set(key, e.target.value)} type={type} placeholder={placeholder}
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>Método de pago</label>
            <select value={form.metodo} onChange={e => set("metodo", e.target.value)}
              style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none" }}>
              {["Transferencia", "Efectivo", "Cheque", "Depósito", "Otro"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => { onSave({ ...form, estado: "pagado" }); onClose(); }} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✅ Confirmar pago</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ naves }) {
  const rentadas = naves.filter(n => calcularEstado(n) === "rentada").length;
  const disponibles = naves.filter(n => calcularEstado(n) === "disponible").length;
  const rentaTotal = naves.reduce((s, n) => s + Number(n.renta), 0);

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>Dashboard</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 24 }}>Resumen general — INMOBILIARIA K9</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total naves", value: naves.length, color: "#4E8CFF", icon: "🏗️" },
          { label: "Rentadas", value: rentadas, color: "#00C896", icon: "✅" },
          { label: "Disponibles", value: disponibles, color: "#4E8CFF", icon: "🔓" },
          { label: "Renta mensual", value: rentaTotal > 0 ? `$${rentaTotal.toLocaleString()}` : "Por definir", color: "#00C896", icon: "💰" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 14, padding: "20px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: i === 3 ? 18 : 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#4E6080", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#C8D8F0", marginBottom: 16 }}>🏭 Inmuebles</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {inmuebles.map(inm => {
            const navesInm = naves.filter(n => n.inmueble_id === inm.id);
            const rentadasInm = navesInm.filter(n => calcularEstado(n) === "rentada").length;
            return (
              <div key={inm.id} style={{ background: "#0A0E17", borderRadius: 10, padding: "14px", border: "1px solid #1E2740" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>🏭</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#C8D8F0", marginBottom: 4 }}>{inm.nombre}</div>
                <div style={{ fontSize: 12, color: "#3A5070" }}>{navesInm.length} naves · {rentadasInm} rentadas</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EditarNaveModal({ nave, onClose, onSave }) {
  const [form, setForm] = useState({ ...nave });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const estadoCalculado = calcularEstado(form);
  const precioM2 = calcularPrecioM2(form.renta, form.m2);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", width: "100%", maxWidth: 480 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>✏️ Editar {nave.nombre}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4E6080", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ background: "#0A0E17", borderRadius: 10, padding: "12px 14px", border: "1px solid #1E2740", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 11, color: "#3A5070", marginBottom: 3 }}>Estado automático</div><Badge estado={estadoCalculado} /></div>
            {precioM2 && <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#3A5070", marginBottom: 3 }}>Precio por m²</div><div style={{ fontSize: 16, fontWeight: 800, color: "#FFB547" }}>${precioM2}</div></div>}
          </div>
          {[
            { label: "Nombre de la nave", key: "nombre", type: "text" },
            { label: "Metros cuadrados (m²)", key: "m2", type: "number" },
            { label: "Renta mensual ($)", key: "renta", type: "number" },
            { label: "Inquilino / Empresa", key: "inquilino", type: "text" },
          ].map(({ label, key, type }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#4E6080", marginBottom: 5, fontWeight: 600 }}>{label}</label>
              <input value={form[key] || ""} onChange={e => set(key, e.target.value)} type={type}
                style={{ width: "100%", background: "#0A0E17", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0A0E17", borderRadius: 10, padding: "12px 14px", border: "1px solid #1E2740" }}>
            <div><div style={{ fontSize: 13, color: "#C8D8F0", fontWeight: 600 }}>🔧 En mantenimiento</div><div style={{ fontSize: 11, color: "#3A5070" }}>Activa si está fuera de servicio</div></div>
            <div onClick={() => set("mantenimiento", !form.mantenimiento)} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: form.mantenimiento ? "#FFB547" : "#1A2535", position: "relative", border: `1px solid ${form.mantenimiento ? "#FFB547" : "#1E2740"}` }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.mantenimiento ? 22 : 2, transition: "all 0.2s" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#1A2535", border: "1px solid #1E2740", borderRadius: 8, color: "#4E6080", padding: 11, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => { onSave({ ...form, estado: estadoCalculado }); onClose(); }} style={{ flex: 2, background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Naves({ naves, setNaves }) {
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const guardarNave = (updated) => setNaves(ns => ns.map(n => n.id === updated.id ? { ...n, ...updated } : n));
  const agregarNave = (inmueble_id) => {
    const nombre = prompt("Nombre de la nave:");
    const m2 = prompt("Metros cuadrados:");
    if (nombre && m2) setNaves(ns => [...ns, { id: Date.now(), inmueble_id, nombre, m2: Number(m2), renta: 0, inquilino: "", mantenimiento: false }]);
  };

  const rentaTotal = naves.reduce((s, n) => s + Number(n.renta), 0);
  const rentadas = naves.filter(n => calcularEstado(n) === "rentada").length;
  const m2Rentados = naves.filter(n => calcularEstado(n) === "rentada").reduce((s, n) => s + Number(n.m2), 0);

  return (
    <div style={{ padding: "28px" }}>
      {editando && <EditarNaveModal nave={editando} onClose={() => setEditando(null)} onSave={guardarNave} />}
      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>🏭 Inmuebles y Naves</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>{inmuebles.length} inmuebles · {naves.length} naves</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total naves", naves.length, "#4E8CFF"],
          ["Rentadas", rentadas, "#00C896"],
          ["Disponibles", naves.filter(n => calcularEstado(n) === "disponible").length, "#4E8CFF"],
          ["Renta mensual", rentaTotal > 0 ? `$${rentaTotal.toLocaleString()}` : "—", "#00C896"],
          ["Precio prom. m²", m2Rentados > 0 ? `$${(rentaTotal / m2Rentados).toFixed(2)}` : "—", "#FFB547"],
        ].map(([l, v, c], i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 10, padding: "14px 16px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: i > 2 ? 14 : 22, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar..."
          style={{ flex: 1, minWidth: 220, background: "#0F1520", border: "1px solid #1E2740", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#E8EDF5", outline: "none" }} />
        {["todos", "rentada", "disponible", "mantenimiento"].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{ background: filtro === f ? "#1A2535" : "none", border: `1px solid ${filtro === f ? "#4E8CFF" : "#1E2740"}`, borderRadius: 20, color: filtro === f ? "#4E8CFF" : "#4E6080", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {f === "todos" ? "Todos" : estadoConfig[f]?.label}
          </button>
        ))}
      </div>
      {inmuebles.map(inm => {
        const navesInm = naves.filter(n => n.inmueble_id === inm.id);
        const rentadasInm = navesInm.filter(n => calcularEstado(n) === "rentada").length;
        const rentaInm = navesInm.reduce((s, n) => s + Number(n.renta), 0);
        return (
          <div key={inm.id} style={{ background: "#0F1520", borderRadius: 16, border: "1px solid #1E2740", overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E2740", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0A0E17" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1A2535", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏭</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5" }}>{inm.nombre}</div>
                  <div style={{ fontSize: 12, color: "#3A5070" }}>
                    {navesInm.length} naves · {navesInm.reduce((s, n) => s + Number(n.m2), 0).toLocaleString()} m²
                    {rentaInm > 0 && <span style={{ color: "#00C896" }}> · ${rentaInm.toLocaleString()}/mes</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: rentadasInm === navesInm.length ? "#00C896" : "#FFB547" }}>{rentadasInm}/{navesInm.length}</div>
                  <div style={{ fontSize: 11, color: "#3A5070" }}>rentadas</div>
                </div>
                <button onClick={() => agregarNave(inm.id)} style={{ background: "linear-gradient(135deg, #00C896, #4E8CFF)", border: "none", borderRadius: 8, color: "#fff", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Nave</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, padding: 16 }}>
              {navesInm.map(nave => {
                const estado = calcularEstado(nave);
                const precioM2 = calcularPrecioM2(nave.renta, nave.m2);
                return (
                  <div key={nave.id} style={{ background: "#0A0E17", borderRadius: 12, border: `1px solid ${estadoConfig[estado].color}22`, padding: "14px", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = estadoConfig[estado].color + "66"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = estadoConfig[estado].color + "22"}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 26 }}>🏗️</span>
                      <Badge estado={estado} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>{nave.nombre}</div>
                    <div style={{ fontSize: 13, color: "#4E6080", marginBottom: 6 }}>📐 {Number(nave.m2).toLocaleString()} m²</div>
                    {Number(nave.renta) > 0 ? (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#00C896" }}>${Number(nave.renta).toLocaleString()}<span style={{ fontSize: 10, color: "#3A5070", fontWeight: 400 }}>/mes</span></div>
                        {precioM2 && <div style={{ fontSize: 12, color: "#FFB547", fontWeight: 600 }}>${precioM2}/m²</div>}
                      </div>
                    ) : <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 8 }}>Renta: por definir</div>}
                    {nave.inquilino && <div style={{ fontSize: 11, color: "#4E8CFF", marginBottom: 8, background: "#0D1A2E", borderRadius: 6, padding: "4px 8px" }}>🏢 {nave.inquilino}</div>}
                    <button onClick={() => setEditando(nave)} style={{ width: "100%", background: "#1A2535", border: "1px solid #1E2740", borderRadius: 7, color: "#4E6080", padding: "6px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏️ Editar</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EstadosCuenta({ naves }) {
  const [mesFiltro, setMesFiltro] = useState("Abril 2026");
  const [registrando, setRegistrando] = useState(null);

  const getInquilinos = () => Object.values(
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

  const [pagos, setPagos] = useState(() => {
    const inicial = {};
    getInquilinos().forEach(inq => {
      mesesSistema.forEach((mes, idx) => {
        inicial[`${inq.empresa}__${mes}`] = {
          estado: idx < 3 ? "pagado" : "pendiente",
          fecha_pago: idx < 3 ? `2026-0${idx + 1}-05` : null,
          monto: inq.renta,
          metodo: "Transferencia",
        };
      });
    });
    return inicial;
  });

  const inquilinos = getInquilinos();

  const registrarPago = (empresa, mes, data) => {
    setPagos(p => ({ ...p, [`${empresa}__${mes}`]: { ...p[`${empresa}__${mes}`], ...data } }));
  };

  const pagosDeMes = inquilinos.map(inq => ({
    ...inq,
    pago: pagos[`${inq.empresa}__${mesFiltro}`] || { estado: "pendiente", monto: inq.renta },
  }));

  const totalMes = pagosDeMes.reduce((s, i) => s + i.renta, 0);
  const cobradoMes = pagosDeMes.filter(i => i.pago.estado === "pagado").reduce((s, i) => s + i.renta, 0);
  const pendienteMes = totalMes - cobradoMes;

  return (
    <div style={{ padding: "28px" }}>
      {registrando && (
        <RegistrarPagoModal
          inquilino={registrando.empresa}
          mes={mesFiltro}
          monto={registrando.renta}
          onClose={() => setRegistrando(null)}
          onSave={(data) => registrarPago(registrando.empresa, mesFiltro, data)}
        />
      )}
      <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>💳 Estados de Cuenta</div>
      <div style={{ fontSize: 12, color: "#3A5070", marginBottom: 20 }}>{inquilinos.length} inquilinos activos</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {mesesSistema.map(m => (
          <button key={m} onClick={() => setMesFiltro(m)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${mesFiltro === m ? "#4E8CFF" : "#1E2740"}`, background: mesFiltro === m ? "#0D1A2E" : "#0F1520", color: mesFiltro === m ? "#4E8CFF" : "#4E6080", fontSize: 13, fontWeight: mesFiltro === m ? 700 : 400, cursor: "pointer" }}>{m}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total a cobrar", `$${totalMes.toLocaleString()}`, "#E8EDF5"],
          ["Cobrado", `$${cobradoMes.toLocaleString()}`, "#00C896"],
          ["Pendiente", `$${pendienteMes.toLocaleString()}`, pendienteMes > 0 ? "#FF5C5C" : "#00C896"],
        ].map(([l, v, c], i) => (
          <div key={i} style={{ background: "#0F1520", borderRadius: 10, padding: "14px 16px", border: "1px solid #1E2740" }}>
            <div style={{ fontSize: 11, color: "#4E6080", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {inquilinos.length === 0 ? (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", padding: "60px", textAlign: "center", color: "#3A5070" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
          <div>No hay naves rentadas aún</div>
        </div>
      ) : (
        <div style={{ background: "#0F1520", borderRadius: 14, border: "1px solid #1E2740", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#080C14" }}>
                {["Inquilino", "Naves", "Renta mensual", `Estado ${mesFiltro}`, "Acción"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", fontSize: 11, color: "#3A5070", textAlign: "left", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagosDeMes.map((inq, i) => (
                <tr key={i} style={{ borderTop: "1px solid #141A28" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#141A28"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #4E8CFF, #00C896)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>{inq.empresa[0]}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#C8D8F0" }}>{inq.empresa}</div>
                        {inq.pago.fecha_pago && <div style={{ fontSize: 11, color: "#3A5070" }}>Pagó: {inq.pago.fecha_pago}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {inq.naves.map((n, j) => <div key={j} style={{ fontSize: 11, color: "#4E6080" }}>🏗️ {n.inmueble} — {n.nombre}</div>)}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: "#00C896" }}>${inq.renta.toLocaleString()}</td>
                  <td style={{ padding: "14px 16px" }}><Badge estado={inq.pago.estado} tipo="pago" /></td>
                  <td style={{ padding: "14px 16px" }}>
                    {inq.pago.estado !== "pagado" ? (
                      <button onClick={() => setRegistrando(inq)} style={{ background: "#0D2E1F", border: "1px solid #00C89633", borderRadius: 8, color: "#00C896", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        ✅ Registrar pago
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "#3A5070" }}>✓ {inq.pago.metodo}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [naves, setNaves] = useState(navesIniciales);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0E17", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#E8EDF5" }}>
      <aside style={{ width: 240, background: "#0F1520", borderRight: "1px solid #1E2740", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "24px 16px", borderBottom: "1px solid #1E2740", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #00C896, #4E8CFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏗️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>INMOBILIARIA K9</div>
            <div style={{ fontSize: 11, color: "#4E6080" }}>Panel de Control</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActive(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left", width: "100%", background: active === item.id ? "rgba(0,200,150,0.1)" : "transparent", color: active === item.id ? "#00C896" : "#5A7090", borderLeft: active === item.id ? "2px solid #00C896" : "2px solid transparent", fontSize: 13, fontWeight: active === item.id ? 600 : 400, marginBottom: 2 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px", borderTop: "1px solid #1E2740", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #4E8CFF, #00C896)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>A</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#C8D8F0" }}>Administrador</div>
            <div style={{ fontSize: 11, color: "#3A5070" }}>inmobiliaria-k9</div>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: "auto" }}>
        {active === "dashboard" && <Dashboard naves={naves} />}
        {active === "naves" && <Naves naves={naves} setNaves={setNaves} />}
        {active === "estados" && <EstadosCuenta naves={naves} />}
      </main>
    </div>
  );
}
