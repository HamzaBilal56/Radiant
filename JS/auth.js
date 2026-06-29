/* =====================================================
   auth.js — Login, Logout, Session, Theme Toggle
   ===================================================== */

let currentUser = null;

/* ── LOGIN ── */
function login() {
  const email    = document.getElementById("l-email").value.trim().toLowerCase();
  const password = document.getElementById("l-pass").value.trim();
  const role     = document.getElementById("l-role").value;

  // Clear previous error
  document.getElementById("l-error").style.display = "none";

  if (!email || !password) {
    showLoginError("Please enter your email and password");
    return;
  }

  const db   = getDB();
  const user = db.users.find(
    u => u.email.toLowerCase() === email
      && u.password === password
      && u.role === role
  );

  if (!user) {
    showLoginError("Incorrect email, password, or role. Please try again.");
    return;
  }

  // Save session and launch app
  currentUser = user;
  sessionStorage.setItem("user", JSON.stringify(user));
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "flex";
  initApp();
}

function showLoginError(msg) {
  const el = document.getElementById("l-error");
  el.textContent   = msg;
  el.style.display = "block";
}

/* ── LOGOUT ── */
function logout() {
  currentUser = null;
  sessionStorage.removeItem("user");
  document.getElementById("app").style.display          = "none";
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("l-error").style.display      = "none";
  toast("Signed out successfully", "info");
}

/* ── PASSWORD SHOW/HIDE ── */
function togglePw() {
  const inp = document.getElementById("l-pass");
  inp.type  = inp.type === "password" ? "text" : "password";
}

/* ── THEME TOGGLE ── */
function toggleTheme() {
  const isLight = document.documentElement.classList.toggle("light");
  localStorage.setItem("theme", isLight ? "light" : "dark");
  document.getElementById("theme-btn").textContent = isLight ? "🌙" : "☀️";
}
