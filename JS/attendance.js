/* =====================================================
   attendance.js — Mark, Save & View Attendance
   ===================================================== */

/* Stores current attendance status for each student on screen.
   Format: { studentId: "Present" | "Absent" | "Late" } */
let attStatus = {};

/* ── LOAD ATTENDANCE CARDS ──
   Called when class or date changes. Loads existing records
   from DB if attendance was already marked for this date. */
function loadAttCards() {
  const cls  = document.getElementById("att-class").value;
  const date = document.getElementById("att-date").value;

  if (!cls) {
    document.getElementById("att-cards").innerHTML =
      `<div class="empty"><div class="empty-icon">📋</div>
       <p>Select a class above to begin</p></div>`;
    document.getElementById("att-summary").style.display = "none";
    return;
  }

  const db        = getDB();
  const isStudent = currentUser.role === "student";

  // Get students for this class (student role sees only themselves)
  let students = db.students.filter(s => s.class === cls && s.status === "Active");
  if (isStudent) {
    students = students.filter(s => s.studentId === currentUser.studentId);
  }

  // Pre-fill status from existing attendance records for this date
  attStatus = {};
  students.forEach(s => {
    const existing    = db.attendance.find(a => a.studentId === s.id && a.date === date);
    attStatus[s.id]   = existing ? existing.status : "Present";
  });

  renderAttCards(students);
  updateAttSummary();
}

/* ── RENDER ATTENDANCE CARDS ── */
function renderAttCards(students) {
  const isStudent = currentUser.role === "student";

  document.getElementById("att-cards").innerHTML = students.length
    ? students.map(s => {
        const status = attStatus[s.id] || "Present";

        // Pick colour based on status
        const colors = {
          Present: { text: "#22c55e", bg: "rgba(34,197,94,.15)",  icon: "✓" },
          Absent:  { text: "#ef4444", bg: "rgba(239,68,68,.15)",  icon: "✗" },
          Late:    { text: "#f59e0b", bg: "rgba(245,158,11,.15)", icon: "⏰" }
        };
        const c = colors[status] || colors.Present;

        return `<div class="att-card ${status.toLowerCase()}"
                     onclick="${isStudent ? "" : `cycleStatus('${s.id}')`}"
                     style="${isStudent ? "cursor:default" : ""}">
          <div class="att-avatar" style="background:${c.bg}; color:${c.text}">
            ${s.firstName.charAt(0)}${s.lastName.charAt(0)}
          </div>
          <div>
            <div class="att-n">${s.firstName} ${s.lastName}</div>
            <div class="att-s" style="color:${c.text}">${c.icon} ${status}</div>
          </div>
        </div>`;
      }).join("")
    : `<div class="empty"><div class="empty-icon">👥</div><p>No active students in this class</p></div>`;
}

/* ── CYCLE STATUS ON CLICK ──
   Each click rotates: Present → Absent → Late → Present */
function cycleStatus(studentId) {
  const cycle = { Present: "Absent", Absent: "Late", Late: "Present" };
  attStatus[studentId] = cycle[attStatus[studentId]] || "Present";

  // Re-render cards and update counter
  const cls      = document.getElementById("att-class").value;
  const students = getDB().students.filter(s => s.class === cls && s.status === "Active");
  renderAttCards(students);
  updateAttSummary();
}

/* ── MARK ALL AT ONCE ── */
function markAll(status) {
  if (!Object.keys(attStatus).length) {
    toast("Select a class first", "error");
    return;
  }
  Object.keys(attStatus).forEach(id => attStatus[id] = status);

  const cls      = document.getElementById("att-class").value;
  const students = getDB().students.filter(s => s.class === cls && s.status === "Active");
  renderAttCards(students);
  updateAttSummary();
}

/* ── UPDATE LIVE COUNTER BAR ── */
function updateAttSummary() {
  const vals     = Object.values(attStatus);
  const summaryEl = document.getElementById("att-summary");

  if (!vals.length) {
    summaryEl.style.display = "none";
    return;
  }

  const present = vals.filter(v => v === "Present").length;
  const absent  = vals.filter(v => v === "Absent").length;
  const late    = vals.filter(v => v === "Late").length;

  summaryEl.style.display = "flex";
  summaryEl.innerHTML = `
    <span>Total: <strong>${vals.length}</strong></span>
    <span style="color:var(--green)">✓ Present: <strong>${present}</strong></span>
    <span style="color:var(--red)">✗ Absent: <strong>${absent}</strong></span>
    <span style="color:var(--amber)">⏰ Late: <strong>${late}</strong></span>`;
}

/* ── SAVE ATTENDANCE TO DB ── */
function saveAttendance() {
  // Students are not allowed to save attendance
  if (currentUser.role === "student") {
    toast("Students cannot mark attendance", "error");
    return;
  }

  const cls  = document.getElementById("att-class").value;
  const date = document.getElementById("att-date").value;

  if (!cls)                           { toast("Please select a class", "error");  return; }
  if (!date)                          { toast("Please select a date", "error");   return; }
  if (!Object.keys(attStatus).length) { toast("No students to save", "error");   return; }

  const db = getDB();

  // Save or update each student's record for this date
  Object.entries(attStatus).forEach(([studentId, status]) => {
    const existing = db.attendance.findIndex(a => a.studentId === studentId && a.date === date);
    if (existing > -1) {
      db.attendance[existing].status = status; // update
    } else {
      db.attendance.push({ id: uid(), studentId, date, status, class: cls }); // insert
    }
  });

  const present = Object.values(attStatus).filter(s => s === "Present").length;
  const total   = Object.keys(attStatus).length;

  logActivity(`Attendance saved for ${cls} on ${date}: ${present}/${total} present`, "#14b8a6");
  saveDB(db);
  toast(`Attendance saved — ${present} present, ${total - present} absent/late`, "success");
}
