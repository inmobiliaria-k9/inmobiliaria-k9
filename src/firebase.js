import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDk5dhyaBZK5IS6Sy8u4HuGHojkcco3RKs",
  authDomain: "inmobiliaria-k9.firebaseapp.com",
  projectId: "inmobiliaria-k9",
  storageBucket: "inmobiliaria-k9.firebasestorage.app",
  messagingSenderId: "394825024996",
  appId: "1:394825024996:web:a850fec4b387f8a49cf3f1",
  measurementId: "G-J1X29Q48L4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);