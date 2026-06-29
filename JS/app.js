/* =====================================================
   app.js — App Init, Navigation, Sidebar, Dropdowns
   ===================================================== */

/* ── NAV ITEMS PER ROLE ── */
const NAV = {
  admin:   [
    ["dashboard", "🏠", "Dashboard"],
    ["students",  "🎓", "Students"],
    ["teachers",  "👩‍🏫", "Teachers"],
    ["attendance","📋", "Attendance"],
    ["fees",      "💰", "Fees"]
  ],
  teacher: [
    ["dashboard", "🏠", "Dashboard"],
    ["students",  "🎓", "Students"],
    ["attendance","📋", "Attendance"]
  ],
  student: [
    ["dashboard", "🏠", "Dashboard"],
    ["attendance","📋", "Attendance"],
    ["fees",      "💰", "My Fees"]
  ]
};

const PAGE_TITLES = {
  dashboard:  "Dashboard",
  students:   "Students",
  teachers:   "Teachers",
  attendance: "Attendance",
  fees:       "Fee Management"
};

/* ── INIT APP (called right after login) ── */
function initApp() {
  buildNav();
  updateUserDisplay();
  applyRoleAccess();
  populateDropdowns();
  showPage("dashboard");
}

/* Build sidebar navigation links based on current role */
function buildNav() {
  const links = NAV[currentUser.role] || NAV.admin;
  document.getElementById("nav-links").innerHTML = links.map(([id, icon, label]) =>
    `<div class="nav-item" id="nav-${id}" onclick="showPage('${id}')">
       <span class="nav-icon">${icon}</span>
       <span>${label}</span>
     </div>`
  ).join("");
}

/* Show user name and avatar initial in sidebar */
function updateUserDisplay() {
  document.getElementById("user-avatar").textContent = currentUser.name.charAt(0);
  document.getElementById("user-name").textContent   = currentUser.name;
  document.getElementById("user-role").textContent   = currentUser.role;
}

/* Hide buttons that only admins should see */
function applyRoleAccess() {
  const isAdmin = currentUser.role === "admin";

  ["btn-add-student", "btn-add-teacher", "btn-add-fee"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? "" : "none";
  });

  // Students cannot save attendance
  const saveAtt = document.getElementById("btn-save-att");
  if (saveAtt) saveAtt.style.display = currentUser.role === "student" ? "none" : "";
}

/* Fill all <select> dropdowns that need data from the DB */
function populateDropdowns() {
  const db = getDB();

  // Student page — class filter dropdown
  const scf = document.getElementById("s-class-filter");
  if (scf) db.classes.forEach(c => {
    scf.innerHTML += `<option value="${c}">${c}</option>`;
  });

  // Attendance page — class select
  const ac = document.getElementById("att-class");
  if (ac) db.classes.forEach(c => {
    ac.innerHTML += `<option value="${c}">${c}</option>`;
  });

  // Student form — class select inside modal
  const sfc = document.getElementById("sf-class");
  if (sfc) db.classes.forEach(c => {
    sfc.innerHTML += `<option value="${c}">${c}</option>`;
  });

  // Fee form — student select inside modal
  const ffs = document.getElementById("ff-student");
  if (ffs) db.students.filter(s => s.status === "Active").forEach(s => {
    ffs.innerHTML += `<option value="${s.id}">${s.firstName} ${s.lastName} (${s.class})</option>`;
  });

  // Attendance — default date to today
  document.getElementById("att-date").value = new Date().toISOString().split("T")[0];
}

/* ── PAGE NAVIGATION ── */
function showPage(id) {
  // Hide all pages, deactivate all nav items
  document.querySelectorAll(".page").forEach(p     => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  // Activate selected page and nav item
  document.getElementById(`page-${id}`)?.classList.add("active");
  document.getElementById(`nav-${id}`)?.classList.add("active");

  // Update topbar title
  document.getElementById("page-title").textContent = PAGE_TITLES[id] || id;

  closeSidebar();

  // Render the right module
  if (id === "dashboard")  renderDashboard();
  if (id === "students")   renderStudents();
  if (id === "teachers")   renderTeachers();
  if (id === "fees")       renderFees();
  if (id === "attendance") loadAttCards();
}

/* ── SIDEBAR (mobile slide-in) ── */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}
