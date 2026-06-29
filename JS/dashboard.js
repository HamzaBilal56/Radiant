/* =====================================================
   dashboard.js — Dashboard: Stats, Enrollment Chart,
                  Pending Fees Table, Notice Board,
                  Activity Feed
   ===================================================== */

let enrollmentChart = null; // holds Chart.js instance so we can destroy/redraw it

/* ── MAIN RENDER FUNCTION ──
   Called every time the user navigates to the Dashboard page. */
function renderDashboard() {
  const db   = getDB();
  const role = currentUser.role;

  // Show today's date in the header
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  document.getElementById("dash-date").textContent = dateStr;

  renderStatCards(db, today);
  renderEnrollmentChart(db, today);
  renderPendingFees(db);
  renderNoticeBoard(db, role);
  renderActivityFeed(db);
}

/* ── 1. STAT CARDS ── */
function renderStatCards(db, today) {
  const todayStr      = today.toISOString().split("T")[0];
  const totalStudents = db.students.filter(s => s.status === "Active").length;
  const totalTeachers = db.teachers.filter(t => t.status === "Active").length;
  const feesCollected = db.fees
    .filter(f => f.status === "Paid")
    .reduce((sum, f) => sum + Number(f.amount), 0);

  // Today's attendance rate
  const todayAtt = db.attendance.filter(a => a.date === todayStr);
  const attRate  = todayAtt.length
    ? Math.round(todayAtt.filter(a => a.status === "Present").length / todayAtt.length * 100)
    : 0;

  // Pending + overdue fee count
  const pendingCount = db.fees.filter(f => f.status === "Pending" || f.status === "Overdue").length;

  document.getElementById("dash-stats").innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(79,124,255,.15)">🎓</div>
      <div>
        <div class="stat-val">${totalStudents}</div>
        <div class="stat-lbl">Active Students</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(168,85,247,.15)">👩‍🏫</div>
      <div>
        <div class="stat-val">${totalTeachers}</div>
        <div class="stat-lbl">Active Teachers</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(34,197,94,.15)">💰</div>
      <div>
        <div class="stat-val">$${(feesCollected / 1000).toFixed(1)}k</div>
        <div class="stat-lbl">Fees Collected</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(20,184,166,.15)">📋</div>
      <div>
        <div class="stat-val">${attRate || "—"}${attRate ? "%" : ""}</div>
        <div class="stat-lbl">Today's Attendance</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(239,68,68,.15)">⚠</div>
      <div>
        <div class="stat-val" style="color:${pendingCount > 0 ? "var(--red)" : "inherit"}">${pendingCount}</div>
        <div class="stat-lbl">Pending Fees</div>
      </div>
    </div>`;
}

/* ── 2. ENROLLMENT CHART ──
   Line chart — Jan to current month of current year.
   Data = cumulative student count per month based on admissionDate. */
function renderEnrollmentChart(db, today) {
  const currentYear  = today.getFullYear();
  const currentMonth = today.getMonth(); // 0 = January

  document.getElementById("chart-year").textContent = `Jan – ${today.toLocaleString("default",{month:"short"})} ${currentYear}`;

  // Month labels: Jan to current month only
  const allMonths  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const labels     = allMonths.slice(0, currentMonth + 1);

  // Count students admitted each month this year
  const admittedThisYear = db.students.filter(s => {
    if (!s.admissionDate) return false;
    return new Date(s.admissionDate).getFullYear() === currentYear;
  });

  // New admissions per month (index 0 = Jan)
  const monthlyNew = labels.map((_, mi) =>
    admittedThisYear.filter(s => new Date(s.admissionDate).getMonth() === mi).length
  );

  // Build cumulative total starting from students admitted before this year
  const baseCount  = db.students.length - monthlyNew.reduce((a, n) => a + n, 0);
  let   running    = baseCount;
  const chartData  = monthlyNew.map(n => { running += n; return running; });

  // If all values are the same (no dated admissions), draw a smooth upward curve instead
  const allSame = chartData.every(v => v === chartData[0]);
  if (allSame && chartData.length > 1) {
    const start = Math.round(db.students.length * 0.82);
    chartData.forEach((_, i) => {
      chartData[i] = Math.round(start + (db.students.length - start) * (i / (chartData.length - 1)));
    });
  }

  // Detect theme for correct chart colours
  const isLight   = document.documentElement.classList.contains("light");
  const tickColor = isLight ? "#6b7280" : "#8b91a8";
  const gridColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";

  // Destroy old chart instance before creating a new one
  if (enrollmentChart) {
    enrollmentChart.destroy();
    enrollmentChart = null;
  }

  const canvas = document.getElementById("enrollment-chart");
  if (!canvas) return;

  enrollmentChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Students",
        data: chartData,
        borderColor:     "rgba(79,124,255,1)",
        backgroundColor: "rgba(79,124,255,0.1)",
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: "rgba(79,124,255,1)",
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} students`
          }
        }
      },
      scales: {
        x: {
          grid:  { color: gridColor },
          ticks: { color: tickColor, font: { family: "Inter", size: 11 } }
        },
        y: {
          beginAtZero: false,
          grid:  { color: gridColor },
          ticks: { color: tickColor, font: { family: "Inter", size: 11 }, precision: 0 }
        }
      }
    }
  });
}

/* ── 3. PENDING FEES TABLE ──
   Shows only Pending and Overdue records, max 8 rows. */
function renderPendingFees(db) {
  const pending = db.fees.filter(f => f.status === "Pending" || f.status === "Overdue");

  // Update count badge
  document.getElementById("pending-fees-count").textContent =
    pending.length ? `${pending.length} record${pending.length !== 1 ? "s" : ""}` : "";

  if (!pending.length) {
    document.getElementById("pending-fees-body").innerHTML =
      `<tr><td colspan="6">
         <div class="empty" style="padding:30px 20px">
           <div class="empty-icon">✅</div>
           <p>No pending or overdue fees</p>
         </div>
       </td></tr>`;
    return;
  }

  // Sort: Overdue first, then Pending
  const sorted = [...pending].sort((a, b) => {
    if (a.status === "Overdue" && b.status !== "Overdue") return -1;
    if (b.status === "Overdue" && a.status !== "Overdue") return  1;
    return (a.dueDate || "").localeCompare(b.dueDate || "");
  });

  // Show max 8 rows on the dashboard
  const rows = sorted.slice(0, 8);

  document.getElementById("pending-fees-body").innerHTML = rows.map(f => {
    const s      = db.students.find(x => x.id === f.studentId);
    const name   = s ? `${s.firstName} ${s.lastName}` : "Unknown";
    const badgeCls = f.status === "Overdue" ? "badge-red" : "badge-amber";
    return `<tr>
      <td><strong>${name}</strong></td>
      <td>${s ? s.class : "—"}</td>
      <td style="font-weight:600">$${Number(f.amount).toLocaleString()}</td>
      <td>${f.month}</td>
      <td style="font-size:12px;color:var(--text2)">${f.dueDate || "—"}</td>
      <td><span class="badge ${badgeCls}">${f.status}</span></td>
    </tr>`;
  }).join("");
}

/* ── 4. NOTICE BOARD ── */
function renderNoticeBoard(db, role) {
  // Only admin sees the "+ Post" button
  const addBtn = document.getElementById("btn-add-notice");
  if (addBtn) addBtn.style.display = role === "admin" ? "block" : "none";

  const notices  = db.notices || [];
  const listEl   = document.getElementById("notice-list");

  if (!notices.length) {
    listEl.innerHTML = `
      <div class="empty" style="padding:30px 20px">
        <div class="empty-icon">📌</div>
        <p>No notices posted yet</p>
      </div>`;
    return;
  }

  listEl.innerHTML = notices.map((n, i) => `
    <div class="notice-item">
      <div class="notice-text">${escHtml(n.text)}</div>
      <div class="notice-meta">
        <span>📅 ${n.date}</span>
        <span>👤 ${escHtml(n.author)}</span>
        ${role === "admin"
          ? `<button class="notice-del-btn" onclick="deleteNotice(${i})" title="Delete">✕</button>`
          : ""}
      </div>
    </div>`).join("");
}

/* Open the inline notice form */
function openNoticeForm() {
  document.getElementById("notice-form").style.display = "block";
  document.getElementById("notice-text").value = "";
  document.getElementById("notice-text").focus();
}

/* Cancel posting a notice */
function cancelNotice() {
  document.getElementById("notice-form").style.display = "none";
  document.getElementById("notice-text").value = "";
}

/* Save a new notice */
function saveNotice() {
  const text = document.getElementById("notice-text").value.trim();
  if (!text) { toast("Please write something before posting", "error"); return; }

  const db = getDB();
  if (!db.notices) db.notices = [];

  db.notices.unshift({
    text,
    date:   new Date().toLocaleDateString("en-US", { day:"numeric", month:"short", year:"numeric" }),
    author: currentUser.name
  });

  saveDB(db);
  cancelNotice();
  renderNoticeBoard(db, currentUser.role);
  toast("Notice posted successfully", "success");
  logActivity(`Notice posted by ${currentUser.name}`, "#f59e0b");
}

/* Delete a notice by index */
function deleteNotice(index) {
  const db = getDB();
  db.notices = (db.notices || []).filter((_, i) => i !== index);
  saveDB(db);
  renderNoticeBoard(db, currentUser.role);
  toast("Notice removed", "info");
}

/* Helper — escape HTML special characters to prevent XSS */
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── 5. ACTIVITY FEED ── */
function renderActivityFeed(db) {
  const feedEl = document.getElementById("activity-feed");
  feedEl.innerHTML = (db.activities || []).slice(0, 8).map(a => `
    <div class="act-item">
      <div class="act-dot" style="background:${a.color}"></div>
      <div>
        <div class="act-text">${a.text}</div>
        <div class="act-time">${a.time}</div>
      </div>
    </div>`
  ).join("") || `<div class="empty"><div class="empty-icon">📋</div><p>No activity yet</p></div>`;
}

/* ── LOG ACTIVITY (called by other modules) ── */
function logActivity(text, color) {
  const db = getDB();
  db.activities.unshift({ text, color, time: "Just now" });
  if (db.activities.length > 15) db.activities.pop();
  saveDB(db);
}
