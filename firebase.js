import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCfQsfhDnzKpOfQf8JbmKN2atyRxFABQV0",
  authDomain: "project-8033358772464005077.firebaseapp.com",
  projectId: "project-8033358772464005077",
  storageBucket: "project-8033358772464005077.firebasestorage.app",
  messagingSenderId: "795510971836",
  appId: "1:795510971836:web:c1d96d8a20255fc39e1fb9"
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
