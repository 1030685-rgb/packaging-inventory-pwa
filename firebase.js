import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "請填入",
  authDomain: "請填入",
  projectId: "請填入",
  storageBucket: "請填入",
  messagingSenderId: "請填入",
  appId: "請填入"
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => value && value !== "請填入"
);

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
