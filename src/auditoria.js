import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const registrarAuditoria = async ({ tipo, modulo, descripcion, detalle = null }) => {
  try {
    const auth = getAuth();
    const usuario = auth.currentUser?.email || "Sistema";
    await addDoc(collection(db, "auditoria"), {
      tipo,
      modulo,
      descripcion,
      detalle,
      usuario,
      fecha: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Error registrando auditoria:", e);
  }
};
