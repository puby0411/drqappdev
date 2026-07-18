// Classic (non-module) script — works fine under file:// unlike ES modules.
// Uses the Firebase "compat" build, which exposes a global `firebase` object
// instead of requiring import statements.
var firebaseConfig = {
  apiKey: "AIzaSyDRXqdW8p8rhxT405TzjmqY3g6DnArFmgk",
  authDomain: "drqapp.firebaseapp.com",
  projectId: "drqapp",
  storageBucket: "drqapp.firebasestorage.app",
  messagingSenderId: "443646818076",
  appId: "1:443646818076:web:608982d5f7d97f4ebf6cd9"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

// Exposed to the classic app.js script that loads after this one.
window.fbUsers = {
  subscribe: function (callback) {
    return db.collection('openplay_users').onSnapshot(
      function (snap) { callback(snap.docs.map(function (d) { return d.data(); })); },
      function (err) { console.error('openplay_users snapshot error:', err); }
    );
  },
  upsert: function (user) {
    return db.collection('openplay_users').doc(user.id).set(user);
  },
  remove: function (id) {
    return db.collection('openplay_users').doc(id).delete();
  }
};
