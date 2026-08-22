import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA0Uy-AkpUlXFpXKar4nmdB9t7bFm__kxA",
  authDomain: "gamehub-portal.firebaseapp.com",
  projectId: "gamehub-portal",
  storageBucket: "gamehub-portal.firebasestorage.app",
  messagingSenderId: "29607090608",
  appId: "1:29607090608:web:db1763fc3520067e569e75",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);