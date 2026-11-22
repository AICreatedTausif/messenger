/* ============================================================
   auth.js — Messenger
   Full A-to-Z login system (demo grade, browser storage).
   - Sign up with password strength meter
   - Login + session
   - Forgot password with 6-digit code
   - Demo account
   NOTE: passwords are stored with a simple demo hash in
   localStorage. When Firebase is connected, Firebase Auth
   replaces this whole file — see js/firebase-config.js.
   ============================================================ */

const USERS_KEY = "messenger_users";
const SESSION_KEY = "messenger_session";
const RESET_KEY = "messenger_reset";

/* ---------- tiny storage helpers ---------- */
function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch (e) { return []; }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function findUser(email) {
  return loadUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

/* Demo-only hash (NOT secure — Firebase Auth replaces it later). */
function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
  }
  return "demo-" + Math.abs(h) + "-" + pw.length;
}

/* ---------- session ---------- */
function setSession(email) { localStorage.setItem(SESSION_KEY, email); }
function getSession() { return localStorage.getItem(SESSION_KEY); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function getCurrentUser() {
  const email = getSession();
  return email ? findUser(email) : null;
}

/* ---------- toast ---------- */
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 3000);
}

/* ---------- demo account ---------- */
function seedDemoUser() {
  const users = loadUsers();
  if (!findUser("demo@messenger.app")) {
    users.push({
      name: "Demo User",
      email: "demo@messenger.app",
      passHash: hashPassword("demo123"),
      createdAt: new Date().toISOString()
    });
    saveUsers(users);
  }
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

/* ---------- sign up ---------- */
function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pw = document.getElementById("signupPassword").value;
  const confirm = document.getElementById("signupConfirm").value;
  const err = document.getElementById("signupError");

  if (!name || !email || !pw) { err.textContent = "সব ঘর পূরণ করুন।"; return; }
  if (pw.length < 6) { err.textContent = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।"; return; }
  if (pw !== confirm) { err.textContent = "দুই পাসওয়ার্ড মিলছে না।"; return; }
  if (findUser(email)) { err.textContent = "এই ইমেইল দিয়ে অ্যাকাউন্ট আগেই আছে — লগইন করুন।"; return; }

  const users = loadUsers();
  users.push({ name, email, passHash: hashPassword(pw), createdAt: new Date().toISOString() });
  saveUsers(users);
  setSession(email);
  showToast("অ্যাকাউন্ট তৈরি হয়েছে, স্বাগতম " + name + "!");
  enterApp();
}

/* ---------- login ---------- */
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pw = document.getElementById("loginPassword").value;
  const err = document.getElementById("loginError");
  const user = findUser(email);

  if (!user || user.passHash !== hashPassword(pw)) {
    err.textContent = "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে।";
    return;
  }
  err.textContent = "";
  setSession(email);
  showToast("স্বাগতম, " + user.name + "!");
  enterApp();
}

function demoLogin() {
  seedDemoUser();
  setSession("demo@messenger.app");
  showToast("ডেমো অ্যাকাউন্টে ঢোকা হয়েছে।");
  enterApp();
}

/* ---------- forgot password (6-digit code) ---------- */
function sendResetCode() {
  const email = document.getElementById("forgotEmail").value.trim();
  const err = document.getElementById("forgotError");
  if (!findUser(email)) { err.textContent = "এই ইমেইলে কোনো অ্যাকাউন্ট নেই।"; return; }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const data = { email, code, expiresAt: Date.now() + 10 * 60 * 1000 };
  localStorage.setItem(RESET_KEY, JSON.stringify(data));
  document.getElementById("resetStep").classList.remove("hidden");
  document.getElementById("resetCodeHint").textContent =
    "ডেমো কোড (আসল অ্যাপে কোড ইমেইলে যাবে): " + code;
  showToast("৬ সংখ্যার কোড পাঠানো হয়েছে।");
}

function resetPassword() {
  const code = document.getElementById("resetCode").value.trim();
  const newPw = document.getElementById("resetPassword").value;
  const err = document.getElementById("forgotError");
  let data = null;
  try { data = JSON.parse(localStorage.getItem(RESET_KEY)); } catch (e) {}

  if (!data) { err.textContent = "আগে কোড পাঠান।"; return; }
  if (Date.now() > data.expiresAt) { err.textContent = "কোডের মেয়াদ শেষ — আবার কোড পাঠান।"; return; }
  if (code !== data.code) { err.textContent = "কোডটি ভুল হয়েছে।"; return; }
  if (!newPw || newPw.length < 6) { err.textContent = "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।"; return; }

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
  if (!user) { err.textContent = "অ্যাকাউন্ট পাওয়া যায়নি।"; return; }
  user.passHash = hashPassword(newPw);
  saveUsers(users);
  localStorage.removeItem(RESET_KEY);
  showToast("পাসওয়ার্ড বদলে গেছে — এখন লগইন করুন।");
  showAuthForm("login");
}

/* ---------- logout ---------- */
function logout() {
  clearSession();
  document.getElementById("appScreen").classList.add("hidden");
  document.getElementById("authScreen").classList.remove("hidden");
  showAuthForm("login");
  showToast("লগআউট হয়ে গেছে।");
}

/* ---------- wire up ---------- */
document.addEventListener("DOMContentLoaded", () => {
  seedDemoUser();

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

  // If already logged in, go straight into the app.
  if (getCurrentUser()) enterApp();
});
