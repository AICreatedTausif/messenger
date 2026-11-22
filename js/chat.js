/* ============================================================
   chat.js — Messenger (Firebase version)
   Conversations and messages in Firebase Realtime Database.
   - Chat list with search, unread badges, online status
   - Text messages with time + seen ticks (live via RTDB)
   - Photos: picked file -> resized -> Base64 (data URL) -> sent
     inside the message (the "base method"). Base64 string is
     stored in the Realtime Database message itself.
   - Typing indicator + demo auto-reply
   - New chat modal, emoji picker, photo lightbox
   Data path: /chats/{myUid}/{peerId}/{messageId}.
   The old localStorage chats are gone. Demo contacts stay
   local (they are demo people, not real Firebase users).
   NOTE: Realtime Database rules must allow this user to read
   and write /chats/{uid} in the Firebase console, or the
   listener will report a permission error.
   ============================================================ */

const PEOPLE_KEY = "messenger_people";
let currentChatId = null;
let pendingPhoto = null; // Base64 data URL waiting to be sent
let chatCache = {};      // { peerId: { msgId: message } }
let myUid = null;
let chatListenerOn = false;
let seededThisSession = false;

/* ---------- demo people (local) ---------- */
function seedPeople() {
  let people = null;
  try { people = JSON.parse(localStorage.getItem(PEOPLE_KEY)); } catch (e) {}
  if (people && people.length) return people;
  people = [
    { id: "rahim", name: "রহিম উদ্দিন", online: true, about: "অনলাইন" },
    { id: "karim", name: "করিম হাসান", online: true, about: "অনলাইন" },
    { id: "sakib", name: "সাকিব আহমেদ", online: false, about: "৩০ মিনিট আগে সক্রিয়" },
    { id: "tania", name: "তানিয়া আক্তার", online: true, about: "অনলাইন" },
    { id: "nusrat", name: "নুসরাত জাহান", online: false, about: "গতকাল সক্রিয়" }
  ];
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
  return people;
}
function getPeople() { return seedPeople(); }

/* ---------- Realtime Database access ---------- */
function chatsRef() {
  return firebase.database().ref("chats/" + myUid);
}
function loadChats() { return chatCache; }
function saveChats(chats) {
  chatCache = chats;
  if (myUid) chatsRef().set(chats);
}

function attachChatListener() {
  if (!myUid || chatListenerOn) return;
  chatListenerOn = true;
  chatsRef().on("value",
    (snap) => {
      chatCache = snap.val() || {};
      if (Object.keys(chatCache).length === 0 && !seededThisSession) {
        seededThisSession = true;
        seedChatsToFirebase();
        return;
      }
      const q = document.getElementById("searchInput");
      renderChatList(q ? q.value : "");
      if (currentChatId) renderMessages();
    },
    (error) => {
      showToast("Firebase Database-এর অনুমতি নেই — Firebase console-এ Realtime Database rules ঠিক করতে হবে।");
    }
  );
}

function seedChatsToFirebase() {
  const now = Date.now();
  const seeded = {
    rahim: {
      m1: { id: "m1", from: "peer", type: "text", text: "আসসালামু আলাইকুম, কেমন আছো?", time: new Date(now - 1000 * 60 * 42).toISOString(), seen: true },
      m2: { id: "m2", from: "me", type: "text", text: "ওয়ালাইকুম আসসালাম, আলহামদুলিল্লাহ ভালো। তুমি?", time: new Date(now - 1000 * 60 * 40).toISOString(), seen: true },
      m3: { id: "m3", from: "peer", type: "text", text: "আলহামদুলিল্লাহ! কালকের ভিডিওটা দেখেছো?", time: new Date(now - 1000 * 60 * 5).toISOString(), seen: true }
    },
    karim: {
      m1: { id: "m1", from: "peer", type: "text", text: "ভাই, নতুন ফোনের ছবিগুলো পাঠালাম।", time: new Date(now - 1000 * 60 * 60 * 2).toISOString(), seen: true }
    },
    sakib: {
      m1: { id: "m1", from: "me", type: "text", text: "DSU ভিডিওটা কবে আসবে?", time: new Date(now - 1000 * 60 * 60 * 5).toISOString(), seen: true },
      m2: { id: "m2", from: "peer", type: "text", text: "বুধবারে আসবে ইনশাআল্লাহ।", time: new Date(now - 1000 * 60 * 60 * 4).toISOString(), seen: true }
    },
    tania: {
      m1: { id: "m1", from: "peer", type: "text", text: "তোমার নতুন সাইটটা দারুণ হয়েছে!", time: new Date(now - 1000 * 60 * 60 * 26).toISOString(), seen: false }
    },
    nusrat: {
      m1: { id: "m1", from: "peer", type: "text", text: "মদিনার ভিডিওটা খুব সুন্দর হয়েছে।", time: new Date(now - 1000 * 60 * 60 * 30).toISOString(), seen: true }
    }
  };
  chatsRef().set(seeded);
}

function chatMessages(peerId) {
  const obj = chatCache[peerId] || {};
  return Object.values(obj).sort((a, b) => new Date(a.time) - new Date(b.time));
}
function getUnreadCount(chatId) {
  return chatMessages(chatId).filter(m => m.from === "peer" && !m.seen).length;
}
function lastMessage(chatId) {
  const list = chatMessages(chatId);
  return list[list.length - 1] || null;
}

/* ---------- helpers ---------- */
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function formatTime(iso) {
  const d = new Date(iso);
  let h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + m + " " + ap;
}
function uid() { return "m" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

/* ---------- chat list ---------- */
function renderChatList(filterText) {
  const listEl = document.getElementById("chatList");
  if (!listEl) return;
  const people = getPeople();
  const q = (filterText || "").trim().toLowerCase();
  listEl.innerHTML = "";
  people
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .forEach(p => {
      const last = lastMessage(p.id);
      const unread = getUnreadCount(p.id);
      const item = document.createElement("div");
      item.className = "chat-item" + (currentChatId === p.id ? " active" : "");
      item.innerHTML =
        '<div class="avatar">' + escapeHtml(p.name.charAt(0)) +
          (p.online ? '<span class="online-dot"></span>' : "") + '</div>' +
        '<div class="chat-item-info">' +
          '<div class="chat-item-top"><span class="chat-item-name">' + escapeHtml(p.name) + '</span>' +
          '<span class="chat-item-time">' + (last ? formatTime(last.time) : "") + '</span></div>' +
          '<div class="chat-item-top"><span class="chat-item-last">' +
            (last ? (last.type === "image" ? "📷 ছবি" : escapeHtml(last.text)) : "এখনো কোনো মেসেজ নেই") +
          '</span>' +
          (unread ? '<span class="unread-badge">' + unread + '</span>' : "") + '</div>' +
        '</div>';
      item.addEventListener("click", () => openChat(p.id));
      listEl.appendChild(item);
    });
}

/* ---------- open a chat ---------- */
function openChat(peerId) {
  currentChatId = peerId;
  const people = getPeople();
  const peer = people.find(p => p.id === peerId);
  if (!peer) return;

  // Mark peer messages as seen (writes back to Firebase).
  const msgs = chatCache[peerId] || {};
  let changed = false;
  Object.values(msgs).forEach(m => { if (m.from === "peer" && !m.seen) { m.seen = true; changed = true; } });
  if (changed && myUid) chatsRef().child(peerId).set(msgs);

  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("chatWindow").classList.remove("hidden");
  document.getElementById("chatAvatar").textContent = peer.name.charAt(0);
  document.getElementById("chatName").textContent = peer.name;
  document.getElementById("chatPresence").textContent = peer.online ? "অনলাইন" : peer.about;
  document.getElementById("appScreen").classList.add("chat-open"); // mobile: show chat
  renderMessages();
  renderChatList(document.getElementById("searchInput").value);
  document.getElementById("messageInput").focus();
}

function renderMessages() {
  const box = document.getElementById("messagesBox");
  if (!box || !currentChatId) return;
  const list = chatMessages(currentChatId);
  box.innerHTML = "";
  list.forEach(m => {
    const wrap = document.createElement("div");
    wrap.className = "message " + (m.from === "me" ? "outgoing" : "incoming");
    let inner = "";
    if (m.type === "image") {
      inner += '<img class="msg-img" src="' + m.img + '" alt="ছবি">';
    }
    if (m.text) inner += '<div class="bubble">' + escapeHtml(m.text) + '</div>';
    inner += '<div class="msg-meta"><span>' + formatTime(m.time) + '</span>' +
      (m.from === "me" ? '<span class="msg-ticks">✓✓</span>' : "") + '</div>';
    wrap.innerHTML = inner;
    const img = wrap.querySelector(".msg-img");
    if (img) img.addEventListener("click", () => openLightbox(m.img));
    box.appendChild(wrap);
  });
  box.scrollTop = box.scrollHeight;
}

/* ---------- send message (to Firebase) ---------- */
function sendCurrentMessage() {
  if (!currentChatId || !myUid) return;
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text && !pendingPhoto) return;

  const msg = {
    id: uid(),
    from: "me",
    type: pendingPhoto ? "image" : "text",
    text: text || "",
    img: pendingPhoto || "",
    time: new Date().toISOString(),
    seen: false
  };
  chatsRef().child(currentChatId).push(msg);

  input.value = "";
  clearPhotoPreview();
  simulateReply(currentChatId);
}

/* Demo auto-reply so a one-person demo still feels alive. */
const DEMO_REPLIES = ["দারুণ! 😊", "ঠিক আছে, দেখছি।", "হ্যাঁ, আমিও তাই ভাবছিলাম।", "ছবিটা সুন্দর হয়েছে!", "পরে কথা হবে ইনশাআল্লাহ।"];
function simulateReply(peerId) {
  const typing = document.getElementById("typingIndicator");
  typing.classList.remove("hidden");
  setTimeout(() => {
    typing.classList.add("hidden");
    if (!myUid) return;
    chatsRef().child(peerId).push({
      id: uid(),
      from: "peer",
      type: "text",
      text: DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)],
      time: new Date().toISOString(),
      seen: currentChatId === peerId
    });
  }, 1400);
}

/* ---------- photos: file -> Base64 (the "base method") ---------- */
function handlePhotoSelect(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Downscale so the Base64 string stays small enough for storage.
      const maxSide = 800;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      pendingPhoto = canvas.toDataURL("image/jpeg", 0.8); // Base64 data URL
      document.getElementById("photoPreviewImg").src = pendingPhoto;
      document.getElementById("photoPreview").classList.remove("hidden");
      document.getElementById("messageInput").focus();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file); // FileReader -> Base64
}
function clearPhotoPreview() {
  pendingPhoto = null;
  document.getElementById("photoPreview").classList.add("hidden");
  document.getElementById("photoPreviewImg").src = "";
  document.getElementById("photoInput").value = "";
}

/* ---------- lightbox ---------- */
function openLightbox(src) {
  document.getElementById("lightboxImg").src = src;
  document.getElementById("lightbox").classList.remove("hidden");
}
function closeLightbox() {
  document.getElementById("lightbox").classList.add("hidden");
  document.getElementById("lightboxImg").src = "";
}

/* ---------- new chat modal ---------- */
function openNewChatModal() {
  const list = document.getElementById("peopleList");
  list.innerHTML = "";
  getPeople().forEach(p => {
    const row = document.createElement("div");
    row.className = "person-item";
    row.innerHTML = '<div class="avatar">' + escapeHtml(p.name.charAt(0)) +
      (p.online ? '<span class="online-dot"></span>' : "") + '</div>' +
      '<div><strong>' + escapeHtml(p.name) + '</strong><span>' + escapeHtml(p.about) + '</span></div>';
    row.addEventListener("click", () => {
      document.getElementById("newChatModal").classList.add("hidden");
      openChat(p.id);
    });
    list.appendChild(row);
  });
  document.getElementById("newChatModal").classList.remove("hidden");
}

/* ---------- wire up ---------- */
document.addEventListener("DOMContentLoaded", () => {
  seedPeople();

  // When Firebase Auth signs a user in, start syncing their chats.
  firebase.auth().onAuthStateChanged((user) => {
    myUid = user ? user.uid : null;
    chatListenerOn = false;
    attachChatListener();
  });

  document.getElementById("sendBtn").addEventListener("click", sendCurrentMessage);
  document.getElementById("messageInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendCurrentMessage();
  });
  document.getElementById("photoBtn").addEventListener("click", () => {
    document.getElementById("photoInput").click();
  });
  document.getElementById("photoInput").addEventListener("change", (e) => {
    handlePhotoSelect(e.target.files[0]);
  });
  document.getElementById("photoRemoveBtn").addEventListener("click", clearPhotoPreview);

  document.getElementById("emojiBtn").addEventListener("click", () => {
    document.getElementById("emojiPicker").classList.toggle("hidden");
  });
  document.querySelectorAll("#emojiPicker button").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById("messageInput");
      input.value += btn.textContent;
      input.focus();
    });
  });

  document.getElementById("newChatBtn").addEventListener("click", openNewChatModal);
  document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("newChatModal").classList.add("hidden");
  });
  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("lightbox").addEventListener("click", (e) => {
    if (e.target.id === "lightbox") closeLightbox();
  });
});
