
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
  import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDRXqdW8p8rhxT405TzjmqY3g6DnArFmgk",
    authDomain: "drqapp.firebaseapp.com",
    projectId: "drqapp",
    storageBucket: "drqapp.firebasestorage.app",
    messagingSenderId: "443646818076",
    appId: "1:443646818076:web:608982d5f7d97f4ebf6cd9"
  };

  const fbApp = initializeApp(firebaseConfig);
  const db = getFirestore(fbApp);

  // Exposed to the classic (non-module) app script below.
  window.fbUsers = {
    subscribe(callback) {
      return onSnapshot(
        collection(db, 'openplay_users'),
        snap => callback(snap.docs.map(d => d.data())),
        err => console.error('openplay_users snapshot error:', err)
      );
    },
    async upsert(user) {
      await setDoc(doc(db, 'openplay_users', user.id), user);
    },
    async remove(id) {
      await deleteDoc(doc(db, 'openplay_users', id));
    }
  };
