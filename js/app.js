/* ============================================================
   app.js — Messenger
   Main wiring: entering the app, profile, search, mobile back.
   Loads last, after firebase-config.js, auth.js and chat.js.
   ============================================================ */

/* Show the app screen after a successful login / signup. */
function enterApp() {
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");

  // Profile in the sidebar.
  document.getElementById("myName").textContent = user.name;
  document.getElementById("myAvatar").textContent = user.name.charAt(0);
  document.getElementById("myStatus").textContent = "অনলাইন";

  // Fresh state: no chat selected yet.
  currentChatId = null;
  document.getElementById("appScreen").classList.remove("chat-open");
  document.getElementById("chatWindow").classList.add("hidden");
  document.getElementById("emptyState").classList.remove("hidden");

  renderChatList("");
  const search = document.getElementById("searchInput");
  if (search) search.value = "";
}

/* Mobile back button: returns from the chat window to the list. */
function addMobileBackButton() {
  const header = document.querySelector(".chat-header");
  if (!header || document.getElementById("backBtn")) return;
  const btn = document.createElement("button");
  btn.id = "backBtn";
  btn.className = "icon-btn back-btn";
  btn.type = "button";
  btn.title = "পেছনে";
  btn.textContent = "←";
  btn.addEventListener("click", () => {
    document.getElementById("appScreen").classList.remove("chat-open");
    currentChatId = null;
    renderChatList(document.getElementById("searchInput").value);
  });
  header.prepend(btn);
}

/* ---------- wire up ---------- */
document.addEventListener("DOMContentLoaded", () => {
  addMobileBackButton();

  // Live search in the chat list.
  document.getElementById("searchInput").addEventListener("input", (e) => {
    renderChatList(e.target.value);
  });

  // Close the emoji picker when tapping anywhere else.
  document.addEventListener("click", (e) => {
    const picker = document.getElementById("emojiPicker");
    const btn = document.getElementById("emojiBtn");
    if (!picker.classList.contains("hidden") &&
        !picker.contains(e.target) && e.target !== btn) {
      picker.classList.add("hidden");
    }
  });

  // Close the new-chat modal by tapping its backdrop.
  document.getElementById("newChatModal").addEventListener("click", (e) => {
    if (e.target.id === "newChatModal") {
      e.target.classList.add("hidden");
    }
  });
});
