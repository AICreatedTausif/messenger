/* ============================================================
   firebase-config.js — Messenger
   Real Firebase configuration for the Messenger app.
   Connected 2026-11-22 from the google-services.json file
   the user provided (Firebase project white-2k-17-v4).
   This is the web configuration derived from that file.
   ============================================================ */

// Firebase web configuration (values from google-services.json).
const firebaseConfig = {
  apiKey: "AIzaSyAS3UXXrio_-c9uPbHwpDuTVrP-p8d903w",
  authDomain: "white-2k-17-v4.firebaseapp.com",
  databaseURL: "https://white-2k-17-v4-default-rtdb.firebaseio.com",
  projectId: "white-2k-17-v4",
  storageBucket: "white-2k-17-v4.firebasestorage.app",
  messagingSenderId: "180909174928",
  appId: "1:180909174928:android:148861a87d66c6980ca815"
};

/* How the app uses Firebase (once the SDK is loaded in
   index.html and auth.js / chat.js are switched over):
   - Auth: Firebase Authentication (email + password) replaces
     the localStorage login in auth.js.
   - Data: Realtime Database (databaseURL above) replaces the
     localStorage chats in chat.js — messages live under
     /chats/{chatId}/messages, photos as Base64 strings.
   - Storage: Firebase Storage for photos (optional upgrade
     from Base64-in-message).
   Until the switch-over, the app keeps working on localStorage.
   This file only holds the config; it does not initialize
   Firebase by itself. The Firebase SDK scripts and the
   initializeApp call come next in index.html.
 */
