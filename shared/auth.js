import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, // <-- заменили popup на redirect
  getRedirectResult,  // <-- добавили для обработки возврата
  // ... остальные импорты
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ...

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    // Используем редирект вместо всплывающего окна
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Ошибка входа:", error);
    throw new Error("Не удалось войти через Google.");
  }
}

// Добавь эту функцию для обработки возврата после редиректа
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return result.user;
    }
  } catch (error) {
    console.error("Ошибка при возврате с редиректа:", error);
  }
  return null;
}