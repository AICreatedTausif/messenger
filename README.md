# Messenger — AI Created Tausif

A beautiful Messenger-style chat web app. Login, chats, photo messages — everything runs in the browser for now. When Firebase is provided later, only the data layer changes.

## Features
- Login / Sign up / Logout — full A to Z auth system
- Password strength meter, forgot password with 6-digit code
- Chat list with search, online status, unread badges
- Chat window with bubbles, timestamps, seen ticks, typing indicator
- Send photos — images are converted to Base64 (data URL) and sent inside the message, with preview and lightbox
- Emoji picker, new chat, demo account

## Files (added step by step)
- index.html — app structure
- css/style.css — all styling
- js/auth.js — login, signup, password reset
- js/chat.js — conversations, messages, photo (Base64) sending
- js/app.js — main app logic
- js/firebase-config.js — Firebase config (to be connected later)

## Firebase (later)
When Firebase is provided, only the data layer changes: Firebase Auth, Firestore and Storage replace the current browser-storage logic. No UI changes needed.

## Demo login
Email: demo@messenger.app
Password: demo123
