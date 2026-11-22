/* ============================================================
   auth.js — Messenger (Firebase version)
   Full A-to-Z login system using Firebase Authentication.
   - Sign up (email + password, display name, strength meter)
   - Login + Firebase session (onAuthStateChanged)
   - Forgot password via Firebase reset email
   - Demo account (created in Firebase on first use)
   The old localStorage user store is gone — users now live
   in Firebase Auth. Config: js/firebase-config.js.
   NOTE: Email/Password sign-in must be enabled in the Firebase
   console for this project, or login will show that message.
   ============================================================ */

/* ---------- toast ---------- */
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 3000);
}

/* ---------- current user (from Firebase Auth) ---------- */
function getCurrentUser() {
  const u = firebase.auth().currentUser;
  if (!u) return null;
  return { name: u.displayName || u.email.split("@")[0], email: u.email, uid: u.uid };
}

/* ---------- password strength ---------- */
function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..5
}
function renderStrength(pw) {
  const bar = document.getElementById("strengthBar");
  const text = document.getElementById("strengthText");
  if (!bar || !text) return;
  const score = passwordStrength(pw);
  const pct = ["0%", "20%", "40%", "60%", "80%", "100%"][score];
  const colors = ["#ef4444", "#ef4444", "#f59e0b", "#f59e0b", "#22c55e", "#22c55e"];
  const labels = ["খুব দুর্বল", "দুর্বল", "মোটামুটি", "ভালো", "শক্তিশালী", "খুব শক্তিশালী"];
  bar.style.setProperty("--w", pct);
  bar.style.setProperty("--c", colors[score]);
  text.textContent = pw ? labels[score] : "";
}

/* ---------- auth screen tabs ---------- */
function showAuthForm(which) {
  const login = document.getElementById("loginForm");
  const signup = document.getElementById("signupForm");
  const forgot = document.getElementById("forgotForm");
  login.classList.toggle("hidden", which !== "login");
  signup.classList.toggle("hidden", which !== "signup");
  forgot.classList.toggle("hidden", which !== "forgot");
  document.getElementById("tabLogin").classList.toggle("active", which === "login");
  document.getElementById("tabSignup").classList.toggle("active", which === "signup");
}

/* ---------- Firebase error messages in Bengali ---------- */
function firebaseAuthErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use": return "এই ইমেইল দিয়ে অ্যাকাউন্ট আগেই আছে — লগইন করুন।";
    case "auth/invalid-email": return "সঠিক ইমেইল দিন।";
    case "auth/weak-password": return "পাসওয়ার্ড আরও শক্ত করুন (কমপক্ষে ৬ অক্ষর)।";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে।";
    case "auth/operation-not-allowed": return "Firebase console-এ Email/Password লগইন চালু করা নেই — ওখান থেকে চালু করতে হবে।";
    case "auth/too-many-requests": return "অনেকবার চেষ্টা হয়েছে — কিছুক্ষণ পরে আবার চেষ্টা করুন।";
    case "auth/network-request-failed": return "ইন্টারনেট সংযোগে সমস্যা — আবার চেষ্টা করুন।";
    default: return "কিছু একটা ভুল হয়েছে — আবার চেষ্টা করুন।";
  }
}

/* ---------- sign up (Firebase Auth) ---------- */
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pw = document.getElementById("signupPassword").value;
  const confirm = document.getElementById("signupConfirm").value;
  const err = document.getElementById("signupError");

  if (!name || !email || !pw) { err.textContent = "সব ঘর পূরণ করুন।"; return; }
  if (pw.length < 6) { err.textContent = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।"; return; }
  if (pw !== confirm) { err.textContent = "দুই পাসওয়ার্ড মিলছে না।"; return; }
  err.textContent = "";
  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, pw);
    await cred.user.updateProfile({ displayName: name });
    showToast("অ্যাকাউন্ট তৈরি হয়েছে, স্বাগতম " + name + "!");
    enterApp();
  } catch (error) {
    err.textContent = firebaseAuthErrorMessage(error.code);
  }
}

/* ---------- login (Firebase Auth) ---------- */
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pw = document.getElementById("loginPassword").value;
  const err = document.getElementById("loginError");
  err.textContent = "";
  try {
    await firebase.auth().signInWithEmailAndPassword(email, pw);
    const u = getCurrentUser();
    showToast("স্বাগতম, " + (u ? u.name : "") + "!");
    enterApp();
  } catch (error) {
    err.textContent = firebaseAuthErrorMessage(error.code);
  }
}

/* ---------- demo login (Firebase) ---------- */
async function demoLogin() {
  try {
    await firebase.auth().signInWithEmailAndPassword("demo@messenger.app", "demo123");
  } catch (error) {
    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
      try {
        const cred = await firebase.auth().createUserWithEmailAndPassword("demo@messenger.app", "demo123");
        await cred.user.updateProfile({ displayName: "Demo User" });
      } catch (e2) {
        showToast(firebaseAuthErrorMessage(e2.code));
        return;
      }
    } else {
      showToast(firebaseAuthErrorMessage(error.code));
      return;
    }
  }
  showToast("ডেমো অ্যাকাউন্টে ঢোকা হয়েছে।");
  enterApp();
}

/* ---------- forgot password (Firebase reset email) ---------- */
async function sendResetCode() {
  const email = document.getElementById("forgotEmail").value.trim();
  const err = document.getElementById("forgotError");
  if (!email) { err.textContent = "ইমেইল দিন।"; return; }
  err.textContent = "";
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    showToast("পাসওয়ার্ড বদলের লিংক ইমেইলে পাঠানো হয়েছে।");
    showAuthForm("login");
  } catch (error) {
    err.textContent = firebaseAuthErrorMessage(error.code);
  }
}
/* The old 6-digit code step is not used anymore — Firebase
   sends a reset link to the email instead. */
function resetPassword() {
  document.getElementById("forgotError").textContent =
    "Firebase এখন ইমেইলে রিসেট লিংক পাঠায় — কোড লাগে না।";
}

/* ---------- logout ---------- */
async function logout() {
  try { await firebase.auth().signOut(); } catch (e) {}
  document.getElementById("appScreen").classList.add("hidden");
  document.getElementById("authScreen").classList.remove("hidden");
  showAuthForm("login");
  showToast("লগআউট হয়ে গেছে।");
}

/* ---------- wire up ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Firebase session: if already signed in, go straight into the app.
  firebase.auth().onAuthStateChanged((user) => {
    if (user) enterApp();
  });

  document.getElementById("tabLogin").addEventListener("click", () => showAuthForm("login"));
  document.getElementById("tabSignup").addEventListener("click", () => showAuthForm("signup"));
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("signupForm").addEventListener("submit", handleSignup);
  document.getElementById("signupPassword").addEventListener("input", (e) => renderStrength(e.target.value));
  document.getElementById("demoLoginBtn").addEventListener("click", demoLogin);
  document.getElementById("forgotLink").addEventListener("click", () => showAuthForm("forgot"));
  document.getElementById("backToLoginBtn").addEventListener("click", () => showAuthForm("login"));
  document.getElementById("sendCodeBtn").addEventListener("click", sendResetCode);
  document.getElementById("resetPasswordBtn").addEventListener("click", resetPassword);
  document.getElementById("logoutBtn").addEventListener("click", logout);
});
