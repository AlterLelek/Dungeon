// shared/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Твои ключи
const firebaseConfig = {
  apiKey: "AIzaSyAJ1H7-xc2bTKsdFGJKhGZYXmAb-syoGLI",
  authDomain: "dungeon-28.firebaseapp.com",
  projectId: "dungeon-28",
  storageBucket: "dungeon-28.firebasestorage.app",
  messagingSenderId: "99527428676",
  appId: "1:99527428676:web:69aae1be50818977caca11",
  measurementId: "G-9XSDTPV1LL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Ошибка входа:", error);
    throw new Error("Не удалось войти через Google.");
  }
}

export function logout() {
  return signOut(auth);
}

export function onUserChange(callback) {
  return onAuthStateChanged(auth, callback);
}