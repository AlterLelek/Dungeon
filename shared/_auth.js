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

// Твои ключи из консоли Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAJ1H7-xc2bTKsdFGJKhGZYXmAb-syoGLI",
  authDomain: "dungeon-28.firebaseapp.com",
  projectId: "dungeon-28",
  storageBucket: "dungeon-28.firebasestorage.app",
  messagingSenderId: "99527428676",
  appId: "1:99527428676:web:69aae1be50818977caca11",
  measurementId: "G-9XSDTPV1LL"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Функция для входа через Google
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user; // Возвращаем объект пользователя (uid, displayName, photoURL и т.д.)
  } catch (error) {
    console.error("Ошибка входа:", error);
    return null;
  }
}

// Функция для выхода
export function logout() {
  return signOut(auth);
}

// Слушатель изменения состояния авторизации
export function onUserChange(callback) {
  return onAuthStateChanged(auth, callback);
}