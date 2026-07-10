// Firebase-Konfiguration für Marmotte Bestellungen
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-IlxhLE8XEQsVMKEDX_4by7F1lRIMRdc",
  authDomain: "marmotte-bestellungen.firebaseapp.com",
  projectId: "marmotte-bestellungen",
  storageBucket: "marmotte-bestellungen.firebasestorage.app",
  messagingSenderId: "63484333664",
  appId: "1:63484333664:web:b61b05d1182ba05bf77d05",
  measurementId: "G-2RP90VXXCZ"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);

// Auth und Firestore exportieren, damit andere Dateien sie nutzen können
export const auth = getAuth(app);
export const db = getFirestore(app);
