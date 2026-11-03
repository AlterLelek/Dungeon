// shared/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjJH7-xc2bTKsdFGJKhGZYXmAb-syoGlI",
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
  await signInWithRedirect(auth, provider);
}

export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return result.user;
    }
  } catch (error) {
    console.error("Ошибка при возврате с Google:", error);
  }
  return null;
}

export function logout() {
  return signOut(auth);
}

// ВОТ ТА САМАЯ ФУНКЦИЯ, КОТОРУЮ ОН НЕ МОГ НАЙТИ
export function onUserChange(callback) {
  return onAuthStateChanged(auth, callback);
}