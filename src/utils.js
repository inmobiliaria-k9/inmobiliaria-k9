// ─── CALENDARIO AUTOMÁTICO ────────────────────────────────────────────────────
export const hoy = new Date();
export const anioActual = hoy.getFullYear();
export const mesActualIdx = hoy.getMonth();

export const MESES_NOMBRES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

export const MES_ACTUAL = `${MESES_NOMBRES[mesActualIdx]} ${anioActual}`;

export const generarMeses = () => {
  const meses = [];
  for (let anio = 2026; anio <= anioActual; anio++) {
    const limite = anio === anioActual ? mesActualIdx : 11;
    for (let mes = 0; mes <= limite; mes++) {
      meses.push(`${MESES_NOMBRES[mes]} ${anio}`);
    }
  }
  return meses;
};

export const TODOS_LOS_MESES = generarMeses();

// ─── ESTADO AUTOMÁTICO DE PAGO ────────────────────────────────────────────────
export const estadoPagoAutomatico = (mes, pagoDB, rentaBase) => {
  if (pagoDB && pagoDB.estado === "pagado") return "pagado";
  // Abono parcial — tiene pagos pero no completo
  if (pagoDB && pagoDB.estado === "parcial") return "parcial";
  // Si hay monto registrado pero no cubre la renta completa
  if (pagoDB && pagoDB.monto_base && rentaBase) {
    const totalAbonado = Number(pagoDB.monto_base);
    if (totalAbonado > 0 && totalAbonado < rentaBase) return "parcial";
  }
  const [nombreMes, anio] = mes.split(" ");
  const idxMes = MESES_NOMBRES.indexOf(nombreMes);
  const anioMes = parseInt(anio);
  const esMesActual = idxMes === mesActualIdx && anioMes === anioActual;
  const esPasado = anioMes < anioActual || (anioMes === anioActual && idxMes < mesActualIdx);
  if (esMesActual) return "pendiente";
  if (esPasado) return "vencido";
  return "futuro";
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export const getPagoKey = (empresa, mes) =>
  `${empresa.replace(/\s+/g, "_")}__${mes.replace(/\s+/g, "_")}`;

export const calcularEstado = (nave) => {
  if (nave.mantenimiento) return "mantenimiento";
  if (nave.inquilino && nave.inquilino.trim() !== "" && Number(nave.renta) > 0) return "rentada";
  return "disponible";
};

export const calcularPrecioM2 = (renta, m2) => {
  if (!renta || !m2 || Number(m2) === 0) return null;
  return (Number(renta) / Number(m2)).toFixed(2);
};

// ─── CONFIGURACIÓN DE ESTADOS ─────────────────────────────────────────────────
export const estadoConfig = {
  rentada:       { color: "#00C896", bg: "#0D2E1F", label: "Rentada" },
  disponible:    { color: "#4E8CFF", bg: "#0D1A2E", label: "Disponible" },
  mantenimiento: { color: "#FFB547", bg: "#2A2000", label: "Mantenimiento" },
};

export const pagoConfig = {
  pagado:   { color: "#00C896", bg: "#0D2E1F", label: "Pagado" },
  parcial:  { color: "#FFB547", bg: "#2A2000", label: "Parcial" },
  pendiente:{ color: "#FFB547", bg: "#2A2000", label: "Pendiente" },
  vencido:  { color: "#FF5C5C", bg: "#2E0D0D", label: "Vencido" },
  futuro:   { color: "#4E6080", bg: "#141A28", label: "-" },
};

export const inmuebles = [
  { id: 1, nombre: "PARQUE JINT" },
  { id: 2, nombre: "JAGÜEY" },
  { id: 3, nombre: "PARQUE SAN LORENZO" },
  { id: 4, nombre: "AV 15 DE MAYO" },
];

export const navesIniciales = [
  { id: "nave1", inmueble_id: 1, nombre: "NAVE 1", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: "nave2", inmueble_id: 1, nombre: "NAVE 2", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: "nave3", inmueble_id: 1, nombre: "NAVE 3", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: "nave4", inmueble_id: 1, nombre: "NAVE 4", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: "nave5", inmueble_id: 1, nombre: "NAVE 5", m2: 1090, renta: 0, inquilino: "", mantenimiento: false },
  { id: "nave6", inmueble_id: 3, nombre: "NAVE 1", m2: 948,  renta: 0, inquilino: "", mantenimiento: false },
  { id: "nave7", inmueble_id: 3, nombre: "NAVE 2", m2: 1054, renta: 0, inquilino: "", mantenimiento: false },
  { id: "nave8", inmueble_id: 4, nombre: "15 DE MAYO", m2: 4479, renta: 0, inquilino: "", mantenimiento: false },
  { id: "nave9", inmueble_id: 2, nombre: "JAGUEY", m2: 4479, renta: 0, inquilino: "", mantenimiento: false },
];
