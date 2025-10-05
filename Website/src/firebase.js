import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBY9qrrtw9Yc7vY-FdMUiZaVzLo-8FD3XA",
    authDomain: "bunte-liga-freiburg.firebaseapp.com",
    projectId: "bunte-liga-freiburg",
    storageBucket: "bunte-liga-freiburg.firebasestorage.app",
    messagingSenderId: "850773074697",
    appId: "1:850773074697:web:c6f03bdcf8f17f8bb429d8",
    measurementId: "G-0R4PF6S567"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };