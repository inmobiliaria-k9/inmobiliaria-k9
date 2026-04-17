import { estadoConfig, pagoConfig } from "./utils";

export function Badge({ estado, tipo = "estado" }) {
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
